//! [`Micro`] struct and related functionality, representing the breakdown of micro components in an
//! ice cream composition, such as salt, stabilizers, emulsifiers, etc.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{Emulsifiers, ScaleComponents, Stabilizers},
    error::Result,
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::composition::{CompKey, Solids};

/// Breakdown of micro components in a composition, such as salt, stabilizers, emulsifiers, etc.
///
/// These components are already accounted for in [`Solids`], but they are also tracked here with a
/// more detailed breakdown, e.g. for micronutrient nutrition analysis, texture analysis, etc..
/// Except for [`salt`](Self::salt), which contributes to freezing point depression, these
/// components do not meaningfully contribute to other macro properties of a mix, e.g. energy,
/// [POD](crate::docs#pod), [PAC](crate::docs#pac-afp-fpdf-se), etc. Any such miniscule
/// contributions are accounted for in the solids breakdown.
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
    /// Breakdown of stabilizer content, e.g. from Locust Bean Gum, Guar Gum, etc.
    pub stabilizers: Stabilizers,
    /// Breakdown of emulsifier content, e.g. lecithin, mono- and diglycerides, etc.
    pub emulsifiers: Emulsifiers,
}

impl Micro {
    /// Creates an empty [`Micro`] struct with all fields set to 0.
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            salt: 0.0,
            stabilizers: Stabilizers::new(),
            emulsifiers: Emulsifiers::new(),
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

    /// Field-update method for [`stabilizers`](Self::stabilizers).
    #[must_use]
    pub const fn stabilizers(self, stabilizers: Stabilizers) -> Self {
        Self { stabilizers, ..self }
    }

    /// Field-update method for [`emulsifiers`](Self::emulsifiers).
    #[must_use]
    pub const fn emulsifiers(self, emulsifiers: Emulsifiers) -> Self {
        Self { emulsifiers, ..self }
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

impl Validate for Micro {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&[self.salt])?;
        self.stabilizers.validate()?;
        self.emulsifiers.validate()?;
        verify_is_within_100_percent(self.salt + self.stabilizers.total() + self.emulsifiers.total())?;
        Ok(())
    }
}

impl ScaleComponents for Micro {
    fn scale(&self, factor: f64) -> Self {
        Self {
            salt: self.salt * factor,
            stabilizers: self.stabilizers.scale(factor),
            emulsifiers: self.emulsifiers.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            salt: self.salt + other.salt,
            stabilizers: self.stabilizers.add(&other.stabilizers),
            emulsifiers: self.emulsifiers.add(&other.emulsifiers),
        }
    }
}

impl AbsDiffEq for Micro {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.salt.abs_diff_eq(&other.salt, epsilon)
            && self.stabilizers.abs_diff_eq(&other.stabilizers, epsilon)
            && self.emulsifiers.abs_diff_eq(&other.emulsifiers, epsilon)
    }
}

impl Default for Micro {
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

    use super::*;
    use crate::error::Error;

    const FIELD_MODIFIERS: [fn(&mut Micro, f64); 3] = [
        |m, v| m.salt += v,
        |m, v| m.emulsifiers.lecithin += v,
        |m, v| m.stabilizers.cornstarch += v,
    ];

    #[test]
    fn micro_field_count() {
        assert_eq!(Micro::new().iter().count(), 3);
    }

    #[test]
    fn micro_no_fields_missed() {
        assert_eq!(Micro::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn micro_empty() {
        let m = Micro::empty();
        assert_eq!(m, Micro::new());
        assert_eq!(m, Micro::default());

        assert_eq!(m.salt, 0.0);
        assert_eq!(m.stabilizers.total(), 0.0);
        assert_eq!(m.emulsifiers.total(), 0.0);
    }

    #[test]
    fn micro_field_update_methods() {
        let m = Micro::new()
            .salt(1.0)
            .stabilizers(Stabilizers::new().cornstarch(2.0))
            .emulsifiers(Emulsifiers::new().lecithin(2.0));

        assert_eq!(m.salt, 1.0);
        assert_eq!(m.stabilizers.cornstarch, 2.0);
        assert_eq!(m.stabilizers.total(), 2.0);
        assert_eq!(m.emulsifiers.lecithin, 2.0);
        assert_eq!(m.emulsifiers.total(), 2.0);
    }

    #[test]
    fn micro_scale() {
        let m = Micro::new()
            .salt(4.0)
            .stabilizers(Stabilizers::new().cornstarch(2.0))
            .emulsifiers(Emulsifiers::new().lecithin(2.0));

        let scaled = m.scale(0.5);
        assert_eq!(scaled.salt, 2.0);
        assert_eq!(scaled.stabilizers.cornstarch, 1.0);
        assert_eq!(scaled.stabilizers.total(), 1.0);
        assert_eq!(scaled.emulsifiers.lecithin, 1.0);
        assert_eq!(scaled.emulsifiers.total(), 1.0);
    }

    #[test]
    fn micro_add() {
        let a = Micro::new()
            .salt(4.0)
            .stabilizers(Stabilizers::new().cornstarch(1.0))
            .emulsifiers(Emulsifiers::new().lecithin(2.0));
        let b = Micro::new()
            .salt(2.0)
            .stabilizers(Stabilizers::new().cornstarch(0.5))
            .emulsifiers(Emulsifiers::new().lecithin(1.0));

        let sum = a.add(&b);
        assert_eq!(sum.salt, 6.0);
        assert_eq!(sum.stabilizers.cornstarch, 1.5);
        assert_eq!(sum.stabilizers.total(), 1.5);
        assert_eq!(sum.emulsifiers.lecithin, 3.0);
        assert_eq!(sum.emulsifiers.total(), 3.0);
    }

    #[test]
    fn micro_abs_diff_eq() {
        let a = Micro::new()
            .salt(4.0)
            .stabilizers(Stabilizers::new().cornstarch(1.0))
            .emulsifiers(Emulsifiers::new().lecithin(2.0));
        let b = a;
        let mut c = b;

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
        assert!(Micro::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(
            Micro::new()
                .salt(1.0)
                .emulsifiers(Emulsifiers::new().lecithin(0.5))
                .stabilizers(Stabilizers::new().cornstarch(0.3))
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut micro = Micro::empty();
            field_modifier(&mut micro, -1.0);
            assert!(matches!(micro.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let micro = Micro::new().salt(1.0).emulsifiers(Emulsifiers::new().lecithin(0.5));
        let result = micro.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().salt, 1.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Micro::new().salt(-1.0).validate_into().is_err());
    }
}
