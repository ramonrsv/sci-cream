//! Tolerances for comparing floating-point values
//!
//! The tolerances of particular algorithms stay with them, where their documentation explains
//! them: [`SVD_SOLVE_EPSILON`], [`LOCKED_TOTAL_TOLERANCE`], and [`RATIO_REWEIGHT_TOLERANCE`] for
//! balancing, and `DAIRY_SERVING_SOLVER_TOLERANCE` for dairy densities.

#[cfg(doc)]
use crate::{
    asserts::{assert_eq_4dp, assert_eq_6dp, assert_eq_flt},
    constants::balancing::{LOCKED_TOTAL_TOLERANCE, RATIO_REWEIGHT_TOLERANCE, SVD_SOLVE_EPSILON},
};

/// Epsilon value for floating point comparisons of compositions, e.g. water content
pub const COMPOSITION_EPSILON: f64 = 1e-13;

/// Units in the last place within which [`assert_eq_flt!`] takes two values as the same, up to
/// floating-point noise; approx's default for `ulps_eq`
pub const MAX_ULPS: u32 = 4;

/// Half a unit in the sixth decimal, [`assert_eq_6dp!`]'s bound: the most a value correctly
/// rounded to six decimals is off by, the precision of tests' expected values and key tables
pub const EPSILON_6DP: f64 = 5e-7;

/// Half a unit in the fourth decimal, [`assert_eq_4dp!`]'s bound: the most a value correctly
/// rounded to four decimals is off by, the precision of doc examples
pub const EPSILON_4DP: f64 = 5e-5;

/// Allowance added to [`EPSILON_6DP`] and [`EPSILON_4DP`] for floating-point noise, at a value
/// exactly halfway between two written ones: four units in the last place of values up to 100,000
pub const TIE_ALLOWANCE: f64 = 1e-10;
