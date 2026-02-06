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
        PropKey::CompKey(key)
    }
}

impl From<FpdKey> for PropKey {
    fn from(key: FpdKey) -> Self {
        PropKey::FpdKey(key)
    }
}

/// Properties of an ice cream mix, including [`Composition`] and freezing point depression [`FPD`]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Clone, Debug)]
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
