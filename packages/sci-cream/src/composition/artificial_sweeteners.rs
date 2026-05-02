//! [`ArtificialSweeteners`] struct and related functionality, to track non-saccharide artificial
//! sweeteners in an ingredient or mix's composition, e.g. aspartame, sucralose, etc.

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
use crate::composition::Polyols;

/// Non-saccharide artificial sweeteners, commonly used as sugar substitutes, e.g. aspartame
///
/// This struct tracks a detailed breakdown of all the different non-saccharide artificial
/// sweeteners commonly found in ice cream, which allows accurate calculations of energy, PAC, and
/// most importantly POD contributions.
///
/// **Note**: These are distinct from sugar alcohols (e.g. erythritol, maltitol, etc.) which have
/// different functional properties and are used in different quantities. See [`Polyols`].
///
/// See the [artificial sweeteners documentation](crate::docs#artificial-sweeteners) for more
/// information on the different types of sweeteners, their physical and sensory properties, their
/// effects in ice cream formulations, and their regulatory status and safety profiles.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct ArtificialSweeteners {
    /// Aspartame is a common non-saccharide high-intensity artificial sweetener
    ///
    /// See the [aspartame documentation](crate::docs#aspartame) for more information.
    pub aspartame: f64,
    /// Cyclamate is a zero-calorie artificial sweetener
    ///
    /// See the [cyclamate documentation](crate::docs#cyclamate) for more information.
    pub cyclamate: f64,
    /// Saccharin is a non-nutritive artificial sweetener
    ///
    /// See the [saccharin documentation](crate::docs#saccharin) for more information.
    pub saccharin: f64,
    /// Sucralose is a common non-nutritive artificial sweetener
    ///
    /// See the [sucralose documentation](crate::docs#sucralose) for more information.
    pub sucralose: f64,
    /// Steviol glycosides are the main active sweetening compounds in stevia extract
    ///
    /// See the [steviosides documentation](crate::docs#steviosides) for more information.
    pub steviosides: f64,
    /// Mogrosides are the main active sweetening compounds in monkfruit extract
    ///
    /// See the [mogrosides documentation](crate::docs#mogrosides) for more information.
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

impl Validate for ArtificialSweeteners {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
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
        assert_eq!(sweeteners, ArtificialSweeteners::default());

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

    // --- Validate ---

    #[test]
    fn validate_ok() {
        assert_true!(ArtificialSweeteners::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        let sweeteners = ArtificialSweeteners::new().aspartame(10.0).sucralose(20.0);
        assert_true!(sweeteners.validate().is_ok());
    }

    #[test]
    fn validate_ok_when_total_is_exactly_100() {
        // Spread 100g across all 7 fields
        let sweeteners = ArtificialSweeteners::new()
            .aspartame(20.0)
            .cyclamate(20.0)
            .saccharin(20.0)
            .sucralose(20.0)
            .steviosides(10.0)
            .mogrosides(5.0)
            .other(5.0);
        assert_eq!(sweeteners.total(), 100.0);
        assert_true!(sweeteners.validate().is_ok());
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut sweeteners = ArtificialSweeteners::empty();
            field_modifier(&mut sweeteners, -1.0);
            assert!(matches!(sweeteners.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_err_when_total_exceeds_100() {
        // Single field that alone exceeds 100
        let sweeteners = ArtificialSweeteners::new().aspartame(101.0);
        assert!(matches!(sweeteners.validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_err_when_multiple_fields_sum_exceeds_100() {
        let sweeteners = ArtificialSweeteners::new().aspartame(60.0).sucralose(60.0);
        assert!(matches!(sweeteners.validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let sweeteners = ArtificialSweeteners::new().aspartame(5.0).sucralose(3.0);
        let result = sweeteners.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().aspartame, 5.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(ArtificialSweeteners::new().aspartame(-1.0).validate_into().is_err());
    }
}
