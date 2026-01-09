use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct PAC {
    pub sugars: f64,
    pub salt: f64,
    pub msnf_ws_salts: f64,
    pub alcohol: f64,
    pub hardness_factor: f64,
}

impl PAC {
    pub fn empty() -> Self {
        Self {
            sugars: 0.0,
            salt: 0.0,
            msnf_ws_salts: 0.0,
            alcohol: 0.0,
            hardness_factor: 0.0,
        }
    }

    pub fn sugars(self, sugars: f64) -> Self {
        Self { sugars, ..self }
    }

    pub fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    pub fn msnf_ws_salts(self, msnf_ws_salts: f64) -> Self {
        Self { msnf_ws_salts, ..self }
    }

    pub fn alcohol(self, alcohol: f64) -> Self {
        Self { alcohol, ..self }
    }

    pub fn hardness_factor(self, hardness_factor: f64) -> Self {
        Self {
            hardness_factor,
            ..self
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl PAC {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    /// Total PAC values from all sources, excluding hardness factor
    pub fn total(&self) -> f64 {
        self.sugars + self.salt + self.msnf_ws_salts + self.alcohol
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
