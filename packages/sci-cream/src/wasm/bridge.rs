//! WASM [`Bridge`] to facilitate performant JS <-> WASM communication for recipe calculations

use wasm_bindgen::prelude::*;

use crate::{
    composition::Composition,
    database::IngredientDatabase,
    error::Result,
    ingredient::{Category, Ingredient},
    properties::MixProperties,
    recipe::{LightRecipe, Recipe},
    resolution::IngredientGetter,
    specs::IngredientSpec,
};

#[cfg(doc)]
use crate::error::Error;

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
    /// Forwards to [`IngredientDatabase::get_ingredient_by_name`] of the internal database
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if no ingredient with the name is found.
    pub fn get_ingredient_by_name(&self, name: &str) -> Result<Ingredient> {
        self.db.get_ingredient_by_name(name)
    }

    /// Forwards to [`Recipe::calculate_composition`], creating a [`Recipe`] from [`LightRecipe`]
    ///
    /// # Errors
    ///
    /// When converting the [`LightRecipe`] into a full [`Recipe`] via
    /// [`Recipe::from_light_recipe`], it returns an [`Error::IngredientNotFound`] if any ingredient
    /// name in the [`LightRecipe`] is not found in the provided [`IngredientDatabase`]. It also
    /// forwards any errors from [`Recipe::calculate_composition`] if composition calculations fail.
    pub fn calculate_recipe_composition(&self, recipe: &LightRecipe) -> Result<Composition> {
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
    pub fn calculate_recipe_mix_properties(&self, recipe: &LightRecipe) -> Result<MixProperties> {
        Recipe::from_light_recipe(None, recipe, &self.db)?.calculate_mix_properties()
    }

    /// Forwards to [`IngredientDatabase::seed`], seeding the db with the provided [`Ingredient`]s.
    pub fn seed(&self, ingredients: &[Ingredient]) {
        self.db.seed(ingredients);
    }

    /// Forwards to [`IngredientDatabase::seed_from_specs`], seeding with the [`IngredientSpec`]s.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if any of the provided specs cannot be converted into an
    /// [`Ingredient`]. This would likely be an error converting a [`spec`](crate::specs) into a
    /// [`Composition`] due to invalid values, e.g. negative percentages, not summing to 100%, etc.
    pub fn seed_from_specs(&self, specs: &[IngredientSpec]) -> Result<()> {
        self.db.seed_from_specs(specs)
    }
}

#[wasm_bindgen]
impl Bridge {
    /// Creates a new [`Bridge`] with the given [`IngredientDatabase`].
    ///
    /// The database can be pre-seeded with any of the available methods on [`IngredientDatabase`]
    /// (e.g. [`new_seeded_from_specs`](IngredientDatabase::new_seeded_from_specs)).
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    pub fn new(db: IngredientDatabase) -> Self {
        Self { db }
    }

    /// Forwards to [`IngredientDatabase::has_ingredient`] of the internal database
    pub fn has_ingredient(&self, name: &str) -> bool {
        self.db.has_ingredient(name)
    }

    /// Forwards to [`IngredientDatabase::get_all_ingredients`] of the internal database
    pub fn get_all_ingredients(&self) -> Vec<Ingredient> {
        self.db.get_all_ingredients()
    }

    /// Forwards to [`IngredientDatabase::get_ingredients_by_category`] of the internal database
    pub fn get_ingredients_by_category(&self, category: Category) -> Vec<Ingredient> {
        self.db.get_ingredients_by_category(category)
    }
}

impl IngredientGetter for Bridge {
    /// Forwards to [`IngredientDatabase::get_ingredient_by_name`] of the internal database
    fn get_ingredient_by_name(&self, name: &str) -> Result<Ingredient> {
        self.db.get_ingredient_by_name(name)
    }
}

/// WASM compatible wrappers for [`Bridge`] methods that need additional conversions.
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::Bridge;
    use crate::{
        composition::Composition, ingredient::Ingredient, properties::MixProperties,
        recipe::wasm::light_recipe_from_jsvalue,
    };

    #[cfg(doc)]
    use crate::{database::IngredientDatabase, error::Error, recipe::OwnedLightRecipe, specs::IngredientSpec};

    //#[cfg_attr(feature = "wasm", wasm_bindgen)]
    #[wasm_bindgen]
    impl Bridge {
        /// WASM compatible wrapper for [`Bridge::get_ingredient_by_name`]
        ///
        /// Actually an independent wrapper that forwards to the internal database's WASM wrapper
        /// [`IngredientDatabase::get_ingredient_by_name_wasm`], but it's the same interface.
        ///
        /// # Errors
        ///
        /// Returns an [`Error::IngredientNotFound`] if no ingredient with the name is found.
        #[wasm_bindgen(js_name = "get_ingredient_by_name")]
        pub fn get_ingredient_by_name_wasm(&self, name: &str) -> Result<Ingredient, JsValue> {
            self.db.get_ingredient_by_name_wasm(name)
        }

        /// WASM compatible wrapper for [`Bridge::calculate_recipe_composition`]
        ///
        /// # Errors
        ///
        /// Returns a `serde::Error` if the `JsValue` input cannot be deserialized into an
        /// [`OwnedLightRecipe`], and forwards any errors from the forwarded-to method.
        #[wasm_bindgen(js_name = "calculate_recipe_composition")]
        pub fn calculate_recipe_composition_wasm(&self, recipe: Box<[JsValue]>) -> Result<Composition, JsValue> {
            let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
            self.calculate_recipe_composition(&light_recipe).map_err(Into::into)
        }

        /// WASM compatible wrapper for [`Bridge::calculate_recipe_mix_properties`]
        ///
        /// # Errors
        ///
        /// Returns a `serde::Error` if the `JsValue` input cannot be deserialized into an
        /// [`OwnedLightRecipe`], and forwards any errors from the forwarded-to method.
        #[wasm_bindgen(js_name = "calculate_recipe_mix_properties")]
        pub fn calculate_recipe_mix_properties_wasm(&self, recipe: Box<[JsValue]>) -> Result<MixProperties, JsValue> {
            let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
            self.calculate_recipe_mix_properties(&light_recipe).map_err(Into::into)
        }

        /// WASM compatible wrapper for [`Bridge::seed`]
        #[wasm_bindgen(js_name = "seed")]
        #[allow(clippy::needless_pass_by_value)]
        pub fn seed_wasm(&self, ingredients: Box<[Ingredient]>) {
            self.db.seed(&ingredients);
        }

        /// WASM compatible wrapper for [`Bridge::seed_from_specs`]
        ///
        /// # Errors
        ///
        /// Returns an [`Error`] if any of the specs cannot be converted into an [`Ingredient`]; see
        /// the forwarded-to method for more details. It may also return a `serde::Error` if the
        /// provided JS values cannot be deserialized into [`IngredientSpec`]s.
        #[wasm_bindgen(js_name = "seed_from_specs")]
        #[allow(clippy::needless_pass_by_value)]
        pub fn seed_from_specs_wasm(&self, specs: Box<[JsValue]>) -> Result<(), JsValue> {
            self.db.seed_from_specs_wasm(specs)
        }
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
        data::get_all_ingredient_specs,
        ingredient::{Ingredient, IntoIngredient},
        specs::{DairySimpleSpec, IngredientSpec},
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
        ("Rich Ice Cream SB", 1.25),
        ("Vanilla Extract", 6.0),
    ];

    fn make_seeded_db() -> IngredientDatabase {
        IngredientDatabase::new_seeded_from_specs(&get_all_ingredient_specs()).unwrap()
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
        assert_eq!(db.get_all_ingredients().len(), get_all_ingredient_specs().len());

        let bridge = Bridge::new(db);
        assert_eq!(bridge.get_all_ingredients().len(), get_all_ingredient_specs().len());
    }

    #[test]
    fn bridge_get_ingredient_by_name() {
        let bridge = Bridge::new(make_seeded_db());

        for spec in get_all_ingredient_specs() {
            let ingredient = bridge.get_ingredient_by_name(&spec.name).unwrap();
            assert_eq!(ingredient.name, spec.name);
            assert_eq!(ingredient.category, spec.category);
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
        assert_eq!(ingredients.len(), get_all_ingredient_specs().len());

        for spec in get_all_ingredient_specs() {
            assert_true!(
                ingredients
                    .iter()
                    .any(|ing| ing.name == spec.name && ing.category == spec.category)
            );
        }
    }

    #[test]
    fn bridge_get_ingredients_by_category() {
        let bridge = Bridge::new(make_seeded_db());

        for category in Category::iter() {
            let ingredients = bridge.get_ingredients_by_category(category);
            let expected_len = get_all_ingredient_specs()
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

        let ingredients = get_all_ingredient_specs()[..10]
            .iter()
            .map(|spec| spec.clone().into_ingredient().unwrap())
            .collect::<Vec<Ingredient>>();

        bridge.seed(&ingredients);
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

        let specs = get_all_ingredient_specs()[..10].to_vec();

        bridge.seed_from_specs(&specs).unwrap();
        assert_eq!(bridge.get_all_ingredients().len(), 10);

        for spec in specs {
            let fetched = bridge.get_ingredient_by_name(&spec.name).unwrap();
            assert_eq!(fetched, spec.into_ingredient().unwrap());
        }
    }

    #[test]
    fn bridge_seed_from_specs_invalid_spec() {
        let bridge = Bridge::new(IngredientDatabase::new());
        let invalid_spec = IngredientSpec {
            name: "Invalid Ingredient".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec { fat: -10.0, msnf: None }.into(),
        };

        let result = bridge.seed_from_specs(&[invalid_spec]);
        assert!(matches!(result, Err(crate::error::Error::CompositionNotPositive(_))));
    }

    #[test]
    fn bridge_has_ingredient() {
        let bridge = Bridge::new(IngredientDatabase::new());
        assert_false!(bridge.has_ingredient("Whole Milk"));

        bridge.seed(&[Ingredient {
            name: "Whole Milk".to_string(),
            category: Category::Dairy,
            composition: Composition::new(),
        }]);
        assert_true!(bridge.has_ingredient("Whole Milk"));
    }
}
