//! Molar mass values (g/mol) for various sweeteners and other ingredients
//!
//! Used to calculate [PAC](crate::docs#pac-afp-fpdf-se) based on molar mass relative to that of
//! sucrose. These values are sourced from the respective Wikipedia articles for each ingredient.
#![allow(missing_docs)] // No need to document each constant individually

/// Calculate [PAC](crate::docs#pac-afp-fpdf-se) from molar mass, expressed as g/100g of
/// sucrose equivalence
///
/// Calculate PAC based on a molar mass relative to that of sucrose of 342.30 g/mol, e.g.
/// glucose has a molar mass of 180.16 g/mol, so its PAC is 342.30 / 180.16 * 100 = 190.
#[must_use]
pub const fn pac_from_molar_mass(molar_mass: f64) -> f64 {
    (SUCROSE / molar_mass * 100.0).floor()
}

pub const GLUCOSE: f64 = 180.156;
pub const FRUCTOSE: f64 = 180.156;
pub const GALACTOSE: f64 = 180.156;
pub const SUCROSE: f64 = 342.30;
pub const LACTOSE: f64 = 342.297;
pub const MALTOSE: f64 = 342.297;
pub const TREHALOSE: f64 = 342.296;

pub const ERYTHRITOL: f64 = 122.12;
pub const MALTITOL: f64 = 344.313;
pub const SORBITOL: f64 = 182.17;
pub const XYLITOL: f64 = 152.146;

pub const ASPARTAME: f64 = 294.307;
pub const CYCLAMATE: f64 = 201.22;
pub const SACCHARIN: f64 = 183.18;
pub const SUCRALOSE: f64 = 397.63;

pub const SALT: f64 = 58.443;
pub const ALCOHOL: f64 = 46.069;
