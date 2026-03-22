//! [`ArtificialSweeteners`] struct and related functionality, to track non-saccharide artificial
//! sweeteners in an ingredient or mix's composition, e.g. aspartame, sucralose, etc.

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
    /// Aspartame is a common non-saccharide high-intensity artificial sweetener
    ///
    /// Aspartame is a methyl ester of aspartic acid and phenylalanine. It is approximately 200
    /// times sweeter than sucrose, and provides about 4 kcal/g (similar to sucrose), but due to its
    /// high potency it is used in such small quantities that its energy contribution is negligible.
    /// It is one of the most studied food additives and has been deemed safe for human consumption
    /// by numerous regulatory agencies worldwide (The European Commission, 2025, E951)[^10],
    /// (International Food Information Council Foundation, 2019, "What is aspartame?")[^21],
    /// (Spillane, 2006, Table 9.3, p. 179)[^9], (Spillane, 2006, Table 9.4, p. 187)[^9]. It is
    /// found in various brand-name products such as Equal and Canderel.
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/21.md")]
    pub aspartame: f64,
    /// Cyclamate is a zero-calorie artificial sweetener
    ///
    /// Cyclamate is the sodium or calcium salt of cyclamic acid. It is approximately 30-50 times
    /// sweeter than sucrose. It is often used with other artificial sweeteners like saccharin for
    /// improved taste. It is banned in the US but approved for use in many other countries,
    /// including the EU (E952) (Spillane, 2006, Table 9.4, p. 188)[^9], (The European Commission,
    /// 2025, E952)[^10], (Lawrence, 2003, "Cyclamates")[^32].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/32.md")]
    pub cyclamate: f64,
    /// Saccharin is a non-nutritive artificial sweetener
    ///
    /// Its name is derived from "saccharine", the latin word for sugar. It is approximately 400
    /// times sweeter than sucrose, but has no caloric value. It is one of the oldest artificial
    /// sweeteners, discovered in 1878. Its use became widespread with the introduction of
    /// cyclamate, which is often used in combination with saccharin to improve the taste. It is
    /// widely approved for use in many countries, including in the US and EU (E954) (Spillane,
    /// 2006, Table 9.3, p. 181)[^9], (The European Commission, 2025, E954)[^10], (American Diabetes
    /// Association, 2014, "Saccharin")[^22].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/22.md")]
    pub saccharin: f64,
    /// Sucralose is a common non-nutritive artificial sweetener
    ///
    /// It is derived from and approximately 600 times sweeter than sucrose. It compares favorably
    /// to other artificial sweeteners in terms of taste, stability, and safety profile, and is one
    /// of the most commonly used artificial sweeteners, found in products such as Splenda. It is
    /// widely approved for use in many countries, including in the US and EU (E955) (Spillane,
    /// 2006, Table 9.3, p. 184)[^9], (The European Commission, 2025, E955)[^10], (Castro-Muñoz,
    /// 2022)[^11]), (Hull, 2010, Appendix C.3, p. 324)[^15], (Schiffman, 2013, "Abstract")[^23].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/10.md")]
    #[doc = include_str!("../../docs/bibs/11.md")]
    #[doc = include_str!("../../docs/bibs/15.md")]
    #[doc = include_str!("../../docs/bibs/23.md")]
    pub sucralose: f64,
    /// Steviol glycosides are the main active sweetening compounds in stevia extract
    ///
    /// Stevioside and rebaudioside are ent-kaurene-type diterpene glycosides based on the aglycone
    /// steviol isolated from the leaves of Stevia rebaudiana (commonly known as candyleaf,
    /// sweetleaf, or sugarleaf). Their sweetness has been rated as 210 and 450 times sweeter than
    /// sucrose (Spillane, 2006, p. 210, 297)[^9]. They are not digested and so have no caloric
    /// value (Priscilla, 2018, "Metabolism of steviol glycosides")[^28]. They are the primary
    /// sweetening compounds in stevia extract, a common low-calorie sugar substitute.
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/28.md")]
    pub steviosides: f64,
    /// Mogrosides are the main active sweetening compounds in monkfruit extract
    ///
    /// Mogrosides are cucurbitane-type triterpenoid glycosides isolated from the fruits of Siraitia
    /// grosvenorii (commonly known as monkfruit, swingle fruit, or luo han guo). Their sweetness
    /// has been rated as 233 to 425 times sweeter than  sucrose (Spillane, 2006, p. 210, 297)[^9].
    /// They are degraded by digestive enzymes and intestinal microflora, and excreted in the feces
    /// as mogrol, so so they have no caloric value (Murata, 2010, "Abstract")[^29].They are the
    /// primary sweetening compounds in monkfruit extract, a common low-calorie sugar substitute.
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/29.md")]
    pub mogrosides: f64,
    /// Any other artificial sweeteners not explicitly tracked by the other fields
    ///
    /// **Note**: If this field is used, energy, POD, and PAC calculations will not be possible,
    /// since the specific compounds being used and their properties are unknown.
    pub other: f64,
}

impl ArtificialSweeteners {
    /// Creates an empty struct with all fields set to zero (i.e. no artificial sweeteners)
    #[must_use]
    pub const fn empty() -> Self {
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

    /// Creates a new empty `ArtificialSweeteners` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`aspartame`](Self::aspartame)
    #[must_use]
    pub const fn aspartame(self, aspartame: f64) -> Self {
        Self { aspartame, ..self }
    }

    /// Field-update method for [`cyclamate`](Self::cyclamate)
    #[must_use]
    pub const fn cyclamate(self, cyclamate: f64) -> Self {
        Self { cyclamate, ..self }
    }

    /// Field-update method for [`saccharin`](Self::saccharin)
    #[must_use]
    pub const fn saccharin(self, saccharin: f64) -> Self {
        Self { saccharin, ..self }
    }

    /// Field-update method for [`sucralose`](Self::sucralose)
    #[must_use]
    pub const fn sucralose(self, sucralose: f64) -> Self {
        Self { sucralose, ..self }
    }

    /// Field-update method for [`steviosides`](Self::steviosides)
    #[must_use]
    pub const fn steviosides(self, steviosides: f64) -> Self {
        Self { steviosides, ..self }
    }

    /// Field-update method for [`mogrosides`](Self::mogrosides)
    #[must_use]
    pub const fn mogrosides(self, mogrosides: f64) -> Self {
        Self { mogrosides, ..self }
    }

    /// Field-update method for [`other`](Self::other)
    #[must_use]
    pub const fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total artificial sweetener content by weight, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    /// Calculates the total energy contribution of the artificial sweeteners, in kcal per 100g
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputeEnergy`] if the [`other`](Self::other) field is non-zero;
    /// that would prevent this calculation from being performed since the specific compounds being
    /// used and their energy contributions are unknown.
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
        .sum::<f64>())
    }

    /// Calculates the [POD](crate::docs#pod) contributions of the artificial sweeteners, in terms
    /// of sucrose equivalence
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePOD`] if the [`other`](Self::other) field is non-zero; that
    /// would prevent this calculation from being performed since the specific compounds being used
    /// and their POD contributions are unknown.
    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Cannot compute POD with other artificial sweeteners".to_string()));
        }

        Ok([
            self.aspartame * constants::pod::ASPARTAME,
            self.cyclamate * constants::pod::CYCLAMATE,
            self.saccharin * constants::pod::SACCHARIN,
            self.sucralose * constants::pod::SUCRALOSE,
            self.steviosides * constants::pod::STEVIOSIDES,
            self.mogrosides * constants::pod::MOGROSIDES,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    /// Calculates the [PAC](crate::docs#pac-afp-fpdf-se) contributions of the artificial
    /// sweeteners, in terms of sucrose equivalence
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePAC`] if the [`other`](Self::other) field is non-zero; that
    /// would prevent this calculation from being performed since the specific compounds being used
    /// and their PAC contributions are unknown.
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

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl ArtificialSweeteners {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
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

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::util::{assert_f64_fields_eq_zero, assert_f64_fields_ne_zero};

    use super::*;

    const FIELD_MODIFIERS: [fn(&mut ArtificialSweeteners, f64); 7] = [
        |v, ec| v.aspartame += ec,
        |v, ec| v.cyclamate += ec,
        |v, ec| v.saccharin += ec,
        |v, ec| v.sucralose += ec,
        |v, ec| v.steviosides += ec,
        |v, ec| v.mogrosides += ec,
        |v, ec| v.other += ec,
    ];

    #[test]
    fn artificial_sweetener_field_count() {
        assert_eq!(ArtificialSweeteners::new().iter().count(), 7);
    }

    #[test]
    fn artificial_sweetener_no_fields_missed() {
        assert_eq!(ArtificialSweeteners::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn artificial_sweeteners_empty() {
        let sweeteners = ArtificialSweeteners::empty();
        assert_eq!(sweeteners, ArtificialSweeteners::new());

        assert_f64_fields_eq_zero(&sweeteners);

        assert_eq!(sweeteners.total(), 0.0);
        assert_eq!(sweeteners.energy().unwrap(), 0.0);
        assert_eq!(sweeteners.to_pod().unwrap(), 0.0);
        assert_eq!(sweeteners.to_pac().unwrap(), 0.0);
    }

    #[test]
    fn artificial_sweeteners_field_update_methods() {
        let sweeteners = ArtificialSweeteners::new()
            .aspartame(1.0)
            .cyclamate(2.0)
            .saccharin(3.0)
            .sucralose(4.0)
            .steviosides(5.0)
            .mogrosides(6.0)
            .other(7.0);

        assert_f64_fields_ne_zero(&sweeteners);

        assert_eq!(sweeteners.aspartame, 1.0);
        assert_eq!(sweeteners.cyclamate, 2.0);
        assert_eq!(sweeteners.saccharin, 3.0);
        assert_eq!(sweeteners.sucralose, 4.0);
        assert_eq!(sweeteners.steviosides, 5.0);
        assert_eq!(sweeteners.mogrosides, 6.0);
        assert_eq!(sweeteners.other, 7.0);
    }

    #[test]
    fn artificial_sweeteners_total() {
        let sweeteners = ArtificialSweeteners::new()
            .aspartame(1.0)
            .cyclamate(2.0)
            .saccharin(3.0)
            .sucralose(4.0)
            .steviosides(5.0)
            .mogrosides(6.0)
            .other(7.0);

        assert_f64_fields_ne_zero(&sweeteners);
        assert_eq!(sweeteners.total(), 28.0);
    }

    #[test]
    fn artificial_sweeteners_energy() {
        let new = || ArtificialSweeteners::new();
        assert_eq!(new().aspartame(1.0).energy().unwrap(), 4.0);
        assert_eq!(new().cyclamate(1.0).energy().unwrap(), 0.0);
        assert_eq!(new().saccharin(1.0).energy().unwrap(), 0.0);
        assert_eq!(new().sucralose(1.0).energy().unwrap(), 0.0);
        assert_eq!(new().steviosides(1.0).energy().unwrap(), 0.0);
        assert_eq!(new().mogrosides(1.0).energy().unwrap(), 0.0);
    }

    #[test]
    fn artificial_sweeteners_energy_error() {
        assert!(matches!(ArtificialSweeteners::new().other(100.0).energy(), Err(Error::CannotComputeEnergy(_))));
    }

    #[test]
    fn artificial_sweeteners_to_pod() {
        let new = || ArtificialSweeteners::new();
        assert_eq!(new().aspartame(1.0).to_pod().unwrap(), 200.0);
        assert_eq!(new().cyclamate(1.0).to_pod().unwrap(), 30.0);
        assert_eq!(new().saccharin(1.0).to_pod().unwrap(), 400.0);
        assert_eq!(new().sucralose(1.0).to_pod().unwrap(), 600.0);
        assert_eq!(new().steviosides(1.0).to_pod().unwrap(), 225.0);
        assert_eq!(new().mogrosides(1.0).to_pod().unwrap(), 340.0);
    }

    #[test]
    fn artificial_sweeteners_to_pod_error() {
        assert!(matches!(ArtificialSweeteners::new().other(1.0).to_pod(), Err(Error::CannotComputePOD(_))));
    }

    #[test]
    fn artificial_sweeteners_to_pac() {
        let new = || ArtificialSweeteners::new();
        assert_eq!(new().aspartame(100.0).to_pac().unwrap(), 116.0);
        assert_eq!(new().cyclamate(100.0).to_pac().unwrap(), 170.0);
        assert_eq!(new().saccharin(100.0).to_pac().unwrap(), 186.0);
        assert_eq!(new().sucralose(100.0).to_pac().unwrap(), 86.0);
        assert_eq!(new().steviosides(100.0).to_pac().unwrap(), 0.0);
        assert_eq!(new().mogrosides(100.0).to_pac().unwrap(), 0.0);
    }

    #[test]
    fn artificial_sweeteners_to_pac_error() {
        assert!(matches!(ArtificialSweeteners::new().other(100.0).to_pac(), Err(Error::CannotComputePAC(_))));
    }

    #[test]
    fn artificial_sweeteners_scale() {
        let sweeteners = ArtificialSweeteners::new()
            .aspartame(1.0)
            .cyclamate(2.0)
            .saccharin(3.0)
            .sucralose(4.0)
            .steviosides(5.0)
            .mogrosides(6.0)
            .other(7.0);
        assert_eq!(sweeteners.total(), 28.0);

        let scaled = sweeteners.scale(0.5);

        assert_f64_fields_ne_zero(&sweeteners);
        assert_f64_fields_ne_zero(&scaled);

        assert_eq!(scaled.aspartame, 0.5);
        assert_eq!(scaled.cyclamate, 1.0);
        assert_eq!(scaled.saccharin, 1.5);
        assert_eq!(scaled.sucralose, 2.0);
        assert_eq!(scaled.steviosides, 2.5);
        assert_eq!(scaled.mogrosides, 3.0);
        assert_eq!(scaled.other, 3.5);
        assert_eq!(scaled.total(), 14.0);
    }

    #[test]
    fn artificial_sweeteners_add() {
        let a = ArtificialSweeteners::new()
            .aspartame(1.0)
            .cyclamate(2.0)
            .saccharin(3.0)
            .sucralose(4.0)
            .steviosides(5.0)
            .mogrosides(6.0)
            .other(7.0);

        let b = ArtificialSweeteners::new()
            .aspartame(0.5)
            .cyclamate(1.0)
            .saccharin(1.5)
            .sucralose(2.0)
            .steviosides(2.5)
            .mogrosides(3.0)
            .other(3.5);

        assert_eq!(a.total(), 28.0);
        assert_eq!(b.total(), 14.0);

        let added = a.add(&b);

        for v in [a, b, added] {
            assert_f64_fields_ne_zero(&v);
        }

        assert_eq!(added.aspartame, 1.5);
        assert_eq!(added.cyclamate, 3.0);
        assert_eq!(added.saccharin, 4.5);
        assert_eq!(added.sucralose, 6.0);
        assert_eq!(added.steviosides, 7.5);
        assert_eq!(added.mogrosides, 9.0);
        assert_eq!(added.other, 10.5);
        assert_eq!(added.total(), 42.0);
    }

    #[test]
    fn artificial_sweeteners_abs_diff_eq() {
        let a = ArtificialSweeteners::new()
            .aspartame(1.0)
            .cyclamate(2.0)
            .saccharin(3.0)
            .sucralose(4.0)
            .steviosides(5.0)
            .mogrosides(6.0)
            .other(7.0);
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_f64_fields_ne_zero(&v);
        }

        assert_abs_diff_eq!(a, b);
        assert_abs_diff_eq!(a, c);

        for field_modifier in FIELD_MODIFIERS {
            assert_abs_diff_eq!(a, c);
            field_modifier(&mut c, 1e-10);
            assert_abs_diff_ne!(a, c);
            field_modifier(&mut c, -1e-10);
            assert_abs_diff_eq!(a, c);
        }
    }
}
