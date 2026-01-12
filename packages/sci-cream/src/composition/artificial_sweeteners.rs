use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    constants,
    error::{Error, Result},
    util::{iter_all_abs_diff_eq, iter_fields_as},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::composition::Polyols;

/// Non-saccharide artificial sweeteners, commonly used as sugar substitutes, e.g. aspartame
///
/// These are typically high-intensity sweeteners ranging from 10s to 100s of thousands of times
/// sweeter than sucrose (Spillane, 2006, Table 9.7, p. 209-213)[^9]. They are often non-nutritive,
/// but even when they aren't (e.g. [`ASPARTAME`](constants::energy::ASPARTAME), which provides
/// 4kcal/g, similar to sucrose), due to their high potency they are used in such small quantities
/// that their energy contribution is negligible. They can be produced synthetically (e.g.
/// aspartame, sucralose) or extracted from natural sources (e.g. stevia and monkfruit extracts).
///
/// In ice cream formulations their sole purpose is to provide sweetness without contributing to
/// the bulk, freezing point depression, or other functional properties that sugars provide.
///
/// **Note**: These are distinct from sugar alcohols (e.g. erythritol, maltitol, etc.) which have
/// different functional properties and are used in different quantities. See [`Polyols`].
#[doc = include_str!("../../docs/bibs/9.md")]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct ArtificialSweeteners {
    pub aspartame: f64,
    pub cyclamate: f64,
    pub saccharin: f64,
    pub sucralose: f64,
    /// Steviol glycosides are the main active sweetening compounds in stevia extract
    ///
    /// Stevioside and rebaudioside are ent-kaurene-type diterpene glycosides based on the aglycone
    /// steviol isolated from the leaves of Stevia rebaudiana (commonly known as candyleaf,
    /// sweetleaf, or sugarleaf). Their sweetness has been rated as 210 and 450 times sweeter than
    /// sucrose (Spillane, 2006, p. 210, 297)[^9]. They are the primary sweetening compounds in
    /// stevia extract, a common low-calorie sugar substitute.
    #[doc = include_str!("../../docs/bibs/9.md")]
    pub steviosides: f64,
    /// Mogrosides are the main active sweetening compounds in monkfruit extract
    ///
    /// Mogrosides are cucurbitane-type triterpenoid glycosides isolated from the fruits of Siraitia
    /// grosvenorii (commonly known as monkfruit, swingle fruit, or luo han guo). Their sweetness
    /// has been rated as 233 to 425 times sweeter than  sucrose (Spillane, 2006, p. 210, 297)[^9].
    /// They are the primary sweetening compounds in monkfruit extract, a common low-calorie sugar
    /// substitute.
    #[doc = include_str!("../../docs/bibs/9.md")]
    pub mogrosides: f64,
    pub other: f64,
}

impl ArtificialSweeteners {
    pub fn empty() -> Self {
        Self {
            aspartame: 0.0,
            cyclamate: 0.0,
            saccharin: 0.0,
            sucralose: 0.0,
            steviosides: 0.0,
            mogrosides: 0.0,
            other: 0.0,
        }
    }

    #[must_use]
    pub fn aspartame(self, aspartame: f64) -> Self {
        Self { aspartame, ..self }
    }

    #[must_use]
    pub fn cyclamate(self, cyclamate: f64) -> Self {
        Self { cyclamate, ..self }
    }

    #[must_use]
    pub fn saccharin(self, saccharin: f64) -> Self {
        Self { saccharin, ..self }
    }

    #[must_use]
    pub fn sucralose(self, sucralose: f64) -> Self {
        Self { sucralose, ..self }
    }

    #[must_use]
    pub fn steviosides(self, steviosides: f64) -> Self {
        Self { steviosides, ..self }
    }

    #[must_use]
    pub fn mogrosides(self, mogrosides: f64) -> Self {
        Self { mogrosides, ..self }
    }

    #[must_use]
    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    pub fn energy(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputeEnergy(
                "Cannot compute energy with other artificial sweeteners".to_string(),
            ));
        }

        Ok([
            self.aspartame * constants::energy::ASPARTAME,
            self.cyclamate * constants::energy::CYCLAMATE,
            self.saccharin * constants::energy::SACCHARIN,
            self.sucralose * constants::energy::SUCRALOSE,
            self.steviosides * constants::energy::STEVIOSIDES,
            self.mogrosides * constants::energy::MOGROSIDES,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.steviosides != 0.0 || self.mogrosides != 0.0 || self.other != 0.0 {
            return Err(Error::CannotComputePOD(
                "Cannot compute POD with steviosides, mogrosides, or other artificial sweeteners".to_string(),
            ));
        }

        Ok([
            self.aspartame * constants::pod::ASPARTAME,
            self.cyclamate * constants::pod::CYCLAMATE,
            self.saccharin * constants::pod::SACCHARIN,
            self.sucralose * constants::pod::SUCRALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Cannot compute PAC with other artificial sweeteners".to_string()));
        }

        Ok([
            self.aspartame * constants::pac::ASPARTAME,
            self.cyclamate * constants::pac::CYCLAMATE,
            self.saccharin * constants::pac::SACCHARIN,
            self.sucralose * constants::pac::SUCRALOSE,
            /* steviosides purposely ignored, they are large molecules */
            /* mogrosides purposely ignored, they are large molecules */
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl ArtificialSweeteners {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }
}

impl ScaleComponents for ArtificialSweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            aspartame: self.aspartame * factor,
            cyclamate: self.cyclamate * factor,
            saccharin: self.saccharin * factor,
            sucralose: self.sucralose * factor,
            steviosides: self.steviosides * factor,
            mogrosides: self.mogrosides * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            aspartame: self.aspartame + other.aspartame,
            cyclamate: self.cyclamate + other.cyclamate,
            saccharin: self.saccharin + other.saccharin,
            sucralose: self.sucralose + other.sucralose,
            steviosides: self.steviosides + other.steviosides,
            mogrosides: self.mogrosides + other.mogrosides,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for ArtificialSweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for ArtificialSweeteners {
    fn default() -> Self {
        Self::empty()
    }
}
