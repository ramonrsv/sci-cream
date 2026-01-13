use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition},
    fpd::{FPD, FpdKey},
};

#[derive(Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum PropKey {
    CompKey(CompKey),
    FpdKey(FpdKey),
}

impl From<CompKey> for PropKey {
    fn from(key: CompKey) -> Self {
        PropKey::CompKey(key)
    }
}

impl From<FpdKey> for PropKey {
    fn from(key: FpdKey) -> Self {
        PropKey::FpdKey(key)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Clone, Debug)]
pub struct MixProperties {
    pub total_amount: f64,
    pub composition: Composition,
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub fpd: FPD,
}

impl MixProperties {
    pub fn empty() -> Self {
        Self {
            total_amount: 0.0,
            composition: Composition::empty(),
            fpd: FPD::empty(),
        }
    }

    pub fn get(&self, key: PropKey) -> f64 {
        match key {
            PropKey::CompKey(comp_key) => self.composition.get(comp_key),
            PropKey::FpdKey(fpd_key) => self.fpd.get(fpd_key),
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl MixProperties {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }
}

impl Default for MixProperties {
    fn default() -> Self {
        Self::empty()
    }
}
