//! Functions and framework for validating data structures and values across sci-cream.
//!
//! This module defines the [`Validate`] trait for validating complex data structures, e.g.
//! [`Composition`] and [`IngredientSpec`]s, as well as `assert_*` utility functions for common
//! validation tasks such as checking if values are positive or within certain ranges. This
//! functionality is used at interface boundaries to ensure that inputs are valid and sound.
//!
//! # Examples
//!
//! ```
//! use sci_cream::{
//!     error::{Result, Error},
//!     validate::{assert_are_positive, assert_within_100_percent}
//! };
//!
//! fn foo() -> Result<()> {
//!     assert_are_positive(&[1.0, 2.0, 3.0])?;
//!     assert_within_100_percent(50.0)?;
//!     Ok(())
//! }
//! ```

use crate::error::{Error, Result};

#[cfg(doc)]
use crate::{composition::Composition, specs::IngredientSpec};

/// Trait for validating complex data structures, e.g. [`Composition`] and [`IngredientSpec`]s.
///
/// Implementors should define the `validate` method to perform necessary checks and return a
/// [`Result`] indicating success or failure of the validation. Validation should be cascaded to
/// nested structures as needed, and should be used at interface boundaries to validate inputs.
pub trait Validate {
    /// Associated type of the validated value, e.g. [`Composition`] or [`IngredientSpec`].
    type Type;

    /// Validates the current instance and returns a [`Result`] indicating success or failure.
    fn validate(&self) -> Result<Self::Type>;
}

/// Asserts that all values in the given slice are positive (greater than or equal to zero).
///
/// # Errors
///
/// Return [`Error::CompositionNotPositive`] if any value is negative, with the first offending
/// value in the range included in the returned [`Error`].
pub fn assert_are_positive(values: &[f64]) -> Result<()> {
    for &value in values {
        if value < 0.0 {
            return Err(Error::CompositionNotPositive(value));
        }
    }
    Ok(())
}

/// Checks whether the given value is between 0 and 100 (inclusive).
#[must_use]
pub fn is_within_100_percent(value: f64) -> bool {
    (0.0..=100.0).contains(&value)
}

/// Asserts that the given value is between 0 and 100 (inclusive).
///
/// # Errors
///
/// Return [`Error::CompositionNotWithin100Percent`] if the value is not between 0 and 100, with the
/// offending value included in the returned [`Error`].
pub fn assert_within_100_percent(value: f64) -> Result<()> {
    if is_within_100_percent(value) {
        Ok(())
    } else {
        Err(Error::CompositionNotWithin100Percent(value))
    }
}

/// Asserts that the given value is exactly 100 (within floating point precision limits).
///
/// # Errors
///
/// Return [`Error::CompositionNot100Percent`] if the value is not 100, with the offending value
/// included in the returned [`Error`].
pub fn assert_is_100_percent(value: f64) -> Result<()> {
    if (value - 100.0).abs() < f64::EPSILON {
        Ok(())
    } else {
        Err(Error::CompositionNot100Percent(value))
    }
}

/// Asserts that the given subset value is less than or equal to the superset value.
///
/// # Errors
///
/// Return [`Error::InvalidComposition`] if the subset value is greater than the superset value,
/// with a description and the offending values included in the returned [`Error`].
pub fn assert_is_subset(subset: f64, superset: f64, description: &str) -> Result<()> {
    if subset <= superset {
        Ok(())
    } else {
        Err(Error::InvalidComposition(format!("{description}: {subset} > {superset}")))
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use super::*;

    #[test]
    fn must_use_functionality() {
        #[expect(unused_must_use)]
        assert_within_100_percent(50.0);
    }
}
