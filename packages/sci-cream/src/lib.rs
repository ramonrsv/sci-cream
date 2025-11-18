#[allow(unused_imports)]
#[macro_use]
extern crate approx;

use std::sync::LazyLock;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use serde::{Deserialize, Serialize};

#[cfg(feature = "backend")]
use diesel::{Queryable, Selectable};

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
    specs::{DairySpec, SugarsSpec, expand_dairy_spec, expand_sugars_spec},
};

#[cfg(feature = "wasm")]
pub use crate::{
    display::flat_header_as_med_str_js,
    specs::into_ingredient_from_spec_js,
    wasm::{add, hello_wasm, log, log_many, log_u32},
};

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn categoryAsStr(category: Category) -> String {
    category.to_string()
}

static COMP_MILK_2_PERCENT: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(
            Solids::new().milk(
                SolidsBreakdown::new()
                    .fats(2f64)
                    .sweeteners(4.8069f64)
                    .snfs(4.0131f64),
            ),
        )
        .sweeteners(Sweeteners::new().sugars(Sugars::new().lactose(4.8069f64)))
        .pod(0.769104f64)
        .pac(PAC::new().sugars(4.8069f64))
});

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn getIngredientExampleWasm() -> Ingredient {
    let ingredient = Ingredient {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        composition: COMP_MILK_2_PERCENT.clone(),
    };

    ingredient
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn getIngredientExampleJs() -> Result<JsValue, JsValue> {
    let ingredient = Ingredient {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        composition: COMP_MILK_2_PERCENT.clone(),
    };

    Ok(serde_wasm_bindgen::to_value(&ingredient)?)
}

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
