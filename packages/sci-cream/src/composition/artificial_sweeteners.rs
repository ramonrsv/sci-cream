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
use crate::composition::Polyols;

/// Non-saccharide artificial sweeteners, commonly used as sugar substitutes, e.g. aspartame
///
/// **Note**: These are distinct from sugar alcohols (e.g. erythritol, maltitol, etc.) which are
/// not used in similar quantities. See [`Polyols`].
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct ArtificialSweeteners {
    pub aspartame: f64,
    pub saccharin: f64,
    pub sucralose: f64,
    pub other: f64,
}

impl ArtificialSweeteners {
    pub fn empty() -> Self {
        Self {
            aspartame: 0.0,
            saccharin: 0.0,
            sucralose: 0.0,
            other: 0.0,
        }
    }

    pub fn aspartame(self, aspartame: f64) -> Self {
        Self { aspartame, ..self }
    }

    pub fn saccharin(self, saccharin: f64) -> Self {
        Self { saccharin, ..self }
    }

    pub fn sucralose(self, sucralose: f64) -> Self {
        Self { sucralose, ..self }
    }

    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    pub fn energy(&self) -> Result<f64> {
        // @todo: Consider energy contribution from artificial sweeteners
        Ok(0.0)
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Other artificial sweeteners should be zero".to_string()));
        }

        Ok([
            self.aspartame * constants::pod::ASPARTAME,
            self.saccharin * constants::pod::SACCHARIN,
            self.sucralose * constants::pod::SUCRALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Other artificial sweeteners should be zero".to_string()));
        }

        Ok([
            self.aspartame * constants::pac::ASPARTAME,
            self.saccharin * constants::pac::SACCHARIN,
            self.sucralose * constants::pac::SUCRALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl ArtificialSweeteners {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }
}

impl ScaleComponents for ArtificialSweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            aspartame: self.aspartame * factor,
            saccharin: self.saccharin * factor,
            sucralose: self.sucralose * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            aspartame: self.aspartame + other.aspartame,
            saccharin: self.saccharin + other.saccharin,
            sucralose: self.sucralose + other.sucralose,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for ArtificialSweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for ArtificialSweeteners {
    fn default() -> Self {
        Self::empty()
    }
}
