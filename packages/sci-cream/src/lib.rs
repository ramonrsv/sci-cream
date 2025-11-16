#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use serde::{Deserialize, Serialize};

#[cfg(feature = "backend")]
use diesel::{Queryable, Selectable};

pub mod ingredients;
#[cfg(feature = "wasm")]
pub mod wasm;

pub use ingredients::{Category, Composition, CompositionMap, Ingredient};

#[cfg(feature = "wasm")]
pub use wasm::{add, hello_wasm, log, log_many, log_u32};

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn categoryAsStr(category: Category) -> String {
    category.to_string()
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn getIngredientExample() -> Result<JsValue, JsValue> {
    use std::collections::HashMap;

    let ingredient = ingredients::Ingredient {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        composition: CompositionMap::from([
            (Composition::Milk_Fat, Some(2.0)),
            (Composition::Lactose, Some(4.81)),
            (Composition::Milk_SNF, Some(8.82)),
        ]),
    };

    let ingredient = ingredients::Ingredient::<HashMap<usize, Option<f64>>> {
        name: ingredient.name,
        category: ingredient.category,
        composition: ingredient
            .composition
            .into_iter()
            .map(|(comp, value)| (comp as usize, value))
            .collect(),
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
