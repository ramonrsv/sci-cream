use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{composition::Composition, error::Result, fpd::FPD, ingredient::Ingredient, properties::MixProperties};

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecipeLine {
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub ingredient: Ingredient,
    pub amount: f64,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl RecipeLine {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new(ingredient: Ingredient, amount: f64) -> Self {
        Self { ingredient, amount }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Recipe {
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub name: String,
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub lines: Vec<RecipeLine>,
}

impl Recipe {
    pub fn calculate_composition(&self) -> Result<Composition> {
        Composition::from_combination(
            &self
                .lines
                .iter()
                .map(|line| (line.ingredient.composition, line.amount))
                .collect::<Vec<_>>(),
        )
    }

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
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new(name: String, lines: Vec<RecipeLine>) -> Self {
        Self { name, lines }
    }
}

#[cfg(feature = "wasm")]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::{Composition, MixProperties, Recipe};

    #[wasm_bindgen]
    impl Recipe {
        /// WASM compatible wrapper for [`Recipe::calculate_composition`]
        #[wasm_bindgen(js_name = "calculate_composition")]
        pub fn calculate_composition_wasm(&self) -> Result<Composition, JsValue> {
            self.calculate_composition()
                .map_err(|e| JsValue::from_str(&e.to_string()))
        }

        /// WASM compatible wrapper for [`Recipe::calculate_mix_properties`]
        #[wasm_bindgen(js_name = "calculate_mix_properties")]
        pub fn calculate_mix_properties_wasm(&self) -> Result<MixProperties, JsValue> {
            self.calculate_mix_properties()
                .map_err(|e| JsValue::from_str(&e.to_string()))
        }
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::data::get_ingredient_spec_by_name_or_panic;

    use super::*;
    use crate::{composition::CompKey, constants::COMPOSITION_EPSILON, fpd::FpdKey};

    fn to_recipe_lines(lines: &[(&str, f64)]) -> Vec<RecipeLine> {
        lines
            .iter()
            .map(|(name, amount)| RecipeLine {
                ingredient: get_ingredient_spec_by_name_or_panic(name).into_ingredient().unwrap(),
                amount: *amount,
            })
            .collect::<Vec<RecipeLine>>()
    }

    fn make_test_recipe(lines: &[(&str, f64)]) -> Recipe {
        Recipe {
            name: "Test Recipe".to_string(),
            lines: to_recipe_lines(lines),
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
        let recipe = make_test_recipe(&[
            ("Whole Milk", 245.0),
            ("Whipping Cream", 215.0),
            ("70% Dark Chocolate", 28.0),
            ("Skimmed Milk Powder", 21.0),
            ("Egg Yolk", 18.0),
            ("Dextrose", 45.0),
            ("Fructose", 32.0),
            ("Salt", 0.5),
            ("Rich Ice Cream SB", 1.25),
            //("Vanilla Extract", 6.0),
        ]);

        let mix_properties = recipe.calculate_mix_properties().unwrap();

        assert_eq!(mix_properties.total_amount, 605.75);

        let epsilon = 0.15;
        assert_abs_diff_eq!(mix_properties.get(CompKey::PACtotal.into()), 33.07, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(CompKey::AbsPAC.into()), 56.2, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(FpdKey::FPD.into()), -3.5, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(FpdKey::ServingTemp.into()), -14.78, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(FpdKey::HardnessAt14C.into()), 73.42, epsilon = epsilon);
    }

    #[test]
    fn floating_point_edge_case_zero_water_near_epsilon() {
        let mix_properties = Recipe {
            name: "Test".to_string(),
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
