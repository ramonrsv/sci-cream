/*! `sci-cream` is a Rust library that facilitates the mathematical analysis of ice cream mixes and
their properties.
*/

#![cfg_attr(coverage, feature(coverage_attribute))]

#[allow(missing_docs)] // @todo
pub mod composition;
pub mod constants;
pub mod display;
pub mod docs;
pub mod error;
pub mod fpd;
pub mod ingredient;
pub mod properties;
pub mod recipe;
#[allow(missing_docs)] // @todo
pub mod specs;
pub mod util;
pub mod validate;

#[cfg(feature = "data")]
pub mod data;
#[cfg(feature = "database")]
pub mod database;
#[cfg(feature = "diesel")]
pub mod diesel;
#[allow(missing_docs)] // @todo
#[cfg(feature = "wasm")]
pub mod wasm;

// @todo Re-export key structs and enums for easier access
pub use {
    composition::{CompKey, Composition},
    fpd::{FPD, FpdKey},
    ingredient::{Category, Ingredient},
    properties::{MixProperties, PropKey},
};

#[cfg(test)]
mod tests;

// Silence unused_crate_dependencies lint for [dev-dependencies] used in /benches and /examples.
#[cfg(test)]
mod _lint {
    use criterion as _;
}
