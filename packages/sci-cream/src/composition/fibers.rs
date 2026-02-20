//! [`Fibers`] struct and related functionality to represent the dietary fiber composition of an
//! ingredient or mix, including specific tracking of specific subgroups

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    constants,
    error::Result,
    util::{iter_all_abs_diff_eq, iter_fields_as},
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
    pub fn empty() -> Self {
        Self {
            inulin: 0.0,
            oligofructose: 0.0,
            other: 0.0,
        }
    }

    /// Field-update method for [`inulin`](Fibers::inulin)
    #[must_use]
    pub fn inulin(self, inulin: f64) -> Self {
        Self { inulin, ..self }
    }

    /// Field-update method for [`oligofructose`](Fibers::oligofructose)
    #[must_use]
    pub fn oligofructose(self, oligofructose: f64) -> Self {
        Self { oligofructose, ..self }
    }

    /// Field-update method for [`other`](Fibers::other)
    #[must_use]
    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total energy contributed by the fibers, in kcal per 100g of mix
    ///
    /// **Note**: This method intentionally omits the [`other`](Fibers::other) field, as most types
    /// of fiber are indigestible and therefore do not contribute to energy.
    pub fn energy(&self) -> Result<f64> {
        // `other` is intentionally omitted; see docs above
        Ok((self.inulin + self.oligofructose) * constants::energy::INULIN_AND_OLIGOFRUCTOSE)
    }

    /// Calculates the [POD](crate::docs#pod) contributions of the fibers, in terms of sucrose
    /// equivalence
    ///
    /// **Note**: This method intentionally omits the [`other`](Fibers::other) field, as most types
    /// of fiber do not contribute to POD.
    pub fn to_pod(&self) -> Result<f64> {
        // `other` is intentionally omitted; see docs above
        Ok((self.inulin * constants::pod::INULIN + self.oligofructose * constants::pod::OLIGOFRUCTOSE) / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Fibers {
    /// Creates a new empty `Fibers` struct, forwards to [`Fibers::empty`]
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }

    /// Calculates the total fiber content, in grams per 100g of mix, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
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
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn fibers_total() {
        assert_eq!(Fibers::new().inulin(5.0).oligofructose(3.0).other(2.0).total(), 10.0);
    }

    #[test]
    fn fibers_energy() {
        assert_eq!(
            Fibers::new().inulin(10.0).oligofructose(5.0).energy().unwrap(),
            (10.0 + 5.0) * constants::energy::INULIN_AND_OLIGOFRUCTOSE
        );
    }

    #[test]
    fn fibers_to_pod() {
        assert_eq!(Fibers::new().inulin(10.0).to_pod().unwrap(), 0.0);
        assert_eq!(Fibers::new().oligofructose(10.0).to_pod().unwrap(), 4.0);
    }
}
