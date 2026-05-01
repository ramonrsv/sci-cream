//! Energy constants (kcal/g) for macronutrients and other components
//!
//! _The data represent physiologically available energy, which is the energy value remaining after
//! digestive and urinary losses are deducted from gross energy._ ( U.S. Department of Agriculture,
//! 2013, p. 13)[^18] Energy values for major macronutrients are based on the Atwater system
//! (Merrill & Watt, 1973)[^32], and those for polyols, artificial sweeteners, and other ingredients
//! are based on various sources as noted.
#![doc = include_str!("../../docs/references/index/18.md")]
#![doc = include_str!("../../docs/references/index/32.md")]

/// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
#[doc = include_str!("../../docs/references/index/18.md")]
pub const FATS: f64 = 9.0;
/// Energy for digestible carbohydrates; fiber and polyols are not included.
///
/// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
#[doc = include_str!("../../docs/references/index/18.md")]
pub const CARBOHYDRATES: f64 = 4.0;
/// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
#[doc = include_str!("../../docs/references/index/18.md")]
pub const PROTEINS: f64 = 4.0;
/// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
#[doc = include_str!("../../docs/references/index/18.md")]
pub const ALCOHOL: f64 = 6.93;

/// (Spillane, 2006, Table 8.3, p. 157)[^9], (European Association of Polyols Producers, 2026,
/// "Polyol Erythritol")[^19]
#[doc = include_str!("../../docs/references/index/9.md")]
#[doc = include_str!("../../docs/references/index/19.md")]
pub const ERYTHRITOL: f64 = 0.2;
/// (Spillane, 2006, Table 8.3, p. 157)[^9], (European Association of Polyols Producers, 2026,
/// "Polyol Maltitol")[^19]
#[doc = include_str!("../../docs/references/index/9.md")]
#[doc = include_str!("../../docs/references/index/19.md")]
pub const MALTITOL: f64 = 2.5;
///  (Spillane, 2006, Table 8.3, p. 157)[^9]
#[doc = include_str!("../../docs/references/index/9.md")]
pub const SORBITOL: f64 = 2.8;
/// (Spillane, 2006, Table 8.3, p. 157)[^9], (European Association of Polyols Producers, 2026,
/// "Polyol Xylitol")[^19]
#[doc = include_str!("../../docs/references/index/9.md")]
#[doc = include_str!("../../docs/references/index/19.md")]
pub const XYLITOL: f64 = 2.7;

/// (International Food Information Council Foundation, 2019, "What is aspartame?")[^21]
#[doc = include_str!("../../docs/references/index/21.md")]
pub const ASPARTAME: f64 = 4.0;
/// (Lawrence, 2003, "Cyclamates")[^32]
#[doc = include_str!("../../docs/references/index/32.md")]
pub const CYCLAMATE: f64 = 0.0;
/// (American Diabetes Association, 2014, "Saccharin")[^22]
#[doc = include_str!("../../docs/references/index/22.md")]
pub const SACCHARIN: f64 = 0.0;
/// (Schiffman, 2013, "Abstract")[^23]
#[doc = include_str!("../../docs/references/index/23.md")]
pub const SUCRALOSE: f64 = 0.0;
/// (Priscilla, 2018, "Metabolism of steviol glycosides")[^28]
#[doc = include_str!("../../docs/references/index/28.md")]
pub const STEVIOSIDES: f64 = 0.0;
/// (Murata, 2010, "Abstract")[^29]
#[doc = include_str!("../../docs/references/index/29.md")]
pub const MOGROSIDES: f64 = 0.0;

/// (Niness, 1999, "Inulin and Oligofructose: What Are They?")[^24]
/// (Roberfoid, 1999, "Caloric Value of Inulin and Oligofructose")[^25]
#[doc = include_str!("../../docs/references/index/24.md")]
#[doc = include_str!("../../docs/references/index/25.md")]
pub const INULIN_AND_OLIGOFRUCTOSE: f64 = 1.5;
