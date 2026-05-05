//! [`EggSpec`] and associated implementations, for egg ingredients like egg yolks, whole eggs, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, Emulsifiers, Fats, Micro, Solids, SolidsBreakdown, ToComposition},
    constants,
    error::Result,
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::composition::CompKey;

/// Spec for egg ingredients, with water, fat, protein, and lecithin (emulsifier) content
///
/// The composition of egg ingredients can usually be found in food composition databases, like
/// [USDA FoodData Central](https://fdc.nal.usda.gov/food-search), in the manufacturers' data, or in
/// reference texts, e.g. _Ice Cream 7th Edition_ (Goff & Hartel, 2013, p. 49)[^2] or _The Science
/// of Ice Cream_ (Clarke, 2004, p. 49)[^4]. Note that [`lecithin`](Self::lecithin) is a subset of
/// [`fat`](Self::fat) and considered an emulsifier with relative strength of 100, specified in
/// [`Composition`] via [`CompKey::Emulsifiers`]. The remaining portion of `100 - water - fat` is
/// assumed to be non-fat solids (snf), specified in [`Composition`] via [`CompKey::EggSNF`].
///
/// # Examples
///
/// Based on a combination of multiple sources:
///
/// - Water: 52.1%, Protein: 16.2%, Total Lipid: 28.8% (Eggs, Grade A, Large, egg yolk, 2019)[^100]
/// - Fat: 33%, Protein: 15.8%, Total Solids: 51.2% (Goff & Hartel, 2013, p. 49)[^2]
/// - Water: 50%, Protein: 16%, Lecithin: 9%, Other Fat: 23% (Clarke, 2004, p. 49)[^4]
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::EggSpec
/// };
///
/// let comp = EggSpec {
///     water: 51.0,
///     fat: 30.0,
///     protein: 16.0,
///     lecithin: 9.0,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Energy), 334.0);
/// assert_eq!(comp.get(CompKey::EggFat), 30.0);
/// assert_eq!(comp.get(CompKey::TotalProteins), 16.0);
/// assert_eq!(comp.get(CompKey::EggSNF), 19.0);
/// assert_eq!(comp.get(CompKey::EggSolids), 49.0);
/// assert_eq!(comp.get(CompKey::Emulsifiers), 9.0);
/// # Ok(()) }
/// ```
//
// @todo Egg yolk and egg white solids have significantly different properties with regards to
// stabilization, emulsification, and texture, therefore they should be tracked separately. This
// spec needs to be updated to allow specifying the egg yolk and egg white breakdown of solids.
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
    /// Lecithin content as a percentage of total weight. Note that lecithin is a subset of fat.
    pub lecithin: f64,
}

impl ToComposition for EggSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            water,
            fat,
            protein,
            lecithin,
        } = *self;

        verify_are_positive(&[water, fat, protein, lecithin])?;
        verify_is_within_100_percent(water + fat + protein)?;
        verify_is_subset(lecithin, fat, "lecithin <= fat")?;

        // @todo We check that `water + fat + protein <= 100` above instead of `== 100` to allow for
        // the 2-3% of other solids (snf) that are typically present in egg ingredients. Should
        // there be a sanity check that the other solids are within a reasonable range, e.g. 0-10%?

        let egg_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(fat)
                    .saturated(fat * constants::composition::STD_SATURATED_FAT_IN_EGG_FAT),
            )
            .proteins(protein)
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
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use super::*;
    use crate::{
        composition::{CompKey, Texture},
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
        "lecithin": 9
      }
    }"#;

    pub(crate) static ING_SPEC_EGG_YOLK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Egg Yolk".to_string(),
        category: Category::Egg,
        spec: EggSpec {
            water: 51.0,
            fat: 30.0,
            protein: 16.0,
            lecithin: 9.0,
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
                        .proteins(16.0)
                        .others(3.0),
                ),
            )
            .micro(Micro::new().emulsifiers(Emulsifiers::new().lecithin(9.0)))
            .texture(Texture::new().emulsification(9.0))
    });

    #[test]
    fn to_composition_egg_spec_egg_yolk() {
        let comp = ING_SPEC_EGG_YOLK.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 334.0);
        assert_eq!(comp.get(CompKey::EggFat), 30.0);
        assert_eq!(comp.solids.egg.fats.saturated, 8.4);
        assert_eq!(comp.get(CompKey::EggSNF), 19.0);
        assert_eq!(comp.get(CompKey::TotalProteins), 16.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 19.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 49.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 9.0);
        assert_eq!(comp.get(CompKey::Lecithin), 9.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_EGG: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| vec![(ING_SPEC_EGG_YOLK_STR, ING_SPEC_EGG_YOLK.clone(), Some(*COMP_EGG_YOLK))]);

    #[test]
    fn to_composition_err_on_negative_field() {
        let base = EggSpec {
            water: 51.0,
            fat: 30.0,
            protein: 16.0,
            lecithin: 9.0,
        };
        let neg_cases = [
            EggSpec { water: -1.0, ..base },
            EggSpec { fat: -1.0, ..base },
            EggSpec { protein: -1.0, ..base },
            EggSpec { lecithin: -1.0, ..base },
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
            lecithin: 9.0,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn to_composition_err_when_lecithin_exceeds_fat() {
        let result = EggSpec {
            water: 51.0,
            fat: 10.0,
            protein: 16.0,
            lecithin: 20.0,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }
}
