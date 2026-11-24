//! [`CocoaPowderSpec`] and associated implementations, for cocoa powder ingredients

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, PAC, SimpleSolids, Solids, ToComposition},
    constants::composition::cocoa::STD_WATER_IN_COCOA_POWDER,
    error::Result,
    specs::cocoa::util::{calculate_cocoa_hardness, make_cocoa_solids},
    validate::{Validate, verify_are_positive, verify_is_100_percent, verify_is_subset},
};

#[cfg(doc)]
use crate::{
    composition::CompKey,
    constants::{self, composition::cocoa},
};

/// Spec for cocoa powder ingredients, with cocoa butter and optional other solids
///
/// See the [cocoa documentation](crate::docs#cocoa) for more details on chocolate ingredients and
/// the terminology used to define its various constituent components, e.g. cocoa solids, cocoa
/// butter, cocoa solids non-fat (SNF), etc.
///
/// The relation of the above components is `cocoa solids = cocoa butter + cocoa SNF`. The
/// [`cocoa_solids`](Self::cocoa_solids) content is optional, calculated as `100 - water -
/// other_solids` if not specified. It must be a superset of [`cocoa_butter`](Self::cocoa_butter),
/// which must be specified, typically ranging from ~10-24%. The
/// [`other_solids`](Self::other_solids) content is optional, assumed to be zero if unspecified, and
/// represents other non-sugar, non-fats solids, e.g. emulsifiers, demerara sugar impurities,
/// alkalization ash, etc. If non-zero, it is specified in [`Composition`] accessible via
/// [`CompKey::OtherSNFS`]. [`cocoa_solids`](Self::cocoa_solids),
/// [`other_solids`](Self::other_solids), and [`water`](Self::water) must add up to 100%.
///
/// The cocoa SNF content is further broken down into proteins, carbohydrates - including fiber,
/// and ash based on standard values for cocoa SNF, specified in
/// [`constants::composition::cocoa`], e.g. [`cocoa::STD_PROTEIN_IN_COCOA_SNF`],
/// [`cocoa::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SNF`], [`cocoa::STD_FIBER_IN_COCOA_SNF`], etc.
///
/// **Note:** This spec does not model intrinsic sugars in cocoa solids, i.e. those naturally
/// occurring in the cocoa beans - see [`cocoa::STD_SUGARS_IN_COCOA_SNF`]. They are included as
/// cocoa solids and cocoa SNF, which is correct, but are not tracked as sugars and are not included
/// in [`CompKey::TotalSugars`], nor do they contribute to sweetness or freezing point depression.
///
/// # Examples
///
/// A generic cocoa powder of the 10/12% grade:
/// - Cocoa butter: the grade's midpoint => 11%
/// - Water: by default [`cocoa::STD_WATER_IN_COCOA_POWDER`] => 3%
/// - Cocoa solids: 100% less the water => 97% (calculated internally)
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::{assert_eq_4dp, assert_eq_flt};
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::CocoaPowderSpec
/// };
///
/// let comp = CocoaPowderSpec {
///     cocoa_solids: None,
///     cocoa_butter: 11.0,
///     other_solids: None,
///     water: None,
///     dutch_processed: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
/// assert_eq_4dp!(comp.get(CompKey::Water), 3.0);
/// assert_eq_flt!(comp.get(CompKey::CocoaSolids), 97.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 11.0);
/// assert_eq_flt!(comp.get(CompKey::CocoaSNF), 86.0);
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 286.824);
/// assert_eq!(comp.get(CompKey::TotalFats), 11.0);
/// assert_eq_flt!(comp.get(CompKey::TotalProteins), 20.21);
/// assert_eq_flt!(comp.get(CompKey::TotalFiber), 32.508);
/// # Ok(()) }
/// ```
///
/// (Callebaut 10/12 Natural Cocoa Powder, 2018)[^545], per 100 g:
/// - Cocoa butter: _"TOTAL FAT 11.0 g"_ => 11%
/// - Water: 100 g less the 96.5 g its nutritional data accounts for => 3.5%
/// - Cocoa solids: 100% less the water => 96.5% (calculated internally)
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_flt;
/// # use sci_cream::{composition::{CompKey, ToComposition}, specs::CocoaPowderSpec};
/// #
/// let comp = CocoaPowderSpec {
///     cocoa_solids: None,
///     cocoa_butter: 11.0,
///     other_solids: None,
///     water: Some(3.5),
///     dutch_processed: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
/// assert_eq!(comp.get(CompKey::Water), 3.5);
/// assert_eq_flt!(comp.get(CompKey::CocoaSolids), 96.5);
/// assert_eq!(comp.get(CompKey::CocoaButter), 11.0);
/// assert_eq_flt!(comp.get(CompKey::CocoaSNF), 85.5);
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 285.732);
/// assert_eq!(comp.get(CompKey::TotalFats), 11.0);
/// assert_eq_flt!(comp.get(CompKey::TotalProteins), 20.0925);
/// assert_eq_flt!(comp.get(CompKey::TotalFiber), 32.319);
/// # Ok(()) }
/// ```
#[doc = include_str!("../../../docs/references/index/545.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CocoaPowderSpec {
    /// Total cocoa solids content, optional, `100 - water - other_solids` if not specified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cocoa_solids: Option<f64>,
    /// Cocoa butter content as a percentage of the product as a whole, usually from nutrition facts
    ///
    /// It must be specified, and must be a subset of [`cocoa_solids`](Self::cocoa_solids).
    ///
    /// A figure on dry matter, as the EU defines it (Directive 2000/36/EC, 2000, Annex I A.2)[^84],
    /// can be used as is, as specification sheets do in their own nutritional data: the difference,
    /// about 3% of the figure at typical moisture, is less than a grade's two-point range.
    #[doc = include_str!("../../../docs/references/index/84.md")]
    pub cocoa_butter: f64,
    /// Other solids content as a percentage of the product as a whole, usually from nutrition facts
    ///
    /// Assumed to be zero if not specified, and represents other non-sugar, non-fats solids, e.g.
    /// emulsifiers, impurities in demerara sugar, alkalization ash, etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_solids: Option<f64>,
    /// Water content as a percentage of the product as a whole
    ///
    /// Defaults to [`cocoa::STD_WATER_IN_COCOA_POWDER`] if not specified, which is usually the case
    /// for most commercial products. A ceiling can sometimes be inferred from regulatory standards,
    /// e.g. EU caps water in cocoa powder to 9% (Directive 2000/36/EC, 2000, Annex I A.2(a))[^84].
    #[doc = include_str!("../../../docs/references/index/84.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub water: Option<f64>,
    /// Whether the powder is alkalized, also known as dutch processing, `false` if unspecified
    ///
    /// Alkalized cocoa powder has been treated with an alkalizing agent. This affects the
    /// composition of the cocoa solids, namely the distribution of ash and carbohydrates; see
    /// [`cocoa::STD_ASH_IN_NATURAL_COCOA_SNF`] and [`cocoa::STD_ASH_IN_DUTCHED_COCOA_SNF`].
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
            cocoa_solids,
            cocoa_butter,
            other_solids,
            water,
            dutch_processed,
        } = *self;

        let other_solids = other_solids.unwrap_or(0.0);
        let water = water.unwrap_or(STD_WATER_IN_COCOA_POWDER * 100.0);
        let cocoa_solids = cocoa_solids.unwrap_or(100.0 - water - other_solids);

        verify_are_positive(&[cocoa_solids, cocoa_butter, other_solids, water])?;
        verify_is_subset(cocoa_butter, cocoa_solids, "cocoa_butter <= cocoa_solids")?;
        verify_is_100_percent(cocoa_solids + other_solids + water)?;

        let cocoa = make_cocoa_solids(cocoa_solids, cocoa_butter, dutch_processed.unwrap_or(false))?;
        let other_solids = SimpleSolids::new().others(other_solids);

        Composition::new()
            .energy(cocoa.energy()? + other_solids.energy()?)
            .solids(Solids::new().cocoa(cocoa).other(other_solids))
            .pac(PAC::new().hardness_factor(calculate_cocoa_hardness(cocoa_solids, cocoa_butter)))
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

    pub(crate) const ING_SPEC_COCOA_POWDER_10_12_FAT_STR: &str = r#"{
      "name": "Cocoa Powder, 10/12% Fat",
      "category": "Chocolate",
      "CocoaPowderSpec": {
        "cocoa_butter": 11
      }
    }"#;

    pub(crate) static ING_SPEC_COCOA_POWDER_10_12_FAT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Cocoa Powder, 10/12% Fat".to_string(),
        category: Category::Chocolate,
        spec: CocoaPowderSpec {
            cocoa_solids: None,
            cocoa_butter: 11.0,
            other_solids: None,
            water: None,
            dutch_processed: None,
        }
        .into(),
    });

    pub(crate) static COMP_COCOA_POWDER_10_12_FAT: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(286.824)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(11.0).saturated(6.6))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(32.508))
                                .others_from_total(59.254)
                                .unwrap(),
                        )
                        .proteins(SimpleProteins::from_total(20.21))
                        .minerals(6.536),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(164.7))
    });

    #[test]
    fn to_composition_cocoa_powder_spec_10_12_fat() {
        let comp = asset_composition(&ING_SPEC_COCOA_POWDER_10_12_FAT);

        comp.assert_all_keys(&[
            (CompKey::Energy, 286.824),
            (CompKey::CocoaSolids, 97.0),
            (CompKey::CocoaButter, 11.0),
            (CompKey::CocoaSNF, 86.0),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 97.0),
            (CompKey::TotalFats, 11.0),
            (CompKey::TotalSNF, 86.0),
            (CompKey::TotalSNFS, 86.0),
            (CompKey::TotalProteins, 20.21),
            (CompKey::TotalMinerals, 6.536),
            (CompKey::Water, 3.0),
            (CompKey::TotalCarbohydrates, 59.254),
            (CompKey::TotalFiber, 32.508),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::NetPAC, -164.7),
            (CompKey::TotalPAC, 0.0),
            (CompKey::HF, 164.7),
            (CompKey::SaturatedFat, 6.6),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 6.536);
    }

    /// (Barry Callebaut, 2018)[^545]
    #[doc = include_str!("../../../docs/references/index/545.md")]
    pub(crate) const ING_SPEC_COCOA_POWDER_CALLEBAUT_10_12_NATURAL_COCOA_POWDER_STR: &str = r#"{
      "name": "Callebaut 10/12 Natural Cocoa Powder",
      "category": "Chocolate",
      "CocoaPowderSpec": {
        "cocoa_butter": 11,
        "water": 3.5
      }
    }"#;

    pub(crate) static ING_SPEC_COCOA_POWDER_CALLEBAUT_10_12_NATURAL_COCOA_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Callebaut 10/12 Natural Cocoa Powder".to_string(),
            category: Category::Chocolate,
            spec: CocoaPowderSpec {
                cocoa_solids: None,
                cocoa_butter: 11.0,
                other_solids: None,
                water: Some(3.5),
                dutch_processed: None,
            }
            .into(),
        });

    pub(crate) static COMP_CALLEBAUT_10_12_NATURAL_COCOA_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(285.732)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(11.0).saturated(6.6))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(32.319))
                                .others_from_total(58.9095)
                                .unwrap(),
                        )
                        .proteins(SimpleProteins::from_total(20.0925))
                        .minerals(6.498),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(163.8))
    });

    #[test]
    fn to_composition_cocoa_powder_spec_callebaut_10_12_natural_cocoa_powder() {
        let comp = asset_composition(&ING_SPEC_COCOA_POWDER_CALLEBAUT_10_12_NATURAL_COCOA_POWDER);

        comp.assert_all_keys(&[
            (CompKey::Energy, 285.732),
            (CompKey::CocoaSolids, 96.5),
            (CompKey::CocoaButter, 11.0),
            (CompKey::CocoaSNF, 85.5),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 96.5),
            (CompKey::TotalFats, 11.0),
            (CompKey::TotalSNF, 85.5),
            (CompKey::TotalSNFS, 85.5),
            (CompKey::TotalProteins, 20.0925),
            (CompKey::TotalMinerals, 6.498),
            (CompKey::Water, 3.5),
            (CompKey::TotalCarbohydrates, 58.9095),
            (CompKey::TotalFiber, 32.319),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::NetPAC, -163.8),
            (CompKey::TotalPAC, 0.0),
            (CompKey::HF, 163.8),
            (CompKey::SaturatedFat, 6.6),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 6.498);
    }

    pub(crate) const ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER_STR: &str = r#"{
      "name": "Valrhona Unsweetened Cocoa Powder",
      "category": "Chocolate",
      "CocoaPowderSpec": {
        "cocoa_solids": 93,
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
                cocoa_solids: Some(93.0),
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
            // The declared 93% cocoa solids leaves 7% unaccounted for, modeled as `other_solids`
            (CompKey::CocoaSolids, 93.0),
            (CompKey::CocoaButter, 21.0),
            (CompKey::CocoaSNF, 72.0),
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

    /// Omitting cocoa solids derives `100 - water - other_solids`, matching Valrhona's declared 93
    #[test]
    fn to_composition_cocoa_powder_spec_derives_cocoa_solids_from_other_solids() {
        let comp = CocoaPowderSpec {
            cocoa_solids: None,
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
                    ING_SPEC_COCOA_POWDER_10_12_FAT_STR,
                    ING_SPEC_COCOA_POWDER_10_12_FAT.clone(),
                    Some(*COMP_COCOA_POWDER_10_12_FAT),
                ),
                (
                    ING_SPEC_COCOA_POWDER_CALLEBAUT_10_12_NATURAL_COCOA_POWDER_STR,
                    ING_SPEC_COCOA_POWDER_CALLEBAUT_10_12_NATURAL_COCOA_POWDER.clone(),
                    Some(*COMP_CALLEBAUT_10_12_NATURAL_COCOA_POWDER),
                ),
                (
                    ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER_STR,
                    ING_SPEC_COCOA_POWDER_VALRHONA_COCOA_POWDER.clone(),
                    Some(*COMP_VALRHONA_COCOA_POWDER),
                ),
            ]
        });

    fn empty_cocoa_powder_spec() -> CocoaPowderSpec {
        CocoaPowderSpec {
            cocoa_solids: None,
            cocoa_butter: 0.0,
            other_solids: None,
            water: None,
            dutch_processed: None,
        }
    }

    #[test]
    fn to_composition_cocoa_powder_err_when_components_do_not_sum_to_100() {
        let bad_specs = [
            // A full 100% of cocoa solids leaves no room for the default water
            CocoaPowderSpec {
                cocoa_solids: Some(100.0),
                cocoa_butter: 16.67,
                ..empty_cocoa_powder_spec()
            },
            CocoaPowderSpec {
                cocoa_solids: Some(93.0),
                cocoa_butter: 21.0,
                water: Some(10.0),
                ..empty_cocoa_powder_spec()
            },
            CocoaPowderSpec {
                cocoa_solids: Some(90.0),
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
            cocoa_solids: Some(103.0),
            cocoa_butter: 21.0,
            water: Some(-3.0),
            ..empty_cocoa_powder_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    /// An explicit water content is honoured in place of [`cocoa::STD_WATER_IN_COCOA_POWDER`]
    #[test]
    fn to_composition_cocoa_powder_spec_uses_explicit_water() {
        // The EU ceiling and a fully dried powder, both far from the 3% default
        for (water, exp_cocoa_solids) in [(9.0, 91.0), (0.0, 100.0)] {
            let comp = CocoaPowderSpec {
                cocoa_butter: 10.0,
                water: Some(water),
                ..empty_cocoa_powder_spec()
            }
            .to_composition()
            .unwrap();

            assert_eq_flt!(comp.get(CompKey::Water), water);
            assert_eq_flt!(comp.get(CompKey::CocoaSolids), exp_cocoa_solids);
            assert_eq_flt!(comp.get(CompKey::TotalSolids), exp_cocoa_solids);
            assert_eq_flt!(comp.get(CompKey::CocoaSNF), exp_cocoa_solids - 10.0);
        }
    }
}
