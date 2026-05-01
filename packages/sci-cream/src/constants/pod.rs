//! [Potere Dolcificante (POD)](crate::docs#pod) values various sweeteners and other ingredients
//!
//! Expressed as g/100g of sucrose equivalence.

/// Also known by the name 'dextrose', commonly sold as dextrose monohydrate powder.
///
/// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const GLUCOSE: f64 = 80.0;
/// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const FRUCTOSE: f64 = 173.0;
/// (Spillane, 2006, p. 264)[^9]
#[doc = include_str!("../../docs/references/index/9.md")]
pub const GALACTOSE: f64 = 65.0;
/// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const SUCROSE: f64 = 100.0;
/// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const LACTOSE: f64 = 16.0;
/// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2], (Spillane, 2006, p. 253)[^9]
#[doc = include_str!("../../docs/references/index/2.md")]
#[doc = include_str!("../../docs/references/index/9.md")]
pub const MALTOSE: f64 = 32.0;
/// (Hull, 2010, Appendix C.3, p. 324)[^15], (Spillane, 2006, p. 262)[^9]
#[doc = include_str!("../../docs/references/index/15.md")]
#[doc = include_str!("../../docs/references/index/9.md")]
pub const TREHALOSE: f64 = 45.0;

/// (Spillane, 2006, Table 8.5, p. 159)[^9], (The European Commission, 2025, E968)[^10],
/// (Hull, 2010, Appendix C.3, p. 324)[^15]
#[doc = include_str!("../../docs/references/index/9.md")]
#[doc = include_str!("../../docs/references/index/10.md")]
#[doc = include_str!("../../docs/references/index/15.md")]
pub const ERYTHRITOL: f64 = 70.0;
/// (Spillane, 2006, Table 8.5, p. 159)[^9], (Hull, 2010, Appendix C.3, p. 324)[^15]
#[doc = include_str!("../../docs/references/index/9.md")]
#[doc = include_str!("../../docs/references/index/15.md")]
pub const MALTITOL: f64 = 90.0;
/// (Spillane, 2006, Table 8.5, p. 159)[^9], (Hull, 2010, Appendix C.3, p. 324)[^15]
#[doc = include_str!("../../docs/references/index/9.md")]
#[doc = include_str!("../../docs/references/index/15.md")]
pub const SORBITOL: f64 = 55.0;
/// (Spillane, 2006, Table 8.5, p. 159)[^9], (Hull, 2010, Appendix C.3, p. 324)[^15]
#[doc = include_str!("../../docs/references/index/9.md")]
#[doc = include_str!("../../docs/references/index/15.md")]
pub const XYLITOL: f64 = 95.0;

/// (The European Commission, 2025, E951)[^10]
#[doc = include_str!("../../docs/references/index/10.md")]
pub const ASPARTAME: f64 = 200.0 * 100.0;
/// (Spillane, 2006, Table 9.4, p. 188)[^9]
#[doc = include_str!("../../docs/references/index/9.md")]
pub const CYCLAMATE: f64 = 30.0 * 100.0;
/// (The European Commission, 2025, E954)[^10]
#[doc = include_str!("../../docs/references/index/10.md")]
pub const SACCHARIN: f64 = 400.0 * 100.0;
/// (Castro-Muñoz, 2022)[^11]), (Hull, 2010, Appendix C.3, p. 324)[^15]
#[doc = include_str!("../../docs/references/index/11.md")]
#[doc = include_str!("../../docs/references/index/15.md")]
pub const SUCRALOSE: f64 = 600.0 * 100.0;

/// (Spillane, 2006, p. 297)[^9]
///
/// <div class='warning'>
/// The POD values for steviosides vary significantly between different sources, are dependent
/// on concentration, extract purity, and on specific glycoside composition. The values listed
/// here are very rough estimations for general reference only. Given that, and that products
/// rarely list the exact amounts of extracts used, these should not be used to calculate POD
/// contributions in formulations; ingredients should explicitly provide POD values instead.
/// </div>
///
#[doc = include_str!("../../docs/references/index/9.md")]
pub const STEVIOSIDES: f64 = 225.0 * 100.0;
/// (Spillane, 2006, p. 297)[^9]
///
/// <div class='warning'>
/// The POD values for mogrosides vary significantly between different sources, are dependent
/// on concentration, extract purity, and on specific glycoside composition. The values listed
/// here are very rough estimations for general reference only. Given that, and that products
/// rarely list the exact amounts of extracts used, these should not be used to calculate POD
/// contributions in formulations; ingredients should explicitly provide POD values instead.
/// </div>
///
#[doc = include_str!("../../docs/references/index/9.md")]
pub const MOGROSIDES: f64 = 340.0 * 100.0;

/// (Niness, 1999, "Inulin and Oligofructose: What Are They?")[^24]
#[doc = include_str!("../../docs/references/index/24.md")]
pub const INULIN: f64 = 0.0;
/// (Niness, 1999, "Inulin and Oligofructose: What Are They?")[^24]
#[doc = include_str!("../../docs/references/index/24.md")]
pub const OLIGOFRUCTOSE: f64 = 40.0;
