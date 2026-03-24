//! [`Fats`] and associated functionality to represent the fat composition of an ingredient or mix,
//! reflecting the breakdown in nutrition facts labels

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    constants,
    error::Result,
    util::{collect_fields_copied_as, iter_all_abs_diff_eq},
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Breakdown of fat components, reflecting the standard nutrition facts labelling
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Fats {
    /// Total fat content
    pub total: f64,
    /// Saturated fat content, a subset of total fat content; should be <= [`Fats::total`]
    pub saturated: f64,
    /// Trans fat content, a subset of total fat content; should be <= [`Fats::total`]
    pub trans: f64,
}

impl Fats {
    /// Creates an empty [`Fats`] struct with all fields set to zero
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            total: 0.0,
            saturated: 0.0,
            trans: 0.0,
        }
    }

    /// Creates a new empty `Fats` struct, forwards to [`Fats::empty`]
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`total`](Self::total)
    #[must_use]
    pub const fn total(self, total: f64) -> Self {
        Self { total, ..self }
    }

    /// Field-update method for [`saturated`](Self::saturated)
    #[must_use]
    pub const fn saturated(self, saturated: f64) -> Self {
        Self { saturated, ..self }
    }

    /// Field-update method for [`trans`](Self::trans)
    #[must_use]
    pub const fn trans(self, trans: f64) -> Self {
        Self { trans, ..self }
    }

    /// Calculates the total energy contributed by the fats, in kcal per 100g of mix
    #[must_use]
    pub fn energy(&self) -> f64 {
        self.total * constants::energy::FATS
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Fats {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl Validate for Fats {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total)?;
        verify_is_subset(self.saturated, self.total, "saturated <= total")?;
        verify_is_subset(self.trans, self.total, "trans <= total")?;
        Ok(())
    }
}

impl ScaleComponents for Fats {
    fn scale(&self, factor: f64) -> Self {
        Self {
            total: self.total * factor,
            saturated: self.saturated * factor,
            trans: self.trans * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            total: self.total + other.total,
            saturated: self.saturated + other.saturated,
            trans: self.trans + other.trans,
        }
    }
}

impl AbsDiffEq for Fats {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Fats {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use super::*;
    use crate::error::Error;

    const FIELD_MODIFIERS: [fn(&mut Fats, f64); 3] =
        [|f, v| f.total += v, |f, v| f.saturated += v, |f, v| f.trans += v];

    #[test]
    fn fats_field_count() {
        assert_eq!(Fats::new().iter().count(), 3);
    }

    #[test]
    fn fats_no_fields_missed() {
        assert_eq!(Fats::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn fats_empty() {
        let fats = Fats::empty();
        assert_eq!(fats, Fats::new());
        assert_eq!(fats, Fats::default());

        assert_eq!(fats.total, 0.0);
        assert_eq!(fats.saturated, 0.0);
        assert_eq!(fats.trans, 0.0);

        assert_eq!(fats.energy(), 0.0);
    }

    #[test]
    fn fats_field_update_methods() {
        let fats = Fats::new().total(10.0).saturated(5.0).trans(1.0);

        assert_eq!(fats.total, 10.0);
        assert_eq!(fats.saturated, 5.0);
        assert_eq!(fats.trans, 1.0);
    }

    #[test]
    fn fats_energy() {
        let fats = Fats::new().total(100.0).saturated(30.0).trans(2.0);
        assert_ne!(fats.energy(), 0.0);
        assert_eq!(fats.energy(), 100.0 * 9.0);
    }

    #[test]
    fn fats_scale() {
        let fats = Fats::new().total(10.0).saturated(5.0).trans(1.0);

        let scaled = fats.scale(0.5);
        assert_eq!(scaled.total, 5.0);
        assert_eq!(scaled.saturated, 2.5);
        assert_eq!(scaled.trans, 0.5);
    }

    #[test]
    fn fats_add() {
        let a = Fats::new().total(10.0).saturated(5.0).trans(1.0);
        let b = Fats::new().total(4.0).saturated(2.0).trans(0.5);

        let sum = a.add(&b);
        assert_eq!(sum.total, 14.0);
        assert_eq!(sum.saturated, 7.0);
        assert_eq!(sum.trans, 1.5);
    }

    #[test]
    fn fats_abs_diff_eq() {
        let a = Fats::new().total(10.0).saturated(5.0).trans(1.0);
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_ne!(v.total, 0.0);
            assert_ne!(v.saturated, 0.0);
            assert_ne!(v.trans, 0.0);
        }

        assert_abs_diff_eq!(a, b);
        assert_abs_diff_eq!(a, c);

        for field_modifier in FIELD_MODIFIERS {
            assert_abs_diff_eq!(a, c);
            field_modifier(&mut c, 1e-10);
            assert_abs_diff_ne!(a, c);
            field_modifier(&mut c, -1e-10);
            assert_abs_diff_eq!(a, c);
        }
    }

    // --- Validate ---

    #[test]
    fn validate_ok_for_empty() {
        assert!(Fats::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(Fats::new().total(10.0).saturated(4.0).trans(1.0).validate().is_ok());
    }

    #[test]
    fn validate_ok_when_total_is_exactly_100() {
        assert!(Fats::new().total(100.0).saturated(50.0).trans(10.0).validate().is_ok());
    }

    #[test]
    fn validate_ok_when_subsets_equal_total() {
        // saturated == total and trans == total are both valid boundary cases
        assert!(Fats::new().total(10.0).saturated(10.0).trans(0.0).validate().is_ok());
        assert!(Fats::new().total(10.0).saturated(0.0).trans(10.0).validate().is_ok());
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut fats = Fats::empty();
            field_modifier(&mut fats, -1.0);
            assert!(matches!(fats.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_err_when_total_exceeds_100() {
        assert!(matches!(Fats::new().total(101.0).validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_err_when_saturated_exceeds_total() {
        assert!(matches!(Fats::new().total(10.0).saturated(11.0).validate(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn validate_err_when_trans_exceeds_total() {
        assert!(matches!(Fats::new().total(10.0).trans(11.0).validate(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let fats = Fats::new().total(10.0).saturated(4.0).trans(1.0);
        let result = fats.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().total, 10.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Fats::new().total(-1.0).validate_into().is_err());
    }
}
