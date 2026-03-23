//! Types that encapsulate various properties of ice cream mixes

use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition},
    fpd::{FPD, FpdKey},
};

/// Keys for accessing specific property values from [`MixProperties`] via [`MixProperties::get()`]
///
/// This enum wraps both [`CompKey`] and [`FpdKey`] to allow accessing all properties from a single
/// interface, which is helpful in downstream applications, to have a single flattened list of keys.
/// There are [`From`] implementations for both key types to facilitate easy conversion.
///
/// # Example
///
/// ```
/// use sci_cream::{CompKey, FpdKey, PropKey, MixProperties};
/// let mix_props = MixProperties::empty();
/// assert_eq!(mix_props.get(CompKey::MilkFat.into()), 0.0);
/// assert_eq!(mix_props.get(FpdKey::FPD.into()), 0.0);
/// ```
#[derive(Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum PropKey {
    /// [`CompKey`] for [`Composition`] properties from [`MixProperties::composition`]
    CompKey(CompKey),
    /// [`FpdKey`] for [`FPD`] properties from [`MixProperties::fpd`]
    FpdKey(FpdKey),
}

impl From<CompKey> for PropKey {
    fn from(key: CompKey) -> Self {
        Self::CompKey(key)
    }
}

impl From<FpdKey> for PropKey {
    fn from(key: FpdKey) -> Self {
        Self::FpdKey(key)
    }
}

/// Properties of an ice cream mix, including [`Composition`] and freezing point depression [`FPD`]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Clone, Debug)]
pub struct MixProperties {
    /// Total amount of the mix in grams
    pub total_amount: f64,
    /// Composition properties of the mix
    pub composition: Composition,
    /// [Freezing Point Depression (FPD)](crate::docs#freezing-point-depression)
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub fpd: FPD,
}

impl MixProperties {
    /// Creates an empty [`MixProperties`], with properties equivalent to those of 100% water.
    #[must_use]
    pub fn empty() -> Self {
        Self {
            total_amount: 0.0,
            composition: Composition::empty(),
            fpd: FPD::empty(),
        }
    }

    /// Access specific mix property values via an [`PropKey`]
    #[must_use]
    pub fn get(&self, key: PropKey) -> f64 {
        match key {
            PropKey::CompKey(comp_key) => self.composition.get(comp_key),
            PropKey::FpdKey(fpd_key) => self.fpd.get(fpd_key),
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl MixProperties {
    /// Creates a new empty [`MixProperties`], forwards to [`MixProperties::empty`].
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }
}

impl Default for MixProperties {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use crate::composition::*;
    use crate::fpd::FpdKey;

    use super::*;

    // --- PropKey conversions ---

    #[test]
    fn prop_key_from_comp_key() {
        let key: PropKey = CompKey::MilkFat.into();
        assert_eq!(key, PropKey::CompKey(CompKey::MilkFat));
    }

    #[test]
    fn prop_key_from_fpd_key() {
        let key: PropKey = FpdKey::FPD.into();
        assert_eq!(key, PropKey::FpdKey(FpdKey::FPD));
    }

    #[test]
    fn prop_key_equality_same_variant() {
        assert_eq!(PropKey::CompKey(CompKey::MilkFat), PropKey::CompKey(CompKey::MilkFat));
        assert_eq!(PropKey::FpdKey(FpdKey::ServingTemp), PropKey::FpdKey(FpdKey::ServingTemp));
    }

    #[test]
    fn prop_key_inequality_different_inner_key() {
        assert_ne!(PropKey::CompKey(CompKey::MilkFat), PropKey::CompKey(CompKey::MSNF));
        assert_ne!(PropKey::FpdKey(FpdKey::FPD), PropKey::FpdKey(FpdKey::ServingTemp));
    }

    #[test]
    fn prop_key_inequality_different_outer_variant() {
        assert_ne!(PropKey::CompKey(CompKey::MilkFat), PropKey::FpdKey(FpdKey::FPD));
    }

    // --- MixProperties::empty / new / default ---

    #[test]
    fn mix_properties_empty_total_amount_is_zero() {
        let mix_props = MixProperties::empty();
        assert_eq!(mix_props.total_amount, 0.0);
    }

    #[test]
    fn mix_properties_empty_comp_keys_return_zero() {
        let mix_props = MixProperties::empty();
        for key in [
            CompKey::MilkFat,
            CompKey::MSNF,
            CompKey::TotalSolids,
            CompKey::Energy,
            CompKey::TotalSugars,
        ] {
            assert_eq_flt_test!(mix_props.get(key.into()), 0.0);
        }
    }

    #[test]
    fn mix_properties_empty_water_is_100() {
        // An empty composition represents pure water: 100 - TotalSolids - Alcohol = 100
        let mix_props = MixProperties::empty();
        assert_eq_flt_test!(mix_props.get(CompKey::Water.into()), 100.0);
    }

    #[test]
    fn mix_properties_empty_fpd_is_zero() {
        let mix_props = MixProperties::empty();
        assert_eq_flt_test!(mix_props.get(FpdKey::FPD.into()), 0.0);
        assert_eq_flt_test!(mix_props.get(FpdKey::ServingTemp.into()), 0.0);
    }

    #[test]
    fn mix_properties_empty_hardness_at_14c_is_nan() {
        let mix_props = MixProperties::empty();
        assert_true!(mix_props.get(FpdKey::HardnessAt14C.into()).is_nan());
    }

    #[test]
    fn mix_properties_new_matches_empty() {
        let from_new = MixProperties::new();
        let from_empty = MixProperties::empty();
        assert_eq!(from_new.total_amount, from_empty.total_amount);
        assert_eq_flt_test!(from_new.get(CompKey::MilkFat.into()), from_empty.get(CompKey::MilkFat.into()));
        assert_eq_flt_test!(from_new.get(FpdKey::FPD.into()), from_empty.get(FpdKey::FPD.into()));
        assert_true!(from_new.get(FpdKey::HardnessAt14C.into()).is_nan());

        // Equality assertions fails because of FPD::hardness_at_14c being NaN
        assert_ne!(from_new, from_empty);
        let mut from_new = from_new;
        from_new.fpd.hardness_at_14c = 70.0;
        let mut from_empty = from_empty;
        from_empty.fpd.hardness_at_14c = 70.0;
        assert_eq!(from_new, from_empty);
    }

    #[test]
    fn mix_properties_default_matches_empty() {
        let from_default = MixProperties::default();
        let from_empty = MixProperties::empty();
        assert_eq!(from_default.total_amount, from_empty.total_amount);
        assert_eq_flt_test!(from_default.get(CompKey::MilkFat.into()), from_empty.get(CompKey::MilkFat.into()));
        assert_eq_flt_test!(from_default.get(FpdKey::FPD.into()), from_empty.get(FpdKey::FPD.into()));
        assert_true!(from_default.get(FpdKey::HardnessAt14C.into()).is_nan());

        // Equality assertions fails because of FPD::hardness_at_14c being NaN
        assert_ne!(from_default, from_empty);
        let mut from_default = from_default;
        from_default.fpd.hardness_at_14c = 70.0;
        let mut from_empty = from_empty;
        from_empty.fpd.hardness_at_14c = 70.0;
        assert_eq!(from_default, from_empty);
    }
}
