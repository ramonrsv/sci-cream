//! Constants and utilities for stabilizer strength values and stabilization calculations
//!
//! Stabilizer "strength" is a very fuzzy concept, since "stabilization" is a broad term that
//! encompasses various properties and effects, e.g. ice crystal growth suppression, viscosity,
//! texture, etc., it is difficult to precisely quantify the contributions of different stabilizers
//! to each of these properties and effects, and their efficacy various greatly depending on the
//! rest of the formulation, processing conditions, etc. Some stabilizers also exhibit synergistic
//! effects when used in combinations with other stabilizers, making it even more difficult to
//! quantify their individual contributions. For example, Locust Bean Gum, Guar Gum, and
//! Carrageenans are often used together, since LBG and Guar Gum strengthen each other's effects,
//! and Carrageenans help control the wheying off that both LBG and Guar Gum can cause (Goff &
//! Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37]. However, this allows for a rough
//! scaling, differentiating between weak and strong ingredients, for example between cornstarch and
//! Locust Bean Gum as stabilizers, the recommended usage levels of which differ greatly. It also
//! allows for a rough estimation of the total stabilization effect in a formulation, including
//! contributions from other core ingredients like egg yolk proteins, milk proteins, sugars, etc.
//!
//! The strength values are expressed as a percentage relative to a reference stabilizer. Locust
//! Bean Gum is taken as the reference stabilizer, since it is commonly used and widely regarded as
//! the best stabilizer for many ice cream applications (Clarke, 2017, Chapter 3: Locust Bean Gum,
//! p. 52)[^4], (Goff & Hartel, 2025, p. 77, p. 81)[^20]. As the reference, it has a strength of
//! 100, with a recommended dosage of ~2g/kg (Cree, 2017, Locust Bean Gum, p. 71)[^6]. The relative
//! strength of other stabilizers is estimated by comparing their recommended dosages to that of
//! Locust Bean Gum, e.g. cornstarch has a recommended dosage of ~10g/kg (Cree, 2017, Cornstarch, p.
//! 69)[^6], so its strength is estimated as 100 * (2 / 10) = 20.
//
// @todo Find a better way to estimate the relative strength of other stabilizers, ideally from
// literature, and without referencing the recommended dosages, as those can vary significantly
// depending on the rest of the formulation.
#![doc = include_str!("../../docs/references/index/4.md")]
#![doc = include_str!("../../docs/references/index/6.md")]
#![doc = include_str!("../../docs/references/index/20.md")]
#![doc = include_str!("../../docs/references/index/37.md")]

/// Stabilizer strength for Locust Bean Gum (LBG), set to 100 as the reference stabilizer
///
/// Locust Bean Gum, with a recommended dosage of ~2g/kg, is taken as the reference stabilizer,
/// and has a stabilizer strength of 100 (Cree, 2017, Locust Bean Gum, p. 71)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_LOCUST_BEAN_GUM: f64 = 100.0;

/// @todo...
pub const STABILIZER_STRENGTH_EGG_YOLK_SOLIDS: f64 = 1.0;

/// @todo...
pub const STABILIZER_STRENGTH_WHEY_PROTEINS: f64 = 1.0;

/// Stabilizer strength for cornstarch, expressed as a percentage relative to a reference
///
/// Cornstarch, with a recommended dosage of ~10g/kg, has a stabilizer strength of ~20 (Cree,
/// 2017, Cornstarch, p. 69)[^6], (Cree, 2017, Blank Slate Custard Ice Cream, p. 115)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_CORNSTARCH: f64 = 20.0;

/// Stabilizer strength for tapioca starch, expressed as a percentage relative to a reference
///
/// Tapioca starch, with a recommended dosage of ~5g/kg, has a stabilizer strength of ~40, twice
/// as strong as cornstarch (Cree, 2017, Tapioca Starch, p. 71)[^6], (Cree, 2017, Blank Slate
/// Custard Ice Cream, p. 115)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_TAPIOCA_STARCH: f64 = 40.0;

/// Stabilizer strength for pectin, expressed as a percentage relative to a reference
///
/// Pectin, with a recommended dosage of ~1g/kg, has a stabilizer strength of ~200 (Cree, 2017,
/// Pectin, p. 72)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_PECTIN: f64 = 200.0;

/// Stabilizer strength for gelatin, expressed as a percentage relative to a reference
///
/// Gelatin, with a recommended dosage of ~4g/kg, has a stabilizer strength of ~50 (Cree, 2017,
/// Gelatin, p. 76)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_GELATIN: f64 = 50.0;

/// Stabilizer strength for Guar Gum, expressed as a percentage relative to a reference
///
/// Guar Gum, with a recommended dosage of ~1g/kg, has a stabilizer strength of ~200 (Cree,
/// 2017, Guar Gum, p. 73)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_GUAR_GUM: f64 = 200.0;

/// Stabilizer strength for Carrageenans, expressed as a percentage relative to a reference
///
/// Carrageenans, with a recommended dosage of ~2.5g/kg, has a stabilizer strength of ~80 (Cree,
/// 2017, Carrageenans, p. 74)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_CARRAGEENANS: f64 = 80.0;

/// @todo...
pub const STABILIZER_STRENGTH_CARBOXYMETHYL_CELLULOSE: f64 = 1.0;

/// Stabilizer strength for Xanthan Gum, expressed as a percentage relative to a reference
///
/// Xanthan Gum, with a recommended dosage of ~1g/kg, has a stabilizer strength of ~200 (Cree,
/// 2017, Xanthan Gum, p. 73)[^6].
#[doc = include_str!("../../docs/references/index/6.md")]
pub const STABILIZER_STRENGTH_XANTHAN_GUM: f64 = 200.0;

/// @todo...
pub const STABILIZER_STRENGTH_SODIUM_ALGINATE: f64 = 1.0;

/// @todo...
pub const STABILIZER_STRENGTH_TARA_GUM: f64 = 1.0;
