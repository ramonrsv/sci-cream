use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    constants,
    error::{Error, Result},
    util::{iter_all_abs_diff_eq, iter_fields_as},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sugars {
    pub glucose: f64,
    pub fructose: f64,
    pub galactose: f64,
    pub sucrose: f64,
    pub lactose: f64,
    pub maltose: f64,
    pub trehalose: f64,
    pub other: f64,
}

impl Sugars {
    #[must_use]
    pub fn empty() -> Self {
        Self {
            glucose: 0.0,
            fructose: 0.0,
            galactose: 0.0,
            sucrose: 0.0,
            lactose: 0.0,
            maltose: 0.0,
            trehalose: 0.0,
            other: 0.0,
        }
    }

    #[must_use]
    pub fn glucose(self, glucose: f64) -> Self {
        Self { glucose, ..self }
    }

    #[must_use]
    pub fn fructose(self, fructose: f64) -> Self {
        Self { fructose, ..self }
    }

    #[must_use]
    pub fn galactose(self, galactose: f64) -> Self {
        Self { galactose, ..self }
    }

    #[must_use]
    pub fn sucrose(self, sucrose: f64) -> Self {
        Self { sucrose, ..self }
    }

    #[must_use]
    pub fn lactose(self, lactose: f64) -> Self {
        Self { lactose, ..self }
    }

    #[must_use]
    pub fn maltose(self, maltose: f64) -> Self {
        Self { maltose, ..self }
    }

    #[must_use]
    pub fn trehalose(self, trehalose: f64) -> Self {
        Self { trehalose, ..self }
    }

    #[must_use]
    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    pub fn energy(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputeEnergy("Other sugars should be zero".to_string()));
        }

        Ok(self.total() * constants::energy::CARBOHYDRATES)
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Other sugars should be zero".to_string()));
        }

        Ok([
            self.glucose * constants::pod::GLUCOSE,
            self.fructose * constants::pod::FRUCTOSE,
            self.galactose * constants::pod::GALACTOSE,
            self.sucrose * constants::pod::SUCROSE,
            self.lactose * constants::pod::LACTOSE,
            self.maltose * constants::pod::MALTOSE,
            self.trehalose * constants::pod::TREHALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Unspecified sugars should be zero".to_string()));
        }

        Ok([
            self.glucose * constants::pac::GLUCOSE,
            self.fructose * constants::pac::FRUCTOSE,
            self.galactose * constants::pac::GALACTOSE,
            self.sucrose * constants::pac::SUCROSE,
            self.lactose * constants::pac::LACTOSE,
            self.maltose * constants::pac::MALTOSE,
            self.trehalose * constants::pac::TREHALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Sugars {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }

    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    #[cfg(feature = "wasm")]
    #[wasm_bindgen(js_name = "to_pod")]
    #[cfg_attr(coverage, coverage(off))]
    pub fn to_pod_wasm(&self) -> std::result::Result<f64, JsValue> {
        self.to_pod().map_err(Into::into)
    }

    #[cfg(feature = "wasm")]
    #[wasm_bindgen(js_name = "to_pac")]
    #[cfg_attr(coverage, coverage(off))]
    pub fn to_pac_wasm(&self) -> std::result::Result<f64, JsValue> {
        self.to_pac().map_err(Into::into)
    }
}

impl ScaleComponents for Sugars {
    fn scale(&self, factor: f64) -> Self {
        Self {
            glucose: self.glucose * factor,
            fructose: self.fructose * factor,
            galactose: self.galactose * factor,
            sucrose: self.sucrose * factor,
            lactose: self.lactose * factor,
            maltose: self.maltose * factor,
            trehalose: self.trehalose * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            glucose: self.glucose + other.glucose,
            fructose: self.fructose + other.fructose,
            galactose: self.galactose + other.galactose,
            sucrose: self.sucrose + other.sucrose,
            lactose: self.lactose + other.lactose,
            maltose: self.maltose + other.maltose,
            trehalose: self.trehalose + other.trehalose,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Sugars {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Sugars {
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
    use crate::error::Error;

    #[test]
    fn sugars_to_pod() {
        assert_eq!(Sugars::new().sucrose(10.0).to_pod().unwrap(), 10.0);
    }

    #[test]
    fn sugars_to_pod_error() {
        assert!(matches!(Sugars::new().other(10.0).to_pod(), Err(Error::CannotComputePOD(_))));
    }

    #[test]
    fn sugars_to_pac() {
        assert_eq!(Sugars::new().sucrose(10.0).to_pac().unwrap(), 10.0);
    }

    #[test]
    fn sugars_to_pac_error() {
        assert!(matches!(Sugars::new().other(10.0).to_pac(), Err(Error::CannotComputePAC(_))));
    }
}
