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

#[cfg(doc)]
use crate::composition::ArtificialSweeteners;

/// Sugar alcohols, commonly used as sugar substitutes, e.g. erythritol, maltitol, etc.
///
/// **Note**: These are distinct from artificial sweeteners (e.g. aspartame, sucralose, etc.) which
/// typically have no functional properties other than sweetness. See [`ArtificialSweeteners`].
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Polyols {
    pub erythritol: f64,
    pub maltitol: f64,
    pub sorbitol: f64,
    pub xylitol: f64,
    pub other: f64,
}

impl Polyols {
    pub fn empty() -> Self {
        Self {
            erythritol: 0.0,
            maltitol: 0.0,
            sorbitol: 0.0,
            xylitol: 0.0,
            other: 0.0,
        }
    }

    #[must_use]
    pub fn erythritol(self, erythritol: f64) -> Self {
        Self { erythritol, ..self }
    }

    #[must_use]
    pub fn maltitol(self, maltitol: f64) -> Self {
        Self { maltitol, ..self }
    }

    #[must_use]
    pub fn sorbitol(self, sorbitol: f64) -> Self {
        Self { sorbitol, ..self }
    }

    #[must_use]
    pub fn xylitol(self, xylitol: f64) -> Self {
        Self { xylitol, ..self }
    }

    #[must_use]
    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    pub fn energy(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputeEnergy("Cannot compute energy with other polyols".to_string()));
        }

        Ok([
            self.erythritol * constants::energy::ERYTHRITOL,
            self.maltitol * constants::energy::MALTITOL,
            self.sorbitol * constants::energy::SORBITOL,
            self.xylitol * constants::energy::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>())
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Cannot compute POD with other polyols".to_string()));
        }

        Ok([
            self.erythritol * constants::pod::ERYTHRITOL,
            self.maltitol * constants::pod::MALTITOL,
            self.sorbitol * constants::pod::SORBITOL,
            self.xylitol * constants::pod::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Cannot compute PAC with other polyols".to_string()));
        }

        Ok([
            self.erythritol * constants::pac::ERYTHRITOL,
            self.maltitol * constants::pac::MALTITOL,
            self.sorbitol * constants::pac::SORBITOL,
            self.xylitol * constants::pac::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Polyols {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }
}

impl ScaleComponents for Polyols {
    fn scale(&self, factor: f64) -> Self {
        Self {
            erythritol: self.erythritol * factor,
            maltitol: self.maltitol * factor,
            sorbitol: self.sorbitol * factor,
            xylitol: self.xylitol * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            erythritol: self.erythritol + other.erythritol,
            maltitol: self.maltitol + other.maltitol,
            sorbitol: self.sorbitol + other.sorbitol,
            xylitol: self.xylitol + other.xylitol,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Polyols {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Polyols {
    fn default() -> Self {
        Self::empty()
    }
}
