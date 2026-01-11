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

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Fibers {
    pub inulin: f64,
    pub oligofructose: f64,
    pub other: f64,
}

impl Fibers {
    pub fn empty() -> Self {
        Self {
            inulin: 0.0,
            oligofructose: 0.0,
            other: 0.0,
        }
    }

    pub fn inulin(self, inulin: f64) -> Self {
        Self { inulin, ..self }
    }

    pub fn oligofructose(self, oligofructose: f64) -> Self {
        Self { oligofructose, ..self }
    }

    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    pub fn energy(&self) -> Result<f64> {
        // `others` is intentionally omitted, fibers generally do not contribute to energy
        Ok((self.inulin + self.oligofructose) * constants::energy::INULIN_AND_OLIGOFRUCTOSE)
    }

    pub fn to_pod(&self) -> Result<f64> {
        // `others` is intentionally omitted, fibers generally do not contribute to POD
        Ok((self.inulin * constants::pod::INULIN + self.oligofructose * constants::pod::OLIGOFRUCTOSE) / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Fibers {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

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
#[allow(clippy::unwrap_used)]
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
