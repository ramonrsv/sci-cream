//! WASM [`Bridge`] to facilitate performant JS <-> WASM communication for recipe calculations

use wasm_bindgen::prelude::*;

use crate::{
    composition::Composition as RustComposition,
    database::IngredientDatabase,
    error::Result,
    ingredient::{Category, Ingredient as RustIngredient, ResolveIntoIngredient},
    properties::MixProperties as RustMixProperties,
    recipe::{LightRecipe, Recipe},
    resolution::IngredientGetter,
    specs::entry::SpecEntry,
    wasm::{Composition, Ingredient, JsResult, MixProperties, light_recipe_from_jsvalue, spec_entry_from_jsvalue},
};

#[cfg(doc)]
use crate::{error::Error, recipe::OwnedLightRecipe};

/// WASM Bridge for calculating recipe compositions and mix properties
///
/// This struct serves as a bridge between WASM and the Rust backend, attempting to keep as much of
/// the on-memory data structures and operations on the WASM side to minimize the performance
/// overhead of JS <-> WASM bridging. It holds an in-memory ingredient database for looking up
/// ingredient definitions by name, and provides methods for calculating recipe compositions and
/// mix properties from "light" recipe representations (tuples of ingredient names and amounts).
///
/// **Note**: Because it is currently not possible to return references to internal members within
/// the WASM and JS environment, this class replicates many of the interfaces of [`Recipe`] and
/// [`IngredientDatabase`], forwarding to the corresponding methods in internal members.
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

    /// Forwards to [`Recipe::calculate_composition`], creating a [`Recipe`] from [`LightRecipe`]
    ///
    /// # Errors
    ///
    /// When converting the [`LightRecipe`] into a full [`Recipe`] via
    /// [`Recipe::from_light_recipe`], it returns an [`Error::IngredientNotFound`] if any ingredient
    /// name in the [`LightRecipe`] is not found in the provided [`IngredientDatabase`]. It also
    /// forwards any errors from [`Recipe::calculate_composition`] if composition calculations fail.
    pub fn calculate_recipe_composition(&self, recipe: &LightRecipe) -> Result<RustComposition> {
        Recipe::from_light_recipe(None, recipe, &self.db)?.calculate_composition()
    }

    /// Forwards to [`Recipe::calculate_mix_properties`], creating a [`Recipe`] from [`LightRecipe`]
    ///
    /// # Errors
    ///
    /// When converting the [`LightRecipe`] into a full [`Recipe`] via
    /// [`Recipe::from_light_recipe`], it returns an [`Error::IngredientNotFound`] if any ingredient
    /// name in the [`LightRecipe`] is not found in the provided [`IngredientDatabase`]. It also
    /// forwards any errors from [`Recipe::calculate_mix_properties`] if FPD calculations fail.
    pub fn calculate_recipe_mix_properties(&self, recipe: &LightRecipe) -> Result<RustMixProperties> {
        Recipe::from_light_recipe(None, recipe, &self.db)?.calculate_mix_properties()
    }

    /// Forwards to [`IngredientDatabase::seed`], seeding the db with the provided [`Ingredient`]s.
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed`]; see that method for more details.
    pub fn seed(&self, ingredients: &[RustIngredient]) -> Result<()> {
        self.db.seed(ingredients)
    }

    /// Forwards to [`IngredientDatabase::seed_from_specs`], seeding with the [`SpecEntry`]s.
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_specs`]; see more details.
    pub fn seed_from_specs(&self, specs: &[SpecEntry]) -> Result<()> {
        self.db.seed_from_specs(specs)
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
    pub fn calculate_recipe_composition_wasm(&self, recipe: Box<[JsValue]>) -> JsResult<Composition> {
        let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
        self.calculate_recipe_composition(&light_recipe)
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
    pub fn calculate_recipe_mix_properties_wasm(&self, recipe: Box<[JsValue]>) -> JsResult<MixProperties> {
        let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
        self.calculate_recipe_mix_properties(&light_recipe)
            .map(Into::into)
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`Bridge::seed`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed`]; see for more details.
    #[wasm_bindgen(js_name = "seed")]
    #[allow(clippy::needless_pass_by_value)]
    pub fn seed_wasm(&self, ingredients: Box<[Ingredient]>) -> JsResult<()> {
        self.db
            .seed(&ingredients.into_iter().map(Into::into).collect::<Vec<_>>())
            .map_err(Into::into)
    }

    /// WASM compatible wrapper for [`Bridge::seed_from_specs`]
    ///
    /// # Errors
    ///
    /// It forwards any errors from [`IngredientDatabase::seed_from_specs`]; see for details.
    #[wasm_bindgen(js_name = "seed_from_specs")]
    #[allow(clippy::needless_pass_by_value)]
    pub fn seed_from_specs_wasm(&self, specs: Box<[JsValue]>) -> JsResult<()> {
        self.db.seed_from_specs_wasm(specs)
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

    use super::*;
    use crate::{
        composition::CompKey,
        data::{get_all_independent_ingredient_specs, get_all_spec_entries},
        ingredient::{Ingredient, IntoIngredient, ResolveIntoIngredient},
        specs::{DairySimpleSpec, IngredientSpec},
        wasm::ingredient::{Ingredient as WasmIngredient, tests::WHOLE_MILK_ING},
    };

    const LIGHT_RECIPE: &[(&str, f64)] = &[
        ("Whole Milk", 245.0),
        ("Whipping Cream", 215.0),
        ("Cocoa Powder, 17% Fat", 28.0),
        ("Skimmed Milk Powder", 21.0),
        ("Egg Yolk", 18.0),
        ("Dextrose", 45.0),
        ("Fructose", 32.0),
        ("Salt", 0.5),
        ("Stabilizer Blend", 1.25),
        ("Vanilla Extract", 6.0),
    ];

    fn make_seeded_db() -> IngredientDatabase {
        IngredientDatabase::new_seeded_from_specs(&get_all_spec_entries()).unwrap()
    }

    fn light_recipe_to_owned(recipe: &[(&str, f64)]) -> Vec<(String, f64)> {
        recipe
            .iter()
            .map(|(name, amount)| (name.to_string(), *amount))
            .collect()
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
            .seed(&[Ingredient {
                name: "Whole Milk".to_string(),
                category: Category::Dairy,
                composition: RustComposition::new(),
            }])
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
            .calculate_recipe_composition(&light_recipe_to_owned(LIGHT_RECIPE))
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 13.6024);
    }

    #[test]
    fn bridge_calculate_recipe_composition_ingredient_not_found() {
        let bridge = Bridge::new(make_seeded_db());
        let result = bridge.calculate_recipe_composition(&[("Nonexistent Ingredient".to_string(), 100.0)]);
        assert!(
            matches!(result, Err(crate::error::Error::IngredientNotFound(name)) if name == "Nonexistent Ingredient")
        );
    }

    #[test]
    fn bridge_calculate_recipe_mix_properties() {
        let bridge = Bridge::new(make_seeded_db());
        let mix_properties = bridge
            .calculate_recipe_mix_properties(&light_recipe_to_owned(LIGHT_RECIPE))
            .unwrap();

        assert_eq_flt_test!(mix_properties.get(CompKey::MilkFat.into()), 13.6024);
    }

    #[test]
    fn bridge_calculate_recipe_mix_properties_ingredient_not_found() {
        let bridge = Bridge::new(make_seeded_db());
        let result = bridge.calculate_recipe_mix_properties(&[("Nonexistent Ingredient".to_string(), 100.0)]);
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

        bridge.seed(&ingredients).unwrap();
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

        bridge.seed_from_specs(&specs).unwrap();
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
                lactose_free: None,
            }
            .into(),
        });

        let result = bridge.seed_from_specs(&[invalid_spec]);
        assert!(matches!(result, Err(crate::error::Error::CompositionNotPositive(_))));
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
        bridge.seed_wasm(Box::new([WHOLE_MILK_ING.clone()])).unwrap();
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
        bridge.seed_wasm(Box::new([WHOLE_MILK_ING.clone()])).unwrap();
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
        bridge.seed_wasm(Box::new([WHOLE_MILK_ING.clone()])).unwrap();
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
        bridge.seed_wasm(Box::new([WHOLE_MILK_ING.clone()])).unwrap();
        let result = bridge.get_ingredient_by_name_wasm("Whole Milk");
        assert_true!(result.is_ok());
        assert_eq!(result.unwrap(), *WHOLE_MILK_ING);
    }

    #[test]
    fn seed_wasm_adds_wasm_ingredients() {
        let bridge = Bridge::new(IngredientDatabase::new());
        let result = bridge.seed_wasm(Box::new([WHOLE_MILK_ING.clone()]));
        assert_true!(result.is_ok());
        assert_eq!(bridge.get_all_ingredients().len(), 1);
        assert_eq!(bridge.get_all_ingredients()[0].name, "Whole Milk");
    }
}
