//! [`PAC`] and associated functionality to represent the overall [PAC](crate::docs#pac-afp-fpdf-se)
//! of an ingredient or mix, and the breakdown of contributions by key ingredient categories

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    error::Result,
    util::{collect_fields_copied_as, iter_all_abs_diff_eq},
    validate::{Validate, verify_are_positive},
};

/// Overall [PAC](crate::docs#pac-afp-fpdf-se) and contributions by key ingredient categories
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct PAC {
    /// Contribution of sugars to the overall PAC
    pub sugars: f64,
    /// Contribution of salt to the overall PAC
    pub salt: f64,
    /// Contribution of milk solids non-fat (MSNF) and whey solids (WS) salts to the overall PAC
    pub msnf_ws_salts: f64,
    /// Contribution of alcohol to the overall PAC
    pub alcohol: f64,
    /// [Hardness Factor (HF)](crate::docs#corvitto-method-hardness-factor) of the ingredient or mix
    pub hardness_factor: f64,
}

impl PAC {
    /// Creates an empty [`PAC`] struct with all fields set to zero
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            sugars: 0.0,
            salt: 0.0,
            msnf_ws_salts: 0.0,
            alcohol: 0.0,
            hardness_factor: 0.0,
        }
    }

    /// Creates a new empty `PAC` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`sugars`](Self::sugars)
    #[must_use]
    pub const fn sugars(self, sugars: f64) -> Self {
        Self { sugars, ..self }
    }

    /// Field-update method for [`salt`](Self::salt)
    #[must_use]
    pub const fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    /// Field-update method for [`msnf_ws_salts`](Self::msnf_ws_salts)
    #[must_use]
    pub const fn msnf_ws_salts(self, msnf_ws_salts: f64) -> Self {
        Self { msnf_ws_salts, ..self }
    }

    /// Field-update method for [`alcohol`](Self::alcohol)
    #[must_use]
    pub const fn alcohol(self, alcohol: f64) -> Self {
        Self { alcohol, ..self }
    }

    /// Field-update method for [`hardness_factor`](Self::hardness_factor)
    #[must_use]
    pub const fn hardness_factor(self, hardness_factor: f64) -> Self {
        Self {
            hardness_factor,
            ..self
        }
    }

    /// Calculates the total PAC contributions from all sources, excluding hardness factor
    #[must_use]
    pub fn total(&self) -> f64 {
        self.sugars + self.salt + self.msnf_ws_salts + self.alcohol
    }
}

impl Validate for PAC {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        Ok(())
    }
}

impl ScaleComponents for PAC {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars * factor,
            salt: self.salt * factor,
            msnf_ws_salts: self.msnf_ws_salts * factor,
            alcohol: self.alcohol * factor,
            hardness_factor: self.hardness_factor * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars + other.sugars,
            salt: self.salt + other.salt,
            msnf_ws_salts: self.msnf_ws_salts + other.msnf_ws_salts,
            alcohol: self.alcohol + other.alcohol,
            hardness_factor: self.hardness_factor + other.hardness_factor,
        }
    }
}

impl AbsDiffEq for PAC {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for PAC {
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
    use crate::tests::assets::*;

    const FIELD_MODIFIERS: [fn(&mut PAC, f64); 5] = [
        |s, v| s.sugars += v,
        |s, v| s.salt += v,
        |s, v| s.msnf_ws_salts += v,
        |s, v| s.alcohol += v,
        |s, v| s.hardness_factor += v,
    ];

    #[test]
    fn pac_field_count() {
        assert_eq!(PAC::new().iter().count(), 5);
    }

    #[test]
    fn pac_no_fields_missed() {
        assert_eq!(PAC::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn pac_empty() {
        let p = PAC::empty();
        assert_eq!(p, PAC::new());
        assert_eq!(p, PAC::default());

        assert_f64_fields_eq_zero(&p);

        assert_eq!(p.sugars, 0.0);
        assert_eq!(p.salt, 0.0);
        assert_eq!(p.msnf_ws_salts, 0.0);
        assert_eq!(p.alcohol, 0.0);
        assert_eq!(p.hardness_factor, 0.0);
        assert_eq!(p.total(), 0.0);
    }

    #[test]
    fn pac_field_update_methods() {
        let p = PAC::new()
            .sugars(1.0)
            .salt(2.0)
            .msnf_ws_salts(3.0)
            .alcohol(4.0)
            .hardness_factor(5.0);

        assert_f64_fields_ne_zero(&p);

        assert_eq!(p.sugars, 1.0);
        assert_eq!(p.salt, 2.0);
        assert_eq!(p.msnf_ws_salts, 3.0);
        assert_eq!(p.alcohol, 4.0);
        assert_eq!(p.hardness_factor, 5.0);
    }

    #[test]
    fn pac_total() {
        let p = PAC::new().sugars(1.0).salt(2.0).msnf_ws_salts(3.0).alcohol(4.0);
        assert_eq!(p.total(), 10.0);
    }

    #[test]
    fn pac_total_excludes_hardness_factor() {
        // hardness_factor is intentionally excluded from total()
        let p = PAC::new()
            .sugars(1.0)
            .salt(2.0)
            .msnf_ws_salts(3.0)
            .alcohol(4.0)
            .hardness_factor(100.0);

        assert_f64_fields_ne_zero(&p);
        assert_eq!(p.total(), 10.0);
    }

    #[test]
    fn pac_2_percent_milk() {
        let pac = COMP_2_MILK.pac;
        assert_eq!(pac.sugars, 4.8069);
        assert_eq!(pac.salt, 0.0);
        assert_eq!(pac.msnf_ws_salts, 3.2405);
        assert_eq!(pac.alcohol, 0.0);
        assert_eq!(pac.total(), 8.0474);
    }

    #[test]
    fn pac_scale() {
        let p = PAC::new()
            .sugars(4.0)
            .salt(2.0)
            .msnf_ws_salts(2.0)
            .alcohol(2.0)
            .hardness_factor(10.0);
        assert_eq!(p.total(), 10.0);

        let scaled = p.scale(0.5);
        assert_eq!(scaled.sugars, 2.0);
        assert_eq!(scaled.salt, 1.0);
        assert_eq!(scaled.msnf_ws_salts, 1.0);
        assert_eq!(scaled.alcohol, 1.0);
        assert_eq!(scaled.hardness_factor, 5.0);
        assert_eq!(scaled.total(), 5.0);
    }

    #[test]
    fn pac_add() {
        let a = PAC::new()
            .sugars(4.0)
            .salt(1.0)
            .msnf_ws_salts(2.0)
            .alcohol(1.0)
            .hardness_factor(3.0);
        let b = PAC::new()
            .sugars(2.0)
            .salt(3.0)
            .msnf_ws_salts(1.0)
            .alcohol(0.5)
            .hardness_factor(1.0);
        assert_eq!(a.total(), 8.0);
        assert_eq!(b.total(), 6.5);

        assert_f64_fields_ne_zero(&a);
        assert_f64_fields_ne_zero(&b);

        let sum = a.add(&b);
        assert_eq!(sum.sugars, 6.0);
        assert_eq!(sum.salt, 4.0);
        assert_eq!(sum.msnf_ws_salts, 3.0);
        assert_eq!(sum.alcohol, 1.5);
        assert_eq!(sum.hardness_factor, 4.0);
        assert_eq!(sum.total(), a.total() + b.total());
        assert_eq!(sum.total(), 14.5);
        assert_f64_fields_ne_zero(&sum);
    }

    #[test]
    fn pac_abs_diff_eq() {
        let a = PAC::new()
            .sugars(4.0)
            .salt(1.0)
            .msnf_ws_salts(2.0)
            .alcohol(1.0)
            .hardness_factor(3.0);
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
        assert!(PAC::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(
            PAC::new()
                .sugars(4.0)
                .salt(1.0)
                .msnf_ws_salts(2.0)
                .alcohol(1.0)
                .hardness_factor(3.0)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut pac = PAC::empty();
            field_modifier(&mut pac, -1.0);
            assert!(matches!(pac.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let pac = PAC::new().sugars(4.0).salt(1.0);
        let result = pac.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().sugars, 4.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(PAC::new().sugars(-1.0).validate_into().is_err());
    }
}
