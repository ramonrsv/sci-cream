//! WASM compatible alternative [`Recipe`](RustRecipe) that uses a newtype [`Ingredient`]
//!
//! The WASM compatible interface supports interacting directly with a [`Recipe`] for niche use
//! cases that build their own [`Ingredient`]s and [`Recipe`]s, instead of going through the
//! higher-level [`Bridge`] interface, perhaps for performance reasons.

use wasm_bindgen::prelude::*;

use crate::{
    balancing::{BalanceKey, Priority, validate_balancing_targets},
    composition::Composition as RustComposition,
    ingredient::Ingredient as RustIngredient,
    recipe::{Lock, OwnedLightRecipe, Recipe as RustRecipe, resolve_line_locks},
    wasm::{Composition, Ingredient, JsResult, MixProperties},
};

#[cfg(doc)]
use crate::{
    composition::{CompKey, RatioKey},
    error::Error,
    fpd::FPD,
    recipe::RecipeLine as RustRecipeLine,
    wasm::Bridge,
};

/// WASM compatible alternative [`RecipeLine`](RustRecipeLine) that uses a newtype [`Ingredient`]
#[wasm_bindgen]
#[derive(PartialEq, Clone, Debug)]
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
#[derive(PartialEq, Clone, Debug)]
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
pub fn light_recipe_from_jsvalue(recipe: JsValue) -> JsResult<OwnedLightRecipe> {
    serde_wasm_bindgen::from_value::<OwnedLightRecipe>(recipe).map_err(Into::into)
}

/// Create a list of balancing targets from a JavaScript list of key name and target value pairs.
///
/// Each target is a flat `[name, value]` pair, where `name` is a [`CompKey`] or [`RatioKey`].
///
/// # Errors
///
/// Returns a `serde::Error` if the input cannot be deserialized into a `Vec<(BalanceKey, f64)>`.
pub fn balancing_targets_from_jsvalue(targets: JsValue) -> JsResult<Vec<(BalanceKey, f64)>> {
    serde_wasm_bindgen::from_value::<Vec<(BalanceKey, f64)>>(targets).map_err(Into::into)
}

/// Create a list of balancing priorities from a JavaScript list of key and priority pairs.
///
/// Each priority is a flat `[name, level]` pair, where `name` is a [`CompKey`] or [`RatioKey`]
/// and `level` is a [`Priority`] variant name, e.g. `"Critical"`.
///
/// # Errors
///
/// Returns a `serde::Error` if the input cannot be deserialized into `Vec<(BalanceKey, Priority)>`.
pub fn balancing_priorities_from_jsvalue(priorities: JsValue) -> JsResult<Vec<(BalanceKey, Priority)>> {
    serde_wasm_bindgen::from_value::<Vec<(BalanceKey, Priority)>>(priorities).map_err(Into::into)
}

/// Create the per-line balancing locks from a JavaScript array of `[lineIndex, Lock]` pairs.
///
/// Each pair pins a recipe line by index per its [`Lock`] during balancing (see
/// [`Recipe::balance`](RustRecipe::balance)).
///
/// # Errors
///
/// Returns a `serde::Error` if the input cannot be deserialized into a `Vec<(usize, Lock)>`.
pub fn balancing_locks_from_jsvalue(locked: JsValue) -> JsResult<Vec<(usize, Lock)>> {
    serde_wasm_bindgen::from_value::<Vec<(usize, Lock)>>(locked).map_err(Into::into)
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
    pub fn calculate_composition_wasm(&self) -> JsResult<Composition> {
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
    pub fn calculate_mix_properties_wasm(&self) -> JsResult<MixProperties> {
        RustRecipe::from(self.clone())
            .calculate_mix_properties()
            .map(Into::into)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`Recipe::balance`](RustRecipe::balance)
    ///
    /// `locked` is an optional array of `[lineIndex, Lock]` pairs pinning lines during balancing.
    ///
    /// # Errors
    ///
    /// Returns a `serde::Error` if the `JsValue` inputs cannot be deserialized into a
    /// `(BalanceKey, f64)[]`, `(BalanceKey, Priority)[]`, or `[usize, Lock][]`. Forwards any errors
    /// from internal balancing calculations; see [`Recipe::balance`](RustRecipe::balance).
    #[wasm_bindgen(js_name = "balance")]
    pub fn balance_wasm(
        &self,
        targets: Box<[JsValue]>,
        priorities: Box<[JsValue]>,
        total_amount: Option<f64>,
        locked: Option<Box<[JsValue]>>,
    ) -> JsResult<Self> {
        let targets = balancing_targets_from_jsvalue(JsValue::from(targets))?;
        let priorities = balancing_priorities_from_jsvalue(JsValue::from(priorities))?;
        let locked = locked
            .map(|l| balancing_locks_from_jsvalue(JsValue::from(l)))
            .transpose()?;

        RustRecipe::from(self.clone())
            .balance(&targets, &priorities, total_amount, locked.as_deref().unwrap_or(&[]))
            .map(Into::into)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`validate_balancing_targets`]
    ///
    /// Validates `targets` and `priorities` against the compositions of this recipe's ingredients,
    /// returning a serialized [`BalancingReport`](crate::balancing::BalancingReport). Never errors
    /// on the validation itself — all issues (errors and warnings) are reported in the returned
    /// object's `issues` array. `locked` is an optional array of `[lineIndex, Lock]` pairs marking
    /// the lines held fixed; omit it (or pass `null`) to lock nothing.
    ///
    /// # Errors
    ///
    /// Returns a `serde::Error` if the `JsValue` inputs cannot be deserialized into a
    /// `(BalanceKey, f64)[]`, `(BalanceKey, Priority)[]`, or `[usize, Lock][]`, or if the result
    /// cannot be serialized. Also errors on an out-of-range or duplicated lock index.
    #[wasm_bindgen(js_name = "validate_targets")]
    pub fn validate_targets_wasm(
        &self,
        targets: Box<[JsValue]>,
        priorities: Box<[JsValue]>,
        rel_tol: Option<f64>,
        locked: Option<Box<[JsValue]>>,
    ) -> JsResult<JsValue> {
        let targets = balancing_targets_from_jsvalue(JsValue::from(targets))?;
        let priorities = balancing_priorities_from_jsvalue(JsValue::from(priorities))?;
        let locked = locked
            .map(|l| balancing_locks_from_jsvalue(JsValue::from(l)))
            .transpose()?
            .unwrap_or_default();

        // Validation has no `total_amount`, so a `Lock::Amount` resolves against the current total.
        let total: f64 = self.lines.iter().map(|l| l.amount).sum();
        let lock_fractions = resolve_line_locks(self.lines.len(), total, &locked)?;

        let comps: Vec<(RustComposition, Option<f64>)> = self
            .lines
            .iter()
            .zip(&lock_fractions)
            .map(|(line, &lock)| (line.ingredient.composition.into(), lock))
            .collect();

        serde_wasm_bindgen::to_value(&validate_balancing_targets(&comps, &targets, &priorities, rel_tol, None))
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
        // The WASM `Recipe` wrapper does not (yet) carry evaporation, so it maps to zero here.
        // The evaporation-aware bridge methods drive the native `Recipe` directly.
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
            evaporation: 0.0,
        }
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::wasm::ingredient::tests::WHOLE_MILK_ING;

    use super::*;
    use crate::composition::CompKey;

    static TEST_RECIPE: LazyLock<Recipe> = LazyLock::new(|| {
        Recipe::new(Some("Test Recipe".to_string()), vec![RecipeLine::new(WHOLE_MILK_ING.clone(), 100.0)])
    });

    #[test]
    fn recipe_line_new_sets_fields() {
        let line = RecipeLine::new(WHOLE_MILK_ING.clone(), 250.0);
        assert_eq!(line.ingredient, *WHOLE_MILK_ING);
        assert_eq_flt_test!(line.amount, 250.0);
    }

    #[test]
    fn recipe_new_sets_fields() {
        let recipe = TEST_RECIPE.clone();
        assert_eq!(recipe.name, Some("Test Recipe".to_string()));
        assert_eq!(recipe.lines.len(), 1);
        assert_eq!(recipe.lines[0].ingredient, *WHOLE_MILK_ING);
        assert_eq_flt_test!(recipe.lines[0].amount, 100.0);
    }

    #[test]
    fn calculate_composition_wasm_returns_composition() {
        let result = TEST_RECIPE.calculate_composition_wasm();
        assert_true!(result.is_ok());
        assert_eq_flt_test!(result.unwrap().get(CompKey::Water), 100.0);
    }

    #[test]
    fn calculate_mix_properties_wasm_returns_mix_properties() {
        let result = TEST_RECIPE.calculate_mix_properties_wasm();
        assert_true!(result.is_ok());
        assert_eq_flt_test!(result.unwrap().total_amount, 100.0);
    }

    #[test]
    fn from_rust_recipe_preserves_fields() {
        let rust_recipe = RustRecipe::from(TEST_RECIPE.clone());
        let wasm_recipe = Recipe::from(rust_recipe);
        assert_eq!(wasm_recipe.name, TEST_RECIPE.name);
        assert_eq!(wasm_recipe.lines.len(), TEST_RECIPE.lines.len());
        assert_eq!(wasm_recipe.lines[0].ingredient, TEST_RECIPE.lines[0].ingredient);
        assert_eq_flt_test!(wasm_recipe.lines[0].amount, TEST_RECIPE.lines[0].amount);
    }

    #[test]
    fn from_recipe_into_rust_recipe_round_trips() {
        let rust = RustRecipe::from(TEST_RECIPE.clone());
        let back = Recipe::from(rust);
        assert_eq!(back, TEST_RECIPE.clone());
    }
}
