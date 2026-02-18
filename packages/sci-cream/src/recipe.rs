//! Recipe related logic, including the main [`Recipe`] struct and related types.

use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "database")]
use crate::database::IngredientDatabase;

use crate::{composition::Composition, error::Result, fpd::FPD, ingredient::Ingredient, properties::MixProperties};

#[cfg(doc)]
use crate::error::Error;

/// A simple `(String, f64)` tuple representing an ingredient name and its amount, in grams.
///
/// This is used for easier interoperability with external data sources, such as JSON and databases,
/// and notably for WASM interoperability. It cannot be used for calculations directly, since it
/// does not contain a full [`Ingredient`] struct. See [`RecipeLine`] for the full struct.
pub type LightRecipeLine = (String, f64);

/// A recipe represented as a list of ingredient names and corresponding amounts, in grams.
///
/// This is used for easier interoperability with external data sources, such as JSON and databases,
/// and notably for WASM interoperability. It cannot be used for calculations directly, since it
/// does not contain full [`Ingredient`] objects. See [`Recipe`] for the full struct.
pub type LightRecipe = [LightRecipeLine];

/// An owned version of [`LightRecipe`] for use in Rust code, since [`LightRecipeLine`] is a slice.
pub type OwnedLightRecipe = Vec<LightRecipeLine>;

/// A single line in a recipe, representing an ingredient and its amount.
///
/// This struct contains the full [`Ingredient`] object, so it can be used directly in calculations.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecipeLine {
    /// The ingredient used in this line of the recipe.
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub ingredient: Ingredient,
    /// The amount of the ingredient used in this line of the recipe, in grams.
    pub amount: f64,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl RecipeLine {
    /// Creates a new [`RecipeLine`] with the given ingredient and amount.
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new(ingredient: Ingredient, amount: f64) -> Self {
        Self { ingredient, amount }
    }
}

/// A complete recipe, consisting of an optional name and a list of [`RecipeLine`]s.
///
/// This struct contains the full [`Ingredient`] objects in its lines, so it can be used directly in
/// calculations, which are exposed as methods on the struct. See [`LightRecipe`] for a simpler
/// struct used for interoperability with external data sources.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Recipe {
    /// An optional name for the recipe.
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub name: Option<String>,
    /// The lines of the recipe, each representing an ingredient and its amount.
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub lines: Vec<RecipeLine>,
}

impl Recipe {
    /// Create a new [`Recipe`] from a [`LightRecipe`] and an [`IngredientDatabase`].
    ///
    /// This function looks up each ingredient name in the [`LightRecipe`] in the provided
    /// [`IngredientDatabase`], to convert simple the name-and-amount pairs in the [`LightRecipe`]
    /// into full [`Ingredient`] objects that can be used for calculations.
    ///
    /// This function requires the `database` feature flag, since it relies on an
    /// [`IngredientDatabase`] for ingredient lookups.
    ///
    /// # Errors
    ///
    /// This function will return an [`Error::IngredientNotFound`] if any ingredient name in the
    /// [`LightRecipe`] is not found in the provided [`IngredientDatabase`].
    #[cfg(feature = "database")]
    pub fn from_light_recipe(
        name: Option<String>,
        light_recipe: &LightRecipe,
        db: &IngredientDatabase,
    ) -> Result<Self> {
        let mut lines = Vec::with_capacity(light_recipe.len());

        for (name, amount) in light_recipe {
            lines.push(RecipeLine {
                ingredient: db.get_ingredient_by_name(name)?,
                amount: *amount,
            });
        }

        Ok(Recipe { name, lines })
    }

    /// Calculate the composition of the recipe as the combination of the compositions of its
    /// ingredients, weighted by their amounts.
    pub fn calculate_composition(&self) -> Result<Composition> {
        Composition::from_combination(
            &self
                .lines
                .iter()
                .map(|line| (line.ingredient.composition, line.amount))
                .collect::<Vec<_>>(),
        )
    }

    /// Calculate the mix properties of the recipe, including total amount, composition, and FPD.
    pub fn calculate_mix_properties(&self) -> Result<MixProperties> {
        let total_amount: f64 = self.lines.iter().map(|line| line.amount).sum();
        let composition = self.calculate_composition()?;
        let fpd = FPD::compute_from_composition(composition)?;

        Ok(MixProperties {
            total_amount,
            composition,
            fpd,
        })
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Recipe {
    /// Creates a new [`Recipe`] with the optional given name and list of [`RecipeLine`]s.
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new(name: Option<String>, lines: Vec<RecipeLine>) -> Self {
        Self { name, lines }
    }
}

/// WASM compatible wrappers for [`crate::recipe`] functions and [`Recipe`] methods.
#[cfg(feature = "wasm")]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::{Composition, MixProperties, OwnedLightRecipe, Recipe};

    /// Create an [`OwnedLightRecipe`] from a JavaScript list of ingredient name and amount pairs.
    pub fn light_recipe_from_jsvalue(recipe: JsValue) -> Result<OwnedLightRecipe, JsValue> {
        serde_wasm_bindgen::from_value::<OwnedLightRecipe>(recipe).map_err(Into::into)
    }

    #[wasm_bindgen]
    impl Recipe {
        /// WASM compatible wrapper for [`Recipe::calculate_composition`]
        #[wasm_bindgen(js_name = "calculate_composition")]
        pub fn calculate_composition_wasm(&self) -> Result<Composition, JsValue> {
            self.calculate_composition().map_err(Into::into)
        }

        /// WASM compatible wrapper for [`Recipe::calculate_mix_properties`]
        #[wasm_bindgen(js_name = "calculate_mix_properties")]
        pub fn calculate_mix_properties_wasm(&self) -> Result<MixProperties, JsValue> {
            self.calculate_mix_properties().map_err(Into::into)
        }
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::data::get_ingredient_spec_by_name;

    use super::*;
    use crate::{
        composition::CompKey, constants::COMPOSITION_EPSILON, database::IngredientDatabase, fpd::FpdKey,
        recipe::OwnedLightRecipe,
    };

    fn to_recipe_lines(lines: &[(&str, f64)]) -> Vec<RecipeLine> {
        lines
            .iter()
            .map(|(name, amount)| RecipeLine {
                ingredient: get_ingredient_spec_by_name(name).unwrap().into_ingredient().unwrap(),
                amount: *amount,
            })
            .collect::<Vec<RecipeLine>>()
    }

    fn make_test_recipe(lines: &[(&str, f64)]) -> Recipe {
        Recipe {
            name: None,
            lines: to_recipe_lines(lines),
        }
    }

    fn make_light_recipe(lines: &[(&str, f64)]) -> OwnedLightRecipe {
        lines
            .iter()
            .map(|(name, amount)| (name.to_string(), *amount))
            .collect::<OwnedLightRecipe>()
    }

    const REF_RECIPE_TUPLES: &[(&str, f64)] = &[
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

    static REF_LIGHT_RECIPE: LazyLock<OwnedLightRecipe> = LazyLock::new(|| make_light_recipe(REF_RECIPE_TUPLES));

    #[test]
    fn recipe_from_light_recipe() {
        let db = IngredientDatabase::new_seeded_from_embedded_data().unwrap();
        let light_recipe = REF_LIGHT_RECIPE.clone();

        let recipe = Recipe::from_light_recipe(None, &light_recipe, &db).unwrap();

        assert_eq!(recipe.lines.len(), light_recipe.len());

        for (line, (name, amount)) in recipe.lines.iter().zip(light_recipe.iter()) {
            assert_eq!(line.ingredient.name, *name);
            assert_eq!(line.amount, *amount);
        }
    }

    #[test]
    fn recipe_calculate_composition() {
        let recipe = make_test_recipe(&[("2% Milk", 50.0), ("Sucrose", 50.0)]);

        let mix_comp = recipe.calculate_composition().unwrap();

        assert_eq_flt_test!(mix_comp.get(CompKey::Lactose), 4.8069 / 2.0);
        assert_eq!(mix_comp.get(CompKey::Sucrose), 50.0);
        assert_eq!(mix_comp.get(CompKey::TotalSugars), (4.8069 / 2.0) + 50.0);

        assert_eq!(mix_comp.get(CompKey::TotalSolids), (10.82 / 2.0) + 50.0);
        assert_eq!(mix_comp.get(CompKey::Water), 100.0 - mix_comp.get(CompKey::TotalSolids));

        assert_eq!(mix_comp.get(CompKey::MilkFat), 1.0);
        assert_eq!(mix_comp.get(CompKey::MSNF), 8.82 / 2.0);
        assert_abs_diff_eq!(mix_comp.get(CompKey::MilkSNFS), 4.0131 / 2.0, epsilon = COMPOSITION_EPSILON);
        assert_eq!(mix_comp.get(CompKey::MilkSolids), 10.82 / 2.0);

        assert_eq!(mix_comp.get(CompKey::TotalSolids) - mix_comp.get(CompKey::MilkSolids), 50.0);
    }

    #[test]
    fn recipe_calculate_mix_properties_with_hf() {
        let recipe = make_test_recipe(REF_RECIPE_TUPLES);

        let mix_properties = recipe.calculate_mix_properties().unwrap();

        assert_eq!(mix_properties.total_amount, 611.75);

        assert_eq_flt_test!(mix_properties.get(CompKey::MilkFat.into()), 13.6024);
        assert_eq_flt_test!(mix_properties.get(CompKey::PACtotal.into()), 33.3832);
        assert_eq_flt_test!(mix_properties.get(CompKey::AbsPAC.into()), 56.6292);
        assert_eq_flt_test!(mix_properties.get(FpdKey::FPD.into()), -3.604);
        assert_eq_flt_test!(mix_properties.get(FpdKey::ServingTemp.into()), -13.3711);
        assert_eq_flt_test!(mix_properties.get(FpdKey::HardnessAt14C.into()), 76.2678);
    }

    #[test]
    fn floating_point_edge_case_zero_water_near_epsilon() {
        let mix_properties = Recipe {
            name: None,
            lines: to_recipe_lines(&[("Fructose", 10.0), ("Salt", 0.54)]),
        }
        .calculate_mix_properties()
        .unwrap();

        assert_abs_diff_eq!(mix_properties.get(CompKey::Water.into()), 0.0, epsilon = COMPOSITION_EPSILON);
        assert_true!(mix_properties.get(FpdKey::FPD.into()).is_nan());
        assert_true!(mix_properties.get(FpdKey::ServingTemp.into()).is_nan());
        assert_true!(mix_properties.get(FpdKey::HardnessAt14C.into()).is_nan());
        assert_true!(mix_properties.fpd.curves.frozen_water[0].temp.is_nan());
        assert_true!(mix_properties.fpd.curves.hardness[0].temp.is_nan());
    }
}
