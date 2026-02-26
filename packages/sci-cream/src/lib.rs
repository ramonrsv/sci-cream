/*! `sci-cream` is a Rust library that facilitates the mathematical analysis of ice cream mixes and
their properties.

# Usage
Add `sci-cream` as a dependency in your `Cargo.toml`:
```toml
[dependencies]
sci-cream = "0.0.1"
```
*/

#![cfg_attr(coverage, feature(coverage_attribute))]

pub mod composition;
pub mod constants;
pub mod display;
pub mod docs;
pub mod error;
pub mod fpd;
pub mod ingredient;
pub mod properties;
pub mod recipe;
pub mod specs;
pub mod util;
pub mod validate;

#[cfg(feature = "data")]
pub mod data;
#[cfg(feature = "database")]
pub mod database;
#[cfg(feature = "diesel")]
pub mod diesel;
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
