/// [Potere Dolcificante (POD)](crate::docs#pod) values various sweeteners and other ingredients
///
/// Expressed as g/100g of sucrose equivalence. Unless otherwise specified, values are taken from
/// _Characteristics of sweeteners and bulking agents for frozen desserts_ (Goff & Hartel, 2013,
/// Table 3.4, p. 67)[^2]. Other sources are cited where applicable.
#[doc = include_str!("../docs/bibs/2.md")]
pub mod pod {
    /// Also known by the name 'dextrose', commonly sold as dextrose monohydrate powder.
    pub const GLUCOSE: f64 = 80.4;
    pub const FRUCTOSE: f64 = 173.0;
    /// (Spillane, 2006, p. 264)[^9]
    #[doc = include_str!("../docs/bibs/9.md")]
    pub const GALACTOSE: f64 = 65.0;
    pub const SUCROSE: f64 = 100.0;
    pub const LACTOSE: f64 = 16.0;
    pub const MALTOSE: f64 = 32.0;
}

/// [Potere Anti-Congelante (PAC)](crate::docs#pac-afp-fpdf-se) values for various sweeteners and
/// other ingredients
///
/// Expressed as g/100g of sucrose equivalence. Unless otherwise specified, values are calculated
/// based on molar mass relative to that of sucrose of 342.30 g/mol, e.g. glucose has a molar mass
/// of 180.16 g/mol, so its PAC is 342.30 / 180.16 * 100 = 190.
pub mod pac {
    pub const GLUCOSE: f64 = 190.0;
    pub const FRUCTOSE: f64 = 190.0;
    pub const GALACTOSE: f64 = 190.0;
    pub const SUCROSE: f64 = 100.0;
    pub const LACTOSE: f64 = 100.0;
    pub const MALTOSE: f64 = 100.0;

    pub const SALT: f64 = 585.0;
    pub const ALCOHOL: f64 = 740.0;

    #[cfg(doc)]
    use crate::constants;

    /// PAC for typical salt content in milk solids non-fat (MSNF) and whey solids (WS)
    ///
    /// This value was reverse engineered from [`constants::FPD_CONST_FOR_MSNF_WS_SALTS`],
    /// calculated via [`get_pac_from_fpd_polynomial(...)`](crate::fpd::get_pac_from_fpd_polynomial)
    /// with [`constants::FPD_CONST_FOR_MSNF_WS_SALTS`] and [`constants::PAC_TO_FPD_POLY_COEFFS`].
    pub const MSNF_WS_SALTS: f64 = 36.74040576149157;
}

/// Hardness Factor (HF) values for chocolate and nut ingredients
///
/// Used in the [Corvitto method](crate::docs#corvitto-method-hardness-factor) for calculating the
/// hardness of mixes containing chocolate and nut ingredients (Corvitto, 2005, p. 243)[^3].
#[doc = include_str!("../docs/bibs/3.md")]
pub mod hf {
    pub const CACAO_BUTTER: f64 = 0.9;
    pub const COCOA_SOLIDS: f64 = 1.8;
    pub const NUT_FAT: f64 = 1.4;
}

/// PAC to FPD polynomial coefficients, a*x^2 + b*x + c => [a, b, c]
///
/// _Polynominal equation with intercept through zero derived from regression model where g
/// sucrose/100 g water is graphed against FPD °C._ (Goff & Hartel, 2013, Table 6.3.c, p. 186)[^2]
#[doc = include_str!("../docs/bibs/2.md")]
pub const PAC_TO_FPD_POLY_COEFFS: [f64; 3] = [-0.00009, -0.0612, 0.0];

/// Freezing Point Depression (FPD) constant (°C) for salts contained in MSNF and WS
///
/// _The freezing point depression for salts (°C) contained in MSNF and WS, ... based on the average
/// molecular weight and concentration of salts present in milk._ (Goff & Hartel, 2013, p.183)[^2]
#[doc = include_str!("../docs/bibs/2.md")]
pub const FPD_CONST_FOR_MSNF_WS_SALTS: f64 = -2.37;

pub const STD_MSNF_IN_MILK_SERUM: f64 = 0.09;

/// Percentage of lactose typical of milk solids non-fat (MSNF) (Goff & Hartel, 2013, p. 181)[^2]
#[doc = include_str!("../docs/bibs/2.md")]
pub const STD_LACTOSE_IN_MSNF: f64 = 0.545;

/// Percentage of lactose typically found in whey solids (WS) (Goff & Hartel, 2013, p. 181)[^2]
#[doc = include_str!("../docs/bibs/2.md")]
pub const STD_LACTOSE_IN_WS: f64 = 0.765;

/// Typical ideal serving temperature (in °C) for ice cream (Raphaelson, 2016, Hardness)[^7]
#[doc = include_str!("../docs/bibs/7.md")]
pub const TARGET_SERVING_TEMP_14C: f64 = -14.0;

pub const SERVING_TEMP_X_AXIS: usize = 75;

/// Ratio to convert Alcohol by Volume (ABV) to Alcohol by Weight (ABW)
///
/// _"Because of the miscibility of alcohol and water, the conversion factor is not constant but
/// rather depends upon the concentration of alcohol."_ ("Alcohol by volume", 2025)[^8] However,
/// for typical ice cream alcohol contents the approximation of 0.789 is sufficiently accurate.
#[doc = include_str!("../docs/bibs/8.md")]
pub const ABV_TO_ABW_RATIO: f64 = 0.789;

/// PAC to FPD lookup table
///
/// Table of empirical measurements, referenced from  _Freezing point depression (°C) below 0°C of
/// sucrose solutions (g/100g water)_ (Goff & Hartel, 2013, Table 6.1, p. 182)[^2]
#[doc = include_str!("../docs/bibs/2.md")]
pub const PAC_TO_FPD_TABLE: [(usize, f64); 61] = [
    // (g Sucrose/100g water, FPD (°C))
    (0, 0.00),
    (3, 0.18),
    (6, 0.35),
    (9, 0.53),
    (12, 0.72),
    (15, 0.90),
    (18, 1.10),
    (21, 1.29),
    (24, 1.47),
    (27, 1.67),
    (30, 1.86),
    (33, 2.03),
    (36, 2.21),
    (39, 2.40),
    (42, 2.60),
    (45, 2.78),
    (48, 2.99),
    (51, 3.20),
    (54, 3.42),
    (57, 3.63),
    (60, 3.85),
    (63, 4.10),
    (66, 4.33),
    (69, 4.54),
    (72, 4.77),
    (75, 5.00),
    (78, 5.26),
    (81, 5.53),
    (84, 5.77),
    (87, 5.99),
    (90, 6.23),
    (93, 6.50),
    (96, 6.80),
    (99, 7.04),
    (102, 7.32),
    (105, 7.56),
    (108, 7.80),
    (111, 8.04),
    (114, 8.33),
    (117, 8.62),
    (120, 8.92),
    (123, 9.19),
    (126, 9.45),
    (129, 9.71),
    (132, 9.96),
    (135, 10.22),
    (138, 10.47),
    (141, 10.72),
    (144, 10.97),
    (147, 11.19),
    (150, 11.41),
    (153, 11.63),
    (156, 11.88),
    (159, 12.14),
    (162, 12.40),
    (165, 12.67),
    (168, 12.88),
    (171, 13.08),
    (174, 13.28),
    (177, 13.48),
    (180, 13.68),
];

/// Reference table for Corvitto PAC to serving temperature (Corvitto, 2005, p. 78)[^3]
///
/// For most standard ice cream mixes this roughly matches the FPD at ~70% frozen water calculated
/// using the Goff & Hartel method (2013, p. 181)[^2] with [`PAC_TO_FPD_POLY_COEFFS`], adjusting
/// [`PAC::sugars`](crate::composition::PAC::sugars) to match the PAC in this table, but ignoring
/// the contributions to FPD by salts present in MSNF/WS - Corvitto seems to have ignored these.
#[doc = include_str!("../docs/bibs/2.md")]
#[doc = include_str!("../docs/bibs/3.md")]
pub const CORVITTO_PAC_TO_SERVING_TEMP_TABLE: [(f64, f64); 9] = [
    // (pac, serving_temp)
    (25.0, -10.0),
    (27.0, -11.0),
    (29.0, -12.0),
    (31.0, -13.0),
    (33.0, -14.0),
    (35.0, -15.0),
    (37.0, -16.0),
    (39.0, -17.0),
    (41.0, -18.0),
];

/// Epsilon value for floating point comparisons of compositions, e.g. water content
pub const COMPOSITION_EPSILON: f64 = 1e-10;
