#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Copy, Clone, Debug)]
pub struct FPD {
    pub fpd: f64,
    pub serving_temp: f64,
    pub hardness_at_14c: f64,
}
