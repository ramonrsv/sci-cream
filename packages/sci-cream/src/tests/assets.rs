use std::sync::LazyLock;

use crate::tests::asserts::shadow_asserts::assert_eq;
use crate::tests::asserts::*;

use crate::{
    composition::{CompKey, Composition, RatioKey, ToComposition},
    database::IngredientDatabase,
    fpd::FpdKey,
    properties::PropKey,
    recipe::{ConstRecipe, OwnedLightRecipe},
    resolution::IngredientGetter,
    specs::IngredientSpec,
};

pub(crate) use crate::specs::{
    alcohol::tests::*, alias::tests::*, chocolate::tests::*, composite::tests::*, dairy::tests::*, egg::tests::*,
    emulsifier::tests::*, fruit::tests::*, full::tests::*, ingredient::tests::*, micro::tests::*, nut::tests::*,
    stabilizer::tests::*, sweetener::tests::*,
};

/// Database seeded once from the compiled-in embedded JSON, shared by tests across the crate.
pub(crate) static EMBEDDED_DB: LazyLock<IngredientDatabase> =
    LazyLock::new(IngredientDatabase::new_seeded_from_embedded_data);

/// Resolve an embedded ingredient's composition by name, panicking if it is absent.
pub(crate) fn get_comp_by_name(name: &str) -> Composition {
    EMBEDDED_DB
        .get_ingredient_by_name(name)
        .unwrap_or_else(|e| panic!("missing ingredient '{name}': {e}"))
        .composition
}

/// Convert an asset's spec, checked against its [`INGREDIENT_ASSETS_TABLE`] row: the row's JSON
/// must deserialize to the spec, and the composition match the row's, where it has one.
#[track_caller]
pub(crate) fn asset_composition(spec: &IngredientSpec) -> Composition {
    let name = &spec.name;
    let (spec_str, _, expected_comp) = INGREDIENT_ASSETS_TABLE
        .iter()
        .find(|(_, row_spec, _)| row_spec.name == *name)
        .unwrap_or_else(|| panic!("missing asset '{name}' in INGREDIENT_ASSETS_TABLE"));

    let deserialized = serde_json::from_str::<IngredientSpec>(spec_str)
        .unwrap_or_else(|e| panic!("cannot deserialize asset '{name}': {e}"));
    assert_eq!(deserialized, *spec);

    let comp = spec
        .spec
        .to_composition()
        .unwrap_or_else(|e| panic!("cannot convert asset '{name}': {e}"));
    if let Some(expected_comp) = expected_comp {
        assert_eq_4dp!(&comp, expected_comp);
    }
    comp
}

/// Make a [`OwnedLightRecipe`] from a [`ConstRecipe`] (a `&[(&str, f64)]`).
fn make_light_recipe_from_const(const_recipe: &ConstRecipe) -> OwnedLightRecipe {
    const_recipe
        .iter()
        .map(|(name, amount)| (name.to_string(), *amount))
        .collect::<OwnedLightRecipe>()
}

pub(crate) const MAIN_RECIPE_CONST: &[(&str, f64)] = &[
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

pub(crate) const REF_A_RECIPE_CONST: &[(&str, f64)] = &[
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

pub(crate) const REF_B_RECIPE_CONST: &[(&str, f64)] = &[
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

/// Ice Cream Science chocolate recipe: pre-evaporation amounts (total 1089 g) expecting 150g of
/// water evaporated in cooking. De-evaporating it should reproduce [`CHOCOLATE_POST_EVAPORATION`].
pub(crate) const CHOCOLATE_PRE_EVAPORATION: &ConstRecipe = &[
    ("Double Cream", 417.0),
    ("Skim Milk", 319.0),
    ("Skimmed Milk Powder", 46.0),
    ("Sucrose", 140.0),
    ("Egg Yolk", 78.0),
    ("Cocoa Powder, 17% Fat", 30.0),
    ("70% Dark Chocolate", 50.0),
    ("Salt", 3.0),
    ("Vanilla Extract", 5.0),
    ("Instant Coffee", 1.0),
];

/// The hand-balanced post-evaporation formulation of the chocolate recipe (total 939 g), the
/// reference for [`CHOCOLATE_PRE_EVAPORATION`]'s `evaporation: 150` behaviour, evaporating 150g.
pub(crate) const CHOCOLATE_POST_EVAPORATION: &ConstRecipe = &[
    ("Double Cream", 417.0),
    ("Skim Milk", 153.55),
    ("Skimmed Milk Powder", 61.45),
    ("Sucrose", 140.0),
    ("Egg Yolk", 78.0),
    ("Cocoa Powder, 17% Fat", 30.0),
    ("70% Dark Chocolate", 50.0),
    ("Salt", 3.0),
    ("Vanilla Extract", 5.0),
    ("Instant Coffee", 1.0),
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
        (Energy.into(), 230.042_607),
        (MilkSolids.into(), 22.475_419),
        (MilkFat.into(), 13.636_698),
        (MSNF.into(), 8.838_721),
        (MilkSugars.into(), 4.817_103),
        (MilkSNFS.into(), 4.021_618),
        (MilkProteins.into(), 3.31452),
        (Casein.into(), 2.651_616),
        (Whey.into(), 0.662_904),
        (MilkMinerals.into(), 0.707_098),
        (CacaoSolids.into(), 4.439_722),
        (CocoaButter.into(), 0.778_096),
        (CocoaSolids.into(), 3.661_626),
        (EggSolids.into(), 1.441_765),
        (EggFat.into(), 0.882_714),
        (EggSNF.into(), 0.559_052),
        (EggProteins.into(), 0.470_781),
        (YolkProteins.into(), 0.470_781),
        (OtherSNFS.into(), 0.286_065),
        (TotalSolids.into(), 40.641_336),
        (TotalFats.into(), 15.297_507),
        (TotalSNF.into(), 25.343_829),
        (TotalSNFS.into(), 8.528_361),
        (TotalProteins.into(), 4.645_783),
        (TotalMinerals.into(), 1.067_114),
        (Water.into(), 59.075_118),
        (TotalCarbohydrates.into(), 19.542_661),
        (TotalFiber.into(), 1.588_427),
        (TotalSugars.into(), 16.815_468),
        (Glucose.into(), 6.76747),
        (Fructose.into(), 5.230_895),
        (Lactose.into(), 4.817_103),
        (TotalSweeteners.into(), 16.815_468),
        (Salt.into(), 0.081_733),
        (TotalStabilizers.into(), 0.204_332),
        (LocustBeanGum.into(), 0.116_761),
        (GuarGum.into(), 0.058_381),
        (Carrageenans.into(), 0.02919),
        (TotalEmulsifiers.into(), 0.273_935),
        (Lecithin.into(), 0.273_935),
        (Alcohol.into(), 0.283_546),
        (ABV.into(), 0.357_912),
        (POD.into(), 15.234_161),
        (NetPAC.into(), 26.155_049),
        (TotalPAC.into(), 33.446_262),
        (PACsgr.into(), 27.613_997),
        (PACslt.into(), 0.478_136),
        (PACmlk.into(), 3.247_382),
        (PACalc.into(), 2.106_747),
        (HF.into(), 7.291_214),
        (SaturatedFat.into(), 9.577_871),
        (TransFat.into(), 0.477_284),
        (AbsPAC.into(), 56.616_497),
        (AbsNetPAC.into(), 44.274_222),
        (EmulsifiersPerFat.into(), 1.790_719),
        (StabilizersPerWater.into(), 0.345_885),
        (FPD.into(), -3.603_155),
        (ServingTemp.into(), -13.486_459),
        (HardnessAt14C.into(), 76.040_405),
    ]
});

pub(crate) static REF_A_RECIPE_PROPERTIES: LazyLock<Vec<(PropKey, f64)>> = LazyLock::new(|| {
    use CompKey::*;
    use FpdKey::*;
    use RatioKey::*;

    vec![
        (Energy.into(), 237.81849),
        (MilkSolids.into(), 26.096_355),
        (MilkFat.into(), 14.929_393),
        (MSNF.into(), 11.166_962),
        (MilkSugars.into(), 6.085_994),
        (MilkSNFS.into(), 5.080_968),
        (MilkProteins.into(), 4.187_611),
        (Casein.into(), 3.350_089),
        (Whey.into(), 0.837_522),
        (MilkMinerals.into(), 0.893_357),
        (CocoaButter.into(), 0.0),
        (CocoaSolids.into(), 0.0),
        (EggSolids.into(), 2.923_725),
        (EggFat.into(), 1.790_035),
        (EggSNF.into(), 1.133_689),
        (EggProteins.into(), 0.954_686),
        (YolkProteins.into(), 0.954_686),
        (OtherSNFS.into(), 0.222_097),
        (TotalSolids.into(), 39.849_794),
        (TotalFats.into(), 16.719_429),
        (TotalSNF.into(), 23.130_366),
        (TotalSNFS.into(), 6.436_754),
        (TotalProteins.into(), 5.142_296),
        (TotalMinerals.into(), 0.976_229),
        (Water.into(), 60.150_206),
        (TotalCarbohydrates.into(), 16.832_837),
        (TotalFiber.into(), 0.139_225),
        (TotalSugars.into(), 16.693_612),
        (Glucose.into(), 3.812_113),
        (Fructose.into(), 0.994_464),
        (Sucrose.into(), 5.801_041),
        (Lactose.into(), 6.085_994),
        (TotalSweeteners.into(), 16.693_612),
        (Salt.into(), 0.082_872),
        (TotalStabilizers.into(), 0.139_225),
        (LocustBeanGum.into(), 0.079_557),
        (GuarGum.into(), 0.039_779),
        (Carrageenans.into(), 0.019_889),
        (TotalEmulsifiers.into(), 0.555_508),
        (Lecithin.into(), 0.555_508),
        (ABV.into(), 0.0),
        (POD.into(), 11.544_913),
        (NetPAC.into(), 25.60712),
        (TotalPAC.into(), 25.60712),
        (PACsgr.into(), 21.019_531),
        (PACslt.into(), 0.484_801),
        (PACmlk.into(), 4.102_787),
        (PACalc.into(), 0.0),
        (HF.into(), 0.0),
        (SaturatedFat.into(), 10.205_315),
        (TransFat.into(), 0.522_529),
        (AbsPAC.into(), 42.571_957),
        (AbsNetPAC.into(), 42.571_957),
        (EmulsifiersPerFat.into(), 3.322_528),
        (StabilizersPerWater.into(), 0.231_462),
        (FPD.into(), -2.634_317),
        (ServingTemp.into(), -13.032_522),
        (HardnessAt14C.into(), 76.961_689),
    ]
});

pub(crate) static REF_B_RECIPE_PROPERTIES: LazyLock<Vec<(PropKey, f64)>> = LazyLock::new(|| {
    use CompKey::*;
    use FpdKey::*;
    use RatioKey::*;

    vec![
        (Energy.into(), 231.240_999),
        (MilkSolids.into(), 25.467_411),
        (MilkFat.into(), 14.376_453),
        (MSNF.into(), 11.090_958),
        (MilkSugars.into(), 6.044_572),
        (MilkSNFS.into(), 5.046_386),
        (MilkProteins.into(), 4.159_109),
        (Casein.into(), 3.327_287),
        (Whey.into(), 0.831_822),
        (MilkMinerals.into(), 0.887_277),
        (CocoaButter.into(), 0.0),
        (CocoaSolids.into(), 0.0),
        (EggSolids.into(), 2.929_259),
        (EggFat.into(), 1.793_424),
        (EggSNF.into(), 1.135_835),
        (EggProteins.into(), 0.956_493),
        (YolkProteins.into(), 0.956_493),
        (OtherSNFS.into(), 0.496_008),
        (TotalSolids.into(), 33.910_453),
        (TotalFats.into(), 16.169_877),
        (TotalSNF.into(), 17.740_576),
        (TotalSNFS.into(), 6.678_229),
        (TotalProteins.into(), 5.115_602),
        (TotalMinerals.into(), 0.970_306),
        (Water.into(), 63.158_427),
        (TotalCarbohydrates.into(), 11.45613),
        (TotalFiber.into(), 0.26532),
        (Inulin.into(), 0.115_868),
        (TotalSugars.into(), 11.062_347),
        (Glucose.into(), 0.789_718),
        (Fructose.into(), 0.675_138),
        (Galactose.into(), 0.012_454),
        (Sucrose.into(), 3.528_011),
        (Lactose.into(), 6.044_572),
        (Maltose.into(), 0.012_454),
        (TotalArtificial.into(), 0.010_893),
        (Sucralose.into(), 0.004_384),
        (Steviosides.into(), 0.006_509),
        (TotalSweeteners.into(), 11.07324),
        (Salt.into(), 0.083_029),
        (TotalStabilizers.into(), 0.149_452),
        (LocustBeanGum.into(), 0.085_401),
        (GuarGum.into(), 0.042_701),
        (Carrageenans.into(), 0.02135),
        (TotalEmulsifiers.into(), 0.556_559),
        (Lecithin.into(), 0.556_559),
        (Alcohol.into(), 2.931_119),
        (ABV.into(), 3.686_768),
        (POD.into(), 10.33632),
        (NetPAC.into(), 38.757_625),
        (TotalPAC.into(), 38.757_625),
        (PACsgr.into(), 12.418_827),
        (PACslt.into(), 0.485_719),
        (PACmlk.into(), 4.074_863),
        (PACalc.into(), 21.778_216),
        (HF.into(), 0.0),
        (SaturatedFat.into(), 9.846_853),
        (TransFat.into(), 0.503_176),
        (AbsPAC.into(), 61.365_722),
        (AbsNetPAC.into(), 61.365_722),
        (EmulsifiersPerFat.into(), 3.441_951),
        (StabilizersPerWater.into(), 0.23663),
        (FPD.into(), -3.96381),
        (ServingTemp.into(), -18.044_193),
        (HardnessAt14C.into(), 66.788_505),
    ]
});

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused)]
    use crate::tests::asserts::*;

    use crate::tests::util::{AssertKeys, relative_diff_percent};

    use super::*;
    use crate::{Recipe, asserts::assert_eq_flt};

    #[test]
    #[should_panic(expected = "missing asset 'Not An Asset' in INGREDIENT_ASSETS_TABLE")]
    fn asset_composition_requires_a_table_row() {
        let _ = asset_composition(&IngredientSpec {
            name: "Not An Asset".to_string(),
            ..ING_SPEC_MICRO_SALT.clone()
        });
    }

    #[test]
    fn main_recipe() {
        let recipe =
            Recipe::from_light_recipe(Some("Chocolate Ice Cream".into()), &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        assert_eq!(mix_props.total_amount, 611.75);

        mix_props.assert_all_keys(&MAIN_RECIPE_PROPERTIES);
    }

    #[test]
    fn ref_a_recipe() {
        let recipe =
            Recipe::from_light_recipe(Some("Standard Base".into()), &REF_A_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        assert_eq!(mix_props.total_amount, 603.34);

        mix_props.assert_all_keys(&REF_A_RECIPE_PROPERTIES);
    }

    #[test]
    fn ref_b_recipe() {
        let recipe =
            Recipe::from_light_recipe(Some("Grand Marnier".into()), &REF_B_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let mix_props = recipe.calculate_mix_properties().unwrap();

        assert_eq_flt!(mix_props.total_amount, 602.2);

        mix_props.assert_all_keys(&REF_B_RECIPE_PROPERTIES);
    }

    #[test]
    fn chocolate_evaporation_fixtures_have_expected_totals() {
        let pre_total: f64 = CHOCOLATE_PRE_EVAPORATION.iter().map(|(_, g)| g).sum();
        let post_total: f64 = CHOCOLATE_POST_EVAPORATION.iter().map(|(_, g)| g).sum();

        assert_eq!(pre_total, 1089.0);
        assert_eq!(post_total, 939.0);
        assert_eq!(pre_total - post_total, 150.0);
    }

    #[test]
    fn chocolate_post_evaporation_rehydrates_to_pre() {
        let pre = Recipe::from_const_recipe(None, CHOCOLATE_PRE_EVAPORATION, &EMBEDDED_DB).unwrap();

        let rehydrated_lines = [CHOCOLATE_POST_EVAPORATION, &[("Water", 150.0)]].concat();
        let rehydrated = Recipe::from_const_recipe(None, &rehydrated_lines, &EMBEDDED_DB).unwrap();

        assert_eq!(
            rehydrated.calculate_mix_properties().unwrap().total_amount,
            pre.calculate_mix_properties().unwrap().total_amount
        );

        let pre_comp = pre.calculate_composition().unwrap();
        let rehydrated_comp = rehydrated.calculate_composition().unwrap();
        for key in CompKey::iter() {
            let (rehydrated_val, pre_val) = (rehydrated_comp.get(key), pre_comp.get(key));
            assert_eq_flt!(rehydrated_val, pre_val, epsilon = 0.11);
            assert!(relative_diff_percent(rehydrated_val, pre_val) < 0.1);
        }
    }
}
