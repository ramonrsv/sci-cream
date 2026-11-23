//! [`ChocolateSpec`] and associated implementations, for chocolate ingredients

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Carbohydrates, Composition, PAC, ScaleComponents, SimpleSolids, Solids, Sugars, ToComposition},
    constants::{composition::dairy::milk::STD_LACTOSE_IN_MSNF, pac},
    error::Result,
    specs::cocoa::util::{calculate_cocoa_hardness, make_cocoa_solids, make_milk_solids, resolve_chocolate_fats},
    validate::{Validate, verify_are_positive, verify_is_100_percent, verify_is_subset},
};

#[cfg(doc)]
use crate::{
    composition::CompKey,
    constants::{
        self,
        composition::{
            cocoa,
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
        /// Cocoa butter content, a subset of [`ChocolateSpec::cocoa_solids`]
        #[serde(default)]
        cocoa_butter: f64,
        /// Milk fat content, a subset of [`ChocolateSpec::milk_solids`]
        #[serde(default)]
        milk_fat: f64,
    },
}

/// Spec for chocolate ingredients, with cocoa solids, cocoa butter, and optional sugar and others
///
/// See the [cocoa documentation](crate::docs#cocoa) for more details on chocolate ingredients and
/// the terminology used to define its various constituent components, e.g. cocoa solids, cocoa
/// butter, cocoa solids non-fat (SNF), etc.
///
/// The relation of the above components is `cocoa solids = cocoa butter + cocoa SNF`. The
/// [`sugars`](Self::sugars) content of chocolate ingredients is optional, assumed to be zero if not
/// specified, as some chocolates (e.g. Unsweetened Chocolate, 100% Dark Chocolate) do not contain
/// any added sugars. Any non-zero sugar content is specified in [`Composition`] accessible via
/// [`CompKey::TotalSugars`]. The [`other_solids`](Self::other_solids) content is optional, assumed
/// to be zero if not specified, and represents other non-sugar, non-fats solids, e.g. emulsifiers,
/// impurities in demerara sugar, etc. If non-zero, it is specified in [`Composition`] accessible
/// via [`CompKey::OtherSNFS`]. [`cocoa_solids`](Self::cocoa_solids), [`sugars`](Self::sugars), and
/// [`other_solids`](Self::other_solids) together must add up to 100%.
///
/// The cocoa SNF content is further broken down into proteins, carbohydrates - including fiber,
/// and ash based on standard values for cocoa SNF, specified in
/// [`constants::composition::cocoa`], e.g. [`cocoa::STD_PROTEIN_IN_COCOA_SNF`],
/// [`cocoa::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SNF`], [`cocoa::STD_FIBER_IN_COCOA_SNF`], etc.
///
/// **Note:** This spec does not model intrinsic sugars in cocoa solids, i.e. those naturally
/// occurring in the cocoa beans - see [`cocoa::STD_SUGARS_IN_COCOA_SNF`]. Listings typically only
/// declare total sugars, which include both intrinsic and added. This spec treats all of them as
/// added sugars, stored in [`Solids::other`], accessible via [`CompKey::TotalSugars`].
///
/// # Examples
///
/// A generic 70% dark chocolate, with the cocoa solids its name advertises:
/// - Cocoa solids: 70%
/// - Cocoa butter: by default [`cocoa::STD_COCOA_BUTTER_IN_COCOA_SOLIDS`] of the cocoa solids
/// - Sugars: the remaining 30%
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_flt;
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::ChocolateSpec
/// };
///
/// let comp = ChocolateSpec {
///     cocoa_solids: 70.0,
///     milk_solids: None,
///     fat: None,
///     sugars: Some(30.0),
///     other_solids: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Sucrose), 30.0);
/// assert_eq!(comp.get(CompKey::CocoaSolids), 70.0);
/// assert_eq_flt!(comp.get(CompKey::CocoaButter), 39.9);
/// assert_eq_flt!(comp.get(CompKey::CocoaSNF), 30.1);
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 544.8384);
/// assert_eq_flt!(comp.get(CompKey::TotalFats), 39.9);
/// assert_eq_flt!(comp.get(CompKey::TotalProteins), 7.0735);
/// assert_eq_flt!(comp.get(CompKey::TotalFiber), 11.3778);
/// # Ok(()) }
/// ```
///
/// (Callebaut 811 Dark Chocolate, 2024)[^542]:
/// - Cocoa solids: _"Dry cocoa solids 56.0%"_
/// - Cocoa butter: _"TOTAL FAT CONTENT 36.6%"_, as it has no milk fat
/// - Sugars: _"sugar 43.0%"_
/// - Other solids: the remaining 1%
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_flt;
/// # use sci_cream::{composition::{CompKey, ToComposition}, specs::{ChocolateFat, ChocolateSpec}};
/// #
/// let comp = ChocolateSpec {
///     cocoa_solids: 56.0,
///     milk_solids: None,
///     fat: Some(ChocolateFat::Total(36.6)),
///     sugars: Some(43.0),
///     other_solids: Some(1.0),
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Sucrose), 43.0);
/// assert_eq!(comp.get(CompKey::CocoaSolids), 56.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 36.6);
/// assert_eq_flt!(comp.get(CompKey::CocoaSNF), 19.4);
/// assert_eq!(comp.get(CompKey::OtherSNFS), 1.0);
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 543.7696);
/// assert_eq!(comp.get(CompKey::TotalFats), 36.6);
/// assert_eq_flt!(comp.get(CompKey::TotalProteins), 4.559);
/// assert_eq_flt!(comp.get(CompKey::TotalFiber), 7.3332);
/// # Ok(()) }
/// ```
///
/// (Callebaut 823 Milk Chocolate, 2023)[^543]:
/// - Cocoa solids: _"Dry cocoa solids 35,1%"_
/// - Cocoa butter: _"TOTAL FAT CONTENT 36,2%"_ less the milk fat => 30.2%
/// - Milk solids: _"Dry milk solids 21,8%"_
/// - Milk fat: _"Milkfat 6,0%"_
/// - Sugars: _"sugar 42,0%"_
/// - Other solids: the remaining 1.1%
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::{assert_eq_4dp, assert_eq_flt};
/// # use sci_cream::{composition::{CompKey, ToComposition}, specs::{ChocolateFat, ChocolateSpec}};
/// #
/// let comp = ChocolateSpec {
///     cocoa_solids: 35.1,
///     milk_solids: Some(21.8),
///     fat: Some(ChocolateFat::Split { cocoa_butter: 30.2, milk_fat: 6.0 }),
///     sugars: Some(42.0),
///     other_solids: Some(1.1),
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Sucrose), 42.0);
/// assert_eq_flt!(comp.get(CompKey::CocoaSolids), 35.1);
/// assert_eq!(comp.get(CompKey::CocoaButter), 30.2);
/// assert_eq_4dp!(comp.get(CompKey::CocoaSNF), 4.9);
/// assert_eq_4dp!(comp.get(CompKey::OtherSNFS), 1.1);
///
/// assert_eq!(comp.get(CompKey::MilkSolids), 21.8);
/// assert_eq!(comp.get(CompKey::MilkFat), 6.0);
/// assert_eq_flt!(comp.get(CompKey::MSNF), 15.8);
/// assert_eq_flt!(comp.get(CompKey::Lactose), 8.611);
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 562.6456);
/// assert_eq_flt!(comp.get(CompKey::TotalFats), 36.2);
/// assert_eq_flt!(comp.get(CompKey::TotalSugars), 50.611);
/// assert_eq_flt!(comp.get(CompKey::TotalProteins), 7.0765);
/// assert_eq_flt!(comp.get(CompKey::TotalFiber), 1.8522);
/// # Ok(()) }
/// ```
#[doc = include_str!("../../../docs/references/index/542.md")]
#[doc = include_str!("../../../docs/references/index/543.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ChocolateSpec {
    /// Total cocoa solids content, usually advertised on packaging, e.g. 70% for 70% dark chocolate
    pub cocoa_solids: f64,
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
    /// [`cocoa_solids`](Self::cocoa_solids) and [`cocoa::STD_COCOA_BUTTER_IN_COCOA_SOLIDS`], and
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
            cocoa_solids,
            milk_solids,
            fat,
            sugars,
            other_solids,
        } = *self;

        let milk_solids = milk_solids.unwrap_or(0.0);
        let sugars = sugars.unwrap_or(0.0);
        let other_solids = other_solids.unwrap_or(0.0);
        let (cocoa_butter, milk_fat) = resolve_chocolate_fats(cocoa_solids, milk_solids, fat);

        verify_are_positive(&[cocoa_solids, milk_solids, cocoa_butter, milk_fat, sugars, other_solids])?;
        verify_is_subset(cocoa_butter, cocoa_solids, "cocoa_butter <= cocoa_solids")?;
        verify_is_subset(milk_fat, milk_solids, "milk_fat <= milk_solids")?;
        verify_is_100_percent(cocoa_solids + milk_solids + sugars + other_solids)?;

        let cocoa = make_cocoa_solids(cocoa_solids, cocoa_butter, false)?;
        let milk_snf = milk_solids - milk_fat;
        let lactose = Sugars::new().lactose(milk_snf * STD_LACTOSE_IN_MSNF);
        let milk = make_milk_solids(milk_solids, milk_fat, &lactose)?;

        let sucrose = Sugars::new().sucrose(sugars);
        let other_solids = SimpleSolids::new()
            .carbohydrates(Carbohydrates::new().sugars(sucrose))
            .others(other_solids);
        let total_sugars = sucrose.add(&lactose);

        Composition::new()
            .energy(cocoa.energy()? + milk.energy()? + other_solids.energy()?)
            .solids(Solids::new().cocoa(cocoa).milk(milk).other(other_solids))
            .pod(total_sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(total_sugars.to_pac()?)
                    .msnf_ws_salts(milk_snf * pac::MSNF_WS_SALTS / 100.0)
                    .hardness_factor(calculate_cocoa_hardness(cocoa_solids, cocoa_butter)),
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
        composition::{CompKey, Fats, Fibers, MilkProteins, SimpleProteins, SolidsBreakdown},
        constants::composition::{
            cocoa::STD_COCOA_BUTTER_IN_COCOA_SOLIDS,
            dairy::{
                STD_BUTTERFAT_IN_WHOLE_MILK_POWDER,
                milk::{STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MSNF},
            },
        },
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
    };

    pub(crate) const ING_SPEC_CHOCOLATE_70_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "70% Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cocoa_solids": 70,
        "sugars": 30
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_70_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "70% Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cocoa_solids: 70.0,
                milk_solids: None,
                fat: None,
                sugars: Some(30.0),
                other_solids: None,
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
            (CompKey::CocoaSolids, 70.0),
            (CompKey::CocoaButter, 39.9),
            (CompKey::CocoaSNF, 30.1),
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

        // Added sugars in chocolates is considered part of total sweeteners, not of Cocoa Solids
        assert_eq!(comp.get(CompKey::CocoaSolids), comp.get(CompKey::TotalSolids) - comp.get(CompKey::TotalSweeteners));

        assert_eq_flt!(comp.solids.cocoa.minerals, 2.2876);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_95_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "95% Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cocoa_solids": 95,
        "sugars": 5
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_95_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "95% Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cocoa_solids: 95.0,
                milk_solids: None,
                fat: None,
                sugars: Some(5.0),
                other_solids: None,
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
            (CompKey::CocoaSolids, 95.0),
            (CompKey::CocoaButter, 54.15),
            (CompKey::CocoaSNF, 40.85),
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
        "cocoa_solids": 100
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_100_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "100% Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cocoa_solids: 100.0,
                milk_solids: None,
                fat: None,
                sugars: None,
                other_solids: None,
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
            (CompKey::CocoaSolids, 100.0),
            (CompKey::CocoaButter, 57.0),
            (CompKey::CocoaSNF, 43.0),
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

    /// (Barry Callebaut, 2024)[^542]
    #[doc = include_str!("../../../docs/references/index/542.md")]
    pub(crate) const ING_SPEC_CHOCOLATE_CALLEBAUT_811_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Callebaut 811 Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cocoa_solids": 56,
        "total_fat": 36.6,
        "sugars": 43,
        "other_solids": 1
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_CALLEBAUT_811_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Callebaut 811 Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cocoa_solids: 56.0,
                milk_solids: None,
                fat: Some(ChocolateFat::Total(36.6)),
                sugars: Some(43.0),
                other_solids: Some(1.0),
            }
            .into(),
        });

    pub(crate) static COMP_CALLEBAUT_811_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(543.7696)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(36.6).saturated(21.96))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(7.3332))
                                    .others_from_total(13.3666)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(4.559))
                            .minerals(1.4744),
                    )
                    .other(
                        SolidsBreakdown::new()
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(43.0)))
                            .others(1.0),
                    ),
            )
            .pod(43.0)
            .pac(PAC::new().sugars(43.0).hardness_factor(67.86))
    });

    #[test]
    fn to_composition_chocolate_spec_callebaut_811_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_CALLEBAUT_811_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 543.7696),
            (CompKey::CocoaSolids, 56.0),
            (CompKey::CocoaButter, 36.6),
            (CompKey::CocoaSNF, 19.4),
            (CompKey::OtherSNFS, 1.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 36.6),
            (CompKey::TotalSNF, 63.4),
            (CompKey::TotalSNFS, 20.4),
            (CompKey::TotalProteins, 4.559),
            (CompKey::TotalMinerals, 1.4744),
            (CompKey::TotalCarbohydrates, 56.3666),
            (CompKey::TotalFiber, 7.3332),
            (CompKey::TotalSugars, 43.0),
            (CompKey::Sucrose, 43.0),
            (CompKey::TotalSweeteners, 43.0),
            (CompKey::POD, 43.0),
            (CompKey::NetPAC, -24.86),
            (CompKey::TotalPAC, 43.0),
            (CompKey::PACsgr, 43.0),
            (CompKey::HF, 67.86),
            (CompKey::SaturatedFat, 21.96),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 1.4744);
        assert_eq!(comp.solids.other.others, 1.0);
    }

    /// (Barry Callebaut, 2023)[^543]
    #[doc = include_str!("../../../docs/references/index/543.md")]
    pub(crate) const ING_SPEC_CHOCOLATE_CALLEBAUT_823_MILK_CHOCOLATE_STR: &str = r#"{
      "name": "Callebaut 823 Milk Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cocoa_solids": 35.1,
        "milk_solids": 21.8,
        "split_fats": { "cocoa_butter": 30.2, "milk_fat": 6 },
        "sugars": 42,
        "other_solids": 1.1
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_CALLEBAUT_823_MILK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Callebaut 823 Milk Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cocoa_solids: 35.1,
                milk_solids: Some(21.8),
                fat: Some(ChocolateFat::Split {
                    cocoa_butter: 30.2,
                    milk_fat: 6.0,
                }),
                sugars: Some(42.0),
                other_solids: Some(1.1),
            }
            .into(),
        });

    pub(crate) static COMP_CALLEBAUT_823_MILK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(562.6456)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(30.2).saturated(18.12))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(1.8522))
                                    .others_from_total(3.3761)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(1.1515))
                            .minerals(0.3724),
                    )
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(6.0).saturated(3.9).trans(0.21))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(8.611)))
                            .proteins(MilkProteins::new().casein(4.74).whey(1.185))
                            .minerals(1.264),
                    )
                    .other(
                        SolidsBreakdown::new()
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(42.0)))
                            .others(1.1),
                    ),
            )
            .pod(43.37776)
            .pac(PAC::new().sugars(50.611).msnf_ws_salts(5.804_984).hardness_factor(36.0))
    });

    #[test]
    fn to_composition_chocolate_spec_callebaut_823_milk_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_CALLEBAUT_823_MILK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 562.6456),
            (CompKey::MilkSolids, 21.8),
            (CompKey::MilkFat, 6.0),
            (CompKey::MSNF, 15.8),
            (CompKey::MilkSugars, 8.611),
            (CompKey::MilkSNFS, 7.189),
            (CompKey::MilkProteins, 5.925),
            (CompKey::Casein, 4.74),
            (CompKey::Whey, 1.185),
            (CompKey::MilkMinerals, 1.264),
            (CompKey::CocoaSolids, 35.1),
            (CompKey::CocoaButter, 30.2),
            (CompKey::CocoaSNF, 4.9),
            (CompKey::OtherSNFS, 1.1),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 36.2),
            (CompKey::TotalSNF, 63.8),
            (CompKey::TotalSNFS, 13.189),
            (CompKey::TotalProteins, 7.0765),
            (CompKey::TotalMinerals, 1.6364),
            (CompKey::TotalCarbohydrates, 53.9871),
            (CompKey::TotalFiber, 1.8522),
            (CompKey::TotalSugars, 50.611),
            (CompKey::Sucrose, 42.0),
            (CompKey::Lactose, 8.611),
            (CompKey::TotalSweeteners, 50.611),
            (CompKey::POD, 43.37776),
            (CompKey::NetPAC, 20.415_984),
            (CompKey::TotalPAC, 56.415_984),
            (CompKey::PACsgr, 50.611),
            (CompKey::PACmlk, 5.804_984),
            (CompKey::HF, 36.0),
            (CompKey::SaturatedFat, 22.02),
            (CompKey::TransFat, 0.21),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 0.3724);
        assert_eq_flt!(comp.solids.other.others, 1.1);
    }

    /// (Barry Callebaut, 2024)[^544]
    #[doc = include_str!("../../../docs/references/index/544.md")]
    pub(crate) const ING_SPEC_CHOCOLATE_CALLEBAUT_W2_WHITE_CHOCOLATE_STR: &str = r#"{
      "name": "Callebaut W2 White Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cocoa_solids": 29.5,
        "milk_solids": 23,
        "split_fats": { "cocoa_butter": 29.5, "milk_fat": 6.3 },
        "sugars": 46.5,
        "other_solids": 1
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_CALLEBAUT_W2_WHITE_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Callebaut W2 White Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateSpec {
                cocoa_solids: 29.5,
                milk_solids: Some(23.0),
                fat: Some(ChocolateFat::Split {
                    cocoa_butter: 29.5,
                    milk_fat: 6.3,
                }),
                sugars: Some(46.5),
                other_solids: Some(1.0),
            }
            .into(),
        });

    pub(crate) static COMP_CALLEBAUT_W2_WHITE_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(569.656)
            .solids(
                Solids::new()
                    .cocoa(SolidsBreakdown::new().fats(Fats::new().total(29.5).saturated(17.7)))
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(6.3).saturated(4.095).trans(0.2205))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(9.1015)))
                            .proteins(MilkProteins::new().casein(5.01).whey(1.2525))
                            .minerals(1.336),
                    )
                    .other(
                        SolidsBreakdown::new()
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(46.5)))
                            .others(1.0),
                    ),
            )
            .pod(47.95624)
            .pac(
                PAC::new()
                    .sugars(55.6015)
                    .msnf_ws_salts(6.135_648)
                    .hardness_factor(26.55),
            )
    });

    #[test]
    fn to_composition_chocolate_spec_callebaut_w2_white_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_CALLEBAUT_W2_WHITE_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 569.656),
            (CompKey::MilkSolids, 23.0),
            (CompKey::MilkFat, 6.3),
            (CompKey::MSNF, 16.7),
            (CompKey::MilkSugars, 9.1015),
            (CompKey::MilkSNFS, 7.5985),
            (CompKey::MilkProteins, 6.2625),
            (CompKey::Casein, 5.01),
            (CompKey::Whey, 1.2525),
            (CompKey::MilkMinerals, 1.336),
            (CompKey::CocoaSolids, 29.5),
            (CompKey::CocoaButter, 29.5),
            // Cocoa butter is its only cocoa ingredient, leaving no cocoa solids non-fat
            (CompKey::CocoaSNF, 0.0),
            (CompKey::OtherSNFS, 1.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 35.8),
            (CompKey::TotalSNF, 64.2),
            (CompKey::TotalSNFS, 8.5985),
            (CompKey::TotalProteins, 6.2625),
            (CompKey::TotalMinerals, 1.336),
            (CompKey::TotalCarbohydrates, 55.6015),
            (CompKey::TotalSugars, 55.6015),
            (CompKey::Sucrose, 46.5),
            (CompKey::Lactose, 9.1015),
            (CompKey::TotalSweeteners, 55.6015),
            (CompKey::POD, 47.95624),
            (CompKey::NetPAC, 35.187_148),
            (CompKey::TotalPAC, 61.737_148),
            (CompKey::PACsgr, 55.6015),
            (CompKey::PACmlk, 6.135_648),
            (CompKey::HF, 26.55),
            (CompKey::SaturatedFat, 21.795),
            (CompKey::TransFat, 0.2205),
        ]);

        assert_eq!(comp.solids.cocoa.minerals, 0.0);
        assert_eq!(comp.solids.other.others, 1.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_CHOCOLATE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
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
                (
                    ING_SPEC_CHOCOLATE_CALLEBAUT_811_DARK_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_CALLEBAUT_811_DARK_CHOCOLATE.clone(),
                    Some(*COMP_CALLEBAUT_811_DARK_CHOCOLATE),
                ),
                (
                    ING_SPEC_CHOCOLATE_CALLEBAUT_823_MILK_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_CALLEBAUT_823_MILK_CHOCOLATE.clone(),
                    Some(*COMP_CALLEBAUT_823_MILK_CHOCOLATE),
                ),
                (
                    ING_SPEC_CHOCOLATE_CALLEBAUT_W2_WHITE_CHOCOLATE_STR,
                    ING_SPEC_CHOCOLATE_CALLEBAUT_W2_WHITE_CHOCOLATE.clone(),
                    Some(*COMP_CALLEBAUT_W2_WHITE_CHOCOLATE),
                ),
            ]
        });

    fn empty_chocolate_spec() -> ChocolateSpec {
        ChocolateSpec {
            cocoa_solids: 0.0,
            milk_solids: None,
            fat: None,
            sugars: None,
            other_solids: None,
        }
    }

    #[test]
    fn to_composition_err_on_negative_field() {
        let neg_specs = [
            ChocolateSpec {
                cocoa_solids: -1.0,
                fat: Some(ChocolateFat::Total(0.0)),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cocoa_solids: 70.0,
                fat: Some(ChocolateFat::Total(-1.0)),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cocoa_solids: 70.0,
                fat: Some(ChocolateFat::Total(40.0)),
                sugars: Some(-1.0),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cocoa_solids: 70.0,
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
    fn to_composition_err_when_cocoa_butter_exceeds_cocoa_solids() {
        let result = ChocolateSpec {
            cocoa_solids: 40.0,
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
                cocoa_solids: 50.0,
                fat: Some(ChocolateFat::Total(20.0)),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cocoa_solids: 70.0,
                fat: Some(ChocolateFat::Total(40.0)),
                sugars: Some(35.0),
                ..empty_chocolate_spec()
            },
            ChocolateSpec {
                cocoa_solids: 70.0,
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
            cocoa_solids: 40.0,
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

        // The declared split is taken as-is, and the cocoa side is untouched by the milk
        assert_eq_flt!(comp.get(CompKey::CocoaSolids), 40.0);
        assert_eq_flt!(comp.get(CompKey::CocoaButter), 22.0);
        assert_eq_flt!(comp.get(CompKey::TotalFats), 27.0);
    }

    #[test]
    fn to_composition_chocolate_spec_milk_lactose_reaches_pod_and_pac() {
        let milky = ChocolateSpec {
            cocoa_solids: 40.0,
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
            cocoa_solids: 40.0,
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
            cocoa_solids: 70.0,
            fat: Some(ChocolateFat::Total(40.0)),
            sugars: Some(30.0),
            ..empty_chocolate_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq!(comp.get(CompKey::CocoaButter), 40.0);
        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq!(comp.get(CompKey::TotalFats), 40.0);
    }

    #[test]
    fn to_composition_chocolate_spec_absent_fat_defaults_both_sources() {
        let comp = ChocolateSpec {
            cocoa_solids: 40.0,
            milk_solids: Some(20.0),
            fat: None,
            sugars: Some(40.0),
            other_solids: None,
        }
        .to_composition()
        .unwrap();

        assert_eq_flt!(comp.get(CompKey::CocoaButter), 40.0 * STD_COCOA_BUTTER_IN_COCOA_SOLIDS);
        assert_eq_flt!(comp.get(CompKey::MilkFat), 20.0 * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER);
    }

    #[test]
    fn to_composition_err_when_milk_fat_exceeds_milk_solids() {
        let result = ChocolateSpec {
            cocoa_solids: 40.0,
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
            cocoa_solids: 40.0,
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
            (r#"{"cocoa_solids":70.0,"total_fat":40.0}"#, ChocolateFat::Total(40.0)),
            (
                r#"{"cocoa_solids":70.0,"split_fats":{"cocoa_butter":24.0,"milk_fat":6.0}}"#,
                ChocolateFat::Split {
                    cocoa_butter: 24.0,
                    milk_fat: 6.0,
                },
            ),
        ] {
            let spec = ChocolateSpec {
                cocoa_solids: 70.0,
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
            r#"{"cocoa_solids":70,"total_fat":40,"split_fats":{"cocoa_butter":24,"milk_fat":6}}"#,
            r#"{"cocoa_solids":70,"total_fatt":40}"#,
        ] {
            assert!(serde_json::from_str::<ChocolateSpec>(json).is_err());
        }
    }
}
