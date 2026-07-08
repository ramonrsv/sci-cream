//! Constants used in the balancing process, e.g. for weighting and prioritization of targets, and
//! for fallback estimates when target values are missing or near zero.

#[cfg(doc)]
use crate::{
    balancing::{Priority, Weighting, append_palette_ratio_issues, balance_with_reweighting},
    composition::{CompKey, RatioKey},
};

/// Floor applied to a target's magnitude before inverting it for [`Weighting::Relative`]
///
/// This is used so a zero or near-zero target (e.g. a recipe with no cocoa or stabilizer) yields a
/// large-but-finite weight instead of dividing by zero.
pub const RELATIVE_WEIGHT_FLOOR: f64 = 0.1;

/// Factor by which a priority level increases from the previous one
pub const PRIORITY_LEVEL_FACTOR: f64 = 5.0;

/// Row-weight multiplier for a [`Priority::Low`] target.
pub const LOW_PRIORITY_WEIGHT: f64 = NORMAL_PRIORITY_WEIGHT / PRIORITY_LEVEL_FACTOR;

/// Row-weight multiplier for a [`Priority::Normal`] target.
pub const NORMAL_PRIORITY_WEIGHT: f64 = 1.0;

/// Row-weight multiplier for a [`Priority::High`] target.
pub const HIGH_PRIORITY_WEIGHT: f64 = NORMAL_PRIORITY_WEIGHT * PRIORITY_LEVEL_FACTOR;

/// Row-weight multiplier for a [`Priority::Critical`] target.
pub const CRITICAL_PRIORITY_WEIGHT: f64 = HIGH_PRIORITY_WEIGHT * PRIORITY_LEVEL_FACTOR;

/// Fixed weight on the total-sum (mass-balance) row under [`Weighting::Relative`].
///
/// Relative weighting scales every target row to roughly unit magnitude (each is divided by its own
/// target), so a single fixed weight well above 1 uniformly dominates them and keeps the balanced
/// amounts summing to 1 — independent of the target magnitudes.
pub const SUM_CONSTRAINT_WEIGHT: f64 = 1.0e3;

/// Floor applied to an estimated ratio denominator before inverting it for the relative weight of a
/// ratio target's homogeneous row, so a near-zero estimate yields a large-but-finite weight.
pub const RATIO_DENOMINATOR_FLOOR: f64 = 1.0;

/// Tolerance on the sum of locked fractions before it is reported as exceeding the whole mix.
///
/// Locked fractions are `amount / total`, so an all-locked mix sums to ~1; this small tolerance
/// keeps floating-point noise at that boundary from spuriously flagging the mix as over-full.
pub const LOCKED_TOTAL_TOLERANCE: f64 = 1.0e-6;

/// Relative tolerance between a ratio target's seed and achieved denominator below which the second
/// (reweighting) solve is skipped; see [`balance_with_reweighting`].
pub const RATIO_REWEIGHT_TOLERANCE: f64 = 0.05;

/// Typical water content (g/100g) of a finished mix
///
/// This is used as the last-resort denominator estimate for water-denominated ratio targets
/// ([`RatioKey::AbsPAC`], [`RatioKey::StabilizersPerWater`]) when neither the denominator (`Water`)
/// nor a complementary `TotalSolids` target is given to infer it.
//
// @todo Find sources for this value.
pub const TYPICAL_MIX_WATER: f64 = 62.0;

/// Typical total fat content (g/100g) of a finished mix
///
/// This is used as the last-resort denominator estimate for [`RatioKey::EmulsifiersPerFat`] when
/// neither `TotalFats` nor any component-fat target is given to infer it.
//
// @todo Find sources for this value.
pub const TYPICAL_MIX_FAT: f64 = 10.0;

/// Singular-value threshold for the nalgebra SVD solve in `balance_compositions_nalgebra`
///
/// Passed as the `eps` argument to nalgebra's `SVD::solve`: any singular value at or below it is
/// treated as zero (dropped from the inverse) when solving the least-squares system.
pub const SVD_SOLVE_EPSILON: f64 = 1e-10;

/// Cap on numerator subset size in [`append_palette_ratio_issues`]; lets it catch >= 3-key
/// infeasibilities that no pair alone reveals.
///
/// **Note:** Reasonable target counts of ~20 keys or less run in < 160 µs with a cap of 3, and
/// under ~0.5 ms with no cap, i.e. the exhaustive search is manageable for typical use cases.
//
// @todo Investigate if there are any benefits to raising this > 3, e.g. if there are common 4-key
// conflicts that it would catch and would be useful to an end-user; try to find example cases.
pub const MAX_NUM_GROUP_SIZE_FOR_TYPICAL: usize = 6;

/// Cap on numerator subset size in [`append_palette_ratio_issues`] when the number of checkable
/// targets exceeds [`HIGHER_ORDER_CANDIDATE_LIMIT`].
///
/// This lets it catch  3-key infeasibilities that no pair alone reveals, while keeping the runtime
/// manageable for the worst-case scenario cases of ~80 keys.
///
/// **Note:** The exhaustive search grows as `O(n^k)`, so increasing this number can be
/// prohibitively expensive for higher target counts. With a cap of 3, the worst-case scenario of
/// ~80 keys runs in ~85 ms. That increases to ~1.1s with a cap of 4.
pub const MAX_NUM_GROUP_SIZE_FOR_HIGHER_ORDER: usize = 3;

/// The number of checkable targets above which the numerator subset-size cap in
/// [`append_palette_ratio_issues`] is set to [`MAX_NUM_GROUP_SIZE_FOR_HIGHER_ORDER`].
pub const HIGHER_ORDER_CANDIDATE_LIMIT: usize = 20;
