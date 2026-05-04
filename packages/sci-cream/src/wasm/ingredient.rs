//! WASM compatible alternative [`Ingredient`](RustIngredient) that uses a newtype [`Composition`]
//!
//! This struct includes `wasm_bindgen` support while still allowing downstream direct access to the
//! [`name`](Ingredient::name), [`category`](Ingredient::category), and
//! [`composition`](Ingredient::composition) fields. Also includes a helper function
//! [`into_ingredient_from_spec`] to convert an [`IngredientSpec`] JS value into an [`Ingredient`]
//! instance, since [`IngredientSpec`] cannot be directly supported by `wasm_bindgen`.

use wasm_bindgen::prelude::*;

use crate::{
    composition::Composition as RustComposition,
    ingredient::{Category, Ingredient as RustIngredient, IntoIngredient},
    specs::IngredientSpec,
    wasm::composition::Composition,
};

#[cfg(doc)]
use crate::error::Error;

/// WASM compatible alternative [`Ingredient`](RustIngredient) that uses a newtype [`Composition`]
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Ingredient {
    /// The name of the ingredient, usually required to be unique, e.g. "Whole Milk", "Sucrose"
    #[wasm_bindgen(getter_with_clone)]
    pub name: String,
    /// The category of the ingredient, e.g. [`Category::Dairy`], [`Category::Sweetener`], etc.
    pub category: Category,
    /// The [`Composition`] of the ingredient, holding its properties and data used in calculations
    pub composition: Composition,
}

#[wasm_bindgen]
impl Ingredient {
    /// Creates a new [`Ingredient`] instance with the given name, category, and composition
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new(name: String, category: Category, composition: Composition) -> Self {
        Self {
            name,
            category,
            composition,
        }
    }

    /// Clones the `Ingredient` instance, useful when handling WASM objects in JavaScript.
    ///
    /// **Note**: This can be very inefficient depending on the use case, so use with caution.
    /// Consider using [`Bridge`](crate::wasm::Bridge) patterns to avoid excessive cloning.
    #[wasm_bindgen(js_name = "clone")]
    #[must_use]
    pub fn clone_wasm(&self) -> Self {
        self.clone()
    }
}

/// Converts an [`IngredientSpec`] JS value into an [`Ingredient`] instance
///
/// Enum variants with associated data are not supported by [`mod@wasm_bindgen`], so we cannot
/// support [`IngredientSpec`] directly. Instead, we have to construct it from a JS value via
/// [`serde_wasm_bindgen`], and then convert it via [`IngredientSpec::into_ingredient`].
///
/// # Errors
///
/// Returns a `serde::Error` if the input JS value cannot be deserialized into an
/// [`IngredientSpec`], or an [`Error`] if the resulting [`IngredientSpec`] fails to convert
/// into an [`Ingredient`], likely due to invalid values, e.g. negative percentages, etc.
#[wasm_bindgen]
pub fn into_ingredient_from_spec(spec: JsValue) -> Result<Ingredient, JsValue> {
    serde_wasm_bindgen::from_value::<IngredientSpec>(spec)?
        .into_ingredient()
        .map(Ingredient::from)
        .map_err(Into::into)
}

impl From<RustIngredient> for Ingredient {
    fn from(rust_ing: RustIngredient) -> Self {
        Self {
            name: rust_ing.name,
            category: rust_ing.category,
            composition: Composition::from(rust_ing.composition),
        }
    }
}

impl From<Ingredient> for RustIngredient {
    fn from(ing: Ingredient) -> Self {
        Self {
            name: ing.name,
            category: ing.category,
            composition: RustComposition::from(ing.composition),
        }
    }
}
