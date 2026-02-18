//! Miscellaneous utility functions used in tests across the codebase.

use approx::AbsDiffEq;

use crate::composition::{CompKey, Composition};

#[expect(unused_imports)]
use crate::tests::asserts::shadow_asserts::assert_eq;
use crate::tests::asserts::*;

/// Asserts that two composition values for a key are equal within a given percentage tolerance.
pub(crate) fn assert_comp_eq_percent(lhs: &Composition, rhs: &Composition, key: CompKey, tolerance_percent: f64) {
    let lhs = lhs.get(key);
    let rhs = rhs.get(key);
    let tolerance = lhs * tolerance_percent / 100.0;

    assert_true!(
        lhs.abs_diff_eq(&rhs, tolerance),
        "Composition values for {:?} differ by {:.2}% (max allowed {:.2}%)",
        key,
        ((lhs - rhs).abs() / lhs) * 100.0,
        tolerance_percent
    );
}
