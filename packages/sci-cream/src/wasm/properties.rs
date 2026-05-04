//! WASM compatible alternative [`MixProperties`](RustMixProperties) that uses a newtype
//! [`Composition`]
//!
//! This struct includes `wasm_bindgen` support while still allowing downstream direct access to the
//! [`total_amount`](MixProperties::total_amount), [`composition`](MixProperties::composition), and
//! [`fpd`](MixProperties::fpd) fields.

use wasm_bindgen::prelude::*;

use crate::{
    composition::Composition as RustComposition, fpd::FPD, properties::MixProperties as RustMixProperties,
    wasm::Composition,
};

/// WASM compatible alternative [`MixProperties`](RustMixProperties) that uses a newtype
/// [`Composition`]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Debug)]
pub struct MixProperties {
    /// Total amount of the mix in grams
    pub total_amount: f64,
    /// Composition properties of the mix
    pub composition: Composition,
    /// [Freezing Point Depression (FPD)](crate::docs#freezing-point-depression)
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub fpd: FPD,
}

#[wasm_bindgen]
impl MixProperties {
    /// Creates a new empty [`MixProperties`] from [`new`](RustMixProperties::new), replacing the
    /// internal [`Composition`](RustComposition) with the WASM compatible newtype [`Composition`]
    // Can't use Default with wasm_bindgen, and it does not support const
    #[allow(clippy::new_without_default, clippy::missing_const_for_fn)]
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new() -> Self {
        Self::from(RustMixProperties::new())
    }
}

impl From<RustMixProperties> for MixProperties {
    fn from(rust_mix: RustMixProperties) -> Self {
        Self {
            total_amount: rust_mix.total_amount,
            composition: Composition::from(rust_mix.composition),
            fpd: rust_mix.fpd,
        }
    }
}

impl From<MixProperties> for RustMixProperties {
    fn from(mix: MixProperties) -> Self {
        Self {
            total_amount: mix.total_amount,
            composition: RustComposition::from(mix.composition),
            fpd: mix.fpd,
        }
    }
}
