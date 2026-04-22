//! [`StabilizerSpec`] and associated implementations, for stabilizer ingredients, e.g. gums, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Carbohydrates, Composition, Fibers, Micro, Solids, SolidsBreakdown, Stabilizers, ToComposition},
    error::{Error, Result},
    util::collect_fields_copied_as,
    validate::{Validate, verify_are_positive, verify_is_100_percent},
};

#[cfg(doc)]
use crate::constants::{self, stabilization::STABILIZER_STRENGTH_LOCUST_BEAN_GUM};

/// Spec for stabilizer ingredients, e.g. gums, starches, gelatin, etc.
///
/// These ingredients are assumed to be 100% solids, and all the populated fields of [`Stabilizers`]
/// must add up to 100. If field [`Stabilizers::other`](field@Stabilizers::other) is populated, it
/// is counted as other solids non-fat non-sugar. All the other fields represent known stabilizer
/// components, e.g. starches, gelatin, gums, etc., and the specific breakdown of solids will be
/// reflected in the composition.
///
/// The [`strength`](Self::strength) field represents the relative strength of the stabilizer as a
/// percentage of a reference. If not populated it is automatically calculated from the known
/// stabilizer components. If [`Stabilizers::other`](field@Stabilizers::other) is populated, then
/// the [`strength`](Self::strength) field must be populated, since the strength of unspecified
/// stabilizers is unknown.
///
/// This "strength" is a very fuzzy concept, since "stabilization" is a broad term that encompasses
/// various properties, e.g. ice crystal suppression, viscosity, etc. and it's difficult to
/// precisely quantify the effectiveness of stabilizers. However, this allows for a rough scaling,
/// differentiating between weak and strong ingredients, for example between cornstarch and Locust
/// Bean Gum as stabilizers, the recommended usage levels of which differ greatly. See
/// [`constants::stabilization`] for more details on how the relative strength values are estimated,
/// and reference strength values of known stabilizer components.
///
/// As a synopsis, Locust Bean Gum is taken as the reference stabilizer with a strength of 100, with
/// a recommended dosage of ~2g/kg (Cree, 2017, Locust Bean Gum, p. 71)[^6]. Cornstarch, with a
/// recommended dosage of ~10g/kg, has a relative stabilizer strength of ~20 (Cree, 2017,
/// Cornstarch, p. 69)[^6]. Commercial blends, such as _"Louis Francois Stab 2000"_, usually cut the
/// active ingredients with fillers, so the relative strength of the ingredient as a whole is lower
/// than that of pure gums. With a manufacturer recommended dosage of ~3.5g/kg, "Louis Francois Stab
/// 2000" has a relative stabilizer strength of ~57.
#[doc = include_str!("../../docs/bibs/6.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct StabilizerSpec {
    /// Breakdown of the constituent stabilizer components of the ingredient
    ///
    /// These must add up to 100, and the ingredient is assumed to be 100% solids. If field
    /// [`Stabilizers::other`](field@Stabilizers::other) is populated, it is counted as other solids
    /// non-fat non-sugar, and the [`strength`](StabilizerSpec::strength) field must be provided.
    /// All the other fields represent known stabilizer components, e.g. starches, gelatin, gums,
    /// etc., and the specific breakdown of solids will be reflected in the composition.
    pub stabilizers: Stabilizers,
    /// Relative strength of the stabilizer as a percentage of a reference
    ///
    /// If not provided it is automatically calculated from the known stabilizer components. If
    /// field [`Stabilizers::other`](field@Stabilizers::other) is populated, then this field must be
    /// populated, since the strength of unspecified stabilizers is unknown. See
    /// [`constants::stabilization`] for reference strength values of known stabilizer components.
    pub strength: Option<f64>,
}

impl ToComposition for StabilizerSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Stabilizers {
            egg_yolk_solids,
            gelatin,
            cornstarch,
            tapioca_starch,
            other,
            ..
        } = self.stabilizers;

        verify_are_positive(&collect_fields_copied_as::<f64, _>(&self.stabilizers))?;
        verify_is_100_percent(self.stabilizers.total())?;
        verify_are_positive(&[self.strength.unwrap_or(0.0)])?;

        if self.stabilizers.other > 0.0 && self.strength.is_none() {
            return Err(Error::InvalidSpec(
                "Strength must be provided if 'other' stabilizers are specified".to_string(),
            ));
        }

        let proteins = gelatin;
        let starches = cornstarch + tapioca_starch;
        let other_snfs = other + egg_yolk_solids;
        let fiber = self.stabilizers.total() - proteins - starches - other_snfs;

        let solids = SolidsBreakdown::new()
            .proteins(proteins)
            .carbohydrates(Carbohydrates::new().others(starches).fiber(Fibers::new().other(fiber)))
            .others(other_snfs);

        let micro = Micro::new().stabilizers(self.stabilizers);
        let texture = self.stabilizers.to_texture(self.strength)?;

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

    pub(crate) const ING_SPEC_STABILIZER_LOCUST_BEAN_GUM_STR: &str = r#"{
      "name": "Locust Bean Gum",
      "category": "Stabilizer",
      "StabilizerSpec": {
        "stabilizers": {
          "locust_bean_gum": 100.0
        }
      }
    }"#;

    pub(crate) static ING_SPEC_STABILIZER_LOCUST_BEAN_GUM: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Locust Bean Gum".to_string(),
            category: Category::Stabilizer,
            spec: StabilizerSpec {
                stabilizers: Stabilizers::new().locust_bean_gum(100.0),
                strength: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_stabilizer_locust_bean_gum() {
        let comp = ING_SPEC_STABILIZER_LOCUST_BEAN_GUM.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::Fiber), 100.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 100.0);

        assert_eq!(comp.micro.stabilizers, Stabilizers::new().locust_bean_gum(100.0));
        assert_eq!(comp.texture.stabilization, 100.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_STABILIZERS: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![(ING_SPEC_STABILIZER_LOCUST_BEAN_GUM_STR, ING_SPEC_STABILIZER_LOCUST_BEAN_GUM.clone(), None)]
        });

    #[test]
    fn to_composition_err_on_negative_strength() {
        let neg_cases = [StabilizerSpec {
            stabilizers: Stabilizers::new().locust_bean_gum(100.0),
            strength: Some(-1.0),
        }];
        for spec in neg_cases {
            assert!(matches!(spec.to_composition(), Err(Error::CompositionNotPositive(_))));
        }
    }
}
