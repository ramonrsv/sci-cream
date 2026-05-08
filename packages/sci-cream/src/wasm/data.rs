//! WASM compatible wrappers for [`crate::data`] functions and trait methods.

use serde::ser::Serialize;
use serde_wasm_bindgen::Serializer;

use wasm_bindgen::prelude::*;

use crate::{
    data::{
        RecipeEntry, get_all_independent_ingredient_specs, get_all_recipe_entries, get_all_recipe_entry_ids,
        get_all_spec_entries, get_independent_ingredient_spec_by_name, get_spec_entry_by_name,
    },
    specs::{IngredientSpec, SpecEntry},
    wasm::JsResult,
};

#[cfg(doc)]
use crate::error::Error;

fn serialize_spec_entry(spec: &SpecEntry) -> JsValue {
    spec.serialize(&Serializer::json_compatible())
        .expect("SpecEntry should be serializable to JSON-compatible JS value")
}

fn serialize_ingredient_spec(spec: &IngredientSpec) -> JsValue {
    spec.serialize(&Serializer::json_compatible())
        .expect("IngredientSpec should be serializable to JSON-compatible JS value")
}

fn serialize_recipe_entry(recipe: &RecipeEntry) -> JsValue {
    recipe
        .serialize(&Serializer::json_compatible())
        .expect("RecipeEntry should be serializable to JSON-compatible JS value")
}

/// WASM compatible wrapper for [`get_all_spec_entries`]
#[wasm_bindgen(js_name = "get_all_spec_entries")]
pub fn get_all_spec_entries_wasm() -> Vec<JsValue> {
    get_all_spec_entries().iter().map(serialize_spec_entry).collect()
}

/// WASM compatible wrapper for [`get_spec_entry_by_name`]
///
/// # Errors
///
/// Returns an [`Error::IngredientNotFound`] if no ingredient with the specified name exists.
#[wasm_bindgen(js_name = "get_spec_entry_by_name")]
pub fn get_spec_entry_by_name_wasm(name: &str) -> JsResult<JsValue> {
    Ok(serialize_spec_entry(&get_spec_entry_by_name(name).map_err::<JsValue, _>(Into::into)?))
}

/// WASM compatible wrapper for [`get_all_independent_ingredient_specs`]
#[wasm_bindgen(js_name = "get_all_independent_ingredient_specs")]
pub fn get_all_independent_ingredient_specs_wasm() -> Vec<JsValue> {
    get_all_independent_ingredient_specs()
        .iter()
        .map(serialize_ingredient_spec)
        .collect()
}

/// WASM compatible wrapper for [`get_independent_ingredient_spec_by_name`]
///
/// # Errors
///
/// Returns an [`Error::IngredientNotFound`] if no ingredient with the specified name exists.
#[wasm_bindgen(js_name = "get_independent_ingredient_spec_by_name")]
pub fn get_independent_ingredient_spec_by_name_wasm(name: &str) -> JsResult<JsValue> {
    Ok(serialize_ingredient_spec(
        &get_independent_ingredient_spec_by_name(name).map_err::<JsValue, _>(Into::into)?,
    ))
}

/// WASM compatible wrapper for [`get_all_recipe_entry_ids`]
#[wasm_bindgen(js_name = "get_all_recipe_entry_ids")]
#[must_use]
pub fn get_all_recipe_entry_ids_wasm() -> Vec<String> {
    get_all_recipe_entry_ids()
}

/// WASM compatible wrapper for [`get_all_recipe_entries`]
#[wasm_bindgen(js_name = "get_all_recipe_entries")]
pub fn get_all_recipe_entries_wasm() -> Vec<JsValue> {
    get_all_recipe_entries().iter().map(serialize_recipe_entry).collect()
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused)]
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn get_all_recipe_entry_ids_wasm_matches_non_wasm() {
        let mut wasm_ids = get_all_recipe_entry_ids_wasm();
        let mut non_wasm_ids = get_all_recipe_entry_ids();
        wasm_ids.sort();
        non_wasm_ids.sort();
        assert_eq!(wasm_ids, non_wasm_ids);
    }
}
