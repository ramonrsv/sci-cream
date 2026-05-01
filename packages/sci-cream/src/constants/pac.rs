//! [Potere Anti-Congelante (PAC)](crate::docs#pac-afp-fpdf-se) values for various sweeteners and
//! other ingredients
//!
//! Expressed as g/100g of sucrose equivalence. Unless otherwise specified, values are calculated
//! based on molar mass relative to that of sucrose. See [`molar_mass::pac_from_molar_mass`].
#![allow(missing_docs)] // No need to document each constant individually

use super::molar_mass::{self, pac_from_molar_mass};

pub const GLUCOSE: f64 = pac_from_molar_mass(molar_mass::GLUCOSE);
pub const FRUCTOSE: f64 = pac_from_molar_mass(molar_mass::FRUCTOSE);
pub const GALACTOSE: f64 = pac_from_molar_mass(molar_mass::GALACTOSE);
pub const SUCROSE: f64 = pac_from_molar_mass(molar_mass::SUCROSE);
pub const LACTOSE: f64 = pac_from_molar_mass(molar_mass::LACTOSE);
pub const MALTOSE: f64 = pac_from_molar_mass(molar_mass::MALTOSE);
pub const TREHALOSE: f64 = pac_from_molar_mass(molar_mass::TREHALOSE);

pub const ERYTHRITOL: f64 = pac_from_molar_mass(molar_mass::ERYTHRITOL);
pub const MALTITOL: f64 = pac_from_molar_mass(molar_mass::MALTITOL);
pub const SORBITOL: f64 = pac_from_molar_mass(molar_mass::SORBITOL);
pub const XYLITOL: f64 = pac_from_molar_mass(molar_mass::XYLITOL);

pub const ASPARTAME: f64 = pac_from_molar_mass(molar_mass::ASPARTAME);
pub const CYCLAMATE: f64 = pac_from_molar_mass(molar_mass::CYCLAMATE);
pub const SACCHARIN: f64 = pac_from_molar_mass(molar_mass::SACCHARIN);
pub const SUCRALOSE: f64 = pac_from_molar_mass(molar_mass::SUCRALOSE);

pub const SALT: f64 = pac_from_molar_mass(molar_mass::SALT);
pub const ALCOHOL: f64 = pac_from_molar_mass(molar_mass::ALCOHOL);

#[cfg(doc)]
use crate::constants;

/// PAC for typical salt content in milk solids non-fat (MSNF) and whey solids (WS)
///
/// This value was reverse engineered from [`constants::fpd::FPD_CONST_FOR_MSNF_WS_SALTS`],
/// calculated via [`get_pac_from_fpd_polynomial(...)`](crate::fpd::get_pac_from_fpd_polynomial)
/// with argument [`constants::fpd::FPD_CONST_FOR_MSNF_WS_SALTS`] for the target FPD, and using
/// the polynomial described by [`constants::fpd::PAC_TO_FPD_POLY_COEFFS`].
pub const MSNF_WS_SALTS: f64 = 36.740_405_761_491_57;

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused)]
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn pac_from_molar_mass() {
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::GLUCOSE), 190.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::FRUCTOSE), 190.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::GALACTOSE), 190.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SUCROSE), 100.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::LACTOSE), 100.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::MALTOSE), 100.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::TREHALOSE), 100.0);

        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::ERYTHRITOL), 280.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::MALTITOL), 99.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SORBITOL), 187.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::XYLITOL), 224.0);

        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::ASPARTAME), 116.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::CYCLAMATE), 170.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SACCHARIN), 186.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SUCRALOSE), 86.0);

        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SALT), 585.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::ALCOHOL), 743.0);
    }
}
