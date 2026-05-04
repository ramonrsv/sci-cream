//! WASM compatible alternative [`Recipe`](RustRecipe) that uses a newtype [`Ingredient`]
//!
//! The WASM compatible interface supports interacting directly with a [`Recipe`] for niche use
//! cases that build their own [`Ingredient`]s and [`Recipe`]s, instead of going through the
//! higher-level [`Bridge`] interface, perhaps for performance reasons.

use wasm_bindgen::prelude::*;

use crate::{
    ingredient::Ingredient as RustIngredient,
    recipe::{OwnedLightRecipe, Recipe as RustRecipe},
    wasm::{Composition, Ingredient, MixProperties},
};

#[cfg(doc)]
use crate::{fpd::FPD, recipe::RecipeLine as RustRecipeLine, wasm::Bridge};

/// WASM compatible alternative [`RecipeLine`](RustRecipeLine) that uses a newtype [`Ingredient`]
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct RecipeLine {
    /// The ingredient used in this line of the recipe.
    #[wasm_bindgen(getter_with_clone)]
    pub ingredient: Ingredient,
    /// The amount of the ingredient used in this line of the recipe, in grams.
    pub amount: f64,
}

#[wasm_bindgen]
impl RecipeLine {
    /// Creates a new newtype [`RecipeLine`] with the given newtype [`Ingredient`] and amount.
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(ingredient: Ingredient, amount: f64) -> Self {
        Self { ingredient, amount }
    }
}

/// WASM compatible alternative [`Recipe`](RustRecipe) that uses a newtype [`RecipeLine`]
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Recipe {
    /// An optional name for the recipe.
    #[wasm_bindgen(getter_with_clone)]
    pub name: Option<String>,
    /// The lines of the recipe, each representing an ingredient and its amount.
    #[wasm_bindgen(getter_with_clone)]
    pub lines: Vec<RecipeLine>,
}

/// Create an [`OwnedLightRecipe`] from a JavaScript list of ingredient name and amount pairs.
///
/// # Errors
///
/// Returns a `serde::Error` if the input cannot be deserialized into an [`OwnedLightRecipe`].
pub fn light_recipe_from_jsvalue(recipe: JsValue) -> Result<OwnedLightRecipe, JsValue> {
    serde_wasm_bindgen::from_value::<OwnedLightRecipe>(recipe).map_err(Into::into)
}

#[wasm_bindgen]
impl Recipe {
    /// Creates a new [`Recipe`] with the optional given name and list of [`RecipeLine`]s.
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(name: Option<String>, lines: Vec<RecipeLine>) -> Self {
        Self { name, lines }
    }

    /// WASM compatible wrapper for
    /// [`Recipe::calculate_composition`](RustRecipe::calculate_composition)
    ///
    /// # Errors
    ///
    /// Forwards any errors from
    /// [`Composition::from_combination`](crate::composition::Composition::from_combination) if the
    /// recipe is not valid, e.g. if any ingredient has a negative amount.
    #[wasm_bindgen(js_name = "calculate_composition")]
    pub fn calculate_composition_wasm(&self) -> Result<Composition, JsValue> {
        RustRecipe::from(self.clone())
            .calculate_composition()
            .map(Into::into)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for
    /// [`Recipe::calculate_mix_properties`](RustRecipe::calculate_mix_properties)
    ///
    /// # Errors
    ///
    /// Forwards any errors from [`FPD::compute_from_composition`] if FPD calculations fail.
    #[wasm_bindgen(js_name = "calculate_mix_properties")]
    pub fn calculate_mix_properties_wasm(&self) -> Result<MixProperties, JsValue> {
        RustRecipe::from(self.clone())
            .calculate_mix_properties()
            .map(Into::into)
            .map_err(Into::into)
    }
}

impl From<RustRecipe> for Recipe {
    fn from(rust_recipe: RustRecipe) -> Self {
        Self {
            name: rust_recipe.name,
            lines: rust_recipe
                .lines
                .into_iter()
                .map(|line| RecipeLine {
                    ingredient: Ingredient::from(line.ingredient),
                    amount: line.amount,
                })
                .collect(),
        }
    }
}

impl From<Recipe> for RustRecipe {
    fn from(recipe: Recipe) -> Self {
        Self {
            name: recipe.name,
            lines: recipe
                .lines
                .into_iter()
                .map(|line| crate::recipe::RecipeLine {
                    ingredient: RustIngredient::from(line.ingredient),
                    amount: line.amount,
                })
                .collect(),
        }
    }
}
