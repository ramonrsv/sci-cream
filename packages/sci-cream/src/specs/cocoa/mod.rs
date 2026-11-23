//! [`ChocolateSpec`], [`CocoaPowderSpec`], [`ChocolateLabelSpec`], and associated implementations
//! and utilities for chocolate and other cacao ingredients
//!
//! # Standard fractions
//!
//! The specs and estimators in this module often rely on standard composition fractions of cacao
//! and milk solids in order to provide detailed ingredient compositions from the usually limited
//! information available for chocolate products. These fractions hold reasonably well for most
//! chocolates and cocoa powders, but not universally. A few key caveats to keep in mind include:
//!
//! - The cocoa butter content of cacao solids in products varies significantly by formulation,
//!   since many products include different cacao ingredients with varying cocoa butter contents. As
//!   such, [`cocoa::STD_COCOA_BUTTER_IN_COCOA_SOLIDS`] is used only as a fallback, and an explicit
//!   [`ChocolateFat::Total`] or [`ChocolateFat::Split`] is preferred whenever one is available.
//! - When only total fat is specified, milk fat anchors the total fat split instead of cocoa
//!   butter, because the milk fat content of milk solids is more consistent, usually from a single
//!   whole milk powder ingredient. Products with separately added butterfat or skim milk powder
//!   ingredients need an explicit [`ChocolateFat::Split`] if using [`ChocolateSpec`], and cannot be
//!   accurately estimated from a nutrition label, e.g. via [`ChocolateLabelSpec`].
//! - The protein, mineral, and lactose fractions of milk solids non-fat hold for fluid, evaporated,
//!   and powdered milks, whole and skim alike. They don't, however, hold for other modified dairy
//!   products such as ultrafiltered milks, sweet whey, protein powders or concentrates. Products
//!   that contain any such ingredients, or added lactose, cannot be accurately estimated by the
//!   specs or estimators in this module, and should use [`CompositeSpec`] instead.
//! - For [`ChocolateKind::MilkChocolate`], when no [`DeclaredSolids::Actual`] are provided, the
//!   solids are estimated from [`cocoa::STD_FIBER_IN_COCOA_SNF`]. Reconciliation tests of
//!   products with known milk solids content have shown this to be a decent estimator, but the
//!   fiber content of cocoa solids in product listings can vary significantly, so explicit
//!   [`DeclaredSolids::Actual`] are preferred. A [`DeclaredSolids::Min`] behaves similarly, except
//!   it overrides an estimate from fiber only if it's below the minimum; it's an error if neither a
//!   declaration nor a fiber is provided.
//!
//! The aforementioned fractions are derived chiefly from literature, such as Goff & Hartel
//! (2025)[^20], and USDA listings of representative dairy and cacao ingredients, and so their
//! applicability and accuracy rest on how well the products match the literature compositions and
//! that of the set of USDA listings; see [`cocoa`] and [`dairy`] for more details.
#![doc = include_str!("../../../docs/references/index/20.md")]

#[cfg(doc)]
use crate::{
    constants::composition::{cocoa, dairy},
    specs::CompositeSpec,
};

pub mod chocolate;
pub mod cocoa_powder;
pub mod label;
pub mod util;

pub use chocolate::*;
pub use cocoa_powder::*;
pub use label::*;
pub use util::*;
