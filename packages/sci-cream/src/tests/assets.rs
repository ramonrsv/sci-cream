use std::sync::LazyLock;

use crate::recipe::{ConstRecipe, OwnedLightRecipe};

pub(crate) use crate::specs::{
    alcohol::tests::*, chocolate::tests::*, dairy::tests::*, egg::tests::*, fruit::tests::*, full::tests::*,
    micro::tests::*, nut::tests::*, sweetener::tests::*,
};

fn make_light_recipe_from_const(const_recipe: &ConstRecipe) -> OwnedLightRecipe {
    const_recipe
        .iter()
        .map(|(name, amount)| (name.to_string(), *amount))
        .collect::<OwnedLightRecipe>()
}

const MAIN_RECIPE_CONST: &[(&str, f64)] = &[
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

const REF_A_RECIPE_CONST: &[(&str, f64)] = &[
    ("Whole Milk", 230.0),
    ("Whipping Cream", 235.0),
    ("Skimmed Milk Powder", 35.0),
    ("Egg Yolk", 36.0),
    ("Sucrose", 35.0),
    ("Dextrose", 25.0),
    ("Fructose", 6.0),
    ("Salt", 0.5),
    ("Rich Ice Cream SB", 0.84),
];

const REF_B_RECIPE_CONST: &[(&str, f64)] = &[
    ("Whole Milk", 230.0),
    ("Whipping Cream", 225.0),
    ("Skimmed Milk Powder", 35.0),
    ("Egg Yolk", 36.0),
    ("Sucrose", 10.0),
    ("Dextrose", 2.0),
    ("Fructose", 2.0),
    ("Honey", 5.0),
    ("Splenda (Sucralose)", 2.0),
    ("SweetLeaf Stevia", 0.8),
    ("Salt", 0.5),
    ("Rich Ice Cream SB", 0.9),
    ("Grand Marnier Cordon Rouge", 53.0),
];

pub(crate) static MAIN_RECIPE_LIGHT: LazyLock<OwnedLightRecipe> =
    LazyLock::new(|| make_light_recipe_from_const(MAIN_RECIPE_CONST));
pub(crate) static REF_A_RECIPE_LIGHT: LazyLock<OwnedLightRecipe> =
    LazyLock::new(|| make_light_recipe_from_const(REF_A_RECIPE_CONST));
pub(crate) static REF_B_RECIPE_LIGHT: LazyLock<OwnedLightRecipe> =
    LazyLock::new(|| make_light_recipe_from_const(REF_B_RECIPE_CONST));

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    use crate::{CompKey::*, FpdKey::*, IngredientDatabase, Recipe, docs::assert_eq_float};

    #[test]
    fn main_recipe() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();
        let recipe = Recipe::from_light_recipe(Some("Chocolate Ice Cream".into()), &MAIN_RECIPE_LIGHT, &db).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        for (key, value) in [
            (Energy.into(), 228.865),
            (MilkFat.into(), 13.602),
            (Lactose.into(), 4.836),
            (MSNF.into(), 8.873),
            (MilkProteins.into(), 3.106),
            (MilkSolids.into(), 22.475),
            (CocoaButter.into(), 0.778),
            (CocoaSolids.into(), 3.799),
            (Glucose.into(), 6.767),
            (Fructose.into(), 5.23),
            (TotalSugars.into(), 16.834),
            (ABV.into(), 0.343),
            (Salt.into(), 0.082),
            (TotalSolids.into(), 40.779),
            (Water.into(), 58.95),
            (POD.into(), 15.237),
            (PACsgr.into(), 27.633),
            (PACmlk.into(), 3.26),
            (PACalc.into(), 2.012),
            (PACtotal.into(), 33.383),
            (AbsPAC.into(), 56.63),
            (HF.into(), 7.538),
            (FPD.into(), -3.604),
            (ServingTemp.into(), -13.371),
            (HardnessAt14C.into(), 76.268),
        ] {
            assert_eq_float!(mix_props.get(key), value);
        }
    }

    #[test]
    fn ref_a_recipe() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();
        let recipe = Recipe::from_light_recipe(Some("Standard Base".into()), &REF_A_RECIPE_LIGHT, &db).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        for (key, value) in [
            (Energy.into(), 236.387),
            (MilkFat.into(), 14.871),
            (Lactose.into(), 6.118),
            (MSNF.into(), 11.225),
            (MilkProteins.into(), 3.929),
            (MilkSolids.into(), 26.096),
            (CocoaButter.into(), 0.0),
            (CocoaSolids.into(), 0.0),
            (Glucose.into(), 3.812),
            (Fructose.into(), 0.994),
            (TotalSugars.into(), 16.725),
            (ABV.into(), 0.0),
            (Salt.into(), 0.083),
            (TotalSolids.into(), 39.850),
            (Water.into(), 60.150),
            (POD.into(), 11.550),
            (PACsgr.into(), 21.051),
            (PACmlk.into(), 4.124),
            (PACalc.into(), 0.0),
            (PACtotal.into(), 25.660),
            (AbsPAC.into(), 42.660),
            (HF.into(), 0.0),
            (FPD.into(), -2.640),
            (ServingTemp.into(), -13.056),
            (HardnessAt14C.into(), 76.912),
        ] {
            assert_eq_float!(mix_props.get(key), value);
        }
    }

    #[test]
    fn ref_b_recipe() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();
        let recipe = Recipe::from_light_recipe(Some("Grand Marnier".into()), &REF_B_RECIPE_LIGHT, &db).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        for (key, value) in [
            (Energy.into(), 228.753),
            (MilkFat.into(), 14.318),
            (Lactose.into(), 6.076),
            (MSNF.into(), 11.149),
            (MilkProteins.into(), 3.902),
            (MilkSolids.into(), 25.467),
            (CocoaButter.into(), 0.0),
            (CocoaSolids.into(), 0.0),
            (Glucose.into(), 0.790),
            (Fructose.into(), 0.675),
            (TotalSugars.into(), 11.094),
            (ABV.into(), 3.520),
            (Salt.into(), 0.083),
            (TotalSolids.into(), 33.910),
            (Water.into(), 63.312),
            (POD.into(), 10.341),
            (PACsgr.into(), 12.451),
            (PACmlk.into(), 4.096),
            (PACalc.into(), 20.638),
            (PACtotal.into(), 37.670),
            (AbsPAC.into(), 59.499),
            (HF.into(), 0.0),
            (FPD.into(), -3.813),
            (ServingTemp.into(), -17.546),
            (HardnessAt14C.into(), 67.799),
        ] {
            assert_eq_float!(mix_props.get(key), value);
        }
    }
}
