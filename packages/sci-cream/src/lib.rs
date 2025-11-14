#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "backend")]
use diesel::{Queryable, Selectable};

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn hello_wasm() -> String {
    "Hello, wasm!".to_string()
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn add(a: u32, b: u32) -> u32 {
    a + b
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn getIngredientExample() -> Ingredient {
    Ingredient::new("2% Milk".to_string(), "Dairy".to_string())
}

#[cfg(feature = "backend")]
diesel::table! {
    ingredients (id) {
        id -> Int4,
        name -> Varchar,
        category -> Varchar,
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[cfg_attr(feature = "backend", derive(Queryable, Selectable))]
#[cfg_attr(feature = "backend", diesel(table_name = ingredients))]
pub struct Ingredient {
    name: String,
    category: String,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Ingredient {
    #[wasm_bindgen(constructor)]
    pub fn new(name: String, category: String) -> Ingredient {
        Ingredient { name, category }
    }

    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn category(&self) -> String {
        self.category.clone()
    }
}
