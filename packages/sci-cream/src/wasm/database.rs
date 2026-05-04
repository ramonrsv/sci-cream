//! WASM compatible wrappers for [`crate::database`] functions and [`IngredientDatabase`] methods.

use wasm_bindgen::prelude::*;

use crate::{
    database::IngredientDatabase, ingredient::Category, resolution::IngredientGetter, specs::SpecEntry,
    wasm::Ingredient as WasmIngredient,
};

#[cfg(doc)]
use crate::error::Error;

/// Helper function to convert an array of `JsValue`s into a vector of [`SpecEntry`]s
fn specs_from_jsvalues(specs: &[JsValue]) -> Result<Vec<SpecEntry>, JsValue> {
    specs
        .iter()
        .map(|spec| serde_wasm_bindgen::from_value::<SpecEntry>(spec.clone()).map_err(Into::into))
        .collect::<Result<_, JsValue>>()
}

#[wasm_bindgen]
impl IngredientDatabase {
    /// WASM compatible wrapper for [`IngredientDatabase::new`]
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }

    /// WASM compatible wrapper for [`IngredientDatabase::has_ingredient`]
    #[wasm_bindgen(js_name = "has_ingredient")]
    pub fn has_ingredient_wasm(&self, name: &str) -> bool {
        self.has_ingredient(name)
    }

    /// WASM compatible wrapper for [`IngredientDatabase::get_all_ingredients`]
    #[wasm_bindgen(js_name = "get_all_ingredients")]
    pub fn get_all_ingredients_wasm(&self) -> Vec<WasmIngredient> {
        self.get_all_ingredients().into_iter().map(Into::into).collect()
    }

    /// WASM compatible wrapper for [`IngredientDatabase::get_ingredients_by_category`]
    #[wasm_bindgen(js_name = "get_ingredients_by_category")]
    pub fn get_ingredients_by_category_wasm(&self, category: Category) -> Vec<WasmIngredient> {
        self.get_ingredients_by_category(category)
            .into_iter()
            .map(Into::into)
            .collect()
    }

    /// WASM compatible wrapper for [`IngredientDatabase::seed`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed`]; see for more details.
    #[wasm_bindgen(js_name = "seed")]
    #[allow(clippy::needless_pass_by_value)]
    pub fn seed_wasm(&self, ingredients: Box<[WasmIngredient]>) -> Result<(), JsValue> {
        self.seed(&ingredients.into_iter().map(Into::into).collect::<Vec<_>>())
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`IngredientDatabase::seed_from_specs`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_specs`]; see that method for
    /// more details. It may also return a `serde::Error` if the provided JS values cannot be
    /// deserialized into [`SpecEntry`]s.
    #[wasm_bindgen(js_name = "seed_from_specs")]
    #[allow(clippy::needless_pass_by_value)]
    pub fn seed_from_specs_wasm(&self, specs: Box<[JsValue]>) -> Result<(), JsValue> {
        self.seed_from_specs(&specs_from_jsvalues(&specs)?).map_err(Into::into)
    }

    /// WASM compatible wrapper for [`IngredientDatabase::get_ingredient_by_name`]
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if no ingredient with the name is found.
    #[wasm_bindgen(js_name = "get_ingredient_by_name")]
    pub fn get_ingredient_by_name_wasm(&self, name: &str) -> Result<WasmIngredient, JsValue> {
        self.get_ingredient_by_name(name).map(Into::into).map_err(Into::into)
    }
}

/// WASM compatible builder forwarding to [`IngredientDatabase::new_seeded`].
///
/// # Errors
///
/// It forwards any errors from [`IngredientDatabase::new_seeded`]; see for more details.
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn new_ingredient_database_seeded(ingredients: Box<[WasmIngredient]>) -> Result<IngredientDatabase, JsValue> {
    IngredientDatabase::new_seeded(&ingredients.into_iter().map(Into::into).collect::<Vec<_>>()).map_err(Into::into)
}

/// WASM compatible builder forwarding to [`IngredientDatabase::new_seeded_from_specs`].
///
/// # Errors
///
/// It forwards any errors from [`IngredientDatabase::new_seeded_from_specs`]; see that method
/// for more details. It may also return a `serde::Error` if the provided JS values cannot be
/// deserialized into [`SpecEntry`]s.
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn new_ingredient_database_seeded_from_specs(specs: Box<[JsValue]>) -> Result<IngredientDatabase, JsValue> {
    IngredientDatabase::new_seeded_from_specs(&specs_from_jsvalues(&specs)?).map_err(Into::into)
}

/// WASM compatible builder forwarding to [`IngredientDatabase::new_seeded_from_embedded_data`].
///
/// This function requires the `data` feature to be enabled.
#[cfg(feature = "data")]
#[wasm_bindgen]
#[must_use]
pub fn new_ingredient_database_seeded_from_embedded_data() -> IngredientDatabase {
    IngredientDatabase::new_seeded_from_embedded_data()
}
