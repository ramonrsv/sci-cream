//! WASM compatible wrappers for [`crate::database`] functions and [`IngredientDatabase`] methods.

use wasm_bindgen::prelude::*;

use crate::{
    database::{IngredientDatabase, OnConflict},
    ingredient::Category,
    resolution::IngredientGetter,
    specs::SpecEntry,
    wasm::{Ingredient, error::JsResult},
};

#[cfg(doc)]
use crate::error::Error;

/// Helper function to convert an array of `JsValue`s into a vector of [`SpecEntry`]s
fn specs_from_jsvalues(specs: &[JsValue]) -> JsResult<Vec<SpecEntry>> {
    specs
        .iter()
        .map(|spec| serde_wasm_bindgen::from_value::<SpecEntry>(spec.clone()).map_err(Into::into))
        .collect::<JsResult<_>>()
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
    pub fn get_all_ingredients_wasm(&self) -> Vec<Ingredient> {
        self.get_all_ingredients().into_iter().map(Into::into).collect()
    }

    /// WASM compatible wrapper for [`IngredientDatabase::get_ingredients_by_category`]
    #[wasm_bindgen(js_name = "get_ingredients_by_category")]
    pub fn get_ingredients_by_category_wasm(&self, category: Category) -> Vec<Ingredient> {
        self.get_ingredients_by_category(category)
            .into_iter()
            .map(Into::into)
            .collect()
    }

    /// WASM compatible wrapper for [`IngredientDatabase::clear`]
    #[wasm_bindgen(js_name = "clear")]
    pub fn clear_wasm(&self) {
        self.clear();
    }

    /// WASM compatible wrapper for [`IngredientDatabase::seed`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed`]; see for more details.
    #[wasm_bindgen(js_name = "seed")]
    #[allow(clippy::needless_pass_by_value)]
    pub fn seed_wasm(&self, ingredients: Box<[Ingredient]>, on_conflict: OnConflict) -> JsResult<()> {
        self.seed(&ingredients.into_iter().map(Into::into).collect::<Vec<_>>(), on_conflict)
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
    pub fn seed_from_specs_wasm(&self, specs: Box<[JsValue]>, on_conflict: OnConflict) -> JsResult<()> {
        self.seed_from_specs(&specs_from_jsvalues(&specs)?, on_conflict)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`IngredientDatabase::seed_from_embedded_data`]
    ///
    /// This function requires the `data` feature to be enabled.
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_embedded_data`]; see that
    /// method for more details.
    #[cfg(feature = "data")]
    #[wasm_bindgen(js_name = "seed_from_embedded_data")]
    pub fn seed_from_embedded_data_wasm(&self, on_conflict: OnConflict) -> JsResult<()> {
        self.seed_from_embedded_data(on_conflict).map_err(Into::into)
    }

    /// WASM compatible wrapper for [`IngredientDatabase::get_ingredient_by_name`]
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if no ingredient with the name is found.
    #[wasm_bindgen(js_name = "get_ingredient_by_name")]
    pub fn get_ingredient_by_name_wasm(&self, name: &str) -> JsResult<Ingredient> {
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
pub fn new_ingredient_database_seeded(ingredients: Box<[Ingredient]>) -> JsResult<IngredientDatabase> {
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
pub fn new_ingredient_database_seeded_from_specs(specs: Box<[JsValue]>) -> JsResult<IngredientDatabase> {
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

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::wasm::ingredient::tests::{SUCROSE_ING, WHOLE_MILK_ING};

    use super::*;
    use crate::ingredient::Category;

    #[test]
    fn new_wasm_creates_empty_db() {
        let db = IngredientDatabase::new_wasm();
        assert_true!(db.get_all_ingredients_wasm().is_empty());
    }

    #[test]
    fn has_ingredient_wasm_delegates() {
        let db = IngredientDatabase::new_wasm();
        assert_false!(db.has_ingredient_wasm("Whole Milk"));

        db.seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject)
            .unwrap();
        assert_true!(db.has_ingredient_wasm("Whole Milk"));
    }

    #[test]
    fn get_all_ingredients_wasm_returns_wasm_types() {
        let db = IngredientDatabase::new_wasm();
        db.seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject)
            .unwrap();

        let ingredients = db.get_all_ingredients_wasm();
        assert_eq!(ingredients.len(), 1);
        assert_eq!(ingredients[0], *WHOLE_MILK_ING);
    }

    #[test]
    fn get_ingredients_by_category_wasm_filters_by_category() {
        let db = IngredientDatabase::new_wasm();
        let dairy = WHOLE_MILK_ING.clone();
        let sweetener = SUCROSE_ING.clone();
        db.seed_wasm(Box::new([dairy, sweetener]), OnConflict::Reject).unwrap();

        let dairy_results = db.get_ingredients_by_category_wasm(Category::Dairy);
        assert_eq!(dairy_results.len(), 1);
        assert_eq!(dairy_results[0], *WHOLE_MILK_ING);

        let sweetener_results = db.get_ingredients_by_category_wasm(Category::Sweetener);
        assert_eq!(sweetener_results.len(), 1);
        assert_eq!(sweetener_results[0], *SUCROSE_ING);
    }

    #[test]
    fn seed_wasm_adds_ingredients() {
        let db = IngredientDatabase::new_wasm();

        let result = db.seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject);
        assert_true!(result.is_ok());
        assert_eq!(db.get_all_ingredients_wasm().len(), 1);
    }

    #[test]
    fn get_ingredient_by_name_wasm_found() {
        let db = IngredientDatabase::new_wasm();
        db.seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject)
            .unwrap();

        let result = db.get_ingredient_by_name_wasm("Whole Milk");
        assert_true!(result.is_ok());
        assert_eq!(result.unwrap().name, "Whole Milk");
    }

    #[test]
    fn new_ingredient_database_seeded_creates_populated_db() {
        let result = new_ingredient_database_seeded(Box::new([WHOLE_MILK_ING.clone()]));
        assert_true!(result.is_ok());
        assert_eq!(result.unwrap().get_all_ingredients_wasm().len(), 1);
    }

    #[test]
    fn new_ingredient_database_seeded_from_embedded_data_is_non_empty() {
        let db = new_ingredient_database_seeded_from_embedded_data();
        assert_false!(db.get_all_ingredients_wasm().is_empty());
    }
}
