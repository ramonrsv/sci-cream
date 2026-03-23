//! [`Alcohol`] struct and associated trait implementations, for tracking alcohol content

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, constants, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Struct representing the alcohol (ethanol) content of a mix, in terms of percentage by weight.
///
/// It also provides methods to convert between alcohol by weight (ABW) and alcohol by volume (ABV)
/// (2025)[^8], as well as to calculate the energy and PAC contributions of the alcohol content.
#[doc = include_str!("../../docs/bibs/8.md")]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Alcohol {
    /// Alcohol content by weight, in grams of alcohol per 100g of total ingredient/mix
    pub by_weight: f64,
}

impl Alcohol {
    /// Creates an empty `Alcohol` struct with all fields set to zero (i.e. 0% alcohol by weight)
    #[must_use]
    pub const fn empty() -> Self {
        Self { by_weight: 0.0 }
    }

    /// Creates a new empty `Alcohol` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Creates a new `Alcohol` struct with the specified alcohol content by weight
    #[must_use]
    pub const fn by_weight(self, by_weight: f64) -> Self {
        Self { by_weight }
    }

    /// Creates a new `Alcohol` struct with the specified alcohol content by volume (ABV)
    #[must_use]
    pub fn from_abv(abv: f64) -> Self {
        Self {
            by_weight: abv * constants::density::ABV_TO_ABW_RATIO,
        }
    }

    /// Calculates the total energy contribution of the alcohol content, in kcal per 100g of mix
    #[must_use]
    pub fn energy(&self) -> f64 {
        self.by_weight * constants::energy::ALCOHOL
    }

    /// Converts the alcohol content from percentage by weight to percentage by volume (ABV)
    #[must_use]
    pub fn to_abv(&self) -> f64 {
        self.by_weight / constants::density::ABV_TO_ABW_RATIO
    }

    /// Calculates the PAC contribution of the alcohol content, in terms of sucrose equivalence
    #[must_use]
    pub fn to_pac(&self) -> f64 {
        self.by_weight * constants::pac::ALCOHOL / 100.0
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Alcohol {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl ScaleComponents for Alcohol {
    fn scale(&self, factor: f64) -> Self {
        Self {
            by_weight: self.by_weight * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            by_weight: self.by_weight + other.by_weight,
        }
    }
}

impl AbsDiffEq for Alcohol {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Alcohol {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn alcohol_field_count() {
        assert_eq!(Alcohol::new().iter().count(), 1);
    }

    #[test]
    fn alcohol_empty() {
        let alcohol = Alcohol::empty();
        assert_eq!(alcohol, Alcohol::new());
        assert_eq!(alcohol, Alcohol::default());

        assert_eq!(alcohol.by_weight, 0.0);
        assert_eq!(alcohol.to_abv(), 0.0);
        assert_eq!(alcohol.energy(), 0.0);
        assert_eq!(alcohol.to_pac(), 0.0);
    }

    #[test]
    fn alcohol_by_weight() {
        let alcohol = Alcohol::new().by_weight(5.0);
        assert_eq!(alcohol.by_weight, 5.0);
        assert_eq_flt_test!(alcohol.to_abv(), 6.3371);
        assert_eq!(alcohol.energy(), 34.65);
        assert_eq!(alcohol.to_pac(), 37.15);
    }

    #[test]
    fn alcohol_from_abv() {
        let alcohol = Alcohol::from_abv(5.0);
        assert_eq_flt_test!(alcohol.by_weight, 3.945);
        assert_eq_flt_test!(alcohol.to_abv(), 5.0);
        assert_eq_flt_test!(alcohol.energy(), 27.3389);
        assert_eq_flt_test!(alcohol.to_pac(), 29.3114);
    }

    #[test]
    fn alcohol_scale() {
        let alcohol = Alcohol::new().by_weight(5.0);
        let scaled = alcohol.scale(0.5);
        assert_eq!(scaled.by_weight, 2.5);
    }

    #[test]
    fn alcohol_add() {
        let a = Alcohol::new().by_weight(5.0);
        let b = Alcohol::new().by_weight(3.0);
        assert_eq!(a.add(&b).by_weight, 8.0);
    }

    #[test]
    fn alcohol_abs_diff_eq() {
        let a = Alcohol::new().by_weight(5.0);
        let b = Alcohol::new().by_weight(5.0);
        let c = Alcohol::new().by_weight(5.0 + 1e-10);
        assert_abs_diff_eq!(a, b);
        assert_abs_diff_ne!(a, c);
    }
}
