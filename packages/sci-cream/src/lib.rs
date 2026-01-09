/*! `sci-cream` is a Rust library that facilitates the mathematical analysis of ice cream mixes and
their properties.
*/

#![cfg_attr(coverage, feature(coverage_attribute))]

#[doc = include_str!("../docs/freezing-point-depression.md")]
#[doc = include_str!("../docs/sweeteners.md")]
#[doc = include_str!("../docs/bibliography.md")]
pub mod docs;

pub mod composition;
pub mod constants;
pub mod display;
pub mod error;
pub mod fpd;
pub mod ingredients;
pub mod recipe;
pub mod specs;
pub mod util;
pub mod validate;

#[cfg(feature = "diesel")]
pub mod diesel;
#[cfg(feature = "wasm")]
pub mod wasm;

// @todo Re-export key structs and enums for easier access
pub use {
    composition::Composition,
    ingredients::{Category, Ingredient},
};

#[cfg(test)]
mod tests;
