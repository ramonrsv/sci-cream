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
#[wasm_bindgen]
#[derive(Debug)]
pub struct MixProperties {
    /// Total amount of the mix in grams
    pub total_amount: f64,
    /// Composition properties of the mix
    pub composition: Composition,
    /// [Freezing Point Depression (FPD)](crate::docs#freezing-point-depression)
    #[wasm_bindgen(getter_with_clone)]
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

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::{composition::CompKey, fpd::FPD};

    static RUST_MIX_PROPS: LazyLock<RustMixProperties> = LazyLock::new(|| RustMixProperties {
        total_amount: 500.0,
        composition: RustComposition::new().energy(42.0),
        fpd: FPD {
            // Equality assertions fail if FPD::hardness_at_14c is NaN
            hardness_at_14c: 75.0,
            ..FPD::empty()
        },
    });

    #[test]
    fn new_returns_default_mix_properties() {
        let mix = MixProperties::new();
        assert_eq_flt_test!(mix.total_amount, 0.0);
        assert_eq_flt_test!(mix.composition.get(CompKey::Energy), 0.0);
        assert_eq_flt_test!(mix.fpd.fpd, 0.0);
    }

    #[test]
    fn from_rust_mix_properties_preserves_fields() {
        let wasm_mix = MixProperties::from(RUST_MIX_PROPS.clone());
        assert_eq_flt_test!(wasm_mix.total_amount, 500.0);
        assert_eq_flt_test!(wasm_mix.composition.get(CompKey::Energy), 42.0);
        assert_eq_flt_test!(wasm_mix.fpd.fpd, 0.0);
    }

    #[test]
    fn from_mix_properties_into_rust_mix_properties_round_trips() {
        let back = RustMixProperties::from(MixProperties::from(RUST_MIX_PROPS.clone()));
        assert_eq!(back, *RUST_MIX_PROPS);
    }
}
