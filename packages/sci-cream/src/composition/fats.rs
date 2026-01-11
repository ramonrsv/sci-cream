use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, constants, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Fats {
    pub total: f64,
    pub saturated: f64,
    pub trans: f64,
}

impl Fats {
    pub fn empty() -> Self {
        Self {
            total: 0.0,
            saturated: 0.0,
            trans: 0.0,
        }
    }

    #[must_use]
    pub fn total(self, total: f64) -> Self {
        Self { total, ..self }
    }

    #[must_use]
    pub fn saturated(self, saturated: f64) -> Self {
        Self { saturated, ..self }
    }

    #[must_use]
    pub fn trans(self, trans: f64) -> Self {
        Self { trans, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Fats {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn energy(&self) -> f64 {
        self.total * constants::energy::FATS
    }
}

impl ScaleComponents for Fats {
    fn scale(&self, factor: f64) -> Self {
        Self {
            total: self.total * factor,
            saturated: self.saturated * factor,
            trans: self.trans * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            total: self.total + other.total,
            saturated: self.saturated + other.saturated,
            trans: self.trans + other.trans,
        }
    }
}

impl AbsDiffEq for Fats {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Fats {
    fn default() -> Self {
        Self::empty()
    }
}
