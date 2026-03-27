//! [`NutSpec`] and associated implementations, for nut ingredients, usually nut butters

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Carbohydrates, Composition, Fats, Fibers, PAC, Solids, SolidsBreakdown, Sugars, ToComposition},
    constants::{self},
    error::Result,
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::composition::CompKey;

/// Spec for nut ingredients, usually nut butters, with nutrition facts style breakdown
///
/// Nut ingredients are specified by their nutrition facts composition by total weight, namely
/// [`water`](Self::water), [`protein`](Self::protein), [`fat`](Self::fat),
/// [`carbohydrate`](Self::carbohydrate), [`fiber`](Self::fiber), [`sugars`](Self::sugars), and
/// optional [`saturated_fat`](Self::saturated_fat). The remaining portion up to 100% is assumed to
/// be non-fat, non-sugar solids (snfs). Sugars are assumed to be all sucrose. Fat and sugar values
/// are specified in [`Composition`] via [`CompKey::NutFat`] and [`CompKey::TotalSweeteners`],
/// respectively.
///
/// The composition of nut ingredients can usually be found in food in the nutrition facts tables
/// provided by the manufacturer, or in food composition databases, like [USDA FoodData
/// Central](https://fdc.nal.usda.gov/food-search).
///
/// # Examples
///
/// (Nuts, almonds, 2019)[^102] per 100g:
/// - Water: 4.41g
/// - Protein: 21.2g
/// - Total lipid (fat): 49.9g
/// - Carbohydrate: 21.6g
/// - Fiber: 12.5g
/// - Total Sugars: 4.35g
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::docs::assert_eq_float;
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::NutSpec
/// };
///
/// let comp = NutSpec {
///    water: 4.41,
///    protein: 21.2,
///    fat: 49.9,
///    saturated_fat: Some(3.8),
///    carbohydrate: 21.6,
///    fiber: 12.5,
///    sugars: 4.35,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Energy), 570.3);
/// assert_eq!(comp.get(CompKey::NutFat), 49.9);
/// assert_eq!(comp.get(CompKey::TotalProteins), 21.2);
/// assert_eq!(comp.get(CompKey::Fiber), 12.5);
/// assert_eq!(comp.get(CompKey::NutSNF), 41.34);
/// assert_eq_float!(comp.get(CompKey::NutSolids), 91.24);
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 4.35);
/// assert_eq!(comp.get(CompKey::TotalSolids), 95.59);
/// assert_eq!(comp.get(CompKey::POD), 4.35);
/// assert_eq!(comp.get(CompKey::HF), 69.86);
/// # Ok(()) }
/// ```
#[allow(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../docs/bibs/102.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct NutSpec {
    /// Water content as percentage of total weight
    pub water: f64,
    /// Protein content as percentage of total weight
    pub protein: f64,
    /// Fat content as percentage of total weight
    pub fat: f64,
    /// Saturated fat content as percentage of total weight, optional, automatically calculated if
    /// not specified.
    ///
    /// If not specified, it is assumed to be a standard proportion of total fat for nuts, defined
    /// by [`constants::composition::STD_SATURATED_FAT_IN_NUT_FAT`].
    pub saturated_fat: Option<f64>,
    /// Carbohydrate content as percentage of total weight
    pub carbohydrate: f64,
    /// Fiber content as percentage of total weight. Fiber is a subset of carbohydrates.
    pub fiber: f64,
    /// Sugars content as percentage of total weight. Sugars are a subset of carbohydrates.
    pub sugars: f64,
}

impl ToComposition for NutSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            water,
            protein,
            fat,
            saturated_fat,
            carbohydrate,
            fiber,
            sugars,
        } = *self;

        verify_are_positive(&[water, protein, fat, carbohydrate, fiber, sugars])?;
        verify_is_within_100_percent(water + protein + fat + carbohydrate)?;
        verify_is_subset(fiber + sugars, carbohydrate, "fiber + sugars <= carbohydrate")?;

        let saturated_fat = saturated_fat.unwrap_or(fat * constants::composition::STD_SATURATED_FAT_IN_NUT_FAT);
        verify_is_subset(saturated_fat, fat, "saturated_fat <= fat")?;

        let sugars = Sugars::new().sucrose(sugars);

        let carbohydrates = Carbohydrates::new()
            .sugars(sugars)
            .fiber(Fibers::new().other(fiber))
            .others_from_total(carbohydrate)?;

        let nut_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fat).saturated(saturated_fat))
            .carbohydrates(carbohydrates)
            .proteins(protein)
            .others_from_total(100.0 - water)?;

        Composition::new()
            .energy(nut_solids.energy()?)
            .solids(Solids::new().nut(nut_solids))
            .pod(sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(sugars.to_pac()?)
                    .hardness_factor(fat * constants::hf::NUT_FAT),
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

    use super::*;
    use crate::{composition::CompKey, error::Error, ingredient::Category, specs::IngredientSpec};

    pub(crate) const ING_SPEC_NUT_ALMOND_STR: &str = r#"{
      "name": "Almond",
      "category": "Nut",
      "NutSpec": {
        "water": 4.41,
        "protein": 21.2,
        "fat": 49.9,
        "saturated_fat": 3.8,
        "carbohydrate": 21.6,
        "fiber": 12.5,
        "sugars": 4.35
      }
    }"#;

    pub(crate) static ING_SPEC_NUT_ALMOND: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Almond".to_string(),
        category: Category::Nut,
        spec: NutSpec {
            water: 4.41,
            protein: 21.2,
            fat: 49.9,
            saturated_fat: Some(3.8),
            carbohydrate: 21.6,
            fiber: 12.5,
            sugars: 4.35,
        }
        .into(),
    });

    pub(crate) static COMP_NUT_ALMOND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(570.3)
            .solids(
                Solids::new().nut(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(49.9).saturated(3.8))
                        .proteins(21.2)
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(12.5))
                                .sugars(Sugars::new().sucrose(4.35))
                                .others_from_total(21.6)
                                .unwrap(),
                        )
                        .others(2.89),
                ),
            )
            .pod(4.35)
            .pac(PAC::new().sugars(4.35).hardness_factor(69.86))
    });

    #[test]
    fn to_composition_nut_spec_almond() {
        let comp = ING_SPEC_NUT_ALMOND.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 570.3);
        assert_eq!(comp.get(CompKey::TotalProteins), 21.2);
        assert_eq!(comp.get(CompKey::Fiber), 12.5);

        assert_eq!(comp.get(CompKey::NutFat), 49.9);
        assert_eq!(comp.solids.nut.fats.saturated, 3.8);
        assert_eq!(comp.get(CompKey::NutSNF), 41.34);
        assert_eq_flt_test!(comp.get(CompKey::NutSolids), 91.24);

        // Sugar in nuts is considered part of total sweeteners, not part of Nut Solids
        assert_eq!(comp.get(CompKey::TotalSweeteners), 4.35);
        assert_eq!(comp.get(CompKey::NutSolids), comp.get(CompKey::NutFat) + comp.get(CompKey::NutSNF));
        assert_eq!(comp.get(CompKey::NutSolids), comp.get(CompKey::TotalSolids) - comp.get(CompKey::TotalSweeteners));

        assert_eq!(comp.get(CompKey::TotalSolids), 95.59);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.41);
        assert_eq!(comp.get(CompKey::POD), 4.35);
        assert_eq!(comp.get(CompKey::HF), 69.86);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_NUT: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| vec![(ING_SPEC_NUT_ALMOND_STR, ING_SPEC_NUT_ALMOND.clone(), Some(*COMP_NUT_ALMOND))]);

    #[test]
    fn to_composition_err_on_negative_field() {
        let base = NutSpec {
            water: 4.41,
            protein: 21.2,
            fat: 49.9,
            saturated_fat: None,
            carbohydrate: 21.6,
            fiber: 12.5,
            sugars: 4.35,
        };

        let neg_cases = [
            NutSpec { water: -1.0, ..base },
            NutSpec { protein: -1.0, ..base },
            NutSpec { fat: -1.0, ..base },
            NutSpec {
                carbohydrate: -1.0,
                ..base
            },
            NutSpec { fiber: -1.0, ..base },
            NutSpec { sugars: -1.0, ..base },
        ];

        for spec in neg_cases {
            assert!(matches!(spec.to_composition(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn to_composition_err_when_total_exceeds_100() {
        let spec = NutSpec {
            water: 50.0,
            protein: 21.2,
            fat: 49.9,
            saturated_fat: None,
            carbohydrate: 21.6,
            fiber: 12.5,
            sugars: 4.35,
        };
        assert!(matches!(spec.to_composition(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn to_composition_err_when_fiber_plus_sugars_exceeds_carbohydrate() {
        let spec = NutSpec {
            water: 4.41,
            protein: 21.2,
            fat: 49.9,
            saturated_fat: None,
            carbohydrate: 10.0,
            fiber: 8.0,
            sugars: 4.0,
        };
        assert!(matches!(spec.to_composition(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_err_when_saturated_fat_exceeds_fat() {
        let spec = NutSpec {
            water: 4.41,
            protein: 21.2,
            fat: 10.0,
            saturated_fat: Some(15.0),
            carbohydrate: 21.6,
            fiber: 12.5,
            sugars: 4.35,
        };
        assert!(matches!(spec.to_composition(), Err(Error::InvalidComposition(_))));
    }
}
