//! [`FullSpec`] and associated implementations, for ingredients with a full composition specified.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Alcohol, CompKey, Composition, IntoComposition, Micro, PAC, Solids},
    constants::{self},
    error::Result,
    validate::verify_is_within_100_percent,
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
    /// Detailed specification of the solids and their breakdown into subcategories
    pub solids: Option<Solids>,
    /// Specification of the micro ingredients or components, like salt, emulsifiers, etc.
    pub micro: Option<Micro>,
    /// Alcohol by volume (ABV) (2025)[^8] of the ingredient as a whole.
    #[doc= include_str!("../../docs/bibs/8.md")]
    pub abv: Option<f64>,
    /// [Potere Dolcificante (POD)](crate::docs#pod) of the ingredient as a whole.
    ///
    /// If not provided, it will be internally calculated from the composition of the solids and
    /// known POD values of the underlying components, e.g. carbohydrates and artificial sweeteners.
    pub pod: Option<f64>,
    /// [Potere Anti-Congelante (PAC)](crate::docs#pac) of the ingredient as a whole.
    ///
    /// If not provided, it will be internally calculated from the composition of the solids, the
    /// micro components, the alcohol content, and known PAC values of the underlying components.
    pub pac: Option<PAC>,
}

impl IntoComposition for FullSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            solids,
            micro,
            abv,
            pod,
            pac,
        } = self;

        let (solids, micro) = (solids.unwrap_or_default(), micro.unwrap_or_default());
        let alcohol = abv.map_or_else(Alcohol::default, Alcohol::from_abv);

        let calculate_pod = || Ok(solids.all().carbohydrates.to_pod()? + solids.all().artificial_sweeteners.to_pod()?);

        let calculate_pac = || {
            Ok(PAC::new()
                .sugars(solids.all().carbohydrates.to_pac()? + solids.all().artificial_sweeteners.to_pac()?)
                .alcohol(alcohol.to_pac())
                .salt(micro.salt * constants::pac::SALT)
                .msnf_ws_salts(solids.milk.snf() * constants::pac::MSNF_WS_SALTS / 100.0))
        };

        let pod = pod.map_or_else(calculate_pod, Ok)?;
        let pac = pac.map_or_else(calculate_pac, Ok)?;

        let comp = Composition::new()
            .energy(solids.all().energy()? + alcohol.energy())
            .solids(solids)
            .micro(micro)
            .alcohol(alcohol)
            .pod(pod)
            .pac(pac);

        verify_is_within_100_percent(comp.get(CompKey::TotalSolids) + comp.get(CompKey::Alcohol))?;

        Ok(comp)
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
        composition::{ArtificialSweeteners, Carbohydrates, CompKey, Solids, SolidsBreakdown, Sugars},
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
            solids: None,
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn into_composition_full_spec_water() {
        let comp = ING_SPEC_FULL_WATER.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::Water), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Lecithin), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACtotal), 0.0);
        assert_eq!(comp.get(CompKey::HF), 0.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_FULL: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| vec![(ING_SPEC_FULL_WATER_STR, ING_SPEC_FULL_WATER.clone(), None)]);

    #[test]
    fn into_composition_err_when_pod_cannot_be_computed() {
        let base = FullSpec {
            solids: Some(Solids::new()),
            micro: None,
            abv: None,
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
            assert!(matches!(spec.into_composition(), Err(Error::CannotComputePOD(_))));
        }
    }

    #[test]
    fn into_composition_err_when_pac_cannot_be_computed() {
        // pod: Some(...) skips calculate_pod, so we reach calculate_pac
        let base = FullSpec {
            solids: Some(Solids::new()),
            micro: None,
            abv: None,
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
            assert!(matches!(spec.into_composition(), Err(Error::CannotComputePAC(_))));
        }
    }

    #[test]
    fn into_composition_err_when_total_solids_plus_alcohol_exceeds_100() {
        let spec = FullSpec {
            solids: Some(Solids::new().other(SolidsBreakdown::new().others(100.0))),
            micro: None,
            abv: Some(50.0),
            pod: None,
            pac: None,
        };
        assert!(matches!(spec.into_composition(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn into_composition_err_when_energy_cannot_be_computed() {
        // With lazy evaluation, pod/pac computations are skipped when provided as Some,
        // so polyols.other != 0 reaches energy() instead of being caught by to_pod() first
        use crate::composition::{Carbohydrates, Polyols};
        let spec =
            FullSpec {
                solids: Some(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().polyols(Polyols::new().other(5.0))),
                )),
                micro: None,
                abv: None,
                pod: Some(0.0),
                pac: Some(PAC::new()),
            };
        assert!(matches!(spec.into_composition(), Err(Error::CannotComputeEnergy(_))));
    }
}
