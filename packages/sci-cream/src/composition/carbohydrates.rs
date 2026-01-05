use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{Polyols, ScaleComponents, Sugars},
    error::{Error, Result},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Carbohydrates {
    pub fiber: f64,
    pub sugars: Sugars,
    pub polyols: Polyols,
    pub others: f64,
}

impl Carbohydrates {
    pub fn empty() -> Self {
        Self {
            fiber: 0.0,
            sugars: Sugars::empty(),
            polyols: Polyols::empty(),
            others: 0.0,
        }
    }

    pub fn fiber(self, fiber: f64) -> Self {
        Self { fiber, ..self }
    }

    pub fn sugars(self, sugars: Sugars) -> Self {
        Self { sugars, ..self }
    }

    pub fn polyols(self, polyols: Polyols) -> Self {
        Self { polyols, ..self }
    }

    pub fn others(self, others: f64) -> Self {
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

    pub fn to_pod(&self) -> Result<f64> {
        Ok(self.sugars.to_pod()? + self.polyols.to_pod()?)
    }

    pub fn to_pac(&self) -> Result<f64> {
        Ok(self.sugars.to_pac()? + self.polyols.to_pac()?)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Carbohydrates {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        self.fiber + self.sugars.total() + self.polyols.total() + self.others
    }
}

impl ScaleComponents for Carbohydrates {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fiber: self.fiber * factor,
            sugars: self.sugars.scale(factor),
            polyols: self.polyols.scale(factor),
            others: self.others * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fiber: self.fiber + other.fiber,
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
