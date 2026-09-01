//! Constants for conversions between different unit systems, e.g. teaspoon <-> ml

/// Factors for conversions between various units of measurements
///
/// These are precise conversion factors, as outlined in the _National Institute of Standards and
/// Technology (NIST) Guide to the SI, Appendix B.8: Factors for Units Listed Alphabetically_ (NIST,
/// 2025)[^74].
///
/// For values used for nutrition labeling, see [`label`].
#[doc = include_str!("../../docs/references/index/74.md")]
pub mod nist {
    /// Conversion factor from tablespoons to milliliters (volume).
    ///
    /// (NIST, 2025, "tablespoon")[^74]
    #[doc = include_str!("../../docs/references/index/74.md")]
    pub const ML_IN_TABLESPOON: f64 = 14.78676;

    /// Conversion factor from teaspoons to milliliters (volume).
    ///
    /// (NIST, 2025, "teaspoon")[^74]
    #[doc = include_str!("../../docs/references/index/74.md")]
    pub const ML_IN_TEASPOON: f64 = 4.928_922;

    /// Conversion factor from cups (U.S.) to milliliters (volume).
    ///
    /// (NIST, 2025, "cup (U.S.)")[^74]
    #[doc = include_str!("../../docs/references/index/74.md")]
    pub const ML_IN_CUP_US: f64 = 236.5882;

    /// Conversion factor from fluid ounce (U.S.) (fl oz) to milliliters (volume).
    ///
    /// (NIST, 2025, "fluid ounce (U.S.)")[^74]
    #[doc = include_str!("../../docs/references/index/74.md")]
    pub const ML_IN_FLUID_OUNCE_US: f64 = 29.57353;
}

/// Household measures as defined for US nutrition labeling
///
/// These are conversions defined for nutrition labeling, outlined in the _U.S. Food and Drug
/// Administration (FDA) Code of Federal Regulations (CFR), Title 21, Part 101 - Food Labeling_
/// (U.S. FDA, CFR 21, 101)[^52].
///
/// For precise values used for scientific calculations, see [`nist`].
#[doc = include_str!("../../docs/references/index/52.md")]
pub mod label {
    /// Volume (mL) of one teaspoon, for nutrition labeling
    ///
    /// (U.S. FDA, CFR 21, 101.9(b)(5)(viii))[^52]
    #[doc = include_str!("../../docs/references/index/52.md")]
    pub const ML_IN_TEASPOON: f64 = 5.0;

    /// Volume (mL) of one tablespoon, for nutrition labeling
    ///
    /// (U.S. FDA, CFR 21, 101.9(b)(5)(viii))[^52]
    #[doc = include_str!("../../docs/references/index/52.md")]
    pub const ML_IN_TABLESPOON: f64 = 15.0;

    /// Volume (mL) of one cup, for nutrition labeling
    ///
    /// (U.S. FDA, CFR 21, 101.9(b)(5)(viii))[^52]
    #[doc = include_str!("../../docs/references/index/52.md")]
    pub const ML_IN_CUP: f64 = 240.0;

    /// Volume (mL) of one fluid ounce, for nutrition labeling
    ///
    /// (U.S. FDA, CFR 21, 101.9(b)(5)(viii))[^52]
    #[doc = include_str!("../../docs/references/index/52.md")]
    pub const ML_IN_FLUID_OUNCE: f64 = 30.0;

    /// Weight (g) of one ounce, for nutrition labeling
    ///
    /// (U.S. FDA, CFR 21, 101.9(b)(5)(viii))[^52]
    #[doc = include_str!("../../docs/references/index/52.md")]
    pub const GRAMS_IN_OUNCE: f64 = 28.0;
}
