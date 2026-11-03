//! [`DairySimpleSpec`] and associated implementations, for dairy ingredients from standard values

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fats, MilkSolids, PAC, ScaleComponents, SimpleSolids, Solids, Sugars, ToComposition,
    },
    constants::{
        composition::dairy::{
            STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT, SolidsSource,
            casein::STD_PROTEIN_IN_CASEINATE,
            milk::{STD_MSNF_IN_MILK_SERUM, STD_PROTEIN_IN_MSNF},
            whey::STD_PROTEIN_IN_WS,
        },
        pac,
    },
    error::{Error, Result},
    specs::dairy::util::{estimate_lactose, estimate_minerals, make_dairy_sugars, make_milk_proteins},
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::constants::composition::dairy::{lactose_in_snf, milk::STD_LACTOSE_IN_MSNF};

/// Spec for trivial dairy ingredients, e.g. Milk, Cream, Milk Powder, etc.
///
/// This spec is suitable for common dairy ingredients where only one or a few basic compositional
/// parameters are specified, such as fat content, and the rest is inferred from standard values,
/// notably [`STD_MSNF_IN_MILK_SERUM`], [`STD_LACTOSE_IN_MSNF`], [`STD_PROTEIN_IN_MSNF`], etc. It
/// is also suitable for literature sources where only basic compositional information is available.
///
/// For most common ingredients, e.g. milks and creams, it is sufficient to specify only the fat
/// content. For dried or concentrated dairy products, such as milk powder, whey concentrates, etc.,
/// it is necessary to specify the milk solids non-fat [`msnf`](Self::msnf) content explicitly. For
/// example, _Skimmed Milk Powder_ may have a 3% water content and 0% `fat`, which translates to an
/// `msnf` of 97. Concentrates also need to specify the protein content, as the ultrafiltration
/// process increases the protein concentration beyond that of typical milk or whey. Whey and casein
/// products also need to specify the corresponding [`solids_source`](Self::solids_source), and
/// micellar casein products always need their protein content, which sets their grade.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySimpleSpec {
    /// Fat content by weight, e.g. 3.25 for whole milk, 40 for cream, 0 for skimmed milk, etc.
    pub fat: f64,
    /// Milk solids non-fat content by weight, calculated internally for typical milks and creams.
    ///
    /// It is necessary to specify `msnf` for milk powders and other condensed or dried dairy
    /// products, as they do not adhere to the standard milk and whey composition ratios.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub msnf: Option<f64>,
    /// Protein content by weight; calculated internally based on standard values, if unspecified.
    ///
    /// See [`STD_PROTEIN_IN_MSNF`], [`STD_PROTEIN_IN_WS`], and [`STD_PROTEIN_IN_CASEINATE`] for
    /// those standard values; [`SolidsSource::MicellarCasein`] has none and requires it. The
    /// detailed proteins breakdown is determined by [`solids_source`](Self::solids_source). If that
    /// is not [`SolidsSource::Caseinate`], the lactose content is also determined by the protein
    /// content, as given by [`lactose_in_snf`].
    ///
    /// This is [crude protein](crate::docs#crude-and-true-protein), as sources list it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protein: Option<f64>,
    /// Sucrose content by weight; optional, assumed to be zero if not specified.
    ///
    /// This accommodates dairy products with added sugars, e.g. sweetened condensed milk.
    ///
    /// Note that this is included under [`Solids::other`], not under [`Solids::milk`].
    ///
    /// See [`lactose_free`](Self::lactose_free) for the possibility of different natural sugar
    /// compositions in lactose-free products.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sucrose: Option<f64>,
    /// Whether the dairy product is lactose-free, which affects the detailed sugars composition
    ///
    /// If `false`/`None`, the sugars are assumed to be all lactose, calculated from
    /// [`msnf`](Self::msnf) per the [`solids_source`](Self::solids_source) and [`lactose_in_snf`].
    /// If `true`, the same amount of lactose is instead assumed to be a 50/50 glucose and galactose
    /// mixture, the two monosaccharides that make up lactose, which is typical of lactose-free
    /// dairy products where lactose is enzymatically broken down into its constituent sugars
    /// (Goff & Hartel, 2025, pp. 35, 422)[^20].
    #[doc = include_str!("../../../docs/references/index/20.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lactose_free: Option<bool>,
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein, lactose, and minerals composition of the solids non-fat.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solids_source: Option<SolidsSource>,
}

impl ToComposition for DairySimpleSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            fat,
            msnf,
            protein,
            sucrose,
            lactose_free,
            solids_source,
        } = *self;

        let sucrose = sucrose.unwrap_or(0.0);
        let lactose_free = lactose_free.unwrap_or(false);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        let calculated_msnf = (100.0 - fat) * STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);

        let proteins = match (protein, solids_source) {
            (Some(protein), _) => protein,
            (None, SolidsSource::Milk) => msnf * STD_PROTEIN_IN_MSNF,
            (None, SolidsSource::Whey) => msnf * STD_PROTEIN_IN_WS,
            (None, SolidsSource::Caseinate) => msnf * STD_PROTEIN_IN_CASEINATE,
            (None, SolidsSource::MicellarCasein) => {
                return Err(Error::InvalidSpec(
                    "Micellar casein solids require an explicit protein content".to_string(),
                ));
            }
        };
        let lactose = estimate_lactose(msnf, proteins, solids_source);

        verify_are_positive(&[fat, msnf, proteins, sucrose])?;
        verify_is_within_100_percent(fat + msnf + sucrose)?;
        verify_is_subset(proteins, msnf, "proteins <= msnf")?;
        verify_is_subset(lactose + proteins, msnf, "lactose + proteins <= msnf")?;

        let estimated_minerals = estimate_minerals(msnf, proteins, solids_source);
        let minerals = f64::min(estimated_minerals, msnf - lactose - proteins);

        let dairy_sugars = make_dairy_sugars(lactose, lactose_free);
        let other_sugars = Sugars::new().sucrose(sucrose);
        let total_sugars = dairy_sugars.add(&other_sugars);

        let milk_solids = MilkSolids::new()
            .fats(
                Fats::new()
                    .total(fat)
                    .saturated(fat * STD_SATURATED_FAT_IN_MILK_FAT)
                    .trans(fat * STD_TRANS_FAT_IN_MILK_FAT),
            )
            .carbohydrates(Carbohydrates::new().sugars(dairy_sugars))
            .proteins(make_milk_proteins(proteins, proteins / msnf, solids_source)?)
            .minerals(minerals)
            .others_from_total(fat + msnf)?;

        let other_solids = SimpleSolids::new().carbohydrates(Carbohydrates::new().sugars(other_sugars));

        let pod = total_sugars.to_pod()?;
        let pad = PAC::new()
            .sugars(total_sugars.to_pac()?)
            .msnf_ws_salts(msnf * pac::MSNF_WS_SALTS / 100.0);

        Composition::new()
            .energy(milk_solids.energy()? + other_solids.energy()?)
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(pod)
            .pac(pad)
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
        composition::{CompKey, MilkProteins, SolidsBreakdown},
        constants::composition::dairy::{
            casein::{STD_LACTOSE_IN_CASEINATE, STD_MINERALS_IN_CASEINATE},
            milk::STD_LACTOSE_IN_MSNF,
            whey::{STD_LACTOSE_IN_WPI, STD_LACTOSE_IN_WS, STD_PROTEIN_IN_WPI},
        },
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
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
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_0_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(33.12)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.905)))
                        .proteins(MilkProteins::new().casein(2.7).whey(0.675))
                        .minerals(0.72),
                ),
            )
            .pod(0.7848)
            .pac(PAC::new().sugars(4.905).msnf_ws_salts(3.3066))
    });

    #[test]
    fn to_composition_dairy_simple_spec_0_milk() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_0_MILK);

        comp.assert_all_keys(&[
            (CompKey::Energy, 33.12),
            (CompKey::MilkSolids, 9.0),
            (CompKey::MilkFat, 0.0),
            (CompKey::MSNF, 9.0),
            (CompKey::MilkSugars, 4.905),
            (CompKey::MilkSNFS, 4.095),
            (CompKey::MilkProteins, 3.375),
            (CompKey::Casein, 2.7),
            (CompKey::Whey, 0.675),
            (CompKey::MilkMinerals, 0.72),
            (CompKey::TotalSolids, 9.0),
            (CompKey::TotalFats, 0.0),
            (CompKey::TotalSNF, 9.0),
            (CompKey::TotalSNFS, 4.095),
            (CompKey::TotalProteins, 3.375),
            (CompKey::TotalMinerals, 0.72),
            (CompKey::Water, 91.0),
            (CompKey::TotalCarbohydrates, 4.905),
            (CompKey::TotalSugars, 4.905),
            (CompKey::Lactose, 4.905),
            (CompKey::TotalSweeteners, 4.905),
            (CompKey::POD, 0.7848),
            (CompKey::NetPAC, 8.211_637),
            (CompKey::TotalPAC, 8.211_637),
            (CompKey::PACsgr, 4.905),
            (CompKey::PACmlk, 3.306_637),
            (CompKey::SaturatedFat, 0.0),
            (CompKey::TransFat, 0.0),
        ]);
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
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_2_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(50.4576)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.3).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.8069)))
                        .proteins(MilkProteins::new().casein(2.646).whey(0.6615))
                        .minerals(0.7056),
                ),
            )
            .pod(0.769_104)
            .pac(PAC::new().sugars(4.8069).msnf_ws_salts(3.2405))
    });

    #[test]
    fn to_composition_dairy_simple_spec_2_milk() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_2_MILK);

        comp.assert_all_keys(&[
            (CompKey::Energy, 50.4576),
            (CompKey::MilkSolids, 10.82),
            (CompKey::MilkFat, 2.0),
            (CompKey::MSNF, 8.82),
            (CompKey::MilkSugars, 4.8069),
            (CompKey::MilkSNFS, 4.0131),
            (CompKey::MilkProteins, 3.3075),
            (CompKey::Casein, 2.646),
            (CompKey::Whey, 0.6615),
            (CompKey::MilkMinerals, 0.7056),
            (CompKey::TotalSolids, 10.82),
            (CompKey::TotalFats, 2.0),
            (CompKey::TotalSNF, 8.82),
            (CompKey::TotalSNFS, 4.0131),
            (CompKey::TotalProteins, 3.3075),
            (CompKey::TotalMinerals, 0.7056),
            (CompKey::Water, 89.18),
            (CompKey::TotalCarbohydrates, 4.8069),
            (CompKey::TotalSugars, 4.8069),
            (CompKey::Lactose, 4.8069),
            (CompKey::TotalSweeteners, 4.8069),
            (CompKey::POD, 0.769_104),
            (CompKey::NetPAC, 8.047_404),
            (CompKey::TotalPAC, 8.047_404),
            (CompKey::PACsgr, 4.8069),
            (CompKey::PACmlk, 3.240_504),
            (CompKey::SaturatedFat, 1.3),
            (CompKey::TransFat, 0.07),
        ]);
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
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_3_25_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.2936)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(2.1125).trans(0.11375))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.7456)))
                        .proteins(MilkProteins::new().casein(2.6122).whey(0.6531))
                        .minerals(0.6966),
                ),
            )
            .pod(0.7593)
            .pac(PAC::new().sugars(4.7456).msnf_ws_salts(3.1992))
    });

    #[test]
    fn to_composition_dairy_simple_spec_3_25_milk() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_3_25_MILK);

        comp.assert_all_keys(&[
            (CompKey::Energy, 61.2936),
            (CompKey::MilkSolids, 11.9575),
            (CompKey::MilkFat, 3.25),
            (CompKey::MSNF, 8.7075),
            (CompKey::MilkSugars, 4.745_588),
            (CompKey::MilkSNFS, 3.961_912),
            (CompKey::MilkProteins, 3.265_312),
            (CompKey::Casein, 2.61225),
            (CompKey::Whey, 0.653_062),
            (CompKey::MilkMinerals, 0.6966),
            (CompKey::TotalSolids, 11.9575),
            (CompKey::TotalFats, 3.25),
            (CompKey::TotalSNF, 8.7075),
            (CompKey::TotalSNFS, 3.961_912),
            (CompKey::TotalProteins, 3.265_312),
            (CompKey::TotalMinerals, 0.6966),
            (CompKey::Water, 88.0425),
            (CompKey::TotalCarbohydrates, 4.745_588),
            (CompKey::TotalSugars, 4.745_588),
            (CompKey::Lactose, 4.745_588),
            (CompKey::TotalSweeteners, 4.745_588),
            (CompKey::POD, 0.759_294),
            (CompKey::NetPAC, 7.944_758),
            (CompKey::TotalPAC, 7.944_758),
            (CompKey::PACsgr, 4.745_588),
            (CompKey::PACmlk, 3.199_171),
            (CompKey::SaturatedFat, 2.1125),
            (CompKey::TransFat, 0.11375),
        ]);
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
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_40_CREAM: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(379.872)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(40.0).saturated(26.0).trans(1.4))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.943)))
                        .proteins(MilkProteins::new().casein(1.62).whey(0.405))
                        .minerals(0.432),
                ),
            )
            .pod(0.47088)
            .pac(PAC::new().sugars(2.943).msnf_ws_salts(1.984))
    });

    #[test]
    fn to_composition_dairy_simple_spec_40_cream() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_40_CREAM);

        comp.assert_all_keys(&[
            (CompKey::Energy, 379.872),
            (CompKey::MilkSolids, 45.4),
            (CompKey::MilkFat, 40.0),
            (CompKey::MSNF, 5.4),
            (CompKey::MilkSugars, 2.943),
            (CompKey::MilkSNFS, 2.457),
            (CompKey::MilkProteins, 2.025),
            (CompKey::Casein, 1.62),
            (CompKey::Whey, 0.405),
            (CompKey::MilkMinerals, 0.432),
            (CompKey::TotalSolids, 45.4),
            (CompKey::TotalFats, 40.0),
            (CompKey::TotalSNF, 5.4),
            (CompKey::TotalSNFS, 2.457),
            (CompKey::TotalProteins, 2.025),
            (CompKey::TotalMinerals, 0.432),
            (CompKey::Water, 54.6),
            (CompKey::TotalCarbohydrates, 2.943),
            (CompKey::TotalSugars, 2.943),
            (CompKey::Lactose, 2.943),
            (CompKey::TotalSweeteners, 2.943),
            (CompKey::POD, 0.47088),
            (CompKey::NetPAC, 4.926_982),
            (CompKey::TotalPAC, 4.926_982),
            (CompKey::PACsgr, 2.943),
            (CompKey::PACmlk, 1.983_982),
            (CompKey::SaturatedFat, 26.0),
            (CompKey::TransFat, 1.4),
        ]);
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
                protein: None,
                sucrose: None,
                lactose_free: Some(true),
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_MILK_LACTOSE_FREE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(50.4576)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.3).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(2.40345).galactose(2.40345)))
                        .proteins(MilkProteins::new().casein(2.646).whey(0.6615))
                        .minerals(0.7056),
                ),
            )
            .pod(3.485)
            .pac(PAC::new().sugars(9.1331).msnf_ws_salts(3.2405))
    });

    #[test]
    fn to_composition_dairy_simple_spec_2_milk_lactose_free() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 50.4576),
            (CompKey::MilkSolids, 10.82),
            (CompKey::MilkFat, 2.0),
            (CompKey::MSNF, 8.82),
            (CompKey::MilkSugars, 4.8069),
            (CompKey::MilkSNFS, 4.0131),
            (CompKey::MilkProteins, 3.3075),
            (CompKey::Casein, 2.646),
            (CompKey::Whey, 0.6615),
            (CompKey::MilkMinerals, 0.7056),
            (CompKey::TotalSolids, 10.82),
            (CompKey::TotalFats, 2.0),
            (CompKey::TotalSNF, 8.82),
            (CompKey::TotalSNFS, 4.0131),
            (CompKey::TotalProteins, 3.3075),
            (CompKey::TotalMinerals, 0.7056),
            (CompKey::Water, 89.18),
            (CompKey::TotalCarbohydrates, 4.8069),
            (CompKey::TotalSugars, 4.8069),
            (CompKey::Glucose, 2.40345),
            (CompKey::Galactose, 2.40345),
            (CompKey::TotalSweeteners, 4.8069),
            (CompKey::POD, 3.485_003),
            (CompKey::NetPAC, 12.373_614),
            (CompKey::TotalPAC, 12.373_614),
            (CompKey::PACsgr, 9.13311),
            (CompKey::PACmlk, 3.240_504),
            (CompKey::SaturatedFat, 1.3),
            (CompKey::TransFat, 0.07),
        ]);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER_STR: &str = r#"{
      "name": "Skimmed Milk Powder",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 1,
        "msnf": 96
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Skimmed Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: 1.0,
                msnf: Some(96.0),
                protein: None,
                sucrose: None,
                lactose_free: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIMMED_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(362.28)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.0).saturated(0.65).trans(0.035))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(52.32)))
                        .proteins(MilkProteins::new().casein(28.8).whey(7.2))
                        .minerals(7.68),
                ),
            )
            .pod(8.3712)
            .pac(PAC::new().sugars(52.32).msnf_ws_salts(35.2708))
    });

    #[test]
    fn to_composition_dairy_simple_spec_skimmed_powder() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER);

        comp.assert_all_keys(&[
            (CompKey::Energy, 362.28),
            (CompKey::MilkSolids, 97.0),
            (CompKey::MilkFat, 1.0),
            (CompKey::MSNF, 96.0),
            (CompKey::MilkSugars, 52.32),
            (CompKey::MilkSNFS, 43.68),
            (CompKey::MilkProteins, 36.0),
            (CompKey::Casein, 28.8),
            (CompKey::Whey, 7.2),
            (CompKey::MilkMinerals, 7.68),
            (CompKey::TotalSolids, 97.0),
            (CompKey::TotalFats, 1.0),
            (CompKey::TotalSNF, 96.0),
            (CompKey::TotalSNFS, 43.68),
            (CompKey::TotalProteins, 36.0),
            (CompKey::TotalMinerals, 7.68),
            (CompKey::Water, 3.0),
            (CompKey::TotalCarbohydrates, 52.32),
            (CompKey::TotalSugars, 52.32),
            (CompKey::Lactose, 52.32),
            (CompKey::TotalSweeteners, 52.32),
            (CompKey::POD, 8.3712),
            (CompKey::NetPAC, 87.59079),
            (CompKey::TotalPAC, 87.59079),
            (CompKey::PACsgr, 52.32),
            (CompKey::PACmlk, 35.27079),
            (CompKey::SaturatedFat, 0.65),
            (CompKey::TransFat, 0.035),
        ]);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER_STR: &str = r#"{
      "name": "Whole Milk Powder",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 26,
        "msnf": 72
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Whole Milk Powder".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 26.0,
            msnf: Some(72.0),
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_WHOLE_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(498.96)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(26.0).saturated(16.9).trans(0.91))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(39.24)))
                        .proteins(MilkProteins::new().casein(21.6).whey(5.4))
                        .minerals(5.76),
                ),
            )
            .pod(6.2784)
            .pac(PAC::new().sugars(39.24).msnf_ws_salts(26.4531))
    });

    #[test]
    fn to_composition_dairy_simple_spec_whole_powder() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER);

        comp.assert_all_keys(&[
            (CompKey::Energy, 498.96),
            (CompKey::MilkSolids, 98.0),
            (CompKey::MilkFat, 26.0),
            (CompKey::MSNF, 72.0),
            (CompKey::MilkSugars, 39.24),
            (CompKey::MilkSNFS, 32.76),
            (CompKey::MilkProteins, 27.0),
            (CompKey::Casein, 21.6),
            (CompKey::Whey, 5.4),
            (CompKey::MilkMinerals, 5.76),
            (CompKey::TotalSolids, 98.0),
            (CompKey::TotalFats, 26.0),
            (CompKey::TotalSNF, 72.0),
            (CompKey::TotalSNFS, 32.76),
            (CompKey::TotalProteins, 27.0),
            (CompKey::TotalMinerals, 5.76),
            (CompKey::Water, 2.0),
            (CompKey::TotalCarbohydrates, 39.24),
            (CompKey::TotalSugars, 39.24),
            (CompKey::Lactose, 39.24),
            (CompKey::TotalSweeteners, 39.24),
            (CompKey::POD, 6.2784),
            (CompKey::NetPAC, 65.693_092),
            (CompKey::TotalPAC, 65.693_092),
            (CompKey::PACsgr, 39.24),
            (CompKey::PACmlk, 26.453_092),
            (CompKey::SaturatedFat, 16.9),
            (CompKey::TransFat, 0.91),
        ]);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL_STR: &str = r#"{
      "name": "Goff & Hartel Skim Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 0,
        "msnf": 8.6,
        "protein": 3.2
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Goff & Hartel Skim Milk".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: 0.0,
                msnf: Some(8.6),
                protein: Some(3.2),
                sucrose: None,
                lactose_free: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIM_MILK_GOFF_HARTEL: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(31.6465)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.7116)))
                        .proteins(MilkProteins::new().casein(2.56).whey(0.64))
                        .minerals(0.6884),
                ),
            )
            .pod(0.7539)
            .pac(PAC::new().sugars(4.7116).msnf_ws_salts(3.1597))
    });

    #[test]
    fn to_composition_dairy_simple_spec_skim_milk_goff_hartel() {
        let comp = asset_composition(&ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 31.646_507),
            (CompKey::MilkSolids, 8.6),
            (CompKey::MilkFat, 0.0),
            (CompKey::MSNF, 8.6),
            (CompKey::MilkSugars, 4.711_627),
            (CompKey::MilkSNFS, 3.888_373),
            (CompKey::MilkProteins, 3.2),
            (CompKey::Casein, 2.56),
            (CompKey::Whey, 0.64),
            (CompKey::MilkMinerals, 0.688_373),
            (CompKey::TotalSolids, 8.6),
            (CompKey::TotalFats, 0.0),
            (CompKey::TotalSNF, 8.6),
            (CompKey::TotalSNFS, 3.888_373),
            (CompKey::TotalProteins, 3.2),
            (CompKey::TotalMinerals, 0.688_373),
            (CompKey::Water, 91.4),
            (CompKey::TotalCarbohydrates, 4.711_627),
            (CompKey::TotalSugars, 4.711_627),
            (CompKey::Lactose, 4.711_627),
            (CompKey::TotalSweeteners, 4.711_627),
            (CompKey::POD, 0.75386),
            (CompKey::NetPAC, 7.871_302),
            (CompKey::TotalPAC, 7.871_302),
            (CompKey::PACsgr, 4.711_627),
            (CompKey::PACmlk, 3.159_675),
            (CompKey::SaturatedFat, 0.0),
            (CompKey::TransFat, 0.0),
        ]);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_DAIRY_SIMPLE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
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
                    ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL_STR,
                    ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL.clone(),
                    Some(*COMP_SKIM_MILK_GOFF_HARTEL),
                ),
            ]
        });

    fn empty_dairy_simple_spec() -> DairySimpleSpec {
        DairySimpleSpec {
            fat: 0.0,
            msnf: None,
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
    }

    #[test]
    fn dairy_simple_spec_milk_at_plain_milk_protein() {
        // Plain milk's own protein puts lactose at its line's anchor, whether given or defaulted
        for protein in [None, Some(96.0 * STD_PROTEIN_IN_MSNF)] {
            let comp = DairySimpleSpec {
                fat: 1.0,
                msnf: Some(96.0),
                protein,
                ..empty_dairy_simple_spec()
            }
            .to_composition()
            .unwrap();

            assert_eq_flt!(comp.get(CompKey::Lactose), 96.0 * STD_LACTOSE_IN_MSNF);
            assert_eq_flt!(comp.get(CompKey::MilkProteins), 96.0 * STD_PROTEIN_IN_MSNF);
        }
    }

    #[test]
    fn dairy_simple_spec_milk_protein_concentrate_grade() {
        // A milk protein concentrate 80's protein, 84.2% of its solids non-fat, sets its lactose
        // and minerals along the lines, 8.5% and 7.3%, and its protein keeps milk's casein share
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(95.0),
            protein: Some(80.0),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_6dp!(comp.get(CompKey::Lactose), 8.062_313);
        assert_eq_6dp!(comp.get(CompKey::MilkMinerals), 6.937_687);
        assert_eq_flt!(comp.get(CompKey::Casein), 64.0);
        assert_eq_flt!(comp.get(CompKey::Whey), 16.0);
        assert_eq_flt!(comp.get(CompKey::Water), 4.0);
    }

    #[test]
    fn dairy_simple_spec_milk_below_plain_milk_protein() {
        // At 34.4% protein, under plain milk solids' 37.5%, as in milk with added permeate, the
        // lines continue toward the permeate's composition: 57.6% lactose and 8.0% minerals
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(96.0),
            protein: Some(33.0),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_6dp!(comp.get(CompKey::Lactose), 55.275_224);
        assert_eq_6dp!(comp.get(CompKey::MilkMinerals), 7.724_776);
        assert_eq_flt!(comp.get(CompKey::Casein), 26.4);
        assert_eq_flt!(comp.get(CompKey::Water), 3.0);
    }

    #[test]
    fn dairy_simple_spec_whey_at_sweet_whey_protein() {
        // Sweet whey's own protein keeps lactose at its fixed fraction, whether given or defaulted
        for protein in [None, Some(96.0 * STD_PROTEIN_IN_WS)] {
            let comp = DairySimpleSpec {
                fat: 1.0,
                msnf: Some(96.0),
                protein,
                solids_source: Some(SolidsSource::Whey),
                ..empty_dairy_simple_spec()
            }
            .to_composition()
            .unwrap();

            assert_eq_flt!(comp.get(CompKey::Lactose), 96.0 * STD_LACTOSE_IN_WS);
            assert_eq_flt!(comp.get(CompKey::MilkProteins), 96.0 * STD_PROTEIN_IN_WS);
        }
    }

    #[test]
    fn dairy_simple_spec_whey_at_isolate_protein() {
        // An isolate's protein puts lactose at the line's other anchor
        let comp = DairySimpleSpec {
            fat: 0.5,
            msnf: Some(95.0),
            protein: Some(95.0 * STD_PROTEIN_IN_WPI),
            solids_source: Some(SolidsSource::Whey),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_8dp!(comp.get(CompKey::Lactose), 95.0 * STD_LACTOSE_IN_WPI);
        assert_eq_flt!(comp.get(CompKey::MilkProteins), 95.0 * STD_PROTEIN_IN_WPI);
    }

    #[test]
    fn dairy_simple_spec_whey_protein_concentrate() {
        // USDEC's WPC 80 profile: at 89.6% protein, the line's lactose is 6.22% of the whey solids
        let comp = DairySimpleSpec {
            fat: 6.6,
            msnf: Some(89.29),
            protein: Some(80.0),
            solids_source: Some(SolidsSource::Whey),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_6dp!(comp.get(CompKey::Lactose), 5.551_734);
        assert_eq_flt!(comp.get(CompKey::MilkProteins), 80.0);
        assert_eq_6dp!(comp.get(CompKey::MilkSNFS), 83.738_266);
        assert_eq_flt!(comp.get(CompKey::Water), 4.11);
    }

    #[test]
    fn dairy_simple_spec_caseinate_default_protein() {
        // Caseinate's protein defaults to what its lactose and minerals leave of the solids non-fat
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(95.0),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt!(comp.get(CompKey::Lactose), 95.0 * STD_LACTOSE_IN_CASEINATE);
        assert_eq_flt!(comp.get(CompKey::Casein), 95.0 * STD_PROTEIN_IN_CASEINATE);
        assert_eq_flt!(comp.get(CompKey::Whey), 0.0);
        assert_eq_flt!(comp.get(CompKey::MilkMinerals), 95.0 * STD_MINERALS_IN_CASEINATE);
        assert_eq_flt!(comp.get(CompKey::Water), 4.0);
    }

    #[test]
    fn dairy_simple_spec_micellar_casein_grade() {
        // A micellar casein concentrate 80's protein, 85.1% of its solids non-fat, sets its
        // lactose, minerals, and casein share along the lines: 6.6%, 8.3%, and 91.7%
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(94.0),
            protein: Some(80.0),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_6dp!(comp.get(CompKey::Lactose), 6.227_175);
        assert_eq_6dp!(comp.get(CompKey::MilkMinerals), 7.772_825);
        assert_eq_6dp!(comp.get(CompKey::Casein), 73.324_037);
        assert_eq_6dp!(comp.get(CompKey::Whey), 6.675_963);
        assert_eq_flt!(comp.get(CompKey::Water), 5.0);
    }

    #[test]
    fn dairy_simple_spec_casein_given_protein() {
        // A given protein above caseinate's default leaves its minerals only what remains beside
        // the lactose, under their fixed fraction, e.g. Southward's sodium caseinate, 91.4 g of
        // protein in 95.1 g of solids non-fat: 3.5098 g of minerals rather than 3.804 g
        let comp = DairySimpleSpec {
            fat: 1.1,
            msnf: Some(95.1),
            protein: Some(91.4),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt!(comp.get(CompKey::Lactose), 0.1902);
        assert_eq_flt!(comp.get(CompKey::Casein), 91.4);
        assert_eq_8dp!(comp.get(CompKey::MilkMinerals), 3.5098);
        assert_eq!(comp.solids.milk.others, 0.0);
    }

    #[test]
    fn dairy_simple_spec_casein_given_low_protein() {
        // A given protein below caseinate's default keeps the fixed fraction of minerals, 3.8 g of
        // 95 g of solids non-fat, and the other milk solids take the 3.01 g left beside them
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(95.0),
            protein: Some(88.0),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt!(comp.get(CompKey::Lactose), 0.19);
        assert_eq_flt!(comp.get(CompKey::MilkMinerals), 95.0 * STD_MINERALS_IN_CASEINATE);
        assert_eq_8dp!(comp.solids.milk.others, 3.01);
    }

    #[test]
    fn dairy_simple_spec_err_on_negative_field() {
        let specs = [
            DairySimpleSpec {
                fat: -1.0,
                ..empty_dairy_simple_spec()
            },
            DairySimpleSpec {
                fat: 3.25,
                msnf: Some(-1.0),
                ..empty_dairy_simple_spec()
            },
            DairySimpleSpec {
                fat: 3.25,
                protein: Some(-1.0),
                ..empty_dairy_simple_spec()
            },
        ];

        for spec in specs {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn dairy_simple_spec_err_when_fat_plus_msnf_plus_sucrose_exceeds_100() {
        let result = DairySimpleSpec {
            fat: 50.0,
            msnf: Some(40.0),
            sucrose: Some(15.0),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_milk_protein_leaves_no_lactose() {
        // At 93.2% protein, past the ~92.8% where the line's lactose runs out
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(88.5),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_micellar_casein_protein_is_missing() {
        // Micellar casein's grade is its protein, so it has no default
        let result = DairySimpleSpec {
            msnf: Some(94.0),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidSpec(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_micellar_casein_protein_is_below_milk_solids() {
        // At 30 g of protein in 94 g of solids non-fat, under milk solids' 37.5%, the micellar
        // casein lines would split its protein with more whey than milk has
        let result = DairySimpleSpec {
            msnf: Some(94.0),
            protein: Some(30.0),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::UnsupportedComposition(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_micellar_casein_protein_leaves_no_lactose() {
        // At 92.1% protein, past the ~91.7% where the line's lactose runs out
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(87.5),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_caseinate_protein_leaves_no_minerals() {
        // 94.9 g of protein and the 0.19 g of lactose of 95 g of caseinate solids exceed them
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(94.9),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_whey_protein_leaves_no_lactose() {
        // At 97% protein, past the ~96.4% where the line's lactose runs out
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(92.15),
            solids_source: Some(SolidsSource::Whey),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }
}
