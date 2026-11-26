//! [`FullSpec`] and associated implementations, for ingredients with a full composition specified.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Alcohol, Composition, Micro, PAC, Solids, ToComposition},
    constants::{self},
    error::Result,
    validate::Validate,
};

/// Spec for ingredients with a full composition specified
///
/// This is the most flexible spec, allowing the user to specify all relevant fields of the
/// composition directly. However, it requires that the user know and provide all relevant values,
/// which can be an involved and challenging process for some ingredients, making it very cumbersome
/// and error-prone to use. It is recommended to use the more specified specs where possible.
///
/// We could just use [`Composition`] directly, but having a separate [`FullSpec`] allows some
/// flexibility to make the specification format more user friendly, and somewhat decouples it
/// from the internal implementation of [`Composition`].
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FullSpec {
    /// Energy of the ingredient as a whole, in kcal per 100 g.
    ///
    /// If not provided, it will be internally calculated from the composition of the solids and
    /// the alcohol content, using the energy factors in [`constants::energy`].
    #[serde(skip_serializing_if = "Option::is_none")]
    pub energy: Option<f64>,
    /// Detailed specification of the solids and their breakdown into subcategories
    pub solids: Option<Solids>,
    /// Specification of the micro ingredients or components, like salt, emulsifiers, etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub micro: Option<Micro>,
    /// Alcohol by volume (ABV) (2025)[^8] of the ingredient as a whole.
    #[doc= include_str!("../../docs/references/index/8.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub abv: Option<f64>,
    /// [Potere Dolcificante (POD)](crate::docs#pod) of the ingredient as a whole.
    ///
    /// If not provided, it will be internally calculated from the composition of the solids and
    /// known POD values of the underlying components, e.g. carbohydrates and artificial sweeteners.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pod: Option<f64>,
    /// [Potere Anti-Congelante (PAC)](crate::docs#pac) of the ingredient as a whole.
    ///
    /// If not provided, it will be internally calculated from the composition of the solids, the
    /// micro components, the alcohol content, and known PAC values of the underlying components.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pac: Option<PAC>,
}

impl ToComposition for FullSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            energy,
            solids,
            micro,
            abv,
            pod,
            pac,
        } = *self;

        let (solids, micro) = (solids.unwrap_or_default(), micro.unwrap_or_default());
        let alcohol = abv.map_or_else(Alcohol::default, Alcohol::from_abv);

        let calculate_energy = || Ok(solids.all().energy()? + alcohol.energy());
        let calculate_pod = || Ok(solids.all().carbohydrates.to_pod()? + solids.all().artificial_sweeteners.to_pod()?);
        let calculate_pac = || {
            Ok(PAC::new()
                .sugars(solids.all().carbohydrates.to_pac()? + solids.all().artificial_sweeteners.to_pac()?)
                .alcohol(alcohol.to_pac())
                .salt(micro.salt * constants::pac::SALT / 100.0)
                .msnf_ws_salts(solids.milk.snf() * constants::pac::MSNF_WS_SALTS / 100.0))
        };

        let energy = energy.map_or_else(calculate_energy, Ok)?;
        let pod = pod.map_or_else(calculate_pod, Ok)?;
        let pac = pac.map_or_else(calculate_pac, Ok)?;

        Composition::new()
            .energy(energy)
            .solids(solids)
            .micro(micro)
            .alcohol(alcohol)
            .pod(pod)
            .pac(pac)
            .validate_into()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use crate::tests::{assets::asset_composition, util::AssertKeys};

    use super::*;
    use crate::{
        composition::{ArtificialSweeteners, Carbohydrates, CompKey, Fats, Solids, SolidsBreakdown, Sugars},
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
    };

    pub(crate) const ING_SPEC_FULL_WATER_STR: &str = r#"{
      "name": "Water",
      "category": "Miscellaneous",
      "FullSpec": {}
    }"#;

    pub(crate) static ING_SPEC_FULL_WATER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Water".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: None,
            solids: None,
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_water() {
        let comp = asset_composition(&ING_SPEC_FULL_WATER);

        comp.assert_all_keys(&[(CompKey::Water, 100.0)]);
    }

    // https://fdc.nal.usda.gov/food-details/2710180/nutrients
    pub(crate) const ING_SPEC_FULL_VEGETABLE_OIL_STR: &str = r#"{
      "name": "Vegetable Oil",
      "category": "Miscellaneous",
      "FullSpec": {
        "solids": { "other": { "fats": { "total": 100, "saturated": 13.4 } } }
      }
    }"#;

    pub(crate) static ING_SPEC_FULL_VEGETABLE_OIL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Vegetable Oil".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: None,
            solids: Some(Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(100.0).saturated(13.4)))),
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_vegetable_oil() {
        let comp = asset_composition(&ING_SPEC_FULL_VEGETABLE_OIL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 900.0),
            (CompKey::OtherFats, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 100.0),
            (CompKey::SaturatedFat, 13.4),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/172336/nutrients
    pub(crate) const ING_SPEC_FULL_CANOLA_OIL_STR: &str = r#"{
      "name": "Canola Oil",
      "category": "Miscellaneous",
      "FullSpec": {
        "energy": 884,
        "solids": { "other": { "fats": { "total": 100, "saturated": 7.36, "trans": 0.395 } } }
      }
    }"#;

    pub(crate) static ING_SPEC_FULL_CANOLA_OIL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Canola Oil".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: Some(884.0),
            solids: Some(
                Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(100.0).saturated(7.36).trans(0.395))),
            ),
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_canola_oil() {
        let comp = asset_composition(&ING_SPEC_FULL_CANOLA_OIL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 884.0),
            (CompKey::OtherFats, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 100.0),
            (CompKey::SaturatedFat, 7.36),
            (CompKey::TransFat, 0.395),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/171412/nutrients
    pub(crate) const ING_SPEC_FULL_COCONUT_OIL_STR: &str = r#"{
      "name": "Coconut Oil",
      "category": "Miscellaneous",
      "FullSpec": {
        "energy": 892,
        "solids": { "other": { "fats": { "total": 99.1, "saturated": 82.5, "trans": 0.028 } } }
      }
    }"#;

    pub(crate) static ING_SPEC_FULL_COCONUT_OIL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Coconut Oil".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: Some(892.0),
            solids: Some(
                Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(99.1).saturated(82.5).trans(0.028))),
            ),
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_coconut_oil() {
        let comp = asset_composition(&ING_SPEC_FULL_COCONUT_OIL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 892.0),
            (CompKey::OtherFats, 99.1),
            (CompKey::TotalSolids, 99.1),
            (CompKey::TotalFats, 99.1),
            (CompKey::Water, 0.9),
            (CompKey::SaturatedFat, 82.5),
            (CompKey::TransFat, 0.028),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/171413/nutrients
    pub(crate) const ING_SPEC_FULL_OLIVE_OIL_STR: &str = r#"{
      "name": "Olive Oil",
      "category": "Miscellaneous",
      "FullSpec": {
        "energy": 884,
        "solids": { "other": { "fats": { "total": 100, "saturated": 13.8 } } }
      }
    }"#;

    pub(crate) static ING_SPEC_FULL_OLIVE_OIL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Olive Oil".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: Some(884.0),
            solids: Some(Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(100.0).saturated(13.8)))),
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_olive_oil() {
        let comp = asset_composition(&ING_SPEC_FULL_OLIVE_OIL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 884.0),
            (CompKey::OtherFats, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 100.0),
            (CompKey::SaturatedFat, 13.8),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/171015/nutrients
    pub(crate) const ING_SPEC_FULL_PALM_OIL_STR: &str = r#"{
      "name": "Palm Oil",
      "category": "Miscellaneous",
      "FullSpec": {
        "energy": 884,
        "solids": { "other": { "fats": { "total": 100, "saturated": 49.3 } } }
      }
    }"#;

    pub(crate) static ING_SPEC_FULL_PALM_OIL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Palm Oil".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: Some(884.0),
            solids: Some(Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(100.0).saturated(49.3)))),
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_palm_oil() {
        let comp = asset_composition(&ING_SPEC_FULL_PALM_OIL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 884.0),
            (CompKey::OtherFats, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 100.0),
            (CompKey::SaturatedFat, 49.3),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/172370/nutrients
    pub(crate) const ING_SPEC_FULL_SOYBEAN_OIL_STR: &str = r#"{
      "name": "Soybean Oil",
      "category": "Miscellaneous",
      "FullSpec": {
        "energy": 884,
        "solids": { "other": { "fats": { "total": 100, "saturated": 15.3, "trans": 0.678 } } }
      }
    }"#;

    pub(crate) static ING_SPEC_FULL_SOYBEAN_OIL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Soybean Oil".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: Some(884.0),
            solids: Some(
                Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(100.0).saturated(15.3).trans(0.678))),
            ),
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_soybean_oil() {
        let comp = asset_composition(&ING_SPEC_FULL_SOYBEAN_OIL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 884.0),
            (CompKey::OtherFats, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 100.0),
            (CompKey::SaturatedFat, 15.3),
            (CompKey::TransFat, 0.678),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/172357/nutrients
    pub(crate) const ING_SPEC_FULL_SUNFLOWER_OIL_STR: &str = r#"{
      "name": "Sunflower Oil",
      "category": "Miscellaneous",
      "FullSpec": {
        "energy": 884,
        "solids": { "other": { "fats": { "total": 100, "saturated": 9.01, "trans": 0.219 } } }
      }
    }"#;

    pub(crate) static ING_SPEC_FULL_SUNFLOWER_OIL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Sunflower Oil".to_string(),
        category: Category::Miscellaneous,
        spec: FullSpec {
            energy: Some(884.0),
            solids: Some(
                Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(100.0).saturated(9.01).trans(0.219))),
            ),
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_full_spec_sunflower_oil() {
        let comp = asset_composition(&ING_SPEC_FULL_SUNFLOWER_OIL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 884.0),
            (CompKey::OtherFats, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 100.0),
            (CompKey::SaturatedFat, 9.01),
            (CompKey::TransFat, 0.219),
        ]);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_FULL: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_FULL_WATER_STR, ING_SPEC_FULL_WATER.clone(), None),
                (ING_SPEC_FULL_VEGETABLE_OIL_STR, ING_SPEC_FULL_VEGETABLE_OIL.clone(), None),
                (ING_SPEC_FULL_CANOLA_OIL_STR, ING_SPEC_FULL_CANOLA_OIL.clone(), None),
                (ING_SPEC_FULL_COCONUT_OIL_STR, ING_SPEC_FULL_COCONUT_OIL.clone(), None),
                (ING_SPEC_FULL_OLIVE_OIL_STR, ING_SPEC_FULL_OLIVE_OIL.clone(), None),
                (ING_SPEC_FULL_PALM_OIL_STR, ING_SPEC_FULL_PALM_OIL.clone(), None),
                (ING_SPEC_FULL_SOYBEAN_OIL_STR, ING_SPEC_FULL_SOYBEAN_OIL.clone(), None),
                (ING_SPEC_FULL_SUNFLOWER_OIL_STR, ING_SPEC_FULL_SUNFLOWER_OIL.clone(), None),
            ]
        });

    #[test]
    fn to_composition_err_when_pod_cannot_be_computed() {
        let base = FullSpec {
            solids: Some(Solids::new()),
            micro: None,
            abv: None,
            energy: Some(0.0),
            pod: None,
            pac: None,
        };

        let cases = [
            FullSpec {
                solids: Some(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().other(5.0))),
                )),
                ..base
            },
            FullSpec {
                solids: Some(
                    Solids::new()
                        .other(SolidsBreakdown::new().artificial_sweeteners(ArtificialSweeteners::new().other(5.0))),
                ),
                ..base
            },
        ];
        for spec in cases {
            assert!(matches!(spec.to_composition(), Err(Error::CannotComputePOD(_))));
        }
    }

    #[test]
    fn to_composition_err_when_pac_cannot_be_computed() {
        // pod: Some(...) skips calculate_pod, so we reach calculate_pac
        let base = FullSpec {
            solids: Some(Solids::new()),
            micro: None,
            abv: None,
            energy: Some(0.0),
            pod: Some(0.0),
            pac: None,
        };

        let cases = [
            FullSpec {
                solids: Some(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().other(5.0))),
                )),
                ..base
            },
            FullSpec {
                solids: Some(
                    Solids::new()
                        .other(SolidsBreakdown::new().artificial_sweeteners(ArtificialSweeteners::new().other(5.0))),
                ),
                ..base
            },
        ];
        for spec in cases {
            assert!(matches!(spec.to_composition(), Err(Error::CannotComputePAC(_))));
        }
    }

    #[test]
    fn to_composition_err_when_total_solids_plus_alcohol_exceeds_100() {
        let spec = FullSpec {
            solids: Some(Solids::new().other(SolidsBreakdown::new().others(100.0))),
            micro: None,
            abv: Some(50.0),
            energy: None,
            pod: None,
            pac: None,
        };
        assert!(matches!(spec.to_composition(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn to_composition_err_when_fat_subset_exceeds_total() {
        let base = FullSpec {
            solids: None,
            micro: None,
            abv: None,
            energy: None,
            pod: None,
            pac: None,
        };

        let cases = [
            Fats::new().total(100.0).saturated(120.0),
            Fats::new().total(100.0).trans(101.0),
        ];
        for fats in cases {
            let spec = FullSpec {
                solids: Some(Solids::new().other(SolidsBreakdown::new().fats(fats))),
                ..base
            };
            assert!(matches!(spec.to_composition(), Err(Error::InvalidComposition(_))));
        }
    }

    #[test]
    fn to_composition_err_on_negative_values() {
        let base = FullSpec {
            solids: None,
            micro: None,
            abv: None,
            energy: None,
            pod: None,
            pac: None,
        };

        let cases = [
            FullSpec {
                solids: Some(Solids::new().other(SolidsBreakdown::new().fats(Fats::new().total(-1.0)))),
                ..base
            },
            FullSpec {
                energy: Some(-1.0),
                ..base
            },
            FullSpec {
                pod: Some(-1.0),
                ..base
            },
        ];
        for spec in cases {
            assert!(matches!(spec.to_composition(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn to_composition_err_when_energy_cannot_be_computed() {
        // Energy is computed before POD and PAC, so its error takes precedence over theirs
        use crate::composition::Polyols;
        let base = FullSpec {
            solids: Some(Solids::new()),
            micro: None,
            abv: None,
            energy: None,
            pod: None,
            pac: None,
        };

        let cases = [
            FullSpec {
                solids: Some(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().polyols(Polyols::new().other(5.0))),
                )),
                ..base
            },
            FullSpec {
                solids: Some(
                    Solids::new()
                        .other(SolidsBreakdown::new().artificial_sweeteners(ArtificialSweeteners::new().other(5.0))),
                ),
                ..base
            },
        ];
        for spec in cases {
            assert!(matches!(spec.to_composition(), Err(Error::CannotComputeEnergy(_))));
        }
    }

    #[test]
    fn to_composition_energy_override_skips_calculation() {
        // As in `to_composition_err_when_energy_cannot_be_computed`, but with the energy given
        use crate::composition::Polyols;
        let spec =
            FullSpec {
                solids: Some(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().polyols(Polyols::new().other(5.0))),
                )),
                micro: None,
                abv: None,
                energy: Some(10.0),
                pod: Some(0.0),
                pac: Some(PAC::new()),
            };

        spec.to_composition().unwrap().assert_keys(&[(CompKey::Energy, 10.0)]);
    }
}
