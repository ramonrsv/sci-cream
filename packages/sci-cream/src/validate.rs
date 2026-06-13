//! Functions and framework for validating data structures and values across sci-cream.
//!
//! This module defines the [`Validate`] trait for validating complex data structures, e.g.
//! [`Composition`] and [`IngredientSpec`]s, as well as `verify_*` utility functions for common
//! validation tasks such as checking if values are positive or within certain ranges. This
//! functionality is used at interface boundaries to ensure that inputs are valid and sound.
//!
//! # Examples
//!
//! ```
//! use sci_cream::{
//!     error::{Result, Error},
//!     validate::{verify_are_positive, verify_is_within_100_percent}
//! };
//!
//! fn foo() -> Result<()> {
//!     verify_are_positive(&[1.0, 2.0, 3.0])?;
//!     verify_is_within_100_percent(50.0)?;
//!     Ok(())
//! }
//! ```

use approx::AbsDiffEq;

use crate::{
    constants::COMPOSITION_EPSILON,
    error::{Error, Result},
};

#[cfg(doc)]
use crate::{composition::Composition, specs::IngredientSpec};

/// Trait for validating complex data structures, e.g. [`Composition`] and [`IngredientSpec`]s.
///
/// Implementors should define the `validate` method to perform necessary checks and return a
/// [`Result`] indicating success or failure of the validation. Validation should be cascaded to
/// nested structures as needed, and should be used at interface boundaries to validate inputs.
pub trait Validate {
    /// Validates the current instance and returns an [`Result`] indicating success or failure.
    ///
    /// # Errors
    ///
    /// Return an appropriate [`Error`] if validation fails, e.g. if values are out of range, if
    /// composition values do not add up to 100%, etc. Specific errors are implementation-dependent,
    /// and should provide detailed error messages to help identify the cause of validation.
    fn validate(&self) -> Result<()>;

    /// Validates the current instance and returns it in a [`Result`] if validation is successful.
    ///
    /// # Errors
    ///
    /// Return an appropriate [`Error`] if validation fails, e.g. if values are out of range, if
    /// composition values do not add up to 100%, etc. Specific errors are implementation-dependent,
    /// and should provide detailed error messages to help identify the cause of validation.
    fn validate_into(self) -> Result<Self>
    where
        Self: Sized,
    {
        self.validate()?;
        Ok(self)
    }
}

/// Checks whether two floating point values are equal within a [`COMPOSITION_EPSILON`] tolerance.
#[must_use]
pub fn are_equal_within_epsilon(a: f64, b: f64) -> bool {
    a.abs_diff_eq(&b, COMPOSITION_EPSILON)
}

/// Checks whether the given value is positive, within a [`COMPOSITION_EPSILON`] tolerance for zero.
#[must_use]
pub fn is_positive(value: f64) -> bool {
    value >= 0.0 || are_equal_within_epsilon(value, 0.0)
}

/// Verifies that all values in the given slice are positive (greater than or equal to zero).
///
/// # Errors
///
/// Return [`Error::CompositionNotPositive`] if any value is negative.
pub fn verify_are_positive(values: &[f64]) -> Result<()> {
    for &value in values {
        if !is_positive(value) {
            return Err(Error::CompositionNotPositive(value));
        }
    }
    Ok(())
}

/// Checks whether the given value is between 0 and 100 (inclusive).
#[must_use]
pub fn is_within_100_percent(value: f64) -> bool {
    ((0.0 - COMPOSITION_EPSILON)..=(100.0 + COMPOSITION_EPSILON)).contains(&value)
}

/// Verifies that the given value is between 0 and 100 (inclusive).
///
/// # Errors
///
/// Return [`Error::CompositionNotWithin100Percent`] if the value is not between 0 and 100.
pub fn verify_is_within_100_percent(value: f64) -> Result<()> {
    if is_within_100_percent(value) {
        Ok(())
    } else {
        Err(Error::CompositionNotWithin100Percent(value))
    }
}

/// Verifies that the given value is exactly 100 (within floating point precision limits).
///
/// # Errors
///
/// Return [`Error::CompositionNot100Percent`] if the value is not 100.
pub fn verify_is_100_percent(value: f64) -> Result<()> {
    if value.abs_diff_eq(&100.0, COMPOSITION_EPSILON) {
        Ok(())
    } else {
        Err(Error::CompositionNot100Percent(value))
    }
}

/// Checks whether the given subset value is less than or equal to the superset value.
///
/// The comparison is epsilon-aware: a `subset` that exceeds `superset` by no more than
/// [`COMPOSITION_EPSILON`] is still considered a subset.
#[must_use]
pub fn is_subset(subset: f64, superset: f64) -> bool {
    subset <= superset || subset.abs_diff_eq(&superset, COMPOSITION_EPSILON)
}

/// Verifies that the given subset value is less than or equal to the superset value.
///
/// # Errors
///
/// Return [`Error::InvalidComposition`] if the subset value is greater than the superset value.
pub fn verify_is_subset(subset: f64, superset: f64, description: &str) -> Result<()> {
    if is_subset(subset, superset) {
        Ok(())
    } else {
        Err(Error::InvalidComposition(format!("{description}: {subset} > {superset}")))
    }
}

/// Checks whether `value` lies within the inclusive range `[min, max]`.
///
/// Each bound is compared with [`is_subset`], so the check is epsilon-aware: a `value` outside the
/// range by no more than [`COMPOSITION_EPSILON`] is still considered within it.
#[must_use]
pub fn is_within_range(value: f64, min: f64, max: f64) -> bool {
    is_subset(min, value) && is_subset(value, max)
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn must_use_functionality() {
        #[expect(unused_must_use)]
        verify_is_within_100_percent(50.0);
    }

    // --- are_equal_within_epsilon ---

    #[test]
    fn are_equal_within_epsilon_true_for_equal_values() {
        assert_true!(are_equal_within_epsilon(1.0, 1.0));
    }

    #[test]
    fn are_equal_within_epsilon_true_for_both_zero() {
        assert_true!(are_equal_within_epsilon(0.0, 0.0));
    }

    #[test]
    fn are_equal_within_epsilon_true_within_epsilon() {
        // 1e-14 difference is within COMPOSITION_EPSILON (1e-13)
        assert_true!(are_equal_within_epsilon(1.0, 1.0 + 1e-14));
    }

    #[test]
    fn are_equal_within_epsilon_false_beyond_epsilon() {
        // 1e-12 difference exceeds COMPOSITION_EPSILON (1e-13)
        assert_false!(are_equal_within_epsilon(1.0, 1.0 + 1e-12));
    }

    #[test]
    fn are_equal_within_epsilon_false_for_clearly_different_values() {
        assert_false!(are_equal_within_epsilon(1.0, 2.0));
    }

    // --- is_positive ---

    #[test]
    fn is_positive_true_for_positive_value() {
        assert_true!(is_positive(1.0));
    }

    #[test]
    fn is_positive_true_for_zero() {
        assert_true!(is_positive(0.0));
    }

    #[test]
    fn is_positive_true_for_tiny_negative_within_epsilon() {
        // -1e-14 is within COMPOSITION_EPSILON (1e-13), treated as zero
        assert_true!(is_positive(-1e-14));
    }

    #[test]
    fn is_positive_false_for_negative_beyond_epsilon() {
        // -1e-12 exceeds COMPOSITION_EPSILON (1e-13), treated as negative
        assert_false!(is_positive(-1e-12));
    }

    #[test]
    fn is_positive_false_for_clearly_negative_value() {
        assert_false!(is_positive(-1.0));
    }

    // --- verify_are_positive ---

    #[test]
    fn verify_are_positive_ok_with_empty_slice() {
        assert!(verify_are_positive(&[]).is_ok());
    }

    #[test]
    fn verify_are_positive_ok_with_all_positive() {
        assert!(verify_are_positive(&[0.0, 1.0, 50.0, 100.0]).is_ok());
    }

    #[test]
    fn verify_are_positive_ok_with_tiny_negative_within_epsilon() {
        // -1e-14 is within COMPOSITION_EPSILON (1e-13), so treated as zero
        assert!(verify_are_positive(&[-1e-14]).is_ok());
    }

    #[test]
    fn verify_are_positive_err_with_negative_value() {
        assert!(matches!(
            verify_are_positive(&[-1.0]),
            Err(Error::CompositionNotPositive(v)) if v == -1.0
        ));
    }

    #[test]
    fn verify_are_positive_err_with_negative_beyond_epsilon() {
        // -1e-12 is outside COMPOSITION_EPSILON (1e-13), so treated as truly negative
        assert!(matches!(verify_are_positive(&[-1e-12]), Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn verify_are_positive_err_stops_at_first_negative() {
        // Only the first negative value is reported
        assert!(matches!(
            verify_are_positive(&[1.0, -5.0, -3.0]),
            Err(Error::CompositionNotPositive(v)) if v == -5.0
        ));
    }

    // --- is_within_100_percent ---

    #[test]
    fn is_within_100_percent_true_for_zero() {
        assert_true!(is_within_100_percent(0.0));
    }

    #[test]
    fn is_within_100_percent_true_for_100() {
        assert_true!(is_within_100_percent(100.0));
    }

    #[test]
    fn is_within_100_percent_true_for_midpoint() {
        assert_true!(is_within_100_percent(50.0));
    }

    #[test]
    fn is_within_100_percent_true_for_tiny_negative_within_epsilon() {
        // -1e-14 is within the lower epsilon boundary (-1e-13)
        assert_true!(is_within_100_percent(-1e-14));
    }

    #[test]
    fn is_within_100_percent_true_for_slightly_above_100_within_epsilon() {
        // 100.0 + 1e-14 is within the upper epsilon boundary (100.0 + 1e-13)
        assert_true!(is_within_100_percent(100.0 + 1e-14));
    }

    #[test]
    fn is_within_100_percent_false_for_negative() {
        assert_false!(is_within_100_percent(-1.0));
    }

    #[test]
    fn is_within_100_percent_false_for_above_100() {
        assert_false!(is_within_100_percent(101.0));
    }

    // --- verify_is_within_100_percent ---

    #[test]
    fn verify_is_within_100_percent_ok_for_valid_values() {
        assert!(verify_is_within_100_percent(0.0).is_ok());
        assert!(verify_is_within_100_percent(50.0).is_ok());
        assert!(verify_is_within_100_percent(100.0).is_ok());
    }

    #[test]
    fn verify_is_within_100_percent_err_for_negative() {
        assert!(matches!(
            verify_is_within_100_percent(-5.0),
            Err(Error::CompositionNotWithin100Percent(v)) if v == -5.0
        ));
    }

    #[test]
    fn verify_is_within_100_percent_err_for_above_100() {
        assert!(matches!(
            verify_is_within_100_percent(105.0),
            Err(Error::CompositionNotWithin100Percent(v)) if v == 105.0
        ));
    }

    // --- verify_is_100_percent ---

    #[test]
    fn verify_is_100_percent_ok_for_exact() {
        assert!(verify_is_100_percent(100.0).is_ok());
    }

    #[test]
    fn verify_is_100_percent_ok_within_epsilon() {
        // 100.0 + 1e-14 is within COMPOSITION_EPSILON (1e-13)
        assert!(verify_is_100_percent(100.0 + 1e-14).is_ok());
    }

    #[test]
    fn verify_is_100_percent_err_for_zero() {
        assert!(matches!(
            verify_is_100_percent(0.0),
            Err(Error::CompositionNot100Percent(v)) if v == 0.0
        ));
    }

    #[test]
    fn verify_is_100_percent_err_for_close_but_not_equal() {
        // 99.9 is clearly not 100 within epsilon
        assert!(matches!(
            verify_is_100_percent(99.9),
            Err(Error::CompositionNot100Percent(v)) if (v - 99.9).abs() < 1e-9
        ));
    }

    #[test]
    fn verify_is_100_percent_err_for_beyond_epsilon() {
        // 100.0 + 1e-12 exceeds COMPOSITION_EPSILON (1e-13)
        assert!(matches!(verify_is_100_percent(100.0 + 1e-12), Err(Error::CompositionNot100Percent(_))));
    }

    // --- is_subset ---

    #[test]
    fn is_subset_true_when_less_than_superset() {
        assert_true!(is_subset(10.0, 20.0));
    }

    #[test]
    fn is_subset_true_when_equal_to_superset() {
        assert_true!(is_subset(20.0, 20.0));
    }

    #[test]
    fn is_subset_true_when_exceeds_superset_within_epsilon() {
        // subset is 1e-14 greater than superset, which is within COMPOSITION_EPSILON (1e-13)
        assert_true!(is_subset(20.0 + 1e-14, 20.0));
    }

    #[test]
    fn is_subset_false_when_greater_than_superset() {
        assert_false!(is_subset(30.0, 20.0));
    }

    #[test]
    fn is_subset_false_when_exceeds_superset_beyond_epsilon() {
        // subset is 1e-12 greater than superset, which exceeds COMPOSITION_EPSILON (1e-13)
        assert_false!(is_subset(20.0 + 1e-12, 20.0));
    }

    // --- is_within_range ---

    #[test]
    fn is_within_range_true_for_value_inside() {
        assert_true!(is_within_range(15.0, 10.0, 20.0));
    }

    #[test]
    fn is_within_range_true_at_bounds() {
        assert_true!(is_within_range(10.0, 10.0, 20.0));
        assert_true!(is_within_range(20.0, 10.0, 20.0));
    }

    #[test]
    fn is_within_range_true_just_outside_within_epsilon() {
        // 1e-14 beyond either bound is within COMPOSITION_EPSILON (1e-13)
        assert_true!(is_within_range(10.0 - 1e-14, 10.0, 20.0));
        assert_true!(is_within_range(20.0 + 1e-14, 10.0, 20.0));
    }

    #[test]
    fn is_within_range_false_below_min() {
        assert_false!(is_within_range(5.0, 10.0, 20.0));
    }

    #[test]
    fn is_within_range_false_above_max() {
        assert_false!(is_within_range(25.0, 10.0, 20.0));
    }

    #[test]
    fn is_within_range_false_just_outside_beyond_epsilon() {
        // 1e-12 beyond either bound exceeds COMPOSITION_EPSILON (1e-13)
        assert_false!(is_within_range(10.0 - 1e-12, 10.0, 20.0));
        assert_false!(is_within_range(20.0 + 1e-12, 10.0, 20.0));
    }

    // --- verify_is_subset ---

    #[test]
    fn verify_is_subset_ok_when_less_than_superset() {
        assert!(verify_is_subset(10.0, 20.0, "test").is_ok());
    }

    #[test]
    fn verify_is_subset_ok_when_equal_to_superset() {
        assert!(verify_is_subset(20.0, 20.0, "test").is_ok());
    }

    #[test]
    fn verify_is_subset_ok_when_exceeds_superset_within_epsilon() {
        // subset is 1e-14 greater than superset, which is within COMPOSITION_EPSILON (1e-13)
        assert!(verify_is_subset(20.0 + 1e-14, 20.0, "test").is_ok());
    }

    #[test]
    fn verify_is_subset_err_when_greater_than_superset() {
        assert!(matches!(verify_is_subset(30.0, 20.0, "test"), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn verify_is_subset_err_message_contains_description() {
        let desc = "my_field";
        let result = verify_is_subset(30.0, 20.0, desc);
        assert!(matches!(result, Err(Error::InvalidComposition(ref msg)) if msg.contains(desc)));
    }

    #[test]
    fn verify_is_subset_err_message_contains_values() {
        let result = verify_is_subset(30.0, 20.0, "desc");
        assert!(matches!(result, Err(Error::InvalidComposition(ref msg)) if msg.contains("30") && msg.contains("20")));
    }

    // --- Validate trait ---

    struct AlwaysValid;

    impl Validate for AlwaysValid {
        fn validate(&self) -> Result<()> {
            Ok(())
        }
    }

    struct AlwaysInvalid;

    impl Validate for AlwaysInvalid {
        fn validate(&self) -> Result<()> {
            Err(Error::InvalidComposition("always invalid".into()))
        }
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        assert!(AlwaysValid.validate_into().is_ok());
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(AlwaysInvalid.validate_into().is_err());
    }
}
