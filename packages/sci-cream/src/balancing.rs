//! Utilities for balancing compositions to match target values for specified keys, usually by
//! solving a least squares problem, through [`nalgebra`] SVD, [`mod@nnls`] non-negative, etc.
//!
//! For example, for [3.25% Milk, 40 % Cream, Skimmed Powder] and target [Milk Fat, MSNF].
//!
//! We want to solve the least squares problem for:
//!
//!   [3.25, 40,    0]   \[x1\]   \[16\]  // Milk Fat
//!   [8.71,  5.4, 97] * \[x2\] = \[11\]  // MSNF
//!   [1,     1,    1]   \[x3\]    \[1\]  // Total sums to 100%
//!
//! Where x1, x2, x3 are the amounts of each composition/ingredient to use.

use nalgebra::{DMatrix, DVector, SVD};
use ndarray::{Array1, Array2};
use nnls::nnls;
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;

use crate::{
    composition::{CompKey, Composition, RatioKey},
    constants::balancing::{
        CRITICAL_PRIORITY_WEIGHT, HIGH_PRIORITY_WEIGHT, LOW_PRIORITY_WEIGHT, NORMAL_PRIORITY_WEIGHT,
        RATIO_DENOMINATOR_FLOOR, RATIO_REWEIGHT_TOLERANCE, RELATIVE_WEIGHT_FLOOR, SUM_CONSTRAINT_WEIGHT,
        SVD_SOLVE_EPSILON, TYPICAL_MIX_FAT, TYPICAL_MIX_WATER,
    },
    error::{Error, Result},
    validate::{are_equal_within_epsilon, is_subset, is_within_range},
};

/// A key usable as a balancing target: either an extensive [`CompKey`] or an intensive [`RatioKey`]
///
/// Balancing accepts both kinds of key but treats them differently — an extensive key contributes a
/// direct weighted-sum row, a ratio key a homogeneous row (see [`target_row_coeff`]). This union is
/// the balancing-facing counterpart of [`PropKey`](crate::properties::PropKey) (which additionally
/// carries [`FpdKey`](crate::fpd::FpdKey), which is not currently a supported balancing target).
///
/// **Note**: The different variants all use `#[serde(untagged)]` to allow a flat list of keys in
/// the WASM-facing balancing API, in line with how the TypeScript wrappers handle `PropKey`. This
/// requires that all variant names be unique across all the underlying key types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BalanceKey {
    /// An extensive composition key (additive, scalable by quantity).
    #[serde(untagged)]
    Comp(CompKey),
    /// An intensive ratio key (`numerator / denominator`, non-additive).
    #[serde(untagged)]
    Ratio(RatioKey),
}

impl From<CompKey> for BalanceKey {
    fn from(key: CompKey) -> Self {
        Self::Comp(key)
    }
}

impl From<RatioKey> for BalanceKey {
    fn from(key: RatioKey) -> Self {
        Self::Ratio(key)
    }
}

impl BalanceKey {
    /// Returns `true` if this is a ratio key (encoded as a homogeneous row when balancing).
    #[must_use]
    pub const fn is_ratio(self) -> bool {
        matches!(self, Self::Ratio(_))
    }

    /// The `(numerator, denominator)` extensive [`CompKey`] parts if this is a ratio key, else
    /// `None` (see [`RatioKey::parts`]).
    #[must_use]
    pub const fn ratio_parts(self) -> Option<(CompKey, CompKey)> {
        match self {
            Self::Ratio(key) => Some(key.parts()),
            Self::Comp(_) => None,
        }
    }

    /// This key's value for a single composition: the extensive reading [`Composition::get`] for an
    /// extensive key, or the intensive [`Composition::get_ratio`] for a ratio key.
    #[must_use]
    pub fn value(self, comp: &Composition) -> f64 {
        match self {
            Self::Comp(key) => comp.get(key),
            Self::Ratio(key) => comp.get_ratio(key),
        }
    }
}

/// How target rows are weighted when assembling the least-squares system.
///
/// Plain least squares minimizes *absolute* squared error, so a residual of `0.1` counts the same
/// against a target of `1` (a 10% miss) as against a target of `100` (a 0.1% miss). In balancing we
/// care about *relative* error, so small targets (salt, stabilizer) are not swamped by large ones
/// (energy, water). [`Weighting::Relative`] expresses that as a weighted least-squares problem.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Weighting {
    /// Every target row has weight 1 — the textbook absolute-error objective.
    Absolute,
    /// Each target row is scaled by `1 / max(|target|, RELATIVE_WEIGHT_FLOOR)`, so the solver
    /// minimizes relative rather than absolute error, preventing various numerical issues.
    Relative,
}

/// The relative importance of a balancing target, on top of the [`Weighting`] mode.
///
/// Each target row in the least-squares system is multiplied by its priority's
/// [`weight`](Self::weight), so higher-priority keys are fit more closely at the expense of
/// lower-priority ones. Because least squares minimizes `(weight · residual)²`, a multiplier `m`
/// scales a key's error emphasis by `m²`.
///
/// This is the abstract level accepted by [`balance_compositions`]; it translates each `Priority`
/// to the numeric weight the solvers ([`balance_compositions_nnls`],
/// [`balance_compositions_nalgebra`]) consume. [`Priority::Normal`] is the default and maps to a
/// weight of 1 — the unprioritized behavior — so an empty priority list leaves the solve unchanged.
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Priority {
    /// Lowest priority; weight multiplier [`LOW_PRIORITY_WEIGHT`].
    Low,
    /// Default priority; weight multiplier [`NORMAL_PRIORITY_WEIGHT`], i.e. 1 (unprioritized).
    #[default]
    Normal,
    /// Elevated priority; weight multiplier [`HIGH_PRIORITY_WEIGHT`].
    High,
    /// Highest priority; weight multiplier [`CRITICAL_PRIORITY_WEIGHT`].
    Critical,
}

impl Priority {
    /// The numeric row-weight multiplier this priority maps to (1 for [`Priority::Normal`]).
    #[must_use]
    pub const fn weight(self) -> f64 {
        match self {
            Self::Low => LOW_PRIORITY_WEIGHT,
            Self::Normal => NORMAL_PRIORITY_WEIGHT,
            Self::High => HIGH_PRIORITY_WEIGHT,
            Self::Critical => CRITICAL_PRIORITY_WEIGHT,
        }
    }
}

/// A balancing solver function pointer, e.g. [`balance_compositions_nnls`].
type SolverFn = fn(
    &[Composition],
    &[(BalanceKey, f64)],
    Option<Weighting>,
    &[(BalanceKey, f64)],
) -> Result<Vec<(Composition, f64)>>;

/// Balances the given compositions to match target values — the validated public entry point.
///
/// This is the recommended way to balance: it first checks the inputs for error-severity issues,
/// returning an [`Error::InvalidBalancingTargets`] if any is present (non-finite or negative target
/// values, duplicate target keys, or duplicate priority keys), then solves with an automatically
/// chosen solver. `weighting` sets the row weighting; `None` defaults to [`Weighting::Relative`].
///
/// Only error-severity issues gate the solve, as only they make it unsound. The warning-severity
/// checks (e.g. unreachable or illogical targets) scan every composition without affecting the
/// result, so [`validate_balancing_targets`] handles them, reporting the full set for inspection.
///
/// `priorities` raises the relative importance of specific target keys: each listed key's row is
/// weighted by its [`Priority::weight`], so the solver fits it more closely at the expense of the
/// rest. Keys not listed default to [`Priority::Normal`] (weight 1), so an empty slice leaves the
/// solve unchanged. The abstract priorities are translated to numeric weights here before solving.
///
/// The chosen solver is currently always [`balance_compositions_nnls`] (non-negative): negative
/// ingredient amounts are not meaningful for real recipes, so the [`balance_compositions_nalgebra`]
/// path is reserved for internal verification and benchmarking and is not used here.
///
/// # Errors
///
/// Returns [`Error::InvalidBalancingTargets`] if the inputs contain an error-severity issue, or any
/// error forwarded from the chosen solver if the underlying solve fails.
pub fn balance_compositions(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priorities: &[(BalanceKey, Priority)],
) -> Result<Vec<(Composition, f64)>> {
    // Gate on the cheap error checks only; `balance_compositions` discards warnings, so the
    // composition-scanning warning checks are wasted work (see `append_input_warning_issues`).
    let mut issues = Vec::new();
    append_input_error_issues(targets, priorities, &mut issues);
    BalancingReport { issues }.into_result()?;
    let priority_weights: Vec<(BalanceKey, f64)> = priorities
        .iter()
        .map(|&(key, priority)| (key, priority.weight()))
        .collect();
    choose_solver(comps, targets)(comps, targets, weighting, &priority_weights)
}

/// Selects the underlying solver for [`balance_compositions`].
///
/// Centralizes the choice of solver so it can evolve independently of callers. Currently always
/// returns [`balance_compositions_nnls`], the non-negative solver used in production.
const fn choose_solver(_comps: &[Composition], _targets: &[(BalanceKey, f64)]) -> SolverFn {
    balance_compositions_nnls
}

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
    /// A target value is negative. Every balanceable key is non-negative, so a target must be >= 0.
    ///
    /// Severity: [`Severity::Error`].
    NegativeTarget {
        /// The key whose target value is negative.
        key: BalanceKey,
        /// The offending negative value.
        value: f64,
    },
    /// The same key appears more than once in the targets, which is contradictory or ambiguous.
    ///
    /// Severity: [`Severity::Error`].
    DuplicateTarget {
        /// The key that appears more than once.
        key: BalanceKey,
    },
    /// The same key appears more than once in the priorities, which is contradictory or ambiguous.
    ///
    /// Severity: [`Severity::Error`].
    DuplicatePriority {
        /// The priority key that appears more than once.
        key: BalanceKey,
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
    /// A priority names a key with no target, so it has no effect — only target rows are weighted.
    ///
    /// Severity: [`Severity::Warning`].
    PriorityWithoutTarget {
        /// The priority key that has no corresponding target.
        key: BalanceKey,
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
            | Self::NegativeTarget { .. }
            | Self::DuplicateTarget { .. }
            | Self::DuplicatePriority { .. } => Severity::Error,
            Self::UnaffectableTarget { .. }
            | Self::UnreachableTarget { .. }
            | Self::StructuralViolation { .. }
            | Self::RollupSumMismatch { .. }
            | Self::DominanceViolation { .. }
            | Self::RatioInfeasibility { .. }
            | Self::PriorityWithoutTarget { .. } => Severity::Warning,
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
            | Self::NegativeTarget { key, .. }
            | Self::DuplicateTarget { key }
            | Self::DuplicatePriority { key }
            | Self::UnaffectableTarget { key }
            | Self::UnreachableTarget { key, .. }
            | Self::PriorityWithoutTarget { key } => vec![*key],
            Self::StructuralViolation { parts, whole, .. } | Self::RollupSumMismatch { whole, parts, .. } => {
                [&[*whole], parts.as_slice()].concat()
            }
            Self::DominanceViolation { lesser, greater, .. } => [&[*greater], lesser.as_slice()].concat(),
            Self::RatioInfeasibility {
                numerator, denominator, ..
            } => [&[*denominator], numerator.as_slice()].concat(),
            Self::OverDetermined { .. } => vec![],
        }
    }
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
/// - **Error** — non-finite or negative target values, duplicate target keys or priority keys.
/// - **Warning** — targets no composition affects; targets outside the palette's reachable range
///   (including ratio-key targets); palette-derived dominance and ratio-band infeasibilities
///   (pairwise and additive); palette-independent structural contradictions (a part target above
///   its whole, or a residual-free roll-up disagreeing with its parts); and target-less priorities.
/// - **Information** — over-determination (more targets than the palette can independently satisfy)
///
/// The reachability, dominance, and ratio warnings assume the non-negative, normalized (summing to
/// one) solution that [`balance_compositions`] targets. `priorities` is the same list
/// [`balance_compositions`] accepts; keys are checked (against duplicates and missing targets).
#[must_use]
pub fn validate_balancing_targets(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    priorities: &[(BalanceKey, Priority)],
) -> BalancingReport {
    let mut issues = Vec::new();
    append_input_error_issues(targets, priorities, &mut issues);
    append_input_warning_issues(comps, targets, priorities, &mut issues);
    BalancingReport { issues }
}

/// Appends the error-severity input issues: non-finite or negative target values, duplicate target
/// keys, and duplicate priority keys.
///
/// These are the only checks that gate the solve and they require no composition data, so
/// [`balance_compositions`] runs just these and skips the costlier [`append_input_warning_issues`]
/// that [`validate_balancing_targets`] adds for inspection.
fn append_input_error_issues(
    targets: &[(BalanceKey, f64)],
    priorities: &[(BalanceKey, Priority)],
    issues: &mut Vec<BalancingIssue>,
) {
    // Non-finite/negative values and duplicate keys. Ratio keys are OK — they are encoded as
    // homogeneous rows (see `RatioKey::parts`) and balance like any other key.
    let mut seen: Vec<BalanceKey> = Vec::with_capacity(targets.len());
    for &(key, value) in targets {
        if !value.is_finite() {
            issues.push(BalancingIssue::NonFiniteTarget { key, value });
        } else if value < 0.0 {
            issues.push(BalancingIssue::NegativeTarget { key, value });
        }

        if seen.contains(&key) {
            issues.push(BalancingIssue::DuplicateTarget { key });
        } else {
            seen.push(key);
        }
    }

    // Duplicate priority keys are ambiguous (which weight wins?), so they are an error.
    let mut seen_priorities: Vec<BalanceKey> = Vec::with_capacity(priorities.len());
    for &(key, _) in priorities {
        if seen_priorities.contains(&key) {
            issues.push(BalancingIssue::DuplicatePriority { key });
        } else {
            seen_priorities.push(key);
        }
    }
}

/// Appends the warning-severity input issues: unaffectable or unreachable targets, infeasible
/// target combinations (pairwise and additive dominance), and priorities without a target.
///
/// Every check here scans the compositions, so these are best-effort diagnostics that do not gate
/// the solve. [`balance_compositions`] skips them; only [`validate_balancing_targets`] runs them to
/// surface the full report.
fn append_input_warning_issues(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    priorities: &[(BalanceKey, Priority)],
    issues: &mut Vec<BalancingIssue>,
) {
    // Per-target checks: unaffectable and unreachable targets. Non-finite and negative values are
    // skipped (reported as errors). Ratio keys get the unaffectable check but skip the range check,
    // having no single-key magnitude to compare against the palette.
    for &(key, target) in targets {
        if target.is_finite() && target >= 0.0 && is_unaffectable(comps, key, target) {
            issues.push(BalancingIssue::UnaffectableTarget { key });
        }
    }

    append_reachability_issues(comps, targets, issues);
    append_structural_issues(targets, issues);
    append_palette_pairwise_issues(comps, targets, issues);
    append_palette_additive_issues(comps, targets, issues);
    append_palette_multi_ratio_issues(comps, targets, issues);
    append_over_determination_issue(comps, targets, issues);

    // A priority whose key is not among the targets is a no-op: only target rows are weighted.
    // Duplicates are reported as errors elsewhere, so each distinct key is checked once.
    let mut seen_priorities: Vec<BalanceKey> = Vec::with_capacity(priorities.len());
    for &(key, _) in priorities {
        if seen_priorities.contains(&key) {
            continue;
        }
        seen_priorities.push(key);
        if !targets.iter().any(|&(target_key, _)| target_key == key) {
            issues.push(BalancingIssue::PriorityWithoutTarget { key });
        }
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
fn is_unaffectable(comps: &[Composition], key: BalanceKey, target: f64) -> bool {
    match key {
        BalanceKey::Ratio(ratio) => {
            let (numerator, denominator) = ratio.parts();
            is_key_unaffectable(comps, numerator)
                || is_key_unaffectable(comps, denominator)
                || comps.iter().all(|comp| target_row_coeff(key, target, comp) == 0.0)
        }
        BalanceKey::Comp(comp_key) => is_key_unaffectable(comps, comp_key),
    }
}

/// Returns `true` if every composition reads exactly zero for the extensive `key`.
fn is_key_unaffectable(comps: &[Composition], key: CompKey) -> bool {
    comps.iter().all(|comp| comp.get(key) == 0.0)
}

/// The sum of a composition's values over a group of keys.
fn group_value(comp: &Composition, keys: &[CompKey]) -> f64 {
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
fn ratio_band(comps: &[Composition], num: &[CompKey], den: &[CompKey]) -> Option<(f64, f64)> {
    let mut band: Option<(f64, f64)> = None;
    let mut unbounded_above = false;

    for comp in comps {
        let numerator = group_value(comp, num);
        let denominator = if den.is_empty() { 1.0 } else { group_value(comp, den) };
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
/// The shared comparator for the ratio-band checks. Epsilon-aware via [`is_within_range`]; an
/// infinite `max` leaves the upper bound always satisfied. `emit` lets each caller attach the
/// simplest issue for its shape (reachability, dominance, or ratio).
fn push_if_off_band(
    ratio: f64,
    (min, max): (f64, f64),
    issues: &mut Vec<BalancingIssue>,
    emit: impl FnOnce(f64, f64) -> BalancingIssue,
) {
    if !is_within_range(ratio, min, max) {
        issues.push(emit(min, max));
    }
}

/// Returns `true` if `greater` dominates `lesser` across `comps`: every composition has
/// `lesser <= greater` for these keys (epsilon-aware). Vacuously false for an empty palette.
///
/// The subtraction-based classifier for the `max <= 1` band corner, kept distinct from
/// [`ratio_band`] because it is robust where a denominator vanishes.
fn dominates(comps: &[Composition], greater: CompKey, lesser: CompKey) -> bool {
    !comps.is_empty() && comps.iter().all(|comp| is_subset(comp.get(lesser), comp.get(greater)))
}

/// Returns `true` if `key`/`target` is a meaningful target to compare in the dominance/ratio
/// checks: not a ratio key (its homogeneous row has no single-key magnitude), finite, non-negative,
/// and affected by at least one composition. Non-finite and negative targets have their own checks.
fn is_dominance_checkable_target(comps: &[Composition], key: BalanceKey, target: f64) -> bool {
    !key.is_ratio() && target.is_finite() && target >= 0.0 && !is_unaffectable(comps, key, target)
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
/// Unaffectable and non-finite or negative targets are handled elsewhere and skipped here.
fn append_reachability_issues(comps: &[Composition], targets: &[(BalanceKey, f64)], issues: &mut Vec<BalancingIssue>) {
    for &(key, target) in targets {
        if is_finite_non_negative(target) && !is_unaffectable(comps, key, target) {
            let emit = |min, max| BalancingIssue::UnreachableTarget { key, target, min, max };

            if let Some(band) = match key {
                BalanceKey::Comp(comp_key) => ratio_band(comps, &[comp_key], &[]),
                BalanceKey::Ratio(ratio) => {
                    let (num, den) = ratio.parts();
                    ratio_band(comps, &[num], &[den]).map(|(min, max)| (min * 100.0, max * 100.0))
                }
            } {
                push_if_off_band(target, band, issues, emit);
            }
        }
    }
}

/// Appends the palette-independent structural coherence warnings.
///
/// Two checks, both derived from the composition hierarchy and true regardless of the palette:
///   - **ordering** — a part may not exceed a whole it is part of (see [`CompKey::is_part_of`]);
///   - **completeness** — when every direct child of a residual-free roll-up (see
///     [`CompKey::is_residual_free_rollup`]) is a target, children must sum to the whole exactly.
///
/// Only extensive, finite, non-negative targets participate.
fn append_structural_issues(targets: &[(BalanceKey, f64)], issues: &mut Vec<BalancingIssue>) {
    let comp_targets: Vec<(CompKey, f64)> = targets
        .iter()
        .filter_map(|&(key, target)| match key {
            BalanceKey::Comp(comp_key) if is_finite_non_negative(target) => Some((comp_key, target)),
            _ => None,
        })
        .collect();

    // Ordering: a part target above the target of a whole it belongs to is a contradiction.
    for &(part, part_target) in &comp_targets {
        for &(whole, whole_target) in &comp_targets {
            if part.is_part_of(whole) && !is_subset(part_target, whole_target) {
                issues.push(BalancingIssue::StructuralViolation {
                    parts: vec![part.into()],
                    whole: whole.into(),
                    parts_target_sum: part_target,
                    whole_target,
                });
            }
        }
    }

    // Completeness: a residual-free roll-up's children, if all targeted, must sum to its target.
    for &(whole, whole_target) in &comp_targets {
        if whole.is_residual_free_rollup() {
            let children = whole.children();

            if let Some(child_targets) = children
                .iter()
                .map(|&child| value_of(&comp_targets, child))
                .collect::<Option<Vec<f64>>>()
            {
                let parts_target_sum: f64 = child_targets.iter().sum();
                if !are_equal_within_epsilon(parts_target_sum, whole_target) {
                    issues.push(BalancingIssue::RollupSumMismatch {
                        whole: whole.into(),
                        parts: children.iter().map(|&child| child.into()).collect(),
                        parts_target_sum,
                        whole_target,
                    });
                }
            }
        }
    }
}

#[cfg(doc)]
use BalancingIssue::{DominanceViolation, RatioInfeasibility};

/// Appends the palette-derived pairwise infeasibilities for non-structural key pairs.
///
/// For each [`is_dominance_checkable_target`] pair the `max <= 1` band corner is reported as the
/// clearer [`DominanceViolation`]; otherwise the general ratio band catches pinned or off-band
/// ratios as [`RatioInfeasibility`]. Structural part/whole pairs: [`append_structural_issues`].
fn append_palette_pairwise_issues(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    issues: &mut Vec<BalancingIssue>,
) {
    for (index, &(key_a, target_a)) in targets.iter().enumerate() {
        if let BalanceKey::Comp(comp_a) = key_a
            && is_dominance_checkable_target(comps, key_a, target_a)
        {
            for &(key_b, target_b) in &targets[index + 1..] {
                if let BalanceKey::Comp(comp_b) = key_b
                    && is_dominance_checkable_target(comps, key_b, target_b)
                {
                    // Structural ordering is owned by `append_structural_issues`; for part/whole
                    // pairs suppress the palette dominance issue, but still let the ratio band
                    // catch off-pin ratios the ordering check can't see.
                    let structural = comp_a.is_part_of(comp_b) || comp_b.is_part_of(comp_a);

                    let mut push = |lesser, greater, lesser_target_sum, greater_target| {
                        if !structural {
                            issues.push(BalancingIssue::DominanceViolation {
                                lesser: vec![lesser],
                                greater,
                                lesser_target_sum,
                                greater_target,
                            });
                        }
                    };

                    if dominates(comps, comp_b, comp_a) && !is_subset(target_a, target_b) {
                        push(key_a, key_b, target_a, target_b);
                    } else if dominates(comps, comp_a, comp_b) && !is_subset(target_b, target_a) {
                        push(key_b, key_a, target_b, target_a);
                    } else {
                        append_pairwise_ratio_issue(comps, issues, (comp_a, target_a), (comp_b, target_b));
                    }
                }
            }
        }
    }
}

/// Appends the palette-derived pairwise ratio infeasibility  warnings.
///
/// Appends a [`RatioInfeasibility`] when the target ratio of two extensive keys falls outside the
/// band their palette can reach. Orients the ratio so the denominator's target is positive (the
/// feasibility is equivalent); a pair with both targets zero constrains nothing and is skipped.
fn append_pairwise_ratio_issue(
    comps: &[Composition],
    issues: &mut Vec<BalancingIssue>,
    a: (CompKey, f64),
    b: (CompKey, f64),
) {
    let (num, den) = if b.1 > 0.0 {
        (a, b)
    } else if a.1 > 0.0 {
        (b, a)
    } else {
        return;
    };

    let ((num_key, num_target), (den_key, den_target)) = (num, den);

    if let Some(band) = ratio_band(comps, &[num_key], &[den_key]) {
        let ratio = num_target / den_target;

        push_if_off_band(ratio, band, issues, |min, max| BalancingIssue::RatioInfeasibility {
            numerator: vec![num_key.into()],
            denominator: den_key.into(),
            target_ratio: ratio,
            min_ratio: min,
            max_ratio: max,
        });
    }
}

/// Appends the palette-derived warnings for a subset-sum group of "part" targets measured against a
/// "whole" target whose composition bounds their sum in every composition.
///
/// For each candidate `whole` target, greedily accumulates the other checkable targets whose
/// running per-composition sum stays `<= whole`'s composition across all compositions
/// (epsilon-aware), giving a group whose `Σ parts / whole` band has `max <= 1`. The upper corner —
/// the parts' targets summing past the whole — is the friendlier [`DominanceViolation`]; otherwise
/// the combined target share is checked against the band and a [`RatioInfeasibility`] is emitted
/// when it falls below what the palette can reach (e.g. parts the palette pins to nearly all of the
/// whole, yet targeted well under that share). Single-part pairs are left to
/// [`append_palette_pairwise_issues`], and the complete-children case of a residual-free roll-up to
/// [`append_structural_issues`]; this flags `parts.len() >= 2` otherwise.
///
/// The accumulation is greedy — sound (never false-positive) but not exhaustive, so it may miss
/// some violating subsets, which is acceptable for best-effort warnings.
fn append_palette_additive_issues(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    issues: &mut Vec<BalancingIssue>,
) {
    for &(whole, whole_target) in targets {
        if let BalanceKey::Comp(whole_comp) = whole
            && is_dominance_checkable_target(comps, whole, whole_target)
        {
            // Greedily accumulate parts whose running per-composition sum stays under `whole`'s.
            let mut running = vec![0.0_f64; comps.len()];
            let mut part_comps: Vec<CompKey> = Vec::new();
            let mut parts_target_sum = 0.0;

            for &(part, part_target) in targets {
                if let BalanceKey::Comp(part_comp) = part
                    && part != whole
                    && is_dominance_checkable_target(comps, part, part_target)
                {
                    let fits = comps
                        .iter()
                        .zip(&running)
                        .all(|(comp, &acc)| is_subset(acc + comp.get(part_comp), comp.get(whole_comp)));

                    if fits {
                        for (comp, acc) in comps.iter().zip(&mut running) {
                            *acc += comp.get(part_comp);
                        }

                        part_comps.push(part_comp);
                        parts_target_sum += part_target;
                    }
                }
            }

            // The complete set of a residual-free roll-up's children is owned by the structural
            // completeness check (`RollupSumMismatch`), so skip here to avoid double-reporting.
            let owned_by_completeness = whole_comp.is_residual_free_rollup()
                && whole_comp.children().iter().all(|child| part_comps.contains(child));

            if part_comps.len() >= 2 && !owned_by_completeness {
                if !is_subset(parts_target_sum, whole_target) {
                    // Upper corner: the parts' targets sum past the whole that bounds them.
                    issues.push(BalancingIssue::DominanceViolation {
                        lesser: part_comps.iter().map(|&comp| comp.into()).collect(),
                        greater: whole,
                        lesser_target_sum: parts_target_sum,
                        greater_target: whole_target,
                    });
                } else if whole_target > 0.0
                    && let Some((min, max)) = ratio_band(comps, &part_comps, &[whole_comp])
                {
                    // Lower corner: the combined share `Σ parts / whole` must lie in the palette's
                    // band; target below its minimum is unreachable even when each part fits alone.
                    let target_ratio = parts_target_sum / whole_target;
                    push_if_off_band(target_ratio, (min, max), issues, |min_r, max_r| {
                        BalancingIssue::RatioInfeasibility {
                            numerator: part_comps.iter().map(|&comp| comp.into()).collect(),
                            denominator: whole,
                            target_ratio,
                            min_ratio: min_r,
                            max_ratio: max_r,
                        }
                    });
                }
            }
        }
    }
}

/// Appends palette-derived infeasibility warnings for pairs of numerator keys summed against a
/// denominator.
///
/// For each ordered pair of target keys `(key_a, key_b)` and each remaining target `key_den`,
/// checks whether the palette-reachable band for `(key_a + key_b) / key_den` contains the target
/// ratio. This catches cases that the pairwise check misses: the combined ratio can exceed the
/// combined band maximum even when each individual ratio stays within its own pairwise band,
/// because the per-ingredient compositions that achieve the individual maxima may differ.
///
/// Only fires when `band.max > 1`; the `max ≤ 1` case (the combined numerator never exceeds the
/// denominator across the palette) is the additive dominance scenario owned by
/// [`append_palette_additive_issues`]. A numerator pair where one key is a structural part of the
/// other is skipped (its sum double-counts the lesser); a structural denominator is kept, since the
/// `max > 1` guard already excludes the ordering corner [`append_structural_issues`] owns.
fn append_palette_multi_ratio_issues(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    issues: &mut Vec<BalancingIssue>,
) {
    for (i, &(key_a, target_a)) in targets.iter().enumerate() {
        if let BalanceKey::Comp(comp_a) = key_a
            && is_dominance_checkable_target(comps, key_a, target_a)
        {
            for &(key_b, target_b) in &targets[i + 1..] {
                if let BalanceKey::Comp(comp_b) = key_b
                    && is_dominance_checkable_target(comps, key_b, target_b)
                    // Skip pairs where one numerator is a structural part of the other;
                    // their sum double-counts the lesser and has no clear interpretation.
                    && !comp_a.is_part_of(comp_b)
                    && !comp_b.is_part_of(comp_a)
                {
                    for &(key_den, target_den) in targets {
                        if let BalanceKey::Comp(comp_den) = key_den
                            && key_den != key_a
                            && key_den != key_b
                            && is_dominance_checkable_target(comps, key_den, target_den)
                            && target_den > 0.0
                            && let Some((min, max)) = ratio_band(comps, &[comp_a, comp_b], &[comp_den])
                            // The max <= 1 case (combined numerator never exceeds denominator) is the
                            // additive dominance scenario owned by append_palette_additive_issues.
                            && !is_subset(max, 1.0)
                        {
                            let ratio = (target_a + target_b) / target_den;
                            push_if_off_band(ratio, (min, max), issues, |min_r, max_r| {
                                BalancingIssue::RatioInfeasibility {
                                    numerator: vec![key_a, key_b],
                                    denominator: key_den,
                                    target_ratio: ratio,
                                    min_ratio: min_r,
                                    max_ratio: max_r,
                                }
                            });
                        }
                    }
                }
            }
        }
    }
}

/// Appends the over-determination information notice.
///
/// With `n` ingredients the sum-to-one constraint leaves `n - 1` degrees of freedom, so more than
/// `n - 1` movable targets must be met approximately. A degrees-of-freedom heuristic that ignores
/// linear dependence among target rows — hence [`Severity::Info`], not a warning.
fn append_over_determination_issue(
    comps: &[Composition],
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

/// Balances the given compositions to match target values for the specified keys, using nalgebra.
///
/// Solves the (weighted) least squares problem for the combination of `comps` that best matches
/// `targets`, returning each composition with its amount, normalized to sum 1. `weighting` selects
/// the weighting; `None` defaults to [`Weighting::Relative`] (relative error). `priority_weights`
/// maps target keys to row-weight multipliers (missing keys default to 1); see [`row_weights`].
///
/// **Note**: This does not enforce non-negativity, so amounts may be negative. Use
/// [`balance_compositions_nnls`] if non-negativity is required.
///
/// # Errors
///
/// Returns an error if the least squares problem cannot be solved, e.g. due to incompatible
/// compositions and targets, numerical issues, etc.
pub fn balance_compositions_nalgebra(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(BalanceKey, f64)],
) -> Result<Vec<(Composition, f64)>> {
    balance_with_reweighting(comps, targets, weighting, priority_weights, solve_nalgebra_raw)
}

/// Balances the given compositions to match target values for the specified keys, using nnls.
///
/// Solves the non-negative (weighted) least squares problem for the combination of `comps` that
/// best matches `targets`, returning each composition with its amount, normalized to sum 1.
/// `weighting` selects the weighting; `None` defaults to [`Weighting::Relative`] (relative error).
/// `priority_weights` maps target keys to row-weight multipliers (default 1); see [`row_weights`].
///
/// # Errors
///
/// Returns an error if the non-negative least squares problem cannot be solved, e.g. due to
/// incompatible compositions and targets, numerical issues, etc.
pub fn balance_compositions_nnls(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(BalanceKey, f64)],
) -> Result<Vec<(Composition, f64)>> {
    balance_with_reweighting(comps, targets, weighting, priority_weights, solve_nnls_raw)
}

/// A raw linear solver over an already-assembled, row-weighted system: the flat row-major matrix
/// `a` (`rows`×`cols`), the right-hand side `y` (`rows`), returning the `cols` amounts.
pub type RawSolver = fn(a: &[f64], y: &[f64], rows: usize, cols: usize) -> Result<Vec<f64>>;

/// Solves the assembled least-squares system with nalgebra's SVD (no non-negativity constraint).
///
/// # Errors
///
/// Returns [`Error::FailedToBalanceCompositions`] if the SVD solve fails.
fn solve_nalgebra_raw(a: &[f64], y: &[f64], rows: usize, cols: usize) -> Result<Vec<f64>> {
    let matrix = DMatrix::from_row_slice(rows, cols, a);
    let rhs = DVector::from_column_slice(y);
    let svd = SVD::new(matrix, true, true);
    let x = svd
        .solve(&rhs, SVD_SOLVE_EPSILON)
        .map_err(|e| Error::FailedToBalanceCompositions(e.to_string()))?;
    Ok(x.iter().copied().collect())
}

/// Solves the assembled non-negative least-squares system with nnls (amounts clamped `>= 0`).
///
/// # Errors
///
/// Returns [`Error::FailedToBalanceCompositions`] if the matrix cannot be shaped for the solver.
fn solve_nnls_raw(a: &[f64], y: &[f64], rows: usize, cols: usize) -> Result<Vec<f64>> {
    let matrix = Array2::from_shape_vec((rows, cols), a.to_vec())
        .map_err(|e| Error::FailedToBalanceCompositions(e.to_string()))?;
    let rhs = Array1::from_vec(y.to_vec());
    let (x, _residual) = nnls(matrix.view(), rhs.view());
    Ok(x.to_vec())
}

/// Debug-only precondition check for the raw balancing path: panics if `targets` carry any
/// error-severity [`BalancingIssue`] (non-finite/negative values or duplicate keys).
///
/// The raw solvers assume pre-validated targets; user input is validated once by
/// [`balance_compositions`], so a bad target reaching here is a programming bug.
#[cfg(debug_assertions)]
fn debug_assert_targets_validated(comps: &[Composition], targets: &[(BalanceKey, f64)]) {
    let report = validate_balancing_targets(comps, targets, &[]);
    assert!(!report.has_errors(), "raw balancing path requires validated targets: {report}");
}

/// Shared balancing driver: assembles the weighted system, solves it with `solve`, and applies one
/// conditional denominator-reweighting pass for ratio targets.
///
/// A ratio row's relative weight depends on its achieved denominator `D`, known only after solving
/// (see [`row_weights`]). So this seeds each `D̂` from [`estimate_ratio_denominator`], solves once,
/// then — under [`Weighting::Relative`] with at least one ratio target — re-solves with the ratio
/// weights recomputed from the achieved denominators, unless every seed was already within
/// [`RATIO_REWEIGHT_TOLERANCE`] (relative) of it.
///
/// One corrective pass, not iteration to a fixed point: a re-solve can shift `D` again, but `D` is
/// mostly pinned by the mass-balance row and extensive targets, so the shift is small, and a small
/// `D̂` error only mis-weights the ratio row slightly without invalidating the result (the
/// approximation [`row_weights`] already accepts). Balances without ratio targets take one solve.
///
/// Targets are assumed pre-validated (finite, non-negative, no duplicate keys); Callers should
/// route user input through [`balance_compositions`], which validates before solving.
///
/// # Errors
///
/// Forwards any error from `solve`.
pub fn balance_with_reweighting(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(BalanceKey, f64)],
    solve: RawSolver,
) -> Result<Vec<(Composition, f64)>> {
    #[cfg(debug_assertions)]
    debug_assert_targets_validated(comps, targets);

    let weighting = weighting.unwrap_or(Weighting::Relative);
    let targets = constrainable_targets(comps, targets);

    // Seed denominator estimates for the ratio targets, from the targets alone.
    let mut ratio_denominators: Vec<(BalanceKey, f64)> = targets
        .iter()
        .filter_map(|&(key, _)| estimate_ratio_denominator(key, &targets).map(|denominator| (key, denominator)))
        .collect();

    let rows = targets.len() + 1;
    let cols = comps.len();

    let solve_once = |ratio_denominators: &[(BalanceKey, f64)]| -> Result<Vec<f64>> {
        let weights = row_weights(&targets, weighting, priority_weights, ratio_denominators);
        solve(&make_matrix_a(comps, &targets, &weights), &make_vector_y(&targets, &weights), rows, cols)
    };

    let amounts = solve_once(&ratio_denominators)?;
    let balanced = comps.iter().copied().zip(amounts).collect::<Vec<_>>();

    // Conditional reweight pass: correct each ratio target's seed denominator against the value the
    // first solve actually achieved, and re-solve only if some seed was materially off.
    if weighting == Weighting::Relative && !ratio_denominators.is_empty() {
        let mut needs_reweight = false;

        for (key, denominator) in &mut ratio_denominators {
            if let Some((_, den)) = key.ratio_parts() {
                let achieved = achieved_value(&balanced, den);

                needs_reweight = needs_reweight
                    || (achieved - *denominator).abs()
                        > RATIO_REWEIGHT_TOLERANCE * denominator.abs().max(RATIO_DENOMINATOR_FLOOR);

                *denominator = achieved;
            }
        }

        if needs_reweight {
            let amounts = solve_once(&ratio_denominators)?;
            return Ok(comps.iter().copied().zip(amounts).collect());
        }
    }

    Ok(balanced)
}

/// Drops targets that no ingredient can affect — those whose row is exactly zero across `comps`.
///
/// Such a row is `0*x = rhs`; all-zero rows can cause issues for solvers. Since they only add a
/// constant to the least-squares objective, they don't change the optimum and we can safely drop
/// them without affecting the result.
///
/// Affectability is evaluated through [`target_row_coeff`] (see [`is_unaffectable`]), so ratio
/// targets use their homogeneous coefficients and never produce `f64::NAN`; a ratio row is dropped
/// only when every composition lies exactly on the requested ratio (its row is genuinely zero).
fn constrainable_targets(comps: &[Composition], targets: &[(BalanceKey, f64)]) -> Vec<(BalanceKey, f64)> {
    targets
        .iter()
        .copied()
        .filter(|(key, target)| !is_unaffectable(comps, *key, *target))
        .collect()
}

/// Estimates the achieved denominator `D = Σ aᵢ·denᵢ` of a ratio target's homogeneous row, used to
/// scale its relative weight (the residual scales with `D`; see [`row_weights`]).
///
/// Returns `None` when `key` is not a ratio key.
///
/// The true `D` is solution-dependent, so this picks the best available signal from `targets`:
///   1. the denominator key is itself a target → its target value (exact intent);
///   2. otherwise, for `Water`, inferred from a complementary `TotalSolids` target
///      (`Water = 100 − TotalSolids − Alcohol`);
///   3. otherwise a typical finished-mix constant ([`TYPICAL_MIX_WATER`] / [`TYPICAL_MIX_FAT`]).
///
/// This is only a seed: [`balance_with_reweighting`] corrects it against the achieved denominator
/// from a first solve when the two differ materially.
#[must_use]
pub fn estimate_ratio_denominator(key: BalanceKey, targets: &[(BalanceKey, f64)]) -> Option<f64> {
    let (_, den) = key.ratio_parts()?;
    let target_value = |wanted: CompKey| {
        targets
            .iter()
            .find(|&&(k, _)| k == BalanceKey::Comp(wanted))
            .map(|&(_, v)| v)
    };

    // 1. The denominator key is itself a target.
    if let Some(value) = target_value(den) {
        return Some(value);
    }

    // 2. Infer `Water` from a complementary `TotalSolids` target.
    // 3. Fall back to a typical-mix constant.
    let estimate = match den {
        CompKey::Water => target_value(CompKey::TotalSolids)
            .map_or(TYPICAL_MIX_WATER, |solids| 100.0 - solids - target_value(CompKey::Alcohol).unwrap_or(0.0)),
        CompKey::TotalFats => TYPICAL_MIX_FAT,
        other => unreachable!("unsupported ratio denominator key {other:?} (see RatioKey::parts)"),
    };
    Some(estimate)
}

/// Per-row weights for the least-squares system: one per target row, then the total-sum row.
///
/// Under [`Weighting::Absolute`] every base weight is 1. Under [`Weighting::Relative`] each
/// extensive target row's base weight is `1 / max(|target|, RELATIVE_WEIGHT_FLOOR)`, and the
/// trailing sum row uses the fixed [`SUM_CONSTRAINT_WEIGHT`] so mass balance stays dominant.
///
/// A ratio target's row is homogeneous (`num − (R/100)·den = 0`, RHS 0), and its residual scales
/// as `(D/100)·(R_achieved − R)` where `D = Σ aᵢ·denᵢ` is the achieved denominator. To make the
/// weighted residual a relative ratio error, its relative weight is therefore
/// `100 / (max(D̂, RATIO_DENOMINATOR_FLOOR) · max(|R|, RELATIVE_WEIGHT_FLOOR))`, where `D̂` is the
/// denominator estimate looked up from `ratio_denominators` (keyed by the ratio key; missing keys
/// fall back to the plain `1 / |target|` weight). Under [`Weighting::Absolute`] ratio rows are not
/// scaled by `D̂`, matching the unscaled treatment of extensive rows.
///
/// Each target row's base weight is then multiplied by its key's entry in `priority_weights` (keys
/// not listed default to a multiplier of 1; see [`Priority`]). The trailing sum row is never scaled
/// by priority, so raising a target's priority can never weaken mass balance. An empty
/// `priority_weights` therefore reproduces the unprioritized weights exactly.
#[must_use]
pub fn row_weights(
    targets: &[(BalanceKey, f64)],
    weighting: Weighting,
    priority_weights: &[(BalanceKey, f64)],
    ratio_denominators: &[(BalanceKey, f64)],
) -> Vec<f64> {
    let priority_for = |key: BalanceKey| {
        priority_weights
            .iter()
            .find(|&&(other, _)| other == key)
            .map_or(1.0, |&(_, weight)| weight)
    };
    let denominator_for = |key: BalanceKey| ratio_denominators.iter().find(|&&(k, _)| k == key).map(|&(_, d)| d);

    let relative_weight = |key: BalanceKey, target: f64| {
        let target = target.max(RELATIVE_WEIGHT_FLOOR);

        denominator_for(key)
            .map_or_else(|| 1.0 / target, |denominator| 100.0 / (denominator.max(RATIO_DENOMINATOR_FLOOR) * target))
    };

    let mut weights: Vec<f64> = targets
        .iter()
        .map(|&(key, target)| {
            priority_for(key)
                * match weighting {
                    Weighting::Absolute => 1.0,
                    Weighting::Relative => relative_weight(key, target),
                }
        })
        .collect();

    weights.push(match weighting {
        Weighting::Absolute => 1.0,
        Weighting::Relative => SUM_CONSTRAINT_WEIGHT,
    });

    weights
}

/// Helper function to construct the (row-weighted) matrix A for the least squares problem.
///
/// Each row corresponds to a target key in `targets`, the last row to the total sum constraint, and
/// each column to a composition in `comps`. Every row `i` is scaled by `weights[i]` (see
/// [`row_weights`]).
///
/// [3.25, 40,    0]
/// [8.71,  5.4, 97]
/// [1,     1,    1]
fn make_matrix_a(comps: &[Composition], targets: &[(BalanceKey, f64)], weights: &[f64]) -> Vec<f64> {
    targets
        .iter()
        .zip(weights)
        .flat_map(|(&(key, target), &weight)| {
            comps
                .iter()
                .map(move |comp| target_row_coeff(key, target, comp) * weight)
        })
        .chain(std::iter::repeat_n(weights[targets.len()], comps.len()))
        .collect::<Vec<_>>()
}

/// Helper function to construct the (row-weighted) vector Y for the least squares problem.
///
/// Each element corresponds to a target value in `targets`, and the last element to the total sum
/// constraint (1). Every element `i` is scaled by `weights[i]` (see [`row_weights`]).
///
/// \[16\]  // Milk Fat
/// \[11\]  // MSNF
///  \[1\]  // Total sums to 100%
fn make_vector_y(targets: &[(BalanceKey, f64)], weights: &[f64]) -> Vec<f64> {
    targets
        .iter()
        .zip(weights)
        .map(|(&(key, target), &weight)| target_row_rhs(key, target) * weight)
        .chain(std::iter::once(weights[targets.len()]))
        .collect::<Vec<_>>()
}

/// The per-composition least-squares coefficient for one balancing target.
///
/// For an extensive key the coefficient is simply `comp.get(key)`. For a ratio key `R`, it is the
/// homogeneous `comp.get(num) - (R / 100) * comp.get(den)` (see [`RatioKey::parts`]), which is
/// always finite — the solver never evaluates the `NaN`-prone per-ingredient ratio.
#[must_use]
pub fn target_row_coeff(key: BalanceKey, target: f64, comp: &Composition) -> f64 {
    match key {
        BalanceKey::Ratio(ratio) => {
            let (num_key, den_key) = ratio.parts();
            comp.get(num_key) - (target / 100.0) * comp.get(den_key)
        }
        BalanceKey::Comp(comp_key) => comp.get(comp_key),
    }
}

/// The right-hand side for one target row: `0` for a ratio key (its row is homogeneous), else the
/// target value itself.
const fn target_row_rhs(key: BalanceKey, target: f64) -> f64 {
    if key.is_ratio() { 0.0 } else { target }
}

/// The achieved value for `key` from a balanced result, summed without the renormalization that
/// [`Composition::from_combination`] applies (trusting the raw fractions, keeping any negative
/// amounts a non-negativity-free solver may return).
///
/// Ratio-aware: a ratio key yields its achieved ratio (a percentage) from its numerator and
/// denominator parts (see [`RatioKey::parts`]) — those parts being extensive keys, they resolve
/// via the base case below. An extensive key yields the plain weighted sum. Accepts any key kind
/// via [`Into<BalanceKey>`], so callers can pass a bare [`CompKey`] or [`RatioKey`].
fn achieved_value<K: Into<BalanceKey>>(balanced: &[(Composition, f64)], key: K) -> f64 {
    match key.into() {
        BalanceKey::Ratio(ratio) => {
            let (num_key, den_key) = ratio.parts();
            achieved_value(balanced, num_key) / achieved_value(balanced, den_key) * 100.0
        }
        BalanceKey::Comp(comp_key) => balanced.iter().map(|(comp, amount)| *amount * comp.get(comp_key)).sum(),
    }
}

/// All keys that can be used as balancing targets — all [`CompKey`]s and [`RatioKey`]s.
///
/// Ratio keys are balanceable too: a ratio target `R` is encoded as the homogeneous row
/// `numerator - (R / 100) * denominator = 0` (see [`RatioKey::parts`]), so it never divides and
/// never poisons the solve with `f64::NAN`. Extensive keys contribute their usual weighted-sum row.
#[must_use]
pub fn get_all_balanceable_keys() -> Vec<BalanceKey> {
    CompKey::iter()
        .map(BalanceKey::Comp)
        .chain(RatioKey::iter().map(BalanceKey::Ratio))
        .collect()
}

/// A subset of balanceable keys that adequately balances most typical ice cream mixes.
///
/// These keys target most of the critical attributes of an ice cream mix, including formulations
/// with chocolate, nuts, and eggs. Balancing a set of ingredients to these targets from a reference
/// recipe should typically succeed in producing a mix that closely matches the reference's key
/// properties. More complex formulations, e.g. sugar-free, lactose-free, sorbets, etc., likely
/// require more careful targeting and adjustment, so this is not a one-size-fits-all set.
#[must_use]
pub fn get_typical_balancing_keys() -> Vec<BalanceKey> {
    vec![
        CompKey::MilkFat.into(),
        CompKey::MSNF.into(),
        CompKey::CocoaButter.into(),
        CompKey::CocoaSolids.into(),
        CompKey::NutSNF.into(),
        CompKey::EggSNF.into(),
        CompKey::POD.into(),
        CompKey::TotalSolids.into(),
        CompKey::TotalFats.into(),
        CompKey::Salt.into(),
        RatioKey::StabilizersPerWater.into(),
        RatioKey::EmulsifiersPerFat.into(),
        CompKey::ABV.into(),
        RatioKey::AbsNetPAC.into(),
    ]
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp, clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::*;
    use crate::tests::util::{KeyCeiling, root_mean_square};

    use super::*;
    use crate::{
        data::{get_all_recipe_entries, get_recipe_entry_by_id},
        database::IngredientDatabase,
        recipe::{OwnedLightRecipe, Recipe},
        resolution::IngredientGetter,
    };

    /// A labelled balancing run: a name, the solver to use, and the priority weights to apply. This
    /// lets several runs — different solvers and/or priority levels — be shown side-by-side in one
    /// report (an empty priority slice reproduces the unprioritized solve exactly).
    type LabeledRun = (&'static str, SolverFn, &'static [(BalanceKey, f64)]);

    /// Both solvers, unprioritized, paired for side-by-side quality reports.
    const BOTH_SOLVERS: &[LabeledRun] = &[
        ("nalgebra", balance_compositions_nalgebra, &[]),
        ("nnls", balance_compositions_nnls, &[]),
    ];

    /// An unprioritized nnls run, for single-column quality reports (e.g. ratio-key targets):
    /// nnls is the production solver, and the axis of interest is the targets, not the solver.
    const NNLS_ONLY: &[LabeledRun] = &[("nnls", balance_compositions_nnls, &[])];

    /// nnls under increasing [`Priority`] on [`CompKey::POD`], for the priority-tradeoff report:
    /// each column tightens POD harder, visibly trading off against the competing targets.
    const POD_PRIORITY_RUNS: &[LabeledRun] = &[
        ("baseline", balance_compositions_nnls, &[]),
        ("POD High", balance_compositions_nnls, &[(BalanceKey::Comp(CompKey::POD), Priority::High.weight())]),
        (
            "POD Critical",
            balance_compositions_nnls,
            &[(BalanceKey::Comp(CompKey::POD), Priority::Critical.weight())],
        ),
    ];

    /// nnls with and without a [`Priority::Critical`] on the ratio key [`RatioKey::AbsPAC`], for
    /// the cross-feature report: prioritizing a ratio target tightens it against extensive ones.
    const ABS_PAC_PRIORITY_RUNS: &[LabeledRun] = &[
        ("baseline", balance_compositions_nnls, &[]),
        (
            "AbsPAC Critical",
            balance_compositions_nnls,
            &[(BalanceKey::Ratio(RatioKey::AbsPAC), Priority::Critical.weight())],
        ),
    ];

    /// Denominator floor for relative-error reporting, so zero / near-zero targets stay finite.
    const BALANCE_REL_FLOOR: f64 = 0.1;

    /// Minimum relative-error change (pp) for a priority effect to count as real rather than
    /// [`TESTS_EPSILON`] noise — actual shifts are far larger, so this catches a priority no-op.
    const MIN_PRIORITY_EFFECT_PP: f64 = 6.0;

    /// A shared ingredient database for all tests, seeded with embedded data
    static DATABASE: LazyLock<IngredientDatabase> = LazyLock::new(IngredientDatabase::new_seeded_from_embedded_data);

    /// Helper function to fetch an ingredient's composition from the shared [`DATABASE`] by name.
    fn comp_by_name(name: &str) -> Composition {
        DATABASE.get_ingredient_by_name(name).unwrap().composition
    }

    /// Helper function to extract compositions from a light recipe, via [`DATABASE`] lookups
    fn comps_from_light_recipe(light_recipe: &OwnedLightRecipe) -> Vec<Composition> {
        Recipe::from_light_recipe(None, light_recipe, &DATABASE)
            .unwrap()
            .lines
            .iter()
            .map(|line| line.ingredient.composition)
            .collect()
    }

    /// Helper function to fetch a light recipe from its name and optional author, from [`data`].
    fn get_light_recipe_by_id(name: &str, author: Option<&str>) -> OwnedLightRecipe {
        get_recipe_entry_by_id(name, author).unwrap().recipe
    }

    /// Helper function to extract compositions from a list of ingredient names, via [`DATABASE`]
    fn comps_from_names(names: &[&str]) -> Vec<Composition> {
        names.iter().map(|name| comp_by_name(name)).collect()
    }

    /// Helper function to extract target pairs from a Composition for specified keys
    fn get_targets_from_composition(composition: &Composition, keys: &[BalanceKey]) -> Vec<(BalanceKey, f64)> {
        keys.iter().map(|key| (*key, key.value(composition))).collect()
    }

    /// Helper function to extract target pairs from a light recipe's calculated composition
    fn get_targets_from_light_recipe(light_recipe: &OwnedLightRecipe, keys: &[BalanceKey]) -> Vec<(BalanceKey, f64)> {
        get_targets_from_composition(
            &Recipe::from_light_recipe(None, light_recipe, &DATABASE)
                .unwrap()
                .calculate_composition()
                .unwrap(),
            keys,
        )
    }

    /// Helper function to filter a list of key-value pairs to only include specified keys
    #[expect(unused)]
    fn filter_targets_for_keys(targets: &[(BalanceKey, f64)], keys: &[BalanceKey]) -> Vec<(BalanceKey, f64)> {
        targets.iter().filter(|(key, _)| keys.contains(key)).copied().collect()
    }

    /// Relative error of an achieved value against its target, in percentage points.
    ///
    /// `|achieved − target| / max(|target|, FLOOR) × 100`, where `FLOOR` is
    /// [`BALANCE_REL_FLOOR`]. The floor keeps a zero target (e.g. a recipe with no cocoa or
    /// stabilizer) from producing a non-finite result.
    pub(crate) fn balance_rel_error_pp(achieved: f64, target: f64) -> f64 {
        (achieved - target).abs() / target.max(BALANCE_REL_FLOOR) * 100.0
    }

    /// The largest [`balance_rel_error_pp`] across all `targets` — the worst-case relative miss, a
    /// single summary of how well a balanced result hits its targets.
    fn max_rel_error(balanced: &[(Composition, f64)], targets: &[(BalanceKey, f64)]) -> f64 {
        targets
            .iter()
            .map(|(key, target)| balance_rel_error_pp(achieved_value(balanced, *key), *target))
            .fold(0.0_f64, f64::max)
    }

    /// Epsilon values for different types of assertions in the balance composition tests
    ///
    /// If specified as [`None`], then tests will not check that condition at all, e.g. if `amount`
    /// is `None`, then tests will not assert that the balanced amounts sum to 1 within any epsilon.
    #[derive(Debug, Clone, Copy)]
    struct Epsilons {
        /// Epsilon for asserting composition amounts, e.g. that they sum to 1
        amount: Option<f64>,
        /// Epsilon for asserting that composition amounts are non-negative
        neg: Option<f64>,
    }

    impl Epsilons {
        /// Returns an `Epsilons` with all fields set to `None`, i.e. no assertions
        #[expect(unused)]
        fn none() -> Self {
            Self {
                amount: None,
                neg: None,
            }
        }
    }

    impl Default for Epsilons {
        fn default() -> Self {
            Self {
                amount: Some(TESTS_EPSILON),
                neg: Some(TESTS_EPSILON),
            }
        }
    }

    /// Helper function to assert that a given balancing function produces a balanced recipe within
    /// specified hard parameters, e.g. within an absolute epsilon of target values, etc.
    ///
    /// The checks are dictated by the [`Epsilons`] and [`KeyCeiling`] parameters. [`Epsilons`]
    /// controls optional amount sum, negativity, and target value assertions. If an epsilon is
    /// `None`, then that check is skipped. [`KeyCeiling`] sets the maximum allowed relative error
    /// for each key; see [`balance_rel_error_pp`].
    fn assert_balance_compositions<F, P>(
        comps: &[Composition],
        targets: &[(BalanceKey, f64)],
        solve: F,
        epsilons: Epsilons,
        ceiling: &KeyCeiling<BalanceKey>,
    ) where
        F: Fn(&[Composition], &[(BalanceKey, f64)], Option<Weighting>, &[P]) -> Result<Vec<(Composition, f64)>>,
    {
        // `P` is the solver's priority element type; the assertions use no priorities, so an empty
        // slice serves both the `&[(BalanceKey, f64)]` and `&[(BalanceKey, Priority)]` signatures.
        let balanced = solve(comps, targets, None, &[]).unwrap();
        assert_eq!(balanced.len(), comps.len());

        let amount_sum: f64 = balanced.iter().map(|(_, amount)| *amount).sum();
        if let Some(epsilon) = epsilons.amount {
            assert_abs_diff_eq!(amount_sum, 1.0, epsilon = epsilon);
        }

        for (idx, (_comp, amount)) in balanced.iter().enumerate() {
            if let Some(neg_epsilon) = epsilons.neg {
                assert_gt!(*amount, 0.0 - neg_epsilon, "Negative amount {:.5} for composition idx {}", amount, idx);
            }
        }

        for (key, target) in targets {
            let achieved = achieved_value(&balanced, *key);
            assert_true!(achieved.is_finite(), "Non-finite achieved value for {:?}: {}", key, achieved);

            let error = balance_rel_error_pp(achieved, *target);
            let limit = ceiling.for_key(*key);

            assert_true!(
                error <= limit,
                "Relative error for {:?} is {:.2} pp (ceiling {:.2} pp): got {:.4}, target {:.4}",
                key,
                error,
                limit,
                achieved,
                target
            );
        }
    }

    /// Renders a [`BalanceKey`] as its inner variant name (e.g. `MilkFat`, `AbsPAC`).
    ///
    /// Used in snapshot headers so they stay stable across the `CompKey` -> `BalanceKey` migration
    /// and read like the source enums (the user-facing report itself uses the friendlier labels).
    fn balance_key_label(key: BalanceKey) -> String {
        match key {
            BalanceKey::Comp(comp) => format!("{comp:?}"),
            BalanceKey::Ratio(ratio) => format!("{ratio:?}"),
        }
    }

    /// Builds a deterministic, human-readable balance-quality report for `insta` snapshots.
    ///
    /// Runs every labelled run in `runs` against the same `comps` / `targets` and, per run, lists
    /// each target's `target`, achieved value, and [`balance_rel_error_pp`], followed by a summary
    /// line (amount sum, negative-amount count, max and RMS relative error). A run whose solve
    /// fails renders a stable `FAILED` line instead of panicking, so infeasible systems snapshot.
    fn report_balance_quality(
        comps: &[Composition],
        targets: &[(BalanceKey, f64)],
        runs: &[LabeledRun],
        names: Option<&[&str]>,
    ) -> String {
        let truncate_to = |name: &str, length: usize| {
            if name.len() > length {
                format!("{}...", &name[..length - 3])
            } else {
                name.to_string()
            }
        };

        let mut lines = Vec::new();

        let header = targets
            .iter()
            .map(|(key, value)| format!("  {:<18}{value:>7.2}", balance_key_label(*key)))
            .collect::<Vec<_>>()
            .join("\n");
        lines.append(&mut vec![format!("targets:\n{header}")]);

        for &(label, solve, priorities) in runs {
            lines.push(String::new());

            let balanced = match solve(comps, targets, None, priorities) {
                Ok(balanced) => balanced,
                Err(error) => {
                    lines.push(format!("[{label}] FAILED: {error}"));
                    continue;
                }
            };

            lines.push(format!("[{label}]"));

            if let Some(names) = names {
                assert_eq!(names.len(), balanced.len());
                lines.push("  [           ingredient           | qty ]".to_string());
                for (name, amount) in names.iter().zip(balanced.iter().map(|(_, amount)| *amount)) {
                    lines.push(format!("  {:<31} {:>7.2}", truncate_to(name, 31), amount * 100.0));
                }
                lines.push(String::new());
            }

            lines.push("  [      key       | target | achieved |  error  ]".to_string());

            let mut errors = Vec::with_capacity(targets.len());
            for (key, target) in targets {
                let achieved = achieved_value(&balanced, *key);
                let error = balance_rel_error_pp(achieved, *target);
                errors.push(error);
                lines.push(format!(
                    "  {:<18}{target:>7.2}   {achieved:>7.2}   {error:>7.2} pp",
                    balance_key_label(*key)
                ));
            }

            let amounts_sum: f64 = balanced.iter().map(|(_, amount)| *amount).sum();
            let neg_count = balanced.iter().filter(|(_, amount)| *amount < 0.0).count();
            let max = errors.iter().copied().fold(0.0_f64, f64::max);
            let rms = root_mean_square(&errors);

            lines.push("\n  [    sum     |  neg. |    max    |    rms  ]".to_string());
            lines.push(format!("    {amounts_sum:>7.4}      {neg_count:>3}    {max:>7.2} pp  {rms:>7.2} pp"));
        }

        lines.join("\n")
    }

    /// Builds a deterministic, human-readable balancing-issues report for `insta` snapshots.
    ///
    /// Echoes the scenario inputs (palette `names` when given, `targets`, and any `priorities`),
    /// then the user-facing [`BalancingReport`] rendering from [`validate_balancing_targets`] — the
    /// same text that crosses the WASM boundary as `BalancingIssueView.message`. Snapshotting it
    /// keeps the wording under review: clear, correctly attributed to keys, and free of spurious or
    /// duplicate issues.
    fn report_balancing_issues(
        comps: &[Composition],
        targets: &[(BalanceKey, f64)],
        priorities: &[(BalanceKey, Priority)],
        names: Option<&[&str]>,
    ) -> String {
        let mut lines = Vec::new();

        if let Some(names) = names {
            lines.push("palette:".to_string());
            lines.extend(names.iter().map(|name| format!("  {name}")));
        }

        lines.push("targets:".to_string());
        for (key, value) in targets {
            lines.push(format!("  {:<20}{value:>8.2}", balance_key_label(*key)));
        }

        if !priorities.is_empty() {
            lines.push("priorities:".to_string());
            for (key, priority) in priorities {
                lines.push(format!("  {:<20}{priority:?}", balance_key_label(*key)));
            }
        }

        lines.push(String::new());
        lines.push(validate_balancing_targets(comps, targets, priorities).to_string());

        lines.join("\n")
    }

    // --- Compositions, ingredients, recipes ---

    /// Reference recipes' mix compositions are used as balancing targets to check that the
    /// balancing function can at least recover the original recipe, a basic sanity check.
    static REF_LIGHT_RECIPES: LazyLock<Vec<OwnedLightRecipe>> = LazyLock::new(|| {
        let mut recipes = vec![
            MAIN_RECIPE_LIGHT.clone(),
            REF_A_RECIPE_LIGHT.clone(),
            REF_B_RECIPE_LIGHT.clone(),
        ];
        recipes.extend(get_all_recipe_entries().into_iter().map(|entry| entry.recipe));
        recipes
    });

    /// Subset of [`REF_LIGHT_RECIPES`] that excludes non-typical formulations, e.g. `REF_B`'s
    /// artificial sweeteners, for tests that need typical balancing keys to be feasible.
    static REF_LIGHT_RECIPES_FOR_TYPICAL_BALANCING_KEYS: LazyLock<Vec<OwnedLightRecipe>> = LazyLock::new(|| {
        vec![
            MAIN_RECIPE_LIGHT.clone(),
            REF_A_RECIPE_LIGHT.clone(),
            // Exclude REF_B since it includes artificial sweeteners
            get_light_recipe_by_id("Standard Base", Some("Underbelly")),
            get_light_recipe_by_id("French Variation", Some("Underbelly")),
            get_light_recipe_by_id("Light Variation", Some("Underbelly")),
        ]
    });

    /// Typical dairy ingredients for balancing tests, e.g. 3.25% Milk, 40% Cream, Skimmed Powder.
    const DAIRY_ING: &[&str] = &["3.25% Milk", "40% Cream", "Skimmed Milk Powder"];

    /// `DAIRY_ING` plus a stabilizer, to test that balancing can hit a zero stabilizer target.
    const DAIRY_STABILIZER_ING: &[&str] = &["3.25% Milk", "40% Cream", "Skimmed Milk Powder", "Stabilizer Blend"];

    /// Dairy plus sucrose, a minimal white-base palette for sugar-bearing balancing targets.
    const DAIRY_SUGAR_ING: &[&str] = &["3.25% Milk", "40% Cream", "Skimmed Milk Powder", "Sucrose"];

    /// Dairy plus cocoa powder and sucrose, a minimal chocolate-base palette. The single cocoa
    /// source couples [`CompKey::CocoaSolids`] and [`CompKey::CocoaButter`] at a fixed ratio.
    const DAIRY_COCOA_ING: &[&str] = &[
        "3.25% Milk",
        "40% Cream",
        "Ghirardelli 100% Unsweetened Cocoa Powder",
        "Sucrose",
    ];

    /// A minimal sorbet palette: water, two sugars, and a sorbet stabilizer blend.
    const SORBET_ING: &[&str] = &["Water", "Sucrose", "Dextrose", "Underbelly Sorbet Stabilizer Blend"];

    /// A minimal booze-base palette: dairy, sucrose, and a liqueur. The liqueur's large
    /// [`CompKey::TotalPAC`] per gram makes a separate PAC target easy to over-constrain.
    const BOOZY_ING: &[&str] = &["3.25% Milk", "40% Cream", "Sucrose", "Grand Marnier Cordon Rouge"];

    /// A multi-sugar palette whose sugars differ in POD:PAC ratio, giving the solver enough freedom
    /// to hit a sweetness ([`CompKey::POD`]) and a hardness ([`CompKey::TotalPAC`]) target at once.
    const SUGAR_BLEND_ING: &[&str] = &["Water", "Sucrose", "Dextrose", "Fructose"];

    /// A palette with a stabilizer source plus a zero-water ingredient, for the ratio-key tests.
    ///
    /// Sucrose contributes zero water (which used to make `StabilizersPerWater` `NaN` and poison
    /// the solve), while Stabilizer Blend keeps a positive-water ratio reachable.
    const STABILIZER_AND_SUCROSE_ING: &[&str] = &["3.25% Milk", "40% Cream", "Stabilizer Blend", "Sucrose"];

    /// Dairy plus an emulsifier source, for [`RatioKey::EmulsifiersPerFat`] (fat-denominated) ratio
    /// tests: Soy Lecithin supplies emulsifier while milk and cream supply the fat denominator.
    const EMULSIFIER_ING: &[&str] = &["3.25% Milk", "40% Cream", "Soy Lecithin"];

    // --- Exact balancing targets ---

    /// Trivial dairy targets that the dairy compositions can match exactly, used for sanity checks.
    static DAIRY_TRIVIAL_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> =
        LazyLock::new(|| vec![(CompKey::MilkFat.into(), 16.0), (CompKey::MSNF.into(), 11.0)]);

    /// Dairy targets including a zero-valued [`CompKey::TotalStabilizers`] target, exercising the
    /// relative-error floor path (i.e. that the result is finite, and no division by zero).
    static DAIRY_ZERO_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::MilkFat.into(), 16.0),
            (CompKey::MSNF.into(), 11.0),
            (CompKey::TotalStabilizers.into(), 0.0),
        ]
    });

    /// Feasible targets for the [`SUGAR_BLEND_ING`] palette: the composition of a real blend
    /// (Water 68 / Sucrose 14 / Dextrose 10 / Fructose 8), so the solver can recover them exactly
    /// while hitting a sweetness ([`CompKey::POD`]) and hardness ([`CompKey::TotalPAC`]) target at
    /// once. These targets genuinely require all three sugars — any two-sugar subset misses by
    /// >10 pp (see [`balance_multi_sugar_needs_all_three_sugars`]).
    static SUGAR_BLEND_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSolids.into(), 31.2),
            (CompKey::POD.into(), 35.2),
            (CompKey::TotalPAC.into(), 46.68),
        ]
    });

    // --- Disparate balancing targets ---

    // Over-determined disparate targets that cannot be supplied by the respective compositions,
    // and so require best-effort balancing, exercising the absolute-LS magnitude skew, where large
    // targets (e.g. Energy) are fit more closely, and small targets (e.g. POD) are ignored.

    /// Over-determined dairy targets, with an incompatible [`CompKey::Energy`] target
    ///
    /// The [`CompKey::MilkFat`] and [`CompKey::MSNF`] targets result in ~150 kcal/100g, which is
    /// incompatible with the 200 kcal/100g [`CompKey::Energy`] target. It includes a large
    /// [`CompKey::Energy`] down to a small [`CompKey::POD`] target to exercise the magnitude skew.
    static DAIRY_DISPARATE_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::Energy.into(), 200.0),
            (CompKey::MilkFat.into(), 12.0),
            (CompKey::MSNF.into(), 8.0),
            (CompKey::POD.into(), 0.5),
        ]
    });

    /// "Light premium" paradox: a rich [`CompKey::MilkFat`] target against a capped
    /// [`CompKey::Energy`] target — physically opposed, since milk fat is ~9 kcal/g, so 16% fat
    /// alone already exceeds the 150 kcal/100g [`CompKey::Energy`] target.
    static LIGHT_PREMIUM_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::Energy.into(), 150.0),
            (CompKey::MilkFat.into(), 16.0),
            (CompKey::MSNF.into(), 11.0),
            (CompKey::TotalSugars.into(), 18.0),
        ]
    });

    /// Chocolate intensity vs. lean: high [`CompKey::CocoaSolids`] and low [`CompKey::CocoaButter`]
    /// targets, which the single cocoa source cannot satisfy independently (the two are coupled by
    /// its fixed solids:butter ratio).
    static CHOCOLATE_COUPLED_COCOA_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::CocoaSolids.into(), 6.0),
            (CompKey::CocoaButter.into(), 1.0),
            (CompKey::TotalSugars.into(), 20.0),
        ]
    });

    /// High-MSNF "sandiness" limit: a high [`CompKey::MSNF`] target (for body) against a
    /// [`CompKey::Lactose`] target capped low to avoid lactose crystallization — opposed, because
    /// dairy ties lactose to MSNF at a roughly fixed ratio (~0.5). With only the three dairy comps
    /// the capped lactose cannot be held while MSNF is pushed high, so the system is infeasible.
    static DAIRY_HIGH_MSNF_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::MSNF.into(), 16.0),
            (CompKey::Lactose.into(), 5.0),
            (CompKey::MilkFat.into(), 10.0),
        ]
    });

    /// Sorbet sweetness vs. hardness: a restrained [`CompKey::POD`] (not too sweet) against a high
    /// [`CompKey::TotalPAC`] (soft, scoopable) target — opposed, since both rise with sugar. Spans
    /// the large solids/sugar/PAC targets down to a trace [`CompKey::TotalStabilizers`].
    static SORBET_DISPARATE_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSolids.into(), 32.0),
            (CompKey::TotalSugars.into(), 26.0),
            (CompKey::TotalPAC.into(), 32.0),
            (CompKey::POD.into(), 14.0),
            (CompKey::TotalStabilizers.into(), 0.40),
        ]
    });

    /// Booze base: a modest [`CompKey::ABV`] target plus a separate [`CompKey::TotalPAC`] target,
    /// which the liqueur's outsized per-gram PAC contribution over-constrains.
    static BOOZY_DISPARATE_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSugars.into(), 17.0),
            (CompKey::TotalPAC.into(), 28.0),
            (CompKey::ABV.into(), 4.0),
        ]
    });

    // --- Ratio-key balancing targets ---

    /// A water-denominated [`RatioKey::AbsPAC`] target in conflict with its [`CompKey::TotalPAC`]
    /// one (over-determining the palette), plus [`CompKey::POD`] and [`CompKey::TotalSolids`].
    static SORBET_ABS_PAC_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
        vec![
            (RatioKey::AbsPAC.into(), 45.0),
            (CompKey::TotalPAC.into(), 20.0),
            (CompKey::POD.into(), 14.0),
            (CompKey::TotalSolids.into(), 32.0),
        ]
    });

    // --- Balancing tests ---

    /// All balanceable targets of a reference recipe, dropping any whose value is non-finite. A
    /// ratio key (e.g. [`RatioKey::EmulsifiersPerFat`]) is `NaN` when the recipe's denominator is
    /// zero (e.g. a fat-free sorbet has no [`CompKey::TotalFats`]), and such an undefined target
    /// cannot be recovered; every finite key, ratio keys included, is kept.
    fn finite_balanceable_targets(light_recipe: &OwnedLightRecipe) -> Vec<(BalanceKey, f64)> {
        get_targets_from_light_recipe(light_recipe, &get_all_balanceable_keys())
            .into_iter()
            .filter(|(_, value)| value.is_finite())
            .collect()
    }

    #[test]
    fn balance_compositions_nalgebra_ref_recipes_all_targets() {
        for light_recipe in REF_LIGHT_RECIPES.iter() {
            assert_balance_compositions(
                &comps_from_light_recipe(light_recipe),
                &finite_balanceable_targets(light_recipe),
                balance_compositions_nalgebra,
                Epsilons::default(),
                &KeyCeiling::exact(),
            );
        }
    }

    #[test]
    fn balance_compositions_nnls_ref_recipes_all_targets() {
        for light_recipe in REF_LIGHT_RECIPES.iter() {
            assert_balance_compositions(
                &comps_from_light_recipe(light_recipe),
                &finite_balanceable_targets(light_recipe),
                balance_compositions_nnls,
                Epsilons::default(),
                &KeyCeiling::exact(),
            );
        }
    }

    #[test]
    fn balance_compositions_nalgebra_dairy_trivial() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_TRIVIAL_TARGETS,
            balance_compositions_nalgebra,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_compositions_nnls_dairy_trivial() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_TRIVIAL_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_dairy_zero_target_no_stabilizer() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_ZERO_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_dairy_zero_target_with_stabilizer() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_STABILIZER_ING),
            &DAIRY_ZERO_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_multi_sugar_pod_and_pac() {
        assert_balance_compositions(
            &comps_from_names(SUGAR_BLEND_ING),
            &SUGAR_BLEND_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    /// Companion to [`balance_multi_sugar_pod_and_pac`]: dropping any one sugar leaves an
    /// over-determined system that misses by over 10 pp, so each sugar is load-bearing.
    #[test]
    fn balance_multi_sugar_needs_all_three_sugars() {
        // Each palette is water plus two of the three sugars (i.e. one sugar dropped).
        let two_sugar_palettes: [&[&str]; 3] = [
            &["Water", "Sucrose", "Dextrose"],  // no Fructose
            &["Water", "Sucrose", "Fructose"],  // no Dextrose
            &["Water", "Dextrose", "Fructose"], // no Sucrose
        ];

        for palette in two_sugar_palettes {
            let balanced =
                balance_compositions_nnls(&comps_from_names(palette), &SUGAR_BLEND_TARGETS, None, &[]).unwrap();
            let max_error = max_rel_error(&balanced, &SUGAR_BLEND_TARGETS);
            assert_gt!(max_error, 10.0);
        }
    }

    #[test]
    fn balance_dairy_disparate_targets() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_DISPARATE_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(100.0),
        );
    }

    #[test]
    fn balance_light_premium_fat_vs_energy() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_SUGAR_ING),
            &LIGHT_PREMIUM_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(50.0),
        );
    }

    #[test]
    fn balance_chocolate_coupled_cocoa() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_COCOA_ING),
            &CHOCOLATE_COUPLED_COCOA_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(50.0),
        );
    }

    #[test]
    fn balance_dairy_high_msnf() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_HIGH_MSNF_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(60.0),
        );
    }

    #[test]
    fn balance_sorbet_sweetness_vs_hardness() {
        assert_balance_compositions(
            &comps_from_names(SORBET_ING),
            &SORBET_DISPARATE_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(35.0),
        );
    }

    // Good example of extreme magnitude skew under absolute weighting, blowing up the stabilizers
    // to >100% to satisfy other targets that are larger in absolute terms, e.g. `TotalSolids`.
    #[test]
    fn balance_sorbet_sweetness_vs_hardness_absolute_weighting() {
        let comps = comps_from_names(SORBET_ING);
        let targets = SORBET_DISPARATE_TARGETS.clone();
        let weighting = Weighting::Absolute;

        let balanced = balance_compositions_nnls(&comps, &targets, Some(weighting), &[]).unwrap();
        assert_gt!(max_rel_error(&balanced, &targets), 1100.0);
    }

    #[test]
    fn balance_boozy_abv_vs_pac() {
        assert_balance_compositions(
            &comps_from_names(BOOZY_ING),
            &BOOZY_DISPARATE_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(50.0),
        );
    }

    // Over-constrained: hitting the ABV target needs the liqueur, which also drives TotalPAC, so
    // the two can't both be met exactly. With absolute weighting the solver system breaks down and
    // collapses the total amount (must sum to 1) to ~0.29 to meet the larger ABV and PAC targets.
    #[test]
    fn balance_boozy_abv_vs_pac_absolute_weighting() {
        let comps = comps_from_names(BOOZY_ING);
        let targets = BOOZY_DISPARATE_TARGETS.clone();
        let weighting = Weighting::Absolute;

        let balanced = balance_compositions_nnls(&comps, &targets, Some(weighting), &[]).unwrap();
        assert_lt!(balanced.iter().map(|(_, amount)| *amount).sum::<f64>(), 0.3);
    }

    // --- Balance quality reports ---

    #[test]
    fn balance_quality_dairy_disparate_targets() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_ING),
            &DAIRY_DISPARATE_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_ING)
        ));
    }

    #[test]
    fn balance_quality_light_premium_fat_vs_energy() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_SUGAR_ING),
            &LIGHT_PREMIUM_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_SUGAR_ING)
        ));
    }

    #[test]
    fn balance_quality_chocolate_coupled_cocoa() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_COCOA_ING),
            &CHOCOLATE_COUPLED_COCOA_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_COCOA_ING)
        ));
    }

    #[test]
    fn balance_quality_dairy_high_msnf() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_ING),
            &DAIRY_HIGH_MSNF_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_ING)
        ));
    }

    #[test]
    fn balance_quality_sorbet_sweetness_vs_hardness() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(SORBET_ING),
            &SORBET_DISPARATE_TARGETS,
            BOTH_SOLVERS,
            Some(SORBET_ING)
        ));
    }

    #[test]
    fn balance_quality_boozy_abv_vs_pac() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(BOOZY_ING),
            &BOOZY_DISPARATE_TARGETS,
            BOTH_SOLVERS,
            Some(BOOZY_ING)
        ));
    }

    #[test]
    fn balance_quality_priority_pod_tradeoff() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_ING),
            &DAIRY_DISPARATE_TARGETS,
            POD_PRIORITY_RUNS,
            Some(DAIRY_ING)
        ));
    }

    #[test]
    fn balance_quality_sorbet_abs_pac_vs_sweetness() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(SORBET_ING),
            &SORBET_ABS_PAC_TARGETS,
            NNLS_ONLY,
            Some(SORBET_ING)
        ));
    }

    #[test]
    fn balance_quality_priority_abs_pac() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(SORBET_ING),
            &SORBET_ABS_PAC_TARGETS,
            ABS_PAC_PRIORITY_RUNS,
            Some(SORBET_ING)
        ));
    }

    // --- Balancing issue reports ---
    //
    // Snapshots of the user-facing `validate_balancing_targets` report for scenarios that raise
    // *several* issues at once, where reading the set as a whole is what catches spurious or
    // unhelpful wording. Single-issue cases are covered by the `validate_flags_*` assertions above.

    #[test]
    fn balancing_issues_report_input_errors() {
        // A grab-bag of caller mistakes: a non-finite and a negative target, a duplicated target
        // key, a duplicated priority key, and a priority for a key that is not a target. Shows how
        // an error-heavy report reads and how errors and warnings interleave.
        let targets = [
            (CompKey::MilkFat.into(), f64::NAN),
            (CompKey::MSNF.into(), -3.0),
            (CompKey::TotalSolids.into(), 30.0),
            (CompKey::TotalSolids.into(), 32.0),
        ];
        let priorities = [
            (CompKey::MilkFat.into(), Priority::High),
            (CompKey::MilkFat.into(), Priority::Critical),
            (CompKey::POD.into(), Priority::High),
        ];
        insta::assert_snapshot!(report_balancing_issues(
            &comps_from_names(DAIRY_ING),
            &targets,
            &priorities,
            Some(DAIRY_ING),
        ));
    }

    #[test]
    fn balancing_issues_report_multiple_warnings() {
        // One over-ambitious target set that trips three different warnings at once: an
        // out-of-range fat target, a sugar dominance conflict, and a cocoa target no ingredient
        // can supply. Confirms a multi-warning report stays informative rather than spurious.
        insta::assert_snapshot!(report_balancing_issues(
            &comps_from_names(DAIRY_SUGAR_ING),
            &[
                (CompKey::MilkFat.into(), 50.0),
                (CompKey::Sucrose.into(), 20.0),
                (CompKey::TotalSugars.into(), 15.0),
                (CompKey::CocoaSolids.into(), 5.0),
            ],
            &[],
            Some(DAIRY_SUGAR_ING),
        ));
    }

    #[test]
    fn balancing_issues_report_real_recipe_typical_self_targets() {
        // A real recipe validated against its own typical-key composition. The mix is a feasible
        // point of its own palette, so reachability/dominance stay silent; this captures how the
        // validator treats a genuine recipe — including any typical key the recipe leaves at zero.
        let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
        let comps = comps_from_light_recipe(&recipe);
        let targets = get_targets_from_light_recipe(&recipe, &get_typical_balancing_keys());
        insta::assert_snapshot!(report_balancing_issues(&comps, &targets, &[], None));
    }

    #[test]
    fn balancing_issues_report_real_recipe_conflicting_targets() {
        // A real recipe's ingredient palette asked for targets it cannot meet: a fat level beyond
        // any single ingredient and a sugar dominance conflict. Shows the report a user would see
        // when pushing a real base past what its ingredients allow.
        let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
        let comps = comps_from_light_recipe(&recipe);
        let targets = [
            (CompKey::MilkFat.into(), 45.0),
            (CompKey::Sucrose.into(), 25.0),
            (CompKey::TotalSugars.into(), 18.0),
        ];
        insta::assert_snapshot!(report_balancing_issues(&comps, &targets, &[], None));
    }

    #[test]
    fn balancing_issues_report_real_setup_with_ref_recipes_chocolate_no_ing() {
        // A typical scenario: balance a chocolate recipe to a reference base + cocoa targets.
        let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
        let comps = comps_from_light_recipe(&recipe);

        let targets = get_targets_from_light_recipe(&recipe, &get_typical_balancing_keys())
            .iter()
            .map(|&(key, value)| match key {
                BalanceKey::Comp(comp_key) => match comp_key {
                    CompKey::CocoaSolids => (CompKey::CocoaSolids.into(), 6.0),
                    CompKey::CocoaButter => (CompKey::CocoaButter.into(), 2.0),
                    _ => (key, value),
                },
                BalanceKey::Ratio(_) => (key, value),
            })
            .collect::<Vec<_>>();

        insta::assert_snapshot!(report_balancing_issues(&comps, &targets, &[], None));
    }

    #[test]
    fn balancing_issues_report_real_setup_with_ref_recipes_chocolate_powder_only() {
        // A typical scenario: balance a chocolate recipe to a reference base + cocoa targets.
        // Adding only cocoa powder produces many warnings that are redundant and confusing.
        let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
        let comps = comps_from_light_recipe(&[recipe.clone(), vec![("Cocoa Powder, 17% Fat".into(), 0.0)]].concat());

        let targets = get_targets_from_light_recipe(&recipe, &get_typical_balancing_keys())
            .iter()
            .map(|&(key, value)| match key {
                BalanceKey::Comp(comp_key) => match comp_key {
                    CompKey::CocoaSolids => (CompKey::CocoaSolids.into(), 6.0),
                    CompKey::CocoaButter => (CompKey::CocoaButter.into(), 2.0),
                    _ => (key, value),
                },
                BalanceKey::Ratio(_) => (key, value),
            })
            .collect::<Vec<_>>();

        insta::assert_snapshot!(report_balancing_issues(&comps, &targets, &[], None));
    }

    // --- Ratio keys ---

    /// An equal-parts mix of `comps`, expressed as a balanced result so [`achieved_value`] can
    /// read it. Any value it yields is reachable by the palette, which makes it a robust source of
    /// feasible ratio targets for recovery tests.
    fn equal_parts_reference(comps: &[Composition]) -> Vec<(Composition, f64)> {
        #[allow(clippy::cast_precision_loss)] // Ingredient counts stay far below f64's exact range
        let amount = 1.0 / comps.len() as f64;
        comps.iter().map(|comp| (*comp, amount)).collect()
    }

    #[test]
    fn balance_key_is_ratio_identifies_ratio_keys() {
        assert_true!(BalanceKey::from(RatioKey::AbsPAC).is_ratio());
        assert_true!(BalanceKey::from(RatioKey::AbsNetPAC).is_ratio());
        assert_true!(BalanceKey::from(RatioKey::StabilizersPerWater).is_ratio());
        assert_true!(BalanceKey::from(RatioKey::EmulsifiersPerFat).is_ratio());
    }

    #[test]
    fn balance_key_is_ratio_rejects_extensive_keys() {
        assert_false!(BalanceKey::from(CompKey::MilkFat).is_ratio());
        assert_false!(BalanceKey::from(CompKey::Energy).is_ratio());
        assert_false!(BalanceKey::from(CompKey::TotalPAC).is_ratio());
        assert_false!(BalanceKey::from(CompKey::NetPAC).is_ratio());
        assert_false!(BalanceKey::from(CompKey::Water).is_ratio());
    }

    #[test]
    fn balance_key_ratio_parts_maps_each_ratio_key_to_its_extensive_parts() {
        assert_eq!(RatioKey::AbsPAC.parts(), (CompKey::TotalPAC, CompKey::Water));
        assert_eq!(RatioKey::AbsNetPAC.parts(), (CompKey::NetPAC, CompKey::Water));
        assert_eq!(RatioKey::StabilizersPerWater.parts(), (CompKey::TotalStabilizers, CompKey::Water));
        assert_eq!(RatioKey::EmulsifiersPerFat.parts(), (CompKey::TotalEmulsifiers, CompKey::TotalFats));
        assert_eq!(BalanceKey::from(RatioKey::AbsPAC).ratio_parts(), Some((CompKey::TotalPAC, CompKey::Water)));
        assert_eq!(BalanceKey::from(CompKey::MilkFat).ratio_parts(), None);
    }

    #[test]
    fn target_row_coeff_and_rhs_encode_ratio_as_homogeneous_row() {
        let milk = comp_by_name("3.25% Milk"); // has both Water and TotalPAC

        // Common case: a ratio key with non-zero numerator and denominator yields the homogeneous
        // combination `num - (R/100)*den` — a finite, non-zero coefficient.
        let r = 9.0;
        let abs_pac_coeff = target_row_coeff(RatioKey::AbsPAC.into(), r, &milk);
        assert_true!(abs_pac_coeff.is_finite() && abs_pac_coeff != 0.0);
        assert_eq!(abs_pac_coeff, milk.get(CompKey::TotalPAC) - (r / 100.0) * milk.get(CompKey::Water));
        assert_eq!(target_row_rhs(RatioKey::AbsPAC.into(), r), 0.0);

        // Degenerate case: a zero denominator (Sucrose has no water) stays finite — no division.
        let sucrose = comp_by_name("Sucrose");
        let stab_coeff = target_row_coeff(RatioKey::StabilizersPerWater.into(), 0.5, &sucrose);
        assert_true!(stab_coeff.is_finite());
        // Zero stabilizers and zero water → a zero homogeneous coefficient.
        assert_eq!(stab_coeff, 0.0);
        assert_eq!(target_row_rhs(RatioKey::StabilizersPerWater.into(), 0.5), 0.0);

        // Extensive key: coefficient is comp.get(key), RHS is the target itself.
        assert_eq!(target_row_coeff(CompKey::MilkFat.into(), 16.0, &milk), milk.get(CompKey::MilkFat));
        assert_eq!(target_row_rhs(CompKey::MilkFat.into(), 16.0), 16.0);
    }

    #[test]
    fn get_balanceable_keys_includes_ratio_keys() {
        let balanceable = get_all_balanceable_keys();
        assert_eq!(balanceable.len(), CompKey::iter().count() + RatioKey::iter().count());
        assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::AbsPAC)));
        assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::AbsNetPAC)));
        assert_true!(balanceable.contains(&BalanceKey::from(CompKey::NetPAC)));
        assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::StabilizersPerWater)));
        assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::EmulsifiersPerFat)));
    }

    #[test]
    fn ratio_key_zero_denominator_ingredient_stays_finite() {
        let comps = comps_from_names(STABILIZER_AND_SUCROSE_ING);
        let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

        let balanced =
            balance_compositions_nnls(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[]).unwrap();

        assert_true!(balanced.iter().all(|(_, amount)| amount.is_finite()));
        assert_true!(achieved_value(&balanced, RatioKey::StabilizersPerWater).is_finite());
    }

    #[test]
    fn ratio_key_target_nalgebra_does_not_panic() {
        let comps = comps_from_names(STABILIZER_AND_SUCROSE_ING);
        let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

        let balanced =
            balance_compositions_nalgebra(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[])
                .unwrap();
        assert_true!(achieved_value(&balanced, RatioKey::StabilizersPerWater).is_finite());
    }

    #[test]
    fn balance_recovers_stabilizers_per_water_ratio() {
        let comps = comps_from_names(DAIRY_STABILIZER_ING);
        let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

        let balanced =
            balance_compositions_nnls(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[]).unwrap();
        assert_eq_flt_test!(achieved_value(&balanced, RatioKey::StabilizersPerWater), target);
    }

    #[test]
    fn balance_recovers_abs_pac_ratio() {
        let comps = comps_from_names(SORBET_ING);
        let target = achieved_value(&equal_parts_reference(&comps), RatioKey::AbsPAC);

        let balanced = balance_compositions_nnls(&comps, &[(RatioKey::AbsPAC.into(), target)], None, &[]).unwrap();
        assert_eq_flt_test!(achieved_value(&balanced, RatioKey::AbsPAC), target);
    }

    /// A realistically-proportioned chocolate reference over [`DAIRY_COCOA_ING`]: enough cocoa to
    /// keep `NetPAC` below `TotalPAC`, but little enough that it stays positive — unlike an
    /// equal-parts mix (see [`balance_compositions_rejects_negative_net_pac_target`]).
    fn chocolate_reference() -> Vec<(Composition, f64)> {
        comps_from_names(DAIRY_COCOA_ING)
            .into_iter()
            .zip([0.50, 0.20, 0.05, 0.25]) // Milk, Cream, Cocoa, Sucrose — sums to 1
            .collect()
    }

    #[test]
    fn balance_recovers_abs_net_pac_ratio() {
        // Cocoa carries a non-zero hardness factor, so NetPAC (= TotalPAC − HF) — and hence the
        // AbsNetPAC ratio — is genuinely distinct from AbsPAC for this palette, not an alias of it.
        let comps = comps_from_names(DAIRY_COCOA_ING);
        let target = achieved_value(&chocolate_reference(), RatioKey::AbsNetPAC);
        assert_gt!(target, 0.0); // guard: the reference keeps NetPAC (and so the ratio) positive

        let balanced = balance_compositions_nnls(&comps, &[(RatioKey::AbsNetPAC.into(), target)], None, &[]).unwrap();
        assert_eq_flt_test!(achieved_value(&balanced, RatioKey::AbsNetPAC), target);
    }

    #[test]
    fn balance_recovers_net_pac_distinct_from_total_pac() {
        // Cocoa's hardness factor keeps NetPAC strictly below TotalPAC; recovering both at once
        // proves NetPAC is its own HF-subtracted extensive key, not an alias of TotalPAC.
        let comps = comps_from_names(DAIRY_COCOA_ING);
        let reference = chocolate_reference();
        let total_pac = achieved_value(&reference, CompKey::TotalPAC);
        let net_pac = achieved_value(&reference, CompKey::NetPAC);

        // The hardness factor separates the two keys, yet NetPAC stays positive for this mix.
        assert_gt!(net_pac, 0.0);
        assert_lt!(net_pac, total_pac);

        let targets = [(CompKey::TotalPAC.into(), total_pac), (CompKey::NetPAC.into(), net_pac)];
        let balanced = balance_compositions_nnls(&comps, &targets, None, &[]).unwrap();

        assert_eq_flt_test!(achieved_value(&balanced, CompKey::TotalPAC), total_pac);
        assert_eq_flt_test!(achieved_value(&balanced, CompKey::NetPAC), net_pac);
    }

    #[test]
    fn balance_compositions_rejects_negative_net_pac_target() {
        // NetPAC can legitimately be negative (HF > TotalPAC), yet balancing still rejects a
        // negative target (see `BalancingIssue::NegativeTarget`). A 25%-cocoa equal-parts mix has
        // enough hardness factor to push its own NetPAC below zero, making it an invalid target.
        let comps = comps_from_names(DAIRY_COCOA_ING);
        let net_pac = achieved_value(&equal_parts_reference(&comps), CompKey::NetPAC);
        assert_lt!(net_pac, 0.0); // the equal-parts cocoa mix drives NetPAC below zero

        let result = balance_compositions(&comps, &[(CompKey::NetPAC.into(), net_pac)], None, &[]);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_recovers_emulsifiers_per_fat_ratio() {
        let comps = comps_from_names(EMULSIFIER_ING);
        let target = achieved_value(&equal_parts_reference(&comps), RatioKey::EmulsifiersPerFat);

        let balanced =
            balance_compositions_nnls(&comps, &[(RatioKey::EmulsifiersPerFat.into(), target)], None, &[]).unwrap();
        assert_eq_flt_test!(achieved_value(&balanced, RatioKey::EmulsifiersPerFat), target);
    }

    #[test]
    fn balance_recovers_stabilizers_per_water_with_extensive_target() {
        let comps = comps_from_names(DAIRY_STABILIZER_ING);
        let reference = equal_parts_reference(&comps);
        let milk_fat = achieved_value(&reference, CompKey::MilkFat);
        let ratio = achieved_value(&reference, RatioKey::StabilizersPerWater);
        let targets = [
            (CompKey::MilkFat.into(), milk_fat),
            (RatioKey::StabilizersPerWater.into(), ratio),
        ];

        let balanced = balance_compositions_nnls(&comps, &targets, None, &[]).unwrap();

        assert_eq_flt_test!(achieved_value(&balanced, CompKey::MilkFat), milk_fat);
        assert_eq_flt_test!(achieved_value(&balanced, RatioKey::StabilizersPerWater), ratio);
    }

    #[test]
    fn balance_recovers_emulsifiers_per_fat_with_extensive_target() {
        let comps = comps_from_names(EMULSIFIER_ING);
        let reference = equal_parts_reference(&comps);
        let milk_fat = achieved_value(&reference, CompKey::MilkFat);
        let ratio = achieved_value(&reference, RatioKey::EmulsifiersPerFat);
        let targets = [
            (CompKey::MilkFat.into(), milk_fat),
            (RatioKey::EmulsifiersPerFat.into(), ratio),
        ];

        let balanced = balance_compositions_nnls(&comps, &targets, None, &[]).unwrap();

        assert_eq_flt_test!(achieved_value(&balanced, CompKey::MilkFat), milk_fat);
        assert_eq_flt_test!(achieved_value(&balanced, RatioKey::EmulsifiersPerFat), ratio);
    }

    #[test]
    fn estimate_ratio_denominator_uses_denominator_target_exactly() {
        // When the denominator key (Water for AbsPAC, TotalFats for EmulsifiersPerFat) is itself a
        // target, that exact value is used — it is the most direct statement of intent.
        assert_eq!(estimate_ratio_denominator(RatioKey::AbsPAC.into(), &[(CompKey::Water.into(), 70.0)]), Some(70.0));
        assert_eq!(
            estimate_ratio_denominator(RatioKey::StabilizersPerWater.into(), &[(CompKey::Water.into(), 55.0)]),
            Some(55.0)
        );
        assert_eq!(
            estimate_ratio_denominator(RatioKey::EmulsifiersPerFat.into(), &[(CompKey::TotalFats.into(), 12.0)]),
            Some(12.0)
        );
    }

    #[test]
    fn estimate_ratio_denominator_infers_water_from_total_solids() {
        // Absent a Water target, Water is inferred as 100 − TotalSolids − Alcohol.
        assert_eq!(
            estimate_ratio_denominator(RatioKey::AbsPAC.into(), &[(CompKey::TotalSolids.into(), 30.0)]),
            Some(70.0)
        );
        // AbsNetPAC is also Water-denominated, so it shares the same inference path.
        assert_eq!(
            estimate_ratio_denominator(RatioKey::AbsNetPAC.into(), &[(CompKey::TotalSolids.into(), 30.0)]),
            Some(70.0)
        );
        assert_eq!(
            estimate_ratio_denominator(
                RatioKey::AbsPAC.into(),
                &[(CompKey::TotalSolids.into(), 30.0), (CompKey::Alcohol.into(), 5.0)]
            ),
            Some(65.0)
        );
    }

    #[test]
    fn estimate_ratio_denominator_falls_back_to_typical_mix_constants() {
        use crate::constants::balancing::{TYPICAL_MIX_FAT, TYPICAL_MIX_WATER};

        // No denominator signal → the typical-mix constant for that denominator.
        assert_eq!(estimate_ratio_denominator(RatioKey::AbsPAC.into(), &[]), Some(TYPICAL_MIX_WATER));
        assert_eq!(
            estimate_ratio_denominator(RatioKey::StabilizersPerWater.into(), &[(CompKey::MilkFat.into(), 12.0)]),
            Some(TYPICAL_MIX_WATER)
        );
        // TotalFats has no inference path, so even a TotalSolids target leaves the fat fallback.
        assert_eq!(
            estimate_ratio_denominator(RatioKey::EmulsifiersPerFat.into(), &[(CompKey::TotalSolids.into(), 30.0)]),
            Some(TYPICAL_MIX_FAT)
        );
    }

    #[test]
    fn estimate_ratio_denominator_returns_none_for_extensive_key() {
        assert_eq!(estimate_ratio_denominator(CompKey::MilkFat.into(), &[]), None);
        assert_eq!(estimate_ratio_denominator(CompKey::Energy.into(), &[(CompKey::Energy.into(), 200.0)]), None);
    }

    #[test]
    fn ratio_reweighting_recovers_despite_off_seed() {
        use crate::constants::balancing::{RATIO_REWEIGHT_TOLERANCE, TYPICAL_MIX_WATER};

        let comps = comps_from_names(DAIRY_STABILIZER_ING);
        let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

        // With only a ratio target, the seed denominator falls back to TYPICAL_MIX_WATER, far
        // above the dairy base's actual water, so the corrective reweighting pass must run.
        let balanced =
            balance_compositions_nnls(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[]).unwrap();

        let achieved_water = achieved_value(&balanced, CompKey::Water);
        assert_gt!(
            (achieved_water - TYPICAL_MIX_WATER).abs() / TYPICAL_MIX_WATER,
            RATIO_REWEIGHT_TOLERANCE,
            "seed denominator should be materially off, so the reweighting pass is exercised"
        );
        assert_eq_flt_test!(achieved_value(&balanced, RatioKey::StabilizersPerWater), target);
    }

    #[test]
    fn balance_over_constrained_ratio_yields_valid_mix() {
        // An over-constrained ratio + extensive system (sorbet AbsPAC) must still yield a usable
        // mix — finite, non-negative, summing to 1; the loose ceiling only rejects a blow-up.
        assert_balance_compositions(
            &comps_from_names(SORBET_ING),
            &SORBET_ABS_PAC_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(500.0),
        );
    }

    #[test]
    fn priority_tightens_ratio_key() {
        let comps = comps_from_names(SORBET_ING);
        let targets: &[(BalanceKey, f64)] = &SORBET_ABS_PAC_TARGETS;
        let abs_pac_target = targets
            .iter()
            .find(|(key, _)| *key == BalanceKey::from(RatioKey::AbsPAC))
            .unwrap()
            .1;

        let baseline = balance_compositions(&comps, targets, None, &[]).unwrap();
        let prioritized =
            balance_compositions(&comps, targets, None, &[(RatioKey::AbsPAC.into(), Priority::Critical)]).unwrap();

        let abs_pac_error = |balanced: &[(Composition, f64)]| {
            balance_rel_error_pp(achieved_value(balanced, RatioKey::AbsPAC), abs_pac_target)
        };
        assert_lt!(abs_pac_error(&prioritized), abs_pac_error(&baseline) - MIN_PRIORITY_EFFECT_PP);
    }

    // --- Solver behavior and edge cases ---

    #[test]
    fn nalgebra_allows_negative_amounts_while_nnls_does_not() {
        let comps = comps_from_names(BOOZY_ING);

        let nalgebra = balance_compositions_nalgebra(&comps, &BOOZY_DISPARATE_TARGETS, None, &[]).unwrap();
        let nnls = balance_compositions_nnls(&comps, &BOOZY_DISPARATE_TARGETS, None, &[]).unwrap();

        assert_true!(nalgebra.iter().any(|(_, amount)| *amount < 0.0));
        assert_true!(nnls.iter().all(|(_, amount)| *amount >= -TESTS_EPSILON),);
    }

    /// An under-determined system (more ingredients than targets) has many exact solutions; both
    /// solvers should still return a combination that sums to 1 and hits the single target.
    #[test]
    fn balance_underdetermined_system_hits_target() {
        let comps = comps_from_names(DAIRY_ING); // 3 comps
        let targets = [(CompKey::MilkFat.into(), 10.0)]; // 1 target

        let solvers: [SolverFn; 2] = [balance_compositions_nalgebra, balance_compositions_nnls];
        for solve in solvers {
            assert_balance_compositions(&comps, &targets, solve, Epsilons::default(), &KeyCeiling::exact());
        }
    }

    #[test]
    fn relative_weighting_beats_absolute_on_disparate_targets() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;

        let max_error_for = |weighting| {
            let balanced = balance_compositions_nnls(&comps, targets, weighting, &[]).unwrap();
            max_rel_error(&balanced, targets)
        };

        let absolute = max_error_for(Some(Weighting::Absolute));
        let relative = max_error_for(None);

        assert_true!(relative < absolute);
    }

    // --- balance_compositions entry point ---

    #[test]
    fn balance_compositions_accepts_ratio_key_target() {
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let result = balance_compositions(&comps, &[(RatioKey::StabilizersPerWater.into(), 0.5)], None, &[]);
        assert!(result.is_ok());
    }

    #[test]
    fn balance_compositions_rejects_duplicate_target() {
        let comps = comps_from_names(DAIRY_ING);
        let result = balance_compositions(
            &comps,
            &[(CompKey::MilkFat.into(), 16.0), (CompKey::MilkFat.into(), 12.0)],
            None,
            &[],
        );
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_compositions_rejects_non_finite_target() {
        let comps = comps_from_names(DAIRY_ING);
        let result = balance_compositions(&comps, &[(CompKey::MilkFat.into(), f64::NAN)], None, &[]);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_compositions_rejects_negative_target() {
        let comps = comps_from_names(DAIRY_ING);
        let result = balance_compositions(&comps, &[(CompKey::MilkFat.into(), -1.0)], None, &[]);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    #[cfg(debug_assertions)]
    #[should_panic(expected = "validated targets")]
    fn raw_solver_debug_asserts_on_unvalidated_target() {
        // The raw solvers assume pre-validated targets; in debug builds a negative target (a caller
        // bug, since `balance_compositions` would have rejected it) trips the precondition assert.
        let comps = comps_from_names(DAIRY_ING);
        drop(balance_compositions_nnls(&comps, &[(CompKey::MilkFat.into(), -1.0)], None, &[]));
    }

    #[test]
    fn balance_compositions_recovers_feasible_targets() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_TRIVIAL_TARGETS,
            balance_compositions,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_compositions_proceeds_despite_warnings() {
        // A Sucrose > TotalSugars pair only warns; the solve still returns a best-effort result.
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let targets = [(CompKey::Sucrose.into(), 20.0), (CompKey::TotalSugars.into(), 15.0)];
        assert!(balance_compositions(&comps, &targets, None, &[]).is_ok());
    }

    // --- Priority ---

    #[test]
    fn priority_weights_increase_with_level() {
        assert_eq!(Priority::default(), Priority::Normal);
        assert_eq!(Priority::Normal.weight(), 1.0);
        assert_lt!(Priority::Low.weight(), Priority::Normal.weight());
        assert_gt!(Priority::High.weight(), Priority::Normal.weight());
        assert_gt!(Priority::Critical.weight(), Priority::High.weight());
    }

    #[test]
    fn empty_priorities_match_explicit_normal() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;

        let empty = balance_compositions(&comps, targets, None, &[]).unwrap();
        let all_normal = balance_compositions(
            &comps,
            targets,
            None,
            &[
                (CompKey::Energy.into(), Priority::Normal),
                (CompKey::MilkFat.into(), Priority::Normal),
                (CompKey::MSNF.into(), Priority::Normal),
                (CompKey::POD.into(), Priority::Normal),
            ],
        )
        .unwrap();

        for ((_, empty_amount), (_, normal_amount)) in empty.iter().zip(all_normal.iter()) {
            assert_eq!(*empty_amount, *normal_amount);
        }
    }

    #[test]
    fn priority_reduces_error_on_prioritized_key() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
        let pod_target = targets
            .iter()
            .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
            .unwrap()
            .1;

        let baseline = balance_compositions_nnls(&comps, targets, None, &[]).unwrap();
        let prioritized =
            balance_compositions_nnls(&comps, targets, None, &[(CompKey::POD.into(), Priority::Critical.weight())])
                .unwrap();

        let pod_error =
            |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
        assert_lt!(pod_error(&prioritized), pod_error(&baseline) - MIN_PRIORITY_EFFECT_PP);

        // Priority never scales the sum-constraint row, so mass balance is preserved.
        let amount_sum: f64 = prioritized.iter().map(|(_, amount)| *amount).sum();
        assert_eq_flt_test!(amount_sum, 1.0);
    }

    #[test]
    fn priority_low_increases_error_on_low_priority_key() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
        let pod_target = targets
            .iter()
            .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
            .unwrap()
            .1;

        let baseline = balance_compositions_nnls(&comps, targets, None, &[]).unwrap();
        let low_weighted =
            balance_compositions_nnls(&comps, targets, None, &[(CompKey::POD.into(), Priority::Low.weight())]).unwrap();

        let pod_error =
            |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
        assert_gt!(pod_error(&low_weighted), pod_error(&baseline) + MIN_PRIORITY_EFFECT_PP);

        // Mass balance is preserved regardless of the priority weight.
        let amount_sum: f64 = low_weighted.iter().map(|(_, amount)| *amount).sum();
        assert_eq_flt_test!(amount_sum, 1.0);
    }

    #[test]
    fn balance_compositions_threads_priorities() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
        let pod_target = targets
            .iter()
            .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
            .unwrap()
            .1;

        let baseline = balance_compositions(&comps, targets, None, &[]).unwrap();
        let prioritized =
            balance_compositions(&comps, targets, None, &[(CompKey::POD.into(), Priority::Critical)]).unwrap();

        let pod_error =
            |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
        assert_lt!(pod_error(&prioritized), pod_error(&baseline) - MIN_PRIORITY_EFFECT_PP);
    }

    #[test]
    fn priority_weight_values_match_documented_constants() {
        assert_eq!(Priority::Low.weight(), 0.2);
        assert_eq!(Priority::Normal.weight(), 1.0);
        assert_eq!(Priority::High.weight(), 5.0);
        assert_eq!(Priority::Critical.weight(), 25.0);
    }

    #[test]
    fn priority_error_decreases_monotonically_with_level() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
        let pod_target = targets
            .iter()
            .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
            .unwrap()
            .1;

        let pod_error = |priorities: &[(BalanceKey, f64)]| {
            let balanced = balance_compositions_nnls(&comps, targets, None, priorities).unwrap();
            balance_rel_error_pp(achieved_value(&balanced, CompKey::POD), pod_target)
        };

        let low = pod_error(&[(CompKey::POD.into(), Priority::Low.weight())]);
        let normal = pod_error(&[]);
        let high = pod_error(&[(CompKey::POD.into(), Priority::High.weight())]);
        let critical = pod_error(&[(CompKey::POD.into(), Priority::Critical.weight())]);

        assert_lt!(normal, low - MIN_PRIORITY_EFFECT_PP);
        assert_lt!(high, normal - MIN_PRIORITY_EFFECT_PP);
        assert_lt!(critical, high - MIN_PRIORITY_EFFECT_PP);
    }

    #[test]
    fn priority_trades_off_competing_key() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;

        let baseline = balance_compositions_nnls(&comps, targets, None, &[]).unwrap();
        let prioritized =
            balance_compositions_nnls(&comps, targets, None, &[(CompKey::POD.into(), Priority::Critical.weight())])
                .unwrap();

        let worsened = targets
            .iter()
            .filter(|(key, _)| *key != BalanceKey::from(CompKey::POD))
            .any(|&(key, target)| {
                let baseline_error = balance_rel_error_pp(achieved_value(&baseline, key), target);
                let prioritized_error = balance_rel_error_pp(achieved_value(&prioritized, key), target);
                prioritized_error > baseline_error + MIN_PRIORITY_EFFECT_PP
            });
        assert_true!(worsened, "prioritizing POD should materially worsen a competing target");
    }

    /// Mixed priority levels act per key, checked ceteris paribus (vary one key's level, hold the
    /// other's fixed) since two prioritized keys also trade off against each other.
    #[test]
    fn priority_mixed_levels_tighten_each_key() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
        let error_for = |priorities: &[(BalanceKey, f64)], key: BalanceKey| {
            let target = targets.iter().find(|(k, _)| *k == key).unwrap().1;
            let balanced = balance_compositions_nnls(&comps, targets, None, priorities).unwrap();
            balance_rel_error_pp(achieved_value(&balanced, key), target)
        };

        let msnf_high = (CompKey::MSNF.into(), Priority::High.weight());
        let pod_critical = (CompKey::POD.into(), Priority::Critical.weight());

        // Raising POD Normal→Critical (MSNF held High) tightens POD by a wide margin.
        let pod_before = error_for(&[msnf_high], CompKey::POD.into());
        let pod_after = error_for(&[pod_critical, msnf_high], CompKey::POD.into());
        assert_lt!(pod_after, pod_before - MIN_PRIORITY_EFFECT_PP);

        // Raising MSNF Normal→High (POD held Critical) slightly tightens MSNF: its own priority
        // pulls the right way, but only a little here, since POD's Critical dominates the solve.
        let msnf_before = error_for(&[pod_critical], CompKey::MSNF.into());
        let msnf_after = error_for(&[pod_critical, msnf_high], CompKey::MSNF.into());
        assert_le!(msnf_after, msnf_before - 0.4);
    }

    #[test]
    fn validate_flags_duplicate_priority_as_error() {
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat.into(), 16.0)];
        let priorities = [
            (CompKey::MilkFat.into(), Priority::High),
            (CompKey::MilkFat.into(), Priority::Critical),
        ];
        let report = validate_balancing_targets(&comps, &targets, &priorities);

        assert_true!(report.has_errors());
        assert_true!(report.errors().any(|issue| matches!(
            issue,
            BalancingIssue::DuplicatePriority {
                key: BalanceKey::Comp(CompKey::MilkFat)
            }
        )));
    }

    #[test]
    fn validate_flags_priority_without_target_as_warning() {
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat.into(), 16.0)];
        let priorities = [(CompKey::MSNF.into(), Priority::High)]; // no MSNF target
        let report = validate_balancing_targets(&comps, &targets, &priorities);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::PriorityWithoutTarget {
                key: BalanceKey::Comp(CompKey::MSNF)
            }
        )));
    }

    #[test]
    fn balance_compositions_rejects_duplicate_priority() {
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MSNF.into(), 11.0)];
        let priorities = [
            (CompKey::MilkFat.into(), Priority::High),
            (CompKey::MilkFat.into(), Priority::Critical),
        ];
        let result = balance_compositions(&comps, &targets, None, &priorities);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_compositions_proceeds_despite_priority_without_target() {
        // A priority whose key has no target is only a warning; the solve still returns a result.
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MSNF.into(), 11.0)];
        let priorities = [(CompKey::TotalSugars.into(), Priority::High)]; // no TotalSugars target
        assert!(balance_compositions(&comps, &targets, None, &priorities).is_ok());
    }

    // --- validate_balancing_targets: error-severity issues ---

    #[test]
    fn validate_does_not_flag_ratio_key_target() {
        // Ratio keys are now balanceable (encoded as homogeneous rows), so they are not an error.
        let report =
            validate_balancing_targets(&comps_from_names(DAIRY_SUGAR_ING), &[(RatioKey::AbsPAC.into(), 9.0)], &[]);
        assert_false!(report.has_errors());
    }

    #[test]
    fn validate_flags_non_finite_target_as_error() {
        let report =
            validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), f64::INFINITY)], &[]);
        assert_true!(
            report
                .errors()
                .any(|issue| matches!(issue, BalancingIssue::NonFiniteTarget { .. }))
        );
    }

    #[test]
    fn validate_flags_negative_target_as_error() {
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), -5.0)], &[]);
        assert_true!(report.errors().any(|issue| matches!(
            issue,
            BalancingIssue::NegativeTarget {
                key: BalanceKey::Comp(CompKey::MilkFat),
                ..
            }
        )));
    }

    #[test]
    fn validate_flags_negative_ratio_target_as_error() {
        let report =
            validate_balancing_targets(&comps_from_names(DAIRY_SUGAR_ING), &[(RatioKey::AbsPAC.into(), -1.0)], &[]);
        assert_true!(report.errors().any(|issue| matches!(
            issue,
            BalancingIssue::NegativeTarget {
                key: BalanceKey::Ratio(RatioKey::AbsPAC),
                ..
            }
        )));
    }

    #[test]
    fn validate_does_not_double_flag_negative_target() {
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), -5.0)], &[]);
        assert_false!(
            report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::UnreachableTarget { .. }))
        );
    }

    #[test]
    fn validate_does_not_flag_zero_target_as_negative() {
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), 0.0)], &[]);
        assert_false!(
            report
                .errors()
                .any(|issue| matches!(issue, BalancingIssue::NegativeTarget { .. }))
        );
    }

    #[test]
    fn validate_flags_duplicate_target_as_error() {
        let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MilkFat.into(), 12.0)];
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets, &[]);
        assert_true!(report.errors().any(|issue| matches!(
            issue,
            BalancingIssue::DuplicateTarget {
                key: BalanceKey::Comp(CompKey::MilkFat)
            }
        )));
    }

    // --- validate_balancing_targets: warning-severity issues ---

    #[test]
    fn validate_flags_unaffectable_target_as_warning() {
        // Plain dairy has no alcohol source, so no combination can move an Alcohol target off zero.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::Alcohol.into(), 5.0)], &[]);
        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnaffectableTarget {
                key: BalanceKey::Comp(CompKey::Alcohol)
            }
        )));
    }

    #[test]
    fn validate_flags_ratio_key_with_unaffectable_numerator_as_warning() {
        // No stabilizer source in the palette → the StabilizersPerWater numerator is unaffectable,
        // so the only reachable ratio is zero and a nonzero target cannot be met. Flag (warning).
        let report = validate_balancing_targets(
            &comps_from_names(DAIRY_SUGAR_ING),
            &[(RatioKey::StabilizersPerWater.into(), 0.5)],
            &[],
        );
        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnaffectableTarget {
                key: BalanceKey::Ratio(RatioKey::StabilizersPerWater)
            }
        )));
    }

    #[test]
    fn validate_flags_ratio_key_with_unaffectable_denominator_as_warning() {
        // A fat-free sorbet palette → the EmulsifiersPerFat denominator (TotalFats) is
        // unaffectable, so the ratio is undefined and cannot be balanced. Flagged (warning).
        let report = validate_balancing_targets(
            &comps_from_names(SORBET_ING),
            &[(RatioKey::EmulsifiersPerFat.into(), 1.0)],
            &[],
        );
        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnaffectableTarget {
                key: BalanceKey::Ratio(RatioKey::EmulsifiersPerFat)
            }
        )));
    }

    #[test]
    fn validate_flags_unreachable_target_as_warning() {
        // The richest dairy ingredient is 40% cream, so a 50% milk-fat target is out of reach.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), 50.0)], &[]);
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnreachableTarget {
                key: BalanceKey::Comp(CompKey::MilkFat),
                target: 50.0,
                min: 1.0,
                max: 40.0,
            }
        )));
    }

    #[test]
    fn validate_flags_structural_dominance_for_sucrose_over_total_sugars() {
        // Sucrose is structurally part of TotalSugars, so a Sucrose target above the TotalSugars
        // target is a logical contradiction the palette-independent structural check catches first
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let targets = [(CompKey::Sucrose.into(), 20.0), (CompKey::TotalSugars.into(), 15.0)];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::StructuralViolation {
                whole: BalanceKey::Comp(CompKey::TotalSugars),
                parts_target_sum,
                whole_target,
                parts,
            } if parts.as_slice() == [BalanceKey::Comp(CompKey::Sucrose)]
                && *parts_target_sum == 20.0
                && *whole_target == 15.0
        )));

        // The palette dominance check must not also fire for this structural pair (no duplicate).
        assert_false!(
            report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::DominanceViolation { .. }))
        );
    }

    #[test]
    fn validate_flags_additive_dominance_for_sugars_over_total_sugars() {
        // Sucrose + Fructose sum under TotalSugars in every ingredient, yet their targets sum to
        // 20 > 15 — infeasible only as a group (no single sugar exceeds TotalSugars).
        let comps = comps_from_names(SUGAR_BLEND_ING);
        let targets = [
            (CompKey::Sucrose.into(), 10.0),
            (CompKey::Fructose.into(), 10.0),
            (CompKey::TotalSugars.into(), 15.0),
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        // No single-part (pairwise) dominance: every individual sugar target is within TotalSugars.
        assert_false!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::DominanceViolation { lesser, .. } if lesser.len() == 1
        )));
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::DominanceViolation {
                greater: BalanceKey::Comp(CompKey::TotalSugars),
                lesser,
                lesser_target_sum,
                greater_target,
            } if lesser.len() == 2 && *lesser_target_sum == 20.0 && *greater_target == 15.0
        )));
    }

    #[ignore = "TODO: This currently documents an implementation gap, enable once fixed"]
    #[test]
    fn validate_does_not_flag_unaffectable_for_zero_target() {
        // A zero target for a key no ingredient supplies is trivially satisfied
        let report =
            validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::CocoaSolids.into(), 0.0)], &[]);

        assert_false!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnaffectableTarget {
                key: BalanceKey::Comp(CompKey::CocoaSolids)
            }
        )));
    }

    #[ignore = "TODO: This currently documents an implementation gap, enable once fixed"]
    #[test]
    fn validate_does_not_flag_self_dominance_for_duplicate_target() {
        // A duplicated target key is already an error (`DuplicateTarget`); the dominance check must
        // not additionally compare the key against itself and emit a nonsensical "X exceeds X"
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::TotalSolids.into(), 30.0), (CompKey::TotalSolids.into(), 32.0)];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::DominanceViolation { lesser, greater, .. } if lesser.first() == Some(greater)
        )));
    }

    #[test]
    fn validate_clean_targets_yield_empty_report() {
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &DAIRY_TRIVIAL_TARGETS, &[]);
        assert_true!(report.is_empty());
        assert_false!(report.has_errors());
    }

    #[test]
    fn validate_flags_ratio_infeasibility_for_pinned_cocoa_ratio() {
        // The only cocoa source pins CocoaButter : CocoaSolids ≈ 0.2. A 2 : 5 (0.4) target is off
        // that pin yet keeps CocoaButter <= CocoaSolids, so only the ratio-band check catches it.
        let comps = comps_from_names(DAIRY_COCOA_ING);
        let targets = [(CompKey::CocoaButter.into(), 2.0), (CompKey::CocoaSolids.into(), 5.0)];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::RatioInfeasibility {
                numerator,
                denominator: BalanceKey::Comp(CompKey::CocoaSolids),
                target_ratio,
                ..
            } if numerator.as_slice() == [BalanceKey::Comp(CompKey::CocoaButter)]
                && (*target_ratio - 0.4).abs() < TESTS_EPSILON
        )));

        // It is an off-band ratio, not a dominance violation (CocoaButter <= CocoaSolids holds).
        assert_false!(
            report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::DominanceViolation { .. }))
        );
    }

    #[test]
    fn validate_flags_ratio_infeasibility_from_multiple_sources() {
        // All three dairy ingredients pin MilkProteins : MSNF ≈ 0.35. A target of 3 : 10 = 0.30
        // is off-band even though multiple sources agree on the same pinned value.
        let comps = comps_from_names(DAIRY_ING);
        // MilkProteins is listed first so it becomes the numerator in the pairwise check.
        let targets = [(CompKey::MilkProteins.into(), 3.0), (CompKey::MSNF.into(), 10.0)];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::RatioInfeasibility {
                numerator,
                denominator: BalanceKey::Comp(CompKey::MSNF),
                target_ratio,
                ..
            } if numerator.as_slice() == [BalanceKey::Comp(CompKey::MilkProteins)]
                && (*target_ratio - 0.3).abs() < TESTS_EPSILON
        )));
    }

    #[test]
    fn validate_flags_multi_ratio_infeasibility_from_multiple_sources() {
        // Every sugar in these two milks is a named one (Sealtest is all lactose, lactose-free is
        // all glucose + galactose), so the palette pins (Lactose + Glucose + Galactose) / TotalSugars
        // at 1. Each part fits individually, but the combined target share 2.0 / 4.7 ≈ 0.43 is below
        // that pin — infeasible only as a group, which only the grouped ratio band catches.
        let comps = comps_from_names(&["Sealtest 0% Skim Milk", "Lactose-Free 0% Milk"]);
        let targets = [
            (CompKey::TotalSugars.into(), 4.7),
            (CompKey::Lactose.into(), 1.0),
            (CompKey::Glucose.into(), 0.5),
            (CompKey::Galactose.into(), 0.5),
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::RatioInfeasibility {
                numerator,
                denominator: BalanceKey::Comp(CompKey::TotalSugars),
                target_ratio,
                ..
            } if numerator.len() == 3
                && numerator.contains(&BalanceKey::Comp(CompKey::Lactose))
                && numerator.contains(&BalanceKey::Comp(CompKey::Glucose))
                && numerator.contains(&BalanceKey::Comp(CompKey::Galactose))
                && (*target_ratio - 2.0 / 4.7).abs() < TESTS_EPSILON
        )));
    }

    #[test]
    fn validate_flags_multi_ratio_infeasibility_when_combined_exceeds_band_max() {
        // In DAIRY_ING, the (MilkFat + MSNF) / Water band is approximately [0.136, 32.33].
        // The individual pairwise bands for MilkFat/Water ≈ [0.037, 0.733] and
        // MSNF/Water ≈ [0.099, 32] are each satisfied by these targets, but the combined band
        // max (32.33) is lower than the sum of the individual maxima (32.73), so targets can
        // exceed the combined max without triggering either pairwise check.
        let comps = comps_from_names(DAIRY_ING);
        let targets = [
            (CompKey::MilkFat.into(), 1.5), // MilkFat/Water = 0.5 — within [0.037, 0.733]
            (CompKey::MSNF.into(), 96.0),   // MSNF/Water   = 32  — within [0.099, 32]
            (CompKey::Water.into(), 3.0),   // combined     = 32.5 — above 32.33
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::RatioInfeasibility {
                numerator,
                denominator: BalanceKey::Comp(CompKey::Water),
                ..
            } if numerator.len() == 2
                && numerator.contains(&BalanceKey::Comp(CompKey::MilkFat))
                && numerator.contains(&BalanceKey::Comp(CompKey::MSNF))
        )));

        // No pairwise ratio issue fires — both individual ratios are within their bands.
        assert_false!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::RatioInfeasibility { numerator, .. } if numerator.len() == 1
        )));
    }

    #[test]
    fn validate_no_multi_ratio_issue_when_combined_within_band() {
        // Same palette; combined ratio of 32 is within the [0.136, 32.33] band.
        let comps = comps_from_names(DAIRY_ING);
        let targets = [
            (CompKey::MilkFat.into(), 1.0),
            (CompKey::MSNF.into(), 95.0),
            (CompKey::Water.into(), 3.0),
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::RatioInfeasibility { numerator, .. } if numerator.len() == 2
        )));
    }

    #[test]
    fn validate_flags_palette_dominance_for_non_structural_pair() {
        // CocoaButter and CocoaSolids are siblings, and the lone cocoa source pins CocoaButter <=
        // CocoaSolids, so a higher CocoaButter target is a palette dominance violation.
        let comps = comps_from_names(DAIRY_COCOA_ING);
        let targets = [(CompKey::CocoaButter.into(), 10.0), (CompKey::CocoaSolids.into(), 5.0)];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::DominanceViolation {
                greater: BalanceKey::Comp(CompKey::CocoaSolids),
                lesser,
                lesser_target_sum,
                greater_target,
            } if lesser.as_slice() == [BalanceKey::Comp(CompKey::CocoaButter)]
                && *lesser_target_sum == 10.0
                && *greater_target == 5.0
        )));

        // Siblings, not a part/whole pair, so the structural check stays silent.
        assert_false!(
            report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::StructuralViolation { .. }))
        );
    }

    #[test]
    fn validate_flags_rollup_sum_mismatch_for_incomplete_milk_solids() {
        // MilkSolids is a residual-free roll-up of MilkFat + MSNF, so both children targets must
        // sum to it. 10 + 5 = 15 != 20 contradicts the palette-independent completeness check.
        let comps = comps_from_names(DAIRY_ING);
        let targets = [
            (CompKey::MilkFat.into(), 10.0),
            (CompKey::MSNF.into(), 5.0),
            (CompKey::MilkSolids.into(), 20.0),
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::RollupSumMismatch {
                whole: BalanceKey::Comp(CompKey::MilkSolids),
                parts,
                parts_target_sum,
                whole_target,
            } if parts.as_slice() == [BalanceKey::Comp(CompKey::MilkFat), BalanceKey::Comp(CompKey::MSNF)]
                && *parts_target_sum == 15.0
                && *whole_target == 20.0
        )));
    }

    #[test]
    fn validate_flags_unreachable_ratio_key_target() {
        // Ratio keys now get a reachability check: every dairy ingredient has positive water, so
        // AbsPAC (TotalPAC / Water) has a finite band an enormous target overshoots.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(RatioKey::AbsPAC.into(), 1.0e9)], &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnreachableTarget {
                key: BalanceKey::Ratio(RatioKey::AbsPAC),
                ..
            }
        )));
    }

    #[test]
    fn validate_flags_over_determination_as_information() {
        // Three movable targets with only three ingredients: the sum-to-one constraint leaves two
        // free dimensions, so the system is over-determined. Advisory only — never blocks.
        let comps = comps_from_names(DAIRY_ING);
        let targets = [
            (CompKey::MilkFat.into(), 16.0),
            (CompKey::MSNF.into(), 11.0),
            (CompKey::Lactose.into(), 5.0),
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.infos().any(|issue| matches!(
            issue,
            BalancingIssue::OverDetermined {
                target_count: 3,
                ingredient_count: 3,
            }
        )));
    }

    // --- BalancingIssue::affected_keys ---

    #[test]
    fn affected_keys_single_key_variants() {
        let key = BalanceKey::Comp(CompKey::MilkFat);
        assert_eq!(BalancingIssue::NegativeTarget { key, value: -1.0 }.affected_keys(), vec![key]);
        assert_eq!(BalancingIssue::UnaffectableTarget { key }.affected_keys(), vec![key]);
        assert_eq!(
            BalancingIssue::UnreachableTarget {
                key,
                target: 9.0,
                min: 0.0,
                max: 5.0
            }
            .affected_keys(),
            vec![key]
        );
        assert_eq!(BalancingIssue::PriorityWithoutTarget { key }.affected_keys(), vec![key]);
    }

    #[test]
    fn affected_keys_dominance_names_greater_then_lesser() {
        let lesser = BalanceKey::Comp(CompKey::Sucrose);
        let greater = BalanceKey::Comp(CompKey::TotalSugars);
        let issue = BalancingIssue::DominanceViolation {
            lesser: vec![lesser],
            greater,
            lesser_target_sum: 20.0,
            greater_target: 15.0,
        };
        // The single "greater" key comes first, then the "lesser" group.
        assert_eq!(issue.affected_keys(), vec![greater, lesser]);
    }

    #[test]
    fn affected_keys_grouped_dominance_names_greater_then_parts() {
        let greater = BalanceKey::Comp(CompKey::TotalSugars);
        let lesser = vec![BalanceKey::Comp(CompKey::Sucrose), BalanceKey::Comp(CompKey::Fructose)];
        let issue = BalancingIssue::DominanceViolation {
            lesser: lesser.clone(),
            greater,
            lesser_target_sum: 20.0,
            greater_target: 15.0,
        };
        assert_eq!(issue.affected_keys(), vec![greater, lesser[0], lesser[1]]);
    }

    #[test]
    fn affected_keys_ratio_infeasibility_names_denominator_then_numerator() {
        let denominator = BalanceKey::Comp(CompKey::CocoaSolids);
        let numerator = vec![BalanceKey::Comp(CompKey::CocoaButter)];
        let issue = BalancingIssue::RatioInfeasibility {
            numerator: numerator.clone(),
            denominator,
            target_ratio: 0.5,
            min_ratio: 0.2,
            max_ratio: 0.2,
        };
        assert_eq!(issue.affected_keys(), vec![denominator, numerator[0]]);
    }

    #[test]
    fn affected_keys_ratio_infeasibility_multi_key_numerator_lists_all_keys() {
        let denominator = BalanceKey::Comp(CompKey::TotalFats);
        let numerator = vec![
            BalanceKey::Comp(CompKey::MilkFat),
            BalanceKey::Comp(CompKey::CocoaButter),
        ];
        let issue = BalancingIssue::RatioInfeasibility {
            numerator: numerator.clone(),
            denominator,
            target_ratio: 0.9,
            min_ratio: 0.2,
            max_ratio: 0.8,
        };
        assert_eq!(issue.affected_keys(), vec![denominator, numerator[0], numerator[1]]);
    }

    #[test]
    fn affected_keys_over_determined_names_no_key() {
        let issue = BalancingIssue::OverDetermined {
            target_count: 4,
            ingredient_count: 3,
        };
        assert_eq!(issue.affected_keys(), Vec::<BalanceKey>::new());
    }

    // --- BalancingReport ---

    #[test]
    fn balancing_report_partitions_errors_and_warnings() {
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let targets = [
            (CompKey::Energy.into(), f64::NAN),  // error: non-finite target
            (CompKey::Sucrose.into(), 20.0),     // warning pair with TotalSugars
            (CompKey::TotalSugars.into(), 15.0), //
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_true!(report.has_errors());
        assert_false!(report.is_empty());
        assert_eq!(report.errors().count(), 1);

        // Sucrose is part of TotalSugars, so the infeasible pair surfaces as a structural warning.
        assert_true!(
            report
                .warnings()
                .any(|i| matches!(i, BalancingIssue::StructuralViolation { .. }))
        );
    }

    #[test]
    fn balancing_report_into_result_errors_on_error_severity() {
        let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MilkFat.into(), 12.0)];
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets, &[]);
        assert!(matches!(report.into_result(), Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balancing_report_into_result_ok_on_warnings_only() {
        // An unreachable target is only a warning, so into_result stays Ok.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), 50.0)], &[]);
        assert_true!(report.warnings().count() >= 1);
        assert!(report.into_result().is_ok());
    }

    // --- Internal check helpers ---

    #[test]
    fn is_unaffectable_detects_zero_row() {
        let comps = comps_from_names(DAIRY_ING);
        assert_true!(is_unaffectable(&comps, CompKey::Alcohol.into(), 5.0));
        assert_false!(is_unaffectable(&comps, CompKey::MilkFat.into(), 16.0));
    }

    #[test]
    fn is_unaffectable_for_ratio_key_detects_unaffectable_parts() {
        // No stabilizer source → StabilizersPerWater numerator unaffectable.
        let no_stabilizer = comps_from_names(DAIRY_SUGAR_ING);
        assert_true!(is_unaffectable(&no_stabilizer, RatioKey::StabilizersPerWater.into(), 0.5));

        // No fat source → EmulsifiersPerFat denominator unaffectable.
        let no_fat = comps_from_names(SORBET_ING);
        assert_true!(is_unaffectable(&no_fat, RatioKey::EmulsifiersPerFat.into(), 1.0));

        // Both parts affectable (stabilizer + water present) → not unaffectable.
        let stabilizer_and_water = comps_from_names(DAIRY_STABILIZER_ING);
        assert_false!(is_unaffectable(&stabilizer_and_water, RatioKey::StabilizersPerWater.into(), 0.5));
    }

    #[test]
    fn dominates_reflects_per_ingredient_inequality() {
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        // Every ingredient has Sucrose <= TotalSugars, so TotalSugars dominates Sucrose.
        assert_true!(dominates(&comps, CompKey::TotalSugars, CompKey::Sucrose));
        // The reverse does not hold (milk carries lactose but no sucrose).
        assert_false!(dominates(&comps, CompKey::Sucrose, CompKey::TotalSugars));
    }

    #[test]
    fn dominates_is_false_for_empty_palette() {
        assert_false!(dominates(&[], CompKey::TotalSugars, CompKey::Sucrose));
    }

    // --- Typical balancing keys ---

    #[test]
    fn typical_balancing_keys_recover_full_reference_composition() {
        // Balancing to only the typical key subset still recovers the full reference
        // composition, except the individual stabilizer-gum breakdown, which the typical
        // keys pin only in aggregate (StabilizersPerWater), not per gum.
        let ceiling = KeyCeiling::exact()
            .with(CompKey::LocustBeanGum.into(), 110.0)
            .with(CompKey::GuarGum.into(), 65.0)
            .with(CompKey::Carrageenans.into(), 44.0);

        for light_recipe in &*REF_LIGHT_RECIPES_FOR_TYPICAL_BALANCING_KEYS {
            let comps = comps_from_light_recipe(light_recipe);
            let typical_targets = get_targets_from_light_recipe(light_recipe, &get_typical_balancing_keys());
            // Deliberately unfiltered: a non-finite balanceable target means a recipe in this
            // list is no longer typical/well-conditioned, so fail loudly rather than skip it.
            let all_targets = get_targets_from_light_recipe(light_recipe, &get_all_balanceable_keys());

            assert_balance_compositions::<_, (BalanceKey, f64)>(
                &comps,
                &all_targets,
                |comps, _, _, _| balance_compositions_nnls(comps, &typical_targets, None, &[]),
                Epsilons::default(),
                &ceiling,
            );
        }
    }

    #[test]
    fn ratio_band_with_empty_denominator_is_the_value_range() {
        // An empty denominator gives the absolute magnitude band — the reachable value range.
        let comps = comps_from_names(DAIRY_ING);
        let (min, max) = ratio_band(&comps, &[CompKey::MilkFat], &[]).unwrap();
        let values: Vec<f64> = comps.iter().map(|comp| comp.get(CompKey::MilkFat)).collect();
        assert_eq!(min, values.iter().copied().fold(f64::INFINITY, f64::min));
        assert_eq!(max, values.iter().copied().fold(f64::NEG_INFINITY, f64::max));
    }

    #[test]
    fn ratio_band_pins_a_single_source_ratio() {
        // Only cocoa has CocoaSolids > 0, so CocoaButter : CocoaSolids is pinned to its 16.7 : 83.3
        let comps = comps_from_names(DAIRY_COCOA_ING);
        let (min, max) = ratio_band(&comps, &[CompKey::CocoaButter], &[CompKey::CocoaSolids]).unwrap();
        assert_true!((min - max).abs() < TESTS_EPSILON);
        assert_true!((min - 16.67 / 83.33).abs() < 1e-3);
    }

    #[test]
    fn ratio_band_is_unbounded_above_with_zero_denominator_source() {
        // Sucrose has TotalPAC with zero Water, so TotalPAC : Water is unbounded above.
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let (_, max) = ratio_band(&comps, &[CompKey::TotalPAC], &[CompKey::Water]).unwrap();
        assert_true!(max.is_infinite());
    }

    #[test]
    fn ratio_band_is_none_when_denominator_never_positive() {
        // No cocoa source → CocoaSolids is zero everywhere, so the ratio is undefined.
        let comps = comps_from_names(DAIRY_ING);
        assert!(ratio_band(&comps, &[CompKey::CocoaButter], &[CompKey::CocoaSolids]).is_none());
    }
}
