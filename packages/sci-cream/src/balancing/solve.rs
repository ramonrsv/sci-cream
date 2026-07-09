//! Solving balanced mixes from validated targets.
//!
//! Holds the validated [`balance_compositions`] entry point, the underlying least-squares solvers
//! ([`balance_compositions_nnls`], [`balance_compositions_nalgebra`]), the [`Weighting`] mode, and
//! the weighted-system assembly and ratio-reweighting machinery they share.

use nalgebra::{DMatrix, DVector, SVD};
use ndarray::{Array1, Array2};
use nnls::nnls;
use serde::{Deserialize, Serialize};

use crate::{
    balancing::{
        keys::{BalanceKey, target_row_coeff, target_row_rhs},
        validate::{BalancingReport, append_input_error_issues, append_lock_error_issues, is_unaffectable},
    },
    composition::{CompKey, Composition, CompositionValues, FastComposition},
    constants::balancing::{
        CRITICAL_PRIORITY_WEIGHT, HIGH_PRIORITY_WEIGHT, LOW_PRIORITY_WEIGHT, NORMAL_PRIORITY_WEIGHT,
        RATIO_DENOMINATOR_FLOOR, RATIO_REWEIGHT_TOLERANCE, RELATIVE_WEIGHT_FLOOR, SUM_CONSTRAINT_WEIGHT,
        SVD_SOLVE_EPSILON, TYPICAL_MIX_FAT, TYPICAL_MIX_WATER,
    },
    error::{Error, Result},
};

#[cfg(doc)]
use crate::{
    balancing::validate::{BalancingIssue, validate_balancing_targets},
    composition::RatioKey,
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
pub(crate) type SolverFn = fn(
    &[(Composition, Option<f64>)],
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
/// Each entry pairs a composition with an optional **lock**: `(comp, Some(fraction))` holds it at
/// `fraction` of the mix rather than solving for it, `(comp, None)` leaves it free. A locked
/// composition still contributes to every target (folded in as a fixed offset) but is returned at
/// that fraction unchanged — holding e.g. a flavouring constant while the rest balance around it.
/// All-`None` is the ordinary balance; the result lists every input composition, in input order.
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
/// `evaporation` is the fraction `E/T` of the *pre-evaporation* mix lost to preparation (gram-free,
/// like the rest of this API); `None`/`0.0` is the ordinary solve. Targets keep their natural
/// *post-evaporation* meaning for every key (including `Water` and the water-denominated ratios):
/// it is injected as a synthetic locked pure-water line at fraction `−e/(1−e)`, added after lock
/// validation and stripped from the result, which is in fractions of the post-evaporation mix.
///
/// The chosen solver is currently always [`balance_compositions_nnls`] (non-negative): negative
/// ingredient amounts are not meaningful for real recipes, so the [`balance_compositions_nalgebra`]
/// path is reserved for internal verification and benchmarking and is not used here.
///
/// # Errors
///
/// Returns [`Error::InvalidBalancingTargets`] if the inputs contain an error-severity issue: a
/// non-finite or negative target value, duplicate target or priority keys, or an invalid locked
/// fraction or sum that exceeds 1. Returns [`Error::InvalidEvaporation`] if `evaporation` is
/// non-finite, negative, or at least 1. Also forwards any error from the chosen underlying solver.
pub fn balance_compositions(
    comps: &[(Composition, Option<f64>)],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priorities: &[(BalanceKey, Priority)],
    evaporation: Option<f64>,
) -> Result<Vec<(Composition, f64)>> {
    // Gate on the cheap error checks only; this path discards warnings, so the composition-scanning
    // warning checks are wasted work (see `append_input_warning_issues`).
    let mut issues = Vec::new();
    append_input_error_issues(targets, priorities, &mut issues);
    append_lock_error_issues(comps, &mut issues);
    BalancingReport { issues }.into_result()?;

    let evaporation = validate_evaporation_fraction(evaporation)?;

    let priority_weights: Vec<(BalanceKey, f64)> = priorities
        .iter()
        .map(|&(key, priority)| (key, priority.weight()))
        .collect();

    if evaporation == 0.0 {
        return choose_solver(comps, targets)(comps, targets, weighting, &priority_weights);
    }

    // Model evaporation as a synthetic locked pure-water line contributing the negative fraction
    // `−e/(1−e)` of the post-evap mix. Injected after user-lock validation (which rejects negative
    // fractions), it lets the solver keep post-evap target semantics for every key uniformly.
    let mut comps = comps.to_vec();
    comps.push((Composition::new(), Some(-evaporation / (1.0 - evaporation))));

    let mut balanced = choose_solver(&comps, targets)(&comps, targets, weighting, &priority_weights)?;
    balanced.truncate(comps.len());
    Ok(balanced)
}

/// Validates the optional [`balance_compositions`] `evaporation` fraction; returns `0.0` if `None`.
///
/// # Errors
///
/// Returns [`Error::InvalidEvaporation`] if the fraction is non-finite, negative, or at least 1.
fn validate_evaporation_fraction(evaporation: Option<f64>) -> Result<f64> {
    let evaporation = evaporation.unwrap_or(0.0);
    if !evaporation.is_finite() || !(0.0..1.0).contains(&evaporation) {
        return Err(Error::InvalidEvaporation(format!(
            "evaporation fraction must be finite and within [0, 1), got {evaporation}"
        )));
    }
    Ok(evaporation)
}

/// Selects the underlying solver for [`balance_compositions`].
///
/// Centralizes the choice of solver so it can evolve independently of callers. Currently always
/// returns [`balance_compositions_nnls`], the non-negative solver used in production.
const fn choose_solver(_comps: &[(Composition, Option<f64>)], _targets: &[(BalanceKey, f64)]) -> SolverFn {
    balance_compositions_nnls
}

/// Balances the given compositions to match target values for the specified keys, using nalgebra.
///
/// Solves the (weighted) least squares problem for the combination of `comps` that best matches
/// `targets`, returning each composition with its amount, normalized to sum 1. `weighting` selects
/// the weighting; `None` defaults to [`Weighting::Relative`] (relative error). `priority_weights`
/// maps target keys to row-weight multipliers (missing keys default to 1); see [`row_weights`].
/// Each `comps` carries an optional lock forwarded to the solve (see [`balance_with_reweighting`]).
///
/// **Note**: This does not enforce non-negativity, so amounts may be negative. Use
/// [`balance_compositions_nnls`] if non-negativity is required.
///
/// # Errors
///
/// Returns an error if the least squares problem cannot be solved, e.g. due to incompatible
/// compositions and targets, numerical issues, etc.
pub fn balance_compositions_nalgebra(
    comps: &[(Composition, Option<f64>)],
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
/// Each `comps` carries an optional lock forwarded to the solve (see [`balance_with_reweighting`]).
///
/// # Errors
///
/// Returns an error if the non-negative least squares problem cannot be solved, e.g. due to
/// incompatible compositions and targets, numerical issues, etc.
pub fn balance_compositions_nnls(
    comps: &[(Composition, Option<f64>)],
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
fn debug_assert_targets_error_validated(targets: &[(BalanceKey, f64)]) {
    let mut issues = Vec::new();
    append_input_error_issues(targets, &[], &mut issues);
    let report = BalancingReport { issues };
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
/// Each `comps` entry pairs a composition with an optional lock: `Some(fraction)` fixes it at that
/// fraction of the mix, `None` leaves it free. A locked composition leaves the solved columns, its
/// contribution moving to the target RHS so the free amounts sum to `1 - Σ locked` (see
/// `make_vector_y`); its amount is returned unchanged, in input order. Lock fractions are assumed
/// pre-validated (finite, non-negative, summing to <= 1) via [`balance_compositions`].
///
/// # Errors
///
/// Forwards any error from `solve`.
pub fn balance_with_reweighting(
    comps: &[(Composition, Option<f64>)],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(BalanceKey, f64)],
    solve: RawSolver,
) -> Result<Vec<(Composition, f64)>> {
    #[cfg(debug_assertions)]
    debug_assert_targets_error_validated(targets);

    let weighting = weighting.unwrap_or(Weighting::Relative);

    // A locked composition's amount is fixed, so it leaves the free-variable columns; the free
    // amounts then fill `1 - locked_total`, with each locked contribution moved to the RHS below.
    let locked_fraction = |index: usize| comps[index].1;
    let locked_total: f64 = (0..comps.len()).filter_map(locked_fraction).sum();
    let free_indices: Vec<usize> = (0..comps.len()).filter(|&i| locked_fraction(i).is_none()).collect();

    // Snapshot free compositions once: they're read by key below (see `FastComposition`).
    let free_fast: Vec<FastComposition> = free_indices.iter().map(|&i| comps[i].0.to_fast()).collect();

    // Drop targets no *free* composition can move: they only add a constant to the objective.
    let targets = constrainable_targets(&free_fast, targets);

    // With every composition locked there are no free variables; the mix is fully determined.
    if free_fast.is_empty() {
        return Ok(reunite_locked(comps, &free_indices, &[]));
    }

    // Each target row's fixed locked contribution (`Σ locked fraction · row coefficient`),
    // subtracted from the row's right-hand side so the free amounts solve for the remainder.
    let locked_contributions: Vec<f64> = targets
        .iter()
        .map(|&(key, target)| {
            (0..comps.len())
                .filter_map(|i| {
                    locked_fraction(i).map(|fraction| fraction * target_row_coeff(key, target, &comps[i].0))
                })
                .sum()
        })
        .collect();

    // Seed denominator estimates for the ratio targets, from the targets alone.
    let mut ratio_denominators: Vec<(BalanceKey, f64)> = targets
        .iter()
        .filter_map(|&(key, _)| estimate_ratio_denominator(key, &targets).map(|denominator| (key, denominator)))
        .collect();

    let rows = targets.len() + 1;
    let cols = free_fast.len();

    let solve_once = |ratio_denominators: &[(BalanceKey, f64)]| -> Result<Vec<f64>> {
        let weights = row_weights(&targets, weighting, priority_weights, ratio_denominators);
        solve(
            &make_matrix_a(&free_fast, &targets, &weights),
            &make_vector_y(&targets, &weights, &locked_contributions, locked_total),
            rows,
            cols,
        )
    };

    let free_amounts = solve_once(&ratio_denominators)?;
    let balanced = reunite_locked(comps, &free_indices, &free_amounts);

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
            let free_amounts = solve_once(&ratio_denominators)?;
            return Ok(reunite_locked(comps, &free_indices, &free_amounts));
        }
    }

    Ok(balanced)
}

/// Reassembles the full per-composition result in input order: locked compositions at their fixed
/// fraction, free ones at their solved amount (`free_amounts`, aligned to `free_indices`).
fn reunite_locked(
    comps: &[(Composition, Option<f64>)],
    free_indices: &[usize],
    free_amounts: &[f64],
) -> Vec<(Composition, f64)> {
    let mut result: Vec<(Composition, f64)> = comps.iter().map(|&(comp, _)| (comp, 0.0)).collect();
    for (index, &(_, lock)) in comps.iter().enumerate() {
        if let Some(fraction) = lock {
            result[index].1 = fraction;
        }
    }
    for (&index, &amount) in free_indices.iter().zip(free_amounts) {
        result[index].1 = amount;
    }
    result
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
pub(crate) fn constrainable_targets(
    comps: &[impl CompositionValues],
    targets: &[(BalanceKey, f64)],
) -> Vec<(BalanceKey, f64)> {
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
fn make_matrix_a(comps: &[impl CompositionValues], targets: &[(BalanceKey, f64)], weights: &[f64]) -> Vec<f64> {
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
/// One element per target value plus a trailing total-sum element, each scaled by `weights[i]`
/// (see [`row_weights`]). Each row's locked contribution is subtracted (`locked_contributions`,
/// aligned to `targets`) and the sum row targets `1 - locked_total`, so the free amounts fill
/// around the locks; with no locks both are zero, giving plain target values and a sum row of 1.
///
/// \[16\]  // Milk Fat
/// \[11\]  // MSNF
///  \[1\]  // Total sums to 100%
fn make_vector_y(
    targets: &[(BalanceKey, f64)],
    weights: &[f64],
    locked_contributions: &[f64],
    locked_total: f64,
) -> Vec<f64> {
    targets
        .iter()
        .zip(weights)
        .zip(locked_contributions)
        .map(|((&(key, target), &weight), &locked_contribution)| {
            (target_row_rhs(key, target) - locked_contribution) * weight
        })
        .chain(std::iter::once((1.0 - locked_total) * weights[targets.len()]))
        .collect::<Vec<_>>()
}

/// The achieved value for `key` from a balanced result, summed without the renormalization that
/// [`Composition::from_combination`] applies (trusting the raw fractions, keeping any negative
/// amounts a non-negativity-free solver may return).
///
/// Ratio-aware: a ratio key yields its achieved ratio (a percentage) from its numerator and
/// denominator parts (see [`RatioKey::parts`]) — those parts being extensive keys, they resolve
/// via the base case below. An extensive key yields the plain weighted sum. Accepts any key kind
/// via [`Into<BalanceKey>`], so callers can pass a bare [`CompKey`] or [`RatioKey`].
pub(crate) fn achieved_value<K: Into<BalanceKey>>(balanced: &[(Composition, f64)], key: K) -> f64 {
    match key.into() {
        BalanceKey::Ratio(ratio) => {
            let (num_key, den_key) = ratio.parts();
            achieved_value(balanced, num_key) / achieved_value(balanced, den_key) * 100.0
        }
        BalanceKey::Comp(comp_key) => balanced.iter().map(|(comp, amount)| *amount * comp.get(comp_key)).sum(),
    }
}
