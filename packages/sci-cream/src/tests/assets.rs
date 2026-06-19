use std::sync::LazyLock;

use crate::{
    composition::{CompKey, RatioKey},
    fpd::FpdKey,
    properties::PropKey,
    recipe::{ConstRecipe, OwnedLightRecipe},
};

pub(crate) use crate::specs::{
    alcohol::tests::*, alias::tests::*, chocolate::tests::*, composite::tests::*, dairy::tests::*, egg::tests::*,
    emulsifier::tests::*, fruit::tests::*, full::tests::*, ingredient::tests::*, micro::tests::*, nut::tests::*,
    stabilizer::tests::*, sweetener::tests::*,
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
    ("Stabilizer Blend", 1.25),
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
    ("Stabilizer Blend", 0.84),
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
    ("Stabilizer Blend", 0.9),
    ("Grand Marnier Cordon Rouge", 53.0),
];

pub(crate) static MAIN_RECIPE_LIGHT: LazyLock<OwnedLightRecipe> =
    LazyLock::new(|| make_light_recipe_from_const(MAIN_RECIPE_CONST));
pub(crate) static REF_A_RECIPE_LIGHT: LazyLock<OwnedLightRecipe> =
    LazyLock::new(|| make_light_recipe_from_const(REF_A_RECIPE_CONST));
pub(crate) static REF_B_RECIPE_LIGHT: LazyLock<OwnedLightRecipe> =
    LazyLock::new(|| make_light_recipe_from_const(REF_B_RECIPE_CONST));

pub(crate) static MAIN_RECIPE_PROPERTIES: LazyLock<Vec<(PropKey, f64)>> = LazyLock::new(|| {
    use CompKey::*;
    use FpdKey::*;
    use RatioKey::*;

    vec![
        (Energy.into(), 229.140),
        (MilkFat.into(), 13.637),
        (Lactose.into(), 4.817),
        (MSNF.into(), 8.839),
        (MilkProteins.into(), 3.094),
        (MilkSolids.into(), 22.475),
        (CocoaButter.into(), 0.778),
        (CocoaSolids.into(), 3.799),
        (Glucose.into(), 6.767),
        (Fructose.into(), 5.23),
        (TotalSugars.into(), 16.815),
        (ABV.into(), 0.358),
        (Salt.into(), 0.082),
        (TotalFats.into(), 15.2975),
        (TotalSolids.into(), 40.779),
        (Water.into(), 58.938),
        (TotalEmulsifiers.into(), 0.2648),
        (EmulsifiersPerFat.into(), 1.731),
        (TotalStabilizers.into(), 0.2043),
        (StabilizersPerWater.into(), 0.3466),
        (POD.into(), 15.234),
        (PACsgr.into(), 27.614),
        (PACmlk.into(), 3.247),
        (PACalc.into(), 2.107),
        (TotalPAC.into(), 33.446),
        (AbsPAC.into(), 56.748),
        (HF.into(), 7.538),
        (FPD.into(), -3.612),
        (ServingTemp.into(), -13.402),
        (HardnessAt14C.into(), 76.206),
    ]
});

pub(crate) static REF_A_RECIPE_PROPERTIES: LazyLock<Vec<(PropKey, f64)>> = LazyLock::new(|| {
    use CompKey::*;
    use FpdKey::*;
    use RatioKey::*;

    vec![
        (Energy.into(), 236.702),
        (MilkFat.into(), 14.929),
        (Lactose.into(), 6.086),
        (MSNF.into(), 11.167),
        (MilkProteins.into(), 3.908),
        (MilkSolids.into(), 26.096),
        (CocoaButter.into(), 0.0),
        (CocoaSolids.into(), 0.0),
        (Glucose.into(), 3.812),
        (Fructose.into(), 0.994),
        (TotalSugars.into(), 16.694),
        (ABV.into(), 0.0),
        (Salt.into(), 0.083),
        (TotalFats.into(), 16.719),
        (TotalSolids.into(), 39.850),
        (Water.into(), 60.150),
        (TotalEmulsifiers.into(), 0.5370),
        (EmulsifiersPerFat.into(), 3.2119),
        (TotalStabilizers.into(), 0.1392),
        (StabilizersPerWater.into(), 0.2314),
        (POD.into(), 11.545),
        (PACsgr.into(), 21.02),
        (PACmlk.into(), 4.103),
        (PACalc.into(), 0.0),
        (TotalPAC.into(), 25.607),
        (AbsPAC.into(), 42.572),
        (HF.into(), 0.0),
        (FPD.into(), -2.634),
        (ServingTemp.into(), -13.033),
        (HardnessAt14C.into(), 76.962),
    ]
});

pub(crate) static REF_B_RECIPE_PROPERTIES: LazyLock<Vec<(PropKey, f64)>> = LazyLock::new(|| {
    use CompKey::*;
    use FpdKey::*;
    use RatioKey::*;

    vec![
        (Energy.into(), 230.132),
        (MilkFat.into(), 14.376),
        (Lactose.into(), 6.045),
        (MSNF.into(), 11.091),
        (MilkProteins.into(), 3.881),
        (MilkSolids.into(), 25.467),
        (CocoaButter.into(), 0.0),
        (CocoaSolids.into(), 0.0),
        (Glucose.into(), 0.790),
        (Fructose.into(), 0.675),
        (TotalSugars.into(), 11.062),
        (ABV.into(), 3.687),
        (Salt.into(), 0.083),
        (TotalSolids.into(), 33.910),
        (TotalFats.into(), 16.17),
        (Water.into(), 63.158),
        (TotalEmulsifiers.into(), 0.5380),
        (EmulsifiersPerFat.into(), 3.3273),
        (TotalStabilizers.into(), 0.1495),
        (StabilizersPerWater.into(), 0.2361),
        (POD.into(), 10.336),
        (PACsgr.into(), 12.419),
        (PACmlk.into(), 4.075),
        (PACalc.into(), 21.778),
        (TotalPAC.into(), 38.758),
        (AbsPAC.into(), 61.366),
        (HF.into(), 0.0),
        (FPD.into(), -3.964),
        (ServingTemp.into(), -18.044),
        (HardnessAt14C.into(), 66.789),
    ]
});

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use super::*;

    use crate::{IngredientDatabase, Recipe, docs::assert_eq_float};

    #[test]
    fn main_recipe() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();
        let recipe = Recipe::from_light_recipe(Some("Chocolate Ice Cream".into()), &MAIN_RECIPE_LIGHT, &db).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        assert_eq!(mix_props.total_amount, 611.75);

        for (key, value) in MAIN_RECIPE_PROPERTIES.iter() {
            assert_eq_float!(mix_props.get(*key), *value);
        }
    }

    #[test]
    fn ref_a_recipe() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();
        let recipe = Recipe::from_light_recipe(Some("Standard Base".into()), &REF_A_RECIPE_LIGHT, &db).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        assert_eq!(mix_props.total_amount, 603.34);

        for (key, value) in REF_A_RECIPE_PROPERTIES.iter() {
            assert_eq_float!(mix_props.get(*key), *value);
        }
    }

    #[test]
    fn ref_b_recipe() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();
        let recipe = Recipe::from_light_recipe(Some("Grand Marnier".into()), &REF_B_RECIPE_LIGHT, &db).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        assert_eq_float!(mix_props.total_amount, 602.2);

        for (key, value) in REF_B_RECIPE_PROPERTIES.iter() {
            assert_eq_float!(mix_props.get(*key), *value);
        }
    }
}
