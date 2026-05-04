//! Newtype [`Composition`](RustComposition) wrapper for WASM interoperability, exposing only the
//! [`get(CompKey)`](RustComposition::get) method and leaving the internals opaque.

use wasm_bindgen::prelude::*;

use crate::composition::{CompKey, Composition as RustComposition};

/// Newtype wrapper around [`Composition`](RustComposition) for WASM interoperability.
#[derive(Debug, Copy, Clone)]
#[wasm_bindgen]
pub struct Composition(RustComposition);

#[wasm_bindgen]
impl Composition {
    /// WASM compatible newtype wrapper for [`Composition::new`](RustComposition::new).
    // Can't use Default with wasm_bindgen, and it does not support const
    #[allow(clippy::new_without_default, clippy::missing_const_for_fn)]
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new() -> Self {
        Self(RustComposition::new())
    }

    /// Newtype forwarder for the [`Composition::get`](RustComposition::get) method
    #[must_use]
    pub fn get(&self, key: CompKey) -> f64 {
        self.0.get(key)
    }
}

impl From<RustComposition> for Composition {
    fn from(rust_comp: RustComposition) -> Self {
        Self(rust_comp)
    }
}

impl From<Composition> for RustComposition {
    fn from(comp: Composition) -> Self {
        comp.0
    }
}
