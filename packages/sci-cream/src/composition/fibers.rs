//! [`Fibers`] struct and related functionality to represent the dietary fiber composition of an
//! ingredient or mix, including specific tracking of specific subgroups

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    constants,
    error::Result,
    util::{collect_fields_copied_as, iter_all_abs_diff_eq, iter_fields_as},
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Represents the dietary fiber composition of a mix or ingredient, including tracking of specific
/// subgroups of fibers such as inulin and oligofructose
///
/// Dietary fiber is a diverse group of compounds, including complex carbohydrates, which cannot be
/// digested by human enzymes in the small intestine. They can be classified according to their
/// solubility, viscosity, and fermentability. Consumption of dietary fiber is associated with
/// a multitude of health benefits (Higdon, 2019)[^34]. In ice cream making certain types of fiber,
/// most notably inulin and oligofructose, can be used as substitutes for sugars and fats, providing
/// similar functional properties along with several health-promoting properties (Porto, 2026)[^27].
#[doc = include_str!("../../docs/bibs/27.md")]
#[doc = include_str!("../../docs/bibs/34.md")]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Fibers {
    /// Inulin is a type of soluble fiber found in many plants, with useful functional properties
    ///
    /// It is commonly extracted from chicory root for use in food products. It provides similar
    /// functional properties to fats in ice cream, while offering health benefits like promoting
    /// gut health and aiding in blood sugar regulation (Niness, 1999)[^24], (Porto, 2026)[^27].
    #[doc = include_str!("../../docs/bibs/24.md")]
    #[doc = include_str!("../../docs/bibs/27.md")]
    pub inulin: f64,
    /// Oligofructose is a type of soluble fiber that is chemically similar to inulin, but with a
    /// shorter chain length
    ///
    /// Like inulin, it is commonly extracted from chicory root. The major difference is the
    /// addition of a hydrolysis step after extraction, which breaks down some of the inulin into
    /// shorter chains, with lengths ranging from 2 to 10. This results in a compound with ~30-40%
    /// the sweetness of sucrose (Niness, 1999)[^24]. It can be used to replace some of the sugars
    /// in ice cream formulations, while also providing health benefits (Porto, 2026)[^27].
    #[doc = include_str!("../../docs/bibs/24.md")]
    #[doc = include_str!("../../docs/bibs/27.md")]
    pub oligofructose: f64,
    /// Any other types of dietary fiber not explicitly tracked by the other fields
    ///
    /// **Note*: This field is intentionally ignored in [`energy`](Self::energy) and
    /// [`to_pod`](Self::to_pod), as most types of fiber do not contribute to energy or POD.
    pub other: f64,
}

impl Fibers {
    /// Creates an empty `Fibers` struct with all fields set to zero (i.e. 0g of all fibers)
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            inulin: 0.0,
            oligofructose: 0.0,
            other: 0.0,
        }
    }

    /// Creates a new empty `Fibers` struct, forwards to [`Fibers::empty`]
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`inulin`](Fibers::inulin)
    #[must_use]
    pub const fn inulin(self, inulin: f64) -> Self {
        Self { inulin, ..self }
    }

    /// Field-update method for [`oligofructose`](Fibers::oligofructose)
    #[must_use]
    pub const fn oligofructose(self, oligofructose: f64) -> Self {
        Self { oligofructose, ..self }
    }

    /// Field-update method for [`other`](Fibers::other)
    #[must_use]
    pub const fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total fiber content, in grams per 100g of mix, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    /// Calculates the total energy contributed by the fibers, in kcal per 100g of mix
    ///
    /// **Note**: This method intentionally omits the [`other`](Fibers::other) field, as most types
    /// of fiber are indigestible and therefore do not contribute to energy.
    #[must_use]
    pub fn energy(&self) -> f64 {
        // `other` is intentionally omitted; see docs above
        (self.inulin + self.oligofructose) * constants::energy::INULIN_AND_OLIGOFRUCTOSE
    }

    /// Calculates the [POD](crate::docs#pod) contributions of the fibers, in terms of sucrose
    /// equivalence
    ///
    /// **Note**: This method intentionally omits the [`other`](Fibers::other) field, as most types
    /// of fiber do not contribute to POD.
    #[must_use]
    pub fn to_pod(&self) -> f64 {
        // `other` is intentionally omitted; see docs above
        (self.inulin * constants::pod::INULIN + self.oligofructose * constants::pod::OLIGOFRUCTOSE) / 100.0
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Fibers {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl Validate for Fibers {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl ScaleComponents for Fibers {
    fn scale(&self, factor: f64) -> Self {
        Self {
            inulin: self.inulin * factor,
            oligofructose: self.oligofructose * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            inulin: self.inulin + other.inulin,
            oligofructose: self.oligofructose + other.oligofructose,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Fibers {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Fibers {
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

    const FIELD_MODIFIERS: [fn(&mut Fibers, f64); 3] =
        [|f, v| f.inulin += v, |f, v| f.oligofructose += v, |f, v| f.other += v];

    #[test]
    fn fibers_field_count() {
        assert_eq!(Fibers::new().iter().count(), 3);
    }

    #[test]
    fn fibers_no_fields_missed() {
        assert_eq!(Fibers::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn fibers_empty() {
        let fibers = Fibers::empty();
        assert_eq!(fibers, Fibers::new());
        assert_eq!(fibers, Fibers::default());

        assert_eq!(fibers.inulin, 0.0);
        assert_eq!(fibers.oligofructose, 0.0);
        assert_eq!(fibers.other, 0.0);

        assert_eq!(fibers.total(), 0.0);
        assert_eq!(fibers.energy(), 0.0);
        assert_eq!(fibers.to_pod(), 0.0);
    }

    #[test]
    fn fibers_field_update_methods() {
        let fibers = Fibers::new().inulin(5.0).oligofructose(3.0).other(2.0);

        assert_eq!(fibers.inulin, 5.0);
        assert_eq!(fibers.oligofructose, 3.0);
        assert_eq!(fibers.other, 2.0);
    }

    #[test]
    fn fibers_total() {
        assert_eq!(Fibers::new().inulin(5.0).oligofructose(3.0).other(2.0).total(), 10.0);
    }

    #[test]
    fn fibers_energy() {
        let fibers = Fibers::new().inulin(10.0).oligofructose(5.0).other(100.0);
        assert_ne!(fibers.energy(), 0.0);
        assert_eq!(fibers.energy(), /* `other` intentionally omitted */ (10.0 + 5.0) * 1.5);
    }

    #[test]
    fn fibers_to_pod() {
        assert_eq!(Fibers::new().inulin(10.0).other(100.0).to_pod(), 0.0);
        assert_eq!(
            Fibers::new().inulin(10.0).oligofructose(10.0).other(100.0).to_pod(),
            /* `other` and `inulin` intentionally omitted */
            10.0 * 40.0 / 100.0
        );
    }

    #[test]
    fn fibers_scale() {
        let fibers = Fibers::new().inulin(6.0).oligofructose(4.0).other(2.0);
        assert_eq!(fibers.total(), 12.0);

        let scaled = fibers.scale(0.5);
        assert_eq!(scaled.inulin, 3.0);
        assert_eq!(scaled.oligofructose, 2.0);
        assert_eq!(scaled.other, 1.0);
        assert_eq!(scaled.total(), 6.0);
    }

    #[test]
    fn fibers_add() {
        let a = Fibers::new().inulin(6.0).oligofructose(4.0).other(2.0);
        let b = Fibers::new().inulin(1.0).oligofructose(2.0).other(3.0);

        let sum = a.add(&b);
        assert_eq!(sum.inulin, 7.0);
        assert_eq!(sum.oligofructose, 6.0);
        assert_eq!(sum.other, 5.0);
        assert_eq!(sum.total(), 18.0);
    }

    #[test]
    fn fibers_abs_diff_eq() {
        let a = Fibers::new().inulin(6.0).oligofructose(4.0).other(2.0);
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_ne!(v.inulin, 0.0);
            assert_ne!(v.oligofructose, 0.0);
            assert_ne!(v.other, 0.0);
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
        assert!(Fibers::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(
            Fibers::new()
                .inulin(5.0)
                .oligofructose(3.0)
                .other(2.0)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_ok_when_total_is_exactly_100() {
        assert!(
            Fibers::new()
                .inulin(50.0)
                .oligofructose(30.0)
                .other(20.0)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut fibers = Fibers::empty();
            field_modifier(&mut fibers, -1.0);
            assert!(matches!(fibers.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_err_when_total_exceeds_100() {
        assert!(matches!(Fibers::new().inulin(101.0).validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_err_when_multiple_fields_sum_exceeds_100() {
        assert!(matches!(
            Fibers::new().inulin(60.0).oligofructose(60.0).validate(),
            Err(Error::CompositionNotWithin100Percent(_))
        ));
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let fibers = Fibers::new().inulin(5.0).oligofructose(3.0);
        let result = fibers.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().inulin, 5.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Fibers::new().inulin(-1.0).validate_into().is_err());
    }
}
