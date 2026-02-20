//! [`Polyols`] struct and related functionality, representing the breakdown of sugar alcohol
//! (polyol) sweeteners in an ingredient or mix

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
use crate::composition::ArtificialSweeteners;

/// Sugar alcohols, commonly used as sugar substitutes, e.g. erythritol, maltitol, etc.
///
/// Polyols are reduced-calorie, sugar-free bulk sweeteners. Because the intensity of sweetness and
/// sweetness profile of polyols are close to sucrose, they can be used to replace sugar for bulk
/// and sweetness in ice cream formulations. This is an advantage of polyols over intense sweeteners
/// that require bulking agents or fillers (Spillane, 2006, p. 153)[^9]. Polyols also have sever
/// health advantages, such as not promoting tooth decay and producing low glycemic index and
/// reduced insulin response, making them suitable for diabetics (Spillane, 2006, p. 161)[^9].
///
/// **Note**: These are distinct from artificial sweeteners (e.g. aspartame, sucralose, etc.) which
/// typically have no functional properties other than sweetness. See [`ArtificialSweeteners`].
#[doc = include_str!("../../docs/bibs/9.md")]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Polyols {
    /// Erythritol is a sugar alcohol that occurs naturally in some fruits and fermented foods
    ///
    /// It is about 70% as sweet as sucrose, but has almost no caloric value (0.2 kcal/g). It has a
    /// sweetness profile similar to sucrose with slight acidity and bitterness, no aftertaste,
    /// clean sweet taste, and a cooling sensation in the mouth. It is approved for general use in
    /// most countries, including in the US and EU (E968) (Spillane, 2006, Table 8.5, p. 159)[^9],
    /// (The European Commission, 2025, E968)[^10], (Hull, 2010, Appendix C.3, p. 324)[^15],
    /// (European Association of Polyols Producers, 2026, "Polyol Erythritol")[^19].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/15.md")]
    #[doc = include_str!("../../docs/bibs/19.md")]
    pub erythritol: f64,
    /// Maltitol is a sugar alcohol derived from maltose obtained from starch
    ///
    /// It is about 90% as sweet as sucrose, sweeter than most other polyols, has a low cooling
    /// effect in the mouth, similar to sucrose, and is one of the most hygroscopic polyols. It has
    /// a caloric value of approximately 2.4 kcal/g. It is often used as a fat replacer because of
    /// its creamy mouth feel. It is approved for general use in most countries, including in the US
    /// and EU (E965) (Spillane, 2006, Tables 8.3, 8.5, p. 156, 159)[^9], (The European Commission,
    /// 2025, E965)[^10], (Hull, 2010, Appendix C.3, p. 324)[^15], (European Association of Polyols
    /// Producers, 2026, "Polyol Maltitol")[^19]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/15.md")]
    #[doc = include_str!("../../docs/bibs/19.md")]
    pub maltitol: f64,
    /// Sorbitol is a sugar alcohol that occurs naturally in some fruits
    ///
    /// It is approximately 50-60% as sweet as sucrose and has a similar sweetness profile, but it
    /// has a significant cooling effect in the mouth. It is one of the most hygroscopic polyols,
    /// and has a caloric value of approximately 2.6-3.0 kcal/g. It is approved for general use in
    /// most countries, including in the US and EU (E420) (Spillane, 2006, Tables 8.3, 8.5, p. 156,
    /// 159)[^9], (The European Commission, 2025, E420)[^10], (Hull, 2010, Appendix C.3, p.
    /// 324)[^15], (European Association of Polyols Producers, 2026, "Polyol Sorbitol")[^19].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/15.md")]
    #[doc = include_str!("../../docs/bibs/19.md")]
    pub sorbitol: f64,
    /// Xylitol is a sugar alcohol that occurs naturally in some fruits
    ///
    /// It is almost as sweet as sucrose at about 95% the sweetness, and has a similar sweetness
    /// profile, but it has an intense cooling effect in the mouth that makes it less suitable for
    /// use in some formulations. It is the most hygroscopic polyol, and has a caloric value of
    /// approximately 2.4-3.0 kcal/g. It is approved for general use in most countries, including in
    /// the US and EU (E967) (Spillane, 2006, Tables 8.3, 8.5, p. 156, 159)[^9], (The European
    /// Commission, 2025, E967)[^10], (Hull, 2010, Appendix C.3, p. 324)[^15], (European Association
    /// of Polyols Producers, 2026, "Polyol Xylitol")[^19].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/15.md")]
    #[doc = include_str!("../../docs/bibs/19.md")]
    pub xylitol: f64,
    /// Any other polyols not explicitly tracked by the other fields
    ///
    /// **Note**: If this field is used, energy, POD, and PAC calculations will not be possible,
    /// since the specific compounds being used and their properties are unknown.
    pub other: f64,
}

impl Polyols {
    /// Creates an empty `Polyols` struct with all fields set to zero (i.e. 0g of all polyols)
    #[must_use]
    pub fn empty() -> Self {
        Self {
            erythritol: 0.0,
            maltitol: 0.0,
            sorbitol: 0.0,
            xylitol: 0.0,
            other: 0.0,
        }
    }

    /// Field-update method for [`erythritol`](Polyols::erythritol)
    #[must_use]
    pub fn erythritol(self, erythritol: f64) -> Self {
        Self { erythritol, ..self }
    }

    /// Field-update method for [`maltitol`](Polyols::maltitol)
    #[must_use]
    pub fn maltitol(self, maltitol: f64) -> Self {
        Self { maltitol, ..self }
    }

    /// Field-update method for [`sorbitol`](Polyols::sorbitol)
    #[must_use]
    pub fn sorbitol(self, sorbitol: f64) -> Self {
        Self { sorbitol, ..self }
    }

    /// Field-update method for [`xylitol`](Polyols::xylitol)
    #[must_use]
    pub fn xylitol(self, xylitol: f64) -> Self {
        Self { xylitol, ..self }
    }

    /// Field-update method for [`other`](Polyols::other)
    #[must_use]
    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total energy contributed by the polyols, in kcal per 100g of mix
    ///
    /// **Note**: If the [`other`](Self::other) field is used, this calculation will not be possible
    /// since the specific compounds being used and their energy contributions are unknown.
    pub fn energy(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputeEnergy("Cannot compute energy with other polyols".to_string()));
        }

        Ok([
            self.erythritol * constants::energy::ERYTHRITOL,
            self.maltitol * constants::energy::MALTITOL,
            self.sorbitol * constants::energy::SORBITOL,
            self.xylitol * constants::energy::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>())
    }

    /// Calculates the [POD](crate::docs#pod) contributions of the polyols, in terms of sucrose
    /// equivalence
    ///
    /// **Note**: If the [`other`](Self::other) field is used, this calculation will not be possible
    /// since the specific compounds being used and their POD contributions are unknown.
    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Cannot compute POD with other polyols".to_string()));
        }

        Ok([
            self.erythritol * constants::pod::ERYTHRITOL,
            self.maltitol * constants::pod::MALTITOL,
            self.sorbitol * constants::pod::SORBITOL,
            self.xylitol * constants::pod::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    /// Calculates the [PAC](crate::docs#pac-afp-fpdf-se) contributions of the polyols, in terms of
    /// sucrose equivalence
    ///
    /// **Note**: If the [`other`](Self::other) field is used, this calculation will not be possible
    /// since the specific compounds being used and their PAC contributions are unknown.
    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Cannot compute PAC with other polyols".to_string()));
        }

        Ok([
            self.erythritol * constants::pac::ERYTHRITOL,
            self.maltitol * constants::pac::MALTITOL,
            self.sorbitol * constants::pac::SORBITOL,
            self.xylitol * constants::pac::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Polyols {
    /// Creates a new empty `Polyols` struct, forwards to [`Polyols::empty`]
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }

    /// Calculates the total polyol content, in grams per 100g of mix, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }
}

impl ScaleComponents for Polyols {
    fn scale(&self, factor: f64) -> Self {
        Self {
            erythritol: self.erythritol * factor,
            maltitol: self.maltitol * factor,
            sorbitol: self.sorbitol * factor,
            xylitol: self.xylitol * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            erythritol: self.erythritol + other.erythritol,
            maltitol: self.maltitol + other.maltitol,
            sorbitol: self.sorbitol + other.sorbitol,
            xylitol: self.xylitol + other.xylitol,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Polyols {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Polyols {
    fn default() -> Self {
        Self::empty()
    }
}
