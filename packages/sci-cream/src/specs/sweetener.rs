use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fibers, IntoComposition, PAC, ScaleComponents, Solids, SolidsBreakdown, Sweeteners,
    },
    constants::molar_mass::pac_from_molar_mass,
    error::{Error, Result},
    specs::units::{CompositionBasis, Scaling, Unit},
    validate::{assert_are_positive, assert_is_100_percent, assert_within_100_percent},
};

#[cfg(doc)]
use crate::composition::{ArtificialSweeteners, Polyols, Sugars};

/// Spec for sweeteners, with a specified [`Sweeteners`] composition and optional POD/PAC
///
/// If [`basis`](Self::basis) is [`ByDryWeight`](CompositionBasis::ByDryWeight), the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the dry weight (solids), its total plus [`fiber`](Self::fiber),
/// [`other_carbohydrates`](Self::other_carbohydrates), and [`other_solids`](Self::other_solids)
/// adding up to 100. For example, Invert Sugar might be
/// composed of `sugars.glucose = 42.5`, `sugars.fructose = 42.5`, and `sugars.sucrose = 15`, with
/// `ByDryWeight { solids: 80 }`, meaning that 85% of the sucrose was split into glucose/fructose,
/// with 15% sucrose remaining, and the syrup containing 20% water. If [`basis`](Self::basis) is
/// [`ByTotalWeight`](CompositionBasis::ByTotalWeight), then the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the total weight of the ingredient, their total plus `fiber`,`other_carbohydrates`, `other_solids`, and
/// `water` adding up to 100. For example, Honey might be composed of `sugars.glucose = 36`,
/// `sugars.fructose = 41`, `sugars.sucrose = 2`, and `other_solids = 1`, with `ByTotalWeight {
/// water = 20 }`.
///
/// [`fiber`](Self::fiber) are any dietary fibers that may be in or similar to sweetener products,
/// e.g. inulin or oligofructose. [`other_carbohydrates`](Self::other_carbohydrates) are any
/// carbohydrates other than mono- and disaccharides, e.g. maltodextrin and oligosaccharides found
/// in glucose/corn syrups. [`other_solids`](Self::other_solids) represents any non-sweetener
/// impurities that may be in the ingredient, e.g. minerals, pollen, etc., for example 1% in Honey.
/// This value should rarely be needed, and is assumed to be zero if not specified. This field is
/// also scaled depending on the chosen [`basis`](Self::basis).
///
/// If the POD or PAC values are not specified, then they are automatically calculated based on the
/// composition of known components, e.g. mono- and disaccharides, polyols, artificial sweeteners,
/// fibers, etg. If the PAC value is in [`Unit::MolarMass`], then it is calculated via
/// [`pac_from_molar_mass`]. If specified, POD and PAC values are scaled based on the [`Scaling`].
/// If [`OfWhole`](Scaling::OfWhole) then they are left as-is, since they are already for the
/// ingredient as a whole. If [`OfSolids`](Scaling::OfSolids), then they are scaled based on the dry
/// solids content. Note that this scaling is independent of the chosen [`basis`](Self::basis).
///
/// For automatic calculations [`fiber.other`](Fibers::other),
/// [`other_carbohydrates`](Self::other_carbohydrates), and [`other_solids`](Self::other_solids)
/// components are ignored, and it is an error if [`sugars.other`](Sugars::other),
/// [`polyols.other`](Polyols::other), or [`artificial.other`](ArtificialSweeteners::other) are
/// non-zero.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SweetenerSpec {
    pub sweeteners: Sweeteners,
    pub fiber: Option<Fibers>,
    pub other_carbohydrates: Option<f64>,
    pub other_solids: Option<f64>,
    #[serde(flatten)]
    pub basis: CompositionBasis,
    pub pod: Option<Scaling<f64>>,
    pub pac: Option<Scaling<Unit>>,
}

impl IntoComposition for SweetenerSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            sweeteners,
            fiber,
            other_carbohydrates,
            other_solids,
            basis,
            pod,
            pac,
        } = self;

        let fiber = fiber.unwrap_or_default();
        let other_carbohydrates = other_carbohydrates.unwrap_or(0.0);
        let other_solids = other_solids.unwrap_or(0.0);
        assert_are_positive(&[other_carbohydrates, other_solids])?;

        let mut factor = None;

        match basis {
            CompositionBasis::ByDryWeight { solids } => {
                assert_within_100_percent(sweeteners.total() + fiber.total() + other_carbohydrates + other_solids)?;
                assert_within_100_percent(solids)?;

                factor = Some(solids / 100.0);
            }
            CompositionBasis::ByTotalWeight { water } => {
                assert_is_100_percent(sweeteners.total() + fiber.total() + other_carbohydrates + other_solids + water)?;
            }
        }

        let (sweeteners, fiber, other_carbohydrates, other_solids) = if let Some(factor) = factor {
            (sweeteners.scale(factor), fiber.scale(factor), other_carbohydrates * factor, other_solids * factor)
        } else {
            (sweeteners, fiber, other_carbohydrates, other_solids)
        };

        let solids = SolidsBreakdown::new()
            .carbohydrates(
                Carbohydrates::new()
                    .fiber(fiber)
                    .sugars(sweeteners.sugars)
                    .polyols(sweeteners.polyols)
                    .others(other_carbohydrates),
            )
            .artificial_sweeteners(sweeteners.artificial)
            .others(other_solids);

        let pod = match pod {
            None => sweeteners.to_pod()? + fiber.to_pod()?,
            Some(scaling) => match scaling {
                Scaling::OfWhole(value) => value,
                Scaling::OfSolids(value) => value * (solids.total() / 100.0),
            },
        };

        let pac = match pac {
            None => sweeteners.to_pac()?,
            Some(scaling) => {
                let (unit, factor) = match scaling {
                    Scaling::OfWhole(unit) => (unit, 1.0),
                    Scaling::OfSolids(unit) => (unit, solids.total() / 100.0),
                };

                match unit {
                    Unit::Grams(grams) => grams * factor,
                    Unit::MolarMass(molar_mass) => pac_from_molar_mass(molar_mass) * factor,
                    _ => Err(Error::UnsupportedCompositionUnit(unit))?,
                }
            }
        };

        Ok(Composition::new()
            .energy(solids.energy()?)
            .solids(Solids::new().other(solids))
            .pod(pod)
            .pac(PAC::new().sugars(pac)))
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;
    use crate::tests::util::assert_comp_eq_percent;

    use super::*;
    use crate::{
        composition::{ArtificialSweeteners, CompKey, Polyols, Sugars},
        ingredients::Category,
        specs::{IngredientSpec, Spec},
    };

    fn clear_pod_in_spec(spec: &mut Spec) {
        if let Spec::SweetenerSpec(spec) = spec {
            spec.pod = None;
        } else {
            panic!("Expected SweetenerSpec");
        }
    }
    fn clear_pac_in_spec(spec: &mut Spec) {
        if let Spec::SweetenerSpec(spec) = spec {
            spec.pac = None;
        } else {
            panic!("Expected SweetenerSpec");
        }
    }

    pub(crate) const ING_SPEC_SWEETENER_SUCROSE_STR: &str = r#"{
      "name": "Sucrose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "sucrose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SUCROSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Sucrose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_SUCROSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(400.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(100.0))),
                ))
                .pod(100.0)
                .pac(PAC::new().sugars(100.0))
        });

    #[test]
    fn into_composition_sweetener_spec_sucrose() {
        let comp = ING_SPEC_SWEETENER_SUCROSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Sucrose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 100.0);
        assert_eq!(comp.get(CompKey::PACsgr), 100.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_DEXTROSE_STR: &str = r#"{
      "name": "Dextrose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 100
          }
        },
        "ByDryWeight": {
          "solids": 92
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_DEXTROSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Dextrose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 92.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_DEXTROSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(368.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(92.0))),
                ))
                .pod(73.6)
                .pac(PAC::new().sugars(174.8))
        });

    #[test]
    fn into_composition_sweetener_spec_dextrose() {
        let comp = ING_SPEC_SWEETENER_DEXTROSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 368.0);

        assert_eq!(comp.get(CompKey::Glucose), 92.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 92.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 92.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 92.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 92.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 73.6);
        assert_eq!(comp.get(CompKey::PACsgr), 174.8);
    }

    pub(crate) const ING_SPEC_SWEETENER_FRUCTOSE_STR: &str = r#"{
      "name": "Fructose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "fructose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_FRUCTOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Fructose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_FRUCTOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(400.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().fructose(100.0))),
            ))
            .pod(173.0)
            .pac(PAC::new().sugars(190.0))
    });

    #[test]
    fn into_composition_sweetener_spec_fructose() {
        let comp = ING_SPEC_SWEETENER_FRUCTOSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Fructose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 173.0);
        assert_eq!(comp.get(CompKey::PACsgr), 190.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_LACTOSE_STR: &str = r#"{
      "name": "Lactose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "lactose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_LACTOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Lactose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().lactose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_LACTOSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(400.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(100.0))),
                ))
                .pod(16.0)
                .pac(PAC::new().sugars(100.0))
        });

    #[test]
    fn into_composition_sweetener_spec_lactose() {
        let comp = ING_SPEC_SWEETENER_LACTOSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Lactose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 16.0);
        assert_eq!(comp.get(CompKey::PACsgr), 100.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_MALTOSE_STR: &str = r#"{
      "name": "Maltose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "maltose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_MALTOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Maltose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().maltose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_MALTOSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(400.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().maltose(100.0))),
                ))
                .pod(32.0)
                .pac(PAC::new().sugars(100.0))
        });

    #[test]
    fn into_composition_sweetener_spec_maltose() {
        let comp = ING_SPEC_SWEETENER_MALTOSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Maltose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 32.0);
        assert_eq!(comp.get(CompKey::PACsgr), 100.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_TREHALOSE_STR: &str = r#"{
      "name": "Trehalose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "trehalose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_TREHALOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Trehalose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().trehalose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_TREHALOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(400.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().trehalose(100.0))),
            ))
            .pod(45.0)
            .pac(PAC::new().sugars(100.0))
    });

    #[test]
    fn into_composition_sweetener_spec_trehalose() {
        let comp = ING_SPEC_SWEETENER_TREHALOSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Trehalose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 45.0);
        assert_eq!(comp.get(CompKey::PACsgr), 100.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_ERYTHRITOL_STR: &str = r#"{
      "name": "Erythritol",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "polyols": {
            "erythritol": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_ERYTHRITOL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Erythritol".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().polyols(Polyols::new().erythritol(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_ERYTHRITOL: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(0.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().polyols(Polyols::new().erythritol(100.0))),
            ))
            .pod(70.0)
            // @todo Should PAC for polyols be separate?
            .pac(PAC::new().sugars(280.0))
    });

    #[test]
    fn into_composition_sweetener_spec_erythritol() {
        let comp = ING_SPEC_SWEETENER_ERYTHRITOL.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);

        assert_eq!(comp.get(CompKey::Erythritol), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 0.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 100.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 70.0);
        assert_eq!(comp.get(CompKey::PACsgr), 280.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_INVERT_SUGAR_STR: &str = r#"{
      "name": "Invert Sugar",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 42.5,
            "fructose": 42.5,
            "sucrose": 15
          }
        },
        "ByDryWeight": {
          "solids": 80
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_INVERT_SUGAR: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Invert Sugar".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(42.5).fructose(42.5).sucrose(15.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 80.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_invert_sugar() {
        let comp = ING_SPEC_SWEETENER_INVERT_SUGAR.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 320.0);

        assert_eq!(comp.get(CompKey::Glucose), 34.0);
        assert_eq!(comp.get(CompKey::Fructose), 34.0);
        assert_eq!(comp.get(CompKey::Sucrose), 12.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 80.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 80.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 80.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 98.02);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 141.2);
    }

    pub(crate) const ING_SPEC_SWEETENER_HONEY_STR: &str = r#"{
      "name": "Honey",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 36,
            "fructose": 41,
            "sucrose": 2,
            "galactose": 1.5,
            "maltose": 1.5
          }
        },
        "other_solids": 1,
        "ByTotalWeight": {
          "water": 17
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HONEY: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Honey".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(
                Sugars::new()
                    .glucose(36.0)
                    .fructose(41.0)
                    .sucrose(2.0)
                    .galactose(1.5)
                    .maltose(1.5),
            ),
            fiber: None,
            other_carbohydrates: None,
            other_solids: Some(1.0),
            basis: CompositionBasis::ByTotalWeight { water: 17.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_honey() {
        let comp = ING_SPEC_SWEETENER_HONEY.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 328.0);

        assert_eq!(comp.get(CompKey::Glucose), 36.0);
        assert_eq!(comp.get(CompKey::Fructose), 41.0);
        assert_eq!(comp.get(CompKey::Sucrose), 2.0);
        assert_eq!(comp.get(CompKey::Galactose), 1.5);
        assert_eq!(comp.get(CompKey::Maltose), 1.5);
        assert_eq!(comp.get(CompKey::TotalSugars), 82.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 82.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 82.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 1.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 83.0);
        assert_eq!(comp.get(CompKey::POD), 103.185);
        assert_eq!(comp.get(CompKey::PACsgr), 152.65);
    }

    pub(crate) const ING_SPEC_SWEETENER_FANCY_MOLASSES_STR: &str = r#"{
      "name": "Fancy Molasses",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 12,
            "fructose": 12,
            "sucrose": 32
          }
        },
        "other_carbohydrates": 20,
        "other_solids": 4,
        "ByTotalWeight": {
          "water": 20
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_FANCY_MOLASSES: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Fancy Molasses".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(12.0).fructose(12.0).sucrose(32.0)),
            fiber: None,
            other_carbohydrates: Some(20.0),
            other_solids: Some(4.0),
            basis: CompositionBasis::ByTotalWeight { water: 20.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_FANCY_MOLASSES: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(304.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(
                            Carbohydrates::new()
                                .sugars(Sugars::new().glucose(12.0).fructose(12.0).sucrose(32.0))
                                .others(20.0),
                        )
                        .others(4.0),
                ),
            )
            .pod(62.36)
            .pac(PAC::new().sugars(77.6))
    });

    #[test]
    fn into_composition_sweetener_spec_fancy_molasses() {
        let comp = ING_SPEC_SWEETENER_FANCY_MOLASSES.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 304.0);

        assert_eq!(comp.get(CompKey::Glucose), 12.0);
        assert_eq!(comp.get(CompKey::Fructose), 12.0);
        assert_eq!(comp.get(CompKey::Sucrose), 32.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 56.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 56.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 76.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 24.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 80.0);
        assert_eq!(comp.get(CompKey::POD), 62.36);
        assert_eq!(comp.get(CompKey::PACsgr), 77.6);
    }

    pub(crate) const ING_SPEC_SWEETENER_HFCS42_STR: &str = r#"{
      "name": "HFCS 42",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "fructose": 42,
            "glucose": 53
          }
        },
        "other_carbohydrates": 5,
        "ByDryWeight": {
          "solids": 76
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HFCS42: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "HFCS 42".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(42.0).glucose(53.0)),
            fiber: None,
            other_carbohydrates: Some(5.0),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 76.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_hfcs42() {
        let comp = ING_SPEC_SWEETENER_HFCS42.spec.into_composition().unwrap();

        // @todo This is a bit higher than reference 281
        assert_eq!(comp.get(CompKey::Energy), 304.0);

        assert_eq!(comp.get(CompKey::Fructose), 31.92);
        assert_eq!(comp.get(CompKey::Glucose), 40.28);
        assert_eq!(comp.get(CompKey::TotalSugars), 72.2);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 72.2);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 76.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 3.8);
        assert_eq!(comp.get(CompKey::TotalSolids), 76.0);
        assert_eq!(comp.get(CompKey::POD), 87.4456);
        assert_eq!(comp.get(CompKey::PACsgr), 137.18);
    }

    pub(crate) const ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE_STR: &str = r#"{
      "name": "Maltodextrin 10 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 0.6,
            "maltose": 2.8
          }
        },
        "other_carbohydrates": 96.6,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 11
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 1800
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Maltodextrin 10 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(0.6).maltose(2.8)),
                fiber: None,
                other_carbohydrates: Some(96.6),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(11.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(1800.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_maltodextrin_10_de() {
        let comp = ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 380.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq!(comp.get(CompKey::Glucose), 0.57);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 2.66);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 3.23);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 3.23);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 91.77);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq!(comp.get(CompKey::POD), 10.45);
        assert_eq!(comp.get(CompKey::PACsgr), 18.05);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE_STR: &str = r#"{
      "name": "Glucose Syrup 42 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 19,
            "maltose": 14
          }
        },
        "other_carbohydrates": 67,
        "ByDryWeight": {
          "solids": 80
        },
        "pod": {
          "OfSolids": 50
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 429
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Syrup 42 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(19.0).maltose(14.0)),
                fiber: None,
                other_carbohydrates: Some(67.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 80.0 },
                pod: Some(Scaling::OfSolids(50.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(429.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_glucose_syrup_42_de() {
        let comp = ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE.spec.into_composition().unwrap();

        // @todo This is significantly higher than reference 280
        assert_eq!(comp.get(CompKey::Energy), 320.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 15.2);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 11.2);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 26.4);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 26.4);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 53.6);
        assert_eq!(comp.get(CompKey::TotalSolids), 80.0);
        assert_eq!(comp.get(CompKey::POD), 40.0);
        assert_eq!(comp.get(CompKey::PACsgr), 63.2);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE_STR: &str = r#"{
      "name": "Glucose Powder 25 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 2,
            "maltose": 10
          }
        },
        "other_carbohydrates": 88,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 28
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 720
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Powder 25 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(2.0).maltose(10.0)),
                fiber: None,
                other_carbohydrates: Some(88.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(28.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(720.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_glucose_powder_25_de() {
        let comp = ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 380.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 1.9);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 9.5);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 11.4);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 11.4);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 83.6);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 26.6);
        assert_eq!(comp.get(CompKey::PACsgr), 44.65);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE_STR: &str = r#"{
      "name": "Glucose Powder 42 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 19,
            "maltose": 14
          }
        },
        "other_carbohydrates": 67,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 50
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 429
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Powder 42 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(19.0).maltose(14.0)),
                fiber: None,
                other_carbohydrates: Some(67.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(50.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(429.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_glucose_powder_42_de() {
        let comp = ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 380.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 18.05);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 13.3);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 31.35);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 31.35);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 63.65);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq!(comp.get(CompKey::POD), 47.5);
        assert_eq!(comp.get(CompKey::PACsgr), 75.05);
    }

    pub(crate) const ING_SPEC_SWEETENER_INULIN_POWDER_STR: &str = r#"{
      "name": "Inulin Powder",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 3,
            "fructose": 3,
            "sucrose": 3
          }
        },
        "fiber": {
          "inulin": 91
        },
        "ByDryWeight": {
          "solids": 98
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_INULIN_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Inulin Powder".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(3.0).fructose(3.0).sucrose(3.0)),
            fiber: Some(Fibers::new().inulin(91.0)),
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 98.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_INULIN_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(169.05)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(
                        Carbohydrates::new()
                            .fiber(Fibers::new().inulin(89.18))
                            .sugars(Sugars::new().glucose(2.94).fructose(2.94).sucrose(2.94)),
                    ),
                ),
            )
            .pod(10.3782)
            .pac(PAC::new().sugars(14.112))
    });

    #[test]
    fn into_composition_sweetener_spec_inulin_powder() {
        let comp = ING_SPEC_SWEETENER_INULIN_POWDER.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 169.05);

        assert_eq!(comp.get(CompKey::Glucose), 2.94);
        assert_eq!(comp.get(CompKey::Fructose), 2.94);
        assert_eq!(comp.get(CompKey::Sucrose), 2.94);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 89.18);
        assert_eq!(comp.get(CompKey::TotalSugars), 8.82);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 8.82);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 98.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 89.18);
        assert_eq!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq!(comp.get(CompKey::POD), 10.3782);
        assert_eq!(comp.get(CompKey::PACsgr), 14.112);
    }

    pub(crate) const ING_SPEC_SWEETENER_HP_INULIN_POWDER_STR: &str = r#"{
      "name": "HP Inulin Powder",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {},
        "fiber": {
          "inulin": 100
        },
        "ByDryWeight": {
          "solids": 98
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HP_INULIN_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "HP Inulin Powder".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new(),
                fiber: Some(Fibers::new().inulin(100.0)),
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 98.0 },
                pod: None,
                pac: None,
            }),
        });

    pub(crate) static COMP_HP_INULIN_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new().energy(147.0).solids(
            Solids::new()
                .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().fiber(Fibers::new().inulin(98.0)))),
        )
    });

    #[test]
    fn into_composition_sweetener_spec_hp_inulin_powder() {
        let comp = ING_SPEC_SWEETENER_HP_INULIN_POWDER.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 147.0);

        assert_eq_flt_test!(comp.get(CompKey::Fiber), 98.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 0.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 98.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 98.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACsgr), 0.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER_STR: &str = r#"{
      "name": "Oligofructose Powder",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 1.67,
            "fructose": 1.67,
            "sucrose": 1.66
          }
        },
        "fiber": {
          "oligofructose": 95
        },
        "ByDryWeight": {
          "solids": 98
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Oligofructose Powder".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(1.67).fructose(1.67).sucrose(1.66)),
                fiber: Some(Fibers::new().oligofructose(95.0)),
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 98.0 },
                pod: None,
                pac: None,
            }),
        });

    pub(crate) static COMP_OLIGOFRUCTOSE_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(159.25)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(
                        Carbohydrates::new()
                            .fiber(Fibers::new().oligofructose(93.1))
                            .sugars(Sugars::new().glucose(1.6366).fructose(1.6366).sucrose(1.6268)),
                    ),
                ),
            )
            .pod(43.0074)
            .pac(PAC::new().sugars(7.8459))
    });

    #[test]
    fn into_composition_sweetener_spec_oligofructose_powder() {
        let comp = ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 159.25);

        assert_eq_flt_test!(comp.get(CompKey::Glucose), 1.6366);
        assert_eq_flt_test!(comp.get(CompKey::Fructose), 1.6366);
        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 1.6268);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 93.1);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 4.9);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 4.9);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 98.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 93.1);
        assert_eq!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 43.0074);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 7.8459);
    }

    pub(crate) const ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE_STR: &str = r#"{
      "name": "Splenda (Sucralose)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 55.0
          },
          "artificial": {
            "sucralose": 1.32
          }
        },
        "other_carbohydrates": 38.68,
        "ByTotalWeight": {
          "water": 5
        },
        "pod": {
          "OfWhole": 840
        },
        "pac": {
          "OfWhole": {
            "grams": 112.6
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Splenda (Sucralose)".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .sugars(Sugars::new().glucose(55.0))
                    .artificial(ArtificialSweeteners::new().sucralose(1.32)),
                fiber: None,
                other_carbohydrates: Some(38.68),
                other_solids: None,
                basis: CompositionBasis::ByTotalWeight { water: 5.0 },
                pod: Some(Scaling::OfWhole(840.0)),
                pac: Some(Scaling::OfWhole(Unit::Grams(112.6))),
            }),
        });

    pub(crate) static COMP_SPLENDA_SUCRALOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(374.72)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(55.0)).others(38.68))
                        .artificial_sweeteners(ArtificialSweeteners::new().sucralose(1.32)),
                ),
            )
            .pod(840.0)
            .pac(PAC::new().sugars(112.6))
    });

    #[test]
    fn into_composition_sweetener_spec_splenda_sucralose() {
        let comp = ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 374.72);

        assert_eq!(comp.get(CompKey::Glucose), 55.0);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 55.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 1.32);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 56.32);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 93.68);
        assert_eq!(comp.get(CompKey::TotalSNFS), 40.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 840.0);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 112.6);
    }

    #[test]
    fn into_composition_sweetener_spec_splenda_sucralose_manual_vs_calculated_pod_and_pac() {
        let manual_pod_pac_spec = ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE.spec;
        let mut auto_pod_pac_spec = manual_pod_pac_spec;
        clear_pod_in_spec(&mut auto_pod_pac_spec);
        clear_pac_in_spec(&mut auto_pod_pac_spec);

        let comp_auto_pod_pac = auto_pod_pac_spec.into_composition().unwrap();
        let comp_manual_pod_pac = manual_pod_pac_spec.into_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod_pac, &comp_manual_pod_pac, CompKey::POD, 0.75);
        assert_comp_eq_percent(&comp_auto_pod_pac, &comp_manual_pod_pac, CompKey::PACsgr, 6.6);
    }

    pub(crate) const ING_SPEC_SWEETENER_SPLENDA_STEVIA_STR: &str = r#"{
      "name": "Splenda (Stevia)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "polyols": {
            "erythritol": 99.9
          },
          "artificial": {
            "steviosides": 0.1
          }
        },
        "ByDryWeight": {
          "solids": 100
        },
        "pod": {
          "OfWhole": 200
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SPLENDA_STEVIA: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Splenda (Stevia)".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new()
                .polyols(Polyols::new().erythritol(99.9))
                .artificial(ArtificialSweeteners::new().steviosides(0.1)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: Some(Scaling::OfWhole(200.0)),
            pac: None,
        }),
    });

    pub(crate) static COMP_SPLENDA_STEVIA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(0.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().polyols(Polyols::new().erythritol(99.9)))
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(0.1)),
                ),
            )
            .pod(200.0)
            .pac(PAC::new().sugars(279.72))
    });

    #[test]
    fn into_composition_sweetener_spec_splenda_stevia() {
        let comp = ING_SPEC_SWEETENER_SPLENDA_STEVIA.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 0.0);

        assert_eq_flt_test!(comp.get(CompKey::Fiber), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 0.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 99.9);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.1);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 99.9);
        assert_eq!(comp.get(CompKey::TotalSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 200.0);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 279.72);
    }

    pub(crate) const ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT_STR: &str = r#"{
      "name": "Splenda (Monk Fruit)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "polyols": {
            "erythritol": 99.9
          },
          "artificial": {
            "mogrosides": 0.1
          }
        },
        "ByDryWeight": {
          "solids": 100
        },
        "pod": {
          "OfWhole": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Splenda (Monk Fruit)".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .polyols(Polyols::new().erythritol(99.9))
                    .artificial(ArtificialSweeteners::new().mogrosides(0.1)),
                fiber: None,
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 100.0 },
                pod: Some(Scaling::OfWhole(100.0)),
                pac: None,
            }),
        });

    pub(crate) static COMP_SPLENDA_MONK_FRUIT: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(0.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().polyols(Polyols::new().erythritol(99.9)))
                        .artificial_sweeteners(ArtificialSweeteners::new().mogrosides(0.1)),
                ),
            )
            .pod(100.0)
            .pac(PAC::new().sugars(279.72))
    });

    #[test]
    fn into_composition_sweetener_spec_splenda_monk_fruit() {
        let comp = ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 0.0);

        assert_eq_flt_test!(comp.get(CompKey::Fiber), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 0.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 99.9);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.1);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 99.9);
        assert_eq!(comp.get(CompKey::TotalSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 100.0);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 279.72);
    }

    pub(crate) const ING_SPEC_SWEETENER_SWEETLEAF_STEVIA_STR: &str = r#"{
      "name": "SweetLeaf Stevia",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 2,
            "fructose": 2,
            "sucrose": 2
         },
          "artificial": {
            "steviosides": 5
          }
        },
        "fiber": { "inulin": 89 },
        "ByDryWeight": {
          "solids": 98
        },
        "pod": {
          "OfWhole": 1050
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SWEETLEAF_STEVIA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "SweetLeaf Stevia".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .sugars(Sugars::new().glucose(2.0).fructose(2.0).sucrose(2.0))
                    .artificial(ArtificialSweeteners::new().steviosides(5.0)),
                fiber: Some(Fibers::new().inulin(89.0)),
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 98.0 },
                pod: Some(Scaling::OfWhole(1050.0)),
                pac: None,
            }),
        });

    pub(crate) static COMP_SWEETLEAF_STEVIA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(154.35)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().inulin(87.22))
                                .sugars(Sugars::new().glucose(1.96).fructose(1.96).sucrose(1.96)),
                        )
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(4.9)),
                ),
            )
            .pod(1050.0)
            .pac(PAC::new().sugars(9.408))
    });

    #[test]
    fn into_composition_sweetener_spec_sweetleaf_stevia() {
        let comp = ING_SPEC_SWEETENER_SWEETLEAF_STEVIA.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 154.35);

        assert_eq!(comp.get(CompKey::Glucose), 1.96);
        assert_eq!(comp.get(CompKey::Fructose), 1.96);
        assert_eq!(comp.get(CompKey::Sucrose), 1.96);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 87.22);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 5.88);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 4.9);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 10.78);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 93.1);
        assert_eq!(comp.get(CompKey::TotalSNFS), 92.12);
        assert_eq!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1050.0);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 9.408);
    }

    pub(crate) const ING_SPEC_SWEETENER_SUGAR_TWIN_STR: &str = r#"{
      "name": "Sugar Twin",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 61
          },
          "artificial": {
            "cyclamate": 33
          }
        },
        "ByTotalWeight": {
          "water": 6
        },
        "pod": {
          "OfWhole": 1050
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SUGAR_TWIN: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Sugar Twin".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new()
                .sugars(Sugars::new().glucose(61.0))
                .artificial(ArtificialSweeteners::new().cyclamate(33.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByTotalWeight { water: 6.0 },
            pod: Some(Scaling::OfWhole(1050.0)),
            pac: None,
        }),
    });

    pub(crate) static COMP_SUGAR_TWIN: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(244.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(61.0)))
                        .artificial_sweeteners(ArtificialSweeteners::new().cyclamate(33.0)),
                ),
            )
            .pod(1050.0)
            .pac(PAC::new().sugars(172.0))
    });

    #[test]
    fn into_composition_sweetener_spec_sugar_twin() {
        let comp = ING_SPEC_SWEETENER_SUGAR_TWIN.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 244.0);

        assert_eq!(comp.get(CompKey::Glucose), 61.0);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 61.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 33.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 94.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 61.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 33.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 94.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1050.0);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 172.0);
    }

    #[test]
    fn into_composition_sweetener_spec_sugar_twin_manual_vs_calculated_pod() {
        let manual_pod_spec = ING_SPEC_SWEETENER_SUGAR_TWIN.spec;
        let mut auto_pod_spec = manual_pod_spec;
        clear_pod_in_spec(&mut auto_pod_spec);

        let comp_auto_pod = auto_pod_spec.into_composition().unwrap();
        let comp_manual_pod = manual_pod_spec.into_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod, &comp_manual_pod, CompKey::POD, 1.1);
    }

    pub(crate) const ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS_STR: &str = r#"{
      "name": "Stevia In The Raw (Packets)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 89.0
          },
          "artificial": {
            "steviosides": 3.4
          }
        },
        "ByTotalWeight": {
          "water": 7.6
        },
        "pod": {
          "OfWhole": 840
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Stevia In The Raw (Packets)".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .sugars(Sugars::new().glucose(89.0))
                    .artificial(ArtificialSweeteners::new().steviosides(3.4)),
                fiber: None,
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByTotalWeight { water: 7.6 },
                pod: Some(Scaling::OfWhole(840.0)),
                pac: None,
            }),
        });

    pub(crate) static COMP_STEVIA_IN_THE_RAW_PACKETS: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(356.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(89.0)))
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(3.4)),
                ),
            )
            .pod(840.0)
            .pac(PAC::new().sugars(169.1))
    });

    #[test]
    fn into_composition_sweetener_spec_stevia_in_the_raw_packets() {
        let comp = ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS
            .spec
            .into_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 356.0);

        assert_eq!(comp.get(CompKey::Glucose), 89.0);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 89.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 3.4);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 92.4);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 89.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 3.4);
        assert_eq!(comp.get(CompKey::TotalSolids), 92.4);
        assert_eq_flt_test!(comp.get(CompKey::POD), 840.0);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 169.1);
    }

    #[test]
    fn into_composition_sweetener_spec_stevia_in_the_raw_packets_manual_vs_calculated_pod() {
        let manual_pod_spec = ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS.spec;
        let mut auto_pod_spec = manual_pod_spec;
        clear_pod_in_spec(&mut auto_pod_spec);

        let comp_auto_pod = auto_pod_spec.into_composition().unwrap();
        let comp_manual_pod = manual_pod_spec.into_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod, &comp_manual_pod, CompKey::POD, 0.5);
    }

    pub(crate) const ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG_STR: &str = r#"{
      "name": "Stevia In The Raw (Bakers Bag)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "artificial": {
            "steviosides": 3.45
          }
        },
        "other_carbohydrates": 91.55,
        "ByTotalWeight": {
          "water": 5
        },
        "pod": {
          "OfWhole": 775
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 1800
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Stevia In The Raw (Bakers Bag)".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().artificial(ArtificialSweeteners::new().steviosides(3.45)),
                fiber: None,
                other_carbohydrates: Some(91.55),
                other_solids: None,
                basis: CompositionBasis::ByTotalWeight { water: 5.0 },
                pod: Some(Scaling::OfWhole(775.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(1800.0))),
            }),
        });

    pub(crate) static COMP_STEVIA_IN_THE_RAW_BAKERS_BAG: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(366.2)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().others(91.55))
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(3.45)),
                ),
            )
            .pod(775.0)
            .pac(PAC::new().sugars(18.05))
    });

    #[test]
    fn into_composition_sweetener_spec_stevia_in_the_raw_bakers_bag() {
        let comp = ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG
            .spec
            .into_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 366.2);

        assert_eq_flt_test!(comp.get(CompKey::Fiber), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 0.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 3.45);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 3.45);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 91.55);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 95.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 775.0);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 18.05);
    }

    #[test]
    fn into_composition_sweetener_spec_stevia_in_the_raw_bakers_bag_manual_vs_calculated_pod() {
        let manual_pod_spec = ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG.spec;
        let mut auto_pod_spec = manual_pod_spec;
        clear_pod_in_spec(&mut auto_pod_spec);

        let comp_auto_pod = auto_pod_spec.into_composition().unwrap();
        let comp_manual_pod = manual_pod_spec.into_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod, &comp_manual_pod, CompKey::POD, 0.2);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_SWEETENER: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_SWEETENER_SUCROSE_STR, ING_SPEC_SWEETENER_SUCROSE.clone(), Some(*COMP_SUCROSE)),
                (ING_SPEC_SWEETENER_DEXTROSE_STR, ING_SPEC_SWEETENER_DEXTROSE.clone(), Some(*COMP_DEXTROSE)),
                (ING_SPEC_SWEETENER_FRUCTOSE_STR, ING_SPEC_SWEETENER_FRUCTOSE.clone(), Some(*COMP_FRUCTOSE)),
                (ING_SPEC_SWEETENER_LACTOSE_STR, ING_SPEC_SWEETENER_LACTOSE.clone(), Some(*COMP_LACTOSE)),
                (ING_SPEC_SWEETENER_MALTOSE_STR, ING_SPEC_SWEETENER_MALTOSE.clone(), Some(*COMP_MALTOSE)),
                (ING_SPEC_SWEETENER_TREHALOSE_STR, ING_SPEC_SWEETENER_TREHALOSE.clone(), Some(*COMP_TREHALOSE)),
                (ING_SPEC_SWEETENER_ERYTHRITOL_STR, ING_SPEC_SWEETENER_ERYTHRITOL.clone(), Some(*COMP_ERYTHRITOL)),
                (ING_SPEC_SWEETENER_INVERT_SUGAR_STR, ING_SPEC_SWEETENER_INVERT_SUGAR.clone(), None),
                (ING_SPEC_SWEETENER_HONEY_STR, ING_SPEC_SWEETENER_HONEY.clone(), None),
                (
                    ING_SPEC_SWEETENER_FANCY_MOLASSES_STR,
                    ING_SPEC_SWEETENER_FANCY_MOLASSES.clone(),
                    Some(*COMP_FANCY_MOLASSES),
                ),
                (ING_SPEC_SWEETENER_HFCS42_STR, ING_SPEC_SWEETENER_HFCS42.clone(), None),
                (ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE_STR, ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE.clone(), None),
                (ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE.clone(), None),
                (ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE.clone(), None),
                (ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE.clone(), None),
                (
                    ING_SPEC_SWEETENER_INULIN_POWDER_STR,
                    ING_SPEC_SWEETENER_INULIN_POWDER.clone(),
                    Some(*COMP_INULIN_POWDER),
                ),
                (
                    ING_SPEC_SWEETENER_HP_INULIN_POWDER_STR,
                    ING_SPEC_SWEETENER_HP_INULIN_POWDER.clone(),
                    Some(*COMP_HP_INULIN_POWDER),
                ),
                (
                    ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER_STR,
                    ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER.clone(),
                    Some(*COMP_OLIGOFRUCTOSE_POWDER),
                ),
                (
                    ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE_STR,
                    ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE.clone(),
                    Some(*COMP_SPLENDA_SUCRALOSE),
                ),
                (
                    ING_SPEC_SWEETENER_SPLENDA_STEVIA_STR,
                    ING_SPEC_SWEETENER_SPLENDA_STEVIA.clone(),
                    Some(*COMP_SPLENDA_STEVIA),
                ),
                (
                    ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT_STR,
                    ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT.clone(),
                    Some(*COMP_SPLENDA_MONK_FRUIT),
                ),
                (
                    ING_SPEC_SWEETENER_SWEETLEAF_STEVIA_STR,
                    ING_SPEC_SWEETENER_SWEETLEAF_STEVIA.clone(),
                    Some(*COMP_SWEETLEAF_STEVIA),
                ),
                (ING_SPEC_SWEETENER_SUGAR_TWIN_STR, ING_SPEC_SWEETENER_SUGAR_TWIN.clone(), Some(*COMP_SUGAR_TWIN)),
                (
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS_STR,
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS.clone(),
                    Some(*COMP_STEVIA_IN_THE_RAW_PACKETS),
                ),
                (
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG_STR,
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG.clone(),
                    Some(*COMP_STEVIA_IN_THE_RAW_BAKERS_BAG),
                ),
            ]
        });
}
