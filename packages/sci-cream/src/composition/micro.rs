use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Micro {
    pub salt: f64,
    pub lecithin: f64,
    pub emulsifiers: f64,
    pub stabilizers: f64,
}

impl Micro {
    #[must_use]
    pub fn empty() -> Self {
        Self {
            salt: 0.0,
            lecithin: 0.0,
            emulsifiers: 0.0,
            stabilizers: 0.0,
        }
    }

    #[must_use]
    pub fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    #[must_use]
    pub fn lecithin(self, lecithin: f64) -> Self {
        Self { lecithin, ..self }
    }

    #[must_use]
    pub fn emulsifiers(self, emulsifiers: f64) -> Self {
        Self { emulsifiers, ..self }
    }

    #[must_use]
    pub fn stabilizers(self, stabilizers: f64) -> Self {
        Self { stabilizers, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Micro {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }
}

impl ScaleComponents for Micro {
    fn scale(&self, factor: f64) -> Self {
        Self {
            salt: self.salt * factor,
            lecithin: self.lecithin * factor,
            stabilizers: self.stabilizers * factor,
            emulsifiers: self.emulsifiers * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            salt: self.salt + other.salt,
            lecithin: self.lecithin + other.lecithin,
            stabilizers: self.stabilizers + other.stabilizers,
            emulsifiers: self.emulsifiers + other.emulsifiers,
        }
    }
}

impl AbsDiffEq for Micro {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Micro {
    fn default() -> Self {
        Self::empty()
    }
}
