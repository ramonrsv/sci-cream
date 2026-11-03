//! [`DairyLabelSpec`] and associated implementations, for dairy ingredients from nutrition labels

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fats, MilkSolids, PAC, ScaleComponents, SimpleSolids, Solids, Sugars, ToComposition,
    },
    constants::{
        composition::dairy::{
            STD_MIN_WATER_CONTENT_IN_MILK_POWDER, STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT,
            SolidsSource,
        },
        density::solve_dairy_serving_grams,
        pac,
    },
    error::{Error, Result},
    specs::{
        dairy::util::{estimate_minerals, estimate_snf, estimate_unaccounted, make_dairy_sugars, make_milk_proteins},
        units::Unit,
    },
    validate::{Validate, verify_are_positive, verify_is_subset},
};

#[cfg(doc)]
use crate::{
    composition::CompKey,
    constants::{
        self,
        composition::dairy::{casein::STD_MINERALS_IN_CASEINATE, minerals_in_snf, unaccounted_in_snf},
    },
    specs::{DairySheetSpec, DairySimpleSpec},
};

/// Spec for dairy ingredients derived from nutrition facts labels, with detailed breakdown.
///
/// This spec is more flexible than [`DairySimpleSpec`] and can accommodate a wider range of dairy
/// products, including those with non-standard compositions, e.g. lactose-free products with
/// different types of sugars, whey protein or isolate powder, or other specialized dairy products.
/// The required values can typically be pulled directly from the nutrition facts label.
///
/// For sources that list more detailed compositions like water and ash content, such as spec
/// sheets and composition databases, use [`DairySheetSpec`] for a more accurate representation.
///
/// In addition to lactose and proteins, MSNF (milk solids non-fat) and WS (whey solids) include
/// minerals and salts (Goff & Hartel, 2025, pp. 37, 47)[^20], (Goff, n.d., "11. Milk
/// Solids-not-fat")[^90], which nutrition facts labels don't list. As such, the total MSNF or WS
/// content is internally estimated from `dairy_sugars` (see [`sugars`](Self::sugars) and
/// [`sucrose`](Self::sucrose)), [`protein`](Self::protein), and the minerals fraction of the
/// [`solids_source`](Self::solids_source): [`STD_MINERALS_IN_CASEINATE`] for
/// [`Caseinate`](SolidsSource::Caseinate), and for the others a line in the protein fraction, see
/// [`minerals_in_snf`]. Those minerals are the composition's [`CompKey::MilkMinerals`]. Whey solids
/// also hold a small fraction that their lactose, protein, and minerals leave unaccounted, see
/// [`unaccounted_in_snf`], which the estimate adds as well, as other milk solids.
///
/// The solids, from the label's values and the estimated minerals and other milk solids, are capped
/// so that the water content doesn't fall below [`STD_MIN_WATER_CONTENT_IN_MILK_POWDER`]. The other
/// milk solids are cut first, then the minerals. It is an error if the label's values alone leave
/// less water than that.
#[doc = include_str!("../../../docs/references/index/20.md")]
#[doc = include_str!("../../../docs/references/index/90.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairyLabelSpec {
    /// Serving size in grams; if given in ml, it is converted to grams based on the composition
    ///
    /// The ml → g density is selected by [`constants::density::select_dairy_density`] and solved as
    /// a fixed point, since fat, MSNF, and sucrose fractions depend on the serving size in grams.
    pub serving_size: Unit,
    /// Energy per serving, in kcal; calculated based on macronutrients composition if unspecified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub energy: Option<f64>,
    /// Total fat content per serving; it can be given in grams or as a percentage of serving size
    ///
    /// If a dairy product states a fat content percentage on the label, that is usually more
    /// accurate than the whole unit grams in the nutrition facts table, so specifying a total fat
    /// percentage is recommended whenever possible.
    pub total_fat: Unit,
    /// Saturated fat content per serving, in grams; it must be a subset of total fat.
    ///
    /// If unspecified, it is calculated as [`STD_SATURATED_FAT_IN_MILK_FAT`] of
    /// [`total_fat`](Self::total_fat). Nutrition tables sometimes list this as zero, particularly
    /// for small serving sizes, in which cases it's usually more accurate to not specify it and
    /// instead have it internally calculated from the total fat content.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saturated_fat: Option<f64>,
    /// Trans fat content per serving, in grams; it must be a subset of total fat.
    ///
    /// If unspecified, it is calculated as [`STD_TRANS_FAT_IN_MILK_FAT`] of
    /// [`total_fat`](Self::total_fat). Nutrition tables sometimes list this as zero, particularly
    /// for small serving sizes, in which cases it's usually more accurate to not specify it and
    /// instead have it internally calculated from the total fat content.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trans_fat: Option<f64>,
    /// Total carbohydrate content per serving, in grams; a superset of [`sugars`](Self::sugars).
    ///
    /// If unspecified, it is assumed to equal the [`sugars`](Self::sugars) content. This should be
    /// the case for most dairy products, which should contain lactose as the only carbohydrate
    /// (aside from trace amounts of other carbohydrates). However, some labels may list a total
    /// carbohydrate content that's slightly higher than the sugar content - due to several reasons,
    /// e.g. imprecise carbohydrate by-difference measurements, heat damage during drying, etc. In
    /// those cases, specifying the total carbohydrate content is recommended, as it allows for a
    /// more accurate estimation of the composition solids breakdown, water content, etc.
    ///
    /// Note that any difference is included under [`Solids::other`], not under [`Solids::milk`],
    /// less whey's unaccounted solids, see [`unaccounted_in_snf`], to avoid counting them twice:
    /// both carbohydrates by difference and the solids non-fat estimate include them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carbohydrates: Option<f64>,
    /// Sugars content per serving, in grams; the detailed composition is determined by
    /// [`lactose_free`](Self::lactose_free) and [`sucrose`](Self::sucrose).
    ///
    /// These are the measured sugars that nutrition facts labels list; they must be a subset of
    /// [`carbohydrates`](Self::carbohydrates) (by difference) if those are specified. If they are
    /// not, then the two are assumed to be equal, which should be the case for most dairy products.
    pub sugars: f64,
    /// Protein content per serving, in grams.
    ///
    /// This is [crude protein](crate::docs#crude-and-true-protein), as labels list it. The detailed
    /// proteins breakdown is determined by [`solids_source`](Self::solids_source).
    pub protein: f64,
    /// Whether the dairy product is lactose-free, which affects the detailed composition of
    /// [`sugars`](Self::sugars).
    ///
    /// If `false`/`None`, the non-sucrose sugars are assumed to be all lactose, which is the
    /// predominant sugar in regular dairy products. If `true`, the non-sucrose sugars are assumed
    /// to be a 50/50 glucose and galactose mixture, the two monosaccharides that make up lactose,
    /// which is typical of lactose free dairy products where lactose is enzymatically broken down
    /// into its constituent sugars (Goff & Hartel, 2025, pp. 35, 422)[^20].
    ///
    /// See [`sucrose`](Self::sucrose) for the possibility of other types of sugars.
    #[doc = include_str!("../../../docs/references/index/20.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lactose_free: Option<bool>,
    /// Sucrose content per serving, in grams, assumed to be zero if not specified
    ///
    /// This accommodates dairy products with added sugars, e.g. sweetened condensed milk. It must
    /// be a subset of [`sugars`](Self::sugars), the rest is assumed to be natural dairy sugars.
    ///
    /// Note that this is included under [`Solids::other`], not under [`Solids::milk`].
    ///
    /// See [`lactose_free`](Self::lactose_free) for the possibility of different natural sugar
    /// compositions in lactose-free products.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sucrose: Option<f64>,
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein and minerals composition of the solids non-fat.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solids_source: Option<SolidsSource>,
}

impl ToComposition for DairyLabelSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            serving_size,
            energy,
            total_fat,
            saturated_fat,
            trans_fat,
            carbohydrates,
            sugars,
            protein,
            lactose_free,
            sucrose,
            solids_source,
        } = *self;

        let lactose_free = lactose_free.unwrap_or(false);
        let sucrose = sucrose.unwrap_or(0.0);
        let dairy_sugars = sugars - sucrose;
        let carbohydrates = carbohydrates.unwrap_or(sugars);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        let calculated_snf = estimate_snf(dairy_sugars, protein, solids_source);
        let unaccounted = estimate_unaccounted(calculated_snf, protein, solids_source);
        let other_carbohydrates = f64::max(carbohydrates - sugars - unaccounted, 0.0);

        let max_solids = 1.0 - STD_MIN_WATER_CONTENT_IN_MILK_POWDER;
        let snf_ceiling = |size: f64, fat| max_solids * size - fat - sucrose - other_carbohydrates;

        let (serving_size, total_fat) = match (serving_size, total_fat) {
            (Unit::Grams(size_grams), Unit::Grams(fat_grams)) => (size_grams, fat_grams),
            (Unit::Grams(size_grams), Unit::Percent(fat_percent)) => (size_grams, size_grams * fat_percent / 100.0),
            (Unit::Milliliters(size_ml), Unit::Grams(fat_grams)) => {
                let fat_at = |_| fat_grams;
                let size_grams = solve_dairy_serving_grams(size_ml, sucrose, calculated_snf, fat_at)?;
                (size_grams, fat_grams)
            }
            (Unit::Milliliters(size_ml), Unit::Percent(fat_percent)) => {
                let fat_at = |size: f64| size * fat_percent / 100.0;
                let size_grams = solve_dairy_serving_grams(size_ml, sucrose, calculated_snf, fat_at)?;
                (size_grams, size_grams * fat_percent / 100.0)
            }
            _ => return Err(Error::UnsupportedCompositionUnit(serving_size)),
        };

        let snf = f64::min(calculated_snf, snf_ceiling(serving_size, total_fat));

        let saturated_fat = saturated_fat.unwrap_or(STD_SATURATED_FAT_IN_MILK_FAT * total_fat);
        let trans_fat = trans_fat.unwrap_or(STD_TRANS_FAT_IN_MILK_FAT * total_fat);

        verify_are_positive(&[
            serving_size,
            total_fat,
            saturated_fat,
            trans_fat,
            carbohydrates,
            sugars,
            protein,
            sucrose,
        ])?;

        verify_is_subset(saturated_fat, total_fat, "saturated_fat <= total_fat")?;
        verify_is_subset(trans_fat, total_fat, "trans_fat <= total_fat")?;
        verify_is_subset(total_fat + snf + sucrose, serving_size, "total_fat + snf + sucrose <= serving_size")?;
        verify_is_subset(sugars, carbohydrates, "sugars <= carbohydrates")?;
        verify_is_subset(sucrose, sugars, "sucrose <= sugars")?;
        verify_is_subset(dairy_sugars + protein, snf, "dairy_sugars + protein <= snf")?;

        let estimated_minerals = estimate_minerals(snf, protein, solids_source);
        let minerals = f64::min(estimated_minerals, snf - dairy_sugars - protein);

        let dairy_sugars = make_dairy_sugars(dairy_sugars, lactose_free);
        let other_sugars = Sugars::new().sucrose(sucrose);
        let total_sugars = dairy_sugars.add(&other_sugars);

        let milk_solids = MilkSolids::new()
            .fats(Fats::new().total(total_fat).saturated(saturated_fat).trans(trans_fat))
            .carbohydrates(Carbohydrates::new().sugars(dairy_sugars))
            .proteins(make_milk_proteins(protein, protein / snf, solids_source)?)
            .minerals(minerals)
            .others_from_total(total_fat + snf)?;

        let other_solids =
            SimpleSolids::new().carbohydrates(Carbohydrates::new().sugars(other_sugars).others(other_carbohydrates));

        Composition::new()
            .energy(energy.unwrap_or(milk_solids.energy()? + other_solids.energy()?))
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(total_sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(total_sugars.to_pac()?)
                    .msnf_ws_salts(snf * pac::MSNF_WS_SALTS / 100.0),
            )
            .scale(100.0 / serving_size)
            .validate_into()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::*;

    use crate::tests::{assets::asset_composition, util::AssertKeys};

    use super::*;
    use crate::{
        composition::{CompKey, MilkProteins, SolidsBreakdown},
        constants::composition::dairy::{
            casein_in_protein, lactose_in_snf, minerals_in_snf, unaccounted_in_snf,
            whey::{STD_LACTOSE_IN_WS, STD_PROTEIN_IN_WPI, STD_PROTEIN_IN_WS},
        },
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
    };

    // https://www.sealtest.ca/en/products/milks/325-milk
    pub(crate) const ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST_STR: &str = r#"{
      "name": "Sealtest 3.25% Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 250 },
        "energy": 160,
        "total_fat": { "percent": 3.25 },
        "saturated_fat": 5,
        "trans_fat": 0.3,
        "sugars": 13,
        "protein": 9
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Sealtest 3.25% Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(250.0), // 257.6667 grams
                energy: Some(160.0),
                total_fat: Unit::Percent(3.25), // 3.25% is 8.3742g, not 8g
                saturated_fat: Some(5.0),
                trans_fat: Some(0.3),
                carbohydrates: None,
                sugars: 13.0,
                protein: 9.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_3_25_MILK_SEALTEST: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.9859)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(1.9371).trans(0.1162))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.0364)))
                        .proteins(MilkProteins::new().casein(2.7894).whey(0.6973))
                        .minerals(0.7409),
                ),
            )
            .pod(0.8058)
            .pac(PAC::new().sugars(5.0364).msnf_ws_salts(3.4036))
    });

    #[test]
    fn to_composition_dairy_label_spec_3_25_milk_sealtest() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST);

        comp.assert_all_keys(&[
            (CompKey::Energy, 61.985_883),
            (CompKey::MilkSolids, 12.513_988),
            (CompKey::MilkFat, 3.25),
            (CompKey::MSNF, 9.263_988),
            (CompKey::MilkSugars, 5.036_353),
            (CompKey::MilkSNFS, 4.227_635),
            (CompKey::MilkProteins, 3.486_706),
            (CompKey::Casein, 2.789_365),
            (CompKey::Whey, 0.697_341),
            (CompKey::MilkMinerals, 0.740_929),
            (CompKey::TotalSolids, 12.513_988),
            (CompKey::TotalFats, 3.25),
            (CompKey::TotalSNF, 9.263_988),
            (CompKey::TotalSNFS, 4.227_635),
            (CompKey::TotalProteins, 3.486_706),
            (CompKey::TotalMinerals, 0.740_929),
            (CompKey::Water, 87.486_012),
            (CompKey::TotalCarbohydrates, 5.036_353),
            (CompKey::TotalSugars, 5.036_353),
            (CompKey::Lactose, 5.036_353),
            (CompKey::TotalSweeteners, 5.036_353),
            (CompKey::POD, 0.805_816),
            (CompKey::NetPAC, 8.43998),
            (CompKey::TotalPAC, 8.43998),
            (CompKey::PACsgr, 5.036_353),
            (CompKey::PACmlk, 3.403_627),
            (CompKey::SaturatedFat, 1.937_059),
            (CompKey::TransFat, 0.116_224),
        ]);
    }

    // https://fairlife.com/ultra-filtered-milk/whole-milk/
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR: &str = r#"{
      "name": "Fairlife Whole Ultra-Filtered Lactose-Free Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 240 },
        "energy": 150,
        "total_fat": { "grams": 8 },
        "saturated_fat": 5,
        "sugars": 6,
        "protein": 13,
        "lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Fairlife Whole Ultra-Filtered Lactose-Free Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(240.0), // 245.1288 grams
                energy: Some(150.0),
                total_fat: Unit::Grams(8.0), // 8g is 3.2636%
                saturated_fat: Some(5.0),
                trans_fat: None,
                carbohydrates: None,
                sugars: 6.0,
                protein: 13.0,
                lactose_free: Some(true),
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(60.5315)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.2283).saturated(2.0177).trans(0.1130))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(1.2106).galactose(1.2106)))
                        .proteins(MilkProteins::new().casein(4.1968).whey(1.0492))
                        .minerals(0.6321),
                ),
            )
            .pod(1.7554)
            .pac(PAC::new().sugars(4.6004).msnf_ws_salts(3.0492))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_ultra_filtered_lactose_free() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 60.531_476),
            (CompKey::MilkSolids, 11.527_772),
            (CompKey::MilkFat, 3.228_345),
            (CompKey::MSNF, 8.299_427),
            (CompKey::MilkSugars, 2.421_259),
            (CompKey::MilkSNFS, 5.878_168),
            (CompKey::MilkProteins, 5.246_061),
            (CompKey::Casein, 4.196_849),
            (CompKey::Whey, 1.049_212),
            (CompKey::MilkMinerals, 0.632_107),
            (CompKey::TotalSolids, 11.527_772),
            (CompKey::TotalFats, 3.228_345),
            (CompKey::TotalSNF, 8.299_427),
            (CompKey::TotalSNFS, 5.878_168),
            (CompKey::TotalProteins, 5.246_061),
            (CompKey::TotalMinerals, 0.632_107),
            (CompKey::Water, 88.472_228),
            (CompKey::TotalCarbohydrates, 2.421_259),
            (CompKey::TotalSugars, 2.421_259),
            (CompKey::Glucose, 1.21063),
            (CompKey::Galactose, 1.21063),
            (CompKey::Lactose, 0.0),
            (CompKey::TotalSweeteners, 2.421_259),
            (CompKey::POD, 1.755_413),
            (CompKey::NetPAC, 7.649_635),
            (CompKey::TotalPAC, 7.649_635),
            (CompKey::PACsgr, 4.600_392),
            (CompKey::PACmlk, 3.049_243),
            (CompKey::SaturatedFat, 2.017_716),
            (CompKey::TransFat, 0.112_992),
        ]);
    }

    // https://www.lactantia.ca/food_product/lactantia-ultrapur-2-20g-protein-1-5l/
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA_STR: &str = r#"{
      "name": "Lactantia UltraPur 2% Ultrafiltered Lactose-Free Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 250 },
        "energy": 170,
        "total_fat": { "grams": 5 },
        "saturated_fat": 3.5,
        "trans_fat": 0.2,
        "carbohydrates": 11,
        "sugars": 10,
        "protein": 20,
        "lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lactantia UltraPur 2% Ultrafiltered Lactose-Free Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(250.0), // 261.9516 grams
                energy: Some(170.0),
                total_fat: Unit::Grams(5.0), // 5g is 1.9087%
                saturated_fat: Some(3.5),
                trans_fat: Some(0.2),
                carbohydrates: Some(11.0),
                sugars: 10.0,
                protein: 20.0,
                lactose_free: Some(true),
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_ULTRAFILTERED_MILK_LACTANTIA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(64.8975)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(1.9087).saturated(1.3361).trans(0.0763))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(1.9087).galactose(1.9087)))
                            .proteins(MilkProteins::new().casein(6.108).whey(1.527))
                            .minerals(0.9474),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(0.3817))),
            )
            .pod(2.7677)
            .pac(PAC::new().sugars(7.2532).msnf_ws_salts(4.5558))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_ultrafiltered_milk_lactantia() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA);

        comp.assert_all_keys(&[
            (CompKey::Energy, 64.897_474),
            (CompKey::MilkSolids, 14.308_687),
            (CompKey::MilkFat, 1.908_749),
            (CompKey::MSNF, 12.399_938),
            (CompKey::MilkSugars, 3.817_498),
            (CompKey::MilkSNFS, 8.582_439),
            (CompKey::MilkProteins, 7.634_997),
            (CompKey::Casein, 6.107_998),
            (CompKey::Whey, 1.526_999),
            (CompKey::MilkMinerals, 0.947_442),
            (CompKey::OtherSNFS, 0.38175),
            (CompKey::TotalSolids, 14.690_437),
            (CompKey::TotalFats, 1.908_749),
            (CompKey::TotalSNF, 12.781_688),
            (CompKey::TotalSNFS, 8.964_189),
            (CompKey::TotalProteins, 7.634_997),
            (CompKey::TotalMinerals, 0.947_442),
            (CompKey::Water, 85.309_563),
            (CompKey::TotalCarbohydrates, 4.199_248),
            (CompKey::TotalSugars, 3.817_498),
            (CompKey::Glucose, 1.908_749),
            (CompKey::Galactose, 1.908_749),
            (CompKey::Lactose, 0.0),
            (CompKey::TotalSweeteners, 3.817_498),
            (CompKey::POD, 2.767_686),
            (CompKey::NetPAC, 11.809_035),
            (CompKey::TotalPAC, 11.809_035),
            (CompKey::PACsgr, 7.253_247),
            (CompKey::PACmlk, 4.555_788),
            (CompKey::SaturatedFat, 1.336_124),
            (CompKey::TransFat, 0.07635),
        ]);
    }

    // https://www.carnationmilk.ca/en/products/2-partly-skimmed
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR: &str = r#"{
      "name": "Carnation 2% Evaporated Partly Skimmed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 15 },
        "energy": 15,
        "total_fat": { "percent": 2 },
        "saturated_fat": 0.2,
        "carbohydrates": 2,
        "sugars": 1,
        "protein": 1
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Carnation 2% Evaporated Partly Skimmed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(15.0),
                energy: Some(15.0),
                total_fat: Unit::Percent(2.0),
                saturated_fat: Some(0.2),
                trans_fat: None,
                carbohydrates: Some(2.0),
                sugars: 1.0,
                protein: 1.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_EVAPORATED_MILK_CARNATION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(94.9619)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(2.0).saturated(1.2662).trans(0.07))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(6.3308)))
                            .proteins(MilkProteins::new().casein(5.0646).whey(1.2662))
                            .minerals(1.0819),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(6.3308))),
            )
            .pod(1.0129)
            .pac(PAC::new().sugars(6.3308).msnf_ws_salts(5.0494))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_evaporated_milk_carnation() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION);

        comp.assert_all_keys(&[
            (CompKey::Energy, 94.961_897),
            (CompKey::MilkSolids, 15.743_499),
            (CompKey::MilkFat, 2.0),
            (CompKey::MSNF, 13.743_499),
            (CompKey::MilkSugars, 6.330_793),
            (CompKey::MilkSNFS, 7.412_706),
            (CompKey::MilkProteins, 6.330_793),
            (CompKey::Casein, 5.064_635),
            (CompKey::Whey, 1.266_159),
            (CompKey::MilkMinerals, 1.081_913),
            (CompKey::OtherSNFS, 6.330_793),
            (CompKey::TotalSolids, 22.074_293),
            (CompKey::TotalFats, 2.0),
            (CompKey::TotalSNF, 20.074_293),
            (CompKey::TotalSNFS, 13.743_499),
            (CompKey::TotalProteins, 6.330_793),
            (CompKey::TotalMinerals, 1.081_913),
            (CompKey::Water, 77.925_707),
            (CompKey::TotalCarbohydrates, 12.661_586),
            (CompKey::TotalSugars, 6.330_793),
            (CompKey::Lactose, 6.330_793),
            (CompKey::TotalSweeteners, 6.330_793),
            (CompKey::POD, 1.012_927),
            (CompKey::NetPAC, 11.380_211),
            (CompKey::TotalPAC, 11.380_211),
            (CompKey::PACsgr, 6.330_793),
            (CompKey::PACmlk, 5.049_417),
            (CompKey::SaturatedFat, 1.266_159),
            (CompKey::TransFat, 0.07),
        ]);
    }

    // https://www.eaglebrand.ca/en/products/original
    pub(crate) const ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND_STR: &str = r#"{
      "name": "Eagle Brand Original Sweetened Condensed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 15 },
        "energy": 70,
        "total_fat": { "grams": 1.5 },
        "saturated_fat": 1.0,
        "sugars": 11,
        "protein": 1,
        "sucrose": 8.81
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Eagle Brand Original Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(15.0),
                energy: Some(70.0),
                total_fat: Unit::Grams(1.5),
                saturated_fat: Some(1.0),
                trans_fat: None,
                carbohydrates: None,
                sugars: 11.0,
                protein: 1.0,
                lactose_free: None,
                sucrose: Some(8.81), // estimated 45% of total, based on USDA
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SWEETENED_CONDENSED_MILK_EAGLE_BRAND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(360.7362)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(7.7301).saturated(5.1534).trans(0.2706))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(11.2859)))
                            .proteins(MilkProteins::new().casein(4.1227).whey(1.0307))
                            .minerals(1.4548),
                    )
                    .other(
                        SolidsBreakdown::new()
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(45.4012))),
                    ),
            )
            .pod(47.207)
            .pac(PAC::new().sugars(56.6871).msnf_ws_salts(6.5743))
    });

    #[test]
    fn to_composition_dairy_label_spec_sweetened_condensed_milk_eagle_brand() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND);

        comp.assert_all_keys(&[
            (CompKey::Energy, 360.736_205),
            (CompKey::MilkSolids, 25.624_085),
            (CompKey::MilkFat, 7.730_062),
            (CompKey::MSNF, 17.894_023),
            (CompKey::MilkSugars, 11.28589),
            (CompKey::MilkSNFS, 6.608_133),
            (CompKey::MilkProteins, 5.153_374),
            (CompKey::Casein, 4.122_699),
            (CompKey::Whey, 1.030_675),
            (CompKey::MilkMinerals, 1.454_759),
            (CompKey::TotalSolids, 71.025_313),
            (CompKey::TotalFats, 7.730_062),
            (CompKey::TotalSNF, 63.295_251),
            (CompKey::TotalSNFS, 6.608_133),
            (CompKey::TotalProteins, 5.153_374),
            (CompKey::TotalMinerals, 1.454_759),
            (CompKey::Water, 28.974_687),
            (CompKey::TotalCarbohydrates, 56.687_118),
            (CompKey::TotalSugars, 56.687_118),
            (CompKey::Sucrose, 45.401_228),
            (CompKey::Lactose, 11.28589),
            (CompKey::TotalSweeteners, 56.687_118),
            (CompKey::POD, 47.20697),
            (CompKey::NetPAC, 63.261_455),
            (CompKey::TotalPAC, 63.261_455),
            (CompKey::PACsgr, 56.687_118),
            (CompKey::PACmlk, 6.574_337),
            (CompKey::SaturatedFat, 5.153_374),
            (CompKey::TransFat, 0.270_552),
        ]);
    }

    // https://www.medallionmilk.com/products/skim-milk-powder-500g-bag
    pub(crate) const ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION_STR: &str = r#"{
      "name": "Medallion Skim Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 25 },
        "energy": 90,
        "total_fat": { "grams": 0 },
        "carbohydrates": 13,
        "sugars": 12,
        "protein": 9
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Medallion Skim Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(25.0),
                energy: Some(90.0),
                total_fat: Unit::Grams(0.0),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: Some(13.0),
                sugars: 12.0,
                protein: 9.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIM_MILK_POWDER_MEDALLION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(360.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(0.0))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(48.0)))
                            .proteins(MilkProteins::new().casein(28.8).whey(7.2))
                            .minerals(7.2756),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(4.0))),
            )
            .pod(7.68)
            .pac(PAC::new().sugars(48.0).msnf_ws_salts(33.535))
    });

    #[test]
    fn to_composition_dairy_label_spec_skim_milk_powder_medallion() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION);

        comp.assert_all_keys(&[
            (CompKey::Energy, 360.0),
            (CompKey::MilkSolids, 91.275_606),
            (CompKey::MilkFat, 0.0),
            (CompKey::MSNF, 91.275_606),
            (CompKey::MilkSugars, 48.0),
            (CompKey::MilkSNFS, 43.275_606),
            (CompKey::MilkProteins, 36.0),
            (CompKey::Casein, 28.8),
            (CompKey::Whey, 7.2),
            (CompKey::MilkMinerals, 7.275_606),
            (CompKey::OtherSNFS, 4.0),
            (CompKey::TotalSolids, 95.275_606),
            (CompKey::TotalFats, 0.0),
            (CompKey::TotalSNF, 95.275_606),
            (CompKey::TotalSNFS, 47.275_606),
            (CompKey::TotalProteins, 36.0),
            (CompKey::TotalMinerals, 7.275_606),
            (CompKey::Water, 4.724_394),
            (CompKey::TotalCarbohydrates, 52.0),
            (CompKey::TotalSugars, 48.0),
            (CompKey::Lactose, 48.0),
            (CompKey::TotalSweeteners, 48.0),
            (CompKey::POD, 7.68),
            (CompKey::NetPAC, 81.535_028),
            (CompKey::TotalPAC, 81.535_028),
            (CompKey::PACsgr, 48.0),
            (CompKey::PACmlk, 33.535_028),
            (CompKey::SaturatedFat, 0.0),
            (CompKey::TransFat, 0.0),
        ]);
    }

    // https://www.medallionmilk.com/products/whole-milk-powder-500g-bag
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION_STR: &str = r#"{
      "name": "Medallion Whole Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 30 },
        "energy": 150,
        "total_fat": { "grams": 8 },
        "saturated_fat": 5,
        "sugars": 11,
        "protein": 8
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Medallion Whole Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(30.0),
                energy: Some(150.0),
                total_fat: Unit::Grams(8.0),
                saturated_fat: Some(5.0),
                trans_fat: None,
                carbohydrates: None,
                sugars: 11.0,
                protein: 8.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_MILK_POWDER_MEDALLION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(500.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(26.6667).saturated(16.6667).trans(0.9333))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(36.6667)))
                        .proteins(MilkProteins::new().casein(21.3333).whey(5.3333))
                        .minerals(5.4933),
                ),
            )
            .pod(5.8667)
            .pac(PAC::new().sugars(36.6667).msnf_ws_salts(25.2872))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_powder_medallion() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION);

        comp.assert_all_keys(&[
            (CompKey::Energy, 500.0),
            (CompKey::MilkSolids, 95.493_349),
            (CompKey::MilkFat, 26.666_667),
            (CompKey::MSNF, 68.826_682),
            (CompKey::MilkSugars, 36.666_667),
            (CompKey::MilkSNFS, 32.160_015),
            (CompKey::MilkProteins, 26.666_667),
            (CompKey::Casein, 21.333_333),
            (CompKey::Whey, 5.333_333),
            (CompKey::MilkMinerals, 5.493_349),
            (CompKey::TotalSolids, 95.493_349),
            (CompKey::TotalFats, 26.666_667),
            (CompKey::TotalSNF, 68.826_682),
            (CompKey::TotalSNFS, 32.160_015),
            (CompKey::TotalProteins, 26.666_667),
            (CompKey::TotalMinerals, 5.493_349),
            (CompKey::Water, 4.506_651),
            (CompKey::TotalCarbohydrates, 36.666_667),
            (CompKey::TotalSugars, 36.666_667),
            (CompKey::Lactose, 36.666_667),
            (CompKey::TotalSweeteners, 36.666_667),
            (CompKey::POD, 5.866_667),
            (CompKey::NetPAC, 61.953_869),
            (CompKey::TotalPAC, 61.953_869),
            (CompKey::PACsgr, 36.666_667),
            (CompKey::PACmlk, 25.287_202),
            (CompKey::SaturatedFat, 16.666_667),
            (CompKey::TransFat, 0.933_333),
        ]);
    }

    pub(crate) const ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND_STR: &str = r#"{
      "name": "Theland Skim Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 25 },
        "energy": 92,
        "total_fat": { "grams": 0.3 },
        "sugars": 13.3,
        "protein": 8.7
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Theland Skim Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(25.0),
                energy: Some(92.0),
                total_fat: Unit::Grams(0.3),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: None,
                sugars: 13.3,
                protein: 8.7,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIM_MILK_POWDER_THELAND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(368.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.2).saturated(0.78).trans(0.042))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(53.2)))
                        .proteins(MilkProteins::new().casein(27.84).whey(6.96))
                        .minerals(7.6696),
                ),
            )
            .pod(8.512)
            .pac(PAC::new().sugars(53.2).msnf_ws_salts(35.1494))
    });

    #[test]
    fn to_composition_dairy_label_spec_skim_milk_powder_theland() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND);

        comp.assert_all_keys(&[
            (CompKey::Energy, 368.0),
            (CompKey::MilkSolids, 96.869_632),
            (CompKey::MilkFat, 1.2),
            (CompKey::MSNF, 95.669_632),
            (CompKey::MilkSugars, 53.2),
            (CompKey::MilkSNFS, 42.469_632),
            (CompKey::MilkProteins, 34.8),
            (CompKey::Casein, 27.84),
            (CompKey::Whey, 6.96),
            (CompKey::MilkMinerals, 7.669_632),
            (CompKey::TotalSolids, 96.869_632),
            (CompKey::TotalFats, 1.2),
            (CompKey::TotalSNF, 95.669_632),
            (CompKey::TotalSNFS, 42.469_632),
            (CompKey::TotalProteins, 34.8),
            (CompKey::TotalMinerals, 7.669_632),
            (CompKey::Water, 3.130_368),
            (CompKey::TotalCarbohydrates, 53.2),
            (CompKey::TotalSugars, 53.2),
            (CompKey::Lactose, 53.2),
            (CompKey::TotalSweeteners, 53.2),
            (CompKey::POD, 8.512),
            (CompKey::NetPAC, 88.349_411),
            (CompKey::TotalPAC, 88.349_411),
            (CompKey::PACsgr, 53.2),
            (CompKey::PACmlk, 35.149_411),
            (CompKey::SaturatedFat, 0.78),
            (CompKey::TransFat, 0.042),
        ]);
    }

    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND_STR: &str = r#"{
      "name": "Theland Whole Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 25 },
        "energy": 131,
        "total_fat": { "grams": 7.4 },
        "sugars": 9.8,
        "protein": 6.3
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Theland Whole Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(25.0),
                energy: Some(131.0),
                total_fat: Unit::Grams(7.4),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: None,
                sugars: 9.8,
                protein: 6.3,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_MILK_POWDER_THELAND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(524.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(29.6).saturated(19.24).trans(1.036))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(39.2)))
                        .proteins(MilkProteins::new().casein(20.16).whey(5.04))
                        .minerals(4.0),
                ),
            )
            .pod(6.272)
            .pac(PAC::new().sugars(39.2).msnf_ws_salts(25.1304))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_powder_theland() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND);

        comp.assert_all_keys(&[
            (CompKey::Energy, 524.0),
            (CompKey::MilkSolids, 98.0),
            (CompKey::MilkFat, 29.6),
            (CompKey::MSNF, 68.4),
            (CompKey::MilkSugars, 39.2),
            (CompKey::MilkSNFS, 29.2),
            (CompKey::MilkProteins, 25.2),
            (CompKey::Casein, 20.16),
            (CompKey::Whey, 5.04),
            (CompKey::MilkMinerals, 4.0),
            (CompKey::TotalSolids, 98.0),
            (CompKey::TotalFats, 29.6),
            (CompKey::TotalSNF, 68.4),
            (CompKey::TotalSNFS, 29.2),
            (CompKey::TotalProteins, 25.2),
            (CompKey::TotalMinerals, 4.0),
            (CompKey::Water, 2.0),
            (CompKey::TotalCarbohydrates, 39.2),
            (CompKey::TotalSugars, 39.2),
            (CompKey::Lactose, 39.2),
            (CompKey::TotalSweeteners, 39.2),
            (CompKey::POD, 6.272),
            (CompKey::NetPAC, 64.330_438),
            (CompKey::TotalPAC, 64.330_438),
            (CompKey::PACsgr, 39.2),
            (CompKey::PACmlk, 25.130_438),
            (CompKey::SaturatedFat, 19.24),
            (CompKey::TransFat, 1.036),
        ]);
    }

    // https://leanfit.ca/collections/sport/products/leanfit-sport-whey-isolate-unflavoured-2kg
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE_STR: &str = r#"{
      "name": "Leanfit Sport Whey Isolate",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 39 },
        "energy": 150,
        "total_fat": { "grams": 0.5 },
        "saturated_fat": 0.3,
        "sugars": 1,
        "protein": 35,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Leanfit Sport Whey Isolate".to_string(),
        category: Category::Dairy,
        spec: DairyLabelSpec {
            serving_size: Unit::Grams(39.0),
            energy: Some(150.0),
            total_fat: Unit::Grams(0.5),
            saturated_fat: Some(0.3),
            trans_fat: None,
            carbohydrates: None,
            sugars: 1.0,
            protein: 35.0,
            lactose_free: None,
            sucrose: None,
            solids_source: Some(SolidsSource::Whey),
        }
        .into(),
    });

    pub(crate) static COMP_WHEY_ISOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(384.6154)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.2821).saturated(0.7692).trans(0.0449))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.5641)))
                        .proteins(MilkProteins::new().whey(89.7436))
                        .minerals(3.5730)
                        .others(0.1411),
                ),
            )
            .pod(0.4103)
            .pac(PAC::new().sugars(2.5641).msnf_ws_salts(35.2788))
    });

    #[test]
    fn to_composition_dairy_label_spec_whey_isolate() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 384.615_385),
            (CompKey::MilkSolids, 97.303_876),
            (CompKey::MilkFat, 1.282_051),
            (CompKey::MSNF, 96.021_825),
            (CompKey::MilkSugars, 2.564_103),
            (CompKey::MilkSNFS, 93.457_722),
            (CompKey::MilkProteins, 89.74359),
            (CompKey::Casein, 0.0),
            (CompKey::Whey, 89.74359),
            (CompKey::MilkMinerals, 3.573_035),
            (CompKey::TotalSolids, 97.303_876),
            (CompKey::TotalFats, 1.282_051),
            (CompKey::TotalSNF, 96.021_825),
            (CompKey::TotalSNFS, 93.457_722),
            (CompKey::TotalProteins, 89.74359),
            (CompKey::TotalMinerals, 3.573_035),
            (CompKey::Water, 2.696_124),
            (CompKey::TotalCarbohydrates, 2.564_103),
            (CompKey::TotalSugars, 2.564_103),
            (CompKey::Lactose, 2.564_103),
            (CompKey::TotalSweeteners, 2.564_103),
            (CompKey::POD, 0.410_256),
            (CompKey::NetPAC, 37.842_911),
            (CompKey::TotalPAC, 37.842_911),
            (CompKey::PACsgr, 2.564_103),
            (CompKey::PACmlk, 35.278_808),
            (CompKey::SaturatedFat, 0.769_231),
            (CompKey::TransFat, 0.044_872),
        ]);
    }

    // https://www.optimumnutrition.com/products/gold-standard-100-whey-protein-powder-eu?variant=52105832956171
    pub(crate) const ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION_STR: &str = r#"{
      "name": "Optimum Nutrition Gold Standard 100% Whey",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 374,
        "total_fat": { "grams": 4.0 },
        "saturated_fat": 1.4,
        "carbohydrates": 4.2,
        "sugars": 3.3,
        "protein": 80,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Optimum Nutrition Gold Standard 100% Whey".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(374.0),
                total_fat: Unit::Grams(4.0),
                saturated_fat: Some(1.4),
                trans_fat: None,
                carbohydrates: Some(4.2),
                sugars: 3.3,
                protein: 80.0,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(SolidsSource::Whey),
            }
            .into(),
        });

    pub(crate) static COMP_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(374.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(4.0).saturated(1.4).trans(0.14))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(3.3)))
                            .proteins(MilkProteins::new().whey(80.0))
                            .minerals(3.2915)
                            .others(0.1522),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(0.7478))),
            )
            .pod(0.528)
            .pac(PAC::new().sugars(3.3).msnf_ws_salts(31.87))
    });

    #[test]
    fn to_composition_dairy_label_spec_gold_standard_whey_optimum_nutrition() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION);

        comp.assert_all_keys(&[
            (CompKey::Energy, 374.0),
            (CompKey::MilkSolids, 90.743_611),
            (CompKey::MilkFat, 4.0),
            (CompKey::MSNF, 86.743_611),
            (CompKey::MilkSugars, 3.3),
            (CompKey::MilkSNFS, 83.443_611),
            (CompKey::MilkProteins, 80.0),
            (CompKey::Casein, 0.0),
            (CompKey::Whey, 80.0),
            (CompKey::MilkMinerals, 3.291_458),
            (CompKey::OtherSNFS, 0.747_847),
            (CompKey::TotalSolids, 91.491_458),
            (CompKey::TotalFats, 4.0),
            (CompKey::TotalSNF, 87.491_458),
            (CompKey::TotalSNFS, 84.191_458),
            (CompKey::TotalProteins, 80.0),
            (CompKey::TotalMinerals, 3.291_458),
            (CompKey::Water, 8.508_542),
            (CompKey::TotalCarbohydrates, 4.047_847),
            (CompKey::TotalSugars, 3.3),
            (CompKey::Lactose, 3.3),
            (CompKey::TotalSweeteners, 3.3),
            (CompKey::POD, 0.528),
            (CompKey::NetPAC, 35.169_955),
            (CompKey::TotalPAC, 35.169_955),
            (CompKey::PACsgr, 3.3),
            (CompKey::PACmlk, 31.869_955),
            (CompKey::SaturatedFat, 1.4),
            (CompKey::TransFat, 0.14),
        ]);
    }

    // https://www.optimumnutrition.com/products/gold-standard-100-casein-protein-powder-eu?variant=52105828106507
    pub(crate) const ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION_STR: &str = r#"{
      "name": "Optimum Nutrition Gold Standard 100% Casein",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 352,
        "total_fat": { "grams": 1.8 },
        "saturated_fat": 1.1,
        "carbohydrates": 11,
        "sugars": 4.3,
        "protein": 73,
        "solids_source": "MicellarCasein"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Optimum Nutrition Gold Standard 100% Casein".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(352.0),
                total_fat: Unit::Grams(1.8),
                saturated_fat: Some(1.1),
                trans_fat: None,
                carbohydrates: Some(11.0),
                sugars: 4.3,
                protein: 73.0,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(SolidsSource::MicellarCasein),
            }
            .into(),
        });

    pub(crate) static COMP_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(352.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(1.8).saturated(1.1).trans(0.063))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.3)))
                            .proteins(MilkProteins::new().casein(67.1787).whey(5.8213))
                            .minerals(6.9760),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(6.7))),
            )
            .pod(0.688)
            .pac(PAC::new().sugars(4.3).msnf_ws_salts(30.9633))
    });

    #[test]
    fn to_composition_dairy_label_spec_gold_standard_casein_optimum_nutrition() {
        let comp = asset_composition(&ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION);

        comp.assert_all_keys(&[
            (CompKey::Energy, 352.0),
            (CompKey::MilkSolids, 86.075_955),
            (CompKey::MilkFat, 1.8),
            (CompKey::MSNF, 84.275_955),
            (CompKey::MilkSugars, 4.3),
            (CompKey::MilkSNFS, 79.975_955),
            (CompKey::MilkProteins, 73.0),
            (CompKey::Casein, 67.178_732),
            (CompKey::Whey, 5.821_268),
            (CompKey::MilkMinerals, 6.975_955),
            (CompKey::OtherSNFS, 6.7),
            (CompKey::TotalSolids, 92.775_955),
            (CompKey::TotalFats, 1.8),
            (CompKey::TotalSNF, 90.975_955),
            (CompKey::TotalSNFS, 86.675_955),
            (CompKey::TotalProteins, 73.0),
            (CompKey::TotalMinerals, 6.975_955),
            (CompKey::Water, 7.224_045),
            (CompKey::TotalCarbohydrates, 11.0),
            (CompKey::TotalSugars, 4.3),
            (CompKey::Lactose, 4.3),
            (CompKey::TotalSweeteners, 4.3),
            (CompKey::POD, 0.688),
            (CompKey::NetPAC, 35.263_328),
            (CompKey::TotalPAC, 35.263_328),
            (CompKey::PACsgr, 4.3),
            (CompKey::PACmlk, 30.963_328),
            (CompKey::SaturatedFat, 1.1),
            (CompKey::TransFat, 0.063),
        ]);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_DAIRY_LABEL: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (
                    ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST_STR,
                    ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST.clone(),
                    Some(*COMP_3_25_MILK_SEALTEST),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE.clone(),
                    Some(*COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA_STR,
                    ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA.clone(),
                    Some(*COMP_2_ULTRAFILTERED_MILK_LACTANTIA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_CARNATION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND_STR,
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND.clone(),
                    Some(*COMP_SWEETENED_CONDENSED_MILK_EAGLE_BRAND),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION_STR,
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION.clone(),
                    Some(*COMP_SKIM_MILK_POWDER_MEDALLION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION.clone(),
                    Some(*COMP_WHOLE_MILK_POWDER_MEDALLION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND_STR,
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND.clone(),
                    Some(*COMP_SKIM_MILK_POWDER_THELAND),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND.clone(),
                    Some(*COMP_WHOLE_MILK_POWDER_THELAND),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE_STR,
                    ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE.clone(),
                    Some(*COMP_WHEY_ISOLATE),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION_STR,
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION.clone(),
                    Some(*COMP_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION_STR,
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION.clone(),
                    Some(*COMP_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION),
                ),
            ]
        });

    #[test]
    fn dairy_label_spec_water_floor_with_sucrose() {
        let comp = DairyLabelSpec {
            serving_size: Unit::Grams(100.0),
            energy: None,
            total_fat: Unit::Grams(26.0),
            saturated_fat: None,
            trans_fat: None,
            carbohydrates: Some(52.0),
            sugars: 50.0,
            protein: 17.0,
            lactose_free: None,
            sucrose: Some(20.0),
            solids_source: None,
        }
        .to_composition()
        .unwrap();

        // The estimated 51.09g MSNF is capped at 98% solids, less fat, sucrose, and other carbs
        assert_eq_flt!(comp.get(CompKey::MSNF), 50.0);
        assert_eq_flt!(comp.get(CompKey::Water), 2.0);
    }

    /// A label for 90 g of whey solids and 1 g of fat, whose sugars are the solids' lactose
    fn whey_label_spec(protein_fraction: f64, carbohydrates: Option<f64>) -> DairyLabelSpec {
        DairyLabelSpec {
            serving_size: Unit::Grams(100.0),
            energy: None,
            total_fat: Unit::Grams(1.0),
            saturated_fat: None,
            trans_fat: None,
            carbohydrates,
            sugars: 90.0 * lactose_in_snf(protein_fraction, SolidsSource::Whey),
            protein: 90.0 * protein_fraction,
            lactose_free: None,
            sucrose: None,
            solids_source: Some(SolidsSource::Whey),
        }
    }

    #[test]
    fn dairy_label_spec_whey_lines_endpoints() {
        // At both anchors the estimate adds minerals and unaccounted solids to lactose and protein;
        // carbohydrates by difference hold the latter too, which leaves no other carbohydrates
        for protein_fraction in [STD_PROTEIN_IN_WS, STD_PROTEIN_IN_WPI] {
            let sugars = 90.0 * lactose_in_snf(protein_fraction, SolidsSource::Whey);
            let unaccounted = 90.0 * unaccounted_in_snf(protein_fraction, SolidsSource::Whey);

            for carbohydrates in [None, Some(sugars + unaccounted)] {
                let comp = whey_label_spec(protein_fraction, carbohydrates)
                    .to_composition()
                    .unwrap();

                assert_eq_flt!(comp.get(CompKey::MSNF), 90.0);
                assert_eq_flt!(comp.get(CompKey::OtherSNFS), 0.0);
                assert_eq_8dp!(comp.get(CompKey::Water), 9.0);
            }
        }
    }

    #[test]
    fn dairy_label_spec_whey_other_carbohydrates_beyond_unaccounted_solids() {
        // Carbohydrates beyond the sugars and the 1.8 g of unaccounted solids, e.g. from additives,
        // are other carbohydrates; any up to that are already in the solids non-fat
        let sugars = 90.0 * STD_LACTOSE_IN_WS;

        for (carbohydrates, other_carbohydrates) in [(sugars + 1.8 + 2.0, 2.0), (sugars + 1.0, 0.0)] {
            let comp = whey_label_spec(STD_PROTEIN_IN_WS, Some(carbohydrates))
                .to_composition()
                .unwrap();

            assert_eq_flt!(comp.get(CompKey::MSNF), 90.0);
            assert_eq_8dp!(comp.get(CompKey::OtherSNFS), other_carbohydrates);
            assert_eq_8dp!(comp.get(CompKey::Water), 9.0 - other_carbohydrates);
        }
    }

    #[test]
    fn dairy_label_spec_casein_forms() {
        // Each form's estimated solids non-fat hold the label's sugars and protein, the minerals at
        // their line's protein fraction, none unaccounted, and protein splits along its casein line
        for source in [SolidsSource::MicellarCasein, SolidsSource::Caseinate] {
            let comp = DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: None,
                total_fat: Unit::Grams(1.0),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: None,
                sugars: 1.0,
                protein: 85.0,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(source),
            }
            .to_composition()
            .unwrap();

            let snf = comp.get(CompKey::MSNF);
            let protein_fraction = 85.0 / snf;
            assert_eq_flt!(snf, 86.0 + snf * minerals_in_snf(protein_fraction, source));
            assert_eq_flt!(comp.get(CompKey::Casein), 85.0 * casein_in_protein(protein_fraction, source));
            assert_eq_flt!(comp.get(CompKey::Casein) + comp.get(CompKey::Whey), 85.0);
            assert_eq_flt!(comp.get(CompKey::Water), 99.0 - snf);
        }
    }

    #[test]
    fn dairy_label_spec_err_on_unsupported_unit() {
        let base = DairyLabelSpec {
            serving_size: Unit::Milliliters(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(8.0),
            saturated_fat: Some(5.0),
            trans_fat: Some(0.3),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        };

        // serving_size,  total_fat
        // ✔ Grams,       Grams       | Percent
        // ✘ Grams,       Milliliters | MolarMass
        // ✔ Milliliters, Grams       | Percent
        // ✘ Milliliters, Milliliters | MolarMass
        // ✘ Percent,     any unit
        // ✘ MolarMass,   any unit
        let bad_units = [
            // ✘ Grams,       Milliliters | MolarMass
            DairyLabelSpec {
                serving_size: Unit::Grams(250.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Grams(250.0),
                total_fat: Unit::MolarMass(3.25),
                ..base
            },
            // ✘ Milliliters, Milliliters | MolarMass
            DairyLabelSpec {
                serving_size: Unit::Milliliters(100.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Milliliters(250.0),
                total_fat: Unit::MolarMass(3.25),
                ..base
            },
            // ✘ Percent,     any unit
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::Grams(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::Percent(3.25),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::MolarMass(8.0),
                ..base
            },
            // ✘ MolarMass,   any unit
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::Grams(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::Percent(3.25),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::MolarMass(8.0),
                ..base
            },
        ];

        for spec in bad_units {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::UnsupportedCompositionUnit(_))));
        }
    }

    #[test]
    fn dairy_label_spec_err_on_negative_field() {
        let base = DairyLabelSpec {
            serving_size: Unit::Grams(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(8.0),
            saturated_fat: Some(5.0),
            trans_fat: Some(0.3),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        };

        let neg_cases = [
            DairyLabelSpec {
                serving_size: Unit::Grams(-1.0),
                ..base
            },
            DairyLabelSpec {
                total_fat: Unit::Grams(-1.0),
                ..base
            },
            DairyLabelSpec {
                saturated_fat: Some(-1.0),
                ..base
            },
            DairyLabelSpec {
                trans_fat: Some(-1.0),
                ..base
            },
            DairyLabelSpec { sugars: -1.0, ..base },
            DairyLabelSpec { protein: -1.0, ..base },
        ];

        for spec in neg_cases {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn dairy_label_spec_err_when_saturated_fat_exceeds_total_fat() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(5.0),
            saturated_fat: Some(8.0),
            trans_fat: Some(0.0),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_label_spec_err_when_trans_fat_exceeds_total_fat() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(5.0),
            saturated_fat: Some(3.0),
            trans_fat: Some(8.0),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_label_spec_err_when_fat_plus_sugars_plus_protein_exceeds_serving_size() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(20.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(8.0),
            saturated_fat: Some(5.0),
            trans_fat: Some(0.3),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_label_spec_err_when_micellar_casein_protein_is_below_milk_solids() {
        // At 30 g of protein in ~87 g of solids non-fat, under milk solids' 37.5%, the micellar
        // casein lines would split its protein with more whey than milk has
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(100.0),
            energy: None,
            total_fat: Unit::Grams(1.0),
            saturated_fat: None,
            trans_fat: None,
            carbohydrates: None,
            sugars: 50.0,
            protein: 30.0,
            lactose_free: None,
            sucrose: None,
            solids_source: Some(SolidsSource::MicellarCasein),
        }
        .to_composition();
        assert!(matches!(result, Err(Error::UnsupportedComposition(_))));
    }
}
