//! Constants and utilities for emulsifier strength values and emulsification calculations
//!
//! Emulsifier "strength" is somewhat of a fuzzy concept, since different emulsifiers do not all act
//! in the same way, having different effects on various properties of emulsions, e.g. Polysorbate
//! 80 are believed to be most active at the fat interface of the ice cream, making them most
//! efficient at destabilizing the fat emulsion, while mono- and diglycerides are believed to be
//! most active at the fat-air interface, helping the ice cream form a finer-textured foam
//! (Raphaelson, 2023, January)[^38]. However, this allows for a rough scaling, differentiating
//! between weak and strong ingredients for which the recommended usage levels differ greatly,
//! albeit emulsifier strength does not vary nearly as much as stabilizer strength.
//!
//! The strength values are expressed as a percentage relative to a reference emulsifier. Lecithin
//! is taken as the reference emulsifier, since it is widely available and commonly used, often
//! introduced via egg yolks in custard ice creams (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025,
//! p. 84)[^20], (Raphaelson, 2023, January)[^38]. As the reference, it has a strength of 100, with
//! a recommended dosage of ~3.25g/kg (Raphaelson, 2016, Standard Base)[^5]. The relative strength
//! of other emulsifiers is estimated by comparing their recommended dosages to that of Lecithin, or
//! via cited equivalencies to Lecithin or other emulsifiers.
//
// @todo Find a better way to estimate the relative strength of other emulsifiers, ideally from
// literature, and without referencing the recommended dosages, as those can vary significantly
// depending on the rest of the formulation.
#![doc = include_str!("../../docs/references/index/4.md")]
#![doc = include_str!("../../docs/references/index/5.md")]
#![doc = include_str!("../../docs/references/index/20.md")]
#![doc = include_str!("../../docs/references/index/38.md")]

/// Emulsifier strength for Lecithin, set to 100 as the reference emulsifier
///
/// Lecithin, with a recommended dosage of ~3.25g/kg, is taken as the reference emulsifier,
/// and has an emulsifier strength of 100 (Raphaelson, 2016, Standard Base)[^5].
#[doc = include_str!("../../docs/references/index/5.md")]
pub const EMULSIFIER_STRENGTH_LECITHIN: f64 = 100.0;

/// @todo...
pub const EMULSIFIER_STRENGTH_CASEIN_PROTEINS: f64 = 1.0;

/// @todo...
pub const EMULSIFIER_STRENGTH_WHEY_PROTEINS: f64 = 1.0;

/// @todo...
pub const EMULSIFIER_STRENGTH_EGG_YOLK_OTHER_SOLIDS: f64 = 1.0;

/// Emulsifier strength for Gum Arabic, expressed as a percentage relative to a reference
///
/// The effectiveness of Gum Arabic as an emulsifier depends on the type and sample. Some
/// commercial Gum Arabic products claim that it is a 1:1 substitute for mono- and diglycerides,
/// which itself has a recommended dosage of 1-2g/kg (Raphaelson, 2023, January)[^38]. Taking
/// the average of 1.5g/kg, Gum Arabic has an emulsifier strength of ~217.
#[doc = include_str!("../../docs/references/index/38.md")]
pub const EMULSIFIER_STRENGTH_GUM_ARABIC: f64 = 217.0;

/// Emulsifier strength for mono- and diglycerides, expressed as a reference-relative percentage
///
/// Mono- and diglycerides, with a recommended dosage of 1-2g/kg, have an emulsifier strength of
/// ~217 (Raphaelson, 2023, January)[^38], (Ice Cream Science, 2026, May, "Why are emulsifiers
/// used in ice cream?")[^45].
#[doc = include_str!("../../docs/references/index/38.md")]
#[doc = include_str!("../../docs/references/index/45.md")]
pub const EMULSIFIER_STRENGTH_MONO_AND_DIGLYCERIDES: f64 = 217.0;

/// @todo...
pub const EMULSIFIER_STRENGTH_DISTILLED_MONOGLYCERIDES: f64 = 1.0;

/// Emulsifier strength for Polysorbate 80, expressed as a percentage relative to a reference
///
/// Polysorbate 80, with a recommended dosage of ~0.2-0.4g/kg, has an emulsifier strength of
/// ~1000 (Raphaelson, 2023, January)[^38].
#[doc = include_str!("../../docs/references/index/38.md")]
pub const EMULSIFIER_STRENGTH_POLYSORBATE_80: f64 = 1000.0;
