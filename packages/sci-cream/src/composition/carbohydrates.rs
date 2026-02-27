//! [`Carbohydrates`] struct and associated functionality to track the carbohydrate composition of
//! an ingredient or mix, including sugars, fibers, polyols, and other components.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{Fibers, Polyols, ScaleComponents, Sugars},
    constants,
    error::{Error, Result},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Struct representing the detailed carbohydrate composition of a mix, including sugars, fibers,
/// polyols, and other carbohydrates.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Carbohydrates {
    /// The dietary fiber composition of the mix, including inulin, oligofructose, and other fibers
    pub fiber: Fibers,
    /// The sugar composition of the mix, including monosaccharides, disaccharides, and other sugars
    pub sugars: Sugars,
    /// The polyol composition of the mix, including sorbitol, maltitol, and other polyols
    pub polyols: Polyols,
    /// Any other carbohydrates not captured by the above fields, typically long polysaccharides
    pub others: f64,
}

impl Carbohydrates {
    /// Creates an empty `Carbohydrates` struct with all fields set to zero (i.e. 0g of all
    /// carbohydrate components)
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            fiber: Fibers::empty(),
            sugars: Sugars::empty(),
            polyols: Polyols::empty(),
            others: 0.0,
        }
    }

    /// Creates a new empty `Carbohydrates` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`fiber`](Carbohydrates::fiber)
    #[must_use]
    pub const fn fiber(self, fiber: Fibers) -> Self {
        Self { fiber, ..self }
    }

    /// Field-update method for [`sugars`](Carbohydrates::sugars)
    #[must_use]
    pub const fn sugars(self, sugars: Sugars) -> Self {
        Self { sugars, ..self }
    }

    /// Field-update method for [`polyols`](Carbohydrates::polyols)
    #[must_use]
    pub const fn polyols(self, polyols: Polyols) -> Self {
        Self { polyols, ..self }
    }

    /// Field-update method for [`others`](Carbohydrates::others)
    #[must_use]
    pub const fn others(self, others: f64) -> Self {
        Self { others, ..self }
    }

    /// Sets `others = total - (fiber + sugars.total() + polyols.total())`
    ///
    /// # Errors
    ///
    /// Returns an [`Error::InvalidComposition`] if `total < (fiber + sugars.total() +
    /// polyols.total())`; this should only be called once all other components have been set.
    pub fn others_from_total(&self, total: f64) -> Result<Self> {
        if (self.total() - self.others) > total {
            return Err(Error::InvalidComposition(format!(
                "Cannot set carbohydrate others from total: total {} is less than sum of other components {}",
                total,
                self.total() - self.others
            )));
        }

        Ok(Self {
            others: total - (self.total() - self.others),
            ..*self
        })
    }

    /// Calculates the total carbohydrate content by weight, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        self.fiber.total() + self.sugars.total() + self.polyols.total() + self.others
    }

    /// Calculates the energy contribution of the carbohydrates, in kcal per 100g of mix
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputeEnergy`] if energy calculations fail for any of the
    /// components, e.g. due to the presence of "other" polyols with unknown energy contributions.
    pub fn energy(&self) -> Result<f64> {
        Ok(self.fiber.energy()
            + self.sugars.energy()
            + self.polyols.energy()?
            + (self.others * constants::energy::CARBOHYDRATES))
    }

    /// Calculates the [POD](crate::docs#pod) contributions of the carbohydrates, in terms of sucrose
    /// equivalence
    ///
    /// **Note**: The `others` field is intentionally omitted from this calculation, since "other"
    /// carbohydrates typically refers to long polysaccharides that do not contribute POD.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePOD`] if POD calculations fail for any of the components,
    /// e.g. due to the presence of "other" sugars or polyols with unknown POD contributions.
    pub fn to_pod(&self) -> Result<f64> {
        // `others` is intentionally omitted, see docs above
        Ok(self.fiber.to_pod() + self.sugars.to_pod()? + self.polyols.to_pod()?)
    }

    /// Calculates the [PAC](crate::docs#pac-afp-fpdf-se) contributions of the carbohydrates, in
    /// terms of sucrose equivalence
    ///
    /// **Note**: The `fiber` and `others` fields are intentionally omitted from this calculation,
    /// they both typically refer to long polysaccharides that do not contribute PAC.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePAC`] if PAC calculations fail for any of the components,
    /// e.g. due to the presence of "other" sugars or polyols with unknown PAC contributions.
    pub fn to_pac(&self) -> Result<f64> {
        // `fibers` and `others` are intentionally omitted, see docs above
        Ok(self.sugars.to_pac()? + self.polyols.to_pac()?)
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Carbohydrates {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl ScaleComponents for Carbohydrates {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fiber: self.fiber.scale(factor),
            sugars: self.sugars.scale(factor),
            polyols: self.polyols.scale(factor),
            others: self.others * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fiber: self.fiber.add(&other.fiber),
            sugars: self.sugars.add(&other.sugars),
            polyols: self.polyols.add(&other.polyols),
            others: self.others + other.others,
        }
    }
}

impl AbsDiffEq for Carbohydrates {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.fiber.abs_diff_eq(&other.fiber, epsilon)
            && self.sugars.abs_diff_eq(&other.sugars, epsilon)
            && self.polyols.abs_diff_eq(&other.polyols, epsilon)
            && self.others.abs_diff_eq(&other.others, epsilon)
    }
}

impl Default for Carbohydrates {
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
    use crate::composition::*;

    #[test]
    fn carbohydrates_to_pod() {
        let carbohydrates = Carbohydrates::new().sugars(Sugars::new().sucrose(10.0));
        assert_eq!(carbohydrates.to_pod().unwrap(), 10.0);
    }

    #[test]
    fn carbohydrates_to_pod_error() {
        assert!(matches!(
            Carbohydrates::new().sugars(Sugars::new().other(10.0)).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
    }

    #[test]
    fn carbohydrates_to_pac() {
        let carbohydrates = Carbohydrates::new().sugars(Sugars::new().sucrose(10.0));
        assert_eq!(carbohydrates.to_pac().unwrap(), 10.0);
    }

    #[test]
    fn carbohydrates_to_pac_error() {
        assert!(matches!(
            Carbohydrates::new().sugars(Sugars::new().other(10.0)).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
    }
}
