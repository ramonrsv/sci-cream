//! [`Texture`] struct and related functionality, estimating and tracking the overall texture
//! properties of an ice cream based on contributions from components, e.g. stabilizer content, etc.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    error::Result,
    util::{collect_fields_copied_as, iter_all_abs_diff_eq},
    validate::{Validate, verify_are_positive},
};

#[cfg(doc)]
use crate::{
    composition::{Emulsifiers, Stabilizers},
    specs::{EmulsifierSpec, StabilizerSpec},
};

/// Texture properties of an ingredient or mix, representing the overall contributions from various
/// components, e.g. stabilizers, emulsifiers, fats, etc. to various aspects of ice cream texture
///
/// This struct attempts to capture estimations of various aspects of the overall texture properties
/// of an ingredient or mix, resulting from the contributions of various components. For example,
/// control of ice crystal formation and size is a key aspect of ice cream texture, and influenced
/// by various components, e.g. sugars, proteins, and stabilizer ingredients specialized for this
/// purpose, e.g. gums, gelatin, etc. Creaminess is another key aspect of ice cream texture, and
/// influenced by components such as fats, emulsifiers, some fibers like inulin, etc.
///
/// These properties are usually not directly measurable or necessarily precisely defined, but they
/// are still useful for tracking and estimating the overall texture properties of a mix, and for
/// understanding the contributions of various components to these properties.
///
/// This is an area of ongoing development and refinement, and so the specific properties tracked
/// here, as well as the methods for estimating them from components, are subject to change as more
/// research and experimentation is done in this area.
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Texture {
    /// Estimation of "stabilization" effects, e.g. ice crystal control, viscosity, etc., based on
    /// contributions from various components, e.g. stabilizer ingredients, sugars, proteins, etc.
    ///
    /// See [`StabilizerSpec`] and [`Stabilizers`] for more details on stabilizer ingredients, the
    /// strength of their stabilizing effects, and how they contribute to this property.
    //
    // @todo Need to figure out how to also account for contributions from other components, e.g.
    // sugars, proteins, etc. Look into hygroscopicity as a possible proxy for the stabilizing
    // effects of sugars and polyols.
    pub stabilization: f64,
    /// Estimation of "emulsification" effects from proteins and emulsifier ingredients, e.g.
    /// lecithin, mono- and diglycerides, etc., which contribute to creaminess and smoothness
    ///
    /// See [`EmulsifierSpec`] and [`Emulsifiers`] for more details on emulsifier ingredients, the
    /// strength of their emulsifying effects, and how they contribute to this property.
    //
    // @todo Need to figure out how to also account for contributions from other components,
    // primarily milk proteins, which are a major source of emulsification in ice cream.
    pub emulsification: f64,
}

impl Texture {
    /// Creates an empty [`Texture`] struct with all fields set to 0.
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            stabilization: 0.0,
            emulsification: 0.0,
        }
    }

    /// Creates a new empty `Micro` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`stabilization`](Self::stabilization).
    #[must_use]
    pub const fn stabilization(self, stabilization: f64) -> Self {
        Self { stabilization, ..self }
    }

    /// Field-update method for [`emulsification`](Self::emulsification).
    #[must_use]
    pub const fn emulsification(self, emulsification: f64) -> Self {
        Self { emulsification, ..self }
    }
}

impl Validate for Texture {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        Ok(())
    }
}

impl ScaleComponents for Texture {
    fn scale(&self, factor: f64) -> Self {
        Self {
            stabilization: self.stabilization * factor,
            emulsification: self.emulsification * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            stabilization: self.stabilization + other.stabilization,
            emulsification: self.emulsification + other.emulsification,
        }
    }
}

impl AbsDiffEq for Texture {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Texture {
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

    const FIELD_MODIFIERS: [fn(&mut Texture, f64); 2] = [|m, v| m.stabilization += v, |m, v| m.emulsification += v];

    #[test]
    fn texture_field_count() {
        assert_eq!(Texture::new().iter().count(), 2);
    }

    #[test]
    fn texture_no_fields_missed() {
        assert_eq!(Texture::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn texture_empty() {
        let m = Texture::empty();
        assert_eq!(m, Texture::new());
        assert_eq!(m, Texture::default());

        assert_f64_fields_eq_zero(&m);

        assert_eq!(m.stabilization, 0.0);
        assert_eq!(m.emulsification, 0.0);
    }

    #[test]
    fn texture_field_update_methods() {
        let m = Texture::new().stabilization(1.0).emulsification(2.0);
        assert_f64_fields_ne_zero(&m);

        assert_eq!(m.stabilization, 1.0);
        assert_eq!(m.emulsification, 2.0);
    }

    #[test]
    fn texture_scale() {
        let m = Texture::new().stabilization(4.0).emulsification(2.0);
        assert_f64_fields_ne_zero(&m);

        let scaled = m.scale(0.5);
        assert_eq!(scaled.stabilization, 2.0);
        assert_eq!(scaled.emulsification, 1.0);
    }

    #[test]
    fn texture_add() {
        let a = Texture::new().stabilization(4.0).emulsification(2.0);
        let b = Texture::new().stabilization(2.0).emulsification(3.0);
        assert_f64_fields_ne_zero(&a);
        assert_f64_fields_ne_zero(&b);

        let sum = a.add(&b);
        assert_eq!(sum.stabilization, 6.0);
        assert_eq!(sum.emulsification, 5.0);
        assert_f64_fields_ne_zero(&sum);
    }

    #[test]
    fn texture_abs_diff_eq() {
        let a = Texture::new().stabilization(4.0).emulsification(1.0);
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
        assert!(Texture::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(Texture::new().stabilization(1.0).emulsification(0.5).validate().is_ok());
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut texture = Texture::empty();
            field_modifier(&mut texture, -1.0);
            assert!(matches!(texture.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let texture = Texture::new().stabilization(1.0).emulsification(0.5);
        let result = texture.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), texture);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Texture::new().stabilization(-1.0).validate_into().is_err());
    }
}
