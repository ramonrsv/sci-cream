#[allow(unused_imports)]
#[macro_use]
extern crate approx;

pub mod composition;
pub mod constants;
pub mod display;
pub mod ingredients;
pub mod specs;
pub mod util;
#[cfg(feature = "wasm")]
pub mod wasm;

pub use {
    composition::{Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
    display::FlatHeader,
    ingredients::{Category, Ingredient},
    specs::{DairySpec, SugarsSpec},
};

#[cfg(feature = "wasm")]
pub use crate::{
    display::js::flat_header_as_med_str_js,
    specs::js::into_ingredient_from_spec_js,
    wasm::{log, log_many, log_u32},
};

#[cfg(feature = "backend")]
diesel::table! {
    ingredients (id) {
        id -> Int4,
        name -> Varchar,
        category -> Varchar,
    }
}

#[cfg(test)]
mod tests;
