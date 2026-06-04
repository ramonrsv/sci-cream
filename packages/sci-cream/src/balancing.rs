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
//!
//! @todo This is a work in progress, and the API and implementation may change significantly in the
//! near future. For now, it's mostly intended for benchmarking and testing different approaches.

use nalgebra::{DMatrix, DVector, SVD};
use ndarray::{Array1, Array2};
use nnls::nnls;
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;

use crate::{
    composition::{CompKey, Composition},
    constants::balancing::{
        CRITICAL_PRIORITY_WEIGHT, HIGH_PRIORITY_WEIGHT, RATIO_DENOMINATOR_FLOOR, RATIO_REWEIGHT_TOLERANCE,
        RELATIVE_WEIGHT_FLOOR, SUM_CONSTRAINT_WEIGHT, SVD_SOLVE_EPSILON, TYPICAL_MIX_FAT, TYPICAL_MIX_WATER,
    },
    error::{Error, Result},
    validate::{is_subset, is_within_range},
};

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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Priority {
    /// Default priority; weight multiplier 1 (the unprioritized behavior).
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
            Self::Normal => 1.0,
            Self::High => HIGH_PRIORITY_WEIGHT,
            Self::Critical => CRITICAL_PRIORITY_WEIGHT,
        }
    }
}

/// A balancing solver function pointer, e.g. [`balance_compositions_nnls`].
type SolverFn =
    fn(&[Composition], &[(CompKey, f64)], Option<Weighting>, &[(CompKey, f64)]) -> Result<Vec<(Composition, f64)>>;

/// Balances the given compositions to match target values — the validated public entry point.
///
/// This is the recommended way to balance: it first validates the inputs via
/// [`validate_balancing_targets`], returning an [`Error::InvalidBalancingTargets`] if any
/// error-severity issue is present (non-finite target values, duplicate target keys, or duplicate
/// priority keys), then solves with an automatically chosen solver. `weighting` selects the row
/// weighting; `None` defaults to [`Weighting::Relative`].
///
/// `priorities` raises the relative importance of specific target keys: each listed key's row is
/// weighted by its [`Priority::weight`], so the solver fits it more closely at the expense of the
/// rest. Keys not listed default to [`Priority::Normal`] (weight 1), so an empty slice leaves the
/// solve unchanged. The abstract priorities are translated to numeric weights here before reaching
/// the solver.
///
/// The chosen solver is currently always [`balance_compositions_nnls`] (non-negative): negative
/// ingredient amounts are not meaningful for real recipes, so the [`balance_compositions_nalgebra`]
/// path is reserved for internal verification and benchmarking and is not used here.
///
/// Warning-severity issues (e.g. unreachable or illogical targets) do **not** prevent balancing;
/// call [`validate_balancing_targets`] directly to inspect them.
///
/// # Errors
///
/// Returns [`Error::InvalidBalancingTargets`] if the inputs contain an error-severity issue, or any
/// error forwarded from the chosen solver if the underlying solve fails.
pub fn balance_compositions(
    comps: &[Composition],
    targets: &[(CompKey, f64)],
    weighting: Option<Weighting>,
    priorities: &[(CompKey, Priority)],
) -> Result<Vec<(Composition, f64)>> {
    validate_balancing_targets(comps, targets, priorities).into_result()?;
    let priority_weights: Vec<(CompKey, f64)> = priorities
        .iter()
        .map(|&(key, priority)| (key, priority.weight()))
        .collect();
    choose_solver(comps, targets)(comps, targets, weighting, &priority_weights)
}

/// Selects the underlying solver for [`balance_compositions`].
///
/// Centralizes the choice of solver so it can evolve independently of callers. Currently always
/// returns [`balance_compositions_nnls`], the non-negative solver used in production.
const fn choose_solver(_comps: &[Composition], _targets: &[(CompKey, f64)]) -> SolverFn {
    balance_compositions_nnls
}

/// The severity of a [`BalancingIssue`]: whether it makes balancing unsound or merely suspect.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    /// The issue makes balancing unsound (e.g. it would panic or produce `NaN`); it is rejected.
    Error,
    /// The issue is suspicious, but balancing can still proceed on a best-effort basis.
    Warning,
}

/// A single problem detected in a set of balancing inputs by [`validate_balancing_targets`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum BalancingIssue {
    /// A target value is not finite (`NaN` or infinite), which would poison the solve.
    ///
    /// Severity: [`Severity::Error`].
    NonFiniteTarget {
        /// The key whose target value is not finite.
        key: CompKey,
        /// The offending non-finite value.
        value: f64,
    },
    /// The same key appears more than once in the targets, which is contradictory or ambiguous.
    ///
    /// Severity: [`Severity::Error`].
    DuplicateTarget {
        /// The key that appears more than once.
        key: CompKey,
    },
    /// The same key appears more than once in the priorities, which is contradictory or ambiguous —
    /// it is unclear which level applies (only the first would take effect; see [`Priority`]).
    ///
    /// Severity: [`Severity::Error`].
    DuplicatePriority {
        /// The priority key that appears more than once.
        key: CompKey,
    },
    /// No composition in the palette contributes to this key (its row is entirely zero), so no
    /// combination can move it away from zero.
    ///
    /// Severity: [`Severity::Warning`].
    UnaffectableTarget {
        /// The key that no composition affects.
        key: CompKey,
    },
    /// The target lies outside the `[min, max]` range achievable from the palette, so no normalized
    /// (non-negative, summing to one) combination can reach it.
    ///
    /// Severity: [`Severity::Warning`].
    UnreachableTarget {
        /// The key whose target is out of range.
        key: CompKey,
        /// The requested target value.
        target: f64,
        /// The smallest value any single composition has for this key.
        min: f64,
        /// The largest value any single composition has for this key.
        max: f64,
    },
    /// Two targets are infeasible together: every composition has `lesser <= greater` for these
    /// keys, yet `lesser`'s target exceeds `greater`'s, so no non-negative combination can satisfy
    /// both. Derived from the palette, with no hardcoded key relationships.
    ///
    /// Severity: [`Severity::Warning`].
    DominanceViolation {
        /// The key whose target is (infeasibly) the larger of the two.
        lesser: CompKey,
        /// The key that dominates `lesser` across every composition.
        greater: CompKey,
        /// The target requested for `lesser`.
        lesser_target: f64,
        /// The target requested for `greater`.
        greater_target: f64,
    },
    /// Several targets are infeasible together: their compositions sum to no more than a
    /// "whole" key's composition in every ingredient, yet their targets sum above the whole's
    /// target, so no non-negative combination can satisfy them all. The additive (subset-sum)
    /// generalization of [`DominanceViolation`](Self::DominanceViolation) — which is the
    /// single-part case. Palette-derived, with no hardcoded key relationships.
    ///
    /// Severity: [`Severity::Warning`].
    AdditiveDominanceViolation {
        /// The "whole" key whose target the parts collectively exceed.
        whole: CompKey,
        /// The "part" keys whose compositions sum under `whole` in every composition (always >= 2).
        parts: Vec<CompKey>,
        /// The sum of the parts' targets (infeasibly greater than `whole_target`).
        parts_target_sum: f64,
        /// The target requested for `whole`.
        whole_target: f64,
    },
    /// A priority was set for a key that is not among the targets, so it has no effect — the solver
    /// only weights target rows. Likely a mistake: a forgotten target or a mistyped key.
    ///
    /// Severity: [`Severity::Warning`].
    PriorityWithoutTarget {
        /// The priority key that has no corresponding target.
        key: CompKey,
    },
}

impl BalancingIssue {
    /// The [`Severity`] of this issue: [`Severity::Error`] for issues that make balancing unsound,
    /// [`Severity::Warning`] otherwise, for issues that are suspicious but balancing can proceed.
    #[must_use]
    pub const fn severity(&self) -> Severity {
        match self {
            Self::NonFiniteTarget { .. } | Self::DuplicateTarget { .. } | Self::DuplicatePriority { .. } => {
                Severity::Error
            }
            Self::UnaffectableTarget { .. }
            | Self::UnreachableTarget { .. }
            | Self::DominanceViolation { .. }
            | Self::AdditiveDominanceViolation { .. }
            | Self::PriorityWithoutTarget { .. } => Severity::Warning,
        }
    }
}

/// The result of validating balancing inputs: the full list of detected [`BalancingIssue`]s.
///
/// Use [`errors`](Self::errors) / [`warnings`](Self::warnings) to partition by [`Severity`], or
/// [`into_result`](Self::into_result) to turn any error-severity issues into an [`Error`].
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BalancingReport {
    /// Every issue detected, in the order the checks were run; may mix errors and warnings.
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
/// - **Error** — non-finite target values, duplicate target keys, and duplicate priority keys.
/// - **Warning** — targets no composition affects, targets outside the palette's reachable range,
///   infeasible target pairs (dominance check), infeasible part/whole groups (additive check), and
///   priorities whose key has no target.
///
/// The range and dominance warnings assume the non-negative, normalized (summing to one) solution
/// that [`balance_compositions`] targets. `priorities` is the same list [`balance_compositions`]
/// accepts; only its keys are checked here (against duplicates and missing targets), not its levels.
#[must_use]
pub fn validate_balancing_targets(
    comps: &[Composition],
    targets: &[(CompKey, f64)],
    priorities: &[(CompKey, Priority)],
) -> BalancingReport {
    let mut issues = Vec::new();

    // Error-severity checks: non-finite values and duplicate keys. Ratio keys are accepted —
    // they are encoded as homogeneous rows (see `ratio_key_parts`) and balance like any other key.
    let mut seen: Vec<CompKey> = Vec::with_capacity(targets.len());
    for &(key, value) in targets {
        if !value.is_finite() {
            issues.push(BalancingIssue::NonFiniteTarget { key, value });
        }
        if seen.contains(&key) {
            issues.push(BalancingIssue::DuplicateTarget { key });
        } else {
            seen.push(key);
        }
    }

    // Per-target warning checks: unaffectable and unreachable targets. Non-finite values are
    // skipped (reported as errors above). Ratio keys get the unaffectable check but skip the range
    // check, having no single-key magnitude to compare against the palette.
    for &(key, target) in targets {
        if !target.is_finite() {
            continue;
        }
        if is_unaffectable(comps, key, target) {
            issues.push(BalancingIssue::UnaffectableTarget { key });
            continue; // range checks add only noise for an all-zero row
        }
        if is_ratio_key(key) {
            continue;
        }
        if let Some((min, max)) = reachable_range(comps, key)
            && !is_within_range(target, min, max)
        {
            issues.push(BalancingIssue::UnreachableTarget { key, target, min, max });
        }
    }

    // Pairwise warning checks: palette-derived dominance infeasibilities.
    append_pairwise_issues(comps, targets, &mut issues);

    // Additive (subset-sum) dominance: parts that together exceed a whole that bounds their sum.
    append_additive_dominance_issues(comps, targets, &mut issues);

    // Priority-list checks: duplicate priority keys (error, ambiguous) and priorities whose key is
    // not among the targets (warning — a no-op, since only target rows are weighted).
    let mut seen_priorities: Vec<CompKey> = Vec::with_capacity(priorities.len());
    for &(key, _) in priorities {
        if seen_priorities.contains(&key) {
            issues.push(BalancingIssue::DuplicatePriority { key });
            continue; // its target was already checked on the first sighting
        }
        seen_priorities.push(key);
        if !targets.iter().any(|&(target_key, _)| target_key == key) {
            issues.push(BalancingIssue::PriorityWithoutTarget { key });
        }
    }

    BalancingReport { issues }
}

/// Returns `true` if no composition can move `key`/`target` toward a meaningful value.
///
/// The shared predicate for "no ingredient can affect this target": [`constrainable_targets`] uses
/// it to drop such targets before solving, and [`validate_balancing_targets`] to flag as warnings.
///
/// For an extensive key this means every composition reads exactly zero for it. A ratio key is also
/// unaffectable when either of its parts is (see [`ratio_key_parts`]) — a zero denominator leaves
/// the ratio undefined, a zero numerator pins it to zero — or when its homogeneous row vanishes
/// across the palette (already exactly on-ratio).
fn is_unaffectable(comps: &[Composition], key: CompKey, target: f64) -> bool {
    if let Some((numerator, denominator)) = ratio_key_parts(key) {
        return is_key_unaffectable(comps, numerator)
            || is_key_unaffectable(comps, denominator)
            || comps.iter().all(|comp| target_row_coeff(key, target, comp) == 0.0);
    }
    is_key_unaffectable(comps, key)
}

/// Returns `true` if every composition reads exactly zero for the extensive `key`.
fn is_key_unaffectable(comps: &[Composition], key: CompKey) -> bool {
    comps.iter().all(|comp| comp.get(key) == 0.0)
}

/// The `[min, max]` range of per-composition values for `key`, or `None` if `comps` is empty.
///
/// Any normalized (non-negative, summing to one) combination of the compositions yields a value for
/// `key` within this range, so a target outside it is unreachable.
fn reachable_range(comps: &[Composition], key: CompKey) -> Option<(f64, f64)> {
    let mut values = comps.iter().map(|comp| comp.get(key));
    let first = values.next()?;
    Some(values.fold((first, first), |(min, max), value| (min.min(value), max.max(value))))
}

/// Returns `true` if `greater` dominates `lesser` across `comps`: every composition has
/// `lesser <= greater` for these keys (epsilon-aware). Vacuously false for an empty palette.
fn dominates(comps: &[Composition], greater: CompKey, lesser: CompKey) -> bool {
    !comps.is_empty() && comps.iter().all(|comp| is_subset(comp.get(lesser), comp.get(greater)))
}

/// Returns `true` if `key`/`target` is a meaningful target to compare against others in the
/// dominance checks: not a ratio key, finite, and affected by at least one composition. Ratio keys
/// are skipped because their homogeneous row mixes two keys and has no single-key magnitude to
/// compare; other failing targets are reported by their own error/warning checks.
fn is_checkable_target(comps: &[Composition], key: CompKey, target: f64) -> bool {
    !is_ratio_key(key) && target.is_finite() && !is_unaffectable(comps, key, target)
}

/// Appends the pairwise dominance infeasibility warnings for `targets`.
///
/// Ignores non-[`is_checkable_target`]s - those have their own checks and would add noise here.
fn append_pairwise_issues(comps: &[Composition], targets: &[(CompKey, f64)], issues: &mut Vec<BalancingIssue>) {
    for (index, &(key_a, target_a)) in targets.iter().enumerate() {
        if !is_checkable_target(comps, key_a, target_a) {
            continue;
        }
        for &(key_b, target_b) in &targets[index + 1..] {
            if !is_checkable_target(comps, key_b, target_b) {
                continue;
            }

            // Palette-derived dominance check: if one key dominates the other across all comps but
            // carries the smaller target, no non-negative mix can satisfy both.
            if dominates(comps, key_b, key_a) && !is_subset(target_a, target_b) {
                issues.push(BalancingIssue::DominanceViolation {
                    lesser: key_a,
                    greater: key_b,
                    lesser_target: target_a,
                    greater_target: target_b,
                });
            } else if dominates(comps, key_a, key_b) && !is_subset(target_b, target_a) {
                issues.push(BalancingIssue::DominanceViolation {
                    lesser: key_b,
                    greater: key_a,
                    lesser_target: target_b,
                    greater_target: target_a,
                });
            }
        }
    }
}

/// Appends additive (subset-sum) dominance warnings: cases where several "part" targets together
/// exceed a "whole" target whose composition bounds their sum in every composition.
///
/// For each candidate `whole` target, greedily accumulates the other checkable targets whose
/// running per-composition sum stays `<= whole`'s composition across all compositions
/// (epsilon-aware). If two or more parts accumulate and their targets sum above `whole`'s target,
/// the combination is infeasible for a non-negative normalized mix.
///
/// Single-part cases are left to [`append_pairwise_issues`]; this only flags `parts.len() >= 2`.
/// The accumulation is greedy — sound (never false-positive) but not exhaustive, so it may miss
/// some violating subsets, which is acceptable for a best-effort warning.
fn append_additive_dominance_issues(
    comps: &[Composition],
    targets: &[(CompKey, f64)],
    issues: &mut Vec<BalancingIssue>,
) {
    for &(whole, whole_target) in targets {
        if !is_checkable_target(comps, whole, whole_target) {
            continue;
        }

        // Greedily accumulate parts whose running per-composition sum stays under `whole`'s.
        let mut running = vec![0.0_f64; comps.len()];
        let mut parts = Vec::new();
        let mut parts_target_sum = 0.0;

        for &(part, part_target) in targets {
            if part == whole || !is_checkable_target(comps, part, part_target) {
                continue;
            }

            let fits = comps
                .iter()
                .zip(&running)
                .all(|(comp, &acc)| is_subset(acc + comp.get(part), comp.get(whole)));

            if fits {
                for (comp, acc) in comps.iter().zip(&mut running) {
                    *acc += comp.get(part);
                }
                parts.push(part);
                parts_target_sum += part_target;
            }
        }

        if parts.len() >= 2 && !is_subset(parts_target_sum, whole_target) {
            issues.push(BalancingIssue::AdditiveDominanceViolation {
                whole,
                parts,
                parts_target_sum,
                whole_target,
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
    targets: &[(CompKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(CompKey, f64)],
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
    targets: &[(CompKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(CompKey, f64)],
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
/// # Errors
///
/// Forwards any error from `solve`.
pub fn balance_with_reweighting(
    comps: &[Composition],
    targets: &[(CompKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(CompKey, f64)],
    solve: RawSolver,
) -> Result<Vec<(Composition, f64)>> {
    let weighting = weighting.unwrap_or(Weighting::Relative);
    let targets = constrainable_targets(comps, targets);

    // Seed denominator estimates for the ratio targets, from the targets alone.
    let mut ratio_denominators: Vec<(CompKey, f64)> = targets
        .iter()
        .filter_map(|&(key, _)| estimate_ratio_denominator(key, &targets).map(|denominator| (key, denominator)))
        .collect();

    let rows = targets.len() + 1;
    let cols = comps.len();

    let solve_once = |ratio_denominators: &[(CompKey, f64)]| -> Result<Vec<f64>> {
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
            if let Some((_, den)) = ratio_key_parts(*key) {
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
fn constrainable_targets(comps: &[Composition], targets: &[(CompKey, f64)]) -> Vec<(CompKey, f64)> {
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
pub fn estimate_ratio_denominator(key: CompKey, targets: &[(CompKey, f64)]) -> Option<f64> {
    let (_, den) = ratio_key_parts(key)?;
    let target_value = |wanted: CompKey| targets.iter().find(|&&(k, _)| k == wanted).map(|&(_, v)| v);

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
        other => unreachable!("unsupported ratio denominator key {other:?} (see ratio_key_parts)"),
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
    targets: &[(CompKey, f64)],
    weighting: Weighting,
    priority_weights: &[(CompKey, f64)],
    ratio_denominators: &[(CompKey, f64)],
) -> Vec<f64> {
    let priority_for = |key: CompKey| {
        priority_weights
            .iter()
            .find(|&&(other, _)| other == key)
            .map_or(1.0, |&(_, weight)| weight)
    };
    let denominator_for = |key: CompKey| ratio_denominators.iter().find(|&&(k, _)| k == key).map(|&(_, d)| d);

    let relative_weight = |key: CompKey, target: f64| {
        let target = target.abs().max(RELATIVE_WEIGHT_FLOOR);

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
fn make_matrix_a(comps: &[Composition], targets: &[(CompKey, f64)], weights: &[f64]) -> Vec<f64> {
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
fn make_vector_y(targets: &[(CompKey, f64)], weights: &[f64]) -> Vec<f64> {
    targets
        .iter()
        .zip(weights)
        .map(|(&(key, target), &weight)| target_row_rhs(key, target) * weight)
        .chain(std::iter::once(weights[targets.len()]))
        .collect::<Vec<_>>()
}

/// Maps a ratio key to its `(numerator, denominator)` extensive [`CompKey`] parts, or `None` if
/// `key` is not a ratio key.
///
/// A ratio key is `numerator / denominator * 100`; balancing encodes a ratio target `R` as the
/// homogeneous row `numerator - (R / 100) * denominator = 0`, which never divides (so never `NaN`s
/// on a zero denominator). The single source of truth for which keys are ratio keys —
/// [`is_ratio_key`] is defined in terms of it.
#[must_use]
pub const fn ratio_key_parts(key: CompKey) -> Option<(CompKey, CompKey)> {
    match key {
        CompKey::AbsPAC => Some((CompKey::TotalPAC, CompKey::Water)),
        CompKey::StabilizersPerWater => Some((CompKey::TotalStabilizers, CompKey::Water)),
        CompKey::EmulsifiersPerFat => Some((CompKey::TotalEmulsifiers, CompKey::TotalFats)),
        _ => None,
    }
}

/// Returns true if the given [`CompKey`] is a ratio key, e.g. [`CompKey::AbsPAC`], etc.
///
/// A ratio key is one that is a ratio of two extensive keys (see [`ratio_key_parts`]); as a
/// balancing target it is encoded as a homogeneous row rather than a direct weighted-sum row.
#[must_use]
pub const fn is_ratio_key(key: CompKey) -> bool {
    ratio_key_parts(key).is_some()
}

/// The per-composition least-squares coefficient for one balancing target.
///
/// For an extensive key the coefficient is simply `comp.get(key)`. For a ratio key `R`, it is the
/// homogeneous `comp.get(num) - (R / 100) * comp.get(den)` (see [`ratio_key_parts`]), which is
/// always finite — the solver never evaluates the `NaN`-prone per-ingredient ratio.
fn target_row_coeff(key: CompKey, target: f64, comp: &Composition) -> f64 {
    match ratio_key_parts(key) {
        Some((num, den)) => comp.get(num) - (target / 100.0) * comp.get(den),
        None => comp.get(key),
    }
}

/// The right-hand side for one target row: `0` for a ratio key (its row is homogeneous), else the
/// target value itself.
const fn target_row_rhs(key: CompKey, target: f64) -> f64 {
    if is_ratio_key(key) { 0.0 } else { target }
}

/// The achieved value for `key` from a balanced result, summed without the renormalization that
/// [`Composition::from_combination`] applies (trusting the raw fractions, keeping any negative
/// amounts a non-negativity-free solver may return).
///
/// Ratio-aware: a ratio key yields its achieved ratio (a percentage) from its numerator and
/// denominator parts (see [`ratio_key_parts`]) — those parts being extensive keys, they resolve
/// via the base case below. An extensive key yields the plain weighted sum.
fn achieved_value(balanced: &[(Composition, f64)], key: CompKey) -> f64 {
    if let Some((num, den)) = ratio_key_parts(key) {
        return achieved_value(balanced, num) / achieved_value(balanced, den) * 100.0;
    }
    balanced.iter().map(|(comp, amount)| *amount * comp.get(key)).sum()
}

/// The [`CompKey`]s that can be used as balancing targets — every key.
///
/// Ratio keys are balanceable too: a ratio target `R` is encoded as the homogeneous row
/// `numerator - (R / 100) * denominator = 0` (see [`ratio_key_parts`]), so it never divides and
/// never poisons the solve with `f64::NAN`. Extensive keys contribute their usual weighted-sum row.
#[must_use]
pub fn get_balanceable_comp_keys() -> Vec<CompKey> {
    CompKey::iter().collect()
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp, clippy::unwrap_used)]
mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::*;
    use crate::tests::util::{KeyCeiling, root_mean_square};

    use super::*;
    use crate::{
        database::IngredientDatabase,
        recipe::{OwnedLightRecipe, Recipe},
        resolution::IngredientGetter,
    };

    /// A labelled balancing function, so several solvers can be run side-by-side in one report.
    type LabeledSolver = (&'static str, SolverFn);

    /// Both solvers, paired for side-by-side quality reports.
    const BOTH_SOLVERS: &[LabeledSolver] = &[
        ("nalgebra", balance_compositions_nalgebra),
        ("nnls", balance_compositions_nnls),
    ];

    /// Denominator floor for relative-error reporting, so zero / near-zero targets stay finite.
    const BALANCE_REL_FLOOR: f64 = 0.1;

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

    /// Helper function to extract compositions from a list of ingredient names, via [`DATABASE`]
    fn comps_from_names(names: &[&str]) -> Vec<Composition> {
        names.iter().map(|name| comp_by_name(name)).collect()
    }

    /// Helper function to extract target pairs from a Composition for specified keys
    fn get_targets_from_composition(composition: &Composition, keys: &[CompKey]) -> Vec<(CompKey, f64)> {
        keys.iter().map(|key| (*key, composition.get(*key))).collect()
    }

    /// Helper function to extract target pairs from a light recipe's calculated composition
    fn get_targets_from_light_recipe(light_recipe: &OwnedLightRecipe, keys: &[CompKey]) -> Vec<(CompKey, f64)> {
        get_targets_from_composition(
            &Recipe::from_light_recipe(None, light_recipe, &DATABASE)
                .unwrap()
                .calculate_composition()
                .unwrap(),
            keys,
        )
    }

    /// Helper function to filter a list of CompKey-value pairs to only include specified keys
    #[expect(unused)]
    fn filter_targets_for_keys(targets: &[(CompKey, f64)], keys: &[CompKey]) -> Vec<(CompKey, f64)> {
        targets.iter().filter(|(key, _)| keys.contains(key)).copied().collect()
    }

    /// Relative error of an achieved value against its target, in percentage points.
    ///
    /// `|achieved − target| / max(|target|, FLOOR) × 100`, where `FLOOR` is
    /// [`BALANCE_REL_FLOOR`]. The floor keeps a zero target (e.g. a recipe with no cocoa or
    /// stabilizer) from producing a non-finite result.
    fn balance_rel_error_pp(achieved: f64, target: f64) -> f64 {
        (achieved - target).abs() / target.abs().max(BALANCE_REL_FLOOR) * 100.0
    }

    /// The largest [`balance_rel_error_pp`] across all `targets` — the worst-case relative miss, a
    /// single summary of how well a balanced result hits its targets.
    fn max_rel_error(balanced: &[(Composition, f64)], targets: &[(CompKey, f64)]) -> f64 {
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
        targets: &[(CompKey, f64)],
        solve: F,
        epsilons: Epsilons,
        ceiling: &KeyCeiling,
    ) where
        F: Fn(&[Composition], &[(CompKey, f64)], Option<Weighting>, &[P]) -> Result<Vec<(Composition, f64)>>,
    {
        // `P` is the solver's priority element type; the assertions always use the default (no
        // priorities), so an empty slice serves both `&[(CompKey, f64)]` and `&[(CompKey, Priority)]`.
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

    /// Builds a deterministic, human-readable balance-quality report for `insta` snapshots.
    ///
    /// Runs every solver in `solvers` against the same `comps` / `targets` and, per solver, lists
    /// each target's `target`, achieved value, and [`balance_rel_error_pp`], followed by a summary
    /// line (amount sum, negative-amount count, max and RMS relative error). A solver that errors
    /// renders a stable `FAILED` line instead of panicking, so infeasible systems still snapshot.
    fn report_balance_quality(
        comps: &[Composition],
        targets: &[(CompKey, f64)],
        solvers: &[LabeledSolver],
        names: Option<&[&str]>,
    ) -> String {
        let key_str = |key| format!("{key:?}");

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
            .map(|(key, value)| format!("  {:<18}{value:>7.2}", key_str(key)))
            .collect::<Vec<_>>()
            .join("\n");
        lines.append(&mut vec![format!("targets:\n{header}")]);

        for (label, solve) in solvers {
            lines.push(String::new());

            let balanced = match solve(comps, targets, None, &[]) {
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
                lines.push(format!("  {:<18}{target:>7.2}   {achieved:>7.2}   {error:>7.2} pp", key_str(key)));
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

    // --- Compositions, ingredients, recipes ---

    /// Reference recipes' mix compositions are used as balancing targets to check that the
    /// balancing function can at least recover the original recipe, a basic sanity check.
    static REF_LIGHT_RECIPES: LazyLock<Vec<OwnedLightRecipe>> = LazyLock::new(|| {
        vec![
            MAIN_RECIPE_LIGHT.clone(),
            REF_A_RECIPE_LIGHT.clone(),
            REF_B_RECIPE_LIGHT.clone(),
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

    // --- Exact balancing targets ---

    /// Trivial dairy targets that the dairy compositions can match exactly, used for sanity checks.
    static DAIRY_TRIVIAL_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| vec![(CompKey::MilkFat, 16.0), (CompKey::MSNF, 11.0)]);

    /// Dairy targets including a zero-valued [`CompKey::TotalStabilizers`] target, exercising the
    /// relative-error floor path (i.e. that the result is finite, and no division by zero).
    static DAIRY_ZERO_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::MilkFat, 16.0),
            (CompKey::MSNF, 11.0),
            (CompKey::TotalStabilizers, 0.0),
        ]
    });

    /// Feasible targets for the [`SUGAR_BLEND_ING`] palette: the composition of a real blend
    /// (Water 68 / Sucrose 14 / Dextrose 10 / Fructose 8), so the solver can recover them exactly
    /// while hitting a sweetness ([`CompKey::POD`]) and hardness ([`CompKey::TotalPAC`]) target at
    /// once. These targets genuinely require all three sugars — any two-sugar subset misses by
    /// >10 pp (see [`balance_multi_sugar_needs_all_three_sugars`]).
    static SUGAR_BLEND_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSolids, 31.2),
            (CompKey::POD, 35.2),
            (CompKey::TotalPAC, 46.68),
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
    static DAIRY_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::Energy, 200.0),
            (CompKey::MilkFat, 12.0),
            (CompKey::MSNF, 8.0),
            (CompKey::POD, 0.5),
        ]
    });

    /// "Light premium" paradox: a rich [`CompKey::MilkFat`] target against a capped
    /// [`CompKey::Energy`] target — physically opposed, since milk fat is ~9 kcal/g, so 16% fat
    /// alone already exceeds the 150 kcal/100g [`CompKey::Energy`] target.
    static LIGHT_PREMIUM_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::Energy, 150.0),
            (CompKey::MilkFat, 16.0),
            (CompKey::MSNF, 11.0),
            (CompKey::TotalSugars, 18.0),
        ]
    });

    /// Chocolate intensity vs. lean: high [`CompKey::CocoaSolids`] and low [`CompKey::CocoaButter`]
    /// targets, which the single cocoa source cannot satisfy independently (the two are coupled by
    /// its fixed solids:butter ratio).
    static CHOCOLATE_COUPLED_COCOA_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::CocoaSolids, 6.0),
            (CompKey::CocoaButter, 1.0),
            (CompKey::TotalSugars, 20.0),
        ]
    });

    /// High-MSNF "sandiness" limit: a high [`CompKey::MSNF`] target (for body) against a
    /// [`CompKey::Lactose`] target capped low to avoid lactose crystallization — opposed, because
    /// dairy ties lactose to MSNF at a roughly fixed ratio (~0.5). With only the three dairy comps
    /// the capped lactose cannot be held while MSNF is pushed high, so the system is infeasible.
    static DAIRY_HIGH_MSNF_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| vec![(CompKey::MSNF, 16.0), (CompKey::Lactose, 5.0), (CompKey::MilkFat, 10.0)]);

    /// Sorbet sweetness vs. hardness: a restrained [`CompKey::POD`] (not too sweet) against a high
    /// [`CompKey::TotalPAC`] (soft, scoopable) target — opposed, since both rise with sugar. Spans
    /// the large solids/sugar/PAC targets down to a trace [`CompKey::TotalStabilizers`].
    static SORBET_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSolids, 32.0),
            (CompKey::TotalSugars, 26.0),
            (CompKey::TotalPAC, 32.0),
            (CompKey::POD, 14.0),
            (CompKey::TotalStabilizers, 0.40),
        ]
    });

    /// Booze base: a modest [`CompKey::ABV`] target plus a separate [`CompKey::TotalPAC`] target,
    /// which the liqueur's outsized per-gram PAC contribution over-constrains.
    static BOOZY_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSugars, 17.0),
            (CompKey::TotalPAC, 28.0),
            (CompKey::ABV, 4.0),
        ]
    });

    // --- Balancing tests ---

    /// All balanceable targets of a reference recipe, dropping any whose value is non-finite. A
    /// ratio key (e.g. [`CompKey::EmulsifiersPerFat`]) is `NaN` when the recipe's denominator is
    /// zero (e.g. a fat-free sorbet has no [`CompKey::TotalFats`]), and such an undefined target
    /// cannot be recovered; every finite key, ratio keys included, is kept.
    fn finite_balanceable_targets(light_recipe: &OwnedLightRecipe) -> Vec<(CompKey, f64)> {
        get_targets_from_light_recipe(light_recipe, &get_balanceable_comp_keys())
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

    /// The companion to [`balance_multi_sugar_pod_and_pac`]: the same targets cannot be hit without
    /// all three sugars. Dropping *any* one of them leaves an over-determined system whose best fit
    /// misses by over 10 pp, confirming each of the three sugars is individually load-bearing.
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
    fn is_ratio_key_identifies_ratio_keys() {
        assert_true!(is_ratio_key(CompKey::AbsPAC));
        assert_true!(is_ratio_key(CompKey::StabilizersPerWater));
        assert_true!(is_ratio_key(CompKey::EmulsifiersPerFat));
    }

    #[test]
    fn is_ratio_key_rejects_extensive_keys() {
        assert_false!(is_ratio_key(CompKey::MilkFat));
        assert_false!(is_ratio_key(CompKey::Energy));
        assert_false!(is_ratio_key(CompKey::TotalPAC));
        assert_false!(is_ratio_key(CompKey::Water));
    }

    #[test]
    fn ratio_key_parts_maps_each_ratio_key_to_its_extensive_parts() {
        assert_eq!(ratio_key_parts(CompKey::AbsPAC), Some((CompKey::TotalPAC, CompKey::Water)));
        assert_eq!(ratio_key_parts(CompKey::StabilizersPerWater), Some((CompKey::TotalStabilizers, CompKey::Water)));
        assert_eq!(ratio_key_parts(CompKey::EmulsifiersPerFat), Some((CompKey::TotalEmulsifiers, CompKey::TotalFats)));
        assert_eq!(ratio_key_parts(CompKey::MilkFat), None);
    }

    #[test]
    fn target_row_coeff_and_rhs_encode_ratio_as_homogeneous_row() {
        let milk = comp_by_name("3.25% Milk"); // has both Water and TotalPAC

        // Common case: a ratio key with non-zero numerator and denominator yields the homogeneous
        // combination `num - (R/100)*den` — a finite, non-zero coefficient.
        let r = 9.0;
        let abs_pac_coeff = target_row_coeff(CompKey::AbsPAC, r, &milk);
        assert_true!(abs_pac_coeff.is_finite() && abs_pac_coeff != 0.0);
        assert_eq!(abs_pac_coeff, milk.get(CompKey::TotalPAC) - (r / 100.0) * milk.get(CompKey::Water));
        assert_eq!(target_row_rhs(CompKey::AbsPAC, r), 0.0);

        // Degenerate case: a zero denominator (Sucrose has no water) stays finite — no division.
        let sucrose = comp_by_name("Sucrose");
        let stab_coeff = target_row_coeff(CompKey::StabilizersPerWater, 0.5, &sucrose);
        assert_true!(stab_coeff.is_finite());
        assert_eq!(stab_coeff, 0.0); // zero stabilizers and zero water → zero homogeneous coefficient
        assert_eq!(target_row_rhs(CompKey::StabilizersPerWater, 0.5), 0.0);

        // Extensive key: coefficient is comp.get(key), RHS is the target itself.
        assert_eq!(target_row_coeff(CompKey::MilkFat, 16.0, &milk), milk.get(CompKey::MilkFat));
        assert_eq!(target_row_rhs(CompKey::MilkFat, 16.0), 16.0);
    }

    #[test]
    fn get_balanceable_comp_keys_includes_ratio_keys() {
        let balanceable = get_balanceable_comp_keys();
        assert_eq!(balanceable.len(), CompKey::iter().count());
        assert_true!(balanceable.contains(&CompKey::AbsPAC));
        assert_true!(balanceable.contains(&CompKey::StabilizersPerWater));
        assert_true!(balanceable.contains(&CompKey::EmulsifiersPerFat));
    }

    #[test]
    fn ratio_key_zero_denominator_ingredient_stays_finite() {
        let comps = comps_from_names(STABILIZER_AND_SUCROSE_ING);
        let target = achieved_value(&equal_parts_reference(&comps), CompKey::StabilizersPerWater);

        let balanced = balance_compositions_nnls(&comps, &[(CompKey::StabilizersPerWater, target)], None, &[]).unwrap();

        assert_true!(balanced.iter().all(|(_, amount)| amount.is_finite()));
        assert_true!(achieved_value(&balanced, CompKey::StabilizersPerWater).is_finite());
    }

    #[test]
    fn ratio_key_target_nalgebra_does_not_panic() {
        let comps = comps_from_names(STABILIZER_AND_SUCROSE_ING);
        let target = achieved_value(&equal_parts_reference(&comps), CompKey::StabilizersPerWater);

        let balanced =
            balance_compositions_nalgebra(&comps, &[(CompKey::StabilizersPerWater, target)], None, &[]).unwrap();
        assert_true!(achieved_value(&balanced, CompKey::StabilizersPerWater).is_finite());
    }

    #[test]
    fn balance_recovers_stabilizers_per_water_ratio() {
        let comps = comps_from_names(DAIRY_STABILIZER_ING);
        let target = achieved_value(&equal_parts_reference(&comps), CompKey::StabilizersPerWater);

        let balanced = balance_compositions_nnls(&comps, &[(CompKey::StabilizersPerWater, target)], None, &[]).unwrap();
        assert_eq_flt_test!(achieved_value(&balanced, CompKey::StabilizersPerWater), target);
    }

    #[test]
    fn balance_recovers_abs_pac_ratio() {
        let comps = comps_from_names(SORBET_ING);
        let target = achieved_value(&equal_parts_reference(&comps), CompKey::AbsPAC);

        let balanced = balance_compositions_nnls(&comps, &[(CompKey::AbsPAC, target)], None, &[]).unwrap();
        assert_eq_flt_test!(achieved_value(&balanced, CompKey::AbsPAC), target);
    }

    #[test]
    fn balance_recovers_emulsifiers_per_fat_ratio() {
        let comps = comps_from_names(&["3.25% Milk", "40% Cream", "Soy Lecithin"]);
        let target = achieved_value(&equal_parts_reference(&comps), CompKey::EmulsifiersPerFat);

        let balanced = balance_compositions_nnls(&comps, &[(CompKey::EmulsifiersPerFat, target)], None, &[]).unwrap();
        assert_eq_flt_test!(achieved_value(&balanced, CompKey::EmulsifiersPerFat), target);
    }

    #[test]
    fn balance_ratio_target_with_extensive_target() {
        let comps = comps_from_names(DAIRY_STABILIZER_ING);
        let reference = equal_parts_reference(&comps);
        let milk_fat = achieved_value(&reference, CompKey::MilkFat);
        let ratio = achieved_value(&reference, CompKey::StabilizersPerWater);
        let targets = [(CompKey::MilkFat, milk_fat), (CompKey::StabilizersPerWater, ratio)];

        let balanced = balance_compositions_nnls(&comps, &targets, None, &[]).unwrap();

        assert_eq_flt_test!(achieved_value(&balanced, CompKey::MilkFat), milk_fat);
        assert_eq_flt_test!(achieved_value(&balanced, CompKey::StabilizersPerWater), ratio);
    }

    // --- Solver behavior and edge cases ---

    /// nalgebra's plain least squares can return negative amounts on an over-constrained system,
    /// whereas nnls clamps them to be non-negative — the documented difference between the two.
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
        let targets = [(CompKey::MilkFat, 10.0)]; // 1 target

        let solvers: [SolverFn; 2] = [balance_compositions_nalgebra, balance_compositions_nnls];
        for solve in solvers {
            assert_balance_compositions(&comps, &targets, solve, Epsilons::default(), &KeyCeiling::exact());
        }
    }

    /// On an over-determined system, relative weighting beats absolute weighting: the worst relative
    /// miss is smaller, because a large target (Energy) no longer crowds out small ones (POD). This
    /// is the core improvement, and also exercises [`Weighting::Absolute`] for the comparison.
    #[test]
    fn relative_weighting_beats_absolute_on_disparate_targets() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(CompKey, f64)] = &DAIRY_DISPARATE_TARGETS;

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
        let result = balance_compositions(&comps, &[(CompKey::StabilizersPerWater, 0.5)], None, &[]);
        assert!(result.is_ok());
    }

    #[test]
    fn balance_compositions_rejects_duplicate_target() {
        let comps = comps_from_names(DAIRY_ING);
        let result = balance_compositions(&comps, &[(CompKey::MilkFat, 16.0), (CompKey::MilkFat, 12.0)], None, &[]);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_compositions_rejects_non_finite_target() {
        let comps = comps_from_names(DAIRY_ING);
        let result = balance_compositions(&comps, &[(CompKey::MilkFat, f64::NAN)], None, &[]);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
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
        let targets = [(CompKey::Sucrose, 20.0), (CompKey::TotalSugars, 15.0)];
        assert!(balance_compositions(&comps, &targets, None, &[]).is_ok());
    }

    // --- Priority ---

    #[test]
    fn priority_weights_increase_with_level() {
        assert_eq!(Priority::default(), Priority::Normal);
        assert_eq!(Priority::Normal.weight(), 1.0);
        assert_gt!(Priority::High.weight(), Priority::Normal.weight());
        assert_gt!(Priority::Critical.weight(), Priority::High.weight());
    }

    #[test]
    fn empty_priorities_match_explicit_normal() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(CompKey, f64)] = &DAIRY_DISPARATE_TARGETS;

        let empty = balance_compositions(&comps, targets, None, &[]).unwrap();
        let all_normal = balance_compositions(
            &comps,
            targets,
            None,
            &[
                (CompKey::Energy, Priority::Normal),
                (CompKey::MilkFat, Priority::Normal),
                (CompKey::MSNF, Priority::Normal),
                (CompKey::POD, Priority::Normal),
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
        let targets: &[(CompKey, f64)] = &DAIRY_DISPARATE_TARGETS;
        let pod_target = targets.iter().find(|(key, _)| *key == CompKey::POD).unwrap().1;

        let baseline = balance_compositions_nnls(&comps, targets, None, &[]).unwrap();
        let prioritized =
            balance_compositions_nnls(&comps, targets, None, &[(CompKey::POD, Priority::Critical.weight())]).unwrap();

        let pod_error =
            |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
        assert_lt!(pod_error(&prioritized), pod_error(&baseline));

        // Priority never scales the sum-constraint row, so mass balance is preserved.
        let amount_sum: f64 = prioritized.iter().map(|(_, amount)| *amount).sum();
        assert_abs_diff_eq!(amount_sum, 1.0, epsilon = TESTS_EPSILON);
    }

    #[test]
    fn balance_compositions_threads_priorities() {
        let comps = comps_from_names(DAIRY_ING);
        let targets: &[(CompKey, f64)] = &DAIRY_DISPARATE_TARGETS;
        let pod_target = targets.iter().find(|(key, _)| *key == CompKey::POD).unwrap().1;

        let baseline = balance_compositions(&comps, targets, None, &[]).unwrap();
        let prioritized = balance_compositions(&comps, targets, None, &[(CompKey::POD, Priority::Critical)]).unwrap();

        let pod_error =
            |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
        assert_lt!(pod_error(&prioritized), pod_error(&baseline));
    }

    #[test]
    fn validate_flags_duplicate_priority_as_error() {
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat, 16.0)];
        let priorities = [
            (CompKey::MilkFat, Priority::High),
            (CompKey::MilkFat, Priority::Critical),
        ];
        let report = validate_balancing_targets(&comps, &targets, &priorities);

        assert_true!(report.has_errors());
        assert_true!(
            report
                .errors()
                .any(|issue| matches!(issue, BalancingIssue::DuplicatePriority { key: CompKey::MilkFat }))
        );
    }

    #[test]
    fn validate_flags_priority_without_target_as_warning() {
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat, 16.0)];
        let priorities = [(CompKey::MSNF, Priority::High)]; // no MSNF target
        let report = validate_balancing_targets(&comps, &targets, &priorities);

        assert_false!(report.has_errors());
        assert_true!(
            report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::PriorityWithoutTarget { key: CompKey::MSNF }))
        );
    }

    #[test]
    fn balance_compositions_rejects_duplicate_priority() {
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat, 16.0), (CompKey::MSNF, 11.0)];
        let priorities = [
            (CompKey::MilkFat, Priority::High),
            (CompKey::MilkFat, Priority::Critical),
        ];
        let result = balance_compositions(&comps, &targets, None, &priorities);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_compositions_proceeds_despite_priority_without_target() {
        // A priority whose key has no target is only a warning; the solve still returns a result.
        let comps = comps_from_names(DAIRY_ING);
        let targets = [(CompKey::MilkFat, 16.0), (CompKey::MSNF, 11.0)];
        let priorities = [(CompKey::TotalSugars, Priority::High)]; // no TotalSugars target
        assert!(balance_compositions(&comps, &targets, None, &priorities).is_ok());
    }

    // --- validate_balancing_targets: error-severity issues ---

    #[test]
    fn validate_does_not_flag_ratio_key_target() {
        // Ratio keys are now balanceable (encoded as homogeneous rows), so they are not an error.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_SUGAR_ING), &[(CompKey::AbsPAC, 9.0)], &[]);
        assert_false!(report.has_errors());
    }

    #[test]
    fn validate_flags_non_finite_target_as_error() {
        let report =
            validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat, f64::INFINITY)], &[]);
        assert_true!(
            report
                .errors()
                .any(|issue| matches!(issue, BalancingIssue::NonFiniteTarget { .. }))
        );
    }

    #[test]
    fn validate_flags_duplicate_target_as_error() {
        let targets = [(CompKey::MilkFat, 16.0), (CompKey::MilkFat, 12.0)];
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets, &[]);
        assert_true!(
            report
                .errors()
                .any(|issue| matches!(issue, BalancingIssue::DuplicateTarget { key: CompKey::MilkFat }))
        );
    }

    // --- validate_balancing_targets: warning-severity issues ---

    #[test]
    fn validate_flags_unaffectable_target_as_warning() {
        // Plain dairy has no alcohol source, so no combination can move an Alcohol target off zero.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::Alcohol, 5.0)], &[]);
        assert_false!(report.has_errors());
        assert_true!(
            report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::UnaffectableTarget { key: CompKey::Alcohol }))
        );
    }

    #[test]
    fn validate_flags_ratio_key_with_unaffectable_numerator_as_warning() {
        // No stabilizer source in the palette → the StabilizersPerWater numerator is unaffectable,
        // so the only reachable ratio is zero and a nonzero target cannot be met. Flag (warning).
        let report =
            validate_balancing_targets(&comps_from_names(DAIRY_SUGAR_ING), &[(CompKey::StabilizersPerWater, 0.5)], &[]);
        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnaffectableTarget {
                key: CompKey::StabilizersPerWater
            }
        )));
    }

    #[test]
    fn validate_flags_ratio_key_with_unaffectable_denominator_as_warning() {
        // A fat-free sorbet palette → the EmulsifiersPerFat denominator (TotalFats) is
        // unaffectable, so the ratio is undefined and cannot be balanced. Flagged (warning).
        let report =
            validate_balancing_targets(&comps_from_names(SORBET_ING), &[(CompKey::EmulsifiersPerFat, 1.0)], &[]);
        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnaffectableTarget {
                key: CompKey::EmulsifiersPerFat
            }
        )));
    }

    #[test]
    fn validate_flags_unreachable_target_as_warning() {
        // The richest dairy ingredient is 40% cream, so a 50% milk-fat target is out of reach.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat, 50.0)], &[]);
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::UnreachableTarget {
                key: CompKey::MilkFat,
                target: 50.0,
                min: 0.0,
                max: 40.0,
            }
        )));
    }

    #[test]
    fn validate_flags_dominance_for_sucrose_over_total_sugars() {
        // Every ingredient has Sucrose <= TotalSugars, so a Sucrose target above the TotalSugars
        // target is verifiably infeasible — the palette-derived dominance check catches it.
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let targets = [(CompKey::Sucrose, 20.0), (CompKey::TotalSugars, 15.0)];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::DominanceViolation {
                lesser: CompKey::Sucrose,
                greater: CompKey::TotalSugars,
                lesser_target: 20.0,
                greater_target: 15.0,
            }
        )));
    }

    #[test]
    fn validate_flags_additive_dominance_for_sugars_over_total_sugars() {
        // Each individual sugar target (10) is <= the TotalSugars target (15), so the pairwise
        // check stays silent. But Sucrose + Fructose sum under TotalSugars in every ingredient, so
        // their targets summing to 20 > 15 is infeasible — caught only by the additive check.
        let comps = comps_from_names(SUGAR_BLEND_ING);
        let targets = [
            (CompKey::Sucrose, 10.0),
            (CompKey::Fructose, 10.0),
            (CompKey::TotalSugars, 15.0),
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_false!(report.has_errors());
        // The pairwise check must NOT fire here (that's the point of the additive generalization).
        assert_false!(
            report
                .warnings()
                .any(|i| matches!(i, BalancingIssue::DominanceViolation { .. }))
        );
        assert_true!(report.warnings().any(|issue| matches!(
            issue,
            BalancingIssue::AdditiveDominanceViolation {
                whole: CompKey::TotalSugars,
                parts_target_sum,
                whole_target,
                ..
            } if *parts_target_sum == 20.0 && *whole_target == 15.0
        )));
    }

    #[test]
    fn validate_clean_targets_yield_empty_report() {
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &DAIRY_TRIVIAL_TARGETS, &[]);
        assert_true!(report.is_empty());
        assert_false!(report.has_errors());
    }

    // --- BalancingReport ---

    #[test]
    fn balancing_report_partitions_errors_and_warnings() {
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let targets = [
            (CompKey::Energy, f64::NAN),  // error: non-finite target
            (CompKey::Sucrose, 20.0),     // warning pair with TotalSugars
            (CompKey::TotalSugars, 15.0), //
        ];
        let report = validate_balancing_targets(&comps, &targets, &[]);

        assert_true!(report.has_errors());
        assert_false!(report.is_empty());
        assert_eq!(report.errors().count(), 1);
        assert_true!(
            report
                .warnings()
                .any(|i| matches!(i, BalancingIssue::DominanceViolation { .. }))
        );
    }

    #[test]
    fn balancing_report_into_result_errors_on_error_severity() {
        let targets = [(CompKey::MilkFat, 16.0), (CompKey::MilkFat, 12.0)];
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets, &[]);
        assert!(matches!(report.into_result(), Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balancing_report_into_result_ok_on_warnings_only() {
        // An unreachable target is only a warning, so into_result stays Ok.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat, 50.0)], &[]);
        assert_true!(report.warnings().count() >= 1);
        assert!(report.into_result().is_ok());
    }

    // --- Internal check helpers ---

    #[test]
    fn is_unaffectable_detects_zero_row() {
        let comps = comps_from_names(DAIRY_ING);
        assert_true!(is_unaffectable(&comps, CompKey::Alcohol, 5.0));
        assert_false!(is_unaffectable(&comps, CompKey::MilkFat, 16.0));
    }

    #[test]
    fn is_unaffectable_for_ratio_key_detects_unaffectable_parts() {
        // No stabilizer source → StabilizersPerWater numerator unaffectable.
        let no_stabilizer = comps_from_names(DAIRY_SUGAR_ING);
        assert_true!(is_unaffectable(&no_stabilizer, CompKey::StabilizersPerWater, 0.5));

        // No fat source → EmulsifiersPerFat denominator unaffectable.
        let no_fat = comps_from_names(SORBET_ING);
        assert_true!(is_unaffectable(&no_fat, CompKey::EmulsifiersPerFat, 1.0));

        // Both parts affectable (stabilizer + water present) → not unaffectable.
        let stabilizer_and_water = comps_from_names(DAIRY_STABILIZER_ING);
        assert_false!(is_unaffectable(&stabilizer_and_water, CompKey::StabilizersPerWater, 0.5));
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
}
