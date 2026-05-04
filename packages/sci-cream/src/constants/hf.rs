//! Hardness Factor (HF) values for chocolate and nut ingredients
//!
//! Used in the [Corvitto method](crate::docs#corvitto-method-hardness-factor) for calculating the
//! hardness of mixes containing chocolate and nut ingredients (Corvitto, 2005, p. 243)[^3].
#![doc = include_str!("../../docs/references/index/3.md")]

/// Hardness Factor for cacao butter; see the [chocolate documentation](crate::docs#chocolate).
pub const CACAO_BUTTER: f64 = 0.9;

/// Hardness Factor for cocoa solids; see the [chocolate documentation](crate::docs#chocolate).
pub const COCOA_SOLIDS: f64 = 1.8;

/// Hardness Factor for nut fat; see [`NutSpec`](crate::specs::NutSpec).
pub const NUT_FAT: f64 = 1.4;
