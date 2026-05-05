//! [`Stabilizers`] struct and related functionality, independently tracking stabilizer components
//! of an ingredient or mix, which have an important effect on ice cream properties

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{ScaleComponents, Texture},
    constants::stabilization::{
        STABILIZER_STRENGTH_CARBOXYMETHYL_CELLULOSE, STABILIZER_STRENGTH_CARRAGEENANS, STABILIZER_STRENGTH_CORNSTARCH,
        STABILIZER_STRENGTH_GELATIN, STABILIZER_STRENGTH_GUAR_GUM, STABILIZER_STRENGTH_LOCUST_BEAN_GUM,
        STABILIZER_STRENGTH_PECTIN, STABILIZER_STRENGTH_SODIUM_ALGINATE, STABILIZER_STRENGTH_TAPIOCA_STARCH,
        STABILIZER_STRENGTH_TARA_GUM, STABILIZER_STRENGTH_XANTHAN_GUM,
    },
    error::{Error, Result},
    util::{collect_fields_copied_as, iter_all_abs_diff_eq, iter_fields_as},
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::composition::Solids;

/// Stabilizer components breakdown of an ingredient or mix
///
/// Stabilizer components are already accounted for in [`Solids`], but they are also tracked here
/// with a more detailed breakdown, as they have a significant effect on ice cream properties, even
/// in miniscule amounts. These components do not meaningfully contribute to the other macro
/// properties of a mix, e.g. energy, [POD](crate::docs#pod), [PAC](crate::docs#pac-afp-fpdf-se),
/// etc. Any such minor contributions are accounted for in the solids breakdown.
///
/// **Note**: This struct only tracks added stabilizers, i.e. it does not attempt to track the
/// stabilizing contributions of other components such as sugars, milk proteins, egg proteins, etc.
/// Their respective [`specs`](crate::specs) are responsible for correctly populating [`Texture`].
///
/// See the [stabilizers documentation](crate::docs#stabilizers) for more information on the role of
/// stabilizers in ice cream, and the different types and their effects on ice cream properties.
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Stabilizers {
    /// Cornstarch, a polysaccharide derived from corn, is a common and widely available stabilizer
    ///
    /// See the [cornstarch documentation](crate::docs#cornstarch) for more information.
    pub cornstarch: f64,
    /// Tapioca starch, a polysaccharide derived from cassava root, is a common stabilizer
    ///
    /// See the [tapioca starch documentation](crate::docs#tapioca-starch) for more information.
    pub tapioca_starch: f64,
    /// Pectin is a polysaccharide derived from the cell wall of plants, particularly citrus fruits
    ///
    /// See the [pectin documentation](crate::docs#pectin) for more information.
    pub pectin: f64,
    /// Gelatin, a protein derived from collagen, is one of the oldest non-egg stabilizers
    ///
    /// See the [gelatin documentation](crate::docs#gelatin) for more information.
    pub gelatin: f64,
    /// Locust Bean Gum (LBG), also known as Carob Bean Gum, is a very common gum stabilizer
    ///
    /// See the [locust bean gum documentation](crate::docs#locust-bean-gum) for more information.
    pub locust_bean_gum: f64,
    /// Guar Gum is a common gum stabilizer, often used in combination with Locust Bean Gum
    ///
    /// See the [guar gum documentation](crate::docs#guar-gum) for more information.
    pub guar_gum: f64,
    /// Carrageenans are a family of polysaccharides commonly used as stabilizers
    ///
    /// See the [carrageenans documentation](crate::docs#carrageenans) for more information.
    pub carrageenans: f64,
    /// Carboxymethyl Cellulose (CMC) is a stabilizer derived from purified cellulose
    ///
    /// See the [carboxymethyl cellulose documentation](crate::docs#carboxymethyl-cellulose) for
    /// more information.
    pub carboxymethyl_cellulose: f64,
    /// Xanthan Gum is a polysaccharide produced by bacterial action, and is a common stabilizer
    ///
    /// See the [xanthan gum documentation](crate::docs#xanthan-gum) for more information.
    pub xanthan_gum: f64,
    /// Sodium Alginate is a polysaccharide derived from brown algae, and is a common stabilizer
    ///
    /// See the [sodium alginate documentation](crate::docs#sodium-alginate) for more information.
    pub sodium_alginate: f64,
    /// Tara Gum is a polysaccharide that has recently become available as an ice cream stabilizer
    ///
    /// See the [tara gum documentation](crate::docs#tara-gum) for more information.
    pub tara_gum: f64,
    /// Other unspecified stabilizers, which require the `strength` parameter to be provided in
    /// order to calculate the contribution to texture; see [`to_texture`](Self::to_texture).
    pub other: f64,
}

impl Stabilizers {
    /// Creates an empty [`Stabilizers`] struct with all fields set to 0.
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            cornstarch: 0.0,
            tapioca_starch: 0.0,
            pectin: 0.0,
            gelatin: 0.0,
            locust_bean_gum: 0.0,
            guar_gum: 0.0,
            carrageenans: 0.0,
            carboxymethyl_cellulose: 0.0,
            xanthan_gum: 0.0,
            sodium_alginate: 0.0,
            tara_gum: 0.0,
            other: 0.0,
        }
    }

    /// Creates a new empty [`Stabilizers`] struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`cornstarch`](Self::cornstarch).
    #[must_use]
    pub const fn cornstarch(self, cornstarch: f64) -> Self {
        Self { cornstarch, ..self }
    }

    /// Field-update method for [`tapioca_starch`](Self::tapioca_starch).
    #[must_use]
    pub const fn tapioca_starch(self, tapioca_starch: f64) -> Self {
        Self { tapioca_starch, ..self }
    }

    /// Field-update method for [`pectin`](Self::pectin).
    #[must_use]
    pub const fn pectin(self, pectin: f64) -> Self {
        Self { pectin, ..self }
    }

    /// Field-update method for [`gelatin`](Self::gelatin).
    #[must_use]
    pub const fn gelatin(self, gelatin: f64) -> Self {
        Self { gelatin, ..self }
    }

    /// Field-update method for [`locust_bean_gum`](Self::locust_bean_gum).
    #[must_use]
    pub const fn locust_bean_gum(self, locust_bean_gum: f64) -> Self {
        Self {
            locust_bean_gum,
            ..self
        }
    }

    /// Field-update method for [`guar_gum`](Self::guar_gum).
    #[must_use]
    pub const fn guar_gum(self, guar_gum: f64) -> Self {
        Self { guar_gum, ..self }
    }

    /// Field-update method for [`carrageenans`](Self::carrageenans).
    #[must_use]
    pub const fn carrageenans(self, carrageenans: f64) -> Self {
        Self { carrageenans, ..self }
    }

    /// Field-update method for [`carboxymethyl_cellulose`](Self::carboxymethyl_cellulose).
    #[must_use]
    pub const fn carboxymethyl_cellulose(self, carboxymethyl_cellulose: f64) -> Self {
        Self {
            carboxymethyl_cellulose,
            ..self
        }
    }

    /// Field-update method for [`xanthan_gum`](Self::xanthan_gum).
    #[must_use]
    pub const fn xanthan_gum(self, xanthan_gum: f64) -> Self {
        Self { xanthan_gum, ..self }
    }

    /// Field-update method for [`sodium_alginate`](Self::sodium_alginate).
    #[must_use]
    pub const fn sodium_alginate(self, sodium_alginate: f64) -> Self {
        Self {
            sodium_alginate,
            ..self
        }
    }

    /// Field-update method for [`tara_gum`](Self::tara_gum).
    #[must_use]
    pub const fn tara_gum(self, tara_gum: f64) -> Self {
        Self { tara_gum, ..self }
    }

    /// Field-update method for [`other`](Self::other).
    #[must_use]
    pub const fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total stabilizer content, in grams per 100g of mix, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    /// Converts the stabilizer breakdown into a contribution to the [`Texture`] of the composition,
    /// based on the relative strength of the constituent stabilizer components.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::InvalidSpec`] if the strength of the stabilizer cannot be determined,
    /// which can happen if there are unspecified stabilizer components (i.e. if field
    /// [`other`](Self::other) is populated but the `strength` parameter is not provided).
    pub fn to_texture(&self, strength: Option<f64>) -> Result<Texture> {
        if self.other > 0.0 && strength.is_none() {
            return Err(Error::InvalidSpec("Strength must be provided if 'other' stabilizers are specified".into()));
        }

        Ok(Texture::new().stabilization(strength.unwrap_or_else(|| {
            [
                self.cornstarch * STABILIZER_STRENGTH_CORNSTARCH,
                self.tapioca_starch * STABILIZER_STRENGTH_TAPIOCA_STARCH,
                self.pectin * STABILIZER_STRENGTH_PECTIN,
                self.gelatin * STABILIZER_STRENGTH_GELATIN,
                self.locust_bean_gum * STABILIZER_STRENGTH_LOCUST_BEAN_GUM,
                self.guar_gum * STABILIZER_STRENGTH_GUAR_GUM,
                self.carrageenans * STABILIZER_STRENGTH_CARRAGEENANS,
                self.carboxymethyl_cellulose * STABILIZER_STRENGTH_CARBOXYMETHYL_CELLULOSE,
                self.xanthan_gum * STABILIZER_STRENGTH_XANTHAN_GUM,
                self.sodium_alginate * STABILIZER_STRENGTH_SODIUM_ALGINATE,
                self.tara_gum * STABILIZER_STRENGTH_TARA_GUM,
            ]
            .iter()
            .sum::<f64>()
                / 100.0
        })))
    }
}

impl Validate for Stabilizers {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl ScaleComponents for Stabilizers {
    fn scale(&self, factor: f64) -> Self {
        Self {
            cornstarch: self.cornstarch * factor,
            tapioca_starch: self.tapioca_starch * factor,
            pectin: self.pectin * factor,
            gelatin: self.gelatin * factor,
            locust_bean_gum: self.locust_bean_gum * factor,
            guar_gum: self.guar_gum * factor,
            carrageenans: self.carrageenans * factor,
            carboxymethyl_cellulose: self.carboxymethyl_cellulose * factor,
            xanthan_gum: self.xanthan_gum * factor,
            sodium_alginate: self.sodium_alginate * factor,
            tara_gum: self.tara_gum * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            cornstarch: self.cornstarch + other.cornstarch,
            tapioca_starch: self.tapioca_starch + other.tapioca_starch,
            pectin: self.pectin + other.pectin,
            gelatin: self.gelatin + other.gelatin,
            locust_bean_gum: self.locust_bean_gum + other.locust_bean_gum,
            guar_gum: self.guar_gum + other.guar_gum,
            carrageenans: self.carrageenans + other.carrageenans,
            carboxymethyl_cellulose: self.carboxymethyl_cellulose + other.carboxymethyl_cellulose,
            xanthan_gum: self.xanthan_gum + other.xanthan_gum,
            sodium_alginate: self.sodium_alginate + other.sodium_alginate,
            tara_gum: self.tara_gum + other.tara_gum,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Stabilizers {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Stabilizers {
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

    const FIELD_MODIFIERS: [fn(&mut Stabilizers, f64); 12] = [
        |m, v| m.cornstarch += v,
        |m, v| m.tapioca_starch += v,
        |m, v| m.pectin += v,
        |m, v| m.gelatin += v,
        |m, v| m.locust_bean_gum += v,
        |m, v| m.guar_gum += v,
        |m, v| m.carrageenans += v,
        |m, v| m.carboxymethyl_cellulose += v,
        |m, v| m.xanthan_gum += v,
        |m, v| m.sodium_alginate += v,
        |m, v| m.tara_gum += v,
        |m, v| m.other += v,
    ];

    #[test]
    fn stabilizers_field_count() {
        assert_eq!(Stabilizers::new().iter().count(), 12);
    }

    #[test]
    fn stabilizers_no_fields_missed() {
        assert_eq!(Stabilizers::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn stabilizers_empty() {
        let m = Stabilizers::empty();
        assert_eq!(m, Stabilizers::new());
        assert_eq!(m, Stabilizers::default());

        assert_f64_fields_eq_zero(&m);

        assert_eq!(m.cornstarch, 0.0);
        assert_eq!(m.tapioca_starch, 0.0);
        assert_eq!(m.pectin, 0.0);
        assert_eq!(m.gelatin, 0.0);
        assert_eq!(m.locust_bean_gum, 0.0);
        assert_eq!(m.guar_gum, 0.0);
        assert_eq!(m.carrageenans, 0.0);
        assert_eq!(m.carboxymethyl_cellulose, 0.0);
        assert_eq!(m.xanthan_gum, 0.0);
        assert_eq!(m.sodium_alginate, 0.0);
        assert_eq!(m.tara_gum, 0.0);
        assert_eq!(m.other, 0.0);
    }

    #[test]
    fn stabilizers_field_update_methods() {
        let m = Stabilizers::new()
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
        assert_f64_fields_ne_zero(&m);

        assert_eq!(m.cornstarch, 3.0);
        assert_eq!(m.tapioca_starch, 4.0);
        assert_eq!(m.pectin, 5.0);
        assert_eq!(m.gelatin, 6.0);
        assert_eq!(m.locust_bean_gum, 7.0);
        assert_eq!(m.guar_gum, 8.0);
        assert_eq!(m.carrageenans, 9.0);
        assert_eq!(m.carboxymethyl_cellulose, 10.0);
        assert_eq!(m.xanthan_gum, 11.0);
        assert_eq!(m.sodium_alginate, 12.0);
        assert_eq!(m.tara_gum, 13.0);
        assert_eq!(m.other, 14.0);
    }

    #[test]
    fn stabilizers_scale() {
        let m = Stabilizers::new()
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
        assert_f64_fields_ne_zero(&m);

        let scaled = m.scale(0.5);
        assert_eq!(scaled.cornstarch, 1.5);
        assert_eq!(scaled.tapioca_starch, 2.0);
        assert_eq!(scaled.pectin, 2.5);
        assert_eq!(scaled.gelatin, 3.0);
        assert_eq!(scaled.locust_bean_gum, 3.5);
        assert_eq!(scaled.guar_gum, 4.0);
        assert_eq!(scaled.carrageenans, 4.5);
        assert_eq!(scaled.carboxymethyl_cellulose, 5.0);
        assert_eq!(scaled.xanthan_gum, 5.5);
        assert_eq!(scaled.sodium_alginate, 6.0);
        assert_eq!(scaled.tara_gum, 6.5);
        assert_eq!(scaled.other, 7.0);
    }

    #[test]
    fn stabilizers_add() {
        let a = Stabilizers::new()
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
        let b = Stabilizers::new()
            .cornstarch(3.5)
            .tapioca_starch(4.5)
            .pectin(5.5)
            .gelatin(6.5)
            .locust_bean_gum(7.5)
            .guar_gum(8.5)
            .carrageenans(9.5)
            .carboxymethyl_cellulose(10.5)
            .xanthan_gum(11.5)
            .sodium_alginate(12.5)
            .tara_gum(13.5)
            .other(14.5);

        assert_f64_fields_ne_zero(&a);
        assert_f64_fields_ne_zero(&b);

        let sum = a.add(&b);
        assert_eq!(sum.cornstarch, 6.5);
        assert_eq!(sum.tapioca_starch, 8.5);
        assert_eq!(sum.pectin, 10.5);
        assert_eq!(sum.gelatin, 12.5);
        assert_eq!(sum.locust_bean_gum, 14.5);
        assert_eq!(sum.guar_gum, 16.5);
        assert_eq!(sum.carrageenans, 18.5);
        assert_eq!(sum.carboxymethyl_cellulose, 20.5);
        assert_eq!(sum.xanthan_gum, 22.5);
        assert_eq!(sum.sodium_alginate, 24.5);
        assert_eq!(sum.tara_gum, 26.5);
        assert_eq!(sum.other, 28.5);
        assert_f64_fields_ne_zero(&sum);
    }

    #[test]
    fn stabilizers_abs_diff_eq() {
        let a = Stabilizers::new()
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
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
        assert!(Stabilizers::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(
            Stabilizers::new()
                .cornstarch(0.5)
                .gelatin(0.3)
                .locust_bean_gum(0.2)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut stabilizers = Stabilizers::empty();
            field_modifier(&mut stabilizers, -1.0);
            assert!(matches!(stabilizers.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let stabilizers = Stabilizers::new().cornstarch(1.0).gelatin(0.5);
        let result = stabilizers.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().cornstarch, 1.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Stabilizers::new().cornstarch(-1.0).validate_into().is_err());
    }
}
