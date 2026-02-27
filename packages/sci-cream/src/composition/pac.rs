//! [`PAC`] and associated functionality to represent the overall [PAC](crate::docs#pac-afp-fpdf-se)
//! of an ingredient or mix, and the breakdown of contributions by key ingredient categories

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Overall [PAC](crate::docs#pac-afp-fpdf-se) and contributions by key ingredient categories
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct PAC {
    /// Contribution of sugars to the overall PAC
    pub sugars: f64,
    /// Contribution of salt to the overall PAC
    pub salt: f64,
    /// Contribution of milk solids non-fat (MSNF) and whey solids (WS) salts to the overall PAC
    pub msnf_ws_salts: f64,
    /// Contribution of alcohol to the overall PAC
    pub alcohol: f64,
    /// [Hardness Factor (HF)](crate::docs#corvitto-method-hardness-factor) of the ingredient or mix
    pub hardness_factor: f64,
}

impl PAC {
    /// Creates an empty [`PAC`] struct with all fields set to zero
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            sugars: 0.0,
            salt: 0.0,
            msnf_ws_salts: 0.0,
            alcohol: 0.0,
            hardness_factor: 0.0,
        }
    }

    /// Creates a new empty `PAC` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`sugars`](Self::sugars)
    #[must_use]
    pub const fn sugars(self, sugars: f64) -> Self {
        Self { sugars, ..self }
    }

    /// Field-update method for [`salt`](Self::salt)
    #[must_use]
    pub const fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    /// Field-update method for [`msnf_ws_salts`](Self::msnf_ws_salts)
    #[must_use]
    pub const fn msnf_ws_salts(self, msnf_ws_salts: f64) -> Self {
        Self { msnf_ws_salts, ..self }
    }

    /// Field-update method for [`alcohol`](Self::alcohol)
    #[must_use]
    pub const fn alcohol(self, alcohol: f64) -> Self {
        Self { alcohol, ..self }
    }

    /// Field-update method for [`hardness_factor`](Self::hardness_factor)
    #[must_use]
    pub const fn hardness_factor(self, hardness_factor: f64) -> Self {
        Self {
            hardness_factor,
            ..self
        }
    }

    /// Calculates the total PAC contributions from all sources, excluding hardness factor
    #[must_use]
    pub fn total(&self) -> f64 {
        self.sugars + self.salt + self.msnf_ws_salts + self.alcohol
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl PAC {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl ScaleComponents for PAC {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars * factor,
            salt: self.salt * factor,
            msnf_ws_salts: self.msnf_ws_salts * factor,
            alcohol: self.alcohol * factor,
            hardness_factor: self.hardness_factor * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars + other.sugars,
            salt: self.salt + other.salt,
            msnf_ws_salts: self.msnf_ws_salts + other.msnf_ws_salts,
            alcohol: self.alcohol + other.alcohol,
            hardness_factor: self.hardness_factor + other.hardness_factor,
        }
    }
}

impl AbsDiffEq for PAC {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for PAC {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    #[test]
    fn pac_total() {
        let pac = COMP_2_MILK.pac;
        assert_eq!(pac.sugars, 4.8069);
        assert_eq!(pac.salt, 0.0);
        assert_eq!(pac.msnf_ws_salts, 3.2405);
        assert_eq!(pac.alcohol, 0.0);
        assert_eq!(pac.total(), 8.0474);
    }
}
