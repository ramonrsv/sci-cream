//! WASM [`Bridge`] to facilitate performant JS <-> WASM communication for recipe calculations

use wasm_bindgen::prelude::*;

use crate::{
    balancing::{BalanceKey, BalancingReport, Priority, validate_balancing_targets},
    composition::Composition as RustComposition,
    database::{IngredientDatabase, OnConflict},
    error::Result,
    ingredient::{Category, Ingredient as RustIngredient, ResolveIntoIngredient},
    properties::MixProperties as RustMixProperties,
    recipe::{LightRecipe, Lock, OwnedLightRecipe, Recipe as RustRecipe, resolve_line_locks},
    resolution::IngredientGetter,
    specs::entry::SpecEntry,
    wasm::{
        BalancingReportView, Composition, Ingredient, JsResult, MixProperties, balancing_locks_from_jsvalue,
        balancing_targets_from_jsvalue, light_recipe_from_jsvalue, spec_entry_from_jsvalue,
    },
};

#[cfg(doc)]
use crate::{balancing::BalancingIssue, error::Error, wasm::balancing::BalancingIssueView};

/// WASM Bridge for calculating recipe compositions and mix properties
///
/// This struct serves as a bridge between WASM and the Rust backend, attempting to keep as much of
/// the on-memory data structures and operations on the WASM side to minimize the performance
/// overhead of JS <-> WASM bridging. It holds an in-memory ingredient database for looking up
/// ingredient definitions by name, and provides methods for calculating recipe compositions and mix
/// properties from "light" recipe representations (tuples of ingredient names and amounts).
///
/// **Note**: Because it is currently not possible to return references to internal members within
/// the WASM and JS environment, this class replicates many of the interfaces of
/// [`Recipe`](RustRecipe) and [`IngredientDatabase`], forwarding to the corresponding methods in
/// internal members.
///
/// **Note**: This struct purposely uses [`crate::recipe::Recipe`] instead of
/// [`crate::wasm::recipe::Recipe`] to avoid an unnecessary [`crate::wasm`] dependency for internals
/// that are not user-facing, in line with the crate's WASM interoperability design principles.
#[wasm_bindgen]
#[derive(Debug)]
pub struct Bridge {
    db: IngredientDatabase,
}

impl Bridge {
    /// Creates a new [`Bridge`] with the given [`IngredientDatabase`].
    ///
    /// The database can be pre-seeded with any of the available methods on [`IngredientDatabase`]
    /// (e.g. [`new_seeded_from_specs`](IngredientDatabase::new_seeded_from_specs)).
    pub const fn new(db: IngredientDatabase) -> Self {
        Self { db }
    }

    /// Forwards to [`IngredientDatabase::has_ingredient`] of the internal database
    pub fn has_ingredient(&self, name: &str) -> bool {
        self.db.has_ingredient(name)
    }

    /// Forwards to [`IngredientDatabase::get_all_ingredients`] of the internal database
    pub fn get_all_ingredients(&self) -> Vec<RustIngredient> {
        self.db.get_all_ingredients()
    }

    /// Forwards to [`IngredientDatabase::get_ingredients_by_category`] of the internal database
    pub fn get_ingredients_by_category(&self, category: Category) -> Vec<RustIngredient> {
        self.db.get_ingredients_by_category(category)
    }

    /// Forwards to [`Recipe::calculate_composition`](RustRecipe::calculate_composition), creating a
    /// [`Recipe`](RustRecipe) from [`LightRecipe`]
    ///
    /// # Errors
    ///
    /// When converting the [`LightRecipe`] into a full [`Recipe`](RustRecipe) via
    /// [`Recipe::from_light_recipe`](RustRecipe::from_light_recipe), it returns an
    /// [`Error::IngredientNotFound`] if any ingredient name in the [`LightRecipe`] is not found in
    /// the provided [`IngredientDatabase`]. It also forwards any errors from
    /// [`Recipe::calculate_composition`](RustRecipe::calculate_composition) if composition
    /// calculations fail.
    ///
    /// `evaporation` is the grams of water evaporated during preparation (`None` or `0.0` for
    /// none); the returned composition is that of the final, post-evaporation mix.
    pub fn calculate_recipe_composition(
        &self,
        recipe: &LightRecipe,
        evaporation: Option<f64>,
    ) -> Result<RustComposition> {
        RustRecipe::from_light_recipe(None, recipe, &self.db)?
            .with_evaporation(evaporation.unwrap_or(0.0))
            .calculate_composition()
    }

    /// Forwards to [`Recipe::calculate_mix_properties`](RustRecipe::calculate_mix_properties),
    /// creating a [`Recipe`](RustRecipe) from [`LightRecipe`]
    ///
    /// # Errors
    ///
    /// When converting the [`LightRecipe`] into a full [`Recipe`](RustRecipe) via
    /// [`Recipe::from_light_recipe`](RustRecipe::from_light_recipe), it returns an
    /// [`Error::IngredientNotFound`] if any ingredient name in the [`LightRecipe`] is not found in
    /// the provided [`IngredientDatabase`]. It also forwards any errors from
    /// [`Recipe::calculate_mix_properties`](RustRecipe::calculate_mix_properties) if FPD
    /// calculations fail.
    ///
    /// `evaporation` is the grams of water evaporated during preparation (`None` or `0` for none);
    /// the `total_amount` is the final mix mass and the composition/FPD are post-evaporation.
    pub fn calculate_recipe_mix_properties(
        &self,
        recipe: &LightRecipe,
        evaporation: Option<f64>,
    ) -> Result<RustMixProperties> {
        RustRecipe::from_light_recipe(None, recipe, &self.db)?
            .with_evaporation(evaporation.unwrap_or(0.0))
            .calculate_mix_properties()
    }

    /// Forwards to [`Recipe::balance`](RustRecipe::balance), creating a [`Recipe`](RustRecipe) from
    /// [`LightRecipe`] and returning an [`OwnedLightRecipe`]
    ///
    /// `total_amount` sets the total mass, in grams, of the balanced recipe; if `None`, the
    /// recipe's current total is used, keeping it constant. `locked` is a list of `(lineIdx, Lock)`
    /// pairs pinning lines while the rest balance around them; an empty slice locks nothing.
    ///
    /// `evaporation` is the grams of water evaporated during preparation (`None` or `0.0` for
    /// none); balancing then targets the post-evaporation mix (see
    /// [`Recipe::balance`](RustRecipe::balance)) and the returned amounts are pre-evaporation.
    ///
    /// # Errors
    ///
    /// When converting the [`LightRecipe`] into a full [`Recipe`](RustRecipe) via
    /// [`Recipe::from_light_recipe`](RustRecipe::from_light_recipe), it returns an
    /// [`Error::IngredientNotFound`] if any ingredient name in the [`LightRecipe`] is not found in
    /// the provided [`IngredientDatabase`]. It also forwards any errors from
    /// [`Recipe::balance`](RustRecipe::balance) if balancing calculations fail.
    pub fn balance_recipe(
        &self,
        recipe: &LightRecipe,
        targets: &[(BalanceKey, f64, Option<Priority>)],
        total_amount: Option<f64>,
        locked: &[(usize, Lock)],
        evaporation: Option<f64>,
    ) -> Result<OwnedLightRecipe> {
        RustRecipe::from_light_recipe(None, recipe, &self.db)?
            .with_evaporation(evaporation.unwrap_or(0.0))
            .balance(targets, total_amount, locked)
            .map(Into::into)
    }

    /// Forwards to [`Recipe::deevaporate`](RustRecipe::deevaporate), creating a
    /// [`Recipe`](RustRecipe) from `recipe` with the given `evaporation` (grams) and returning the
    /// de-evaporated recipe as an [`OwnedLightRecipe`] (which carries no evaporation).
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if any ingredient name in `recipe` is not in the
    /// DB, and forwards any errors from [`Recipe::deevaporate`](RustRecipe::deevaporate) (including
    /// [`Error::InvalidEvaporation`] when `evaporation <= 0`).
    pub fn deevaporate_recipe(&self, recipe: &LightRecipe, evaporation: f64) -> Result<OwnedLightRecipe> {
        RustRecipe::from_light_recipe(None, recipe, &self.db)?
            .with_evaporation(evaporation)
            .deevaporate()
            .map(Into::into)
    }

    /// Validates balancing targets against the compositions derived from `recipe`.
    ///
    /// Extracts compositions from the resolved recipe lines, then forwards to
    /// [`validate_balancing_targets`]. `locked` is a list of `(lineIdx, Lock)` pairs marking the
    /// lines held fixed (a [`Lock::Amount`] resolves against the recipe's current total); empty is
    /// unlocked. `evaporation` is the grams of water evaporated during preparation (`None` or `0.0`
    /// for none). Never errors on validation — issues are reported in the [`BalancingReport`].
    ///
    /// # Errors
    ///
    /// Returns [`Error::IngredientNotFound`] if any ingredient name in `recipe` is not in the DB.
    /// Forwards any errors from [`Recipe::from_light_recipe`](RustRecipe::from_light_recipe), and
    /// [`Error::InvalidBalancingTargets`] for an out-of-range or duplicated lock index.
    pub fn validate_recipe_targets(
        &self,
        recipe: &LightRecipe,
        targets: &[(BalanceKey, f64, Option<Priority>)],
        rel_tol: Option<f64>,
        locked: &[(usize, Lock)],
        evaporation: Option<f64>,
    ) -> Result<BalancingReport> {
        let rust_recipe = RustRecipe::from_light_recipe(None, recipe, &self.db)?;
        let total: f64 = rust_recipe.line_total();
        let lock_fractions = resolve_line_locks(rust_recipe.lines.len(), total, locked)?;
        let comps: Vec<(RustComposition, Option<f64>)> = rust_recipe
            .lines
            .iter()
            .zip(&lock_fractions)
            .map(|(line, &lock)| (line.ingredient.composition, lock))
            .collect();

        // `validate_balancing_targets` takes evaporation as the fraction `E/T`. Zero grams is no
        // evaporation, filtered out before dividing so a zero-total recipe can't produce a `NaN`.
        let evap_fraction = evaporation.filter(|&grams| grams != 0.0).map(|grams| grams / total);

        Ok(validate_balancing_targets(&comps, targets, rel_tol, evap_fraction))
    }

    /// Forwards to [`IngredientDatabase::clear`], emptying the internal database.
    pub fn clear(&self) {
        self.db.clear();
    }

    /// Forwards to [`IngredientDatabase::seed`], seeding the db with the provided [`Ingredient`]s.
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed`]; see that method for more details.
    pub fn seed(&self, ingredients: &[RustIngredient], on_conflict: OnConflict) -> Result<()> {
        self.db.seed(ingredients, on_conflict)
    }

    /// Forwards to [`IngredientDatabase::seed_from_specs`], seeding with the [`SpecEntry`]s.
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_specs`]; see more details.
    pub fn seed_from_specs(&self, specs: &[SpecEntry], on_conflict: OnConflict) -> Result<()> {
        self.db.seed_from_specs(specs, on_conflict)
    }

    /// Forwards to [`IngredientDatabase::seed_from_embedded_data`], seeding the embedded specs.
    ///
    /// This function requires the `data` feature to be enabled.
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_embedded_data`]; see more
    /// details.
    #[cfg(feature = "data")]
    pub fn seed_from_embedded_data(&self, on_conflict: OnConflict) -> Result<()> {
        self.db.seed_from_embedded_data(on_conflict)
    }

    /// Resolves an ingredient from a [`SpecEntry`] using the internal database
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`SpecEntry::resolve_into_ingredient`]; see for more details.
    pub fn resolve_into_ingredient_from_spec(&self, spec: SpecEntry) -> Result<RustIngredient> {
        spec.resolve_into_ingredient(&self.db)
    }
}

#[wasm_bindgen]
impl Bridge {
    /// WASM compatible constructor forwarding to [`Bridge::new`]
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    pub fn new_wasm(db: IngredientDatabase) -> Self {
        Self { db }
    }

    /// WASM compatible wrapper for [`Bridge::has_ingredient`]
    #[wasm_bindgen(js_name = "has_ingredient")]
    pub fn has_ingredient_wasm(&self, name: &str) -> bool {
        self.has_ingredient(name)
    }

    /// WASM compatible wrapper for [`Bridge::get_all_ingredients`] that returns just the names,
    /// obviating the need for JS to `.free()` the returned WASMs if they only need the names.
    #[wasm_bindgen]
    pub fn get_all_ingredient_names(&self) -> Vec<String> {
        self.get_all_ingredients().into_iter().map(|ing| ing.name).collect()
    }

    /// WASM compatible wrapper for [`Bridge::get_all_ingredients`]
    #[wasm_bindgen(js_name = "get_all_ingredients")]
    pub fn get_all_ingredients_wasm(&self) -> Vec<Ingredient> {
        self.get_all_ingredients().into_iter().map(Into::into).collect()
    }

    /// WASM compatible wrapper for [`Bridge::get_ingredients_by_category`]
    #[wasm_bindgen(js_name = "get_ingredients_by_category")]
    pub fn get_ingredients_by_category_wasm(&self, category: Category) -> Vec<Ingredient> {
        self.get_ingredients_by_category(category)
            .into_iter()
            .map(Into::into)
            .collect()
    }

    /// WASM compatible wrapper for [`Bridge::get_ingredient_by_name`]
    ///
    /// Actually an independent wrapper that forwards to the internal database's WASM wrapper
    /// [`IngredientDatabase::get_ingredient_by_name_wasm`], but it's the same interface.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if no ingredient with the name is found.
    #[wasm_bindgen(js_name = "get_ingredient_by_name")]
    pub fn get_ingredient_by_name_wasm(&self, name: &str) -> JsResult<Ingredient> {
        self.db.get_ingredient_by_name_wasm(name)
    }

    /// WASM compatible wrapper for [`Bridge::calculate_recipe_composition`]
    ///
    /// # Errors
    ///
    /// Returns a `serde::Error` if the `JsValue` input cannot be deserialized into an
    /// [`OwnedLightRecipe`], and forwards any errors from the forwarded-to method. See
    /// [`Bridge::calculate_recipe_composition`] for more details on the forwarded errors.
    #[wasm_bindgen(js_name = "calculate_recipe_composition")]
    pub fn calculate_recipe_composition_wasm(
        &self,
        recipe: Box<[JsValue]>,
        evaporation: Option<f64>,
    ) -> JsResult<Composition> {
        let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
        self.calculate_recipe_composition(&light_recipe, evaporation)
            .map(Into::into)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`Bridge::calculate_recipe_mix_properties`]
    ///
    /// # Errors
    ///
    /// Returns a `serde::Error` if the `JsValue` input cannot be deserialized into an
    /// [`OwnedLightRecipe`], and forwards any errors from the forwarded-to method. See
    /// [`Bridge::calculate_recipe_mix_properties`] for more details on the forwarded errors.
    #[wasm_bindgen(js_name = "calculate_recipe_mix_properties")]
    pub fn calculate_recipe_mix_properties_wasm(
        &self,
        recipe: Box<[JsValue]>,
        evaporation: Option<f64>,
    ) -> JsResult<MixProperties> {
        let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
        self.calculate_recipe_mix_properties(&light_recipe, evaporation)
            .map(Into::into)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`Bridge::balance_recipe`]
    ///
    /// `locked` is an optional array of `[lineIndex, Lock]` pairs pinning lines during balancing.
    ///
    /// # Errors
    ///
    /// Returns a `serde::Error` if the `JsValue` inputs cannot be deserialized into an
    /// [`OwnedLightRecipe`], `(BalanceKey, f64, Priority | null)[]`, or a `[usize, Lock][]` locks
    /// list. Forwards any errors from the forwarded-to [`Bridge::balance_recipe`].
    #[wasm_bindgen(js_name = "balance_recipe")]
    pub fn balance_recipe_wasm(
        &self,
        recipe: Box<[JsValue]>,
        targets: Box<[JsValue]>,
        total_amount: Option<f64>,
        locked: Option<Box<[JsValue]>>,
        evaporation: Option<f64>,
    ) -> JsResult<Box<[JsValue]>> {
        let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
        let targets = balancing_targets_from_jsvalue(JsValue::from(targets))?;
        let locked = locked
            .map(|l| balancing_locks_from_jsvalue(JsValue::from(l)))
            .transpose()?;

        self.balance_recipe(&light_recipe, &targets, total_amount, locked.as_deref().unwrap_or(&[]), evaporation)
            .map_err(Into::<JsValue>::into)?
            .into_iter()
            .map(|line| serde_wasm_bindgen::to_value(&line).map_err(Into::into))
            .collect::<JsResult<Vec<JsValue>>>()
            .map(Vec::into_boxed_slice)
    }

    /// WASM compatible wrapper for [`Bridge::deevaporate_recipe`]
    ///
    /// # Errors
    ///
    /// Returns a `serde::Error` if the `JsValue` input cannot be deserialized into an
    /// [`OwnedLightRecipe`], and forwards any errors from [`Bridge::deevaporate_recipe`].
    #[wasm_bindgen(js_name = "deevaporate_recipe")]
    pub fn deevaporate_recipe_wasm(&self, recipe: Box<[JsValue]>, evaporation: f64) -> JsResult<Box<[JsValue]>> {
        let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;

        self.deevaporate_recipe(&light_recipe, evaporation)
            .map_err(Into::<JsValue>::into)?
            .into_iter()
            .map(|line| serde_wasm_bindgen::to_value(&line).map_err(Into::into))
            .collect::<JsResult<Vec<JsValue>>>()
            .map(Vec::into_boxed_slice)
    }

    /// WASM compatible wrapper for [`Bridge::validate_recipe_targets`]
    ///
    /// Returns the report flattened to a JS-facing view: an `issues` array where each entry carries
    /// `severity` as string, the affected `keys`, and a human-readable `message`. This keeps the TS
    /// side from mirroring the [`BalancingIssue`] variants (see [`BalancingIssueView`]).
    ///
    /// `locked` is an optional array of `[lineIndex, Lock]` pairs marking the lines held fixed.
    ///
    /// # Errors
    ///
    /// Returns a `serde::Error` if the `JsValue` inputs cannot be deserialized into an
    /// [`OwnedLightRecipe`], `(BalanceKey, f64, Priority | null)[]`, or a `[usize, Lock][]` locks
    /// list. Forwards errors from forwarded-to [`Bridge::validate_recipe_targets`].
    #[wasm_bindgen(js_name = "validate_recipe_targets")]
    pub fn validate_recipe_targets_wasm(
        &self,
        recipe: Box<[JsValue]>,
        targets: Box<[JsValue]>,
        rel_tol: Option<f64>,
        locked: Option<Box<[JsValue]>>,
        evaporation: Option<f64>,
    ) -> JsResult<JsValue> {
        let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
        let targets = balancing_targets_from_jsvalue(JsValue::from(targets))?;
        let locked = locked
            .map(|l| balancing_locks_from_jsvalue(JsValue::from(l)))
            .transpose()?;

        self.validate_recipe_targets(&light_recipe, &targets, rel_tol, locked.as_deref().unwrap_or(&[]), evaporation)
            .map(|report| serde_wasm_bindgen::to_value(&BalancingReportView::from(&report)).map_err(Into::into))?
    }

    /// WASM compatible wrapper for [`Bridge::clear`]
    #[wasm_bindgen(js_name = "clear")]
    pub fn clear_wasm(&self) {
        self.db.clear();
    }

    /// WASM compatible wrapper for [`Bridge::seed`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed`]; see for more details.
    #[wasm_bindgen(js_name = "seed")]
    #[allow(clippy::needless_pass_by_value)]
    pub fn seed_wasm(&self, ingredients: Box<[Ingredient]>, on_conflict: OnConflict) -> JsResult<()> {
        self.db
            .seed(&ingredients.into_iter().map(Into::into).collect::<Vec<_>>(), on_conflict)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`Bridge::seed_from_specs`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_specs`]; see for details.
    #[wasm_bindgen(js_name = "seed_from_specs")]
    #[allow(clippy::needless_pass_by_value)]
    pub fn seed_from_specs_wasm(&self, specs: Box<[JsValue]>, on_conflict: OnConflict) -> JsResult<()> {
        self.db.seed_from_specs_wasm(specs, on_conflict)
    }

    /// WASM compatible wrapper for [`Bridge::seed_from_embedded_data`]
    ///
    /// This function requires the `data` feature to be enabled.
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_embedded_data`]; see for more.
    #[cfg(feature = "data")]
    #[wasm_bindgen(js_name = "seed_from_embedded_data")]
    pub fn seed_from_embedded_data_wasm(&self, on_conflict: OnConflict) -> JsResult<()> {
        self.db.seed_from_embedded_data_wasm(on_conflict)
    }

    /// WASM compatible wrapper for [`Bridge::resolve_into_ingredient_from_spec`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`spec_entry_from_jsvalue`] and
    /// [`Bridge::resolve_into_ingredient_from_spec`]; see those methods for more details.
    #[wasm_bindgen(js_name = "resolve_into_ingredient_from_spec")]
    pub fn resolve_into_ingredient_from_spec_wasm(&self, spec: JsValue) -> JsResult<Ingredient> {
        self.resolve_into_ingredient_from_spec(spec_entry_from_jsvalue(spec)?)
            .map(Into::into)
            .map_err(Into::into)
    }
}

impl IngredientGetter for Bridge {
    /// Forwards to [`IngredientDatabase::get_ingredient_by_name`] of the internal database
    fn get_ingredient_by_name(&self, name: &str) -> Result<RustIngredient> {
        self.db.get_ingredient_by_name(name)
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::{
        balancing::tests::balance_rel_error_pp,
        tests::assets::{CHOCOLATE_PRE_EVAPORATION, MAIN_RECIPE_CONST},
        wasm::ingredient::tests::WHOLE_MILK_ING,
    };

    use super::*;
    use crate::{
        balancing::{BalancingIssue, Priority},
        composition::{CompKey, RatioKey},
        data::{get_all_independent_ingredient_specs, get_all_spec_entries},
        fpd::FpdKey,
        ingredient::{Ingredient, IntoIngredient, ResolveIntoIngredient},
        specs::{DairySimpleSpec, IngredientSpec},
        wasm::ingredient::Ingredient as WasmIngredient,
    };

    const LIGHT_RECIPE: &[(&str, f64)] = MAIN_RECIPE_CONST;

    fn make_seeded_db() -> IngredientDatabase {
        IngredientDatabase::new_seeded_from_specs(&get_all_spec_entries()).unwrap()
    }

    fn light_recipe_to_owned(recipe: &[(&str, f64)]) -> Vec<(String, f64)> {
        recipe
            .iter()
            .map(|(name, amount)| (name.to_string(), *amount))
            .collect()
    }

    /// Attaches the unprioritized default (`None`) to plain `(key, value)` targets.
    fn unprioritized(pairs: &[(BalanceKey, f64)]) -> Vec<(BalanceKey, f64, Option<Priority>)> {
        pairs.iter().map(|&(key, value)| (key, value, None)).collect()
    }

    #[test]
    fn bridge_new_empty() {
        let bridge = Bridge::new(IngredientDatabase::new());
        assert_true!(bridge.get_all_ingredients().is_empty());
    }

    #[test]
    fn bridge_new_populated() {
        let db = make_seeded_db();
        assert_eq!(db.get_all_ingredients().len(), get_all_spec_entries().len());

        let bridge = Bridge::new(db);
        assert_eq!(bridge.get_all_ingredients().len(), get_all_spec_entries().len());
    }

    #[test]
    fn bridge_has_ingredient() {
        let bridge = Bridge::new(IngredientDatabase::new());
        assert_false!(bridge.has_ingredient("Whole Milk"));

        bridge
            .seed(
                &[Ingredient {
                    name: "Whole Milk".to_string(),
                    category: Category::Dairy,
                    composition: RustComposition::new(),
                }],
                OnConflict::Reject,
            )
            .unwrap();
        assert_true!(bridge.has_ingredient("Whole Milk"));
    }

    #[test]
    fn bridge_get_ingredient_by_name() {
        let bridge = Bridge::new(make_seeded_db());

        for spec in get_all_spec_entries() {
            let ingredient = bridge.get_ingredient_by_name(spec.name()).unwrap();
            assert_eq!(ingredient.name, spec.name());
        }

        let db = make_seeded_db();
        for ingredient in db.get_all_ingredients() {
            let fetched = bridge.get_ingredient_by_name(&ingredient.name).unwrap();
            assert_eq!(fetched, ingredient);
        }
    }

    #[test]
    fn bridge_get_ingredient_by_name_not_found() {
        let bridge = Bridge::new(make_seeded_db());
        let result = bridge.get_ingredient_by_name("Nonexistent Ingredient");
        assert!(
            matches!(result, Err(crate::error::Error::IngredientNotFound(name)) if name == "Nonexistent Ingredient")
        );
    }

    #[test]
    fn bridge_get_all_ingredients() {
        let bridge = Bridge::new(make_seeded_db());
        let ingredients = bridge.get_all_ingredients();
        assert_eq!(ingredients.len(), get_all_spec_entries().len());

        let db = make_seeded_db();
        for ingredient in db.get_all_ingredients() {
            assert_true!(
                ingredients
                    .iter()
                    .any(|ing| ing.name == ingredient.name && ing.category == ingredient.category)
            );
        }
    }

    #[test]
    fn bridge_get_ingredients_by_category() {
        let bridge = Bridge::new(make_seeded_db());
        let db = make_seeded_db();

        for category in Category::iter() {
            let ingredients = bridge.get_ingredients_by_category(category);
            let expected_len = db
                .get_all_ingredients()
                .iter()
                .filter(|spec| spec.category == category)
                .count();
            assert_eq!(ingredients.len(), expected_len);
            assert!(ingredients.iter().all(|ing| ing.category == category));
        }
    }

    #[test]
    fn bridge_calculate_recipe_composition() {
        let bridge = Bridge::new(make_seeded_db());
        let comp = bridge
            .calculate_recipe_composition(&light_recipe_to_owned(LIGHT_RECIPE), None)
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 13.6367);
    }

    #[test]
    fn bridge_calculate_recipe_composition_ingredient_not_found() {
        let bridge = Bridge::new(make_seeded_db());
        let result = bridge.calculate_recipe_composition(&[("Nonexistent Ingredient".to_string(), 100.0)], None);
        assert!(
            matches!(result, Err(crate::error::Error::IngredientNotFound(name)) if name == "Nonexistent Ingredient")
        );
    }

    #[test]
    fn bridge_calculate_recipe_mix_properties() {
        let bridge = Bridge::new(make_seeded_db());
        let mix_properties = bridge
            .calculate_recipe_mix_properties(&light_recipe_to_owned(LIGHT_RECIPE), None)
            .unwrap();

        assert_eq_flt_test!(mix_properties.get(CompKey::MilkFat.into()), 13.6367);
    }

    #[test]
    fn bridge_calculate_recipe_mix_properties_ingredient_not_found() {
        let bridge = Bridge::new(make_seeded_db());
        let result = bridge.calculate_recipe_mix_properties(&[("Nonexistent Ingredient".to_string(), 100.0)], None);
        assert!(
            matches!(result, Err(crate::error::Error::IngredientNotFound(name)) if name == "Nonexistent Ingredient")
        );
    }

    #[test]
    fn bridge_balance_recipe() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);
        let original_total: f64 = recipe.iter().map(|(_, g)| *g).sum();

        let targets = [
            (CompKey::MilkFat.into(), 14.0),
            (CompKey::MSNF.into(), 10.0),
            (CompKey::TotalSugars.into(), 17.0),
            (CompKey::TotalSolids.into(), 41.0),
        ];

        let balanced = bridge
            .balance_recipe(&recipe, &unprioritized(&targets), None, &[], None)
            .unwrap();

        assert_eq!(balanced.len(), recipe.len());
        for (i, (name, amount)) in balanced.iter().enumerate() {
            assert_eq!(name, &recipe[i].0);
            assert_true!(*amount >= 0.0);
        }

        // `None` keeps the current total constant.
        let balanced_total: f64 = balanced.iter().map(|(_, g)| *g).sum();
        assert_eq_flt_test!(balanced_total, original_total);

        let comp = bridge.calculate_recipe_composition(&balanced, None).unwrap();
        for (key, target) in &targets {
            assert_eq_flt_test!(key.value(&comp), *target);
        }

        // An explicit `total_amount` scales the balanced recipe to that mass
        let scaled = bridge
            .balance_recipe(&recipe, &unprioritized(&targets), Some(1000.0), &[], None)
            .unwrap();
        let scaled_total: f64 = scaled.iter().map(|(_, g)| *g).sum();
        assert_eq_flt_test!(scaled_total, 1000.0);

        let scaled_comp = bridge.calculate_recipe_composition(&scaled, None).unwrap();
        for (key, target) in &targets {
            assert_eq_flt_test!(key.value(&scaled_comp), *target);
        }
    }

    #[test]
    fn bridge_calculate_recipe_composition_evaporation_concentrates() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(CHOCOLATE_PRE_EVAPORATION);

        let plain = bridge.calculate_recipe_composition(&recipe, None).unwrap();
        let evaporated = bridge.calculate_recipe_composition(&recipe, Some(150.0)).unwrap();

        // Evaporating water concentrates the mix: total solids rise, water falls.
        assert_gt!(evaporated.get(CompKey::TotalSolids), plain.get(CompKey::TotalSolids));
        assert_lt!(evaporated.get(CompKey::Water), plain.get(CompKey::Water));
    }

    #[test]
    fn bridge_calculate_recipe_mix_properties_total_amount_is_post_evaporation() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(CHOCOLATE_PRE_EVAPORATION);

        let props = bridge.calculate_recipe_mix_properties(&recipe, Some(150.0)).unwrap();
        // Line total 1089 g minus 150 g evaporated is the 939 g final yield.
        assert_eq_flt_test!(props.total_amount, 939.0);
    }

    #[test]
    fn bridge_deevaporate_recipe_clears_evaporation_and_reproduces_mix() {
        use strum::IntoEnumIterator;

        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(CHOCOLATE_PRE_EVAPORATION);

        let post_evap = bridge.calculate_recipe_composition(&recipe, Some(150.0)).unwrap();
        let deevaporated = bridge.deevaporate_recipe(&recipe, 150.0).unwrap();

        let deevap_total: f64 = deevaporated.iter().map(|(_, g)| *g).sum();
        assert_eq_flt_test!(deevap_total, 939.0);

        let deevap_comp = bridge.calculate_recipe_composition(&deevaporated, None).unwrap();
        for key in CompKey::iter() {
            assert_eq_flt_test!(deevap_comp.get(key), post_evap.get(key));
        }
    }

    #[test]
    fn bridge_deevaporate_recipe_without_evaporation_errors() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(CHOCOLATE_PRE_EVAPORATION);
        let result = bridge.deevaporate_recipe(&recipe, 0.0);
        assert!(matches!(result, Err(crate::error::Error::InvalidEvaporation(_))));
    }

    #[test]
    fn bridge_balance_recipe_with_evaporation_hits_post_evaporation_targets() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(CHOCOLATE_PRE_EVAPORATION);

        // Drawn from the recipe's own post-evap comp, including the water-denominated AbsPAC ratio.
        let post = bridge.calculate_recipe_composition(&recipe, Some(150.0)).unwrap();
        let targets = [
            (CompKey::MilkFat.into(), post.get(CompKey::MilkFat)),
            (CompKey::TotalSolids.into(), post.get(CompKey::TotalSolids)),
            (RatioKey::AbsPAC.into(), post.get_ratio(RatioKey::AbsPAC)),
        ];

        let balanced = bridge
            .balance_recipe(&recipe, &unprioritized(&targets), None, &[], Some(150.0))
            .unwrap();
        let balanced_post = bridge.calculate_recipe_composition(&balanced, Some(150.0)).unwrap();

        // The recipe already meets its own targets, so balancing hits each to solver precision.
        assert_eq_flt_test!(balanced_post.get(CompKey::MilkFat), post.get(CompKey::MilkFat));
        assert_eq_flt_test!(balanced_post.get(CompKey::TotalSolids), post.get(CompKey::TotalSolids));
        assert_eq_flt_test!(balanced_post.get_ratio(RatioKey::AbsPAC), post.get_ratio(RatioKey::AbsPAC));
    }

    #[test]
    fn bridge_balance_recipe_ingredient_not_found() {
        let bridge = Bridge::new(make_seeded_db());
        let result = bridge.balance_recipe(
            &[("Nonexistent Ingredient".to_string(), 100.0)],
            &unprioritized(&[(CompKey::MilkFat.into(), 10.0)]),
            None,
            &[],
            None,
        );
        assert!(
            matches!(result, Err(crate::error::Error::IngredientNotFound(name)) if name == "Nonexistent Ingredient")
        );
    }

    #[test]
    fn bridge_balance_recipe_applies_priorities() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);

        let targets = [
            (CompKey::Energy.into(), 200.0),
            (CompKey::MilkFat.into(), 12.0),
            (CompKey::MSNF.into(), 8.0),
            (CompKey::POD.into(), 0.5),
        ];

        // Same targets, but with POD (the last entry) raised to Critical priority.
        let mut prioritized = unprioritized(&targets);
        prioritized.last_mut().unwrap().2 = Some(Priority::Critical);

        let default_balanced = bridge
            .balance_recipe(&recipe, &unprioritized(&targets), None, &[], None)
            .unwrap();
        let prioritized_balanced = bridge.balance_recipe(&recipe, &prioritized, None, &[], None).unwrap();

        let default_comp = bridge.calculate_recipe_composition(&default_balanced, None).unwrap();
        let prioritized_comp = bridge
            .calculate_recipe_composition(&prioritized_balanced, None)
            .unwrap();

        let default_error = balance_rel_error_pp(default_comp.get(CompKey::POD), 0.5);
        let prioritized_error = balance_rel_error_pp(prioritized_comp.get(CompKey::POD), 0.5);

        assert_true!(prioritized_error < default_error);
    }

    #[test]
    fn bridge_balance_recipe_holds_locked_line() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);

        // Lock the Vanilla Extract line; balancing must leave its amount untouched.
        let vanilla_idx = recipe.iter().position(|(name, _)| name == "Vanilla Extract").unwrap();
        let vanilla_amount = recipe[vanilla_idx].1;
        let locked = [(vanilla_idx, Lock::Amount(vanilla_amount))];

        let targets = [(CompKey::MilkFat.into(), 14.0), (CompKey::MSNF.into(), 10.0)];
        let balanced = bridge
            .balance_recipe(&recipe, &unprioritized(&targets), None, &locked, None)
            .unwrap();

        assert_eq!(balanced[vanilla_idx].0, recipe[vanilla_idx].0);
        assert_eq_flt_test!(balanced[vanilla_idx].1, vanilla_amount);
    }

    #[test]
    fn bridge_balance_recipe_locked_exceeding_total_errors() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);
        let vanilla_idx = recipe.iter().position(|(name, _)| name == "Vanilla Extract").unwrap();
        let vanilla_amount = recipe[vanilla_idx].1;
        let locked = [(vanilla_idx, Lock::Amount(vanilla_amount))];

        // A total below the locked line's amount makes its fixed fraction exceed the whole mix.
        let result = bridge.balance_recipe(
            &recipe,
            &unprioritized(&[(CompKey::MilkFat.into(), 10.0)]),
            Some(3.0),
            &locked,
            None,
        );
        assert!(matches!(result, Err(crate::error::Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn bridge_validate_recipe_targets_clean() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);
        let targets = [
            (CompKey::MilkFat.into(), 14.0),
            (CompKey::MSNF.into(), 10.0),
            (CompKey::TotalSugars.into(), 17.0),
        ];
        let report = bridge
            .validate_recipe_targets(&recipe, &unprioritized(&targets), None, &[], None)
            .unwrap();
        assert_true!(report.is_empty());
    }

    #[test]
    fn bridge_validate_recipe_targets_error_out_of_domain() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);
        let targets = [(CompKey::MilkFat.into(), -5.0)];
        let report = bridge
            .validate_recipe_targets(&recipe, &unprioritized(&targets), None, &[], None)
            .unwrap();
        assert_true!(report.has_errors());
        assert_eq!(report.issues.len(), 1);
        assert!(matches!(
            report.issues[0],
            BalancingIssue::OutOfDomainTarget {
                key: BalanceKey::Comp(CompKey::MilkFat),
                ..
            }
        ));
    }

    #[test]
    fn bridge_validate_recipe_targets_error_duplicate() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);
        let targets = [(CompKey::MilkFat.into(), 10.0), (CompKey::MilkFat.into(), 12.0)];
        let report = bridge
            .validate_recipe_targets(&recipe, &unprioritized(&targets), None, &[], None)
            .unwrap();
        assert_true!(report.has_errors());
        assert!(matches!(report.errors().next().unwrap(), BalancingIssue::DuplicateTarget { .. }));
    }

    #[test]
    fn bridge_validate_recipe_targets_error_proxy_clash() {
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);
        let targets = [
            (FpdKey::ServingTemp.into(), -13.0),
            (FpdKey::HardnessAt14C.into(), 72.0),
        ];
        let report = bridge
            .validate_recipe_targets(&recipe, &unprioritized(&targets), None, &[], None)
            .unwrap();
        assert_true!(report.has_errors());
        assert!(matches!(
            report.errors().next().unwrap(),
            BalancingIssue::ProxyTargetClash { keys, proxy: BalanceKey::Ratio(RatioKey::AbsNetPAC) }
                if *keys == vec![BalanceKey::from(FpdKey::ServingTemp), BalanceKey::from(FpdKey::HardnessAt14C)]
        ));
    }

    #[test]
    fn bridge_balance_recipe_translates_intensive_targets() {
        // An FPD-family target flows through the intensive->extensive translation layer and comes
        // back readable off the balanced recipe (`value` recomputes it from the FPD curves).
        let bridge = Bridge::new(make_seeded_db());
        let recipe = light_recipe_to_owned(LIGHT_RECIPE);
        let targets = [
            (BalanceKey::from(FpdKey::ServingTemp), -13.0),
            (CompKey::TotalSolids.into(), 41.0),
        ];
        let balanced = bridge
            .balance_recipe(&recipe, &unprioritized(&targets), None, &[], None)
            .unwrap();
        let comp = bridge.calculate_recipe_composition(&balanced, None).unwrap();
        for (key, target) in &targets {
            assert_eq_flt_test!(key.value(&comp), *target);
        }
    }

    #[test]
    fn bridge_validate_recipe_targets_ingredient_not_found() {
        let bridge = Bridge::new(make_seeded_db());
        let result = bridge.validate_recipe_targets(
            &[("Nonexistent Ingredient".to_string(), 100.0)],
            &unprioritized(&[(CompKey::MilkFat.into(), 10.0)]),
            None,
            &[],
            None,
        );
        assert!(
            matches!(result, Err(crate::error::Error::IngredientNotFound(name)) if name == "Nonexistent Ingredient")
        );
    }

    #[test]
    fn bridge_seed() {
        let bridge = Bridge::new(IngredientDatabase::new());
        assert!(bridge.get_all_ingredients().is_empty());

        let ingredients = get_all_independent_ingredient_specs()[..10]
            .iter()
            .map(|spec| spec.clone().into_ingredient().unwrap())
            .collect::<Vec<Ingredient>>();

        bridge.seed(&ingredients, OnConflict::Reject).unwrap();
        assert_eq!(bridge.get_all_ingredients().len(), 10);

        for ingredient in ingredients {
            let fetched = bridge.get_ingredient_by_name(&ingredient.name).unwrap();
            assert_eq!(fetched, ingredient);
        }
    }

    #[test]
    fn bridge_seed_from_specs() {
        let bridge = Bridge::new(IngredientDatabase::new());
        assert!(bridge.get_all_ingredients().is_empty());

        let specs = get_all_spec_entries();

        bridge.seed_from_specs(&specs, OnConflict::Reject).unwrap();
        assert_eq!(bridge.get_all_ingredients().len(), specs.len());

        let db = IngredientDatabase::new_seeded_from_specs(&specs).unwrap();
        for spec in specs {
            let fetched = bridge.get_ingredient_by_name(spec.name()).unwrap();
            assert_eq!(fetched, spec.resolve_into_ingredient(&db).unwrap());
        }
    }

    #[test]
    fn bridge_resolve_into_ingredient_from_spec() {
        let bridge = Bridge::new(make_seeded_db());

        for spec in get_all_spec_entries() {
            let ingredient = bridge.resolve_into_ingredient_from_spec(spec.clone()).unwrap();
            assert_eq!(ingredient.name, spec.name());
            assert_eq!(ingredient.category, spec.resolve_into_ingredient(&bridge.db).unwrap().category);
        }
    }

    #[test]
    fn bridge_seed_from_specs_invalid_spec() {
        let bridge = Bridge::new(IngredientDatabase::new());
        let invalid_spec = SpecEntry::Ingredient(IngredientSpec {
            name: "Invalid Ingredient".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: -10.0,
                msnf: None,
                protein: None,
                sucrose: None,
                lactose_free: None,
                solids_source: None,
            }
            .into(),
        });

        let result = bridge.seed_from_specs(&[invalid_spec], OnConflict::Reject);
        assert!(matches!(result, Err(crate::error::Error::CompositionNotPositive(_))));
    }

    #[test]
    #[cfg(feature = "data")]
    fn bridge_clear_seed_embedded_then_overwrite() {
        let bridge = Bridge::new(IngredientDatabase::new_seeded_from_embedded_data());
        let embedded_len = bridge.get_all_ingredients().len();
        let embedded_name = bridge.get_all_ingredient_names().into_iter().next().unwrap();

        let make_spec = |name: &str, fat: f64| {
            SpecEntry::Ingredient(IngredientSpec {
                name: name.to_string(),
                category: Category::Dairy,
                spec: DairySimpleSpec {
                    fat,
                    msnf: None,
                    protein: None,
                    sucrose: None,
                    lactose_free: None,
                    solids_source: None,
                }
                .into(),
            })
        };

        // Reset to the embedded baseline, then overlay specs overwriting any name collisions.
        let reseed = |specs: &[SpecEntry]| {
            bridge.clear();
            bridge.seed_from_embedded_data(OnConflict::Reject).unwrap();
            bridge.seed_from_specs(specs, OnConflict::Overwrite).unwrap();
        };

        reseed(&[make_spec("My Custom Cream", 30.0)]);
        assert_eq!(bridge.get_all_ingredients().len(), embedded_len + 1);
        assert_true!(bridge.has_ingredient("My Custom Cream"));

        reseed(&[make_spec("Another Custom", 12.0)]);
        assert_eq!(bridge.get_all_ingredients().len(), embedded_len + 1);
        assert_false!(bridge.has_ingredient("My Custom Cream"));
        assert_true!(bridge.has_ingredient("Another Custom"));

        reseed(&[make_spec(&embedded_name, 50.0)]);
        assert_eq!(bridge.get_all_ingredients().len(), embedded_len);
        assert_true!(bridge.has_ingredient(&embedded_name));
    }

    #[test]
    fn bridge_new_wasm_creates_bridge_with_db() {
        let db = make_seeded_db();
        let expected_len = db.get_all_ingredients().len();
        let bridge = Bridge::new_wasm(db);
        assert_eq!(bridge.get_all_ingredients().len(), expected_len);
    }

    #[test]
    fn has_ingredient_wasm_delegates() {
        let bridge = Bridge::new(IngredientDatabase::new());
        assert_false!(bridge.has_ingredient_wasm("Whole Milk"));
        bridge
            .seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject)
            .unwrap();
        assert_true!(bridge.has_ingredient_wasm("Whole Milk"));
    }

    #[test]
    fn get_all_ingredient_names_empty() {
        let bridge = Bridge::new(IngredientDatabase::new());
        assert_true!(bridge.get_all_ingredient_names().is_empty());
    }

    #[test]
    fn get_all_ingredient_names_single_ingredient() {
        let bridge = Bridge::new(IngredientDatabase::new());
        bridge
            .seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject)
            .unwrap();
        let names = bridge.get_all_ingredient_names();
        assert_eq!(names, vec!["Whole Milk".to_string()]);
    }

    #[test]
    fn get_all_ingredient_names_matches_get_all_ingredients() {
        let bridge = Bridge::new(make_seeded_db());
        let names = bridge.get_all_ingredient_names();
        let ingredients = bridge.get_all_ingredients();

        assert_eq!(names.len(), ingredients.len());

        for ingredient in ingredients {
            assert_true!(names.contains(&ingredient.name));
        }
    }

    #[test]
    fn get_all_ingredients_wasm_returns_wasm_types() {
        let bridge = Bridge::new(IngredientDatabase::new());
        bridge
            .seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject)
            .unwrap();
        let wasm_ingredients = bridge.get_all_ingredients_wasm();
        assert_eq!(wasm_ingredients.len(), 1);
        assert_eq!(wasm_ingredients[0], *WHOLE_MILK_ING);
    }

    #[test]
    fn get_ingredients_by_category_wasm_returns_wasm_types() {
        let bridge = Bridge::new(make_seeded_db());
        let dairy = bridge.get_ingredients_by_category_wasm(Category::Dairy);
        assert_false!(dairy.is_empty());
        assert_true!(dairy.iter().all(|ing| ing.category == Category::Dairy));
        assert_true!(
            dairy
                .iter()
                .all(|ing: &WasmIngredient| bridge.has_ingredient(&ing.name))
        );
    }

    #[test]
    fn get_ingredient_by_name_wasm_found() {
        let bridge = Bridge::new(IngredientDatabase::new());
        bridge
            .seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject)
            .unwrap();
        let result = bridge.get_ingredient_by_name_wasm("Whole Milk");
        assert_true!(result.is_ok());
        assert_eq!(result.unwrap(), *WHOLE_MILK_ING);
    }

    #[test]
    fn seed_wasm_adds_wasm_ingredients() {
        let bridge = Bridge::new(IngredientDatabase::new());
        let result = bridge.seed_wasm(Box::new([WHOLE_MILK_ING.clone()]), OnConflict::Reject);
        assert_true!(result.is_ok());
        assert_eq!(bridge.get_all_ingredients().len(), 1);
        assert_eq!(bridge.get_all_ingredients()[0].name, "Whole Milk");
    }
}
