//! [`DairySimpleSpec`], [`DairyLabelSpec`], and associated implementations, for dairy ingredients
//! such as milk, cream, milk powders, protein powders, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fats, PAC, ScaleComponents, Solids, SolidsBreakdown, Sugars, ToComposition,
    },
    constants::{self, density::dairy_milliliters_to_grams},
    error::{Error, Result},
    specs::units::Unit,
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
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
pub struct DairySimpleSpec {
    /// Fat content by weight, e.g. 3.25 for whole milk, 40 for cream, and 0 for skimmed milk powder.
    pub fat: f64,
    /// Milk solids non-fat content by weight, calculated internally for typical milks and creams.
    ///
    /// It is necessary to specify `msnf` for milk powders and other condensed or dried dairy
    /// products, as they do not adhere to the standard milk and cream composition ratios.
    pub msnf: Option<f64>,
    /// Whether the dairy product is lactose-free, which affects the detailed sugars composition
    ///
    /// If `false`/`None`, the sugars are assumed to be all lactose, calculated from
    /// [`msnf`](Self::msnf) via [`STD_LACTOSE_IN_MSNF`]. If `true`, the same amount of lactose is
    /// instead assumed to be a 50/50 glucose and galactose mixture, the two monosaccharides that
    /// make up lactose, which is typical of lactose-free dairy products where lactose is
    /// enzymatically broken down into its constituent sugars.
    pub lactose_free: Option<bool>,
}

impl ToComposition for DairySimpleSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            fat,
            msnf,
            lactose_free,
        } = *self;

        let lactose_free = lactose_free.unwrap_or(false);

        let calculated_msnf = (100.0 - fat) * constants::composition::STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);
        verify_are_positive(&[fat, msnf])?;
        verify_is_within_100_percent(fat + msnf)?;

        let lactose = msnf * constants::composition::STD_LACTOSE_IN_MSNF;
        let proteins = msnf * constants::composition::STD_PROTEIN_IN_MSNF;

        let sugars = if lactose_free {
            Sugars::new().glucose(lactose / 2.0).galactose(lactose / 2.0)
        } else {
            Sugars::new().lactose(lactose)
        };

        let milk_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(fat)
                    .saturated(fat * constants::composition::STD_SATURATED_FAT_IN_MILK_FAT)
                    .trans(fat * constants::composition::STD_TRANS_FAT_IN_MILK_FAT),
            )
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .proteins(proteins)
            .others(msnf - lactose - proteins);

        let pod = milk_solids.carbohydrates.to_pod()?;
        let pad = PAC::new()
            .sugars(milk_solids.carbohydrates.to_pac()?)
            .msnf_ws_salts(msnf * constants::pac::MSNF_WS_SALTS / 100.0);

        Composition::new()
            .energy(milk_solids.energy()?)
            .solids(Solids::new().milk(milk_solids))
            .pod(pod)
            .pac(pad)
            .validate_into()
    }
}

/// Spec for dairy ingredients derived from nutrition facts labels, with detailed breakdown.
///
/// This spec is more flexible than [`DairySimpleSpec`] and can accommodate a wider range of dairy
/// products, including those with non-standard compositions, e.g. lactose-free products with
/// different types of sugars, whey protein or isolate powder, or other specialized dairy products.
/// The required values can typically be pulled directly from the nutrition facts label.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairyLabelSpec {
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
    /// Saturated fat content per serving, in grams; it must be a subset of total fat.
    pub saturated_fat: f64,
    /// Trans fat content per serving, in grams; it must be a subset of total fat.
    pub trans_fat: f64,
    /// Sugars content per serving, in grams; the detailed composition is determined by
    /// [`lactose_free`](Self::lactose_free) and [`sucrose`](Self::sucrose).
    pub sugars: f64,
    /// Protein content per serving, in grams.
    pub protein: f64,
    /// Whether the dairy product is lactose-free, which affects the detailed composition of
    /// [`sugars`](Self::sugars).
    ///
    /// If `false`/`None`, the non-sucrose sugars are assumed to be all lactose, which is the
    /// predominant sugar in regular dairy products. If `true`, the non-sucrose sugars are assumed
    /// to be a 50/50 glucose and galactose mixture, the two monosaccharides that make up lactose,
    /// which is typical of lactose free dairy products where lactose is enzymatically broken down
    /// into its constituent sugars.
    ///
    /// See [`sucrose`](Self::sucrose) for the possibility of other types of sugars.
    pub lactose_free: Option<bool>,
    /// Sucrose content per serving, in grams, assumed to be zero if not specified
    ///
    /// This accommodates dairy products with added sugars, e.g. sweetened condensed milk. It must
    /// be a subset of [`sugars`](Self::sugars), the rest is assumed to be natural dairy sugars.
    ///
    /// Note that this is included under [`Solids::other`], not under [`Solids::milk`].
    ///
    /// See [`lactose_free`](Self::sucrose) for the possibility of different natural sugar
    /// compositions in lactose-free products.
    pub sucrose: Option<f64>,
}

impl ToComposition for DairyLabelSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            serving_size,
            energy,
            total_fat,
            saturated_fat,
            trans_fat,
            sugars,
            protein,
            lactose_free,
            sucrose,
        } = *self;

        let lactose_free = lactose_free.unwrap_or(false);
        let sucrose = sucrose.unwrap_or(0.0);

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

        verify_are_positive(&[serving_size, total_fat, saturated_fat, trans_fat, sugars, protein])?;
        verify_is_subset(saturated_fat, total_fat, "saturated_fat <= total_fat")?;
        verify_is_subset(trans_fat, total_fat, "trans_fat <= total_fat")?;
        verify_is_subset(total_fat + sugars + protein, serving_size, "total_fat + sugars + protein <= serving_size")?;
        verify_is_subset(sucrose, sugars, "sucrose <= sugars")?;

        let dairy_sugars = sugars - sucrose;
        let dairy_sugars = if lactose_free {
            Sugars::new().glucose(dairy_sugars / 2.0).galactose(dairy_sugars / 2.0)
        } else {
            Sugars::new().lactose(dairy_sugars)
        };

        let other_sugars = Sugars::new().sucrose(sucrose);
        let total_sugars = dairy_sugars.add(&other_sugars);

        let milk_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(total_fat).saturated(saturated_fat).trans(trans_fat))
            .carbohydrates(Carbohydrates::new().sugars(dairy_sugars))
            .proteins(protein);

        let other_solids = SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(other_sugars));

        Composition::new()
            .energy(energy)
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(total_sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(total_sugars.to_pac()?)
                    .msnf_ws_salts(milk_solids.snf() * constants::pac::MSNF_WS_SALTS / 100.0),
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

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;
    use crate::tests::util::assert_comp_eq_percent;

    use super::*;
    use crate::{composition::CompKey, error::Error, ingredient::Category, specs::IngredientSpec};

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_0_MILK_STR: &str = r#"{
      "name": "0% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 0
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_0_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "0% Milk".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 0.0,
            msnf: None,
            lactose_free: None,
        }
        .into(),
    });

    pub(crate) static COMP_0_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(32.22)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.905)))
                        .proteins(3.15)
                        .others_from_total(9.0)
                        .unwrap(),
                ),
            )
            .pod(0.7848)
            .pac(PAC::new().sugars(4.905).msnf_ws_salts(3.3066))
    });

    #[test]
    fn to_composition_dairy_simple_spec_0_milk() {
        let comp = ING_SPEC_DAIRY_SIMPLE_0_MILK.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 32.22);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.905);
        assert_eq!(comp.get(CompKey::MSNF), 9.0);
        assert_eq!(comp.get(CompKey::MilkSNFS), 4.095);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.15);
        assert_eq!(comp.get(CompKey::MilkSolids), 9.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.15);
        assert_eq!(comp.get(CompKey::TotalSolids), 9.0);
        assert_eq!(comp.get(CompKey::Water), 91.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7848);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.905);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.3066);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 8.2116);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_2_MILK_STR: &str = r#"{
      "name": "2% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 2
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_2_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 2.0,
            msnf: None,
            lactose_free: None,
        }
        .into(),
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
    fn to_composition_dairy_simple_spec_2_milk() {
        let comp = ING_SPEC_DAIRY_SIMPLE_2_MILK.spec.to_composition().unwrap();

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

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_3_25_MILK_STR: &str = r#"{
      "name": "3.25% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 3.25
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_3_25_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "3.25% Milk".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 3.25,
            msnf: None,
            lactose_free: None,
        }
        .into(),
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
    fn to_composition_dairy_simple_spec_3_25_milk() {
        let comp = ING_SPEC_DAIRY_SIMPLE_3_25_MILK.spec.to_composition().unwrap();

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

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_40_CREAM_STR: &str = r#"{
      "name": "40% Cream",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 40
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_40_CREAM: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "40% Cream".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 40.0,
            msnf: None,
            lactose_free: None,
        }
        .into(),
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
    fn to_composition_dairy_simple_spec_40_cream() {
        let comp = ING_SPEC_DAIRY_SIMPLE_40_CREAM.spec.to_composition().unwrap();

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

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER_STR: &str = r#"{
      "name": "Skimmed Milk Powder",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 0,
        "msnf": 97
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Skimmed Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: 0.0,
                msnf: Some(97.0),
                lactose_free: None,
            }
            .into(),
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
    fn to_composition_dairy_simple_spec_skimmed_powder() {
        let comp = ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER.spec.to_composition().unwrap();

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

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER_STR: &str = r#"{
      "name": "Whole Milk Powder",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 27,
        "msnf": 70
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Whole Milk Powder".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 27.0,
            msnf: Some(70.0),
            lactose_free: None,
        }
        .into(),
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
    fn to_composition_dairy_simple_spec_whole_powder() {
        let comp = ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER.spec.to_composition().unwrap();

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

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE_STR: &str = r#"{
      "name": "Lactose-Free 2% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 2,
        "lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lactose-Free 2% Milk".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: 2.0,
                msnf: None,
                lactose_free: Some(true),
            }
            .into(),
        });

    pub(crate) static COMP_2_MILK_LACTOSE_FREE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(49.5756)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.3).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(2.40345).galactose(2.40345)))
                        .proteins(3.087)
                        .others_from_total(2.0 + 8.82)
                        .unwrap(),
                ),
            )
            .pod(3.485)
            .pac(PAC::new().sugars(9.1331).msnf_ws_salts(3.2405))
    });

    #[test]
    fn to_composition_dairy_simple_spec_2_milk_lactose_free() {
        let comp = ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 49.5756);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 2.40345);
        assert_eq_flt_test!(comp.get(CompKey::Galactose), 2.40345);
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
        assert_eq_flt_test!(comp.get(CompKey::POD), 3.485);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 9.1331);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.2405);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 12.3736);
    }

    // https://www.sealtest.ca/en/products/milks/325-milk
    pub(crate) const ING_SPEC_DAIRY_LABEL_3_25_MILK_STR: &str = r#"{
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

    pub(crate) static ING_SPEC_DAIRY_LABEL_3_25_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Sealtest 3.25% Milk".to_string(),
        category: Category::Dairy,
        spec: DairyLabelSpec {
            serving_size: Unit::Milliliters(250.0), // 257.6667 grams
            energy: 160.0,
            total_fat: Unit::Percent(3.25), // 3.25% is 8.3742g, not 8g
            saturated_fat: 5.0,
            trans_fat: 0.3,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
        }
        .into(),
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
    fn to_composition_dairy_label_spec_3_25_milk() {
        let comp = ING_SPEC_DAIRY_LABEL_3_25_MILK.spec.to_composition().unwrap();

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

    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR: &str = r#"{
      "name": "Fairlife Whole Ultra-Filtered Lactose-Free Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 240 },
        "energy": 150,
        "total_fat": { "grams": 8 },
        "saturated_fat": 5,
        "trans_fat": 0,
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
                energy: 150.0,
                total_fat: Unit::Grams(8.0), // 8g is 3.2636%
                saturated_fat: 5.0,
                trans_fat: 0.0,
                sugars: 6.0,
                protein: 13.0,
                lactose_free: Some(true),
                sucrose: None,
            }
            .into(),
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
    fn to_composition_dairy_simple_spec_whole_ultra_filtered_lactose_free() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE
            .spec
            .to_composition()
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

    pub(crate) const ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE_STR: &str = r#"{
      "name": "Leanfit Sport Whey Isolate",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 39 },
        "energy": 150,
        "total_fat": { "grams": 0.5 },
        "saturated_fat": 0.3,
        "trans_fat": 0,
        "sugars": 1,
        "protein": 35
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Leanfit Sport Whey Isolate".to_string(),
        category: Category::Dairy,
        spec: DairyLabelSpec {
            serving_size: Unit::Grams(39.0),
            energy: 150.0,
            total_fat: Unit::Grams(0.5),
            saturated_fat: 0.3,
            trans_fat: 0.0,
            sugars: 1.0,
            protein: 35.0,
            lactose_free: None,
            sucrose: None,
        }
        .into(),
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
    fn to_composition_dairy_label_spec_whey_isolate() {
        let comp = ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE.spec.to_composition().unwrap();

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

    // https://www.carnationmilk.ca/en/products/2-partly-skimmed
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR: &str = r#"{
      "name": "Carnation 2% Evaporated Partly Skimmed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 16.125 },
        "energy": 15,
        "total_fat": { "percent": 2 },
        "saturated_fat": 0.2,
        "trans_fat": 0,
        "sugars": 1.5,
        "protein": 1
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Carnation 2% Evaporated Partly Skimmed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(16.125), // 15ml @ 1.075 g/ml
                energy: 15.0,
                total_fat: Unit::Percent(2.0),
                saturated_fat: 0.2,
                trans_fat: 0.0,
                // label says 1g sugar, 2g carbohydrates; not sure what carbohydrates are if not
                // lactose, so assume some odd rounding issue and take the middle value of 1.5g
                // This is consistent with the standard ~60/40 ratio of lactose to proteins in MSNF
                sugars: 1.5,
                protein: 1.0,
                lactose_free: None,
                sucrose: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_EVAPORATED_MILK_CARNATION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(93.0233)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.2403))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(9.3024)))
                        .proteins(6.2016),
                ),
            )
            .pod(1.4884)
            .pac(PAC::new().sugars(9.3024).msnf_ws_salts(5.6962))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_evaporated_milk_carnation() {
        let comp = ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 93.0233);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 9.3024);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 15.5039);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 6.2016);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 6.2016);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 17.5039);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 6.2016);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 17.5039);
        assert_eq_flt_test!(comp.get(CompKey::Water), 82.4961);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.4884);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 9.3024);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 5.6962);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 14.9986);
    }

    // https://fdc.nal.usda.gov/food-details/2705400/nutrients
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA_STR: &str = r#"{
      "name": "2% Reduced-Fat Evaporated Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 92,
        "total_fat": { "grams": 1.96 },
        "saturated_fat": 1.214,
        "trans_fat": 0,
        "sugars": 11.15,
        "protein": 7.42
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "2% Reduced-Fat Evaporated Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0), // 100g serving size
                energy: 92.0,
                total_fat: Unit::Grams(1.96),
                saturated_fat: 1.214,
                trans_fat: 0.0,
                sugars: 11.15,
                protein: 7.42,
                lactose_free: None,
                sucrose: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_EVAPORATED_MILK_USDA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(92.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.96).saturated(1.214))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(11.15)))
                        .proteins(7.42),
                ),
            )
            .pod(1.784)
            .pac(PAC::new().sugars(11.15).msnf_ws_salts(6.8227))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_evaporated_milk_usda() {
        let comp = ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 92.0);

        assert_eq!(comp.get(CompKey::MilkFat), 1.96);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 11.15);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 18.57);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 20.53);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 20.53);
        assert_eq_flt_test!(comp.get(CompKey::Water), 79.47);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.784);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 11.15);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 6.8227);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 17.9727);
    }

    // https://fdc.nal.usda.gov/food-details/2705402/nutrients
    // https://fdc.nal.usda.gov/food-details/2758990/nutrients

    pub(crate) const ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA_STR: &str = r#"{
      "name": "Sweetened Condensed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 321,
        "total_fat": { "grams": 8.7 },
        "saturated_fat": 5.486,
        "trans_fat": 0,
        "sugars": 54.4,
        "protein": 7.91,
        "sucrose": 45
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: 321.0,
                total_fat: Unit::Grams(8.7),
                saturated_fat: 5.486,
                trans_fat: 0.0,
                sugars: 54.4,
                protein: 7.91,
                lactose_free: None,
                sucrose: Some(45.0),
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
                            .fats(Fats::new().total(8.7).saturated(5.486))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(9.4)))
                            .proteins(7.91),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(45.0))),
                    ),
            )
            .pod(46.504)
            .pac(PAC::new().sugars(54.4).msnf_ws_salts(6.3598))
    });

    #[test]
    fn to_composition_dairy_label_spec_sweetened_condensed_milk_usda() {
        let comp = ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 321.0);

        assert_eq!(comp.get(CompKey::MilkFat), 8.7);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 9.4);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 17.31);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 26.01);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 45.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 54.4);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 71.01);
        assert_eq_flt_test!(comp.get(CompKey::Water), 28.99);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 46.504);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 54.4);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 6.3598);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 60.7598);
    }

    // https://www.eaglebrand.ca/en/products/original
    pub(crate) const ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND_STR: &str = r#"{
      "name": "Eagle Brand Original Sweetened Condensed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 19.5 },
        "energy": 70,
        "total_fat": { "grams": 1.5 },
        "saturated_fat": 1.0,
        "trans_fat": 0,
        "sugars": 11,
        "protein": 1,
        "sucrose": 8.97
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Eagle Brand Original Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(19.5), // 15ml @ 1.3 g/ml
                energy: 70.0,
                total_fat: Unit::Grams(1.5),
                saturated_fat: 1.0,
                trans_fat: 0.0,
                sugars: 11.0,
                protein: 1.0,
                lactose_free: None,
                sucrose: Some(8.97), // estimated 46% of total, based on USDA + Moro
            }
            .into(),
        });

    pub(crate) static COMP_SWEETENED_CONDENSED_MILK_EAGLE_BRAND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(358.9744)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(7.6923).saturated(5.1282))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(10.4103)))
                            .proteins(5.1282),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(46.0))),
                    ),
            )
            .pod(47.6656)
            .pac(PAC::new().sugars(56.4102).msnf_ws_salts(5.7089))
    });

    #[test]
    fn to_composition_dairy_label_spec_sweetened_condensed_milk_eagle_brand() {
        let comp = ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 358.9744);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 7.6923);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 10.4103);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 15.5385);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 5.1282);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.1282);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 23.2308);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 46.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 56.4103);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.1282);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 69.2308);
        assert_eq_flt_test!(comp.get(CompKey::Water), 30.7692);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 47.6656);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 56.4103);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 5.7089);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 62.1192);
    }

    #[test]
    fn to_composition_dairy_simple_spec_vs_dairy_label_spec_3_25_milk() {
        let comp_spec = ING_SPEC_DAIRY_SIMPLE_3_25_MILK.spec.to_composition().unwrap();
        let comp_spec_from_nutrition = ING_SPEC_DAIRY_LABEL_3_25_MILK.spec.to_composition().unwrap();

        let assert_comp_eq_percent = |key: CompKey, tolerance_percent: f64| {
            assert_comp_eq_percent(&comp_spec, &comp_spec_from_nutrition, key, tolerance_percent);
        };

        // Proteins has a ~15% difference, 3g vs. 3.5g
        // All other values are within a 10% difference

        assert_comp_eq_percent(CompKey::Energy, 2.8);

        assert_comp_eq_percent(CompKey::MilkFat, 0.0);
        assert_comp_eq_percent(CompKey::Lactose, 6.4);
        assert_comp_eq_percent(CompKey::MSNF, 1.95);
        assert_comp_eq_percent(CompKey::MilkSNFS, 12.0);
        assert_comp_eq_percent(CompKey::MilkProteins, 15.0);
        assert_comp_eq_percent(CompKey::MilkSolids, 1.45);

        assert_comp_eq_percent(CompKey::TotalProteins, 15.0);
        assert_comp_eq_percent(CompKey::TotalSolids, 1.45);
        assert_comp_eq_percent(CompKey::Water, 0.2);

        assert_comp_eq_percent(CompKey::POD, 6.35);

        assert_comp_eq_percent(CompKey::PACsgr, 6.35);
        assert_comp_eq_percent(CompKey::PACmlk, 1.95);
        assert_comp_eq_percent(CompKey::PACtotal, 3.0);
    }

    #[test]
    fn to_composition_dairy_label_spec_2_evaporated_milk_carnation_vs_usda() {
        let comp_carnation = ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION
            .spec
            .to_composition()
            .unwrap();
        let comp_usda = ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        let assert_comp_eq_percent = |key: CompKey, tolerance_percent: f64| {
            assert_comp_eq_percent(&comp_carnation, &comp_usda, key, tolerance_percent);
        };

        // @todo Many values differ by up to 20%; need to investigate.

        assert_comp_eq_percent(CompKey::Energy, 1.101);

        assert_comp_eq_percent(CompKey::MilkFat, 2.001);
        assert_comp_eq_percent(CompKey::Lactose, 20.0);
        assert_comp_eq_percent(CompKey::MSNF, 20.0);
        assert_comp_eq_percent(CompKey::MilkSNFS, 20.0);
        assert_comp_eq_percent(CompKey::MilkProteins, 20.0);
        assert_comp_eq_percent(CompKey::MilkSolids, 17.5);

        assert_comp_eq_percent(CompKey::TotalProteins, 20.0);
        assert_comp_eq_percent(CompKey::TotalSolids, 17.5);
        assert_comp_eq_percent(CompKey::Water, 4.0);

        assert_comp_eq_percent(CompKey::POD, 20.0);

        assert_comp_eq_percent(CompKey::PACsgr, 20.0);
        assert_comp_eq_percent(CompKey::PACmlk, 20.0);
        assert_comp_eq_percent(CompKey::PACtotal, 20.0);
    }

    #[test]
    fn to_composition_dairy_label_spec_sweetened_condensed_milk_eagle_vs_usda() {
        let comp_eagle = ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND
            .spec
            .to_composition()
            .unwrap();
        let comp_usda = ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        let assert_comp_eq_percent = |key: CompKey, tolerance_percent: f64| {
            assert_comp_eq_percent(&comp_eagle, &comp_usda, key, tolerance_percent);
        };

        // Protein content differs significantly (~54%): Eagle Brand CA label reports 1g per 19.5g
        // serving (= 5.13g/100g) vs. USDA data at 7.91g/100g. All protein-derived fields
        // (MilkSNFS, MilkProteins, TotalProteins, MSNF, MilkSolids) are affected.
        // (Rodrigues, 2017)[^50] has protein at 6.04g/100g. Low-Fat Eagle Brand has 10.2g/100g
        // protein, which is much higher than all of these (jump from 1g -> 2g per serving).
        // @todo Need to investigate why there is so much variability with protein content.

        assert_comp_eq_percent(CompKey::Energy, 10.6);

        assert_comp_eq_percent(CompKey::MilkFat, 13.2);
        assert_comp_eq_percent(CompKey::Lactose, 9.8);
        assert_comp_eq_percent(CompKey::MSNF, 11.5);
        assert_comp_eq_percent(CompKey::MilkSNFS, 55.0);
        assert_comp_eq_percent(CompKey::MilkProteins, 55.0);
        assert_comp_eq_percent(CompKey::MilkSolids, 12.1);

        assert_comp_eq_percent(CompKey::TotalProteins, 55.0);
        assert_comp_eq_percent(CompKey::TotalSolids, 2.6);
        assert_comp_eq_percent(CompKey::Water, 5.9);

        assert_comp_eq_percent(CompKey::POD, 2.5);

        assert_comp_eq_percent(CompKey::PACsgr, 3.6);
        assert_comp_eq_percent(CompKey::PACmlk, 11.5);
        assert_comp_eq_percent(CompKey::PACtotal, 2.3);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_DAIRY: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_DAIRY_SIMPLE_0_MILK_STR, ING_SPEC_DAIRY_SIMPLE_0_MILK.clone(), Some(*COMP_0_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_2_MILK_STR, ING_SPEC_DAIRY_SIMPLE_2_MILK.clone(), Some(*COMP_2_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_3_25_MILK_STR, ING_SPEC_DAIRY_SIMPLE_3_25_MILK.clone(), Some(*COMP_3_25_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_40_CREAM_STR, ING_SPEC_DAIRY_SIMPLE_40_CREAM.clone(), Some(*COMP_40_CREAM)),
                (
                    ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER_STR,
                    ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER.clone(),
                    Some(*COMP_SKIMMED_POWDER),
                ),
                (
                    ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER_STR,
                    ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER.clone(),
                    Some(*COMP_WHOLE_POWDER),
                ),
                (
                    ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE_STR,
                    ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE.clone(),
                    Some(*COMP_2_MILK_LACTOSE_FREE),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_3_25_MILK_STR,
                    ING_SPEC_DAIRY_LABEL_3_25_MILK.clone(),
                    Some(*COMP_3_25_MILK_FROM_NUTRITION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE.clone(),
                    Some(*COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE_STR,
                    ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE.clone(),
                    Some(*COMP_WHEY_ISOLATE),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_CARNATION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA.clone(),
                    Some(*COMP_SWEETENED_CONDENSED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND_STR,
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND.clone(),
                    Some(*COMP_SWEETENED_CONDENSED_MILK_EAGLE_BRAND),
                ),
            ]
        });

    #[test]
    fn dairy_simple_spec_err_on_negative_field() {
        let result_neg_fat = DairySimpleSpec {
            fat: -1.0,
            msnf: None,
            lactose_free: None,
        }
        .to_composition();
        assert!(matches!(result_neg_fat, Err(Error::CompositionNotPositive(_))));

        let result_neg_msnf = DairySimpleSpec {
            fat: 3.25,
            msnf: Some(-1.0),
            lactose_free: None,
        }
        .to_composition();
        assert!(matches!(result_neg_msnf, Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_fat_plus_msnf_exceeds_100() {
        let result = DairySimpleSpec {
            fat: 60.0,
            msnf: Some(60.0),
            lactose_free: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn dairy_label_spec_err_on_unsupported_unit() {
        let base = DairyLabelSpec {
            serving_size: Unit::Milliliters(250.0),
            energy: 160.0,
            total_fat: Unit::Grams(8.0),
            saturated_fat: 5.0,
            trans_fat: 0.3,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
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
            energy: 160.0,
            total_fat: Unit::Grams(8.0),
            saturated_fat: 5.0,
            trans_fat: 0.3,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
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
                saturated_fat: -1.0,
                ..base
            },
            DairyLabelSpec {
                trans_fat: -1.0,
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
            energy: 160.0,
            total_fat: Unit::Grams(5.0),
            saturated_fat: 8.0,
            trans_fat: 0.0,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_label_spec_err_when_trans_fat_exceeds_total_fat() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(250.0),
            energy: 160.0,
            total_fat: Unit::Grams(5.0),
            saturated_fat: 3.0,
            trans_fat: 8.0,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_label_spec_err_when_fat_plus_sugars_plus_protein_exceeds_serving_size() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(20.0),
            energy: 160.0,
            total_fat: Unit::Grams(8.0),
            saturated_fat: 5.0,
            trans_fat: 0.3,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }
}
