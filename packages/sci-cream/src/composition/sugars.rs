//! [`Sugars`] struct and related functionality, representing the sugars present in an ingredient or
//! mix, including monosaccharides, disaccharides, and other sugars.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    constants,
    error::{Error, Result},
    util::{collect_fields_copied_as, iter_all_abs_diff_eq, iter_fields_as},
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::composition::{ArtificialSweeteners, Polyols};

/// Sugars present in an ingredient or mix, mostly monosaccharides and disaccharides
///
/// Sugars are one of the most crucial components in ice cream, contributing to sweetness, freezing
/// point depression, ice crystal control, overall texture, and more. Different type of sugars
/// have different properties and contribute differently to these various aspects of the ice cream.
/// Good ice cream formulations make use of a variety of different sugars to achieve the desired
/// balance of properties. For example, glucose (dextrose) is less sweet than sucrose but has
/// stronger freezing point depression, so it is often used to lower the sweetness of a formulation
/// while still providing good texture (Raphaelson, 2023, February)[^1]. Given their importance,
/// this struct tracks a detailed breakdown of all the different monosaccharides and disaccharides
/// commonly found in ice cream, which allows accurate calculations of energy, POD, and PAC
/// contributions, as well as more detailed analysis of specific sugar combinations.
///
/// Whilst not without some challenges, it is possible to replace some or all sugars in a
/// formulation with polyols (sugar alcohols) and/or artificial sweeteners, whether for dietary
/// reasons or to achieve specific functional properties that aren't possible with sugars alone,
/// e.g. using erythritol for maximum freezing point depression without adding sweetness (Raphaelson,
/// 2019, July)[^35]. See [`Polyols`] and [`ArtificialSweeteners`] for more details on these.
#[doc = include_str!("../../docs/bibs/1.md")]
#[doc = include_str!("../../docs/bibs/35.md")]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sugars {
    /// Glucose, also known as dextrose, is one of the two monosaccharides present in sucrose, the
    /// other being fructose
    ///
    /// It is about 75% as sweet as sucrose, but has almost twice the freezing point depression, so
    /// it is often used to reduce sweetness while simultaneously softening the texture. It is
    /// hygroscopic, so it's also helpful in reducing the formation of both ice crystals and sugar
    /// crystals (Raphaelson, 2023, February)[^1]. It is widely available for home use, usually in
    /// the form of dextrose monohydrate, which is about 92% glucose by weight. Having dextrose
    /// available is one of the most impactful upgrades that a home ice cream maker can make, since
    /// it allows for much better control over the sweetness and texture of the ice cream.
    #[doc = include_str!("../../docs/bibs/1.md")]
    pub glucose: f64,
    /// Fructose is is one of the two monosaccharides present in sucrose, the other being glucose
    ///
    /// It is about 25% sweeter than sucrose, and has about the same freezing point depression as
    /// dextrose, so it is often used in ice cream formulations to increase sweetness and freezing
    /// point depression without increasing solids. Fructose is even more hygroscopic than glucose,
    /// so it is particularly effective at reducing the formation of ice crystals and sugar
    /// crystals, more than any other sugar (Raphaelson, 2023, February)[^1]. It is available for
    /// purchase in crystalline form, and it's also present in honey, invert syrup, and others.
    #[doc = include_str!("../../docs/bibs/1.md")]
    pub fructose: f64,
    /// Galactose is a monosaccharide that is less common in ice cream formulations, but it is one
    /// of the two monosaccharides present in lactose, the other being glucose
    ///
    /// It is about 65% as sweet as sucrose, and has about the same freezing point depression as
    /// glucose and fructose (Spillane, 2006, p. 264)[^9]. It is not commonly used as a standalone
    /// ingredient in ice cream formulations, but it is often present in lactose-free dairy
    /// products, where the lactose is enzymatically broken down into glucose and galactose.
    #[doc = include_str!("../../docs/bibs/9.md")]
    pub galactose: f64,
    /// Sucrose, or table sugar, is the most common sugar used in ice cream formulations, and is
    /// often the baseline for sweetness, freezing point depression, and other properties
    ///
    /// It is a disaccharide composed of one glucose molecule and one fructose molecule. It is the
    /// standard for sweetness, with a [POD](crate::docs#pod) of 100, and for freezing point
    /// depression, with a [PAC](crate::docs#pac-afp-fpdf-se) of 100. Since it has the most familiar
    /// flavor and sweetness profile, it is often the primary sugar used in ice cream formulations,
    /// with others used as supplements to achieve specific functional properties (Raphaelson, 2023,
    /// February)[^1], (Goff & Hartel, 2013, Table 3.4, p. 67)[^2].
    #[doc = include_str!("../../docs/bibs/1.md")]
    #[doc = include_str!("../../docs/bibs/2.md")]
    pub sucrose: f64,
    /// Lactose is a disaccharide composed of one glucose molecule and one galactose molecule
    ///
    /// Lactose is the sugar that is present in dairy ingredients. It has the same freezing point
    /// depression as sucrose, but is less than 20% as sweet, so it is very useful for increasing
    /// solids and freezing point depression independently of sweetness. It is also excellent for
    /// controlling ice crystal formation, being able to absorb six times its weight in water
    /// (Raphaelson, 2023, February)[^1]. However, lactose has limited solubility in water, which
    /// limits how much can be added to a formulation before it starts to crystallize (Spillane,
    /// 2006, p. 264)[^9]. It's also usually not an option in dairy-free formulations like sorbets.
    #[doc = include_str!("../../docs/bibs/1.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    pub lactose: f64,
    /// Maltose is a disaccharide composed of two glucose molecules
    ///
    /// It is about 30% as sweet as sucrose, and has about the same freezing point depression
    /// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2], (Spillane, 2006, p. 253)[^9]. It is rarely
    /// used as a standalone ingredient in ice cream formulations, but it is often present in
    /// partially hydrolyzed starches, like maltodextrin and corn syrups (Furia, 1972, p. 45)[^36].
    #[doc = include_str!("../../docs/bibs/2.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/36.md")]
    pub maltose: f64,
    /// Trehalose is a disaccharide composed of two glucose molecules linked in 1.1-position
    ///
    /// It is a naturally occurring disaccharide, found in small quantities in several plants and
    /// animals. Interest in this compound has increased in recent years as commercial quantities
    /// have become available. Its sweetness is approximately 45% that of sucrose, although it
    /// persists longer than the sucrose taste. It has a lower glycemic index than other sugars
    /// (Spillane, 2006, p. 262)[^9], (Hull, 2010, Appendix C.3, p. 324)[^15]. In ice cream
    /// formulations, it has strong water controlling properties and helps with texture. However, it
    /// has low solubility and can crystallize if the concentration is too high. It has very similar
    /// functional properties to lactose in milk solids (Raphaelson, 2019, July)[^35].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/15.md")]
    #[doc = include_str!("../../docs/bibs/35.md")]
    pub trehalose: f64,
    /// Any other types of sugars not explicitly tracked by the other fields
    ///
    /// **Note**: If this field is used, energy, POD, and PAC calculations will not be possible,
    /// since the specific compounds being used and their properties are unknown.
    pub other: f64,
}

impl Sugars {
    /// Creates an empty `Sugars` struct with all fields set to zero (i.e. 0g of all sugars)
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            glucose: 0.0,
            fructose: 0.0,
            galactose: 0.0,
            sucrose: 0.0,
            lactose: 0.0,
            maltose: 0.0,
            trehalose: 0.0,
            other: 0.0,
        }
    }

    /// Creates a new empty `Sugars` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`glucose`](Self::glucose)
    #[must_use]
    pub const fn glucose(self, glucose: f64) -> Self {
        Self { glucose, ..self }
    }

    /// Field-update method for [`fructose`](Self::fructose)
    #[must_use]
    pub const fn fructose(self, fructose: f64) -> Self {
        Self { fructose, ..self }
    }

    /// Field-update method for [`galactose`](Self::galactose)
    #[must_use]
    pub const fn galactose(self, galactose: f64) -> Self {
        Self { galactose, ..self }
    }

    /// Field-update method for [`sucrose`](Self::sucrose)
    #[must_use]
    pub const fn sucrose(self, sucrose: f64) -> Self {
        Self { sucrose, ..self }
    }

    /// Field-update method for [`lactose`](Self::lactose)
    #[must_use]
    pub const fn lactose(self, lactose: f64) -> Self {
        Self { lactose, ..self }
    }

    /// Field-update method for [`maltose`](Self::maltose)
    #[must_use]
    pub const fn maltose(self, maltose: f64) -> Self {
        Self { maltose, ..self }
    }

    /// Field-update method for [`trehalose`](Self::trehalose)
    #[must_use]
    pub const fn trehalose(self, trehalose: f64) -> Self {
        Self { trehalose, ..self }
    }

    /// Field-update method for [`other`](Self::other)
    #[must_use]
    pub const fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total sugar content, in grams per 100g of mix, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    /// Calculates the total energy contributed by the sugars, in kcal per 100g of mix
    #[must_use]
    pub fn energy(&self) -> f64 {
        self.total() * constants::energy::CARBOHYDRATES
    }

    /// Calculates the [POD](crate::docs#pod) contributions of the sugars, in terms of sucrose
    /// equivalence
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePOD`] if the [`other`](Self::other) field is non-zero; that
    /// would prevent this calculation from being performed since the specific compounds being used
    /// and their POD contributions are unknown.
    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Other sugars should be zero".to_string()));
        }

        Ok([
            self.glucose * constants::pod::GLUCOSE,
            self.fructose * constants::pod::FRUCTOSE,
            self.galactose * constants::pod::GALACTOSE,
            self.sucrose * constants::pod::SUCROSE,
            self.lactose * constants::pod::LACTOSE,
            self.maltose * constants::pod::MALTOSE,
            self.trehalose * constants::pod::TREHALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    /// Calculates the [PAC](crate::docs#pac-afp-fpdf-se) contributions of the sugars, in terms of
    /// sucrose equivalence
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePAC`] if the [`other`](Self::other) field is non-zero; that
    /// would prevent this calculation from being performed since the specific compounds being used
    /// and their PAC contributions are unknown.
    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Unspecified sugars should be zero".to_string()));
        }

        Ok([
            self.glucose * constants::pac::GLUCOSE,
            self.fructose * constants::pac::FRUCTOSE,
            self.galactose * constants::pac::GALACTOSE,
            self.sucrose * constants::pac::SUCROSE,
            self.lactose * constants::pac::LACTOSE,
            self.maltose * constants::pac::MALTOSE,
            self.trehalose * constants::pac::TREHALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Sugars {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen constructors cannot be const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }

    /// WASM compatible wrapper for [`total`](Self::total)
    #[wasm_bindgen(js_name = "total")]
    #[must_use]
    pub fn total_wasm(&self) -> f64 {
        self.total()
    }

    /// WASM compatible wrapper for [`to_pod`](Self::to_pod)
    ///
    /// # Errors
    ///
    /// Forwards any errors from the underlying [`to_pod`](Self::to_pod) method.
    #[wasm_bindgen(js_name = "to_pod")]
    pub fn to_pod_wasm(&self) -> std::result::Result<f64, JsValue> {
        self.to_pod().map_err(Into::into)
    }

    /// WASM compatible wrapper for [`to_pac`](Self::to_pac)
    ///
    /// # Errors
    ///
    /// Forwards any errors from the underlying [`to_pac`](Self::to_pac) method.
    #[wasm_bindgen(js_name = "to_pac")]
    pub fn to_pac_wasm(&self) -> std::result::Result<f64, JsValue> {
        self.to_pac().map_err(Into::into)
    }
}

impl Validate for Sugars {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl ScaleComponents for Sugars {
    fn scale(&self, factor: f64) -> Self {
        Self {
            glucose: self.glucose * factor,
            fructose: self.fructose * factor,
            galactose: self.galactose * factor,
            sucrose: self.sucrose * factor,
            lactose: self.lactose * factor,
            maltose: self.maltose * factor,
            trehalose: self.trehalose * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            glucose: self.glucose + other.glucose,
            fructose: self.fructose + other.fructose,
            galactose: self.galactose + other.galactose,
            sucrose: self.sucrose + other.sucrose,
            lactose: self.lactose + other.lactose,
            maltose: self.maltose + other.maltose,
            trehalose: self.trehalose + other.trehalose,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Sugars {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Sugars {
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
    use crate::error::Error;

    const FIELD_MODIFIERS: [fn(&mut Sugars, f64); 8] = [
        |v, ec| v.glucose += ec,
        |v, ec| v.fructose += ec,
        |v, ec| v.galactose += ec,
        |v, ec| v.sucrose += ec,
        |v, ec| v.lactose += ec,
        |v, ec| v.maltose += ec,
        |v, ec| v.trehalose += ec,
        |v, ec| v.other += ec,
    ];

    #[test]
    fn sugars_field_count() {
        assert_eq!(Sugars::new().iter().count(), 8);
    }

    #[test]
    fn sugars_no_fields_missed() {
        assert_eq!(Sugars::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn sugars_empty() {
        let sugars = Sugars::empty();
        assert_eq!(sugars, Sugars::new());
        assert_eq!(sugars, Sugars::default());

        assert_f64_fields_eq_zero(&sugars);

        assert_eq!(sugars.total(), 0.0);
        assert_eq!(sugars.energy(), 0.0);
        assert_eq!(sugars.to_pod().unwrap(), 0.0);
        assert_eq!(sugars.to_pac().unwrap(), 0.0);
    }

    #[test]
    fn sugars_field_update_methods() {
        let sugars = Sugars::new()
            .glucose(1.0)
            .fructose(2.0)
            .galactose(3.0)
            .sucrose(4.0)
            .lactose(5.0)
            .maltose(6.0)
            .trehalose(7.0)
            .other(8.0);

        assert_f64_fields_ne_zero(&sugars);

        assert_eq!(sugars.glucose, 1.0);
        assert_eq!(sugars.fructose, 2.0);
        assert_eq!(sugars.galactose, 3.0);
        assert_eq!(sugars.sucrose, 4.0);
        assert_eq!(sugars.lactose, 5.0);
        assert_eq!(sugars.maltose, 6.0);
        assert_eq!(sugars.trehalose, 7.0);
        assert_eq!(sugars.other, 8.0);
    }

    #[test]
    fn sugars_total() {
        let sugars = Sugars::new()
            .glucose(1.0)
            .fructose(2.0)
            .galactose(3.0)
            .sucrose(4.0)
            .lactose(5.0)
            .maltose(6.0)
            .trehalose(7.0)
            .other(8.0);
        assert_eq!(sugars.total(), 36.0);
    }

    #[test]
    fn sugars_energy() {
        let sugars = Sugars::new()
            .glucose(1.0)
            .fructose(2.0)
            .galactose(3.0)
            .sucrose(4.0)
            .lactose(5.0)
            .maltose(6.0)
            .trehalose(7.0)
            .other(8.0);
        assert_eq!(sugars.energy(), 36.0 * 4.0);
    }

    #[test]
    fn sugars_to_pod() {
        let new = || Sugars::new();
        assert_eq!(new().glucose(100.0).to_pod().unwrap(), 80.0);
        assert_eq!(new().fructose(100.0).to_pod().unwrap(), 173.0);
        assert_eq!(new().galactose(100.0).to_pod().unwrap(), 65.0);
        assert_eq!(new().sucrose(100.0).to_pod().unwrap(), 100.0);
        assert_eq!(new().lactose(100.0).to_pod().unwrap(), 16.0);
        assert_eq!(new().maltose(100.0).to_pod().unwrap(), 32.0);
        assert_eq!(new().trehalose(100.0).to_pod().unwrap(), 45.0);
    }

    #[test]
    fn sugars_to_pod_error() {
        assert!(matches!(Sugars::new().other(10.0).to_pod(), Err(Error::CannotComputePOD(_))));
    }

    #[test]
    fn sugars_to_pac() {
        let new = || Sugars::new();
        assert_eq!(new().glucose(100.0).to_pac().unwrap(), 190.0);
        assert_eq!(new().fructose(100.0).to_pac().unwrap(), 190.0);
        assert_eq!(new().galactose(100.0).to_pac().unwrap(), 190.0);
        assert_eq!(new().sucrose(100.0).to_pac().unwrap(), 100.0);
        assert_eq!(new().lactose(100.0).to_pac().unwrap(), 100.0);
        assert_eq!(new().maltose(100.0).to_pac().unwrap(), 100.0);
        assert_eq!(new().trehalose(100.0).to_pac().unwrap(), 100.0);
    }

    #[test]
    fn sugars_to_pac_error() {
        assert!(matches!(Sugars::new().other(10.0).to_pac(), Err(Error::CannotComputePAC(_))));
    }

    #[test]
    fn sugars_scale() {
        let sugars = Sugars::new()
            .glucose(2.0)
            .fructose(4.0)
            .galactose(6.0)
            .sucrose(8.0)
            .lactose(10.0)
            .maltose(12.0)
            .trehalose(14.0)
            .other(16.0);

        let scaled = sugars.scale(0.5);

        assert_f64_fields_ne_zero(&sugars);
        assert_f64_fields_ne_zero(&scaled);

        assert_eq!(scaled.glucose, 1.0);
        assert_eq!(scaled.fructose, 2.0);
        assert_eq!(scaled.galactose, 3.0);
        assert_eq!(scaled.sucrose, 4.0);
        assert_eq!(scaled.lactose, 5.0);
        assert_eq!(scaled.maltose, 6.0);
        assert_eq!(scaled.trehalose, 7.0);
        assert_eq!(scaled.other, 8.0);
        assert_eq!(scaled.total(), sugars.total() * 0.5);
    }

    #[test]
    fn sugars_add() {
        let a = Sugars::new()
            .glucose(1.0)
            .fructose(2.0)
            .galactose(3.0)
            .sucrose(4.0)
            .lactose(5.0)
            .maltose(6.0)
            .trehalose(7.0)
            .other(8.0);
        let b = Sugars::new()
            .glucose(0.5)
            .fructose(1.0)
            .galactose(1.5)
            .sucrose(2.0)
            .lactose(2.5)
            .maltose(3.0)
            .trehalose(3.5)
            .other(4.0);
        assert_eq!(a.total(), 36.0);
        assert_eq!(b.total(), 18.0);

        let sum = a.add(&b);

        assert_f64_fields_ne_zero(&a);
        assert_f64_fields_ne_zero(&b);
        assert_f64_fields_ne_zero(&sum);

        assert_eq!(sum.glucose, 1.5);
        assert_eq!(sum.fructose, 3.0);
        assert_eq!(sum.galactose, 4.5);
        assert_eq!(sum.sucrose, 6.0);
        assert_eq!(sum.lactose, 7.5);
        assert_eq!(sum.maltose, 9.0);
        assert_eq!(sum.trehalose, 10.5);
        assert_eq!(sum.other, 12.0);
        assert_eq!(sum.total(), 54.0);
    }

    #[test]
    fn sugars_abs_diff_eq() {
        let a = Sugars::new()
            .glucose(1.0)
            .fructose(2.0)
            .galactose(3.0)
            .sucrose(4.0)
            .lactose(5.0)
            .maltose(6.0)
            .trehalose(7.0)
            .other(8.0);
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

    // --- Validate ---

    #[test]
    fn validate_ok_for_empty() {
        assert!(Sugars::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(
            Sugars::new()
                .glucose(10.0)
                .sucrose(20.0)
                .lactose(30.0)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_ok_when_total_is_exactly_100() {
        assert!(Sugars::new().glucose(50.0).fructose(50.0).validate().is_ok());
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut sugars = Sugars::empty();
            field_modifier(&mut sugars, -1.0);
            assert!(matches!(sugars.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_err_when_total_exceeds_100() {
        let sugars = Sugars::new().glucose(60.0).fructose(41.0);
        assert!(matches!(sugars.validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let sugars = Sugars::new().sucrose(10.0);
        let result = sugars.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().sucrose, 10.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Sugars::new().glucose(-1.0).validate_into().is_err());
    }
}
