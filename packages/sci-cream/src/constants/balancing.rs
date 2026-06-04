//! Constants used in the balancing process, e.g. for weighting and prioritization of targets, and
//! for fallback estimates when target values are missing or near zero.

#[cfg(doc)]
use crate::{
    balancing::{Priority, Weighting, balance_with_reweighting},
    composition::CompKey,
};

/// Floor applied to a target's magnitude before inverting it for [`Weighting::Relative`]
///
/// This is used so a zero or near-zero target (e.g. a recipe with no cocoa or stabilizer) yields a
/// large-but-finite weight instead of dividing by zero.
pub const RELATIVE_WEIGHT_FLOOR: f64 = 0.1;

/// Row-weight multiplier for a [`Priority::High`] target.
pub const HIGH_PRIORITY_WEIGHT: f64 = 5.0;

/// Row-weight multiplier for a [`Priority::Critical`] target.
pub const CRITICAL_PRIORITY_WEIGHT: f64 = 25.0;

/// Fixed weight on the total-sum (mass-balance) row under [`Weighting::Relative`].
///
/// Relative weighting scales every target row to roughly unit magnitude (each is divided by its own
/// target), so a single fixed weight well above 1 uniformly dominates them and keeps the balanced
/// amounts summing to 1 — independent of the target magnitudes.
pub const SUM_CONSTRAINT_WEIGHT: f64 = 1.0e3;

/// Floor applied to an estimated ratio denominator before inverting it for the relative weight of a
/// ratio target's homogeneous row, so a near-zero estimate yields a large-but-finite weight.
pub const RATIO_DENOMINATOR_FLOOR: f64 = 1.0;

/// Relative tolerance between a ratio target's seed and achieved denominator below which the second
/// (reweighting) solve is skipped; see [`balance_with_reweighting`].
pub const RATIO_REWEIGHT_TOLERANCE: f64 = 0.05;

/// Typical water content (g/100g) of a finished mix
///
/// This is used as the last-resort denominator estimate for water-denominated ratio targets
/// ([`CompKey::AbsPAC`], [`CompKey::StabilizersPerWater`]) when neither the denominator (`Water`)
/// nor a complementary `TotalSolids` target is given to infer it.
//
// @todo Find sources for this value.
pub const TYPICAL_MIX_WATER: f64 = 62.0;

/// Typical total fat content (g/100g) of a finished mix
///
/// This is used as the last-resort denominator estimate for [`CompKey::EmulsifiersPerFat`] when
/// neither `TotalFats` nor any component-fat target is given to infer it.
//
// @todo Find sources for this value.
pub const TYPICAL_MIX_FAT: f64 = 10.0;

/// Singular-value threshold for the nalgebra SVD solve in `balance_compositions_nalgebra`
///
/// Passed as the `eps` argument to nalgebra's `SVD::solve`: any singular value at or below it is
/// treated as zero (dropped from the inverse) when solving the least-squares system.
pub const SVD_SOLVE_EPSILON: f64 = 1e-10;
