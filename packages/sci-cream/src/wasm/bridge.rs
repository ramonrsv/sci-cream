use wasm_bindgen::prelude::*;

use crate::{
    composition::Composition,
    database::IngredientDatabase,
    error::Result,
    ingredient::{Category, Ingredient},
    properties::MixProperties,
    recipe::{LightRecipe, Recipe},
};

/// WASM Bridge for calculating recipe compositions and mix properties
///
/// This struct serves as a bridge between WASM and the Rust backend, attempting to keep as much of
/// the on-memory data structures and operations on the WASM side to minimize the performance
/// overhead of JS <-> WASM bridging. It holds an in-memory ingredient database for looking up
/// ingredient definitions by name, and provides methods for calculating recipe compositions and
/// mix properties from "light" recipe representations (tuples of ingredient names and amounts).
#[wasm_bindgen]
#[derive(Debug)]
pub struct Bridge {
    db: IngredientDatabase,
}

impl Bridge {
    pub fn get_ingredient_by_name(&self, name: &str) -> Result<Ingredient> {
        self.db.get_ingredient_by_name(name)
    }

    pub fn calculate_recipe_composition(&self, recipe: &LightRecipe) -> Result<Composition> {
        Recipe::from_light_recipe(None, recipe, &self.db)?.calculate_composition()
    }

    pub fn calculate_recipe_mix_properties(&self, recipe: &LightRecipe) -> Result<MixProperties> {
        Recipe::from_light_recipe(None, recipe, &self.db)?.calculate_mix_properties()
    }
}

#[wasm_bindgen]
impl Bridge {
    #[wasm_bindgen(constructor)]
    pub fn new(db: IngredientDatabase) -> Self {
        Self { db }
    }

    pub fn get_all_ingredients(&self) -> Vec<Ingredient> {
        self.db.get_all_ingredients()
    }

    pub fn get_ingredients_by_category(&self, category: Category) -> Vec<Ingredient> {
        self.db.get_ingredients_by_category(category)
    }
}

#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::Bridge;
    use crate::{
        composition::Composition, ingredient::Ingredient, properties::MixProperties,
        recipe::wasm::light_recipe_from_jsvalue,
    };

    //#[cfg_attr(feature = "wasm", wasm_bindgen)]
    #[wasm_bindgen]
    impl Bridge {
        #[wasm_bindgen(js_name = "get_ingredient_by_name")]
        pub fn get_ingredient_by_name_wasm(&self, name: &str) -> Result<Ingredient, JsValue> {
            self.db.get_ingredient_by_name_wasm(name)
        }

        /// WASM compatible wrapper for [`Bridge::calculate_recipe_composition`]
        #[wasm_bindgen(js_name = "calculate_recipe_composition")]
        pub fn calculate_recipe_composition_wasm(&self, recipe: Box<[JsValue]>) -> Result<Composition, JsValue> {
            let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
            self.calculate_recipe_composition(&light_recipe).map_err(Into::into)
        }

        /// WASM compatible wrapper for [`Bridge::calculate_recipe_mix_properties`]
        #[wasm_bindgen(js_name = "calculate_recipe_mix_properties")]
        pub fn calculate_recipe_mix_properties_wasm(&self, recipe: Box<[JsValue]>) -> Result<MixProperties, JsValue> {
            let light_recipe = light_recipe_from_jsvalue(JsValue::from(recipe))?;
            self.calculate_recipe_mix_properties(&light_recipe).map_err(Into::into)
        }
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    #[allow(unused_imports)]
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::{composition::CompKey, data::get_all_ingredient_specs};

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
        let _bridge = Bridge::new(IngredientDatabase::new());
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
    fn bridge_calculate_recipe_mix_properties() {
        let bridge = Bridge::new(make_seeded_db());
        let mix_properties = bridge
            .calculate_recipe_mix_properties(&light_recipe_to_owned(LIGHT_RECIPE))
            .unwrap();

        assert_eq_flt_test!(mix_properties.get(CompKey::MilkFat.into()), 13.6024);
    }
}
