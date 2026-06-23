//! [`EggSpec`] and associated implementations, for egg ingredients like egg yolks, whole eggs, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, EggProteins, EggSolids, Emulsifiers, Fats, Micro, Solids, ToComposition},
    constants::composition::egg::{
        STD_LECITHIN_IN_EGG_YOLK_SOLIDS, STD_SATURATED_FAT_IN_EGG_FAT, STD_WHITE_PROTEIN_IN_WHOLE_EGG_PROTEIN,
        STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS, STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN,
        STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS,
    },
    error::Result,
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::composition::CompKey;

/// Indicates which part of the egg an ingredient is, which determines its white/yolk solids split
#[derive(PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum EggSource {
    /// Whole egg, with solids split between white and yolk per
    /// [`STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS`] and [`STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS`].
    WholeEgg,
    /// Egg white (albumen) only; all solids are egg white solids.
    EggWhite,
    /// Egg yolk only; all solids are egg yolk solids.
    EggYolk,
}

/// Spec for egg ingredients, with water, fat, and protein content, and optional source
///
/// The composition of egg ingredients can usually be found in food composition databases, like
/// [USDA FoodData Central](https://fdc.nal.usda.gov/food-search), in the manufacturers' data, or in
/// reference texts, e.g. _Ice Cream 7th Edition_ (Goff & Hartel, 2013, p. 49)[^2] or _The Science
/// of Ice Cream_ (Clarke, 2004, p. 49)[^4]. The proportion of Lecithin (emulsifier) within the
/// total solids content is calculated internally from [`water`](Self::water),
/// [`egg_source`](Self::egg_source), and [`STD_LECITHIN_IN_EGG_YOLK_SOLIDS`]. The remaining portion
/// of `100 - water - fat - protein` is assumed to be other solids non-fat (snf), accessible via
/// [`CompKey::EggSNF`].
///
/// # Examples
///
/// Based on a combination of multiple sources:
///
/// - Water: 52.1%, Protein: 16.2%, Total Lipid: 28.8% (Eggs, Grade A, Large, egg yolk, 2019)[^100]
/// - Fat: 33%, Protein: 15.8%, Total Solids: 51.2% (Goff & Hartel, 2013, p. 49)[^2]
/// - Water: 50%, Protein: 16%, Other Fat: 23% (Clarke, 2004, p. 49)[^4]
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::{EggSource, EggSpec},
/// };
///
/// let comp = EggSpec {
///     water: 51.0,
///     fat: 30.0,
///     protein: 16.0,
///     egg_source: Some(EggSource::EggYolk),
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Energy), 334.0);
/// assert_eq!(comp.get(CompKey::EggFat), 30.0);
/// assert_eq!(comp.get(CompKey::TotalProteins), 16.0);
/// assert_eq!(comp.get(CompKey::YolkProteins), 16.0);
/// assert_eq!(comp.get(CompKey::WhiteProteins), 0.0);
/// assert_eq!(comp.get(CompKey::EggSNF), 19.0);
/// assert_eq!(comp.get(CompKey::EggSolids), 49.0);
/// assert_eq!(comp.get(CompKey::TotalEmulsifiers), 9.31);
/// # Ok(()) }
/// ```
#[allow(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../docs/references/index/2.md")]
#[doc = include_str!("../../docs/references/index/4.md")]
#[doc = include_str!("../../docs/references/index/100.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EggSpec {
    /// Water content as a percentage of total weight
    pub water: f64,
    /// Fat content as a percentage of total weight
    pub fat: f64,
    /// Protein content as a percentage of total weight
    pub protein: f64,
    /// Which part of the egg this is, [`EggSource::WholeEgg`] if unspecified
    ///
    /// This determines the white/yolk split of the [`protein`](Self::protein).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub egg_source: Option<EggSource>,
}

impl ToComposition for EggSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            water,
            fat,
            protein,
            egg_source,
        } = *self;

        let egg_source = egg_source.unwrap_or(EggSource::WholeEgg);
        let egg_solids = 100.0 - water;

        let (yolk_solids, _) = match egg_source {
            EggSource::WholeEgg => {
                (egg_solids * STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS, egg_solids * STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS)
            }
            EggSource::EggYolk => (egg_solids, 0.0),
            EggSource::EggWhite => (0.0, egg_solids),
        };

        let (yolk_proteins, white_proteins) = match egg_source {
            EggSource::WholeEgg => {
                (protein * STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN, protein * STD_WHITE_PROTEIN_IN_WHOLE_EGG_PROTEIN)
            }
            EggSource::EggYolk => (protein, 0.0),
            EggSource::EggWhite => (0.0, protein),
        };

        let lecithin = yolk_solids * STD_LECITHIN_IN_EGG_YOLK_SOLIDS;

        verify_are_positive(&[water, fat, protein, egg_solids, lecithin])?;
        verify_is_within_100_percent(water + fat + protein)?;
        verify_is_subset(lecithin, fat, "lecithin <= fat")?;

        // @todo We check that `water + fat + protein <= 100` above instead of `== 100` to allow for
        // the 2-3% of other solids (snf) that are typically present in egg ingredients. Should
        // there be a sanity check that the other solids are within a reasonable range, e.g. 0-10%?

        let egg_solids = EggSolids::new()
            .fats(Fats::new().total(fat).saturated(fat * STD_SATURATED_FAT_IN_EGG_FAT))
            .proteins(EggProteins::new().yolk(yolk_proteins).white(white_proteins))
            .others_from_total(100.0 - water)?;

        let micro = Micro::new().emulsifiers(Emulsifiers::new().lecithin(lecithin));
        let texture = micro.emulsifiers.to_texture(None)?;

        Composition::new()
            .energy(egg_solids.energy()?)
            .solids(Solids::new().egg(egg_solids))
            .micro(micro)
            .texture(texture)
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
    use crate::{
        composition::{CompKey, SolidsBreakdown, Texture},
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
    };

    pub(crate) const ING_SPEC_EGG_YOLK_STR: &str = r#"{
      "name": "Egg Yolk",
      "category": "Egg",
      "EggSpec": {
        "water": 51,
        "fat": 30,
        "protein": 16,
        "egg_source": "EggYolk"
      }
    }"#;

    pub(crate) static ING_SPEC_EGG_YOLK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Egg Yolk".to_string(),
        category: Category::Egg,
        spec: EggSpec {
            water: 51.0,
            fat: 30.0,
            protein: 16.0,
            egg_source: Some(EggSource::EggYolk),
        }
        .into(),
    });

    pub(crate) static COMP_EGG_YOLK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(334.0)
            .solids(
                Solids::new().egg(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(30.0).saturated(8.4))
                        .proteins(EggProteins::new().yolk(16.0))
                        .others(3.0),
                ),
            )
            .micro(Micro::new().emulsifiers(Emulsifiers::new().lecithin(9.31)))
            .texture(Texture::new().emulsification(9.31))
    });

    #[test]
    fn to_composition_egg_spec_egg_yolk() {
        let comp = ING_SPEC_EGG_YOLK.spec.to_composition().unwrap();
        assert_eq_flt_test!(comp, *COMP_EGG_YOLK);

        assert_eq!(comp.get(CompKey::Energy), 334.0);
        assert_eq!(comp.get(CompKey::EggFat), 30.0);
        assert_eq!(comp.get(CompKey::EggSNF), 19.0);
        assert_eq!(comp.get(CompKey::EggProteins), 16.0);
        assert_eq!(comp.get(CompKey::WhiteProteins), 0.0);
        assert_eq!(comp.get(CompKey::YolkProteins), 16.0);
        assert_eq!(comp.get(CompKey::TotalProteins), 16.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 19.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 49.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 9.31);
        assert_eq!(comp.get(CompKey::Lecithin), 9.31);
        assert_eq!(comp.get(CompKey::SaturatedFat), 8.4);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
    }

    #[test]
    fn to_composition_egg_spec_whole_egg_splits_protein() {
        let comp = EggSpec {
            water: 75.0,
            fat: 10.0,
            protein: 10.0,
            egg_source: Some(EggSource::WholeEgg),
        }
        .to_composition()
        .unwrap();

        // Whole-egg protein splits ~56% white / ~44% yolk
        assert_eq_flt_test!(comp.get(CompKey::WhiteProteins), 5.6078);
        assert_eq_flt_test!(comp.get(CompKey::YolkProteins), 4.3922);
        assert_eq_flt_test!(comp.get(CompKey::EggProteins), 10.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 10.0);
    }

    #[test]
    fn to_composition_egg_spec_egg_white_is_all_white() {
        let comp = EggSpec {
            water: 88.0,
            fat: 0.0,
            protein: 10.0,
            egg_source: Some(EggSource::EggWhite),
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::WhiteProteins), 10.0);
        assert_eq_flt_test!(comp.get(CompKey::YolkProteins), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::EggProteins), 10.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_EGG: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| vec![(ING_SPEC_EGG_YOLK_STR, ING_SPEC_EGG_YOLK.clone(), Some(*COMP_EGG_YOLK))]);

    #[test]
    fn to_composition_err_on_negative_field() {
        let base = EggSpec {
            water: 51.0,
            fat: 30.0,
            protein: 16.0,
            egg_source: None,
        };
        let neg_cases = [
            EggSpec { water: -1.0, ..base },
            EggSpec { fat: -1.0, ..base },
            EggSpec { protein: -1.0, ..base },
        ];

        for spec in neg_cases {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn to_composition_err_when_water_plus_fat_plus_protein_exceeds_100() {
        let result = EggSpec {
            water: 60.0,
            fat: 30.0,
            protein: 20.0,
            egg_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn to_composition_err_when_lecithin_exceeds_fat() {
        let result = EggSpec {
            water: 51.0,
            fat: 1.0,
            protein: 16.0,
            egg_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }
}
