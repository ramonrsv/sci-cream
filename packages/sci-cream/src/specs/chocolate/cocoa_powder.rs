//! [`CocoaPowderSpec`] and associated implementations, for cocoa powder ingredients

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, PAC, SimpleSolids, Solids, ToComposition},
    constants::composition::cacao::STD_WATER_IN_COCOA_POWDER,
    error::Result,
    specs::chocolate::util::{calculate_cocoa_hardness, make_cocoa_solids},
    validate::{Validate, verify_are_positive, verify_is_100_percent, verify_is_subset},
};

#[cfg(doc)]
use crate::{
    composition::CompKey,
    constants::{self, composition::cacao},
};

/// Spec for cocoa powder ingredients, with cocoa butter and optional other solids
///
/// See the [chocolate documentation](crate::docs#chocolate) for more details on chocolate
/// ingredients and the terminology used to define its various constituent components, e.g. _cacao_
/// solids, cocoa butter, _cocoa_ solids, etc.
///
/// The relation of the above components is `cacao solids = cocoa butter + cocoa solids`. The
/// [`cacao_solids`](Self::cacao_solids) content is optional, calculated as `100 - water -
/// other_solids` if not specified. It must be a superset of [`cocoa_butter`](Self::cocoa_butter),
/// which must be specified, typically ranging from ~10-24%. The
/// [`other_solids`](Self::other_solids) content is optional, assumed to be zero if unspecified, and
/// represents other non-sugar, non-fats solids, e.g. emulsifiers, demerara sugar impurities,
/// alkalization ash, etc. If non-zero, it is specified in [`Composition`] accessible via
/// [`CompKey::OtherSNFS`]. [`cacao_solids`](Self::cacao_solids),
/// [`other_solids`](Self::other_solids), and [`water`](Self::water) must add up to 100%.
///
/// The cocoa solids content is further broken down into proteins, carbohydrates - including fiber,
/// and ash based on standard values for cocoa solids, specified in
/// [`constants::composition::cacao`], e.g. [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`],
/// [`cacao::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS`], [`cacao::STD_FIBER_IN_COCOA_SOLIDS`], etc.
///
/// **Note:** This spec does not model intrinsic sugars in cocoa solids, i.e. those naturally
/// occurring in the cacao nuts - see [`cacao::STD_SUGARS_IN_COCOA_SOLIDS`]. They are included as
/// cacao and cocoa solids, which is correct, but are not tracked as sugars and are not included
/// in [`CompKey::TotalSugars`], nor do they contribute to sweetness or freezing point depression.
///
/// # Examples
///
/// (Ghirardelli 100% Unsweetened Cocoa Powder, 2025)[^511] per 6g serving:
/// - Cocoa butter: 1g fat => 16.67%
/// - Cacao solids: 100% less the default 3% water => 97% (calculated internally)
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_flt;
/// # use sci_cream::{
/// #     composition::{CompKey, ToComposition},
/// #     specs::CocoaPowderSpec
/// # };
/// #
/// let comp = CocoaPowderSpec {
///     cacao_solids: None,
///     cocoa_butter: 16.67,
///     other_solids: None,
///     water: None,
///     dutch_processed: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
/// assert_eq_flt!(comp.get(CompKey::Water), 3.0);
/// assert_eq_flt!(comp.get(CompKey::CacaoSolids), 97.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 16.67);
/// assert_eq_flt!(comp.get(CompKey::CocoaSolids), 80.33);
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 325.47072);
/// assert_eq!(comp.get(CompKey::TotalFats), 16.67);
/// assert_eq_flt!(comp.get(CompKey::TotalProteins), 18.87755);
/// assert_eq_flt!(comp.get(CompKey::TotalFiber), 30.36474);
/// # Ok(()) }
/// ```
#[doc = include_str!("../../../docs/references/index/511.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CocoaPowderSpec {
    /// Total cacao solids content, optional, `100 - water - other_solids` if not specified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cacao_solids: Option<f64>,
    /// Cocoa butter content as a percentage of the product as a whole, usually from nutrition facts
    ///
    /// It must be specified, and must be a subset of [`cacao_solids`](Self::cacao_solids)
    pub cocoa_butter: f64,
    /// Other solids content as a percentage of the product as a whole, usually from nutrition facts
    ///
    /// Assumed to be zero if not specified, and represents other non-sugar, non-fats solids, e.g.
    /// emulsifiers, impurities in demerara sugar, alkalization ash, etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_solids: Option<f64>,
    /// Water content as a percentage of the product as a whole
    ///
    /// Defaults to [`cacao::STD_WATER_IN_COCOA_POWDER`] if not specified, which is usually the case
    /// for most commercial products. A ceiling can sometimes be inferred from regulatory standards,
    /// e.g. EU caps water in cocoa powder to 9% (Directive 2000/36/EC, 2000, Annex I 2.(a))[^84].
    #[doc = include_str!("../../../docs/references/index/84.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub water: Option<f64>,
    /// Whether the powder is alkalized, also known as dutch processing, `false` if unspecified
    ///
    /// Alkalized cocoa powder has been treated with an alkalizing agent. This affects the
    /// composition of the cocoa solids, namely the distribution of ash and carbohydrates; see
    /// [`cacao::STD_ASH_IN_NATURAL_COCOA_SOLIDS`] and [`cacao::STD_ASH_IN_DUTCHED_COCOA_SOLIDS`].
    /// See the [dutch processed](crate::docs#dutch-processed) documentation for more details.
    ///
    /// **Note:** Dutch processing is a graded scale and there are degrees of alkalization, ranging
    /// from lightly to heavily alkalized cocoa powders (Miller et al., 2008)[^85]. As such, this
    /// binary classification only approximates a typical moderate level of alkalization.
    #[doc = include_str!("../../../docs/references/index/85.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dutch_processed: Option<bool>,
}

impl ToComposition for CocoaPowderSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            cacao_solids,
            cocoa_butter,
            other_solids,
            water,
            dutch_processed,
        } = *self;

        let other_solids = other_solids.unwrap_or(0.0);
        let water = water.unwrap_or(STD_WATER_IN_COCOA_POWDER * 100.0);
        let cacao_solids = cacao_solids.unwrap_or(100.0 - water - other_solids);

        verify_are_positive(&[cacao_solids, cocoa_butter, other_solids, water])?;
        verify_is_subset(cocoa_butter, cacao_solids, "cocoa_butter <= cacao_solids")?;
        verify_is_100_percent(cacao_solids + other_solids + water)?;

        let cocoa_solids = make_cocoa_solids(cacao_solids, cocoa_butter, dutch_processed.unwrap_or(false))?;
        let other_solids = SimpleSolids::new().others(other_solids);

        Composition::new()
            .energy(cocoa_solids.energy()? + other_solids.energy()?)
            .solids(Solids::new().cocoa(cocoa_solids).other(other_solids))
            .pac(PAC::new().hardness_factor(calculate_cocoa_hardness(cacao_solids, cocoa_butter)))
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
        composition::{Carbohydrates, CompKey, Fats, Fibers, SimpleProteins, SolidsBreakdown},
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
    };

    fn empty_cocoa_powder_spec() -> CocoaPowderSpec {
        CocoaPowderSpec {
            cacao_solids: None,
            cocoa_butter: 0.0,
            other_solids: None,
            water: None,
            dutch_processed: None,
        }
    }

    pub(crate) const ING_SPEC_COCOA_POWDER_GHIRARDELLI_100_COCOA_POWDER_STR: &str = r#"{
      "name": "Ghirardelli 100% Unsweetened Cocoa Powder",
      "category": "Chocolate",
      "CocoaPowderSpec": {
        "cocoa_butter": 16.67
      }
    }"#;

    pub(crate) static ING_SPEC_COCOA_POWDER_GHIRARDELLI_100_COCOA_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Ghirardelli 100% Unsweetened Cocoa Powder".to_string(),
            category: Category::Chocolate,
            spec: CocoaPowderSpec {
                cocoa_butter: 16.67,
                ..empty_cocoa_powder_spec()
            }
            .into(),
        });

    pub(crate) static COMP_GHIRARDELLI_100_COCOA_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(325.47072)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(16.67).saturated(10.002))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(30.36474))
                                .others_from_total(55.34737)
                                .unwrap(),
                        )
                        .proteins(SimpleProteins::from_total(18.87755))
                        .minerals(6.10508),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(159.597))
    });

    #[test]
    fn to_composition_cocoa_powder_spec_ghirardelli_100_cocoa_powder() {
        let comp = asset_composition(&ING_SPEC_COCOA_POWDER_GHIRARDELLI_100_COCOA_POWDER);

        comp.assert_all_keys(&[
            // Different similar products list the energy from 250 to 325
            (CompKey::Energy, 325.47072),
            (CompKey::CacaoSolids, 97.0),
            (CompKey::CocoaButter, 16.67),
            (CompKey::CocoaSolids, 80.33),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 97.0),
            (CompKey::TotalFats, 16.67),
            (CompKey::TotalSNF, 80.33),
            (CompKey::TotalSNFS, 80.33),
            (CompKey::TotalProteins, 18.87755),
            (CompKey::TotalMinerals, 6.10508),
            (CompKey::Water, 3.0),
            (CompKey::TotalCarbohydrates, 55.34737),
            (CompKey::TotalFiber, 30.36474),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::NetPAC, -159.597),
            (CompKey::TotalPAC, 0.0),
            (CompKey::HF, 159.597),
            (CompKey::SaturatedFat, 10.002),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 6.10508);
    }

    pub(crate) const ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER_STR: &str = r#"{
      "name": "Valrhona Unsweetened Cocoa Powder",
      "category": "Chocolate",
      "CocoaPowderSpec": {
        "cacao_solids": 93,
        "cocoa_butter": 21,
        "other_solids": 4,
        "water": 3,
        "dutch_processed": true
      }
    }"#;

    pub(crate) static ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Valrhona Unsweetened Cocoa Powder".to_string(),
            category: Category::Chocolate,
            spec: CocoaPowderSpec {
                cacao_solids: Some(93.0),
                cocoa_butter: 21.0,
                other_solids: Some(4.0),
                water: Some(3.0),
                dutch_processed: Some(true),
            }
            .into(),
        });

    pub(crate) static COMP_VALRHONA_COCOA_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(341.352)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(21.0).saturated(12.6))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(27.216))
                                    .others_from_total(48.384)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(16.92))
                            .minerals(6.696),
                    )
                    .other(SolidsBreakdown::new().others(4.0)),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(148.5))
    });

    #[test]
    fn to_composition_cocoa_powder_spec_valrhona_cocoa_powder() {
        let comp = asset_composition(&ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER);

        comp.assert_all_keys(&[
            (CompKey::Energy, 341.352),
            // The declared 93% cacao solids leaves 7% unaccounted for, modeled as `other_solids`
            (CompKey::CacaoSolids, 93.0),
            (CompKey::CocoaButter, 21.0),
            (CompKey::CocoaSolids, 72.0),
            (CompKey::OtherSNFS, 4.0),
            (CompKey::TotalSolids, 97.0),
            (CompKey::TotalFats, 21.0),
            (CompKey::TotalSNF, 76.0),
            (CompKey::TotalSNFS, 76.0),
            (CompKey::TotalProteins, 16.92),
            (CompKey::TotalMinerals, 6.696),
            (CompKey::Water, 3.0),
            (CompKey::TotalCarbohydrates, 48.384),
            (CompKey::TotalFiber, 27.216),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::NetPAC, -148.5),
            (CompKey::TotalPAC, 0.0),
            (CompKey::HF, 148.5),
            (CompKey::SaturatedFat, 12.6),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 6.696);
        assert_eq!(comp.solids.other.others, 4.0);
    }

    /// Omitting cacao solids derives `100 - water - other_solids`, matching Valrhona's declared 93
    #[test]
    fn to_composition_cocoa_powder_spec_derives_cacao_solids_from_other_solids() {
        let comp = CocoaPowderSpec {
            cacao_solids: None,
            cocoa_butter: 21.0,
            other_solids: Some(4.0),
            water: None,
            dutch_processed: Some(true),
        }
        .to_composition()
        .unwrap();

        assert_eq_8dp!(&comp, &*COMP_VALRHONA_COCOA_POWDER);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_COCOA_POWDER: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (
                    ING_SPEC_COCOA_POWDER_GHIRARDELLI_100_COCOA_POWDER_STR,
                    ING_SPEC_COCOA_POWDER_GHIRARDELLI_100_COCOA_POWDER.clone(),
                    Some(*COMP_GHIRARDELLI_100_COCOA_POWDER),
                ),
                (
                    ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER_STR,
                    ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER.clone(),
                    Some(*COMP_VALRHONA_COCOA_POWDER),
                ),
            ]
        });

    #[test]
    fn to_composition_cocoa_powder_err_when_components_do_not_sum_to_100() {
        let bad_specs = [
            // A full 100% of cacao solids leaves no room for the default water
            CocoaPowderSpec {
                cacao_solids: Some(100.0),
                cocoa_butter: 16.67,
                ..empty_cocoa_powder_spec()
            },
            CocoaPowderSpec {
                cacao_solids: Some(93.0),
                cocoa_butter: 21.0,
                water: Some(10.0),
                ..empty_cocoa_powder_spec()
            },
            CocoaPowderSpec {
                cacao_solids: Some(90.0),
                cocoa_butter: 21.0,
                ..empty_cocoa_powder_spec()
            },
        ];

        for spec in bad_specs {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNot100Percent(_))));
        }
    }

    #[test]
    fn to_composition_cocoa_powder_err_on_negative_water() {
        // Sums to 100, so the sign check is the only one that can fire
        let result = CocoaPowderSpec {
            cacao_solids: Some(103.0),
            cocoa_butter: 21.0,
            water: Some(-3.0),
            ..empty_cocoa_powder_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    /// An explicit water content is honoured in place of [`cacao::STD_WATER_IN_COCOA_POWDER`]
    #[test]
    fn to_composition_cocoa_powder_spec_uses_explicit_water() {
        // The EU ceiling and a fully dried powder, both far from the 3% default
        for (water, exp_cacao_solids) in [(9.0, 91.0), (0.0, 100.0)] {
            let comp = CocoaPowderSpec {
                cocoa_butter: 10.0,
                water: Some(water),
                ..empty_cocoa_powder_spec()
            }
            .to_composition()
            .unwrap();

            assert_eq_flt!(comp.get(CompKey::Water), water);
            assert_eq_flt!(comp.get(CompKey::CacaoSolids), exp_cacao_solids);
            assert_eq_flt!(comp.get(CompKey::TotalSolids), exp_cacao_solids);
            assert_eq_flt!(comp.get(CompKey::CocoaSolids), exp_cacao_solids - 10.0);
        }
    }
}
