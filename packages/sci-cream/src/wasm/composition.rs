//! Newtype [`Composition`](RustComposition) wrapper for WASM interoperability.
//!
//! Exposes only the [`get(CompKey)`](RustComposition::get) and
//! [`get_ratio(RatioKey)`](RustComposition::get_ratio) methods, leaving the internals opaque.

use wasm_bindgen::prelude::*;

use crate::composition::{CompKey, Composition as RustComposition, RatioKey};

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

    /// Newtype forwarder for the [`Composition::get_ratio`](RustComposition::get_ratio) method
    #[must_use]
    pub fn get_ratio(&self, key: RatioKey) -> f64 {
        self.0.get_ratio(key)
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
    use crate::tests::asserts::*;

    use super::*;

    use crate::composition::{Emulsifiers, Fats, Micro, PAC, Solids, SolidsBreakdown, Stabilizers};

    #[test]
    fn new_returns_default_composition() {
        let comp = Composition::new();
        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq!(comp.get(CompKey::Water), 100.0);

        assert_eq!(comp.get_ratio(RatioKey::StabilizersPerWater), 0.0);
        assert_true!(comp.get_ratio(RatioKey::EmulsifiersPerFat).is_nan());
    }

    fn sample_rust_composition() -> RustComposition {
        RustComposition::new()
            .energy(150.0)
            .solids(
                Solids::new()
                    .milk(SolidsBreakdown::new().fats(Fats::new().total(10.0)))
                    .other(SolidsBreakdown::new().others(12.0)),
            )
            .micro(
                Micro::new()
                    .stabilizers(Stabilizers::new().locust_bean_gum(5.0))
                    .emulsifiers(Emulsifiers::new().lecithin(7.0)),
            )
            .pac(PAC::new().sugars(15.0))
            .pod(25.0)
    }

    #[test]
    fn get_forwards_to_inner_composition() {
        let inner = sample_rust_composition();
        let comp = Composition::from(inner);
        assert_eq!(comp.get(CompKey::Energy), 150.0);
        assert_eq!(comp.get(CompKey::MilkFat), 10.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 22.0);
        assert_eq!(comp.get(CompKey::Water), 78.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 5.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 7.0);
        assert_eq!(comp.get(CompKey::TotalPAC), 15.0);
        assert_eq!(comp.get(CompKey::POD), 25.0);
    }

    #[test]
    fn get_ratio_forwards_to_inner_composition() {
        let inner = sample_rust_composition();
        let comp = Composition::from(inner);
        assert_eq!(comp.get_ratio(RatioKey::AbsPAC), (15.0 / 78.0) * 100.0);
        assert_eq!(comp.get_ratio(RatioKey::StabilizersPerWater), (5.0 / 78.0) * 100.0);
        assert_eq!(comp.get_ratio(RatioKey::EmulsifiersPerFat), (7.0 / 10.0) * 100.0);
    }

    #[test]
    fn from_rust_composition_preserves_values() {
        let inner = sample_rust_composition();
        let comp = Composition::from(inner);
        assert_eq!(comp.get(CompKey::Energy), 150.0);
        assert_eq!(comp.get(CompKey::POD), 25.0);
        assert_eq!(comp.get_ratio(RatioKey::AbsPAC), (15.0 / 78.0) * 100.0);
    }

    #[test]
    fn from_composition_into_rust_composition_round_trips() {
        let inner = sample_rust_composition();
        let comp = Composition::from(inner);
        let back = RustComposition::from(comp);
        assert_eq!(inner, back);
    }
}
