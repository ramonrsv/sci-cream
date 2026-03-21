//! Miscellaneous utility functions used in tests across the codebase.

use approx::AbsDiffEq;
use struct_iterable::Iterable;

use crate::{
    composition::{CompKey, Composition},
    util::iter_fields_as,
};

use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
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

/// Asserts that all fields of an [`Iterable`] downcast to [`f64`] are equal to zero
pub(crate) fn assert_f64_fields_eq_zero<T: Iterable>(iterable: &T) {
    #[allow(clippy::float_cmp)] // We want to check for exact equality after init
    for field in iter_fields_as::<f64, _>(iterable) {
        assert_eq!(field, &0.0);
    }
}

/// Asserts that all fields of an [`Iterable`] downcast to [`f64`] are not equal to zero
pub(crate) fn assert_f64_fields_ne_zero<T: Iterable>(iterable: &T) {
    #[allow(clippy::float_cmp)] // We want to check for exact (in)equality after init
    for field in iter_fields_as::<f64, _>(iterable) {
        assert_ne!(field, &0.0);
    }
}
