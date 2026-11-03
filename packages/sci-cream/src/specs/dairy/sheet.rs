//! [`DairySheetSpec`] and associated implementations, for dairy ingredients from spec sheets

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fats, MilkProteins, MilkSolids, PAC, SimpleSolids, Solids, Sugars, ToComposition,
    },
    constants::{
        composition::dairy::{STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT, SolidsSource},
        pac,
    },
    error::Result,
    specs::dairy::util::{estimate_minerals, make_milk_proteins, split_milk_sugars},
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::{
    composition::CompKey,
    constants::composition::dairy::minerals_in_snf,
    specs::{DairyLabelSpec, DairySimpleSpec},
};

/// Spec for dairy ingredients from spec sheets and food composition databases, per 100 g
///
/// This spec is suitable for dairy ingredients that have detailed compositional information,
/// including water, fat, protein, sugars, ash, etc. These most often come from food composition
/// databases, like the [USDA FoodData Central](https://fdc.nal.usda.gov/) database, or from
/// suppliers' specification sheets. It makes the fewest assumptions about the composition beyond
/// what is explicitly listed, and as such provides few defaults and requires comprehensive input.
///
/// See [`DairySimpleSpec`] for a simpler spec that infers most of the composition from standard
/// values, and [`DairyLabelSpec`] for a spec that is suitable for nutrition facts labels, as well
/// as some spec sheets that don't provide the water content - the anchor for solids calculations.
///
/// Values are as-is, in grams per 100 g. Where sheets list typical values beside min/max
/// limits, use the typical values, or the midpoints of typical ranges. Values given on a dry basis
/// should be converted to as-is using the water content, as: `as-is = dry × (100 - water) / 100`.
///
/// **Note:** The solids non-fat are the greater of `100 - water - fat - added_sugars` and
/// `milk_sugars + protein + ash`. If the latter is greater, the difference is subtracted from the
/// water; this can happen as proximates measured apart rarely sum to exactly 100 g. An unlisted
/// [`ash`](Self::ash) is modeled up to what the water leaves, so it never lowers the water. In
/// contrast, [`DairyLabelSpec`] lacks the water, so it estimates the solids non-fat from the sugars
/// and protein plus the minerals modeled for the solids source, and the water is what remains.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySheetSpec {
    /// Water content, in grams per 100 g; spec sheets usually list it as moisture
    ///
    /// Water content determines the solids non-fat as `100 - water - fat - added_sugars`, unless
    /// `milk_sugars + protein + ash` is greater, when the difference is subtracted from the water.
    pub water: f64,
    /// Energy per 100 g, in kcal; calculated based on macronutrients composition if unspecified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub energy: Option<f64>,
    /// Total fat content, in grams per 100 g; wholly counted as butterfat (milk fat)
    pub fat: f64,
    /// Saturated fat content, in grams per 100 g; it must be a subset of [`fat`](Self::fat).
    ///
    /// If unspecified, it is calculated as [`STD_SATURATED_FAT_IN_MILK_FAT`] of [`fat`](Self::fat).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saturated_fat: Option<f64>,
    /// Trans fat content, in grams per 100 g; it must be a subset of [`fat`](Self::fat).
    ///
    /// If unspecified, it is calculated as [`STD_TRANS_FAT_IN_MILK_FAT`] of [`fat`](Self::fat).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trans_fat: Option<f64>,
    /// Sugar content and composition breakdown of mono- and disaccharides, in grams per 100 g
    ///
    /// This allows a detailed breakdown of the sugars composition, although only a few combinations
    /// occur in dairy. For typical dairy products, `lactose` should be the only listed sugar.
    /// Lactose-free products should list either all or part of the lactose as a 50/50 split of
    /// glucose and galactose, the two constituent monosaccharides that it is enzymatically broken
    /// down into (Goff & Hartel, 2025, pp. 35, 422)[^20]. These are all counted as milk sugars, as
    /// part of [`Solids::milk`]. Any other sugars, typically added `sucrose`, e.g. in sweetened
    /// condensed milk, should be included and are counted as [`Solids::other`].
    #[doc = include_str!("../../../docs/references/index/20.md")]
    pub sugars: Sugars,
    /// Protein content, in grams per 100 g, as-is rather than on a dry basis
    ///
    /// This is [crude protein](crate::docs#crude-and-true-protein), as sheets list it.
    ///
    /// The detailed breakdown of the proteins is determined by [`casein`](Self::casein), if listed,
    /// or else by [`solids_source`](Self::solids_source).
    pub protein: f64,
    /// Casein content, in grams per 100 g, if listed; a subset of [`protein`](Self::protein)
    ///
    /// If specified, it replaces the casein share that [`solids_source`](Self::solids_source)
    /// gives, and whey makes up the rest of the protein, non-protein nitrogen included.
    /// See [crude and true protein](crate::docs#crude-and-true-protein) for more details.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub casein: Option<f64>,
    /// Ash or mineral content, in grams per 100 g, if listed
    ///
    /// The milk solids' minerals, [`CompKey::MilkMinerals`], are the listed ash or, if unlisted,
    /// those modeled for the [`solids_source`](Self::solids_source), see [`minerals_in_snf`], up to
    /// what the solids non-fat leave after the milk sugars and [`protein`](Self::protein). The rest
    /// of the solids non-fat, e.g. organic acids, are other milk solids.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ash: Option<f64>,
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein composition of the solids non-fat, unless
    /// [`casein`](Self::casein) is listed. Without a listed [`ash`](Self::ash), it also sets the
    /// minerals modeled for them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solids_source: Option<SolidsSource>,
}

impl ToComposition for DairySheetSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            water,
            energy,
            fat,
            saturated_fat,
            trans_fat,
            sugars,
            protein,
            casein,
            ash,
            solids_source,
        } = *self;

        let saturated_fat = saturated_fat.unwrap_or(STD_SATURATED_FAT_IN_MILK_FAT * fat);
        let trans_fat = trans_fat.unwrap_or(STD_TRANS_FAT_IN_MILK_FAT * fat);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        sugars.validate()?;

        verify_are_positive(&[
            water,
            fat,
            saturated_fat,
            trans_fat,
            protein,
            casein.unwrap_or(0.0),
            ash.unwrap_or(0.0),
        ])?;
        verify_is_within_100_percent(water + fat + sugars.total() + protein)?;
        verify_is_subset(saturated_fat, fat, "saturated_fat <= fat")?;
        verify_is_subset(trans_fat, fat, "trans_fat <= fat")?;
        verify_is_subset(casein.unwrap_or(0.0), protein, "casein <= protein")?;

        let (milk_sugars, other_sugars) = split_milk_sugars(sugars);
        let snf_by_water = 100.0 - water - fat - other_sugars.total();

        let estimated_minerals = estimate_minerals(snf_by_water, protein, solids_source);
        let minerals_by_diff = snf_by_water - milk_sugars.total() - protein;

        let minerals = ash.unwrap_or_else(|| f64::min(estimated_minerals, minerals_by_diff));
        let snf_by_solids = milk_sugars.total() + protein + minerals;

        let snf = f64::max(snf_by_water, snf_by_solids);

        let proteins = match casein {
            Some(casein) => MilkProteins::new().casein(casein).whey(protein - casein),
            None => make_milk_proteins(protein, protein / snf, solids_source)?,
        };

        let milk_solids = MilkSolids::new()
            .fats(Fats::new().total(fat).saturated(saturated_fat).trans(trans_fat))
            .carbohydrates(Carbohydrates::new().sugars(milk_sugars))
            .proteins(proteins)
            .minerals(minerals)
            .others_from_total(fat + snf)?;

        let other_solids = SimpleSolids::new().carbohydrates(Carbohydrates::new().sugars(other_sugars));

        Composition::new()
            .energy(energy.unwrap_or(milk_solids.energy()? + other_solids.energy()?))
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(sugars.to_pac()?)
                    .msnf_ws_salts(snf * pac::MSNF_WS_SALTS / 100.0),
            )
            .validate_into()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::{assets::asset_composition, util::AssertKeys};

    use super::*;
    use crate::{
        composition::{CompKey, SolidsBreakdown},
        error::Error,
        ingredient::Category,
        specs::{IngredientSpec, TaggedSpec},
    };

    // https://fdc.nal.usda.gov/food-details/746782/nutrients
    pub(crate) const ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA_STR: &str = r#"{
      "name": "USDA Whole Milk",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 88.1,
        "energy": 61,
        "fat": 3.2,
        "saturated_fat": 1.86,
        "trans_fat": 0.112,
        "sugars": { "lactose": 4.81 },
        "protein": 3.27,
        "ash": 0.8
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Whole Milk".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 88.1,
                energy: Some(61.0),
                fat: 3.2,
                saturated_fat: Some(1.86),
                trans_fat: Some(0.112),
                sugars: Sugars::new().lactose(4.81),
                protein: 3.27,
                casein: None,
                ash: Some(0.8),
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_MILK_USDA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.2).saturated(1.86).trans(0.112))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.81)))
                        .proteins(MilkProteins::new().casein(2.616).whey(0.654))
                        .minerals(0.8),
                ),
            )
            .pod(0.7696)
            .pac(PAC::new().sugars(4.81).msnf_ws_salts(3.2625))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_whole_milk_usda() {
        // Its proximates sum to 100.18 g, so the water gives way to the listed solids, to 87.92 g
        let comp = asset_composition(&ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA);

        comp.assert_all_keys(&[
            (CompKey::Energy, 61.0),
            (CompKey::MilkSolids, 12.08),
            (CompKey::MilkFat, 3.2),
            (CompKey::MSNF, 8.88),
            (CompKey::MilkSugars, 4.81),
            (CompKey::MilkSNFS, 4.07),
            (CompKey::MilkProteins, 3.27),
            (CompKey::Casein, 2.616),
            (CompKey::Whey, 0.654),
            (CompKey::MilkMinerals, 0.8),
            (CompKey::TotalSolids, 12.08),
            (CompKey::TotalFats, 3.2),
            (CompKey::TotalSNF, 8.88),
            (CompKey::TotalSNFS, 4.07),
            (CompKey::TotalProteins, 3.27),
            (CompKey::TotalMinerals, 0.8),
            (CompKey::Water, 87.92),
            (CompKey::TotalCarbohydrates, 4.81),
            (CompKey::TotalSugars, 4.81),
            (CompKey::Lactose, 4.81),
            (CompKey::TotalSweeteners, 4.81),
            (CompKey::POD, 0.7696),
            (CompKey::NetPAC, 8.072_548),
            (CompKey::TotalPAC, 8.072_548),
            (CompKey::PACsgr, 4.81),
            (CompKey::PACmlk, 3.262_548),
            (CompKey::SaturatedFat, 1.86),
            (CompKey::TransFat, 0.112),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/2705400/nutrients
    pub(crate) const ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA_STR: &str = r#"{
      "name": "USDA 2% Reduced-Fat Evaporated Milk",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 78,
        "energy": 92,
        "fat": 1.96,
        "saturated_fat": 1.214,
        "sugars": { "lactose": 11.15 },
        "protein": 7.42
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA 2% Reduced-Fat Evaporated Milk".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 78.0,
                energy: Some(92.0),
                fat: 1.96,
                saturated_fat: Some(1.214),
                trans_fat: None,
                sugars: Sugars::new().lactose(11.15),
                protein: 7.42,
                casein: None,
                ash: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_EVAPORATED_MILK_USDA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(92.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.96).saturated(1.214).trans(0.0686))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(11.15)))
                        .proteins(MilkProteins::new().casein(5.936).whey(1.484))
                        .minerals(1.47),
                ),
            )
            .pod(1.784)
            .pac(PAC::new().sugars(11.15).msnf_ws_salts(7.3628))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_2_evaporated_milk_usda() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA);

        comp.assert_all_keys(&[
            (CompKey::Energy, 92.0),
            (CompKey::MilkSolids, 22.0),
            (CompKey::MilkFat, 1.96),
            (CompKey::MSNF, 20.04),
            (CompKey::MilkSugars, 11.15),
            (CompKey::MilkSNFS, 8.89),
            (CompKey::MilkProteins, 7.42),
            (CompKey::Casein, 5.936),
            (CompKey::Whey, 1.484),
            (CompKey::MilkMinerals, 1.47),
            (CompKey::TotalSolids, 22.0),
            (CompKey::TotalFats, 1.96),
            (CompKey::TotalSNF, 20.04),
            (CompKey::TotalSNFS, 8.89),
            (CompKey::TotalProteins, 7.42),
            (CompKey::TotalMinerals, 1.47),
            (CompKey::Water, 78.0),
            (CompKey::TotalCarbohydrates, 11.15),
            (CompKey::TotalSugars, 11.15),
            (CompKey::Lactose, 11.15),
            (CompKey::TotalSweeteners, 11.15),
            (CompKey::POD, 1.784),
            (CompKey::NetPAC, 18.512_777),
            (CompKey::TotalPAC, 18.512_777),
            (CompKey::PACsgr, 11.15),
            (CompKey::PACmlk, 7.362_777),
            (CompKey::SaturatedFat, 1.214),
            (CompKey::TransFat, 0.0686),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/171275/nutrients
    // https://fdc.nal.usda.gov/food-details/2758990/nutrients
    pub(crate) const ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA_STR: &str = r#"{
      "name": "USDA Sweetened Condensed Milk",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 27.2,
        "energy": 321,
        "fat": 8.7,
        "saturated_fat": 5.49,
        "sugars": { "lactose": 9.6, "sucrose": 44.8 },
        "protein": 7.91,
        "ash": 1.83
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 27.2,
                energy: Some(321.0),
                fat: 8.7,
                saturated_fat: Some(5.49),
                trans_fat: None,
                sugars: Sugars::new().lactose(9.6).sucrose(44.8),
                protein: 7.91,
                casein: None,
                ash: Some(1.83),
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SWEETENED_CONDENSED_MILK_USDA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(321.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(8.7).saturated(5.49).trans(0.3045))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(9.6)))
                            .proteins(MilkProteins::new().casein(6.328).whey(1.582))
                            .minerals(1.83),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(44.8))),
                    ),
            )
            .pod(46.336)
            .pac(PAC::new().sugars(54.4).msnf_ws_salts(7.1056))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_sweetened_condensed_milk_usda() {
        // Its proximates sum to 100.04 g, so the water gives way to the listed solids, to 27.16 g
        let comp = asset_composition(&ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA);

        comp.assert_all_keys(&[
            (CompKey::Energy, 321.0),
            (CompKey::MilkSolids, 28.04),
            (CompKey::MilkFat, 8.7),
            (CompKey::MSNF, 19.34),
            (CompKey::MilkSugars, 9.6),
            (CompKey::MilkSNFS, 9.74),
            (CompKey::MilkProteins, 7.91),
            (CompKey::Casein, 6.328),
            (CompKey::Whey, 1.582),
            (CompKey::MilkMinerals, 1.83),
            (CompKey::TotalSolids, 72.84),
            (CompKey::TotalFats, 8.7),
            (CompKey::TotalSNF, 64.14),
            (CompKey::TotalSNFS, 9.74),
            (CompKey::TotalProteins, 7.91),
            (CompKey::TotalMinerals, 1.83),
            (CompKey::Water, 27.16),
            (CompKey::TotalCarbohydrates, 54.4),
            (CompKey::TotalSugars, 54.4),
            (CompKey::Sucrose, 44.8),
            (CompKey::Lactose, 9.6),
            (CompKey::TotalSweeteners, 54.4),
            (CompKey::POD, 46.336),
            (CompKey::NetPAC, 61.505_594),
            (CompKey::TotalPAC, 61.505_594),
            (CompKey::PACsgr, 54.4),
            (CompKey::PACmlk, 7.105_594),
            (CompKey::SaturatedFat, 5.49),
            (CompKey::TransFat, 0.3045),
        ]);
    }

    /// (USDEC, 2003, Table 6, pp. 51-52)[^91]
    #[doc = include_str!("../../../docs/references/index/91.md")]
    pub(crate) const ING_SPEC_DAIRY_SHEET_WPC_80_USDEC_STR: &str = r#"{
      "name": "USDEC Whey Protein Concentrate 80%",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 4.11,
        "energy": 412,
        "fat": 6.6,
        "sugars": { "lactose": 5.31 },
        "protein": 80,
        "ash": 3.98,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_WPC_80_USDEC: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "USDEC Whey Protein Concentrate 80%".to_string(),
        category: Category::Dairy,
        spec: DairySheetSpec {
            water: 4.11,
            energy: Some(412.0),
            fat: 6.6,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(5.31),
            protein: 80.0,
            casein: None,
            ash: Some(3.98),
            solids_source: Some(SolidsSource::Whey),
        }
        .into(),
    });

    pub(crate) static COMP_WPC_80_USDEC: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(412.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(6.6).saturated(4.29).trans(0.231))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.31)))
                        .proteins(MilkProteins::new().whey(80.0))
                        .minerals(3.98),
                ),
            )
            .pod(0.8496)
            .pac(PAC::new().sugars(5.31).msnf_ws_salts(32.8055))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_wpc_80_usdec() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SHEET_WPC_80_USDEC);

        comp.assert_all_keys(&[
            (CompKey::Energy, 412.0),
            (CompKey::MilkSolids, 95.89),
            (CompKey::MilkFat, 6.6),
            (CompKey::MSNF, 89.29),
            (CompKey::MilkSugars, 5.31),
            (CompKey::MilkSNFS, 83.98),
            (CompKey::MilkProteins, 80.0),
            (CompKey::Casein, 0.0),
            (CompKey::Whey, 80.0),
            (CompKey::MilkMinerals, 3.98),
            (CompKey::TotalSolids, 95.89),
            (CompKey::TotalFats, 6.6),
            (CompKey::TotalSNF, 89.29),
            (CompKey::TotalSNFS, 83.98),
            (CompKey::TotalProteins, 80.0),
            (CompKey::TotalMinerals, 3.98),
            (CompKey::Water, 4.11),
            (CompKey::TotalCarbohydrates, 5.31),
            (CompKey::TotalSugars, 5.31),
            (CompKey::Lactose, 5.31),
            (CompKey::TotalSweeteners, 5.31),
            (CompKey::POD, 0.8496),
            (CompKey::NetPAC, 38.115_508),
            (CompKey::TotalPAC, 38.115_508),
            (CompKey::PACsgr, 5.31),
            (CompKey::PACmlk, 32.805_508),
            (CompKey::SaturatedFat, 4.29),
            (CompKey::TransFat, 0.231),
        ]);
    }

    // https://www.hilmar.com/wp-content/uploads/2023/07/Hilmar-9000-WPI.pdf
    pub(crate) const ING_SPEC_DAIRY_SHEET_WPI_HILMAR_STR: &str = r#"{
      "name": "Hilmar 9000 Whey Protein Isolate",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 4.5,
        "energy": 372,
        "fat": 0.5,
        "sugars": { "lactose": 1 },
        "protein": 89,
        "ash": 2.5,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_WPI_HILMAR: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Hilmar 9000 Whey Protein Isolate".to_string(),
        category: Category::Dairy,
        spec: DairySheetSpec {
            water: 4.5,
            energy: Some(372.0),
            fat: 0.5,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(1.0),
            protein: 89.0,
            casein: None,
            ash: Some(2.5),
            solids_source: Some(SolidsSource::Whey),
        }
        .into(),
    });

    pub(crate) static COMP_WPI_HILMAR: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(372.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.5).saturated(0.325).trans(0.0175))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(1.0)))
                        .proteins(MilkProteins::new().whey(89.0))
                        .minerals(2.5)
                        .others(2.5),
                ),
            )
            .pod(0.16)
            .pac(PAC::new().sugars(1.0).msnf_ws_salts(34.9034))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_wpi_hilmar() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SHEET_WPI_HILMAR);

        comp.assert_all_keys(&[
            (CompKey::Energy, 372.0),
            (CompKey::MilkSolids, 95.5),
            (CompKey::MilkFat, 0.5),
            (CompKey::MSNF, 95.0),
            (CompKey::MilkSugars, 1.0),
            (CompKey::MilkSNFS, 94.0),
            (CompKey::MilkProteins, 89.0),
            (CompKey::Casein, 0.0),
            (CompKey::Whey, 89.0),
            (CompKey::MilkMinerals, 2.5),
            (CompKey::TotalSolids, 95.5),
            (CompKey::TotalFats, 0.5),
            (CompKey::TotalSNF, 95.0),
            (CompKey::TotalSNFS, 94.0),
            (CompKey::TotalProteins, 89.0),
            (CompKey::TotalMinerals, 2.5),
            (CompKey::Water, 4.5),
            (CompKey::TotalCarbohydrates, 1.0),
            (CompKey::TotalSugars, 1.0),
            (CompKey::Lactose, 1.0),
            (CompKey::TotalSweeteners, 1.0),
            (CompKey::POD, 0.16),
            (CompKey::NetPAC, 35.903_385),
            (CompKey::TotalPAC, 35.903_385),
            (CompKey::PACsgr, 1.0),
            (CompKey::PACmlk, 34.903_385),
            (CompKey::SaturatedFat, 0.325),
            (CompKey::TransFat, 0.0175),
        ]);
    }

    /// The control powder (Kommineni et al., 2022, Tables 1-2)[^101]
    #[doc = include_str!("../../../docs/references/index/101.md")]
    pub(crate) const ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI_STR: &str = r#"{
      "name": "Kommineni Micellar Casein Concentrate 80%",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 4.49,
        "fat": 2.98,
        "sugars": { "lactose": 5.13 },
        "protein": 79.25,
        "casein": 71.74,
        "ash": 8.15,
        "solids_source": "MicellarCasein"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Kommineni Micellar Casein Concentrate 80%".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 4.49,
                energy: None,
                fat: 2.98,
                saturated_fat: None,
                trans_fat: None,
                sugars: Sugars::new().lactose(5.13),
                protein: 79.25,
                casein: Some(71.74),
                ash: Some(8.15),
                solids_source: Some(SolidsSource::MicellarCasein),
            }
            .into(),
        });

    pub(crate) static COMP_MCC_80_KOMMINENI: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(364.34)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.98).saturated(1.937).trans(0.1043))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.13)))
                        .proteins(MilkProteins::new().casein(71.74).whey(7.51))
                        .minerals(8.15),
                ),
            )
            .pod(0.8208)
            .pac(PAC::new().sugars(5.13).msnf_ws_salts(33.9959))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_mcc_80_kommineni() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI);

        comp.assert_all_keys(&[
            (CompKey::Energy, 364.34),
            (CompKey::MilkSolids, 95.51),
            (CompKey::MilkFat, 2.98),
            (CompKey::MSNF, 92.53),
            (CompKey::MilkSugars, 5.13),
            (CompKey::MilkSNFS, 87.4),
            (CompKey::MilkProteins, 79.25),
            (CompKey::Casein, 71.74),
            (CompKey::Whey, 7.51),
            (CompKey::MilkMinerals, 8.15),
            (CompKey::TotalSolids, 95.51),
            (CompKey::TotalFats, 2.98),
            (CompKey::TotalSNF, 92.53),
            (CompKey::TotalSNFS, 87.4),
            (CompKey::TotalProteins, 79.25),
            (CompKey::TotalMinerals, 8.15),
            (CompKey::Water, 4.49),
            (CompKey::TotalCarbohydrates, 5.13),
            (CompKey::TotalSugars, 5.13),
            (CompKey::Lactose, 5.13),
            (CompKey::TotalSweeteners, 5.13),
            (CompKey::POD, 0.8208),
            (CompKey::NetPAC, 39.125_897),
            (CompKey::TotalPAC, 39.125_897),
            (CompKey::PACsgr, 5.13),
            (CompKey::PACmlk, 33.995_897),
            (CompKey::SaturatedFat, 1.937),
            (CompKey::TransFat, 0.1043),
        ]);
    }

    /// (Southward, n.d., Table 1, p. 9)[^96]
    #[doc = include_str!("../../../docs/references/index/96.md")]
    pub(crate) const ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD_STR: &str = r#"{
      "name": "Southward Sodium Caseinate",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 3.8,
        "fat": 1.1,
        "sugars": { "lactose": 0.1 },
        "protein": 91.4,
        "ash": 3.6,
        "solids_source": "Caseinate"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Southward Sodium Caseinate".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 3.8,
                energy: None,
                fat: 1.1,
                saturated_fat: None,
                trans_fat: None,
                sugars: Sugars::new().lactose(0.1),
                protein: 91.4,
                casein: None,
                ash: Some(3.6),
                solids_source: Some(SolidsSource::Caseinate),
            }
            .into(),
        });

    pub(crate) static COMP_SODIUM_CASEINATE_SOUTHWARD: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(375.9)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.1).saturated(0.715).trans(0.0385))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(0.1)))
                        .proteins(MilkProteins::new().casein(91.4))
                        .minerals(3.6),
                ),
            )
            .pod(0.016)
            .pac(PAC::new().sugars(0.1).msnf_ws_salts(34.9401))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_sodium_caseinate_southward() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD);

        comp.assert_all_keys(&[
            (CompKey::Energy, 375.9),
            (CompKey::MilkSolids, 96.2),
            (CompKey::MilkFat, 1.1),
            (CompKey::MSNF, 95.1),
            (CompKey::MilkSugars, 0.1),
            (CompKey::MilkSNFS, 95.0),
            (CompKey::MilkProteins, 91.4),
            (CompKey::Casein, 91.4),
            (CompKey::Whey, 0.0),
            (CompKey::MilkMinerals, 3.6),
            (CompKey::TotalSolids, 96.2),
            (CompKey::TotalFats, 1.1),
            (CompKey::TotalSNF, 95.1),
            (CompKey::TotalSNFS, 95.0),
            (CompKey::TotalProteins, 91.4),
            (CompKey::TotalMinerals, 3.6),
            (CompKey::Water, 3.8),
            (CompKey::TotalCarbohydrates, 0.1),
            (CompKey::TotalSugars, 0.1),
            (CompKey::Lactose, 0.1),
            (CompKey::TotalSweeteners, 0.1),
            (CompKey::POD, 0.016),
            (CompKey::NetPAC, 35.040_126),
            (CompKey::TotalPAC, 35.040_126),
            (CompKey::PACsgr, 0.1),
            (CompKey::PACmlk, 34.940_126),
            (CompKey::SaturatedFat, 0.715),
            (CompKey::TransFat, 0.0385),
        ]);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_DAIRY_SHEET: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (
                    ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA_STR,
                    ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA.clone(),
                    Some(*COMP_WHOLE_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA.clone(),
                    Some(*COMP_SWEETENED_CONDENSED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_WPC_80_USDEC_STR,
                    ING_SPEC_DAIRY_SHEET_WPC_80_USDEC.clone(),
                    Some(*COMP_WPC_80_USDEC),
                ),
                (ING_SPEC_DAIRY_SHEET_WPI_HILMAR_STR, ING_SPEC_DAIRY_SHEET_WPI_HILMAR.clone(), Some(*COMP_WPI_HILMAR)),
                (
                    ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI_STR,
                    ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI.clone(),
                    Some(*COMP_MCC_80_KOMMINENI),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD_STR,
                    ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD.clone(),
                    Some(*COMP_SODIUM_CASEINATE_SOUTHWARD),
                ),
            ]
        });

    fn usda_whole_milk_sheet_spec() -> DairySheetSpec {
        let TaggedSpec::DairySheetSpec(spec) = ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA.spec else {
            unreachable!("the USDA whole milk asset is a DairySheetSpec");
        };
        spec
    }

    #[test]
    fn dairy_sheet_spec_whey_unaccounted_solids() {
        // Hilmar 9000's bulletin sums to 97.5%, so beside its 2.5 g of ash, the other milk solids
        // hold the 2.5 g it doesn't account for
        let comp = ING_SPEC_DAIRY_SHEET_WPI_HILMAR.spec.to_composition().unwrap();

        assert_eq_flt!(comp.get(CompKey::MSNF), 95.0);
        assert_eq_flt!(comp.get(CompKey::Lactose), 1.0);
        assert_eq_flt!(comp.get(CompKey::Whey), 89.0);
        assert_eq_flt!(comp.get(CompKey::MilkMinerals), 2.5);
        assert_eq_flt!(comp.get(CompKey::MilkSNFS), 89.0 + 2.5 + 2.5);
        assert_eq_flt!(comp.get(CompKey::Water), 4.5);
    }

    #[test]
    fn dairy_sheet_spec_lactose_free() {
        // The glucose and galactose its lactose breaks down into still count as milk solids
        let comp = DairySheetSpec {
            sugars: Sugars::new().glucose(4.81 / 2.0).galactose(4.81 / 2.0),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq!(comp.get(CompKey::Lactose), 0.0);
        assert_eq_flt!(comp.get(CompKey::Glucose), 4.81 / 2.0);
        assert_eq_flt!(comp.get(CompKey::Galactose), 4.81 / 2.0);
        assert_eq_flt!(comp.get(CompKey::MilkSugars), 4.81);
        assert_eq_flt!(comp.get(CompKey::MSNF), 8.88);
    }

    #[test]
    fn dairy_sheet_spec_listed_ash_sets_the_minerals() {
        // USDA's whole milk lists 0.8 g of ash, 0.18 g past what its water leaves beside its sugars
        // and protein, so the water gives way to the listed solids
        let comp = usda_whole_milk_sheet_spec().to_composition().unwrap();

        assert_eq_flt!(comp.get(CompKey::MilkMinerals), 0.8);
        assert_eq_flt!(comp.get(CompKey::MSNF), 8.88);
        assert_eq_flt!(comp.get(CompKey::Water), 87.92);
        assert_eq_8dp!(comp.solids.milk.others, 0.0);
    }

    #[test]
    fn dairy_sheet_spec_unlisted_ash_yields_to_the_water() {
        // Without its ash, USDA's whole milk leaves 0.62 g beside its sugars and protein, under the
        // modeled 0.70 g, so the minerals take that remainder and the listed water stands
        let comp = DairySheetSpec {
            ash: None,
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_8dp!(comp.get(CompKey::MilkMinerals), 0.62);
        assert_eq_flt!(comp.get(CompKey::MSNF), 8.7);
        assert_eq_flt!(comp.get(CompKey::Water), 88.1);
        assert_eq!(comp.solids.milk.others, 0.0);
    }

    #[test]
    fn dairy_sheet_spec_unlisted_ash_is_modeled() {
        // Without an ash, USDA's heavy cream leaves 1.37 g beside its sugars and protein, so the
        // minerals take the modeled 0.51 g, and the other milk solids the rest
        let comp = DairySheetSpec {
            water: 58.13,
            energy: None,
            fat: 35.56,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(2.92),
            protein: 2.02,
            casein: None,
            ash: None,
            solids_source: None,
        }
        .to_composition()
        .unwrap();

        assert_eq_6dp!(comp.get(CompKey::MilkMinerals), 0.509_968);
        assert_eq_6dp!(comp.solids.milk.others, 0.860_032);
        assert_eq_flt!(comp.get(CompKey::Water), 58.13);
    }

    #[test]
    fn dairy_sheet_spec_casein_replaces_solids_source_split() {
        // A listed casein sets the split whatever the solids source, and whey takes the rest
        let milk = DairySheetSpec {
            casein: Some(2.5),
            ..usda_whole_milk_sheet_spec()
        };
        let comp = milk.to_composition().unwrap();

        assert_eq_flt!(comp.get(CompKey::Casein), 2.5);
        assert_eq_flt!(comp.get(CompKey::Whey), milk.protein - 2.5);

        for source in [
            SolidsSource::Whey,
            SolidsSource::MicellarCasein,
            SolidsSource::Caseinate,
        ] {
            let spec = DairySheetSpec {
                solids_source: Some(source),
                ..milk
            };
            assert_eq!(spec.to_composition().unwrap(), comp);
        }
    }

    #[test]
    fn dairy_sheet_spec_err_on_negative_field() {
        let base = usda_whole_milk_sheet_spec();

        let neg_cases = [
            DairySheetSpec { water: -1.0, ..base },
            DairySheetSpec { fat: -1.0, ..base },
            DairySheetSpec {
                saturated_fat: Some(-1.0),
                ..base
            },
            DairySheetSpec {
                trans_fat: Some(-1.0),
                ..base
            },
            DairySheetSpec {
                sugars: Sugars::new().lactose(-1.0),
                ..base
            },
            DairySheetSpec {
                sugars: Sugars::new().lactose(4.81).sucrose(-1.0),
                ..base
            },
            DairySheetSpec { protein: -1.0, ..base },
            DairySheetSpec {
                casein: Some(-1.0),
                ..base
            },
            DairySheetSpec {
                ash: Some(-1.0),
                ..base
            },
        ];

        for spec in neg_cases {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn dairy_sheet_spec_err_when_water_plus_fat_plus_sugars_plus_protein_exceeds_100() {
        let result = DairySheetSpec {
            water: 90.0,
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_when_saturated_fat_exceeds_fat() {
        let result = DairySheetSpec {
            saturated_fat: Some(4.0),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_when_trans_fat_exceeds_fat() {
        let result = DairySheetSpec {
            trans_fat: Some(4.0),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_when_casein_exceeds_protein() {
        let base = usda_whole_milk_sheet_spec();
        let result = DairySheetSpec {
            casein: Some(base.protein + 0.1),
            ..base
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_when_micellar_casein_protein_is_below_milk_solids() {
        // At 30 g of protein in 94 g of solids non-fat, under milk solids' 37.5%, the micellar
        // casein lines would split its protein with more whey than milk has
        let result = DairySheetSpec {
            water: 5.0,
            energy: None,
            fat: 1.0,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(50.0),
            protein: 30.0,
            casein: None,
            ash: None,
            solids_source: Some(SolidsSource::MicellarCasein),
        }
        .to_composition();
        assert!(matches!(result, Err(Error::UnsupportedComposition(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_on_unspecified_sugars() {
        let result = DairySheetSpec {
            sugars: Sugars::new().other(4.81),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CannotComputePOD(_))));
    }
}
