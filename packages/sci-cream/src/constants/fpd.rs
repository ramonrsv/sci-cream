//! Constants and utilities for [Freezing Point Depression
//! (FPD)](crate::docs#freezing-point-depression) calculations

/// Typical target serving temperature (in °C) for ice cream (Raphaelson, 2016, Hardness)[^7]
#[doc = include_str!("../../docs/references/index/7.md")]
pub const TARGET_SERVING_TEMP_14C: f64 = -14.0;

/// Typical x-axis value ("hardness" or "frozen water") for the serving temperature of an ice
/// cream mix in an FPD curve
///
/// Corvitto (2005, p. 78)[^3] uses 70%, see [`CORVITTO_PAC_TO_SERVING_TEMP_TABLE`] for details.
#[doc = include_str!("../../docs/references/index/3.md")]
pub const SERVING_TEMP_X_AXIS: usize = 75;

/// PAC to FPD polynomial coefficients, a*x^2 + b*x + c => [a, b, c]
///
/// _Polynominal equation with intercept through zero derived from regression model where g
/// sucrose/100 g water is graphed against FPD °C._ (Goff & Hartel, 2013, Table 6.3.c, p.
/// 186)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const PAC_TO_FPD_POLY_COEFFS: [f64; 3] = [-0.00009, -0.0612, 0.0];

/// Freezing Point Depression (FPD) constant (°C) for salts contained in MSNF and WS
///
/// _The freezing point depression for salts (°C) contained in MSNF and WS, ... based on the
/// average molecular weight and concentration of salts present in milk._ (Goff & Hartel, 2013,
/// p.183)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const FPD_CONST_FOR_MSNF_WS_SALTS: f64 = -2.37;

/// PAC to FPD lookup table
///
/// Table of empirical measurements, referenced from  _Freezing point depression (°C) below 0°C
/// of sucrose solutions (g/100g water)_ (Goff & Hartel, 2013, Table 6.1, p. 182)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
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
/// For most standard ice cream mixes this roughly matches the FPD at ~70% frozen water
/// calculated using the Goff & Hartel method (2013, p. 181)[^2] with
/// [`PAC_TO_FPD_POLY_COEFFS`], adjusting [`PAC::sugars`](crate::composition::PAC::sugars) to
/// match the PAC in this table, but ignoring the contributions to FPD by salts present in
/// MSNF and WS - Corvitto seems to have ignored these.
#[doc = include_str!("../../docs/references/index/2.md")]
#[doc = include_str!("../../docs/references/index/3.md")]
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
