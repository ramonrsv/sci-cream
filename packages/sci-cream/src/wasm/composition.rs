//! Newtype [`Composition`](RustComposition) wrapper for WASM interoperability, exposing only the
//! [`get(CompKey)`](RustComposition::get) method and leaving the internals opaque.

use wasm_bindgen::prelude::*;

use crate::composition::{CompKey, Composition as RustComposition};

/// Newtype wrapper around [`Composition`](RustComposition) for WASM interoperability.
#[derive(PartialEq, Debug, Copy, Clone)]
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

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused)]
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::CompKey;

    #[test]
    fn new_returns_default_composition() {
        let comp = Composition::new();
        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq!(comp.get(CompKey::Water), 100.0);
    }

    #[test]
    fn get_forwards_to_inner_composition() {
        let inner = RustComposition::new().energy(42.0);
        let comp = Composition::from(inner);
        assert_eq!(comp.get(CompKey::Energy), 42.0);
    }

    #[test]
    fn from_rust_composition_preserves_values() {
        let inner = RustComposition::new().energy(10.0).pod(3.0);
        let comp = Composition::from(inner);
        assert_eq!(comp.get(CompKey::Energy), 10.0);
        assert_eq!(comp.get(CompKey::POD), 3.0);
    }

    #[test]
    fn from_composition_into_rust_composition_round_trips() {
        let inner = RustComposition::new().energy(7.5);
        let comp = Composition::from(inner);
        let back = RustComposition::from(comp);
        assert_eq!(inner, back);
    }
}
