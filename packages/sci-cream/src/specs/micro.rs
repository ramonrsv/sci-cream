use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, IntoComposition, Micro, PAC, Solids, SolidsBreakdown},
    constants::{self},
    error::Result,
    validate::assert_are_positive,
};

/// Spec for ingredients with solely micro components, e.g. salt, emulsifiers, stabilizer, etc.
///
/// These ingredients are assumed to be 100% solids non-fat non-sugar (technically lecithin is a
/// lipid and therefore a subset of fats, but that is ignored here for simplicity's sake), with the
/// `(emulsifier)_strength` and `(stabilizer)_strength` fields representing their relative strengths
/// as a percentage of a reference.
///
/// This "strength" is a very fuzzy concept, since it's difficult to precisely quantify the
/// effectiveness of emulsifiers and stabilizers, and they often differ in their modes of action and
/// their effects have different properties than just a linear more or less stabilizing/emulsifying
/// effect. However, this allows for a rough scaling, differentiating between very weak and very
/// strong ingredients, for example between cornstarch and Locust Bean Gum as stabilizers, the
/// recommended usage levels of which differ by an order of magnitude.
///
/// Roughly, strong gums like Guar Gum, Locust Bean Gum, Lambda Carrageenan, etc. are taken as the
/// reference and have a stabilizer strength of 100, with a recommended dosage of ~1.5g/kg
/// (Raphaelson, 2016, Standard Base)[^5]. Cornstarch and similar have a stabilizer strength of ~15,
/// with a recommended dosage of ~10g/kg (Cree, 2017, Blank Slate Custard Ice Cream p. 115)[^6].
/// Commercial blends, such as _"Louis Francois Stab 2000"_, usually cut the active ingredients with
/// fillers, so the relative strength of the ingredient as a whole is lower than that of pure gums.
/// With a manufacturer recommended dosage of ~3.5g/kg, "Louis Francois Stab 2000" has a relative
/// stabilizer strength of ~40. Lecithin is taken as the reference emulsifier with a strength of
/// 100, with a recommended dosage of ~3.25g/kg (Raphaelson, 2016, Standard Base)[^5]. Something
/// like _"Louis Francois Stab 2000"_ has a similar recommended dosage for its emulsifier component,
/// so it also has a a relative emulsifier strength of 100.
#[doc = include_str!("../../docs/bibs/5.md")]
#[doc = include_str!("../../docs/bibs/6.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum MicroSpec {
    Salt,
    Lecithin,
    Stabilizer {
        strength: f64,
    },
    Emulsifier {
        strength: f64,
    },
    EmulsifierStabilizer {
        emulsifier_strength: f64,
        stabilizer_strength: f64,
    },
}

impl IntoComposition for MicroSpec {
    fn into_composition(self) -> Result<Composition> {
        let make_emulsifier_stabilizer_composition =
            |emulsifiers_strength: Option<f64>, stabilizers_strength: Option<f64>| -> Result<Composition> {
                let emulsifiers_strength = emulsifiers_strength.unwrap_or(0.0);
                let stabilizers_strength = stabilizers_strength.unwrap_or(0.0);

                assert_are_positive(&[emulsifiers_strength, stabilizers_strength])?;

                Ok(Composition::new()
                    .solids(Solids::new().other(SolidsBreakdown::new().others(100.0)))
                    .micro(
                        Micro::new()
                            .emulsifiers(emulsifiers_strength)
                            .stabilizers(stabilizers_strength),
                    ))
            };

        match self {
            MicroSpec::Salt => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().others(100.0)))
                .micro(Micro::new().salt(100.0))
                .pac(PAC::new().salt(constants::pac::SALT))),
            MicroSpec::Lecithin => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().others(100.0)))
                .micro(Micro::new().lecithin(100.0).emulsifiers(100.0))),
            MicroSpec::Stabilizer { strength } => make_emulsifier_stabilizer_composition(None, Some(strength)),
            MicroSpec::Emulsifier { strength } => make_emulsifier_stabilizer_composition(Some(strength), None),
            MicroSpec::EmulsifierStabilizer {
                emulsifier_strength,
                stabilizer_strength,
            } => make_emulsifier_stabilizer_composition(Some(emulsifier_strength), Some(stabilizer_strength)),
        }
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use super::*;
    use crate::{
        composition::CompKey,
        ingredient::Category,
        specs::{IngredientSpec, Spec},
    };
    pub(crate) const ING_SPEC_MICRO_SALT_STR: &str = r#"{
      "name": "Salt",
      "category": "Micro",
      "MicroSpec": "Salt"
    }"#;

    pub(crate) static ING_SPEC_MICRO_SALT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Salt".to_string(),
        category: Category::Micro,
        spec: Spec::MicroSpec(MicroSpec::Salt),
    });

    #[test]
    fn into_composition_micro_spec_salt() {
        let comp = MicroSpec::Salt.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Salt), 100.0);
        assert_eq!(comp.get(CompKey::PACslt), 585.0);
    }

    pub(crate) const ING_SPEC_MICRO_LECITHIN_STR: &str = r#"{
      "name": "Lecithin",
      "category": "Micro",
      "MicroSpec": "Lecithin"
    }"#;

    pub(crate) static ING_SPEC_MICRO_LECITHIN: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Lecithin".to_string(),
        category: Category::Micro,
        spec: Spec::MicroSpec(MicroSpec::Lecithin),
    });

    #[test]
    fn into_composition_micro_spec_lecithin() {
        let comp = MicroSpec::Lecithin.into_composition().unwrap();

        // @todo This should be 9.0 kcal/g since lecithin is a lipid
        assert_eq!(comp.get(CompKey::Energy), 0.0);

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 100.0);
        assert_eq!(comp.get(CompKey::Lecithin), 100.0);
    }

    pub(crate) const ING_SPEC_MICRO_STABILIZER_STR: &str = r#"{
      "name": "Rich Ice Cream SB",
      "category": "Micro",
      "MicroSpec": {
        "Stabilizer": {
        "strength": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_MICRO_STABILIZER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Rich Ice Cream SB".to_string(),
        category: Category::Micro,
        spec: Spec::MicroSpec(MicroSpec::Stabilizer { strength: 100.0 }),
    });

    #[test]
    fn into_composition_micro_spec_stabilizer_rich_ice_cream_sb() {
        let comp = ING_SPEC_MICRO_STABILIZER.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 100.0);
    }

    #[test]
    fn into_composition_micro_spec_stabilizer_not_100() {
        let comp = MicroSpec::Stabilizer { strength: 85.0 }.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 85.0);
    }

    #[test]
    fn into_composition_micro_spec_emulsifier_not_100() {
        let comp = MicroSpec::Emulsifier { strength: 60.0 }.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 60.0);
    }

    pub(crate) const ING_SPEC_MICRO_LOUIS_STAB2K_STR: &str = r#"{
      "name": "Louis Francois Stab 2000",
      "category": "Micro",
      "MicroSpec": {
        "EmulsifierStabilizer": {
          "emulsifier_strength": 100,
          "stabilizer_strength": 40
        }
      }
    }"#;

    pub(crate) static ING_SPEC_MICRO_LOUIS_STAB2K: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Louis Francois Stab 2000".to_string(),
        category: Category::Micro,
        spec: Spec::MicroSpec(MicroSpec::EmulsifierStabilizer {
            emulsifier_strength: 100.0,
            stabilizer_strength: 40.0,
        }),
    });

    #[test]
    fn into_composition_micro_spec_emulsifier_stabilizer_louis_francois_stab_2000() {
        let comp = ING_SPEC_MICRO_LOUIS_STAB2K.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 40.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_MICRO: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_MICRO_SALT_STR, ING_SPEC_MICRO_SALT.clone(), None),
                (ING_SPEC_MICRO_LECITHIN_STR, ING_SPEC_MICRO_LECITHIN.clone(), None),
                (ING_SPEC_MICRO_STABILIZER_STR, ING_SPEC_MICRO_STABILIZER.clone(), None),
                (ING_SPEC_MICRO_LOUIS_STAB2K_STR, ING_SPEC_MICRO_LOUIS_STAB2K.clone(), None),
            ]
        });
}
