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
    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::*;

    const FIELD_MODIFIERS: [fn(&mut Carbohydrates, f64); 4] = [
        |c, ec| c.fiber.inulin += ec,
        |c, ec| c.sugars.glucose += ec,
        |c, ec| c.polyols.sorbitol += ec,
        |c, ec| c.others += ec,
    ];

    #[test]
    fn carbohydrates_field_count() {
        assert_eq!(Carbohydrates::new().iter().count(), 4);
    }

    #[test]
    fn artificial_sweetener_no_fields_missed() {
        assert_eq!(Carbohydrates::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn carbohydrates_empty() {
        let carbohydrates = Carbohydrates::empty();
        assert_eq!(carbohydrates, Carbohydrates::new());
        assert_eq!(carbohydrates.fiber, Fibers::empty());
        assert_eq!(carbohydrates.sugars, Sugars::empty());
        assert_eq!(carbohydrates.polyols, Polyols::empty());
        assert_eq!(carbohydrates.others, 0.0);

        assert_eq!(carbohydrates.total(), 0.0);
        assert_eq!(carbohydrates.energy().unwrap(), 0.0);
        assert_eq!(carbohydrates.to_pod().unwrap(), 0.0);
        assert_eq!(carbohydrates.to_pac().unwrap(), 0.0);
    }

    #[test]
    fn carbohydrates_field_update_methods() {
        let carbohydrates = Carbohydrates::new()
            .fiber(Fibers::new().inulin(5.0))
            .sugars(Sugars::new().glucose(3.0))
            .polyols(Polyols::new().sorbitol(2.0))
            .others(1.0);

        assert_eq!(carbohydrates.fiber, Fibers::new().inulin(5.0));
        assert_eq!(carbohydrates.sugars, Sugars::new().glucose(3.0));
        assert_eq!(carbohydrates.polyols, Polyols::new().sorbitol(2.0));
        assert_eq!(carbohydrates.others, 1.0);
    }

    #[test]
    fn carbohydrates_others_from_total() {
        let carbohydrates = Carbohydrates::new()
            .fiber(Fibers::new().inulin(5.0))
            .sugars(Sugars::new().glucose(3.0))
            .polyols(Polyols::new().sorbitol(2.0));

        let carbohydrates_with_others = carbohydrates.others_from_total(12.0).unwrap();
        assert_eq!(carbohydrates_with_others.others, 2.0);
        assert_eq!(carbohydrates_with_others.total(), 12.0);
    }

    #[test]
    fn carbohydrates_others_from_total_override() {
        let carbohydrates = Carbohydrates::new().fiber(Fibers::new().inulin(10.0)).others(5.0);
        assert_eq!(carbohydrates.others, 5.0);
        assert_eq!(carbohydrates.total(), 15.0);

        let carbohydrates_with_others = carbohydrates.others_from_total(12.0).unwrap();
        assert_eq!(carbohydrates_with_others.others, 2.0);
        assert_eq!(carbohydrates_with_others.total(), 12.0);
    }

    #[test]
    fn carbohydrates_others_from_total_error() {
        let carbohydrates = Carbohydrates::new().fiber(Fibers::new().inulin(10.0));
        assert!(matches!(carbohydrates.others_from_total(9.0), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn carbohydrates_total() {
        let carbohydrates = Carbohydrates::new()
            .fiber(Fibers::new().inulin(5.0))
            .sugars(Sugars::new().glucose(3.0))
            .polyols(Polyols::new().sorbitol(2.0))
            .others(1.0);

        assert_eq!(carbohydrates.total(), 11.0);
    }

    #[test]
    fn carbohydrates_energy() {
        let fibers = Fibers::new().inulin(5.0);
        let sugars = Sugars::new().glucose(3.0);
        let polyols = Polyols::new().sorbitol(2.0);
        assert_ne!(fibers.energy(), 0.0);
        assert_ne!(sugars.energy(), 0.0);
        assert_ne!(polyols.energy().unwrap(), 0.0);

        let carbohydrates = Carbohydrates::new()
            .fiber(fibers)
            .sugars(sugars)
            .polyols(polyols)
            .others(1.0);

        assert_eq!(
            carbohydrates.energy().unwrap(),
            fibers.energy() + sugars.energy() + polyols.energy().unwrap() + 4.0
        );
    }

    #[test]
    fn carbohydrates_energy_error() {
        let carbohydrates = Carbohydrates::new().polyols(Polyols::new().other(10.0));
        assert!(matches!(carbohydrates.energy(), Err(Error::CannotComputeEnergy(_))));
    }

    #[test]
    fn carbohydrates_to_pod() {
        let fibers = Fibers::new().oligofructose(5.0);
        let sugars = Sugars::new().sucrose(3.0);
        let polyols = Polyols::new().maltitol(2.0);
        assert_ne!(fibers.to_pod(), 0.0);
        assert_ne!(sugars.to_pod().unwrap(), 0.0);
        assert_ne!(polyols.to_pod().unwrap(), 0.0);

        let carbohydrates = Carbohydrates::new()
            .fiber(fibers)
            .sugars(sugars)
            .polyols(polyols)
            .others(10.0);

        assert_eq!(
            carbohydrates.to_pod().unwrap(),
            /* `others` intentionally omitted */
            fibers.to_pod() + sugars.to_pod().unwrap() + polyols.to_pod().unwrap()
        );
    }

    #[test]
    fn carbohydrates_to_pod_error() {
        assert!(matches!(
            Carbohydrates::new().sugars(Sugars::new().other(10.0)).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
        assert!(matches!(
            Carbohydrates::new().polyols(Polyols::new().other(10.0)).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
    }

    #[test]
    fn carbohydrates_to_pac() {
        let fibers = Fibers::new().oligofructose(5.0);
        let sugars = Sugars::new().sucrose(3.0);
        let polyols = Polyols::new().maltitol(2.0);
        assert_ne!(sugars.to_pac().unwrap(), 0.0);
        assert_ne!(polyols.to_pac().unwrap(), 0.0);

        let carbohydrates = Carbohydrates::new()
            .fiber(fibers)
            .sugars(sugars)
            .polyols(polyols)
            .others(10.0);

        assert_eq!(
            carbohydrates.to_pac().unwrap(),
            /* `others` intentionally omitted */
            /* `fibers` intentionally omitted, it has no `to_pac` */
            sugars.to_pac().unwrap() + polyols.to_pac().unwrap()
        );
    }

    #[test]
    fn carbohydrates_to_pac_error() {
        assert!(matches!(
            Carbohydrates::new().sugars(Sugars::new().other(10.0)).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
        assert!(matches!(
            Carbohydrates::new().polyols(Polyols::new().other(10.0)).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
    }

    #[test]
    fn carbohydrates_scale() {
        let carbohydrates = Carbohydrates::new()
            .fiber(Fibers::new().inulin(5.0))
            .sugars(Sugars::new().glucose(3.0))
            .polyols(Polyols::new().sorbitol(2.0))
            .others(1.0);
        assert_eq!(carbohydrates.total(), 11.0);

        let scaled = carbohydrates.scale(0.5);
        assert_eq!(scaled.fiber, Fibers::new().inulin(2.5));
        assert_eq!(scaled.sugars, Sugars::new().glucose(1.5));
        assert_eq!(scaled.polyols, Polyols::new().sorbitol(1.0));
        assert_eq!(scaled.others, 0.5);
        assert_eq!(scaled.total(), 5.5);
    }

    #[test]
    fn carbohydrates_add() {
        let carbohydrates1 = Carbohydrates::new()
            .fiber(Fibers::new().inulin(5.0))
            .sugars(Sugars::new().glucose(3.0))
            .polyols(Polyols::new().sorbitol(2.0))
            .others(1.0);
        let carbohydrates2 = Carbohydrates::new()
            .fiber(Fibers::new().oligofructose(4.0))
            .sugars(Sugars::new().sucrose(2.0))
            .polyols(Polyols::new().maltitol(1.0))
            .others(0.5);
        assert_eq!(carbohydrates1.total(), 11.0);
        assert_eq!(carbohydrates2.total(), 7.5);

        let sum = carbohydrates1.add(&carbohydrates2);
        assert_eq!(sum.fiber, Fibers::new().inulin(5.0).oligofructose(4.0));
        assert_eq!(sum.sugars, Sugars::new().glucose(3.0).sucrose(2.0));
        assert_eq!(sum.polyols, Polyols::new().sorbitol(2.0).maltitol(1.0));
        assert_eq!(sum.others, 1.5);
        assert_eq!(sum.total(), 18.5);
    }

    #[test]
    fn artificial_sweeteners_abs_diff_eq() {
        let a = Carbohydrates::new()
            .fiber(Fibers::new().inulin(5.0))
            .sugars(Sugars::new().glucose(3.0))
            .polyols(Polyols::new().sorbitol(2.0))
            .others(1.0);
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_ne!(v.fiber.total(), 0.0);
            assert_ne!(v.sugars.total(), 0.0);
            assert_ne!(v.polyols.total(), 0.0);
            assert_ne!(v.others, 0.0);
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
}
