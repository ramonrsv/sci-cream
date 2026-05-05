//! [`Emulsifiers`] struct and related functionality, independently tracking emulsifier components
//! of an ingredient or mix, which have an important effect on ice cream properties

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{ScaleComponents, Texture},
    constants::emulsification::{
        EMULSIFIER_STRENGTH_DISTILLED_MONOGLYCERIDES, EMULSIFIER_STRENGTH_GUM_ARABIC, EMULSIFIER_STRENGTH_LECITHIN,
        EMULSIFIER_STRENGTH_MONO_AND_DIGLYCERIDES, EMULSIFIER_STRENGTH_POLYSORBATE_80,
    },
    error::{Error, Result},
    util::{collect_fields_copied_as, iter_all_abs_diff_eq, iter_fields_as},
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::composition::{CompKey, Solids};

/// Emulsifier components breakdown of an ingredient or mix
///
/// Emulsifier components are already accounted for in [`Solids`], but they are also tracked here
/// with a more detailed breakdown, as they have a significant effect on ice cream properties, even
/// in small amounts. These components do not meaningfully contribute to the other macro properties
/// of a mix, e.g. energy, [POD](crate::docs#pod), [PAC](crate::docs#pac-afp-fpdf-se), etc. Any such
/// minor contributions are accounted for in the solids breakdown.
///
/// **Note**: This struct only tracks added emulsifiers, i.e. it does not attempt to track the
/// emulsifying contributions of other components such as sugars, milk proteins, egg proteins, etc.
/// Their respective [`specs`](crate::specs) are responsible for correctly populating [`Texture`].
/// [`EggSpec`](crate::specs::EggSpec) is an exception to this, and it populates the
/// [`Self::lecithin`] field of this struct to account for the lecithin content of egg yolk.
///
/// See the [emulsifiers documentation](crate::docs#emulsifiers) for more information on the role of
/// emulsifiers in ice cream, and the different types and their effects on ice cream properties.
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Emulsifiers {
    /// Lecithin from any source, including as part of egg yolks, directly as soy lecithin, etc.
    ///
    /// See the [lecithin documentation](crate::docs#lecithin) for more information.
    pub lecithin: f64,
    /// Gum Arabic, an all natural emulsifier derived from acadia trees in sub-Saharan Africa
    ///
    /// See the [gum arabic documentation](crate::docs#gum-arabic) for more information.
    pub gum_arabic: f64,
    /// Mono- and diglycerides, common emulsifiers derived from glycerol and fatty acids
    ///
    /// See the [mono- and diglycerides documentation](crate::docs#mono-and-diglycerides) for more
    /// information.
    pub mono_and_diglycerides: f64,
    /// Distilled monoglycerides, mono- and diglycerides distilled to a higher monoglyceride content
    ///
    /// See the [distilled monoglycerides documentation](crate::docs#distilled-monoglycerides) for
    /// more information.
    pub distilled_monoglycerides: f64,
    /// Polysorbate 80 is the most common sorbitan ester, an emulsifier, used in ice cream mixes
    ///
    /// See the [polysorbate 80 documentation](crate::docs#polysorbate-80) for more information.
    pub polysorbate_80: f64,
    /// Other unspecified emulsifiers, which require the `strength` parameter to be provided in in
    /// order to calculate the contribution to texture; see [`to_texture`](Self::to_texture).
    pub other: f64,
}

impl Emulsifiers {
    /// Creates an empty [`Emulsifiers`] struct with all fields set to 0.
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            lecithin: 0.0,
            gum_arabic: 0.0,
            mono_and_diglycerides: 0.0,
            distilled_monoglycerides: 0.0,
            polysorbate_80: 0.0,
            other: 0.0,
        }
    }

    /// Creates a new empty [`Emulsifiers`] struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`lecithin`](Self::lecithin).
    #[must_use]
    pub const fn lecithin(self, lecithin: f64) -> Self {
        Self { lecithin, ..self }
    }

    /// Field-update method for [`gum_arabic`](Self::gum_arabic).
    #[must_use]
    pub const fn gum_arabic(self, gum_arabic: f64) -> Self {
        Self { gum_arabic, ..self }
    }

    /// Field-update method for [`mono_and_diglycerides`](Self::mono_and_diglycerides).
    #[must_use]
    pub const fn mono_and_diglycerides(self, mono_and_diglycerides: f64) -> Self {
        Self {
            mono_and_diglycerides,
            ..self
        }
    }

    /// Field-update method for [`distilled_monoglycerides`](Self::distilled_monoglycerides).
    #[must_use]
    pub const fn distilled_monoglycerides(self, distilled_monoglycerides: f64) -> Self {
        Self {
            distilled_monoglycerides,
            ..self
        }
    }

    /// Field-update method for [`polysorbate_80`](Self::polysorbate_80).
    #[must_use]
    pub const fn polysorbate_80(self, polysorbate_80: f64) -> Self {
        Self { polysorbate_80, ..self }
    }

    /// Field-update method for [`other`](Self::other).
    #[must_use]
    pub const fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total emulsifier content, in grams per 100g of mix, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    /// Converts the emulsifier breakdown into a contribution to the [`Texture`] of the composition,
    /// based on the relative strength of the constituent emulsifier components.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::InvalidSpec`] if the strength of the emulsifier cannot be determined,
    /// which can happen if there are unspecified emulsifier components (i.e. if field
    /// [`other`](Self::other) is populated but the `strength` parameter is not provided).
    pub fn to_texture(&self, strength: Option<f64>) -> Result<Texture> {
        if self.other > 0.0 && strength.is_none() {
            return Err(Error::InvalidSpec("Strength must be provided if 'other' emulsifiers are specified".into()));
        }

        Ok(Texture::new().emulsification(strength.unwrap_or_else(|| {
            [
                self.lecithin * EMULSIFIER_STRENGTH_LECITHIN,
                self.gum_arabic * EMULSIFIER_STRENGTH_GUM_ARABIC,
                self.mono_and_diglycerides * EMULSIFIER_STRENGTH_MONO_AND_DIGLYCERIDES,
                self.distilled_monoglycerides * EMULSIFIER_STRENGTH_DISTILLED_MONOGLYCERIDES,
                self.polysorbate_80 * EMULSIFIER_STRENGTH_POLYSORBATE_80,
            ]
            .iter()
            .sum::<f64>()
                / 100.0
        })))
    }
}

impl Validate for Emulsifiers {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl ScaleComponents for Emulsifiers {
    fn scale(&self, factor: f64) -> Self {
        Self {
            lecithin: self.lecithin * factor,
            gum_arabic: self.gum_arabic * factor,
            mono_and_diglycerides: self.mono_and_diglycerides * factor,
            distilled_monoglycerides: self.distilled_monoglycerides * factor,
            polysorbate_80: self.polysorbate_80 * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            lecithin: self.lecithin + other.lecithin,
            gum_arabic: self.gum_arabic + other.gum_arabic,
            mono_and_diglycerides: self.mono_and_diglycerides + other.mono_and_diglycerides,
            distilled_monoglycerides: self.distilled_monoglycerides + other.distilled_monoglycerides,
            polysorbate_80: self.polysorbate_80 + other.polysorbate_80,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Emulsifiers {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Emulsifiers {
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

    const FIELD_MODIFIERS: [fn(&mut Emulsifiers, f64); 6] = [
        |m, v| m.lecithin += v,
        |m, v| m.gum_arabic += v,
        |m, v| m.mono_and_diglycerides += v,
        |m, v| m.distilled_monoglycerides += v,
        |m, v| m.polysorbate_80 += v,
        |m, v| m.other += v,
    ];

    #[test]
    fn emulsifiers_field_count() {
        assert_eq!(Emulsifiers::new().iter().count(), 6);
    }

    #[test]
    fn emulsifiers_no_fields_missed() {
        assert_eq!(Emulsifiers::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn emulsifiers_empty() {
        let m = Emulsifiers::empty();
        assert_eq!(m, Emulsifiers::new());
        assert_eq!(m, Emulsifiers::default());

        assert_f64_fields_eq_zero(&m);

        assert_eq!(m.lecithin, 0.0);
        assert_eq!(m.gum_arabic, 0.0);
        assert_eq!(m.mono_and_diglycerides, 0.0);
        assert_eq!(m.distilled_monoglycerides, 0.0);
        assert_eq!(m.polysorbate_80, 0.0);
        assert_eq!(m.other, 0.0);
    }

    #[test]
    fn emulsifiers_field_update_methods() {
        let m = Emulsifiers::new()
            .lecithin(1.0)
            .gum_arabic(2.0)
            .mono_and_diglycerides(3.0)
            .distilled_monoglycerides(4.0)
            .polysorbate_80(5.0)
            .other(6.0);
        assert_f64_fields_ne_zero(&m);

        assert_eq!(m.lecithin, 1.0);
        assert_eq!(m.gum_arabic, 2.0);
        assert_eq!(m.mono_and_diglycerides, 3.0);
        assert_eq!(m.distilled_monoglycerides, 4.0);
        assert_eq!(m.polysorbate_80, 5.0);
        assert_eq!(m.other, 6.0);
    }

    #[test]
    fn emulsifiers_scale() {
        let m = Emulsifiers::new()
            .lecithin(2.0)
            .gum_arabic(4.0)
            .mono_and_diglycerides(6.0)
            .distilled_monoglycerides(8.0)
            .polysorbate_80(10.0)
            .other(12.0);
        assert_f64_fields_ne_zero(&m);

        let scaled = m.scale(0.5);
        assert_eq!(scaled.lecithin, 1.0);
        assert_eq!(scaled.gum_arabic, 2.0);
        assert_eq!(scaled.mono_and_diglycerides, 3.0);
        assert_eq!(scaled.distilled_monoglycerides, 4.0);
        assert_eq!(scaled.polysorbate_80, 5.0);
        assert_eq!(scaled.other, 6.0);
    }

    #[test]
    fn emulsifiers_add() {
        let a = Emulsifiers::new()
            .lecithin(2.0)
            .gum_arabic(4.0)
            .mono_and_diglycerides(6.0)
            .distilled_monoglycerides(8.0)
            .polysorbate_80(10.0)
            .other(12.0);
        let b = Emulsifiers::new()
            .lecithin(1.0)
            .gum_arabic(2.0)
            .mono_and_diglycerides(3.0)
            .distilled_monoglycerides(4.0)
            .polysorbate_80(5.0)
            .other(6.0);

        assert_f64_fields_ne_zero(&a);
        assert_f64_fields_ne_zero(&b);

        let sum = a.add(&b);
        assert_eq!(sum.lecithin, 3.0);
        assert_eq!(sum.gum_arabic, 6.0);
        assert_eq!(sum.mono_and_diglycerides, 9.0);
        assert_eq!(sum.distilled_monoglycerides, 12.0);
        assert_eq!(sum.polysorbate_80, 15.0);
        assert_eq!(sum.other, 18.0);
        assert_f64_fields_ne_zero(&sum);
    }

    #[test]
    fn emulsifiers_abs_diff_eq() {
        let a = Emulsifiers::new()
            .lecithin(1.0)
            .gum_arabic(2.0)
            .mono_and_diglycerides(3.0)
            .distilled_monoglycerides(4.0)
            .polysorbate_80(5.0)
            .other(6.0);
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
        assert!(Emulsifiers::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(
            Emulsifiers::new()
                .lecithin(0.1)
                .gum_arabic(0.1)
                .mono_and_diglycerides(0.1)
                .distilled_monoglycerides(0.1)
                .polysorbate_80(0.1)
                .other(0.3)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut emulsifiers = Emulsifiers::empty();
            field_modifier(&mut emulsifiers, -1.0);
            assert!(matches!(emulsifiers.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let emulsifiers = Emulsifiers::new().lecithin(1.0).other(0.5);
        let result = emulsifiers.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().lecithin, 1.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Emulsifiers::new().lecithin(-1.0).validate_into().is_err());
    }
}
