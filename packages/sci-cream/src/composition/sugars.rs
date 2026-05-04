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

/// Sugars present in an ingredient or mix, mostly monosaccharides and disaccharides
///
/// This struct tracks a detailed breakdown of all the different monosaccharides and disaccharides
/// commonly found in ice cream, which allows accurate calculations of energy, POD, and PAC
/// contributions, as well as more detailed analysis of specific sugar combinations.
///
/// See the [sugars documentation](crate::docs#sugars) for more information on the different types
/// of sugars, their physical and sensory properties, and their effects in ice cream formulations.
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sugars {
    /// Glucose, also known as dextrose, is one of the two monosaccharides present in sucrose, the
    /// other being fructose
    ///
    /// See the [glucose documentation](crate::docs#glucose) for more information.
    pub glucose: f64,
    /// Fructose is is one of the two monosaccharides present in sucrose, the other being glucose
    ///
    /// See the [fructose documentation](crate::docs#fructose) for more information.
    pub fructose: f64,
    /// Galactose is a monosaccharide that is less common in ice cream formulations, but it is one
    /// of the two monosaccharides present in lactose, the other being glucose
    ///
    /// See the [galactose documentation](crate::docs#galactose) for more information.
    pub galactose: f64,
    /// Sucrose, or table sugar, is the most common sugar used in ice cream formulations, and is
    /// often the baseline for sweetness, freezing point depression, and other properties
    ///
    /// See the [sucrose documentation](crate::docs#sucrose) for more information.
    pub sucrose: f64,
    /// Lactose is a disaccharide composed of one glucose molecule and one galactose molecule
    ///
    /// See the [lactose documentation](crate::docs#lactose) for more information.
    pub lactose: f64,
    /// Maltose is a disaccharide composed of two glucose molecules
    ///
    /// See the [maltose documentation](crate::docs#maltose) for more information.
    pub maltose: f64,
    /// Trehalose is a disaccharide composed of two glucose molecules linked in 1.1-position
    ///
    /// See the [trehalose documentation](crate::docs#trehalose) for more information.
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
