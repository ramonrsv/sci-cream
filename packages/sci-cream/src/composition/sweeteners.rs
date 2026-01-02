use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};

use crate::{
    composition::{ArtificialSweeteners, Polyols, ScaleComponents, Sugars},
    error::Result,
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sweeteners {
    pub sugars: Sugars,
    pub polyols: Polyols,
    pub artificial: ArtificialSweeteners,
}

impl Sweeteners {
    pub fn empty() -> Self {
        Self {
            sugars: Sugars::empty(),
            polyols: Polyols::empty(),
            artificial: ArtificialSweeteners::empty(),
        }
    }

    pub fn sugars(self, sugars: Sugars) -> Self {
        Self { sugars, ..self }
    }

    pub fn polyols(self, polyols: Polyols) -> Self {
        Self { polyols, ..self }
    }

    pub fn artificial(self, artificial: ArtificialSweeteners) -> Self {
        Self { artificial, ..self }
    }

    pub fn to_pod(&self) -> Result<f64> {
        Ok(self.sugars.to_pod()? + self.polyols.to_pod()? + self.artificial.to_pod()?)
    }

    pub fn to_pac(&self) -> Result<f64> {
        Ok(self.sugars.to_pac()? + self.polyols.to_pac()? + self.artificial.to_pac()?)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Sweeteners {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        self.sugars.total() + self.polyols.total() + self.artificial.total()
    }
}

impl ScaleComponents for Sweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars.scale(factor),
            polyols: self.polyols.scale(factor),
            artificial: self.artificial.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars.add(&other.sugars),
            polyols: self.polyols.add(&other.polyols),
            artificial: self.artificial.add(&other.artificial),
        }
    }
}

impl AbsDiffEq for Sweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.sugars.abs_diff_eq(&other.sugars, epsilon)
            && self.polyols.abs_diff_eq(&other.polyols, epsilon)
            && self.artificial.abs_diff_eq(&other.artificial, epsilon)
    }
}

impl Default for Sweeteners {
    fn default() -> Self {
        Sweeteners::empty()
    }
}
