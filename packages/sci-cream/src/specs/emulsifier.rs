//! [`EmulsifierSpec`] and associated implementations, for emulsifier ingredients, e.g. lecithin

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Composition, Emulsifiers, Fats, Micro, ScaleComponents, SimpleSolids, Solids, SolidsBreakdown, ToComposition,
    },
    error::{Error, Result},
    validate::{Validate, verify_are_positive, verify_is_100_percent},
};

/// Spec for emulsifier ingredients, e.g. lecithin
///
/// These ingredients are assumed to be 100% solids, and all the populated fields of [`Emulsifiers`]
/// plus the total of [`other_solids`](Self::other_solids) must add up to 100. If field
/// [`Emulsifiers::other`](field@Emulsifiers::other) is populated, it is counted as other solids
/// non-fat non-sugar. All the other fields represent known emulsifier components, e.g. lecithin,
/// and the specific breakdown of solids will be reflected in the composition.
///
/// The [`strength`](Self::strength) field represents the relative strength of the emulsifier as a
/// percentage of a reference. If not populated it is automatically calculated from the known
/// emulsifier components. If [`Emulsifiers::other`](field@Emulsifiers::other) is populated, then
/// the [`strength`](Self::strength) field must be populated, since the strength of unspecified
/// emulsifiers is unknown.
///
/// This "strength" is a very fuzzy concept, since it's difficult to precisely quantify the
/// effectiveness of emulsifiers. However, this allows for a rough scaling, differentiating between
/// very weak and very strong ingredients.
///
/// Lecithin is taken as the reference emulsifier with a strength of 100, with a recommended dosage
/// of ~3.25g/kg (Raphaelson, 2016, Standard Base)[^5]. Something like _"Louis Francois Stab 2000"_
/// has a similar recommended dosage for its emulsifier component, so it also has a a relative
/// emulsifier strength of 100.
#[doc = include_str!("../../docs/references/index/5.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EmulsifierSpec {
    /// Breakdown of the constituent emulsifier components of the ingredient
    ///
    /// The total of these and [`other_solids`](Self::other_solids) must add up to 100. If field
    /// [`Emulsifiers::other`](field@Emulsifiers::other) is populated, it is counted as other solids
    /// non-fat non-sugar, and the [`strength`](EmulsifierSpec::strength) field must be provided.
    /// All the other fields represent known emulsifier components, e.g. lecithin,
    /// etc., and the specific breakdown of solids will be reflected in the composition.
    pub emulsifiers: Emulsifiers,
    /// Relative strength of the emulsifier as a percentage of a reference
    ///
    /// If not provided it is automatically calculated from the known emulsifier components. If
    /// field [`Emulsifiers::other`](field@Emulsifiers::other) is populated, then this field must be
    /// populated, since the strength of unspecified emulsifiers is unknown. See
    /// [`constants::emulsification`](crate::constants::emulsification) for reference strength
    /// values of known emulsifier components.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strength: Option<f64>,
    /// Breakdown of the other solids in the ingredient that aren't the emulsifier components
    ///
    /// For example, lecithin powders contain ~95% acetone insoluble substances (lecithin) and ~5%
    /// mostly triglycerides (fats) (EFSA et al., 2017, 3.1.1 Identity of the substance)[^75].
    ///
    /// The total of these and [`emulsifiers`](Self::emulsifiers) must add up to 100.
    #[doc = include_str!("../../docs/references/index/75.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_solids: Option<SimpleSolids>,
}

impl ToComposition for EmulsifierSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            emulsifiers,
            strength,
            other_solids,
        } = *self;

        let other_solids = other_solids.unwrap_or_else(SimpleSolids::new);

        emulsifiers.validate()?;
        other_solids.validate()?;

        verify_is_100_percent(emulsifiers.total() + other_solids.total())?;
        verify_are_positive(&[strength.unwrap_or(0.0)])?;

        if emulsifiers.other > 0.0 && strength.is_none() {
            return Err(Error::InvalidSpec(
                "Strength must be provided if 'other' emulsifiers are specified".to_string(),
            ));
        }

        let solids = SolidsBreakdown::new()
            .fats(Fats::new().total(emulsifiers.lecithin))
            .others(emulsifiers.other)
            .add(&other_solids);

        let micro = Micro::new().emulsifiers(emulsifiers);
        let texture = emulsifiers.to_texture(strength)?;

        Composition::new()
            .energy(solids.energy()?)
            .solids(Solids::new().other(solids))
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
    use crate::{composition::CompKey, error::Error, ingredient::Category, specs::IngredientSpec};

    pub(crate) const ING_SPEC_EMULSIFIER_SOY_LECITHIN_POWDER_STR: &str = r#"{
      "name": "Soy Lecithin Powder",
      "category": "Emulsifier",
      "EmulsifierSpec": {
        "emulsifiers": { "lecithin": 95.0 },
        "other_solids": { "fats": { "total": 5.0 } }
      }
    }"#;

    pub(crate) static ING_SPEC_EMULSIFIER_SOY_LECITHIN_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Soy Lecithin Powder".to_string(),
            category: Category::Emulsifier,
            spec: EmulsifierSpec {
                emulsifiers: Emulsifiers::new().lecithin(95.0),
                strength: None,
                other_solids: Some(SimpleSolids::new().fats(Fats::new().total(5.0))),
            }
            .into(),
        });

    #[test]
    fn to_composition_emulsifier_soy_lecithin_powder() {
        let comp = ING_SPEC_EMULSIFIER_SOY_LECITHIN_POWDER.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 900.0);
        assert_eq!(comp.get(CompKey::TotalFats), 100.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 95.0);

        assert_eq!(comp.micro.emulsifiers, Emulsifiers::new().lecithin(95.0));
        assert_eq!(comp.texture.emulsification, 95.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_EMULSIFIERS: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![(ING_SPEC_EMULSIFIER_SOY_LECITHIN_POWDER_STR, ING_SPEC_EMULSIFIER_SOY_LECITHIN_POWDER.clone(), None)]
        });

    #[test]
    fn to_composition_err_on_negative_strength() {
        let neg_cases = [EmulsifierSpec {
            emulsifiers: Emulsifiers::new().lecithin(100.0),
            strength: Some(-1.0),
            other_solids: None,
        }];
        for spec in neg_cases {
            assert!(matches!(spec.to_composition(), Err(Error::CompositionNotPositive(_))));
        }
    }
}
