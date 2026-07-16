//! Validation of balancing inputs before a solve.
//!
//! Holds [`validate_balancing_targets`] and the [`BalancingIssue`] / [`BalancingReport`] types it
//! produces, plus every feasibility, structural, dominance, and ratio check that flags suspect or
//! unsound targets.

use std::collections::HashSet;

use serde::{Deserialize, Serialize};

use crate::{
    balancing::{
        keys::{BalanceKey, target_row_coeff},
        solve::Priority,
        translate::translate_balancing_targets,
    },
    composition::{CompKey, Composition, CompositionValues, FastComposition},
    constants::balancing::{
        HIGHER_ORDER_CANDIDATE_LIMIT, LOCKED_TOTAL_TOLERANCE, MAX_NUM_GROUP_SIZE_FOR_HIGHER_ORDER,
        MAX_NUM_GROUP_SIZE_FOR_TYPICAL,
    },
    error::{Error, Result},
    validate::{are_equal_rel, is_subset, is_subset_rel, is_within_range_rel},
};

// Referenced only in doc comments (the validated entry points live in `solve`).
#[cfg(doc)]
use crate::{
    balancing::solve::{balance_compositions, constrainable_targets},
    composition::RatioKey,
};

/// The severity of a [`BalancingIssue`]: whether it makes balancing unsound or merely suspect.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    /// The issue makes balancing unsound (e.g. it would panic or produce `NaN`); it is rejected.
    Error,
    /// The issue is suspicious, but balancing can still proceed on a best-effort basis.
    Warning,
    /// Advisory only — an observation about the solve that never blocks it.
    Info,
}

/// A single problem detected in a set of balancing inputs by [`validate_balancing_targets`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum BalancingIssue {
    /// A target value is not finite (`NaN` or infinite), which would poison the solve.
    ///
    /// Severity: [`Severity::Error`].
    NonFiniteTarget {
        /// The key whose target value is not finite.
        key: BalanceKey,
        /// The offending non-finite value.
        value: f64,
    },
    /// A target value is outside its key's admissible domain (see [`BalanceKey::target_domain`]):
    /// a negative value for a non-negative key, an above-freezing temp, or a hardness above 100.
    ///
    /// Severity: [`Severity::Error`].
    OutOfDomainTarget {
        /// The key whose target value is out of domain.
        key: BalanceKey,
        /// The offending out-of-domain value.
        value: f64,
        /// The domain's lower bound, possibly infinite.
        min: f64,
        /// The domain's upper bound, possibly infinite.
        max: f64,
    },
    /// The same key appears more than once in the targets, which is contradictory or ambiguous.
    ///
    /// Severity: [`Severity::Error`].
    DuplicateTarget {
        /// The key that appears more than once.
        key: BalanceKey,
    },
    /// Multiple targets resolve to the same solver key, which is contradictory or ambiguous — e.g.
    /// `ABV` translates to an `Alcohol` target, so targeting both double-targets alcohol, and
    /// `ServingTemp` and `HardnessAt14C` both translate to `AbsNetPAC`.
    ///
    /// Severity: [`Severity::Error`].
    ProxyTargetClash {
        /// The original target keys, as passed, that resolve to the same solver key (>= 2).
        keys: Vec<BalanceKey>,
        /// The solver key they all resolve to (a proxy, or the key itself when untranslated).
        proxy: BalanceKey,
    },
    /// A locked composition's fraction is not finite (`NaN`/infinite) or is negative, so it cannot
    /// be held at that fraction of the mix.
    ///
    /// Severity: [`Severity::Error`].
    InvalidLockedFraction {
        /// The index of the offending locked composition.
        index: usize,
        /// The offending fraction value.
        fraction: f64,
    },
    /// The locked compositions' fractions sum above the whole mix (> 1), leaving no room for the
    /// free compositions the solve would fill.
    ///
    /// Severity: [`Severity::Error`].
    LockedFractionsExceedMix {
        /// The sum of the locked fractions (infeasibly greater than 1).
        locked_total: f64,
    },
    /// No composition in the palette contributes to this key (its row is entirely zero).
    ///
    /// Severity: [`Severity::Warning`].
    UnaffectableTarget {
        /// The key that no composition affects.
        key: BalanceKey,
    },
    /// The target lies outside the `[min, max]` range achievable from the palette.
    ///
    /// Severity: [`Severity::Warning`].
    UnreachableTarget {
        /// The key whose target is out of range.
        key: BalanceKey,
        /// The requested target value.
        target: f64,
        /// The smallest value any single composition has for this key.
        min: f64,
        /// The largest value any single composition has for this key.
        max: f64,
    },
    /// Palette-independent contradiction: the `parts` targets sum above `whole`'s, but each part is
    /// structurally part of `whole` (see [`CompKey::is_part_of`]), so `Σ parts <= whole` by
    /// definition. A single part is the pairwise case (e.g. a `MilkFat` target above `TotalFats`).
    ///
    /// Severity: [`Severity::Warning`].
    StructuralViolation {
        /// The structural part keys whose targets exceed `whole` (each is a part of `whole`; >= 1).
        parts: Vec<BalanceKey>,
        /// The whole key the `parts` belong to in the composition hierarchy.
        whole: BalanceKey,
        /// The sum of the `parts` targets (infeasibly greater than `whole_target`).
        parts_target_sum: f64,
        /// The target requested for `whole`.
        whole_target: f64,
    },
    /// Palette-independent contradiction: `whole` is a residual-free roll-up that equals its parts'
    /// sum in every composition (see [`CompKey::is_residual_free_rollup`]), yet the targets for
    /// `whole` and all its parts disagree. Also catches a `whole` target too *large* for its parts.
    ///
    /// Severity: [`Severity::Warning`].
    RollupSumMismatch {
        /// The residual-free roll-up key whose target disagrees with its parts' targets.
        whole: BalanceKey,
        /// The roll-up's parts, all of which are targets (their values must sum to `whole`).
        parts: Vec<BalanceKey>,
        /// The sum of the `parts` targets (not equal to `whole_target`).
        parts_target_sum: f64,
        /// The target requested for `whole`.
        whole_target: f64,
    },
    /// Palette-derived infeasibility: the `lesser` targets sum above `greater`'s target, yet every
    /// composition has `Σ lesser <= greater`. One `lesser` key is pairwise; several, additive.
    ///
    /// Severity: [`Severity::Warning`].
    DominanceViolation {
        /// The "lesser" keys whose compositions sum under `greater` in every composition (>= 1).
        lesser: Vec<BalanceKey>,
        /// The key that dominates the `lesser` group across every composition.
        greater: BalanceKey,
        /// The sum of the `lesser` targets (infeasibly greater than `greater_target`).
        lesser_target_sum: f64,
        /// The target requested for `greater`.
        greater_target: f64,
    },
    /// Palette-derived infeasibility: the target `Σ numerator / denominator` ratio lies outside the
    /// `[min_ratio, max_ratio]` band the palette can reach. Also catches a pinned ratio (a lone
    /// ingredient fixing `numerator : denominator`). One numerator key is pairwise.
    ///
    /// Severity: [`Severity::Warning`].
    RatioInfeasibility {
        /// The numerator keys, summed for the ratio (>= 1).
        numerator: Vec<BalanceKey>,
        /// The denominator key of the ratio.
        denominator: BalanceKey,
        /// The requested `Σ numerator targets / denominator target` ratio.
        target_ratio: f64,
        /// The smallest `Σ numerator / denominator` ratio any composition has.
        min_ratio: f64,
        /// The largest such ratio any composition has (infinite when some has a zero denominator).
        max_ratio: f64,
    },
    /// More targets than the palette can independently satisfy: the sum-to-one constraint leaves
    /// only `ingredient_count - 1` free dimensions, so the solve is a best-fit compromise.
    ///
    /// Severity: [`Severity::Info`].
    OverDetermined {
        /// The number of targets at least one composition can move (the rest are dropped first).
        target_count: usize,
        /// The number of ingredients (compositions) in the palette.
        ingredient_count: usize,
    },
}

impl BalancingIssue {
    /// The [`Severity`] of this issue: [`Severity::Error`] for issues that make balancing unsound,
    /// [`Severity::Warning`] otherwise, for issues that are suspicious but balancing can proceed.
    #[must_use]
    pub const fn severity(&self) -> Severity {
        match self {
            Self::NonFiniteTarget { .. }
            | Self::OutOfDomainTarget { .. }
            | Self::DuplicateTarget { .. }
            | Self::ProxyTargetClash { .. }
            | Self::InvalidLockedFraction { .. }
            | Self::LockedFractionsExceedMix { .. } => Severity::Error,
            Self::UnaffectableTarget { .. }
            | Self::UnreachableTarget { .. }
            | Self::StructuralViolation { .. }
            | Self::RollupSumMismatch { .. }
            | Self::DominanceViolation { .. }
            | Self::RatioInfeasibility { .. } => Severity::Warning,
            Self::OverDetermined { .. } => Severity::Info,
        }
    }

    /// The [`BalanceKey`]s this issue concerns, for relating it back to the offending target(s).
    ///
    /// Group issues list the single "whole"/"greater"/"denominator" key first, then its group. The
    /// palette-wide [`OverDetermined`](Self::OverDetermined) issue concerns no specific key.
    #[must_use]
    pub fn affected_keys(&self) -> Vec<BalanceKey> {
        match self {
            Self::NonFiniteTarget { key, .. }
            | Self::OutOfDomainTarget { key, .. }
            | Self::DuplicateTarget { key }
            | Self::UnaffectableTarget { key }
            | Self::UnreachableTarget { key, .. } => vec![*key],
            Self::ProxyTargetClash { keys, .. } => keys.clone(),
            Self::StructuralViolation { parts, whole, .. } | Self::RollupSumMismatch { whole, parts, .. } => {
                [&[*whole], parts.as_slice()].concat()
            }
            Self::DominanceViolation { lesser, greater, .. } => [&[*greater], lesser.as_slice()].concat(),
            Self::RatioInfeasibility {
                numerator, denominator, ..
            } => [&[*denominator], numerator.as_slice()].concat(),
            Self::OverDetermined { .. }
            | Self::InvalidLockedFraction { .. }
            | Self::LockedFractionsExceedMix { .. } => vec![],
        }
    }

    /// Returns `true` if this issue is a duplicate of `other`.
    ///
    /// That is, if they are the same issue, or different issues that flag the same underlying
    /// problem: a `StructuralViolation`, `DominanceViolation`, `RollupSumMismatch`, or
    /// `RatioInfeasibility` that make the same part-group-versus-whole claim (see [`group_claim`]),
    /// or an `UnaffectableTarget` and an `UnreachableTarget` for the same zero-row target. Each
    /// check emits every issue it can find; this collapses the overlaps so the report stays concise
    /// and actionable.
    #[must_use]
    pub fn are_duplicates(&self, other: &Self) -> bool {
        self == other || are_dup_unaffectable_unreachable(self, other) || are_dup_group_claim(self, other)
    }
}

/// Returns `true` if `a` and `b` are an unaffectable/unreachable pair for the same target — two
/// framings of "this single target can't be met". The or-pattern matches either ordering.
fn are_dup_unaffectable_unreachable(a: &BalancingIssue, b: &BalancingIssue) -> bool {
    use BalancingIssue::{UnaffectableTarget, UnreachableTarget};
    matches!(
        (a, b),
        (UnaffectableTarget { key: x }, UnreachableTarget { key: y, .. })
            | (UnreachableTarget { key: x, .. }, UnaffectableTarget { key: y })
        if x == y
    )
}

/// The "this part-group is infeasible against this whole" claim shared by the structural, roll-up,
/// dominance, and ratio issues.
///
/// The `whole`/denominator key, the part keys (as a set), and whether the parts overshoot the whole
/// (`true`) or are pinned below it (`false`). Two issues with equal claims describe the same
/// contradiction — whichever check produced them — so [`are_dup_group_claim`] treats them as
/// duplicates; an overshoot and an undershoot of the same group stay distinct. Returns `None` for
/// issues that make no such claim.
#[must_use]
pub fn group_claim(issue: &BalancingIssue) -> Option<(BalanceKey, &[BalanceKey], bool)> {
    match issue {
        BalancingIssue::StructuralViolation { whole, parts, .. } => Some((*whole, parts, true)),
        BalancingIssue::RollupSumMismatch { whole, parts, .. } => Some((*whole, parts, false)),
        BalancingIssue::DominanceViolation { greater, lesser, .. } => Some((*greater, lesser, true)),
        BalancingIssue::RatioInfeasibility {
            denominator,
            numerator,
            target_ratio,
            min_ratio,
            max_ratio,
        } => {
            if *target_ratio > *max_ratio {
                Some((*denominator, numerator, true))
            } else if *target_ratio < *min_ratio {
                Some((*denominator, numerator, false))
            } else {
                None
            }
        }
        _ => None,
    }
}

/// Returns `true` if `a` and `b` make the same part-group-versus-whole claim (see [`group_claim`]).
#[must_use]
pub fn are_dup_group_claim(a: &BalancingIssue, b: &BalancingIssue) -> bool {
    match (group_claim(a), group_claim(b)) {
        (Some((whole_a, parts_a, over_a)), Some((whole_b, parts_b, over_b))) => {
            whole_a == whole_b && over_a == over_b && same_key_set(parts_a, parts_b)
        }
        _ => false,
    }
}

/// Returns `true` if `a` and `b` hold the same keys, regardless of order. Targets carry distinct
/// keys, so equal length plus containment is set equality without needing to dedup either side.
fn same_key_set(a: &[BalanceKey], b: &[BalanceKey]) -> bool {
    a.len() == b.len() && a.iter().all(|key| b.contains(key))
}

/// The result of validating balancing inputs: the full list of detected [`BalancingIssue`]s.
///
/// Use [`errors`](Self::errors), [`warnings`](Self::warnings), [`infos`](Self::infos) to partition
/// by [`Severity`], or [`into_result`](Self::into_result) to turn any error-severity into [`Error`]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BalancingReport {
    /// Every issue detected, in the order the checks were run; may mix errors, warnings, and infos.
    pub issues: Vec<BalancingIssue>,
}

impl BalancingReport {
    /// Iterates the error-severity issues (those that make balancing unsound).
    pub fn errors(&self) -> impl Iterator<Item = &BalancingIssue> {
        self.issues.iter().filter(|issue| issue.severity() == Severity::Error)
    }

    /// Iterates the warning-severity issues (suspicious, but balancing can still proceed).
    pub fn warnings(&self) -> impl Iterator<Item = &BalancingIssue> {
        self.issues.iter().filter(|issue| issue.severity() == Severity::Warning)
    }

    /// Iterates the information-severity issues (advisory observations that never block the solve).
    pub fn infos(&self) -> impl Iterator<Item = &BalancingIssue> {
        self.issues.iter().filter(|issue| issue.severity() == Severity::Info)
    }

    /// Returns `true` if any error-severity issue was detected.
    #[must_use]
    pub fn has_errors(&self) -> bool {
        self.errors().next().is_some()
    }

    /// Returns `true` if no issues were detected at all.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.issues.is_empty()
    }

    /// Converts the report into a [`Result`]: `Err` if any error-severity issue is present.
    ///
    /// The error message summarizes every error-severity issue. Warnings never produce an `Err`.
    ///
    /// # Errors
    ///
    /// Returns [`Error::InvalidBalancingTargets`] if [`has_errors`](Self::has_errors) is `true`.
    pub fn into_result(self) -> Result<()> {
        if self.has_errors() {
            let summary = self.errors().map(ToString::to_string).collect::<Vec<_>>().join("; ");
            Err(Error::InvalidBalancingTargets(summary))
        } else {
            Ok(())
        }
    }
}

/// Validates balancing inputs, returning every detected [`BalancingIssue`] (errors and warnings).
///
/// This is the inspection counterpart to [`balance_compositions`]: it never solves and never
/// errors, but reports all issues so a caller can surface them. [`balance_compositions`] calls
/// [`BalancingReport::into_result`] on this to reject error-severity inputs before solving.
///
/// The checks are:
/// - **Error** — non-finite or out-of-domain target values, duplicate target keys, proxy clashes.
/// - **Warning** — targets no composition affects; targets outside the palette's reachable range
///   (including ratio-key targets); palette-derived dominance and ratio-band infeasibilities
///   (pairwise and additive); palette-independent structural contradictions (a part target above
///   its whole, or a residual-free roll-up disagreeing with its parts).
/// - **Information** — over-determination (more targets than the palette can independently satisfy)
///
/// The reachability, dominance, and ratio warnings assume the non-negative, normalized (summing to
/// one) solution that [`balance_compositions`] targets. Each target's optional [`Priority`] is
/// accepted for signature parity with [`balance_compositions`] but does not affect validation.
/// Warnings run on the translated, solver-ready targets, so a warning against a translated target
/// names the proxy key (e.g. `AbsNetPAC`), not the original (e.g. `ServingTemp`); carrying the
/// original key through to the warnings is a planned follow-up (see TODO.md).
///
/// Each entry carries an optional **lock** matching [`balance_compositions`]: `(comp, Some(f))`
/// holds that composition at fraction `f`, `(comp, None)` leaves it free. This adds the lock
/// input-error checks (a non-finite or negative fraction, or fractions summing above the mix).
///
/// **Note:** When any composition is locked, or the mix evaporates (`evaporation` non-zero), the
/// palette-derived feasibility *warnings* (reachable range, dominance, ratio bands,
/// over-determination) are not computed — they assume a fully free, non-evaporated palette, so
/// would mislead otherwise (a locked palette isn't free; an evaporated palette reaches concentrated
/// targets through the water loss). The palette-independent error and structural checks are
/// unaffected. Making these warnings lock- and evaporation-aware is a planned follow-up.
///
/// `rel_tol` is the relative tolerance for the warning checks only: a target off a band or
/// structural equality by no more than `rel_tol` times the compared magnitudes is treated as
/// feasible. `None` (or `0.0`) is exact; a consumer of display-rounded targets passes a small value
/// matched to its precision so rounding a target does not raise a spurious warning.
///
/// `evaporation` is the fraction `E/T` of the pre-evaporation mix lost to preparation (`None`/`0.0`
/// for none), matching [`balance_compositions`]; it only gates the palette-warning skip above.
#[must_use]
pub fn validate_balancing_targets(
    comps: &[(Composition, Option<f64>)],
    targets: &[(BalanceKey, f64, Option<Priority>)],
    rel_tol: Option<f64>,
    evaporation: Option<f64>,
) -> BalancingReport {
    // The error checks run on the original keys; the flagged targets are then excluded from the
    // translation, whose priority-free `(key, value)` projection feeds the warning checks.
    let plain: Vec<(BalanceKey, f64)> = targets.iter().map(|&(key, value, _)| (key, value)).collect();
    let mut issues = Vec::new();
    append_target_error_issues(&plain, &mut issues);
    append_lock_error_issues(comps, &mut issues);

    let dropped = dropped_target_keys(&issues);
    let kept: Vec<(BalanceKey, f64, Option<Priority>)> = targets
        .iter()
        .filter(|(key, _, _)| !dropped.contains(key))
        .copied()
        .collect();
    let targets: Vec<(BalanceKey, f64)> = translate_balancing_targets(&kept)
        .iter()
        .map(|&(key, value, _)| (key, value))
        .collect();
    let targets = targets.as_slice();

    // Snapshot each composition once so the repeated, nested affectability and ratio-band scans
    // below index a flat array instead of recomputing `Composition::get` (see `FastComposition`).
    let fast: Vec<FastComposition> = comps.iter().map(|&(comp, _)| comp.to_fast()).collect();

    // Palette-derived feasibility warnings assume a fully free, non-evaporated palette.
    let skip_palette_checks = comps.iter().any(|&(_, lock)| lock.is_some()) || evaporation.is_some_and(|e| e != 0.0);

    append_input_warning_issues(&fast, targets, rel_tol.unwrap_or(0.0), skip_palette_checks, &mut issues);

    // Each check emits every issue it can detect, so the same underlying problem may surface as
    // several issues (e.g. a part/whole contradiction seen by both the structural and the palette
    // dominance check). Collapse those: keep the first of each duplicate group, which — because the
    // checks run from most to least fundamental — is the simplest, most actionable framing.
    let mut deduplicated: Vec<BalancingIssue> = Vec::new();
    for issue in issues {
        if !deduplicated.iter().any(|kept| kept.are_duplicates(&issue)) {
            deduplicated.push(issue);
        }
    }

    BalancingReport { issues: deduplicated }
}

/// Appends every error-severity target issue in its fixed order: the input checks
/// ([`append_input_error_issues`]), the domain checks ([`append_out_of_domain_error_issues`]),
/// and the proxy clashes ([`append_proxy_clash_error_issues`]).
///
/// The whole error-side gauntlet for balancing targets, run on the original (pre-translation) keys
/// by both entry points ([`balance_compositions`] and [`validate_balancing_targets`]) before
/// [`translate_balancing_targets`], so they apply identical checks in identical order.
pub(crate) fn append_target_error_issues(targets: &[(BalanceKey, f64)], issues: &mut Vec<BalancingIssue>) {
    append_input_error_issues(targets, issues);
    append_out_of_domain_error_issues(targets, issues);
    append_proxy_clash_error_issues(targets, issues);
}

/// The target keys downstream processing must drop, per `issues`: keys flagged with a value issue
/// and every member of a clashing group (ambiguous — no member can be preferred, and any surviving
/// pair would raise nonsense warnings against itself downstream). Duplicate-key issues do not
/// disqualify their key.
///
/// The flagged issues always gate the solve, so the drops only shape the report-only validation
/// path, mirroring how the warning checks already skip non-finite targets.
pub(crate) fn dropped_target_keys(issues: &[BalancingIssue]) -> HashSet<BalanceKey> {
    issues
        .iter()
        .flat_map(|issue| match issue {
            BalancingIssue::NonFiniteTarget { key, .. } | BalancingIssue::OutOfDomainTarget { key, .. } => {
                vec![*key]
            }
            BalancingIssue::ProxyTargetClash { keys, .. } => keys.clone(),
            _ => vec![],
        })
        .collect()
}

/// Appends the error-severity input issues: non-finite target values, duplicate keys.
///
/// These and [`append_lock_error_issues`] are the cheap error checks that gate the solve, so
/// [`balance_compositions`] runs them and skips the costly scan in [`validate_balancing_targets`].
pub(crate) fn append_input_error_issues(targets: &[(BalanceKey, f64)], issues: &mut Vec<BalancingIssue>) {
    let mut seen_targets: HashSet<BalanceKey> = HashSet::with_capacity(targets.len());
    for &(key, value) in targets {
        if !value.is_finite() {
            issues.push(BalancingIssue::NonFiniteTarget { key, value });
        }

        // Duplicate target keys are ambiguous, so they are an error
        if !seen_targets.insert(key) {
            issues.push(BalancingIssue::DuplicateTarget { key });
        }
    }
}

/// Appends an [`OutOfDomainTarget`](BalancingIssue::OutOfDomainTarget) for each finite target
/// value outside its key's admissible domain (see [`BalanceKey::target_domain`]).
///
/// Non-finite values are skipped: they are already flagged by [`append_input_error_issues`].
fn append_out_of_domain_error_issues(targets: &[(BalanceKey, f64)], issues: &mut Vec<BalancingIssue>) {
    for &(key, value) in targets {
        let domain = key.target_domain();
        if value.is_finite() && !domain.contains(&value) {
            issues.push(BalancingIssue::OutOfDomainTarget {
                key,
                value,
                min: *domain.start(),
                max: *domain.end(),
            });
        }
    }
}

/// Appends a [`ProxyTargetClash`](BalancingIssue::ProxyTargetClash) for each group of two or more
/// distinct target keys resolving to the same solver key (`proxy()`, or the key itself).
///
/// Purely key-level; values are irrelevant. Same-key repeats are already `DuplicateTarget`s and do
/// not additionally clash. Groups and their keys keep the input order.
fn append_proxy_clash_error_issues(targets: &[(BalanceKey, f64)], issues: &mut Vec<BalancingIssue>) {
    let mut groups: Vec<(BalanceKey, Vec<BalanceKey>)> = Vec::new();
    for &(key, _) in targets {
        let resolved = key.proxy().unwrap_or(key);
        match groups.iter_mut().find(|(proxy, _)| *proxy == resolved) {
            Some((_, keys)) => {
                if !keys.contains(&key) {
                    keys.push(key);
                }
            }
            None => groups.push((resolved, vec![key])),
        }
    }

    for (proxy, keys) in groups {
        if keys.len() >= 2 {
            issues.push(BalancingIssue::ProxyTargetClash { keys, proxy });
        }
    }
}

/// Appends the error-severity lock issues: a locked fraction that is not finite or is negative, or
/// locked fractions summing above the whole mix (> 1, within [`LOCKED_TOTAL_TOLERANCE`]).
///
/// Reads only each `comps` entry's lock (`Some(fraction)`); unlocked (`None`) entries are ignored.
/// The lock half of the cheap solve-gating error checks; see [`append_input_error_issues`].
pub(crate) fn append_lock_error_issues(comps: &[(Composition, Option<f64>)], issues: &mut Vec<BalancingIssue>) {
    let mut locked_total = 0.0;
    for (index, &(_, lock)) in comps.iter().enumerate() {
        if let Some(fraction) = lock {
            if !fraction.is_finite() || fraction < 0.0 {
                issues.push(BalancingIssue::InvalidLockedFraction { index, fraction });
            } else {
                locked_total += fraction;
            }
        }
    }

    if locked_total > 1.0 + LOCKED_TOTAL_TOLERANCE {
        issues.push(BalancingIssue::LockedFractionsExceedMix { locked_total });
    }
}

/// Appends the warning-severity input issues: unaffectable or unreachable targets and infeasible
/// target combinations (pairwise and additive dominance).
///
/// Every check here scans the compositions, so these are best-effort diagnostics that do not gate
/// the solve. [`balance_compositions`] skips them; only [`validate_balancing_targets`] runs them to
/// surface the full report.
///
/// When `skip_palette_checks`, the palette-derived checks (unaffectable, reachability, dominance,
/// ratio, over-determination) are skipped — they assume a fully free, non-evaporated palette and
/// would misreport a locked or evaporated one (aware versions are a follow-up).
fn append_input_warning_issues(
    comps: &[impl CompositionValues],
    targets: &[(BalanceKey, f64)],
    rel_tol: f64,
    skip_palette_checks: bool,
    issues: &mut Vec<BalancingIssue>,
) {
    if !skip_palette_checks {
        // Checks unaffectable targets. Non-finite and negative values are skipped (errors).
        for &(key, target) in targets {
            if is_finite_non_negative(target) && is_unaffectable(comps, key, target) {
                issues.push(BalancingIssue::UnaffectableTarget { key });
            }
        }

        append_reachability_issues(comps, targets, rel_tol, issues);
    }

    append_structural_issues(targets, rel_tol, issues);

    if !skip_palette_checks {
        append_palette_ratio_issues(comps, targets, rel_tol, issues);
        append_over_determination_issue(comps, targets, issues);
    }
}

/// Returns `true` if no composition can move `key`/`target` toward a meaningful value.
///
/// The shared predicate for "no ingredient can affect this target": [`constrainable_targets`] uses
/// it to drop such targets before solving, and [`validate_balancing_targets`] to flag as warnings.
///
/// For an extensive key this means every composition reads exactly zero for it. A ratio key is also
/// unaffectable when either of its parts is (see [`RatioKey::parts`]) — a zero denominator leaves
/// the ratio undefined, a zero numerator pins it to zero — or when its homogeneous row vanishes
/// across the palette (already exactly on-ratio).
pub(crate) fn is_unaffectable(comps: &[impl CompositionValues], key: BalanceKey, target: f64) -> bool {
    match key {
        BalanceKey::Ratio(ratio) => {
            let (numerator, denominator) = ratio.parts();
            is_key_unaffectable(comps, numerator)
                || is_key_unaffectable(comps, denominator)
                || comps.iter().all(|comp| target_row_coeff(key, target, comp) == 0.0)
        }
        BalanceKey::Comp(comp_key) => is_key_unaffectable(comps, comp_key),
        BalanceKey::Fpd(_) => unreachable!("FPD keys must be translated to their proxy before validation"),
    }
}

/// Returns `true` if every composition reads exactly zero for the extensive `key`.
fn is_key_unaffectable(comps: &[impl CompositionValues], key: CompKey) -> bool {
    comps.iter().all(|comp| comp.get(key) == 0.0)
}

/// The sum of a composition's values over a group of keys.
fn group_value(comp: &impl CompositionValues, keys: &[CompKey]) -> f64 {
    keys.iter().map(|&key| comp.get(key)).sum()
}

/// The `[min, max]` band of the achievable group ratio `Σ num / Σ den` across `comps`, or `None`
/// when no composition has a positive denominator (the ratio is everywhere undefined).
///
/// The single primitive behind every reachability, dominance, and ratio check. Because the
/// achievable mixes form the convex hull of `comps`, the achievable `Σ num / Σ den` is a convex
/// combination of the per-composition ratios and therefore lies in this band, so a target ratio
/// outside it is unreachable by any non-negative normalized mix.
///
/// An empty `den` denotes the implicit sum-to-one total (`Σ den = 1`), reducing the band to the
/// reachable range of the absolute quantity `Σ num` (the magnitude check). `max` is
/// [`f64::INFINITY`] when some composition has a zero denominator but a positive numerator.
pub(crate) fn ratio_band(comps: &[impl CompositionValues], num: &[CompKey], den: &[CompKey]) -> Option<(f64, f64)> {
    band_over(comps.iter().map(|comp| {
        let denominator = if den.is_empty() { 1.0 } else { group_value(comp, den) };
        (group_value(comp, num), denominator)
    }))
}

/// Folds per-composition `(numerator, denominator)` pairs into the `[min, max]` band of `numerator
/// / denominator` over the compositions with a positive denominator, or `None` if none have one.
///
/// `max` is [`f64::INFINITY`] when some composition has a zero denominator but a positive
/// numerator (the ratio can be pushed arbitrarily high). Shared by [`ratio_band`] and
/// [`RatioSearch::band_for`], which differ only in where the per-composition values come from.
fn band_over(per_composition: impl Iterator<Item = (f64, f64)>) -> Option<(f64, f64)> {
    let mut band: Option<(f64, f64)> = None;
    let mut unbounded_above = false;

    for (numerator, denominator) in per_composition {
        if denominator > 0.0 {
            let ratio = numerator / denominator;
            band = Some(band.map_or((ratio, ratio), |(min, max)| (min.min(ratio), max.max(ratio))));
        } else if numerator > 0.0 {
            unbounded_above = true;
        }
    }

    band.map(|(min, max)| (min, if unbounded_above { f64::INFINITY } else { max }))
}

/// Pushes the issue built by `emit(min, max)` when `ratio` falls outside the band `(min, max)`.
///
/// The shared comparator for the ratio-band checks. Tolerance-aware via [`is_within_range_rel`]; an
/// infinite `max` leaves the upper bound always satisfied. `emit` lets each caller attach the
/// simplest issue for its shape (reachability, dominance, or ratio).
fn push_if_off_band(
    ratio: f64,
    (min, max): (f64, f64),
    rel_tol: f64,
    issues: &mut Vec<BalancingIssue>,
    emit: impl FnOnce(f64, f64) -> BalancingIssue,
) {
    if !is_within_range_rel(ratio, min, max, rel_tol) {
        issues.push(emit(min, max));
    }
}

/// Returns `true` if `key`/`target` is a meaningful target to compare in the dominance/ratio
/// checks: not a ratio key (its homogeneous row has no single-key magnitude), finite, non-negative,
/// and affected by at least one composition. Non-finite and negative targets have their own checks.
fn is_dominance_checkable_target(comps: &[impl CompositionValues], key: BalanceKey, target: f64) -> bool {
    !key.is_ratio() && is_finite_non_negative(target) && !is_unaffectable(comps, key, target)
}

/// Returns `true` if `target` is a meaningful target to compare against the ratio band.
fn is_finite_non_negative(target: f64) -> bool {
    target.is_finite() && target >= 0.0
}

/// Returns the target value for `key` from `targets`, or `None` if it is not a target.
fn value_of(targets: &[(CompKey, f64)], key: CompKey) -> Option<f64> {
    targets.iter().find_map(|&(k, v)| (k == key).then_some(v))
}

/// Appends the reachability warnings: a target outside the band the palette can reach.
///
/// For an extensive key this is the absolute magnitude band ([`ratio_band`] with an empty
/// denominator); for a ratio key it is its numerator/denominator band scaled to a percentage,
/// Unaffectable and non-finite or out-of-domain targets are handled elsewhere and skipped here.
fn append_reachability_issues(
    comps: &[impl CompositionValues],
    targets: &[(BalanceKey, f64)],
    rel_tol: f64,
    issues: &mut Vec<BalancingIssue>,
) {
    for &(key, target) in targets {
        if is_finite_non_negative(target) && !is_unaffectable(comps, key, target) {
            let emit = |min, max| BalancingIssue::UnreachableTarget { key, target, min, max };

            if let Some(band) = match key {
                BalanceKey::Comp(comp_key) => ratio_band(comps, &[comp_key], &[]),
                BalanceKey::Ratio(ratio) => {
                    let (num, den) = ratio.parts();
                    ratio_band(comps, &[num], &[den]).map(|(min, max)| (min * 100.0, max * 100.0))
                }
                BalanceKey::Fpd(_) => unreachable!("FPD keys must be translated to their proxy before validation"),
            } {
                push_if_off_band(target, band, rel_tol, issues, emit);
            }
        }
    }
}

/// Appends the palette-independent structural coherence warnings.
///
/// Two checks, both derived from the composition hierarchy and true regardless of the palette:
///   - **ordering** — the targeted parts of a roll-up may not sum above the roll-up's own target
///     (see [`CompKey::children`]); symmetrically, a part may not exceed a targeted whole it
///     belongs to (see [`CompKey::parents`]). Even a strict subset of the children over-summing the
///     whole is a contradiction, since the remaining siblings can only add more.
///   - **completeness** — when *every* direct child of a residual-free roll-up (see
///     [`CompKey::is_residual_free_rollup`]) is a target, children must sum to the whole exactly.
///
/// Only extensive, finite, non-negative targets participate. The checks emit independently of any
/// palette overlap; [`validate_balancing_targets`] deduplicates against palette dominance issues.
pub fn append_structural_issues(targets: &[(BalanceKey, f64)], rel_tol: f64, issues: &mut Vec<BalancingIssue>) {
    let comp_targets: Vec<(CompKey, f64)> = targets
        .iter()
        .filter_map(|&(key, target)| match key {
            BalanceKey::Comp(comp_key) if is_finite_non_negative(target) => Some((comp_key, target)),
            _ => None,
        })
        .collect();

    for &(key, target) in &comp_targets {
        if key.is_rollup() {
            let children = key.children();

            let active_children = children
                .iter()
                .filter(|&&child| value_of(&comp_targets, child).is_some())
                .collect::<Vec<_>>();

            let children_sum: f64 = active_children
                .iter()
                .filter_map(|&&child| value_of(&comp_targets, child))
                .sum();

            if !is_subset_rel(children_sum, target, rel_tol) {
                issues.push(BalancingIssue::StructuralViolation {
                    parts: active_children.iter().map(|&&child| child.into()).collect(),
                    whole: key.into(),
                    parts_target_sum: children_sum,
                    whole_target: target,
                });
            } else if key.is_residual_free_rollup()
                && children.len() == active_children.len()
                && !are_equal_rel(children_sum, target, rel_tol)
            {
                issues.push(BalancingIssue::RollupSumMismatch {
                    whole: key.into(),
                    parts: active_children.iter().map(|&&child| child.into()).collect(),
                    parts_target_sum: children_sum,
                    whole_target: target,
                });
            }
        } else {
            for parent in key.parents() {
                if let Some(parent_target) = value_of(&comp_targets, *parent)
                    && !is_subset_rel(target, parent_target, rel_tol)
                {
                    issues.push(BalancingIssue::StructuralViolation {
                        parts: vec![key.into()],
                        whole: (*parent).into(),
                        parts_target_sum: target,
                        whole_target: parent_target,
                    });
                }
            }
        }
    }
}

#[cfg(doc)]
use BalancingIssue::{DominanceViolation, OverDetermined, RatioInfeasibility};

/// The verdict for a candidate numerator subset against a fixed denominator.
enum RatioVerdict {
    /// The target ratio lies within the achievable band — keep extending the subset.
    InBand,
    /// Off-band, hence minimal (a superset adds nothing); emit `issue` and stop extending.
    OffBand(BalancingIssue),
    /// Off-band, but the single-key pair is reported by the mirror pass (numerator-before-
    /// denominator orientation), so stay silent here. Terminal like `OffBand`: no extension.
    Suppressed,
}

/// Per-denominator state for the unified palette ratio search (one fixed single-key denominator).
#[derive(Debug)]
pub struct RatioSearch<'a, C> {
    candidates: &'a [(CompKey, f64)],
    /// The palette, read via [`CompositionValues`]; a [`FastComposition`] snapshot upstream makes
    /// each read an array index, keeping the band loop cheap.
    comps: &'a [C],
    den_index: usize,
    den_key: CompKey,
    den_target: f64,
    /// The numerator subset-size cap for this run.
    ///
    /// See [`MAX_NUM_GROUP_SIZE_FOR_TYPICAL`], [`MAX_NUM_GROUP_SIZE_FOR_HIGHER_ORDER`], and
    /// [`HIGHER_ORDER_CANDIDATE_LIMIT`] for the rationale behind these caps.
    max_numerator: usize,
    /// Relative tolerance for the in-band target check (see [`validate_balancing_targets`]).
    rel_tol: f64,
}

impl<C: CompositionValues> RatioSearch<'_, C> {
    /// Depth-first, depth-capped search over numerator subsets
    ///
    /// This pushes the minimal off-band subset for this denominator into `issues`. Off-band subsets
    /// are not extended (a superset is redundant), which keeps the reported sets minimal.
    fn search(&self, start: usize, subset: &mut Vec<usize>, issues: &mut Vec<BalancingIssue>) {
        if !subset.is_empty() {
            match self.evaluate(subset) {
                RatioVerdict::InBand => {}
                RatioVerdict::OffBand(issue) => {
                    issues.push(issue);
                    return;
                }
                RatioVerdict::Suppressed => return,
            }
        }

        if subset.len() < self.max_numerator {
            for next in start..self.candidates.len() {
                let key = self.candidates[next].0;
                // Skip itself and and don't double count structural overlaps (part/whole of other)
                if next != self.den_index
                    && !subset.iter().any(|&j| {
                        let chosen = self.candidates[j].0;
                        key.is_part_of(chosen) || chosen.is_part_of(key)
                    })
                {
                    subset.push(next);
                    self.search(next + 1, subset, issues);
                    let _ = subset.pop();
                }
            }
        }
    }

    /// The `[min, max]` band of `Σ subset / denominator` across the palette, via [`band_over`].
    /// Reads each composition by key — an array index when the palette is [`FastComposition`].
    ///
    /// Infallible within a valid search: `den_key` is an affectable candidate, so some
    /// composition reads it positive and [`band_over`] always finds a denominator.
    fn band_for(&self, subset: &[usize]) -> (f64, f64) {
        band_over(self.comps.iter().map(|comp| {
            let numerator: f64 = subset.iter().map(|&j| comp.get(self.candidates[j].0)).sum();
            (numerator, comp.get(self.den_key))
        }))
        .expect("den_key should be an affectable candidate, so the band should be defined")
    }

    /// Classifies the subset's target ratio against the palette band, choosing the friendlier
    /// dominance rendering for the `max <= 1` ordering corner and a ratio infeasibility otherwise.
    ///
    /// Allocates nothing on the common in-band path — only when an issue is actually emitted.
    fn evaluate(&self, subset: &[usize]) -> RatioVerdict {
        let (min, max) = self.band_for(subset);
        let target_sum: f64 = subset.iter().map(|&i| self.candidates[i].1).sum();
        let target = target_sum / self.den_target;

        if is_within_range_rel(target, min, max, self.rel_tol) {
            return RatioVerdict::InBand;
        }

        // A single-key pair is one fact in two orientations; report it from the numerator-before-
        // denominator pass and leave the mirror (this key as a denominator) suppressed.
        if let &[only] = subset
            && only >= self.den_index
        {
            return RatioVerdict::Suppressed;
        }

        // Overshoot dominance: the parts' targets sum past a whole they never reach.
        if is_subset(max, 1.0) && target_sum > self.den_target {
            return RatioVerdict::OffBand(BalancingIssue::DominanceViolation {
                lesser: subset.iter().map(|&i| self.candidates[i].0.into()).collect(),
                greater: self.den_key.into(),
                lesser_target_sum: target_sum,
                greater_target: self.den_target,
            });
        }

        // Undershoot dominance (single numerator): it dominates the denominator, over-targeted.
        if let &[part] = subset
            && is_subset(1.0, min)
            && self.den_target > target_sum
        {
            return RatioVerdict::OffBand(BalancingIssue::DominanceViolation {
                lesser: vec![self.den_key.into()],
                greater: self.candidates[part].0.into(),
                lesser_target_sum: self.den_target,
                greater_target: target_sum,
            });
        }

        RatioVerdict::OffBand(BalancingIssue::RatioInfeasibility {
            numerator: subset.iter().map(|&i| self.candidates[i].0.into()).collect(),
            denominator: self.den_key.into(),
            target_ratio: target,
            min_ratio: min,
            max_ratio: max,
        })
    }
}

/// Appends every palette-derived dominance and ratio infeasibility as one unified search.
///
/// For each single-key denominator it runs a depth-capped DFS ([`RatioSearch`]) over numerator
/// subsets, feeding the shared [`is_within_range_rel`] primitive and reporting the minimal off-band
/// subset: the `max <= 1` ordering corner as the friendlier [`DominanceViolation`], any other
/// off-band ratio as [`RatioInfeasibility`]. Structural part/whole ordering stays owned by
/// [`append_structural_issues`].
///
/// The numerator subset size is capped at [`MAX_NUM_GROUP_SIZE_FOR_TYPICAL`], or
/// [`MAX_NUM_GROUP_SIZE_FOR_HIGHER_ORDER`] if checkable targets exceed
/// [`HIGHER_ORDER_CANDIDATE_LIMIT`] (where the exhaustive search would be too costly).
///
/// @todo Group (multi-key) denominators are a follow-up — issue variants carry a single den key.
pub fn append_palette_ratio_issues(
    comps: &[impl CompositionValues],
    targets: &[(BalanceKey, f64)],
    rel_tol: f64,
    issues: &mut Vec<BalancingIssue>,
) {
    let candidates: Vec<(CompKey, f64)> = targets
        .iter()
        .filter_map(|&(key, target)| match key {
            BalanceKey::Comp(comp) if is_dominance_checkable_target(comps, key, target) => Some((comp, target)),
            _ => None,
        })
        .collect();

    let max_numerator = if candidates.len() <= HIGHER_ORDER_CANDIDATE_LIMIT {
        MAX_NUM_GROUP_SIZE_FOR_TYPICAL
    } else {
        MAX_NUM_GROUP_SIZE_FOR_HIGHER_ORDER
    };

    for (den_index, &(den_key, den_target)) in candidates.iter().enumerate() {
        // A zero-target denominator has no meaningful ratio (`Σ parts / 0`).
        if den_target > 0.0 {
            let search = RatioSearch {
                candidates: &candidates,
                comps,
                den_index,
                den_key,
                den_target,
                max_numerator,
                rel_tol,
            };
            search.search(0, &mut Vec::new(), issues);
        }
    }
}

/// Appends the over-determination information notice.
///
/// With `n` ingredients the sum-to-one constraint leaves `n - 1` degrees of freedom, so more than
/// `n - 1` movable targets must be met approximately. A degrees-of-freedom heuristic that ignores
/// linear dependence among target rows — hence [`Severity::Info`], not a warning.
fn append_over_determination_issue(
    comps: &[impl CompositionValues],
    targets: &[(BalanceKey, f64)],
    issues: &mut Vec<BalancingIssue>,
) {
    if !comps.is_empty() {
        let target_count = targets
            .iter()
            .filter(|&&(key, target)| is_dominance_checkable_target(comps, key, target))
            .count();

        if target_count > comps.len() - 1 {
            issues.push(BalancingIssue::OverDetermined {
                target_count,
                ingredient_count: comps.len(),
            });
        }
    }
}
