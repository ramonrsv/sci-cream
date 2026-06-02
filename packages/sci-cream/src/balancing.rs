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

/// A balancing solver function pointer, e.g. [`balance_compositions_nnls`].
type SolverFn = fn(&[Composition], &[(CompKey, f64)], Option<Weighting>) -> Result<Vec<(Composition, f64)>>;

/// Balances the given compositions to match target values — the validated public entry point.
///
/// This is the recommended way to balance: it first validates the inputs via
/// [`validate_balancing_targets`], returning an [`Error::InvalidBalancingTargets`] if any
/// error-severity issue is present (ratio-key targets, non-finite target values, or duplicate
/// target keys), then solves with an automatically chosen solver. `weighting` selects the row
/// weighting; `None` defaults to [`Weighting::Relative`].
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
) -> Result<Vec<(Composition, f64)>> {
    validate_balancing_targets(comps, targets).into_result()?;
    choose_solver(comps, targets)(comps, targets, weighting)
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
    /// A ratio key (e.g. [`CompKey::AbsPAC`]) was given as a target. Ratio keys cannot be balanced
    /// and poison the solve (see [`is_ratio_key`]).
    ///
    /// Severity: [`Severity::Error`].
    RatioKeyTarget {
        /// The offending ratio key.
        key: CompKey,
    },
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
}

impl BalancingIssue {
    /// The [`Severity`] of this issue: [`Severity::Error`] for issues that make balancing unsound,
    /// [`Severity::Warning`] otherwise, for issues that are suspicious but balancing can proceed.
    #[must_use]
    pub const fn severity(&self) -> Severity {
        match self {
            Self::RatioKeyTarget { .. } | Self::NonFiniteTarget { .. } | Self::DuplicateTarget { .. } => {
                Severity::Error
            }
            Self::UnaffectableTarget { .. }
            | Self::UnreachableTarget { .. }
            | Self::DominanceViolation { .. }
            | Self::AdditiveDominanceViolation { .. } => Severity::Warning,
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
/// - **Error** — ratio-key targets ([`is_ratio_key`]), non-finite target values, duplicates, etc.
/// - **Warning** — targets no composition affects, targets outside the palette's reachable range,
///   infeasible target pairs (dominance check) and part/whole groups (additive check), etc.
///
/// The range and dominance warnings assume the non-negative, normalized (summing to one) solution
/// that [`balance_compositions`] targets.
#[must_use]
pub fn validate_balancing_targets(comps: &[Composition], targets: &[(CompKey, f64)]) -> BalancingReport {
    let mut issues = Vec::new();

    // Error-severity checks: ratio keys, non-finite values, and duplicate keys.
    let mut seen: Vec<CompKey> = Vec::with_capacity(targets.len());
    for &(key, value) in targets {
        if is_ratio_key(key) {
            issues.push(BalancingIssue::RatioKeyTarget { key });
        }
        if !value.is_finite() {
            issues.push(BalancingIssue::NonFiniteTarget { key, value });
        }
        if seen.contains(&key) {
            issues.push(BalancingIssue::DuplicateTarget { key });
        } else {
            seen.push(key);
        }
    }

    // Per-target warning checks: unaffectable and unreachable targets. Ratio keys and non-finite
    // values are skipped — they are reported as errors above and make this comparison meaningless.
    for &(key, target) in targets {
        if is_ratio_key(key) || !target.is_finite() {
            continue;
        }
        if is_unaffectable(comps, key) {
            issues.push(BalancingIssue::UnaffectableTarget { key });
            continue; // range checks add only noise for an all-zero row
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

    BalancingReport { issues }
}

/// Returns `true` if no composition contributes to `key` (its row is entirely zero).
///
/// The shared predicate for "no ingredient can affect this key": [`constrainable_targets`] uses it
/// to drop such targets before solving, and [`validate_balancing_targets`] to flag as warnings.
fn is_unaffectable(comps: &[Composition], key: CompKey) -> bool {
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
/// dominance checks: not a ratio key, finite, and affected by at least one composition. Targets
/// failing this are reported by their own error/warning checks, so the comparisons skip them.
fn is_checkable_target(comps: &[Composition], key: CompKey, target: f64) -> bool {
    !is_ratio_key(key) && target.is_finite() && !is_unaffectable(comps, key)
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
/// the weighting; `None` defaults to [`Weighting::Relative`] (relative error).
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
) -> Result<Vec<(Composition, f64)>> {
    let targets = constrainable_targets(comps, targets);
    let weights = row_weights(&targets, weighting.unwrap_or(Weighting::Relative));

    let flat_a = make_matrix_a(comps, &targets, &weights);
    let flat_y = make_vector_y(&targets, &weights);

    let a = DMatrix::from_row_slice(targets.len() + 1, comps.len(), &flat_a);
    let y = DVector::from_vec(flat_y);

    let svd = SVD::new(a, true, true);

    let x = svd
        .solve(&y, 1e-10)
        .map_err(|e| Error::FailedToBalanceCompositions(e.to_string()))?;

    Ok(x.iter().enumerate().map(|(i, amount)| (comps[i], *amount)).collect())
}

/// Balances the given compositions to match target values for the specified keys, using nnls.
///
/// Solves the non-negative (weighted) least squares problem for the combination of `comps` that
/// best matches `targets`, returning each composition with its amount, normalized to sum 1.
/// `weighting` selects the weighting; `None` defaults to [`Weighting::Relative`] (relative error).
///
/// # Errors
///
/// Returns an error if the non-negative least squares problem cannot be solved, e.g. due to
/// incompatible compositions and targets, numerical issues, etc.
pub fn balance_compositions_nnls(
    comps: &[Composition],
    targets: &[(CompKey, f64)],
    weighting: Option<Weighting>,
) -> Result<Vec<(Composition, f64)>> {
    let targets = constrainable_targets(comps, targets);
    let weights = row_weights(&targets, weighting.unwrap_or(Weighting::Relative));

    let a = Array2::from_shape_vec((targets.len() + 1, comps.len()), make_matrix_a(comps, &targets, &weights))
        .map_err(|e| Error::FailedToBalanceCompositions(e.to_string()))?;

    let y = Array1::from_vec(make_vector_y(&targets, &weights));

    let (x, _residual) = nnls(a.view(), y.view());

    Ok(x.iter().enumerate().map(|(i, amount)| (comps[i], *amount)).collect())
}

/// Drops targets that no ingredient can affect — those whose row is exactly zero across `comps`.
///
/// Such a row is `0*x = target`; all zero rows can cause issues for solvers. Since they only add a
/// constant to the least-squares objective, they don't change the optimum and we can safely drop
/// them without affecting the result.
///
/// A non-zero — including `NaN`, as a ratio key yields on a zero denominator — value keeps the
/// target, so the ratio-key poisoning [`get_balanceable_comp_keys`] guards against stays intact.
fn constrainable_targets(comps: &[Composition], targets: &[(CompKey, f64)]) -> Vec<(CompKey, f64)> {
    targets
        .iter()
        .copied()
        .filter(|(key, _)| !is_unaffectable(comps, *key))
        .collect()
}

/// Floor applied to a target's magnitude before inverting it for [`Weighting::Relative`], so a zero
/// or near-zero target (e.g. a recipe with no cocoa or stabilizer) yields a large-but-finite weight
/// instead of dividing by zero.
const RELATIVE_WEIGHT_FLOOR: f64 = 0.1;

/// Fixed weight on the total-sum (mass-balance) row under [`Weighting::Relative`].
///
/// Relative weighting scales every target row to roughly unit magnitude (each is divided by its own
/// target), so a single fixed weight well above 1 uniformly dominates them and keeps the balanced
/// amounts summing to 1 — independent of the target magnitudes.
const SUM_CONSTRAINT_WEIGHT: f64 = 1.0e3;

/// Per-row weights for the least-squares system: one per target row, then the total-sum row.
///
/// Under [`Weighting::Absolute`] every weight is 1. Under [`Weighting::Relative`] each target row
/// is weighted by `1 / max(|target|, RELATIVE_WEIGHT_FLOOR)`, and the trailing sum row by the fixed
/// [`SUM_CONSTRAINT_WEIGHT`] so mass balance stays dominant.
fn row_weights(targets: &[(CompKey, f64)], weighting: Weighting) -> Vec<f64> {
    match weighting {
        Weighting::Absolute => vec![1.0; targets.len() + 1],
        Weighting::Relative => {
            let mut weights: Vec<f64> = targets
                .iter()
                .map(|(_, target)| 1.0 / target.abs().max(RELATIVE_WEIGHT_FLOOR))
                .collect();

            weights.push(SUM_CONSTRAINT_WEIGHT);

            weights
        }
    }
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
        .flat_map(|(&(key, _), &weight)| comps.iter().map(move |comp| comp.get(key) * weight))
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
        .map(|(&(_, target), &weight)| target * weight)
        .chain(std::iter::once(weights[targets.len()]))
        .collect::<Vec<_>>()
}

/// Returns true if the given [`CompKey`] is a ratio key, e.g. [`CompKey::AbsPAC`], etc.
#[must_use]
pub const fn is_ratio_key(key: CompKey) -> bool {
    matches!(key, CompKey::AbsPAC | CompKey::StabilizersPerWater | CompKey::EmulsifiersPerFat)
}

/// The [`CompKey`]s that can be used as balancing targets, i.e. every key except ratio keys.
///
/// Ratio keys cannot be balanced directly, because they are a ratio of two other extensive keys,
/// and so are not expressed as a weighted sum of the per-ingredient values, a requirement for this
/// balancing model. They can also go `f64::NAN` on a zero denominator (e.g. no water / no fat),
/// which poisons the whole SVD/NNLS solve. For now, these should simply be excluded from balancing.
///
/// @todo It should be possible to balance these keys by adding a different row for them, e.g.
/// `StabPerWater = R` es equivalent to the linear constraint `Stabilizers - R * Water = 0`, which
/// can be added as a row to the matrix A.
#[must_use]
pub fn get_balanceable_comp_keys() -> Vec<CompKey> {
    CompKey::iter().filter(|key| !is_ratio_key(*key)).collect()
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

    /// The raw mix composition value for a key, summed without the renormalization that
    /// [`Composition::from_combination`] applies.
    ///
    /// This faithfully reports the amount produced by a balancing operation, trusting the raw
    /// fractions, and keeping any negative amounts a non-negativity-free solver may return.
    fn achieved_value(balanced: &[(Composition, f64)], key: CompKey) -> f64 {
        balanced.iter().map(|(comp, amount)| *amount * comp.get(key)).sum()
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
    fn assert_balance_compositions<F>(
        comps: &[Composition],
        targets: &[(CompKey, f64)],
        solve: F,
        epsilons: Epsilons,
        ceiling: &KeyCeiling,
    ) where
        F: Fn(&[Composition], &[(CompKey, f64)], Option<Weighting>) -> Result<Vec<(Composition, f64)>>,
    {
        let balanced = solve(comps, targets, None).unwrap();
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
            .map(|(key, value)| format!("  {:<14}{value:>7.2}", key_str(key)))
            .collect::<Vec<_>>()
            .join("\n");
        lines.append(&mut vec![format!("targets:\n{header}")]);

        for (label, solve) in solvers {
            lines.push(String::new());

            let balanced = match solve(comps, targets, None) {
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

            lines.push("  [    key     | target | achieved |  error  ]".to_string());

            let mut errors = Vec::with_capacity(targets.len());
            for (key, target) in targets {
                let achieved = achieved_value(&balanced, *key);
                let error = balance_rel_error_pp(achieved, *target);
                errors.push(error);
                lines.push(format!("  {:<14}{target:>7.2}   {achieved:>7.2}   {error:>7.2} pp", key_str(key)));
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
    /// [`CompKey::PACtotal`] per gram makes a separate PAC target easy to over-constrain.
    const BOOZY_ING: &[&str] = &["3.25% Milk", "40% Cream", "Sucrose", "Grand Marnier Cordon Rouge"];

    /// A multi-sugar palette whose sugars differ in POD:PAC ratio, giving the solver enough freedom
    /// to hit a sweetness ([`CompKey::POD`]) and a hardness ([`CompKey::PACtotal`]) target at once.
    const SUGAR_BLEND_ING: &[&str] = &["Water", "Sucrose", "Dextrose", "Fructose"];

    // --- Exact balancing targets ---

    /// Trivial dairy targets that the dairy compositions can match exactly, used for sanity checks.
    static DAIRY_TRIVIAL_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| vec![(CompKey::MilkFat, 16.0), (CompKey::MSNF, 11.0)]);

    /// Dairy targets including a zero-valued [`CompKey::Stabilizers`] target, exercising the
    /// relative-error floor path (i.e. that the result is finite, and no division by zero).
    static DAIRY_ZERO_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::MilkFat, 16.0),
            (CompKey::MSNF, 11.0),
            (CompKey::Stabilizers, 0.0),
        ]
    });

    /// Feasible targets for the [`SUGAR_BLEND_ING`] palette: the composition of a real blend
    /// (Water 68 / Sucrose 14 / Dextrose 10 / Fructose 8), so the solver can recover them exactly
    /// while hitting a sweetness ([`CompKey::POD`]) and hardness ([`CompKey::PACtotal`]) target at
    /// once. These targets genuinely require all three sugars — any two-sugar subset misses by
    /// >10 pp (see [`balance_multi_sugar_needs_all_three_sugars`]).
    static SUGAR_BLEND_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSolids, 31.2),
            (CompKey::POD, 35.2),
            (CompKey::PACtotal, 46.68),
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
    /// [`CompKey::PACtotal`] (soft, scoopable) target — opposed, since both rise with sugar. Spans
    /// the large solids/sugar/PAC targets down to a trace [`CompKey::Stabilizers`].
    static SORBET_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSolids, 32.0),
            (CompKey::TotalSugars, 26.0),
            (CompKey::PACtotal, 32.0),
            (CompKey::POD, 14.0),
            (CompKey::Stabilizers, 0.40),
        ]
    });

    /// Booze base: a modest [`CompKey::ABV`] target plus a separate [`CompKey::PACtotal`] target,
    /// which the liqueur's outsized per-gram PAC contribution over-constrains.
    static BOOZY_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSugars, 17.0),
            (CompKey::PACtotal, 28.0),
            (CompKey::ABV, 4.0),
        ]
    });

    // --- Balancing tests ---

    #[test]
    fn balance_compositions_nalgebra_ref_recipes_all_targets() {
        for light_recipe in REF_LIGHT_RECIPES.iter() {
            assert_balance_compositions(
                &comps_from_light_recipe(light_recipe),
                &get_targets_from_light_recipe(light_recipe, &get_balanceable_comp_keys()),
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
                &get_targets_from_light_recipe(light_recipe, &get_balanceable_comp_keys()),
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
            let balanced = balance_compositions_nnls(&comps_from_names(palette), &SUGAR_BLEND_TARGETS, None).unwrap();
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

        let balanced = balance_compositions_nnls(&comps, &targets, Some(weighting)).unwrap();
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

    // Over-constrained: hitting the ABV target needs the liqueur, which also drives PACtotal, so
    // the two can't both be met exactly. With absolute weighting the solver system breaks down and
    // collapses the total amount (must sum to 1) to ~0.29 to meet the larger ABV and PAC targets.
    #[test]
    fn balance_boozy_abv_vs_pac_absolute_weighting() {
        let comps = comps_from_names(BOOZY_ING);
        let targets = BOOZY_DISPARATE_TARGETS.clone();
        let weighting = Weighting::Absolute;

        let balanced = balance_compositions_nnls(&comps, &targets, Some(weighting)).unwrap();
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
        assert_false!(is_ratio_key(CompKey::PACtotal));
        assert_false!(is_ratio_key(CompKey::Water));
    }

    #[test]
    fn get_balanceable_comp_keys_excludes_exactly_the_ratio_keys() {
        let balanceable = get_balanceable_comp_keys();
        let ratio_count = CompKey::iter().filter(|key| is_ratio_key(*key)).count();

        assert_eq!(ratio_count, 3);
        assert_eq!(balanceable.len(), CompKey::iter().count() - ratio_count);
        assert_true!(balanceable.iter().all(|key| !is_ratio_key(*key)));
    }

    /// Balancing with a ratio key as a target poisons the solve: an ingredient with zero water
    /// (Sucrose) makes [`CompKey::StabilizersPerWater`] `NaN`, which contaminates the matrix. nnls
    /// returns finite-but-meaningless amounts, yet the *achieved* value for the key is `NaN` — so
    /// the result is unusable. This is why [`get_balanceable_comp_keys`] excludes ratio keys.
    #[test]
    fn ratio_key_target_poisons_nnls_achieved_value() {
        let comps = comps_from_names(DAIRY_SUGAR_ING); // Sucrose has zero water
        let targets = [(CompKey::StabilizersPerWater, 0.5)];

        let balanced = balance_compositions_nnls(&comps, &targets, None).unwrap();

        assert_false!(achieved_value(&balanced, CompKey::StabilizersPerWater).is_finite());
    }

    /// The same ratio-key poisoning makes nalgebra's SVD panic outright on the `NaN` matrix (does
    /// not return an `Err`) — an even stronger reason to keep ratio keys out of balancing targets.
    #[test]
    #[should_panic(expected = "Singular value was NaN")] // nalgebra-internal panic on the NaN matrix
    fn ratio_key_target_panics_nalgebra() {
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let targets = [(CompKey::StabilizersPerWater, 0.5)];

        let _result = balance_compositions_nalgebra(&comps, &targets, None);
    }

    // --- Solver behavior and edge cases ---

    /// nalgebra's plain least squares can return negative amounts on an over-constrained system,
    /// whereas nnls clamps them to be non-negative — the documented difference between the two.
    #[test]
    fn nalgebra_allows_negative_amounts_while_nnls_does_not() {
        let comps = comps_from_names(BOOZY_ING);

        let nalgebra = balance_compositions_nalgebra(&comps, &BOOZY_DISPARATE_TARGETS, None).unwrap();
        let nnls = balance_compositions_nnls(&comps, &BOOZY_DISPARATE_TARGETS, None).unwrap();

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
            let balanced = balance_compositions_nnls(&comps, targets, weighting).unwrap();
            max_rel_error(&balanced, targets)
        };

        let absolute = max_error_for(Some(Weighting::Absolute));
        let relative = max_error_for(None);

        assert_true!(relative < absolute);
    }

    // --- balance_compositions entry point ---

    #[test]
    fn balance_compositions_rejects_ratio_key_target() {
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let result = balance_compositions(&comps, &[(CompKey::StabilizersPerWater, 0.5)], None);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_compositions_rejects_duplicate_target() {
        let comps = comps_from_names(DAIRY_ING);
        let result = balance_compositions(&comps, &[(CompKey::MilkFat, 16.0), (CompKey::MilkFat, 12.0)], None);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balance_compositions_rejects_non_finite_target() {
        let comps = comps_from_names(DAIRY_ING);
        let result = balance_compositions(&comps, &[(CompKey::MilkFat, f64::NAN)], None);
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
        assert!(balance_compositions(&comps, &targets, None).is_ok());
    }

    // --- validate_balancing_targets: error-severity issues ---

    #[test]
    fn validate_flags_ratio_key_as_error() {
        let report = validate_balancing_targets(&comps_from_names(DAIRY_SUGAR_ING), &[(CompKey::AbsPAC, 9.0)]);
        assert_true!(report.has_errors());
        assert_true!(
            report
                .errors()
                .any(|issue| matches!(issue, BalancingIssue::RatioKeyTarget { key: CompKey::AbsPAC }))
        );
    }

    #[test]
    fn validate_flags_non_finite_target_as_error() {
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat, f64::INFINITY)]);
        assert_true!(
            report
                .errors()
                .any(|issue| matches!(issue, BalancingIssue::NonFiniteTarget { .. }))
        );
    }

    #[test]
    fn validate_flags_duplicate_target_as_error() {
        let targets = [(CompKey::MilkFat, 16.0), (CompKey::MilkFat, 12.0)];
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets);
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
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::Alcohol, 5.0)]);
        assert_false!(report.has_errors());
        assert_true!(
            report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::UnaffectableTarget { key: CompKey::Alcohol }))
        );
    }

    #[test]
    fn validate_flags_unreachable_target_as_warning() {
        // The richest dairy ingredient is 40% cream, so a 50% milk-fat target is out of reach.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat, 50.0)]);
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
        let report = validate_balancing_targets(&comps, &targets);

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
        let report = validate_balancing_targets(&comps, &targets);

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
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &DAIRY_TRIVIAL_TARGETS);
        assert_true!(report.is_empty());
        assert_false!(report.has_errors());
    }

    // --- BalancingReport ---

    #[test]
    fn balancing_report_partitions_errors_and_warnings() {
        let comps = comps_from_names(DAIRY_SUGAR_ING);
        let targets = [
            (CompKey::AbsPAC, 9.0),       // error: ratio key
            (CompKey::Sucrose, 20.0),     // warning pair with TotalSugars
            (CompKey::TotalSugars, 15.0), //
        ];
        let report = validate_balancing_targets(&comps, &targets);

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
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets);
        assert!(matches!(report.into_result(), Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn balancing_report_into_result_ok_on_warnings_only() {
        // An unreachable target is only a warning, so into_result stays Ok.
        let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat, 50.0)]);
        assert_true!(report.warnings().count() >= 1);
        assert!(report.into_result().is_ok());
    }

    // --- Internal check helpers ---

    #[test]
    fn is_unaffectable_detects_zero_row() {
        let comps = comps_from_names(DAIRY_ING);
        assert_true!(is_unaffectable(&comps, CompKey::Alcohol));
        assert_false!(is_unaffectable(&comps, CompKey::MilkFat));
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
