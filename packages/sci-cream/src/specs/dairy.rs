//! [`DairySimpleSpec`], [`DairyLabelSpec`], and associated implementations, for dairy ingredients
//! such as milk, cream, milk powders, protein powders, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fats, PAC, ScaleComponents, Solids, SolidsBreakdown, Sugars, ToComposition,
    },
    constants::{
        self,
        composition::{
            STD_LACTOSE_IN_MSNF, STD_LACTOSE_IN_WS, STD_MIN_WATER_CONTENT_IN_MILK_POWDER, STD_MSNF_IN_MILK_SERUM,
            STD_PROTEIN_IN_MSNF, STD_PROTEIN_IN_WS, STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT,
        },
        density::dairy_milliliters_to_grams,
    },
    error::{Error, Result},
    specs::units::Unit,
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, Polyols},
    constants::composition::{STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_WHEY_PROTEIN_IN_MSNF_PROTEIN},
};

/// Indicates the origin of the non-fat solids in a dairy product, which affects its composition
#[derive(PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum SolidsSource {
    /// Milk solids (MSNF), a natural ~80/20 casein/whey proteins split, lactose, ~10.5% minerals
    ///
    /// See [`STD_LACTOSE_IN_MSNF`], [`STD_PROTEIN_IN_MSNF`], [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`],
    /// and [`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`] for details about the composition assumptions.
    Milk,
    /// Whey solids (WS), all whey proteins, lactose, ~11.5% minerals.
    ///
    /// See [`STD_LACTOSE_IN_WS`] and [`STD_PROTEIN_IN_WS`] for details about the composition.
    Whey,
    /// Casein solids, all casein proteins, ~10% minerals
    //
    // @todo The mineral content is an estimate
    Casein,
}

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
    /// Fat content by weight, e.g. 3.25 for whole milk, 40 for cream, 0 for skimmed milk, etc.
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

        let calculated_msnf = (100.0 - fat) * STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);
        verify_are_positive(&[fat, msnf])?;
        verify_is_within_100_percent(fat + msnf)?;

        let lactose = msnf * STD_LACTOSE_IN_MSNF;
        let proteins = msnf * STD_PROTEIN_IN_MSNF;

        let sugars = if lactose_free {
            Sugars::new().glucose(lactose / 2.0).galactose(lactose / 2.0)
        } else {
            Sugars::new().lactose(lactose)
        };

        let milk_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(fat)
                    .saturated(fat * STD_SATURATED_FAT_IN_MILK_FAT)
                    .trans(fat * STD_TRANS_FAT_IN_MILK_FAT),
            )
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .proteins(proteins)
            .others_from_total(fat + msnf)?;

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
///
/// In addition to lactose and proteins, MSNF (milk solids non-fat) and WS (whey solids) typically
/// include ~10-12% minerals and salts which are not easy to infer from nutrition facts labels. As
/// such, the total MSNF or WS content is internally estimated from `dairy_sugars` (see
/// [`sugars`](Self::sugars) and [`sucrose`](Self::sucrose)), [`protein`](Self::protein), and
/// standard composition constants: [`STD_LACTOSE_IN_MSNF`] and [`STD_PROTEIN_IN_MSNF`] if
/// [`solids_source`](Self::solids_source) is [`Milk`](SolidsSource::Milk), [`STD_LACTOSE_IN_WS`]
/// and [`STD_PROTEIN_IN_WS`] if [`Whey`](SolidsSource::Whey) (Goff & Hartel, 2025, p. 37)[^20].
#[doc = include_str!("../../docs/references/index/20.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairyLabelSpec {
    /// Serving size in grams; if given in ml, it is converted to grams based on fat content
    ///
    /// See [`constants::density::dairy_milliliters_to_grams`].
    pub serving_size: Unit,
    /// Energy per serving, in kcal; calculated based on macronutrients composition if unspecified
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
    pub saturated_fat: Option<f64>,
    /// Trans fat content per serving, in grams; it must be a subset of total fat.
    ///
    /// If unspecified, it is calculated as [`STD_TRANS_FAT_IN_MILK_FAT`] of
    /// [`total_fat`](Self::total_fat). Nutrition tables sometimes list this as zero, particularly
    /// for small serving sizes, in which cases it's usually more accurate to not specify it and
    /// instead have it internally calculated from the total fat content.
    pub trans_fat: Option<f64>,
    /// Sugars content per serving, in grams; the detailed composition is determined by
    /// [`lactose_free`](Self::lactose_free) and [`sucrose`](Self::sucrose).
    pub sugars: f64,
    /// Protein content per serving, in grams.
    ///
    /// The detailed proteins breakdown is determined by [`solids_source`](Self::solids_source).
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
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein and mineral composition of the solids non-fat.
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
            sugars,
            protein,
            lactose_free,
            sucrose,
            solids_source,
        } = *self;

        let lactose_free = lactose_free.unwrap_or(false);
        let sucrose = sucrose.unwrap_or(0.0);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

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

        let saturated_fat = saturated_fat.unwrap_or(STD_SATURATED_FAT_IN_MILK_FAT * total_fat);
        let trans_fat = trans_fat.unwrap_or(STD_TRANS_FAT_IN_MILK_FAT * total_fat);

        let dairy_sugars = sugars - sucrose;

        let std_minerals_in_snf = match solids_source {
            SolidsSource::Milk => 1.0 - STD_LACTOSE_IN_MSNF - STD_PROTEIN_IN_MSNF,
            SolidsSource::Whey => 1.0 - STD_LACTOSE_IN_WS - STD_PROTEIN_IN_WS,
            SolidsSource::Casein => 0.1, // 10% guess, @todo find a reference for this value
        };

        let snf = f64::min(
            (dairy_sugars + protein) / (1.0 - std_minerals_in_snf),
            (1.0 - STD_MIN_WATER_CONTENT_IN_MILK_POWDER) * serving_size - total_fat - sucrose,
        );

        verify_are_positive(&[
            serving_size,
            total_fat,
            saturated_fat,
            trans_fat,
            sugars,
            protein,
            sucrose,
            snf,
        ])?;

        verify_is_subset(saturated_fat, total_fat, "saturated_fat <= total_fat")?;
        verify_is_subset(trans_fat, total_fat, "trans_fat <= total_fat")?;
        verify_is_subset(total_fat + snf + sucrose, serving_size, "total_fat + snf + sucrose <= serving_size")?;
        verify_is_subset(sucrose, sugars, "sucrose <= sugars")?;

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
            .proteins(protein)
            .others_from_total(total_fat + snf)?;

        let other_solids = SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(other_sugars));
        let total_solids = milk_solids.add(&other_solids);

        Composition::new()
            .energy(energy.unwrap_or(total_solids.energy()?))
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(total_sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(total_sugars.to_pac()?)
                    .msnf_ws_salts(snf * constants::pac::MSNF_WS_SALTS / 100.0),
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
    use crate::tests::util::{
        CompCeiling, assert_compositions_consistent, compare_compositions, relative_diff_percent,
    };

    use super::*;
    use crate::{
        composition::CompKey, database::IngredientDatabase, error::Error, ingredient::Category,
        resolution::IngredientGetter, specs::IngredientSpec,
    };

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

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.0);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
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

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.3);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.07);
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

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 2.1125);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.11375);
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

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 26.0);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 1.4);
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

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.3);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.07);
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

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.0);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
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

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 17.55);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.945);
    }

    // https://fdc.nal.usda.gov/food-details/2705385/nutrients
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA_STR: &str = r#"{
      "name": "USDA Whole Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 61,
        "total_fat": { "grams": 3.2 },
        "saturated_fat": 1.86,
        "sugars": 4.81,
        "protein": 3.27
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Whole Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(61.0),
                total_fat: Unit::Grams(3.2),
                saturated_fat: Some(1.86),
                trans_fat: None,
                sugars: 4.81,
                protein: 3.27,
                lactose_free: None,
                sucrose: None,
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
                        .proteins(3.27)
                        .others(0.9479),
                ),
            )
            .pod(0.7696)
            .pac(PAC::new().sugars(4.81).msnf_ws_salts(3.3169))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_usda() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 61.0);

        assert_eq!(comp.get(CompKey::MilkFat), 3.2);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.81);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 9.0279);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 4.2179);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.27);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 12.2279);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.27);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 12.2279);
        assert_eq_flt_test!(comp.get(CompKey::Water), 87.7721);

        // USDA lists water as 88.1
        assert_eq_flt_test!(relative_diff_percent(comp.get(CompKey::Water), 88.1), 0.3722);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7696);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.81);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.3169);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 8.1269);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.86);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.112);
    }

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
            .energy(62.0957)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(1.9405).trans(0.1164))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.04528)))
                        .proteins(3.49288)
                        .others(1.0017),
                ),
            )
            .pod(0.8072)
            .pac(PAC::new().sugars(5.04528).msnf_ws_salts(3.5050))
    });

    #[test]
    fn to_composition_dairy_label_spec_3_25_milk_sealtest() {
        let comp = ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 62.0957);

        assert_eq!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.04528);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 9.5398);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 4.4946);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 12.7898);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 12.7898);
        assert_eq_flt_test!(comp.get(CompKey::Water), 87.2102);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.8072);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 5.04528);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.5050);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 8.5503);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.9405);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.1164);
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
            .energy(61.1923)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.2636).saturated(2.0397).trans(0.1142))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(1.22385).galactose(1.22385)))
                        .proteins(5.3033)
                        .others(0.9093),
                ),
            )
            .pod(1.7746)
            .pac(PAC::new().sugars(4.65063).msnf_ws_salts(3.1819))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.6604);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 6.2126);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.9240);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.9240);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.0760);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.7746);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.65063);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.1819);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 7.8325);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 2.0397);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.1142);
    }

    // https://fdc.nal.usda.gov/food-details/2705400/nutrients
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA_STR: &str = r#"{
      "name": "USDA 2% Reduced-Fat Evaporated Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 92,
        "total_fat": { "grams": 1.96 },
        "saturated_fat": 1.214,
        "sugars": 11.15,
        "protein": 7.42
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA 2% Reduced-Fat Evaporated Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0), // 100g serving size
                energy: Some(92.0),
                total_fat: Unit::Grams(1.96),
                saturated_fat: Some(1.214),
                trans_fat: None,
                sugars: 11.15,
                protein: 7.42,
                lactose_free: None,
                sucrose: None,
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
                        .proteins(7.42)
                        .others(2.1786),
                ),
            )
            .pod(1.784)
            .pac(PAC::new().sugars(11.15).msnf_ws_salts(7.6231))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 20.7486);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 9.5986);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 22.7086);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 22.7086);
        assert_eq_flt_test!(comp.get(CompKey::Water), 77.2914);

        // USDA lists water as 78
        assert_eq_flt_test!(relative_diff_percent(comp.get(CompKey::Water), 78.0), 0.9085);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.784);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 11.15);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 7.6231);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 18.7731);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.214);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.0686);
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
                energy: Some(15.0),
                total_fat: Unit::Percent(2.0),
                saturated_fat: Some(0.2),
                trans_fat: None,
                // label says 1g sugar, 2g carbohydrates; not sure what carbohydrates are if not
                // lactose, so assume some odd rounding issue and take the middle value of 1.5g
                // This is consistent with the standard ~60/40 ratio of lactose to proteins in MSNF
                sugars: 1.5,
                protein: 1.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_EVAPORATED_MILK_CARNATION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(93.0233)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.2403).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(9.3024)))
                        .proteins(6.2016)
                        .others(1.8189),
                ),
            )
            .pod(1.4884)
            .pac(PAC::new().sugars(9.3024).msnf_ws_salts(6.3645))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 17.3228);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 8.0204);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 6.2016);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 19.3228);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 6.2016);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 19.3228);
        assert_eq_flt_test!(comp.get(CompKey::Water), 80.6772);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.4884);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 9.3024);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 6.3645);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 15.6668);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.2403);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.07);
    }

    // https://fdc.nal.usda.gov/food-details/2705402/nutrients
    // https://fdc.nal.usda.gov/food-details/2758990/nutrients
    pub(crate) const ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA_STR: &str = r#"{
      "name": "USDA Sweetened Condensed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 321,
        "total_fat": { "grams": 8.7 },
        "saturated_fat": 5.486,
        "sugars": 54.4,
        "protein": 7.91,
        "sucrose": 45
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(321.0),
                total_fat: Unit::Grams(8.7),
                saturated_fat: Some(5.486),
                trans_fat: None,
                sugars: 54.4,
                protein: 7.91,
                lactose_free: None,
                sucrose: Some(45.0),
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
                            .fats(Fats::new().total(8.7).saturated(5.486).trans(0.3045))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(9.4)))
                            .proteins(7.91)
                            .others(2.0308),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(45.0))),
                    ),
            )
            .pod(46.504)
            .pac(PAC::new().sugars(54.4).msnf_ws_salts(7.1059))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 19.3408);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 9.9408);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 28.0408);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 45.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 54.4);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 73.0408);
        assert_eq_flt_test!(comp.get(CompKey::Water), 26.9592); // USDA lists 27.2

        // USDA lists water as 27.2
        assert_eq_flt_test!(relative_diff_percent(comp.get(CompKey::Water), 27.2), 0.8853);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 46.504);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 54.4);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 7.1059);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 61.5059);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 5.486);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.3045);
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
                energy: Some(70.0),
                total_fat: Unit::Grams(1.5),
                saturated_fat: Some(1.0),
                trans_fat: None,
                sugars: 11.0,
                protein: 1.0,
                lactose_free: None,
                sucrose: Some(8.97), // estimated 46% of total, based on USDA + Moro
                solids_source: None,
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
                            .fats(Fats::new().total(7.6923).saturated(5.1282).trans(0.2692))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(10.4103)))
                            .proteins(5.1282)
                            .others(1.8229),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(46.0))),
                    ),
            )
            .pod(47.6656)
            .pac(PAC::new().sugars(56.4102).msnf_ws_salts(6.3787))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 17.3614);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 6.9512);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.1282);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 25.0537);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 46.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 56.4103);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.1282);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 71.0537);
        assert_eq_flt_test!(comp.get(CompKey::Water), 28.9463);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 47.6656);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 56.4103);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 6.3787);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 62.7890);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 5.1282);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.2692);
    }

    // https://www.medallionmilk.com/products/skim-milk-powder-500g-bag
    pub(crate) const ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION_STR: &str = r#"{
      "name": "Medallion Skim Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 25 },
        "energy": 90,
        "total_fat": { "grams": 0 },
        "sugars": 12.5,
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
                sugars: 12.5,
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
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(50.0)))
                        .proteins(36.0)
                        .others(10.0894),
                ),
            )
            .pod(8.0)
            .pac(PAC::new().sugars(50.0).msnf_ws_salts(35.3036))
    });

    #[test]
    fn to_composition_dairy_label_spec_skim_milk_powder_medallion() {
        let comp = ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 360.0);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 50.0);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 96.0894);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 46.0894);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 36.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 96.0894);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 36.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 96.0894);
        assert_eq_flt_test!(comp.get(CompKey::Water), 3.9106);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 8.0);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 50.0);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.3036);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 85.3036);

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.0);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
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
                        .proteins(26.6667)
                        .others(7.4302),
                ),
            )
            .pod(5.8667)
            .pac(PAC::new().sugars(36.6667).msnf_ws_salts(25.9988))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_powder_medallion() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 500.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 36.6667);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 70.7635);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 34.0968);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 97.4302);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 97.4302);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.5698);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 5.8667);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 36.6667);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 25.9988);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 62.6655);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 16.6667);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.9333);
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
                        .proteins(34.8)
                        .others(8.8),
                ),
            )
            .pod(8.512)
            .pac(PAC::new().sugars(53.2).msnf_ws_salts(35.5647))
    });

    #[test]
    fn to_composition_dairy_label_spec_skim_milk_powder_theland() {
        let comp = ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 368.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.2);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 53.2);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 96.8);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 43.6);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 34.8);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 98.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 34.8);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 8.512);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 53.2);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.5647);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 88.7647);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 0.78);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.042);
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
                        .proteins(25.2)
                        .others(4.0),
                ),
            )
            .pod(6.272)
            .pac(PAC::new().sugars(39.2).msnf_ws_salts(25.1304))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_powder_theland() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 524.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 29.6);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 39.2);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 68.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 29.2);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 25.2);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 98.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 25.2);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 6.272);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 39.2);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 25.1304);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 64.3304);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 19.24);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 1.036);
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
                        .proteins(89.7436)
                        .others(4.4103),
                ),
            )
            .pod(0.4103)
            .pac(PAC::new().sugars(2.5641).msnf_ws_salts(35.5346))
    });

    #[test]
    fn to_composition_dairy_label_spec_whey_isolate() {
        let comp = ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 384.6154);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.2821);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.5641);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 96.7179);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 94.1538);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 98.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.4103);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.5641);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.5346);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 38.0987);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 0.7692);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.0449);
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
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(4.0).saturated(1.4).trans(0.14))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(3.3)))
                        .proteins(80.0)
                        .others(10.7),
                ),
            )
            .pod(0.528)
            .pac(PAC::new().sugars(3.3).msnf_ws_salts(34.5360))
    });

    #[test]
    fn to_composition_dairy_label_spec_gold_standard_whey_optimum_nutrition() {
        let comp = ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 374.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 4.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 3.3);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 94.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 90.7);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 98.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.528);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 3.3);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 34.5360);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 37.8360);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.4);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.14);
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
        "sugars": 4.3,
        "protein": 73,
        "solids_source": "Casein"
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
                sugars: 4.3,
                protein: 73.0,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(SolidsSource::Casein),
            }
            .into(),
        });

    pub(crate) static COMP_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(352.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.8).saturated(1.1).trans(0.063))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.3)))
                        .proteins(73.0)
                        .others(8.5889),
                ),
            )
            .pod(0.688)
            .pac(PAC::new().sugars(4.3).msnf_ws_salts(31.5559))
    });

    #[test]
    fn to_composition_dairy_label_spec_gold_standard_casein_optimum_nutrition() {
        let comp = ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 352.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.8);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.3);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 85.8889);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 81.5889);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 73.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 87.6889);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 73.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 87.6889);
        assert_eq_flt_test!(comp.get(CompKey::Water), 12.3111);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.688);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.3);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 31.5559);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 35.8559);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.1);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.063);
    }

    /// Composition keys compared when cross-checking dairy ingredient data sources.
    ///
    /// These keys carry meaningful, generally non-zero values for milk-based ingredients. Keys
    /// irrelevant to dairy (cocoa, nut, egg, and other non-milk components) are excluded so that
    /// comparisons stay focused on values a reader would expect to differ between sources.
    const COMPARABLE_DAIRY_KEYS: &[CompKey] = &[
        CompKey::Energy,
        CompKey::MilkFat,
        CompKey::Lactose,
        CompKey::MSNF,
        CompKey::MilkSNFS,
        CompKey::MilkProteins,
        CompKey::MilkSolids,
        CompKey::TotalProteins,
        CompKey::TotalSolids,
        CompKey::Water,
        CompKey::POD,
        CompKey::PACsgr,
        CompKey::PACmlk,
        CompKey::PACtotal,
        CompKey::SaturatedFat,
        CompKey::TransFat,
    ];

    /// Embedded database used to compare database specs not mirrored in this test file
    static EMBEDDED_DB: LazyLock<IngredientDatabase> = LazyLock::new(IngredientDatabase::new_seeded_from_embedded_data);

    /// Convert a tuple of source name and ingredient name to a tuple of source name and composition
    fn source_str_to_comp(names: (&'static str, &str)) -> (&'static str, Composition) {
        (names.0, EMBEDDED_DB.get_ingredient_by_name(names.1).unwrap().composition)
    }

    #[test]
    fn compare_specs_skim_milk_simple_vs_usda_vs_sealtest() {
        let sources = [
            ("Simple", "0% Milk"),
            ("USDA", "USDA Fat-Free (Skim) Milk"),
            ("Sealtest", "Sealtest 0% Skim Milk"),
        ]
        .map(source_str_to_comp);

        // MilkFat hits 100% for both pairs involving USDA: Simple and Sealtest define fat as
        // exactly 0, while USDA reports 0.08g/100g. Near-zero values make the relative diff
        // degenerate. SaturatedFat and TransFat are 100% on the same USDA pairs for the same
        // reason: Simple and Sealtest treat both as exact 0 while USDA reports tiny non-zero
        // values. With MSNF now estimated from lactose+protein (instead of being just
        // proteins-only SNFS), all other fields land comfortably under 10%.
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MilkFat, 100.0)
            .with(CompKey::SaturatedFat, 100.0)
            .with(CompKey::TransFat, 100.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_2_milk_simple_vs_usda_vs_sealtest() {
        let sources = [
            ("Simple", "2% Milk"),
            ("USDA", "USDA 2% Reduced-Fat Milk"),
            ("Sealtest", "Sealtest 2% Milk"),
        ]
        .map(source_str_to_comp);

        // Except for some exceptions noted below, most values are generally within a ~10% range.
        // The exceptions are:
        //    - MilkSNFS        10.42%  (Simple vs Sealtest)
        //    - MilkProteins    11.33%  (Simple vs Sealtest)
        //    - TotalProteins   11.33%  (Simple vs Sealtest)
        //    - SaturatedFat    14.62%  (Simple vs USDA)
        //    - SaturatedFat    10.73%  (Simple vs Sealtest)
        //    - TransFat        14.05%  (USDA vs Sealtest)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MilkSNFS, 11.0)
            .with(CompKey::MilkProteins, 12.0)
            .with(CompKey::TotalProteins, 12.0)
            .with(CompKey::SaturatedFat, 15.0)
            .with(CompKey::TransFat, 15.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_whole_milk_simple_vs_usda_vs_sealtest() {
        let sources = [
            ("Simple", "3.25% Milk"),
            ("USDA", "USDA Whole Milk"),
            ("Sealtest", "Sealtest 3.25% Milk"),
        ]
        .map(source_str_to_comp);

        // Except for some exceptions noted below, most values are generally within a ~10% range.
        // The exceptions are:
        //    - MilkSNFS        11.85%  (Simple vs Sealtest)
        //    - MilkProteins    12.75%  (Simple vs Sealtest)
        //    - TotalProteins   12.75%  (Simple vs Sealtest)
        //    - SaturatedFat    11.95%  (Simple vs USDA)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MilkSNFS, 12.0)
            .with(CompKey::MilkProteins, 13.0)
            .with(CompKey::TotalProteins, 13.0)
            .with(CompKey::SaturatedFat, 12.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_half_and_half_simple_vs_usda_vs_sealtest() {
        let sources = [
            ("Simple", "10% Cream"),
            ("USDA", "USDA Half and Half Cream"),
            ("Sealtest", "Sealtest Half and Half Cream 10%"),
        ]
        .map(source_str_to_comp);

        // Sealtest's small 15ml serving rounds sugars coarsely (1g/15ml = 6.67g/100g), driving
        // large differences in Lactose and all derived fields (MSNF, POD, PAC*). With MSNF now
        // estimated from lactose+protein, label-derived MSNF tracks the sugar coarseness directly,
        // pulling MilkSolids into the >10% band too. MilkFat: 13.04% — Simple's spec uses exactly
        // 10% vs USDA's measured 11.5g/100g; since all three specs now estimate trans fat as a
        // fixed fraction of total fat, TransFat tracks the MilkFat difference.
        // The exceptions are:
        //    - MilkFat        13.04%  (Simple vs USDA and USDA vs Sealtest)
        //    - MSNF           20.96%  (Simple vs Sealtest)
        //    - MSNF           20.85%  (USDA vs Sealtest)
        //    - Lactose        36.96%  (USDA vs Sealtest)
        //    - MilkProteins   16.27%  (USDA vs Sealtest)
        //    - MilkSolids     10.61%  (Simple vs Sealtest)
        //    - TotalProteins  16.27%  (USDA vs Sealtest)
        //    - TotalSolids    10.61%  (Simple vs Sealtest)
        //    - POD            36.96%  (USDA vs Sealtest)
        //    - PACsgr         36.96%  (USDA vs Sealtest)
        //    - PACmlk         20.96%  (Simple vs Sealtest)
        //    - PACmlk         20.85%  (USDA vs Sealtest)
        //    - PACtotal       31.08%  (USDA vs Sealtest)
        //    - TransFat       13.04%  (Simple vs USDA and USDA vs Sealtest)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MilkFat, 14.0)
            .with(CompKey::MSNF, 21.0)
            .with(CompKey::Lactose, 37.0)
            .with(CompKey::MilkProteins, 17.0)
            .with(CompKey::MilkSolids, 11.0)
            .with(CompKey::TotalProteins, 17.0)
            .with(CompKey::TotalSolids, 11.0)
            .with(CompKey::POD, 37.0)
            .with(CompKey::PACsgr, 37.0)
            .with(CompKey::PACmlk, 21.0)
            .with(CompKey::PACtotal, 32.0)
            .with(CompKey::TransFat, 14.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_light_cream_simple_vs_usda_vs_sealtest() {
        let sources = [
            ("Simple", "18% Cream"),
            ("USDA", "USDA Light Cream"),
            ("Sealtest", "Sealtest Table Cream 18%"),
        ]
        .map(source_str_to_comp);

        // Sealtest's small 15ml serving rounds sugars coarsely (1g/15ml = 6.67g/100g); at 18%
        // fat the lactose fraction is even smaller, amplifying relative differences further. With
        // MSNF now estimated from lactose+protein, MSNF and PACmlk track the sugar coarseness
        // (vs. the older proteins-only SNFS that was insensitive to it), which also drags
        // MilkSolids/TotalSolids into the >10% band on the Simple vs Sealtest pair.
        // The exceptions are:
        //    - MSNF           29.08%  (Simple vs Sealtest)
        //    - MSNF           28.81%  (USDA vs Sealtest)
        //    - Lactose        44.83%  (USDA vs Sealtest)
        //    - MilkSNFS       10.54%  (Simple vs Sealtest)
        //    - MilkProteins   12.74%  (Simple vs USDA)
        //    - MilkProteins   10.11%  (USDA vs Sealtest)
        //    - MilkSolids     10.65%  (Simple vs Sealtest)
        //    - TotalProteins  12.74%  (Simple vs USDA)
        //    - TotalProteins  10.11%  (USDA vs Sealtest)
        //    - TotalSolids    10.65%  (Simple vs Sealtest)
        //    - POD            44.83%  (USDA vs Sealtest)
        //    - PACsgr         44.83%  (USDA vs Sealtest)
        //    - PACmlk         29.08%  (Simple vs Sealtest)
        //    - PACmlk         28.81%  (USDA vs Sealtest)
        //    - PACtotal       38.98%  (USDA vs Sealtest)
        //    - SaturatedFat   14.72%  (Simple vs Sealtest)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MSNF, 30.0)
            .with(CompKey::Lactose, 45.0)
            .with(CompKey::MilkSNFS, 11.0)
            .with(CompKey::MilkProteins, 13.0)
            .with(CompKey::MilkSolids, 11.0)
            .with(CompKey::TotalProteins, 13.0)
            .with(CompKey::TotalSolids, 11.0)
            .with(CompKey::POD, 45.0)
            .with(CompKey::PACsgr, 45.0)
            .with(CompKey::PACmlk, 30.0)
            .with(CompKey::PACtotal, 39.0)
            .with(CompKey::SaturatedFat, 15.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_whipping_cream_simple_vs_usda_vs_sealtest() {
        let sources = [
            ("Simple", "35% Cream"),
            ("USDA", "USDA Heavy Cream"),
            ("Sealtest", "Sealtest Whipping Cream 35%"),
        ]
        .map(source_str_to_comp);

        // USDA Heavy Cream is 35.6% fat; close enough to compare with the 35% Simple/Sealtest
        // entries. Sealtest's 15ml serving gives low lactose precision (0.5g/15ml = 3.33g/100g —
        // already interpolated from a 0–1g label range), but differences stay moderate because
        // the label value was set at the midpoint rather than rounded. The same coarse serving
        // also rounds trans fat aggressively (0.1g/15ml = 0.67g/100g), driving TransFat ~45%
        // higher than the Simple model's 1.225g/100g and USDA's 1.2g/100g. With MSNF now
        // estimated from lactose+protein, MilkSNFS stays within the default 10% band (vs the
        // old proteins-only SNFS that diverged ~24% on the Simple vs USDA fat gap).
        // The exceptions are:
        //    - Lactose        15.06%  (USDA vs Sealtest)
        //    - MSNF           10.19%  (USDA vs Sealtest)
        //    - POD            15.06%  (USDA vs Sealtest)
        //    - PACsgr         15.06%  (USDA vs Sealtest)
        //    - PACmlk         10.19%  (USDA vs Sealtest)
        //    - PACtotal       13.13%  (USDA vs Sealtest)
        //    - SaturatedFat   10.33%  (Simple vs USDA)
        //    - TransFat       44.82%  (USDA vs Sealtest)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MSNF, 11.0)
            .with(CompKey::Lactose, 16.0)
            .with(CompKey::POD, 16.0)
            .with(CompKey::PACsgr, 16.0)
            .with(CompKey::PACmlk, 11.0)
            .with(CompKey::PACtotal, 14.0)
            .with(CompKey::SaturatedFat, 11.0)
            .with(CompKey::TransFat, 45.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_evaporated_milk_usda_vs_carnation() {
        let sources = [
            ("USDA", "USDA 2% Reduced-Fat Evaporated Milk"),
            ("Carnation", "Carnation 2% Evaporated Partly Skimmed Milk"),
        ]
        .map(source_str_to_comp);

        // @todo Many values differ by up to ~17%; need to investigate.
        let ceiling = CompCeiling::new(17.0);
        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_sweetened_condensed_usda_vs_milk_eagle() {
        let sources = [
            ("USDA", "USDA Sweetened Condensed Milk"),
            ("Eagle Brand", "Eagle Brand Original Sweetened Condensed Milk"),
        ]
        .map(source_str_to_comp);

        // Protein content differs significantly (~35%): Eagle Brand CA label reports 1g per 19.5g
        // serving (= 5.13g/100g) vs. USDA data at 7.91g/100g. All protein-derived fields
        // (MilkSNFS, MilkProteins, TotalProteins) are affected, hence the per-key ceiling
        // overrides below. (Rodrigues, 2017)[^50] has protein at 6.04g/100g. Low-Fat Eagle Brand
        // has 10.2g/100g protein, much higher than all of these (jump from 1g -> 2g per serving).
        // MilkSNFS now lands ~30% (rather than tracking proteins exactly at ~35%) because the
        // estimated mineral fraction softens the protein-only gap slightly.
        // @todo Need to investigate why there is so much variability with protein content.
        let ceiling = CompCeiling::new(12.0)
            .with(CompKey::MilkSNFS, 31.0)
            .with(CompKey::MilkProteins, 36.0)
            .with(CompKey::TotalProteins, 36.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_skim_milk_powder_simple_vs_medallion_vs_theland() {
        let sources = [
            ("Simple", "Skimmed Milk Powder"),
            ("Medallion", "Medallion Skim Milk Powder"),
            ("Theland", "Theland Skim Milk Powder"),
        ]
        .map(source_str_to_comp);

        // The Simple spec is an idealized model (3% water, the rest milk solids-non-fat); with
        // MSNF now derived from sugars+protein and capped at the 98% min-water threshold for
        // powders, the Medallion and Theland labels both end up at the cap too — so MSNF,
        // MilkSolids, TotalSolids, and PACmlk all land within ~10% of Simple. Water still
        // diverges sharply because the absolute amount is tiny (Simple 3% vs Medallion ~3.9% vs
        // Theland ~2%) so small absolute gaps blow up in relative terms. MilkFat hits 100%
        // (Simple vs Theland) because the Simple spec defines skim fat as exactly 0 while
        // Theland's label reports 0.3g/serving — a near-zero value degenerates the relative
        // diff. The same near-zero degeneracy drives SaturatedFat and TransFat to 100% on any
        // pair involving Theland.
        // The exceptions are:
        //    - MilkFat      100.00%  (Simple vs Theland and Medallion vs Theland)
        //    - Water         23.29%  (Simple vs Medallion)
        //    - Water         33.33%  (Simple vs Theland)
        //    - Water         48.86%  (Medallion vs Theland)
        //    - SaturatedFat 100.00%  (Simple vs Theland and Medallion vs Theland)
        //    - TransFat     100.00%  (Simple vs Theland and Medallion vs Theland)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MilkFat, 100.0)
            .with(CompKey::Water, 49.0)
            .with(CompKey::SaturatedFat, 100.0)
            .with(CompKey::TransFat, 100.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_whole_milk_powder_simple_vs_medallion_vs_theland() {
        let sources = [
            ("Simple", "Whole Milk Powder"),
            ("Medallion", "Medallion Whole Milk Powder"),
            ("Theland", "Theland Whole Milk Powder"),
        ]
        .map(source_str_to_comp);

        // As with skim powder, the new MSNF-from-lactose+protein estimate (capped at the 98%
        // min-water powder threshold) brings all three sources close together on MSNF and the
        // solids fields. Water still diverges in relative terms because absolute values are tiny
        // (Simple ~3% vs Medallion ~2.6% vs Theland ~2%). MilkSNFS lands largest between
        // Medallion and Theland (~14%) since they sit on opposite sides of the cap with subtly
        // different protein-to-lactose splits. SaturatedFat diverges between Medallion (label
        // value, ~0.625 of total fat) and Theland (estimated via the standard ~0.65 ratio).
        // The exceptions are:
        //    - MilkSNFS      14.36%  (Medallion vs Theland)
        //    - Water         14.34%  (Simple vs Medallion)
        //    - Water         33.33%  (Simple vs Theland)
        //    - Water         22.17%  (Medallion vs Theland)
        //    - SaturatedFat  13.37%  (Medallion vs Theland)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MilkSNFS, 15.0)
            .with(CompKey::Water, 34.0)
            .with(CompKey::SaturatedFat, 14.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_whey_protein_myprotein_vs_optimum_nutrition() {
        let sources = [
            ("MyProtein", "MyProtein Impact Whey Protein"),
            ("Optimum Nutrition", "Optimum Nutrition Gold Standard 100% Whey"),
        ]
        .map(source_str_to_comp);

        // Both are whey protein concentrates/blends; nutrient densities are similar but the
        // labels diverge in two ways. First, coarse 1g sugar / serving rounding spreads the
        // sugar-derived fields: MyProtein's 1g/25g = 4g/100g vs ON's 3.3g/100g, a ~17.5%
        // relative gap that propagates to Lactose, POD, and PACsgr. Second, MyProtein labels
        // saturated fat as 1g / 1g total — 100% of total fat, clearly a small-serving rounding
        // artifact — vs ON's realistic 1.4g / 4.0g total (~35%); SaturatedFat diverges ~65% as a
        // result. Water blows out (~64%) because MyProtein hits the 2% min-water cap on its WS
        // SNF estimate, pinning Water at 2.0% vs ON's ~5.6%.
        // The exceptions are:
        //    - Lactose       17.50%
        //    - Water         64.31%
        //    - POD           17.50%
        //    - PACsgr        17.50%
        //    - SaturatedFat  65.00%
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::Lactose, 18.0)
            .with(CompKey::Water, 65.0)
            .with(CompKey::POD, 18.0)
            .with(CompKey::PACsgr, 18.0)
            .with(CompKey::SaturatedFat, 67.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_whey_isolate_bulk_barn_vs_leanfit_vs_myprotein_vs_optimum_nutrition() {
        let sources = [
            ("Bulk Barn", "Bulk Barn Whey Protein Isolate 90%"),
            ("Leanfit", "Leanfit Sport Whey Isolate"),
            ("MyProtein", "MyProtein Clear Whey Isolate"),
            ("Optimum Nutrition", "Optimum Nutrition Gold Standard 100% Isolate"),
        ]
        .map(source_str_to_comp);

        // The four isolates span very different formulations. Bulk Barn and Leanfit sit at the
        // upper end of WPI purity (~90% protein, residual fat and sugars); MyProtein Clear is a
        // water-based "clear" format with exactly 0g fat and 0g sugar; ON Gold Standard 100%
        // Isolate sits in the middle at ~83% protein with low but non-zero fat and sugar.
        // MyProtein Clear's exact zeros force every fat- and sugar-derived field (MilkFat,
        // SaturatedFat, TransFat, Lactose, POD, PACsgr) to a degenerate 100% diff against any
        // of the other three. With MSNF now estimated from lactose+protein and capped at the
        // 98% min-water threshold for powders, Bulk Barn / Leanfit / Optimum Nutrition all
        // pin Water at 2.0% — but MyProtein Clear stays at ~9.6g/100g water, so Water blows out
        // (~79%) on any pair involving it, and ~49% between BB/Leanfit and ON because ON's
        // higher fat doesn't push it to the cap. Energy hits ~18% from the same density gap.
        // Protein-derived fields (MilkProteins, TotalProteins) sit ~11% because the four
        // sources still legitimately differ in dry-matter content.
        // The exceptions are:
        //    - Energy          17.95%  (Bulk Barn vs MyProtein)
        //    - Energy          16.80%  (Leanfit vs MyProtein)
        //    - Energy          11.36%  (MyProtein vs ON)
        //    - MilkFat        100.00%  (any pair involving MyProtein Clear)
        //    - MilkFat         14.53%  (Bulk Barn vs Leanfit)
        //    - MilkFat         20.00%  (Bulk Barn vs ON)
        //    - Lactose        100.00%  (any pair involving MyProtein Clear)
        //    - Lactose         61.00%  (Bulk Barn vs Leanfit and Leanfit vs ON)
        //    - MilkProteins    11.11%  (Bulk Barn vs MyProtein)
        //    - MilkProteins    10.86%  (Leanfit vs MyProtein)
        //    - TotalProteins   11.11%  (Bulk Barn vs MyProtein)
        //    - TotalProteins   10.86%  (Leanfit vs MyProtein)
        //    - Water           79.18%  (any pair involving MyProtein Clear)
        //    - Water           48.52%  (Bulk Barn/Leanfit vs ON)
        //    - Water           59.55%  (MyProtein vs ON)
        //    - POD            100.00%  (any pair involving MyProtein Clear)
        //    - POD             61.00%  (Bulk Barn vs Leanfit and Leanfit vs ON)
        //    - PACsgr         100.00%  (any pair involving MyProtein Clear)
        //    - PACsgr          61.00%  (Bulk Barn vs Leanfit and Leanfit vs ON)
        //    - PACtotal        12.83%  (Leanfit vs MyProtein)
        //    - SaturatedFat   100.00%  (any pair involving MyProtein Clear)
        //    - SaturatedFat    61.00%  (Bulk Barn vs Leanfit and Leanfit vs ON)
        //    - TransFat       100.00%  (any pair involving MyProtein Clear)
        //    - TransFat        14.53%  (Bulk Barn vs Leanfit)
        //    - TransFat        20.00%  (Bulk Barn vs ON)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::Energy, 18.0)
            .with(CompKey::MilkFat, 100.0)
            .with(CompKey::Lactose, 100.0)
            .with(CompKey::MilkProteins, 12.0)
            .with(CompKey::TotalProteins, 12.0)
            .with(CompKey::Water, 80.0)
            .with(CompKey::POD, 100.0)
            .with(CompKey::PACsgr, 100.0)
            .with(CompKey::PACtotal, 13.0)
            .with(CompKey::SaturatedFat, 100.0)
            .with(CompKey::TransFat, 100.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    #[test]
    fn compare_specs_casein_california_gold_vs_myprotein_vs_optimum_nutrition() {
        let sources = [
            ("California Gold", "California Gold Nutrition, Sport, Micellar Casein"),
            ("MyProtein", "MyProtein Slow-Release Casein"),
            ("Optimum Nutrition", "Optimum Nutrition Gold Standard 100% Casein"),
        ]
        .map(source_str_to_comp);

        // All three are micellar casein products with broadly similar protein densities but
        // different fat and sugar profiles. California Gold's 0.5g/30g (= 1.67g/100g) total fat
        // sits well below MyProtein's 1g/30g (= 3.33g/100g) — so MilkFat diverges 50% on that
        // pair — but is close to ON's 1.8g/100g (only 7%). ON's 100g serving carries 4.3g
        // sugars vs the others' 1g/30g (= 3.33g/100g), driving Lactose, POD, and PACsgr to
        // ~22% on any pair involving ON. Protein density ranges from 73% (ON) up to 83%
        // (California Gold), which propagates through protein-derived fields (~12%) and inflates
        // Water sharply: with the 10% casein-minerals factor and the 98% min-water cap for
        // powders, California Gold and MyProtein both pin at ~2% Water while ON sits near 12%,
        // so Water blows out 83% (CGold vs ON), 74% (CGold vs MyP — both at 2% but with subtly
        // different sucrose offsets), and 37% (MyP vs ON). California Gold and MyProtein omit
        // saturated fat on their labels, so it falls back to the standard milk-fat ratio
        // applied to total fat; SaturatedFat then tracks MilkFat between California Gold and
        // MyProtein (50%) but lands almost on top of ON between California Gold and ON (~1.5%),
        // while MyProtein's STD-derived 2.17g/100g sits ~49% above ON's labelled 1.1g/100g.
        // TransFat is always STD-derived and tracks MilkFat directly.
        // The exceptions are:
        //    - MilkFat         50.00%  (California Gold vs MyProtein)
        //    - MilkFat         46.00%  (MyProtein vs ON)
        //    - Lactose         22.48%  (pairs involving ON)
        //    - MSNF            10.81%  (California Gold vs ON)
        //    - MilkSNFS        12.24%  (California Gold vs ON)
        //    - MilkProteins    12.40%  (California Gold vs ON)
        //    - MilkSolids      10.49%  (California Gold vs ON)
        //    - TotalProteins   12.40%  (California Gold vs ON)
        //    - TotalSolids     10.49%  (California Gold vs ON)
        //    - Water           83.45%  (California Gold vs ON)
        //    - Water           73.81%  (California Gold vs MyProtein)
        //    - Water           36.82%  (MyProtein vs ON)
        //    - POD             22.48%  (pairs involving ON)
        //    - PACsgr          22.48%  (pairs involving ON)
        //    - PACmlk          10.81%  (California Gold vs ON) — tracks the MSNF gap
        //    - SaturatedFat    50.00%  (California Gold vs MyProtein)
        //    - SaturatedFat    49.23%  (MyProtein vs ON)
        //    - TransFat        50.00%  (California Gold vs MyProtein)
        //    - TransFat        46.00%  (MyProtein vs ON)
        let ceiling = CompCeiling::new(10.0)
            .with(CompKey::MilkFat, 51.0)
            .with(CompKey::Lactose, 23.0)
            .with(CompKey::MSNF, 11.0)
            .with(CompKey::MilkSNFS, 13.0)
            .with(CompKey::MilkProteins, 13.0)
            .with(CompKey::MilkSolids, 11.0)
            .with(CompKey::TotalProteins, 13.0)
            .with(CompKey::TotalSolids, 11.0)
            .with(CompKey::Water, 84.0)
            .with(CompKey::POD, 23.0)
            .with(CompKey::PACsgr, 23.0)
            .with(CompKey::PACmlk, 11.0)
            .with(CompKey::SaturatedFat, 51.0)
            .with(CompKey::TransFat, 51.0);

        assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
        insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_DAIRY: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_DAIRY_SIMPLE_0_MILK_STR, ING_SPEC_DAIRY_SIMPLE_0_MILK.clone(), Some(*COMP_0_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_2_MILK_STR, ING_SPEC_DAIRY_SIMPLE_2_MILK.clone(), Some(*COMP_2_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_3_25_MILK_STR, ING_SPEC_DAIRY_SIMPLE_3_25_MILK.clone(), Some(*COMP_3_25_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_40_CREAM_STR, ING_SPEC_DAIRY_SIMPLE_40_CREAM.clone(), Some(*COMP_40_CREAM)),
                (
                    ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE_STR,
                    ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE.clone(),
                    Some(*COMP_2_MILK_LACTOSE_FREE),
                ),
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
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA.clone(),
                    Some(*COMP_WHOLE_MILK_USDA),
                ),
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
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_CARNATION),
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
            energy: Some(160.0),
            total_fat: Unit::Grams(8.0),
            saturated_fat: Some(5.0),
            trans_fat: Some(0.3),
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
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }
}
