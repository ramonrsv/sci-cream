//! Types that encapsulate various properties of ice cream mixes

use serde::{Deserialize, Serialize};

use crate::{
    balancing::BalanceKey,
    composition::{CompKey, Composition, RatioKey},
    fpd::{FPD, FpdKey},
};

/// Keys for accessing specific property values from [`MixProperties`] via [`MixProperties::get()`]
///
/// This enum wraps [`CompKey`], [`RatioKey`], and [`FpdKey`] to allow accessing all properties from
/// a single interface, which is helpful in downstream applications, to have a single flattened list
/// of keys. There are [`From`] implementations for all three key types for easy conversion.
///
/// The three arms mirror the three kinds of property: extensive composition values ([`CompKey`]),
/// intensive ratios ([`RatioKey`]), and freezing-point-derived values ([`FpdKey`]).
/// Only [`CompKey`] is additive/scalable; the other two are non-additive derived properties.
///
/// **Note**: The different variants all use `#[serde(untagged)]` to allow a flat list of keys in
/// the WASM-facing balancing API, in line with how the TypeScript wrappers handle `PropKey`. This
/// requires that all variant names be unique across all the underlying key types.
///
/// # Example
///
/// ```
/// use sci_cream::{CompKey, RatioKey, FpdKey, PropKey, MixProperties};
/// let mix_props = MixProperties::empty();
/// assert_eq!(mix_props.get(CompKey::MilkFat.into()), 0.0);
/// assert_eq!(mix_props.get(RatioKey::AbsPAC.into()), 0.0);
/// assert_eq!(mix_props.get(FpdKey::FPD.into()), 0.0);
/// ```
#[derive(Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum PropKey {
    /// [`CompKey`] for extensive [`Composition`] properties from [`MixProperties::composition`]
    #[serde(untagged)]
    Comp(CompKey),
    /// [`RatioKey`] for intensive [`Composition`] ratios from [`MixProperties::composition`]
    #[serde(untagged)]
    Ratio(RatioKey),
    /// [`FpdKey`] for [`FPD`] properties from [`MixProperties::fpd`]
    #[serde(untagged)]
    Fpd(FpdKey),
}

impl From<CompKey> for PropKey {
    fn from(key: CompKey) -> Self {
        Self::Comp(key)
    }
}

impl From<RatioKey> for PropKey {
    fn from(key: RatioKey) -> Self {
        Self::Ratio(key)
    }
}

impl From<FpdKey> for PropKey {
    fn from(key: FpdKey) -> Self {
        Self::Fpd(key)
    }
}

impl From<BalanceKey> for PropKey {
    fn from(key: BalanceKey) -> Self {
        match key {
            BalanceKey::Comp(comp_key) => Self::Comp(comp_key),
            BalanceKey::Ratio(ratio_key) => Self::Ratio(ratio_key),
        }
    }
}

/// Properties of an ice cream mix, including [`Composition`] and freezing point depression [`FPD`]
#[derive(PartialEq, Clone, Debug)]
pub struct MixProperties {
    /// Total amount of the mix in grams
    pub total_amount: f64,
    /// Composition properties of the mix
    pub composition: Composition,
    /// [Freezing Point Depression (FPD)](crate::docs#freezing-point-depression)
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

    /// Creates a new empty [`MixProperties`], forwards to [`MixProperties::empty`].
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }

    /// Access specific mix property values via an [`PropKey`]
    #[must_use]
    pub fn get(&self, key: PropKey) -> f64 {
        match key {
            PropKey::Comp(comp_key) => self.composition.get(comp_key),
            PropKey::Ratio(ratio_key) => self.composition.get_ratio(ratio_key),
            PropKey::Fpd(fpd_key) => self.fpd.get(fpd_key),
        }
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
        assert_eq!(key, PropKey::Comp(CompKey::MilkFat));
    }

    #[test]
    fn prop_key_from_ratio_key() {
        let key: PropKey = RatioKey::AbsPAC.into();
        assert_eq!(key, PropKey::Ratio(RatioKey::AbsPAC));
    }

    #[test]
    fn prop_key_from_fpd_key() {
        let key: PropKey = FpdKey::FPD.into();
        assert_eq!(key, PropKey::Fpd(FpdKey::FPD));
    }

    #[test]
    fn prop_key_equality_same_variant() {
        assert_eq!(PropKey::Comp(CompKey::MilkFat), PropKey::Comp(CompKey::MilkFat));
        assert_eq!(PropKey::Ratio(RatioKey::AbsPAC), PropKey::Ratio(RatioKey::AbsPAC));
        assert_eq!(PropKey::Fpd(FpdKey::ServingTemp), PropKey::Fpd(FpdKey::ServingTemp));
    }

    #[test]
    fn prop_key_inequality_different_inner_key() {
        assert_ne!(PropKey::Comp(CompKey::MilkFat), PropKey::Comp(CompKey::MSNF));
        assert_ne!(PropKey::Ratio(RatioKey::AbsPAC), PropKey::Ratio(RatioKey::EmulsifiersPerFat));
        assert_ne!(PropKey::Fpd(FpdKey::FPD), PropKey::Fpd(FpdKey::ServingTemp));
    }

    #[test]
    fn prop_key_inequality_different_outer_variant() {
        assert_ne!(PropKey::Comp(CompKey::MilkFat), PropKey::Fpd(FpdKey::FPD));
        assert_ne!(PropKey::Ratio(RatioKey::AbsPAC), PropKey::Fpd(FpdKey::FPD));
        assert_ne!(PropKey::Comp(CompKey::MilkFat), PropKey::Ratio(RatioKey::AbsPAC));
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
