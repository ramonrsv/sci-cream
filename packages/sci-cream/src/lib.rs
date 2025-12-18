/*! `sci-cream` is a Rust library that facilitates the mathematical analysis of ice cream mixes and
their properties.
*/

pub mod composition;
pub mod constants;
pub mod display;
pub mod error;
pub mod fpd;
pub mod ingredients;
pub mod recipe;
pub mod specs;
pub mod util;

#[cfg(feature = "diesel")]
pub mod diesel;
#[cfg(feature = "wasm")]
pub mod wasm;

pub use {
    composition::{CompKey, Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
    display::{composition_value_as_percentage, composition_value_as_quantity},
    ingredients::{Category, Ingredient},
    recipe::{MixProperties, PropKey},
    specs::{DairySpec, SweetenersSpec},
};

#[cfg(feature = "wasm")]
pub use crate::{
    display::js::{comp_key_as_med_str_js, fpd_key_as_med_str_js},
    recipe::js::{calculate_mix_composition_js, calculate_mix_properties_js},
    specs::js::into_ingredient_from_spec_js,
    wasm::{log, log_many, log_u32},
};

#[cfg(test)]
mod tests;
