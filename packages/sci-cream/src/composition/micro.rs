//! [`Micro`] struct and related functionality, representing the breakdown of micro components in an
//! ice cream composition, such as salt, lecithin, emulsifiers, and stabilizers.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::composition::{CompKey, Solids};

/// Micro components breakdown of an ingredient or mix, and some related special properties
///
/// These components are already accounted for in [`Solids`], but they are also tracked here with a
/// more detailed breakdown, e.g. for micronutrient nutrition analysis. Special properties and
/// effects of these components are also tracked here, e.g. emulsification and stabilization
/// effects, which are relevant for ice cream science but not necessarily captured by the overall
/// solids breakdown. Except for [`salt`](Self::salt), which contributes to freezing point
/// depression, these components do not meaningfully contribute to other macro properties of a mix,
/// e.g. energy, [POD](crate::docs#pod), [PAC](crate::docs#pac-afp-fpdf-se), etc. Any such miniscule
/// contributions are accounted for in the solids breakdown, i.e. as part of `solids.other.others`.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Micro {
    /// Total salt content, excluding salts from milk ingredients
    ///
    /// This includes any salt added as an ingredient, as well as any salt that is part of other
    /// ingredients, e.g. the salt in chocolate or nut ingredients, but excludes salts naturally
    /// present in milk ingredients, which are accounted for separately in [`CompKey::MilkSNFS`] .
    pub salt: f64,
    /// Total lecithin content, a subset of [`emulsifiers`](Self::emulsifiers)
    pub lecithin: f64,
    /// Total emulsifier content, including lecithin and others not explicitly tracked here
    // @todo Should this be explicit about the concept and unit of "strength" of emulsifiers?
    pub emulsifiers: f64,
    /// Total stabilizer content, e.g. from Locust Bean Gum, Guar Gum, etc.
    // @todo Should this be explicit about the concept and unit of "strength" of stabilizers?
    pub stabilizers: f64,
}

impl Micro {
    /// Creates an empty [`Micro`] struct with all fields set to 0.
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            salt: 0.0,
            lecithin: 0.0,
            emulsifiers: 0.0,
            stabilizers: 0.0,
        }
    }

    /// Creates a new empty `Micro` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`salt`](Self::salt).
    #[must_use]
    pub const fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    /// Field-update method for [`lecithin`](Self::lecithin).
    #[must_use]
    pub const fn lecithin(self, lecithin: f64) -> Self {
        Self { lecithin, ..self }
    }

    /// Field-update method for [`emulsifiers`](Self::emulsifiers).
    #[must_use]
    pub const fn emulsifiers(self, emulsifiers: f64) -> Self {
        Self { emulsifiers, ..self }
    }

    /// Field-update method for [`stabilizers`](Self::stabilizers).
    #[must_use]
    pub const fn stabilizers(self, stabilizers: f64) -> Self {
        Self { stabilizers, ..self }
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Micro {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl ScaleComponents for Micro {
    fn scale(&self, factor: f64) -> Self {
        Self {
            salt: self.salt * factor,
            lecithin: self.lecithin * factor,
            stabilizers: self.stabilizers * factor,
            emulsifiers: self.emulsifiers * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            salt: self.salt + other.salt,
            lecithin: self.lecithin + other.lecithin,
            stabilizers: self.stabilizers + other.stabilizers,
            emulsifiers: self.emulsifiers + other.emulsifiers,
        }
    }
}

impl AbsDiffEq for Micro {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Micro {
    fn default() -> Self {
        Self::empty()
    }
}
