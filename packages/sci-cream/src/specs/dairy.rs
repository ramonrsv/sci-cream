use serde::{Deserialize, Serialize};

use crate::{
    composition::{Carbohydrates, Composition, Fats, IntoComposition, PAC, Solids, SolidsBreakdown, Sugars},
    constants::{self, density::dairy_milliliters_to_grams},
    error::{Error, Result},
    specs::units::Unit,
    validate::{assert_are_positive, assert_is_subset, assert_within_100_percent},
};

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, Polyols},
    constants::composition::{
        STD_LACTOSE_IN_MSNF, STD_MSNF_IN_MILK_SERUM, STD_PROTEIN_IN_MSNF, STD_SATURATED_FAT_IN_MILK_FAT,
    },
};

/// Spec for trivial dairy ingredients, e.g. Milk, Cream, Milk Powder, etc.
///
/// For most ingredients it is sufficient to specify the fat content; the rest of the components are
/// calculated from standard values, notably [`STD_MSNF_IN_MILK_SERUM`], [`STD_LACTOSE_IN_MSNF`],
/// [`STD_PROTEIN_IN_MSNF`], and [`STD_SATURATED_FAT_IN_MILK_FAT`]. For milk powder ingredients it's
/// necessary to specify the `msnf`, e.g. 97 for Skimmed Milk Powder - 3% water, no fat, the rest is
/// milk solids non-fat, or 70 for Whole Milk Powder - 3% water, 27% fat, the rest is `msnf`.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySpec {
    pub fat: f64,
    pub msnf: Option<f64>,
}

impl IntoComposition for DairySpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { fat, msnf } = self;

        let calculated_msnf = (100.0 - fat) * constants::composition::STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);
        assert_are_positive(&[fat, msnf])?;
        assert_within_100_percent(fat + msnf)?;

        let lactose = msnf * constants::composition::STD_LACTOSE_IN_MSNF;
        let proteins = msnf * constants::composition::STD_PROTEIN_IN_MSNF;

        let milk_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(fat)
                    .saturated(fat * constants::composition::STD_SATURATED_FAT_IN_MILK_FAT)
                    .trans(fat * constants::composition::STD_TRANS_FAT_IN_MILK_FAT),
            )
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(lactose)))
            .proteins(proteins)
            .others(msnf - lactose - proteins);

        let pod = milk_solids.carbohydrates.to_pod()?;
        let pad = PAC::new()
            .sugars(milk_solids.carbohydrates.to_pac()?)
            .msnf_ws_salts(msnf * constants::pac::MSNF_WS_SALTS / 100.0);

        Ok(Composition::new()
            .energy(milk_solids.energy()?)
            .solids(Solids::new().milk(milk_solids))
            .pod(pod)
            .pac(pad))
    }
}

/// Spec for dairy ingredients derived from nutrition facts labels, with detailed breakdown
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairyFromNutritionSpec {
    /// Serving size in grams; if given in ml, it is converted to grams based on fat content
    ///
    /// See [`constants::density::dairy_milliliters_to_grams`].
    pub serving_size: Unit,
    /// Energy per serving, in kcal
    pub energy: f64,
    /// Total fat content per serving; it can be given in grams or as a percentage of serving size
    ///
    /// If a dairy product states a fat content percentage on the label, that is usually more
    /// accurate than the whole unit grams in the nutrition facts table, so specifying a total fat
    /// percentage is recommended whenever possible.
    pub total_fat: Unit,
    pub saturated_fat: f64,
    pub trans_fat: f64,
    pub sugars: f64,
    pub protein: f64,
    pub is_lactose_free: bool,
}

impl IntoComposition for DairyFromNutritionSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            serving_size,
            energy,
            total_fat,
            saturated_fat,
            trans_fat,
            sugars,
            protein,
            is_lactose_free,
        } = self;

        let (serving_size, total_fat) = match total_fat {
            Unit::Grams(fat_grams) => match serving_size {
                Unit::Grams(size_grams) => (size_grams, fat_grams),
                Unit::Milliliters(size_ml) => (dairy_milliliters_to_grams(size_ml, fat_grams), fat_grams),
                _ => Err(Error::UnsupportedCompositionUnit(serving_size))?,
            },
            Unit::Percent(fat_percent) => match serving_size {
                Unit::Grams(size_grams) => (size_grams, size_grams * fat_percent / 100.0),
                Unit::Milliliters(size_ml) => {
                    let size_grams = dairy_milliliters_to_grams(size_ml, fat_percent);
                    (size_grams, size_grams * fat_percent / 100.0)
                }
                _ => Err(Error::UnsupportedCompositionUnit(serving_size))?,
            },
            _ => Err(Error::UnsupportedCompositionUnit(serving_size))?,
        };

        assert_are_positive(&[serving_size, total_fat, saturated_fat, trans_fat, sugars, protein])?;
        assert_is_subset(saturated_fat, total_fat, "saturated_fat <= total_fat")?;
        assert_is_subset(trans_fat, total_fat, "trans_fat <= total_fat")?;
        assert_is_subset(total_fat + sugars + protein, serving_size, "total_fat + sugars + protein <= serving_size")?;

        let sugars = if is_lactose_free {
            Sugars::new()
                .glucose(sugars / serving_size * 100.0 / 2.0)
                .galactose(sugars / serving_size * 100.0 / 2.0)
        } else {
            Sugars::new().lactose(sugars / serving_size * 100.0)
        };

        let milk_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(total_fat / serving_size * 100.0)
                    .saturated(saturated_fat / serving_size * 100.0)
                    .trans(trans_fat / serving_size * 100.0),
            )
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .proteins(protein / serving_size * 100.0);

        Ok(Composition::new()
            .energy(energy / serving_size * 100.0)
            .solids(Solids::new().milk(milk_solids))
            .pod(sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(sugars.to_pac()?)
                    .msnf_ws_salts(milk_solids.snf() * constants::pac::MSNF_WS_SALTS / 100.0),
            ))
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::{
        composition::CompKey,
        ingredients::Category,
        specs::{IngredientSpec, Spec},
    };

    pub(crate) const ING_SPEC_DAIRY_2_MILK_STR: &str = r#"{
      "name": "2% Milk",
      "category": "Dairy",
      "DairySpec": {
        "fat": 2
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_2_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec { fat: 2.0, msnf: None }),
    });

    pub(crate) static COMP_2_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(49.5756)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.3).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.8069)))
                        .proteins(3.087)
                        .others_from_total(2.0 + 8.82)
                        .unwrap(),
                ),
            )
            .pod(0.769_104)
            .pac(PAC::new().sugars(4.8069).msnf_ws_salts(3.2405))
    });

    #[test]
    fn into_composition_dairy_spec_2_milk() {
        let comp = ING_SPEC_DAIRY_2_MILK.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 49.5756);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.8069);
        assert_eq!(comp.get(CompKey::MSNF), 8.82);
        assert_eq!(comp.get(CompKey::MilkSNFS), 4.0131);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.087);
        assert_eq!(comp.get(CompKey::MilkSolids), 10.82);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.087);
        assert_eq!(comp.get(CompKey::TotalSolids), 10.82);
        assert_eq!(comp.get(CompKey::Water), 89.18);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.769_104);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.8069);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.2405);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 8.0474);
    }

    pub(crate) const ING_SPEC_DAIRY_3_25_MILK_STR: &str = r#"{
      "name": "3.25% Milk",
      "category": "Dairy",
      "DairySpec": {
        "fat": 3.25
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_3_25_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "3.25% Milk".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec { fat: 3.25, msnf: None }),
    });

    pub(crate) static COMP_3_25_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(60.42285)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(2.1125).trans(0.11375))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.7456)))
                        .proteins(3.0476)
                        .others(0.9143),
                ),
            )
            .pod(0.7593)
            .pac(PAC::new().sugars(4.7456).msnf_ws_salts(3.1992))
    });

    #[test]
    fn into_composition_dairy_spec_3_25_milk() {
        let comp = ING_SPEC_DAIRY_3_25_MILK.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 60.42285);

        assert_eq!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.7456);
        assert_eq!(comp.get(CompKey::MSNF), 8.7075);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.9619);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.0476);
        assert_eq!(comp.get(CompKey::MilkSolids), 11.9575);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.0476);
        assert_eq!(comp.get(CompKey::TotalSolids), 11.9575);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.0425);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7593);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.7456);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.1992);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 7.9448);
    }

    pub(crate) const ING_SPEC_DAIRY_40_CREAM_STR: &str = r#"{
      "name": "40% Cream",
      "category": "Dairy",
      "DairySpec": {
        "fat": 40
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_40_CREAM: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "40% Cream".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec { fat: 40.0, msnf: None }),
    });

    pub(crate) static COMP_40_CREAM: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(379.332)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(40.0).saturated(26.0).trans(1.4))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.943)))
                        .proteins(1.89)
                        .others_from_total(40.0 + 5.4)
                        .unwrap(),
                ),
            )
            .pod(0.47088)
            .pac(PAC::new().sugars(2.943).msnf_ws_salts(1.984))
    });

    #[test]
    fn into_composition_dairy_spec_40_cream() {
        let comp = ING_SPEC_DAIRY_40_CREAM.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 379.332);

        assert_eq!(comp.get(CompKey::MilkFat), 40.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.943);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 5.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 2.457);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 1.89);
        assert_eq!(comp.get(CompKey::MilkSolids), 45.4);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 1.89);
        assert_eq!(comp.get(CompKey::TotalSolids), 45.4);
        assert_eq!(comp.get(CompKey::Water), 54.6);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.47088);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.943);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 1.984);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 4.927);
    }

    pub(crate) const ING_SPEC_DAIRY_SKIMMED_POWDER_STR: &str = r#"{
      "name": "Skimmed Milk Powder",
      "category": "Dairy",
      "DairySpec": {
        "fat": 0,
        "msnf": 97
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SKIMMED_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Skimmed Milk Powder".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec {
            fat: 0.0,
            msnf: Some(97.0),
        }),
    });

    pub(crate) static COMP_SKIMMED_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(347.26)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(52.865)))
                        .proteins(33.95)
                        .others_from_total(97.0)
                        .unwrap(),
                ),
            )
            .pod(8.4584)
            .pac(PAC::new().sugars(52.865).msnf_ws_salts(35.6382))
    });

    #[test]
    fn into_composition_dairy_spec_skimmed_powder() {
        let comp = ING_SPEC_DAIRY_SKIMMED_POWDER.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 347.26);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 52.865);
        assert_eq!(comp.get(CompKey::MSNF), 97.0);
        assert_eq!(comp.get(CompKey::MilkSNFS), 44.135);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 33.95);
        assert_eq!(comp.get(CompKey::MilkSolids), 97.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 33.95);
        assert_eq!(comp.get(CompKey::TotalSolids), 97.0);
        assert_eq!(comp.get(CompKey::Water), 3.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 8.4584);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 52.865);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.6382);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 88.5032);
    }

    pub(crate) const ING_SPEC_DAIRY_WHOLE_POWDER_STR: &str = r#"{
      "name": "Whole Milk Powder",
      "category": "Dairy",
      "DairySpec": {
        "fat": 27,
        "msnf": 70
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_WHOLE_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Whole Milk Powder".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec {
            fat: 27.0,
            msnf: Some(70.0),
        }),
    });

    pub(crate) static COMP_WHOLE_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(493.6)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(27.0).saturated(17.55).trans(0.945))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(38.15)))
                        .proteins(24.5)
                        .others_from_total(97.0)
                        .unwrap(),
                ),
            )
            .pod(6.104)
            .pac(PAC::new().sugars(38.15).msnf_ws_salts(25.7183))
    });

    #[test]
    fn into_composition_dairy_spec_whole_powder() {
        let comp = ING_SPEC_DAIRY_WHOLE_POWDER.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 493.6);

        assert_eq!(comp.get(CompKey::MilkFat), 27.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 38.15);
        assert_eq!(comp.get(CompKey::MSNF), 70.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 31.85);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 24.5);
        assert_eq!(comp.get(CompKey::MilkSolids), 97.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 24.5);
        assert_eq!(comp.get(CompKey::TotalSolids), 97.0);
        assert_eq!(comp.get(CompKey::Water), 3.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 6.104);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 38.15);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 25.7183);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 63.8683);
    }

    pub(crate) const ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK_STR: &str = r#"{
      "name": "3.25% Milk (from nutrition facts)",
      "category": "Dairy",
      "DairyFromNutritionSpec": {
        "serving_size": { "ml": 250 },
        "energy": 160,
        "total_fat": { "percent": 3.25 },
        "saturated_fat": 5,
        "trans_fat": 0.3,
        "sugars": 13,
        "protein": 9,
        "is_lactose_free": false
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "3.25% Milk (from nutrition facts)".to_string(),
            category: Category::Dairy,
            spec: Spec::DairyFromNutritionSpec(DairyFromNutritionSpec {
                serving_size: Unit::Milliliters(250.0), // 257.6667 grams
                energy: 160.0,
                total_fat: Unit::Percent(3.25), // 3.25% is 8.3742g, not 8g
                saturated_fat: 5.0,
                trans_fat: 0.3,
                sugars: 13.0,
                protein: 9.0,
                is_lactose_free: false,
            }),
        });

    pub(crate) static COMP_3_25_MILK_FROM_NUTRITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(62.0957)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(1.9405).trans(0.1164))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.04528)))
                        .proteins(3.49288),
                ),
            )
            .pod(0.8072)
            .pac(PAC::new().sugars(5.04528).msnf_ws_salts(3.137))
    });

    #[test]
    fn into_composition_dairy_from_nutrition_spec_3_25_milk() {
        let comp = ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 62.0957);

        assert_eq!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.04528);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.53816);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.78816);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.78816);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.2118);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.8072);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 5.04528);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.137);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 8.1823);
    }

    pub(crate) const ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR: &str = r#"{
      "name": "Whole Ultra-Filtered Lactose-Free Milk",
      "category": "Dairy",
      "DairyFromNutritionSpec": {
        "serving_size": { "ml": 240 },
        "energy": 150,
        "total_fat": { "grams": 8 },
        "saturated_fat": 5,
        "trans_fat": 0,
        "sugars": 6,
        "protein": 13,
        "is_lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Whole Ultra-Filtered Lactose-Free Milk".to_string(),
            category: Category::Dairy,
            spec: Spec::DairyFromNutritionSpec(DairyFromNutritionSpec {
                serving_size: Unit::Milliliters(240.0), // 245.1288 grams
                energy: 150.0,
                total_fat: Unit::Grams(8.0), // 8g is 3.2636%
                saturated_fat: 5.0,
                trans_fat: 0.0,
                sugars: 6.0,
                protein: 13.0,
                is_lactose_free: true,
            }),
        });

    pub(crate) static COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.1923)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.2636).saturated(2.0397).trans(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(1.22385).galactose(1.22385)))
                        .proteins(5.3033),
                ),
            )
            .pod(1.7746)
            .pac(PAC::new().sugars(4.65063).msnf_ws_salts(2.8477))
    });

    #[test]
    fn into_composition_dairy_spec_whole_ultra_filtered_lactose_free() {
        let comp = ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE
            .spec
            .into_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 61.1923);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 3.2636);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 1.22385);
        assert_eq_flt_test!(comp.get(CompKey::Galactose), 1.22385);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 7.751);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.0146);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.0146);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.9854);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.7746);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.65063);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 2.8477);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 7.4983);
    }

    pub(crate) const ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE_STR: &str = r#"{
      "name": "Whey Isolate",
      "category": "Dairy",
      "DairyFromNutritionSpec": {
        "serving_size": { "grams": 39 },
        "energy": 150,
        "total_fat": { "grams": 0.5 },
        "saturated_fat": 0.3,
        "trans_fat": 0,
        "sugars": 1,
        "protein": 35,
        "is_lactose_free": false
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Whey Isolate".to_string(),
            category: Category::Dairy,
            spec: Spec::DairyFromNutritionSpec(DairyFromNutritionSpec {
                serving_size: Unit::Grams(39.0),
                energy: 150.0,
                total_fat: Unit::Grams(0.5),
                saturated_fat: 0.3,
                trans_fat: 0.0,
                sugars: 1.0,
                protein: 35.0,
                is_lactose_free: false,
            }),
        });

    pub(crate) static COMP_WHEY_ISOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(384.6154)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.2821).saturated(0.7692).trans(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.5641)))
                        .proteins(89.7436),
                ),
            )
            .pod(0.4103)
            .pac(PAC::new().sugars(2.5641).msnf_ws_salts(33.9142))
    });

    #[test]
    fn into_composition_dairy_from_nutrition_spec_whey_isolate() {
        let comp = ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE
            .spec
            .into_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 384.6154);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.2821);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.5641);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 92.3077);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 93.5898);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 93.5898);
        assert_eq_flt_test!(comp.get(CompKey::Water), 6.4102);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.4103);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.5641);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 33.9142);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 36.4783);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_DAIRY: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_DAIRY_2_MILK_STR, ING_SPEC_DAIRY_2_MILK.clone(), Some(*COMP_2_MILK)),
                (ING_SPEC_DAIRY_3_25_MILK_STR, ING_SPEC_DAIRY_3_25_MILK.clone(), Some(*COMP_3_25_MILK)),
                (ING_SPEC_DAIRY_40_CREAM_STR, ING_SPEC_DAIRY_40_CREAM.clone(), Some(*COMP_40_CREAM)),
                (ING_SPEC_DAIRY_SKIMMED_POWDER_STR, ING_SPEC_DAIRY_SKIMMED_POWDER.clone(), Some(*COMP_SKIMMED_POWDER)),
                (ING_SPEC_DAIRY_WHOLE_POWDER_STR, ING_SPEC_DAIRY_WHOLE_POWDER.clone(), Some(*COMP_WHOLE_POWDER)),
                (
                    ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK_STR,
                    ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK.clone(),
                    Some(*COMP_3_25_MILK_FROM_NUTRITION),
                ),
                (
                    ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR,
                    ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE.clone(),
                    Some(*COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE),
                ),
                (
                    ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE_STR,
                    ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE.clone(),
                    Some(*COMP_WHEY_ISOLATE),
                ),
            ]
        });
}
