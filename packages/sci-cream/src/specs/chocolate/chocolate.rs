//! [`ChocolateSpec`] and associated implementations, for chocolate ingredients

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Carbohydrates, Composition, PAC, ScaleComponents, SimpleSolids, Solids, Sugars, ToComposition},
    constants::{composition::dairy::milk::STD_LACTOSE_IN_MSNF, pac},
    error::Result,
    specs::chocolate::util::{calculate_cocoa_hardness, make_cocoa_solids, make_milk_solids, resolve_fats},
    validate::{Validate, verify_are_positive, verify_is_100_percent, verify_is_subset},
};

#[cfg(doc)]
use crate::{
    composition::CompKey,
    constants::{
        self,
        composition::{
            cacao,
            dairy::{self, milk},
        },
    },
};

/// Represents the fats in chocolate ingredients, either a total, or a butterfat/cocoa butter split
///
/// Nutrition facts tables and vendor listings typically only report the [`Total`](Self::Total) fat
/// content, which does not distinguish between cocoa butter and milk fat. When available, product
/// spec sheets provide an explicit cocoa butter and milk fat [`Split`](Self::Split) declaration, or
/// ingredients from which it can be inferred; an explicit split is preferred when available.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum ChocolateFat {
    /// Total fat content, as nutrition facts and vendor listings report it
    #[serde(rename = "total_fat")]
    Total(f64),
    /// Cocoa butter and milk fat separately, as specification sheets state them
    #[serde(rename = "split_fats")]
    Split {
        /// Cocoa butter content, a subset of [`ChocolateSpec::cacao_solids`]
        #[serde(default)]
        cocoa_butter: f64,
        /// Milk fat content, a subset of [`ChocolateSpec::milk_solids`]
        #[serde(default)]
        milk_fat: f64,
    },
}

/// Spec for chocolate ingredients, with cacao solids, cocoa butter, and optional sugar and others
///
/// See the [chocolate documentation](crate::docs#chocolate) for more details on chocolate
/// ingredients and the terminology used to define its various constituent components, e.g. _cacao_
/// solids, cocoa butter, _cocoa_ solids, etc.
///
/// The relation of the above components is `cacao solids = cocoa butter + cocoa solids`. The
/// [`sugars`](Self::sugars) content of chocolate ingredients is optional, assumed to be zero if not
/// specified, as some chocolates (e.g. Unsweetened Chocolate, 100% Dark Chocolate) do not contain
/// any added sugars. Any non-zero sugar content is specified in [`Composition`] accessible via
/// [`CompKey::TotalSugars`]. The [`other_solids`](Self::other_solids) content is optional, assumed
/// to be zero if not specified, and represents other non-sugar, non-fats solids, e.g. emulsifiers,
/// impurities in demerara sugar, etc. If non-zero, it is specified in [`Composition`] accessible
/// via [`CompKey::OtherSNFS`]. [`cacao_solids`](Self::cacao_solids), [`sugars`](Self::sugars), and
/// [`other_solids`](Self::other_solids) together must add up to 100%.
///
/// The cocoa solids content is further broken down into proteins, carbohydrates - including fiber,
/// and ash based on standard values for cocoa solids, specified in
/// [`constants::composition::cacao`], e.g. [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`],
/// [`cacao::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS`], [`cacao::STD_FIBER_IN_COCOA_SOLIDS`], etc.
///
/// **Note:** This spec does not model intrinsic sugars in cocoa solids, i.e. those naturally
/// occurring in the cacao nuts - see [`cacao::STD_SUGARS_IN_COCOA_SOLIDS`]. Listings typically only
/// declare total sugars, which include both intrinsic and added. This spec treats all of them as
/// added sugars, stored in [`Solids::other`], accessible via [`CompKey::TotalSugars`].
///
/// # Examples
///
/// (Lindt 70% Cacao Dark Chocolate, 2025)[^507] per 40g serving:
/// - Cacao solids: 70%
/// - Cocoa butter: 16g fat => 40%
/// - Sugars: 12g => 30%
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_flt;
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::{ChocolateFat, ChocolateSpec}
/// };
///
/// let comp = ChocolateSpec {
///     cacao_solids: 70.0,
///     milk_solids: None,
///     fat: Some(ChocolateFat::Total(40.0)),
///     sugars: Some(30.0),
///     other_solids: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Sucrose), 30.0);
/// assert_eq!(comp.get(CompKey::CacaoSolids), 70.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 40.0);
/// assert_eq!(comp.get(CompKey::CocoaSolids), 30.0);
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 545.52);
/// assert_eq!(comp.get(CompKey::TotalFats), 40.0);
/// assert_eq!(comp.get(CompKey::TotalProteins), 7.05);
/// assert_eq!(comp.get(CompKey::TotalFiber), 11.34);
/// # Ok(()) }
/// ```
#[doc = include_str!("../../../docs/references/index/507.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ChocolateSpec {
    /// Total cacao solids content, usually advertised on packaging, e.g. 70% for 70% dark chocolate
    pub cacao_solids: f64,
    /// Total milk solids content, including milk fat; usually zero for dark chocolates
    ///
    /// Assumed to be zero if not specified, as dark chocolates do not contain any milk ingredients.
    /// If non-zero, it is broken down into subcomponents based on standard dairy values, e.g.
    /// [`milk::STD_LACTOSE_IN_MSNF`], [`milk::STD_PROTEIN_IN_MSNF`], etc. The ratio of butter fat
    /// is determined from the [`ChocolateFat::Split::milk_fat`] value, if specified, otherwise from
    /// the standard content in whole milk powder [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`].
    #[serde(skip_serializing_if = "Option::is_none")]
    pub milk_solids: Option<f64>,
    /// Fat content as a percentage of the product as a whole, usually from nutrition facts
    ///
    /// If not specified, cocoa butter and milk fat are independently calculated. Cocoa butter from
    /// [`cacao_solids`](Self::cacao_solids) and [`cacao::STD_COCOA_BUTTER_IN_CACAO_SOLIDS`], and
    /// milk fat from [`milk_solids`](Self::milk_solids) and
    /// [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`].
    ///
    /// If provided as a [`Total`](ChocolateFat::Total), it is internally split into cocoa butter
    /// and milk fat. Milk fat, if any, is determined first from [`ChocolateSpec::milk_solids`] and
    /// [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`]. The remainder is cocoa butter, equivalent to
    /// total fat if there are no milk solids.
    #[serde(flatten, skip_serializing_if = "Option::is_none")]
    pub fat: Option<ChocolateFat>,
    /// Sugars content as a percentage of the product as a whole, usually from nutrition facts.
    ///
    /// Assumed to be zero if not specified, as some chocolate products (e.g. Unsweetened Chocolate,
    /// 100% Dark Chocolate) do not contain any added sugars.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sugars: Option<f64>,
    /// Other solids content as a percentage of the product as a whole, usually from nutrition facts
    ///
    /// Assumed to be zero if not specified, and represents other non-sugar, non-fats solids, e.g.
    /// emulsifiers, impurities in demerara sugar, etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_solids: Option<f64>,
}

impl ToComposition for ChocolateSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            cacao_solids,
            milk_solids,
            fat,
            sugars,
            other_solids,
        } = *self;

        let milk_solids = milk_solids.unwrap_or(0.0);
        let sugars = sugars.unwrap_or(0.0);
        let other_solids = other_solids.unwrap_or(0.0);
        let (cocoa_butter, milk_fat) = resolve_fats(cacao_solids, milk_solids, fat);

        verify_are_positive(&[cacao_solids, milk_solids, cocoa_butter, milk_fat, sugars, other_solids])?;
        verify_is_subset(cocoa_butter, cacao_solids, "cocoa_butter <= cacao_solids")?;
        verify_is_subset(milk_fat, milk_solids, "milk_fat <= milk_solids")?;
        verify_is_100_percent(cacao_solids + milk_solids + sugars + other_solids)?;

        let cocoa_solids = make_cocoa_solids(cacao_solids, cocoa_butter, false)?;
        let milk_snf = milk_solids - milk_fat;
        let lactose = Sugars::new().lactose(milk_snf * STD_LACTOSE_IN_MSNF);
        let milk = make_milk_solids(milk_solids, milk_fat, &lactose)?;

        let sucrose = Sugars::new().sucrose(sugars);
        let other_solids = SimpleSolids::new()
            .carbohydrates(Carbohydrates::new().sugars(sucrose))
            .others(other_solids);
        let total_sugars = sucrose.add(&lactose);

        Composition::new()
            .energy(cocoa_solids.energy()? + milk.energy()? + other_solids.energy()?)
            .solids(Solids::new().cocoa(cocoa_solids).milk(milk).other(other_solids))
            .pod(total_sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(total_sugars.to_pac()?)
                    .msnf_ws_salts(milk_snf * pac::MSNF_WS_SALTS / 100.0)
                    .hardness_factor(calculate_cocoa_hardness(cacao_solids, cocoa_butter)),
            )
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
        composition::{CompKey, Fats, Fibers, SimpleProteins, SolidsBreakdown},
        constants::composition::{
            cacao::STD_COCOA_BUTTER_IN_CACAO_SOLIDS,
            dairy::{
                STD_BUTTERFAT_IN_WHOLE_MILK_POWDER,
                milk::{STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MSNF},
            },
        },
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
    };

    fn empty_chocolate_spec() -> ChocolateSpec {
        ChocolateSpec {
            cacao_solids: 0.0,
            milk_solids: None,
            fat: None,
            sugars: None,
            other_solids: None,
        }
    }

    pub(crate) const ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 70% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 70,
        "total_fat": 40,
        "sugars": 30
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 70% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cacao_solids: 70.0,
                fat: Some(ChocolateFat::Total(40.0)),
                sugars: Some(30.0),
                ..empty_chocolate_spec()
            }
            .into(),
        });

    pub(crate) static COMP_LINDT_70_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(545.52)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(40.0).saturated(24.0))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(11.34))
                                    .others_from_total(20.67)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(7.05))
                            .minerals(2.28),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(30.0))),
                    ),
            )
            .pod(30.0)
            .pac(PAC::new().sugars(30.0).hardness_factor(90.0))
    });

    #[test]
    fn to_composition_chocolate_spec_lindt_70_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 545.52),
            (CompKey::CacaoSolids, 70.0),
            (CompKey::CocoaButter, 40.0),
            (CompKey::CocoaSolids, 30.0),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 40.0),
            (CompKey::TotalSNF, 60.0),
            (CompKey::TotalSNFS, 30.0),
            (CompKey::TotalProteins, 7.05),
            (CompKey::TotalMinerals, 2.28),
            (CompKey::TotalCarbohydrates, 50.67),
            (CompKey::TotalFiber, 11.34),
            (CompKey::TotalSugars, 30.0),
            (CompKey::Sucrose, 30.0),
            (CompKey::TotalSweeteners, 30.0),
            (CompKey::POD, 30.0),
            (CompKey::NetPAC, -60.0),
            (CompKey::TotalPAC, 30.0),
            (CompKey::PACsgr, 30.0),
            (CompKey::HF, 90.0),
            (CompKey::SaturatedFat, 24.0),
            (CompKey::TransFat, 0.0),
        ]);

        // Added sugars in chocolates is considered part of total sweeteners, not of Cacao Solids
        assert_eq!(comp.get(CompKey::CacaoSolids), comp.get(CompKey::TotalSolids) - comp.get(CompKey::TotalSweeteners));

        assert_eq!(comp.solids.cocoa.minerals, 2.28);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 95% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 95,
        "total_fat": 57.5,
        "sugars": 3,
        "other_solids": 2
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 95% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cacao_solids: 95.0,
                milk_solids: None,
                fat: Some(ChocolateFat::Total(57.5)),
                sugars: Some(3.0),
                other_solids: Some(2.0),
            }
            .into(),
        });

    pub(crate) static COMP_LINDT_95_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(611.4)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(57.5).saturated(34.5))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(14.175))
                                    .others_from_total(25.8375)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(8.8125))
                            .minerals(2.85),
                    )
                    .other(
                        SolidsBreakdown::new()
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(3.0)))
                            .others(2.0),
                    ),
            )
            .pod(3.0)
            .pac(PAC::new().sugars(3.0).hardness_factor(119.25))
    });

    #[test]
    fn to_composition_chocolate_spec_lindt_95_dark_chocolate_other_solids() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS);

        comp.assert_all_keys(&[
            (CompKey::Energy, 611.4),
            (CompKey::CacaoSolids, 95.0),
            (CompKey::CocoaButter, 57.5),
            (CompKey::CocoaSolids, 37.5),
            (CompKey::OtherSNFS, 2.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 57.5),
            (CompKey::TotalSNF, 42.5),
            (CompKey::TotalSNFS, 39.5),
            (CompKey::TotalProteins, 8.8125),
            (CompKey::TotalMinerals, 2.85),
            (CompKey::TotalCarbohydrates, 28.8375),
            (CompKey::TotalFiber, 14.175),
            (CompKey::TotalSugars, 3.0),
            (CompKey::Sucrose, 3.0),
            (CompKey::TotalSweeteners, 3.0),
            (CompKey::POD, 3.0),
            (CompKey::NetPAC, -116.25),
            (CompKey::TotalPAC, 3.0),
            (CompKey::PACsgr, 3.0),
            (CompKey::HF, 119.25),
            (CompKey::SaturatedFat, 34.5),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 2.85);
        assert_eq!(comp.solids.other.others, 2.0);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 100% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 100,
        "total_fat": 54
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 100% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cacao_solids: 100.0,
                fat: Some(ChocolateFat::Total(54.0)),
                ..empty_chocolate_spec()
            }
            .into(),
        });

    pub(crate) static COMP_LINDT_100_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(586.464)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(54.0).saturated(32.4))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(17.388))
                                .others_from_total(31.694)
                                .unwrap(),
                        )
                        .proteins(SimpleProteins::from_total(10.81))
                        .minerals(3.496),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(131.4))
    });

    #[test]
    fn to_composition_chocolate_spec_lindt_100_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 586.464),
            (CompKey::CacaoSolids, 100.0),
            (CompKey::CocoaButter, 54.0),
            (CompKey::CocoaSolids, 46.0),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 54.0),
            (CompKey::TotalSNF, 46.0),
            (CompKey::TotalSNFS, 46.0),
            (CompKey::TotalProteins, 10.81),
            (CompKey::TotalMinerals, 3.496),
            (CompKey::TotalCarbohydrates, 31.694),
            (CompKey::TotalFiber, 17.388),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::NetPAC, -131.4),
            (CompKey::TotalPAC, 0.0),
            (CompKey::HF, 131.4),
            (CompKey::SaturatedFat, 32.4),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 3.496);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_70_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "70% Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 70,
        "sugars": 30
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_70_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "70% Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cacao_solids: 70.0,
                fat: None,
                sugars: Some(30.0),
                ..empty_chocolate_spec()
            }
            .into(),
        });

    pub(crate) static COMP_70_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(544.8384)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(39.9).saturated(23.94))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(11.3778))
                                    .others_from_total(20.7389)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(7.0735))
                            .minerals(2.2876),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(30.0))),
                    ),
            )
            .pod(30.0)
            .pac(PAC::new().sugars(30.0).hardness_factor(90.09))
    });

    #[test]
    fn to_composition_chocolate_spec_70_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_70_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 544.8384),
            (CompKey::CacaoSolids, 70.0),
            (CompKey::CocoaButter, 39.9),
            (CompKey::CocoaSolids, 30.1),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 39.9),
            (CompKey::TotalSNF, 60.1),
            (CompKey::TotalSNFS, 30.1),
            (CompKey::TotalProteins, 7.0735),
            (CompKey::TotalMinerals, 2.2876),
            (CompKey::TotalCarbohydrates, 50.7389),
            (CompKey::TotalFiber, 11.3778),
            (CompKey::TotalSugars, 30.0),
            (CompKey::Sucrose, 30.0),
            (CompKey::TotalSweeteners, 30.0),
            (CompKey::POD, 30.0),
            (CompKey::NetPAC, -60.09),
            (CompKey::TotalPAC, 30.0),
            (CompKey::PACsgr, 30.0),
            (CompKey::HF, 90.09),
            (CompKey::SaturatedFat, 23.94),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 2.2876);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_95_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "95% Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 95,
        "sugars": 5
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_95_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "95% Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cacao_solids: 95.0,
                fat: None,
                sugars: Some(5.0),
                ..empty_chocolate_spec()
            }
            .into(),
        });

    pub(crate) static COMP_95_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(596.5664)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(54.15).saturated(32.49))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(15.4413))
                                    .others_from_total(28.14565)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(9.59975))
                            .minerals(3.1046),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(5.0))),
                    ),
            )
            .pod(5.0)
            .pac(PAC::new().sugars(5.0).hardness_factor(122.265))
    });

    #[test]
    fn to_composition_chocolate_spec_95_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_95_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 596.5664),
            (CompKey::CacaoSolids, 95.0),
            (CompKey::CocoaButter, 54.15),
            (CompKey::CocoaSolids, 40.85),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 54.15),
            (CompKey::TotalSNF, 45.85),
            (CompKey::TotalSNFS, 40.85),
            (CompKey::TotalProteins, 9.59975),
            (CompKey::TotalMinerals, 3.1046),
            (CompKey::TotalCarbohydrates, 33.14565),
            (CompKey::TotalFiber, 15.4413),
            (CompKey::TotalSugars, 5.0),
            (CompKey::Sucrose, 5.0),
            (CompKey::TotalSweeteners, 5.0),
            (CompKey::POD, 5.0),
            (CompKey::NetPAC, -117.265),
            (CompKey::TotalPAC, 5.0),
            (CompKey::PACsgr, 5.0),
            (CompKey::HF, 122.265),
            (CompKey::SaturatedFat, 32.49),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 3.1046);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_100_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "100% Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 100
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_100_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "100% Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cacao_solids: 100.0,
                fat: None,
                sugars: None,
                ..empty_chocolate_spec()
            }
            .into(),
        });

    pub(crate) static COMP_100_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(606.912)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(57.0).saturated(34.2))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(16.254))
                                .others_from_total(29.627)
                                .unwrap(),
                        )
                        .proteins(SimpleProteins::from_total(10.105))
                        .minerals(3.268),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(128.7))
    });

    #[test]
    fn to_composition_chocolate_spec_100_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_100_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 606.912),
            (CompKey::CacaoSolids, 100.0),
            (CompKey::CocoaButter, 57.0),
            (CompKey::CocoaSolids, 43.0),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 57.0),
            (CompKey::TotalSNF, 43.0),
            (CompKey::TotalSNFS, 43.0),
            (CompKey::TotalProteins, 10.105),
            (CompKey::TotalMinerals, 3.268),
            (CompKey::TotalCarbohydrates, 29.627),
            (CompKey::TotalFiber, 16.254),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::NetPAC, -128.7),
            (CompKey::TotalPAC, 0.0),
            (CompKey::HF, 128.7),
            (CompKey::SaturatedFat, 34.2),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 3.268);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_CHOCOLATE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (
                    ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE.clone(),
                    Some(*COMP_LINDT_70_DARK_CHOCOLATE),
                ),
                (
                    ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS_STR,
                    ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS.clone(),
                    Some(*COMP_LINDT_95_DARK_CHOCOLATE),
                ),
                (
                    ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE.clone(),
                    Some(*COMP_LINDT_100_DARK_CHOCOLATE),
                ),
                (
                    ING_SPEC_CHOCOLATE_70_DARK_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_70_DARK_CHOCOLATE.clone(),
                    Some(*COMP_70_DARK_CHOCOLATE),
                ),
                (
                    ING_SPEC_CHOCOLATE_95_DARK_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_95_DARK_CHOCOLATE.clone(),
                    Some(*COMP_95_DARK_CHOCOLATE),
                ),
                (
                    ING_SPEC_CHOCOLATE_100_DARK_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_100_DARK_CHOCOLATE.clone(),
                    Some(*COMP_100_DARK_CHOCOLATE),
                ),
            ]
        });

    #[test]
    fn to_composition_err_on_negative_field() {
        let neg_specs = [
            ChocolateSpec {
                cacao_solids: -1.0,
                fat: Some(ChocolateFat::Total(0.0)),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cacao_solids: 70.0,
                fat: Some(ChocolateFat::Total(-1.0)),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cacao_solids: 70.0,
                fat: Some(ChocolateFat::Total(40.0)),
                sugars: Some(-1.0),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cacao_solids: 70.0,
                fat: Some(ChocolateFat::Total(40.0)),
                other_solids: Some(-1.0),
                ..empty_chocolate_spec()
            },
        ];

        for spec in neg_specs {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn to_composition_err_when_cocoa_butter_exceeds_cacao_solids() {
        let result = ChocolateSpec {
            cacao_solids: 40.0,
            fat: Some(ChocolateFat::Total(60.0)),
            ..empty_chocolate_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_err_when_components_do_not_sum_to_100() {
        let gt_100_specs = [
            ChocolateSpec {
                cacao_solids: 50.0,
                fat: Some(ChocolateFat::Total(20.0)),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cacao_solids: 70.0,
                fat: Some(ChocolateFat::Total(40.0)),
                sugars: Some(35.0),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cacao_solids: 70.0,
                fat: Some(ChocolateFat::Total(40.0)),
                other_solids: Some(35.0),
                ..empty_chocolate_spec()
            },
        ];

        for spec in gt_100_specs {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNot100Percent(_))));
        }
    }

    #[test]
    fn to_composition_chocolate_spec_milk_solids_break_down_as_dairy() {
        let comp = ChocolateSpec {
            cacao_solids: 40.0,
            milk_solids: Some(20.0),
            fat: Some(ChocolateFat::Split {
                cocoa_butter: 22.0,
                milk_fat: 5.0,
            }),
            sugars: Some(40.0),
            other_solids: None,
        }
        .to_composition()
        .unwrap();

        let msnf = 20.0 - 5.0;
        assert_eq_flt!(comp.get(CompKey::MilkSolids), 20.0);
        assert_eq_flt!(comp.get(CompKey::MilkFat), 5.0);
        assert_eq_flt!(comp.get(CompKey::MSNF), msnf);
        assert_eq_flt!(comp.get(CompKey::Lactose), msnf * STD_LACTOSE_IN_MSNF);
        assert_eq_flt!(comp.get(CompKey::MilkProteins), msnf * STD_PROTEIN_IN_MSNF);
        assert_eq_flt!(comp.get(CompKey::MilkMinerals), msnf * STD_MINERALS_IN_MSNF);

        // The declared split is taken as-is, and the cacao side is untouched by the milk
        assert_eq_flt!(comp.get(CompKey::CacaoSolids), 40.0);
        assert_eq_flt!(comp.get(CompKey::CocoaButter), 22.0);
        assert_eq_flt!(comp.get(CompKey::TotalFats), 27.0);
    }

    #[test]
    fn to_composition_chocolate_spec_milk_lactose_reaches_pod_and_pac() {
        let milky = ChocolateSpec {
            cacao_solids: 40.0,
            milk_solids: Some(20.0),
            fat: Some(ChocolateFat::Split {
                cocoa_butter: 22.0,
                milk_fat: 5.0,
            }),
            sugars: Some(40.0),
            other_solids: None,
        }
        .to_composition()
        .unwrap();

        let lactose = (20.0 - 5.0) * STD_LACTOSE_IN_MSNF;
        assert_eq_flt!(milky.get(CompKey::TotalSugars), 40.0 + lactose);

        // Sucrose alone would carry the POD of the declared 40 g, and MSNF salts no PAC at all
        let sucrose_only = Sugars::new().sucrose(40.0).to_pod().unwrap();
        assert!(milky.get(CompKey::POD) > sucrose_only);
        assert!(milky.get(CompKey::PACmlk) > 0.0);
    }

    #[test]
    fn to_composition_chocolate_spec_total_fat_reserves_milk_fat_first() {
        let comp = ChocolateSpec {
            cacao_solids: 40.0,
            milk_solids: Some(20.0),
            fat: Some(ChocolateFat::Total(27.0)),
            sugars: Some(40.0),
            other_solids: None,
        }
        .to_composition()
        .unwrap();

        let milk_fat = 20.0 * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER;
        assert_eq_flt!(comp.get(CompKey::MilkFat), milk_fat);
        assert_eq_flt!(comp.get(CompKey::CocoaButter), 27.0 - milk_fat);
        assert_eq_flt!(comp.get(CompKey::TotalFats), 27.0);
    }

    #[test]
    fn to_composition_chocolate_spec_total_fat_is_cocoa_butter_without_milk() {
        let comp = ChocolateSpec {
            cacao_solids: 70.0,
            fat: Some(ChocolateFat::Total(40.0)),
            sugars: Some(30.0),
            ..empty_chocolate_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_8dp!(&comp, &*COMP_LINDT_70_DARK_CHOCOLATE);
    }

    #[test]
    fn to_composition_chocolate_spec_absent_fat_defaults_both_sources() {
        let comp = ChocolateSpec {
            cacao_solids: 40.0,
            milk_solids: Some(20.0),
            fat: None,
            sugars: Some(40.0),
            other_solids: None,
        }
        .to_composition()
        .unwrap();

        assert_eq_flt!(comp.get(CompKey::CocoaButter), 40.0 * STD_COCOA_BUTTER_IN_CACAO_SOLIDS);
        assert_eq_flt!(comp.get(CompKey::MilkFat), 20.0 * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER);
    }

    #[test]
    fn to_composition_err_when_milk_fat_exceeds_milk_solids() {
        let result = ChocolateSpec {
            cacao_solids: 40.0,
            milk_solids: Some(20.0),
            fat: Some(ChocolateFat::Split {
                cocoa_butter: 22.0,
                milk_fat: 25.0,
            }),
            sugars: Some(40.0),
            other_solids: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_err_when_total_fat_is_below_implied_milk_fat() {
        let result = ChocolateSpec {
            cacao_solids: 40.0,
            milk_solids: Some(20.0),
            fat: Some(ChocolateFat::Total(3.0)),
            sugars: Some(40.0),
            other_solids: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn chocolate_fat_serializes_flattened() {
        for (json, fat) in [
            (r#"{"cacao_solids":70.0,"total_fat":40.0}"#, ChocolateFat::Total(40.0)),
            (
                r#"{"cacao_solids":70.0,"split_fats":{"cocoa_butter":24.0,"milk_fat":6.0}}"#,
                ChocolateFat::Split {
                    cocoa_butter: 24.0,
                    milk_fat: 6.0,
                },
            ),
        ] {
            let spec = ChocolateSpec {
                cacao_solids: 70.0,
                fat: Some(fat),
                ..empty_chocolate_spec()
            };
            assert_eq!(serde_json::to_string(&spec).unwrap(), json);
            assert_eq!(serde_json::from_str::<ChocolateSpec>(json).unwrap(), spec);
        }
    }

    #[test]
    fn chocolate_fat_deserialization_rejects_conflicting_and_unknown_fields() {
        for json in [
            r#"{"cacao_solids":70,"total_fat":40,"split_fats":{"cocoa_butter":24,"milk_fat":6}}"#,
            r#"{"cacao_solids":70,"total_fatt":40}"#,
        ] {
            assert!(serde_json::from_str::<ChocolateSpec>(json).is_err());
        }
    }
}
