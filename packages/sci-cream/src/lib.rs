#[macro_use]
extern crate approx;

use std::sync::LazyLock;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use serde::{Deserialize, Serialize};

#[cfg(feature = "backend")]
use diesel::{Queryable, Selectable};

pub mod comp_specs;
pub mod composition;
pub mod constants;
pub mod ingredients;
pub mod util;
#[cfg(feature = "wasm")]
pub mod wasm;

pub use {
    comp_specs::{DairySpec, expand_dairy_spec},
    composition::{Composition, Fats, PAC, Solids, SolidsNFNS, Sugar, Sweeteners},
    ingredients::{Category, Ingredient},
};

#[cfg(feature = "wasm")]
pub use wasm::{add, hello_wasm, log, log_many, log_u32};

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn categoryAsStr(category: Category) -> String {
    category.to_string()
}

static COMP_MILK_2_PERCENT: LazyLock<Composition> = LazyLock::new(|| Composition {
    solids: Some(Solids {
        fats: Some(Fats {
            milk: Some(2f64.into()),
            ..Fats::empty()
        }),
        sweeteners: Some(Sweeteners {
            sugar: Some(Sugar {
                lactose: Some(4.8069f64.into()),
                ..Sugar::empty()
            }),
            ..Sweeteners::empty()
        }),
        snfs: Some(SolidsNFNS {
            milk: Some(8.82f64.into()),
            ..SolidsNFNS::empty()
        }),
    }),
    micro: None,
    alcohol: None,
    pod: Some(0.769104f64.into()),
    pac: Some(PAC {
        sugar: Some(4.8069f64.into()),
        ..PAC::empty()
    }),
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
