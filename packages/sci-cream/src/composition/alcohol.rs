use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, constants, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Alcohol {
    pub by_weight: f64,
}

impl Alcohol {
    pub fn empty() -> Self {
        Self { by_weight: 0.0 }
    }

    pub fn by_weight(self, by_weight: f64) -> Self {
        Self { by_weight }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Alcohol {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn from_abv(abv: f64) -> Self {
        Self {
            by_weight: abv * constants::ABV_TO_ABW_RATIO,
        }
    }

    pub fn to_abv(&self) -> f64 {
        self.by_weight / constants::ABV_TO_ABW_RATIO
    }

    pub fn to_pac(&self) -> f64 {
        self.by_weight * constants::pac::ALCOHOL / 100.0
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
