use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum FpdKey {
    FPD,
    ServingTemp,
    HardnessAt14C,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Copy, Clone, Debug)]
pub struct FPD {
    pub fpd: f64,
    pub serving_temp: f64,
    pub hardness_at_14c: f64,
}

impl FPD {
    pub fn empty() -> Self {
        Self {
            fpd: f64::NAN,
            serving_temp: f64::NAN,
            hardness_at_14c: f64::NAN,
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl FPD {
    pub fn get(&self, key: FpdKey) -> f64 {
        match key {
            FpdKey::FPD => self.fpd,
            FpdKey::ServingTemp => self.serving_temp,
            FpdKey::HardnessAt14C => self.hardness_at_14c,
        }
    }
}

impl Default for FPD {
    fn default() -> Self {
        Self::empty()
    }
}
