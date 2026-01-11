use serde::{Deserialize, Serialize};

use crate::{
    composition::{Carbohydrates, Composition, Fats, Fibers, IntoComposition, PAC, Solids, SolidsBreakdown, Sugars},
    constants::{self, composition::cacao},
    error::Result,
    validate::{assert_are_positive, assert_is_100_percent, assert_is_subset},
};

#[cfg(doc)]
use crate::composition::CompKey;

/// Spec for chocolate ingredients, with cacao solids, cocoa butter, and optional sugar and others
///
/// The terminology around chocolate ingredients can be confusing and used inconsistently across
/// different industries and stages of processing. For clarity, within this library we define:
///   - _Cacao_ solids: the total dry matter content derived from the cacao bean (sometimes referred
///     to as "chocolate liquor", "cocoa mass", etc.) including both cocoa butter (fat) and cocoa
///     solids (non-fat solids). This is the percentage advertised on chocolate packaging, e.g. 70%
///     dark chocolate has 70% cacao solids. Corresponds to [`cacao_solids`](Self::cacao_solids).
///     The value is specified in [`Composition`] accessible via [`CompKey::CacaoSolids`].
///   - Cocoa butter: the fat component extracted from cacao solids (sometimes referred to as "cocoa
///     fat"). This is rarely advertised on packaging, but can usually be inferred from the
///     nutrition table. Corresponds to [`cocoa_butter`](Self::cocoa_butter). The value is
///     specified in [`Composition`] accessible via [`CompKey::CocoaButter`].
///   - _Cocoa_ solids: the non-fat component of cacao solids (sometimes referred to as "cocoa
///     powder" or "cocoa fiber"), i.e. cacao solids minus cocoa butter. In ice cream mixes, this
///     generally determines how "chocolatey" the flavor is. This value is specified in
///     [`Composition`] accessible via [`CompKey::CocoaSolids`].
///
/// The relation of the above components is `cacao solids = cocoa butter + cocoa solids`. The
/// [`sugars`](Self::sugars) content of chocolate ingredients is optional, assumed to be zero if not
/// specified, as some chocolates (e.g. Unsweetened Chocolate) and most chocolate powders do not
/// contain any added sugars. Any non-zero sugar content is specified in [`Composition`] accessible
/// via [`CompKey::TotalSugars`]. The [`other_solids`](Self::other_solids) content is optional,
/// assumed to be zero if not specified, and represents other non-sugar, non-fats solids, e.g.
/// emulsifiers, impurities in demerara sugar, etc. If non-zero, it is specified in [`Composition`]
/// accessible via [`CompKey::OtherSNFS`]. [`cacao_solids`](Self::cacao_solids),
/// [`sugars`](Self::sugars), and [`other_solids`](Self::other_solids) together must add up to 100%.
/// Cocoa Powder products are typically 100% cacao solids, with no sugar, and cocoa butter content
/// ranging from ~10-24%.
///
/// The cocoa solids content is further broken down into proteins, carbohydrates - including fiber,
/// and ash based on standard values for cocoa solids, specified in
/// [`constants::composition::cacao`], e.g. [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`],
/// [`cacao::STD_CARBOHYDRATES_IN_COCOA_SOLIDS`], [`cacao::STD_FIBER_IN_COCOA_SOLIDS`], etc.
///
/// # Examples
///
/// (Lindt 70% Cacao Dark Chocolate, 2025)[^107] per 40g serving:
/// - Cacao solids: 70%
/// - Cocoa butter: 16g fat => 40%
/// - Sugars: 12g => 30%
///
/// ```
/// use sci_cream::{
///     composition::{CompKey, IntoComposition},
///     specs::ChocolateSpec
/// };
///
/// let comp = ChocolateSpec {
///     cacao_solids: 70.0,
///     cocoa_butter: 40.0,
///     sugars: Some(30.0),
///     other_solids: None,
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::Sucrose), 30.0);
/// assert_eq!(comp.get(CompKey::CacaoSolids), 70.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 40.0);
/// assert_eq!(comp.get(CompKey::CocoaSolids), 30.0);
///
/// assert_eq!(comp.get(CompKey::Energy), 543.0);
/// assert_eq!(comp.get(CompKey::TotalFats), 40.0);
/// assert_eq!(comp.get(CompKey::TotalProteins), 7.35);
/// assert_eq!(comp.get(CompKey::Fiber), 12.0);
/// ```
///
/// (Ghirardelli 100% Unsweetened Cocoa Powder, 2025)[^111] per 6g serving:
/// - Cacao solids: 100%
/// - Cocoa butter: 1g fat => 16.67%
///
/// ```
/// # use sci_cream::docs::assert_eq_float;
/// # use sci_cream::{
/// #     composition::{CompKey, IntoComposition},
/// #     specs::ChocolateSpec
/// # };
/// #
/// let comp = ChocolateSpec {
///     cacao_solids: 100.0,
///     cocoa_butter: 16.67,
///     sugars: None,
///     other_solids: None,
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
/// assert_eq!(comp.get(CompKey::CacaoSolids), 100.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 16.67);
/// assert_eq!(comp.get(CompKey::CocoaSolids), 83.33);
///
/// assert_eq!(comp.get(CompKey::Energy), 325.023);
/// assert_eq!(comp.get(CompKey::TotalFats), 16.67);
/// assert_eq_float!(comp.get(CompKey::TotalProteins), 20.4159);
/// assert_eq_float!(comp.get(CompKey::Fiber), 33.332);
/// ```
#[doc = include_str!("../../docs/bibs/107.md")]
#[doc = include_str!("../../docs/bibs/111.md")]
// @todo Add a `msnf` field to support milk chocolate products (some professional chocolatier use)
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ChocolateSpec {
    pub cacao_solids: f64,
    pub cocoa_butter: f64,
    pub sugars: Option<f64>,
    pub other_solids: Option<f64>,
}

impl IntoComposition for ChocolateSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            cacao_solids,
            cocoa_butter,
            sugars,
            other_solids,
        } = self;

        let sugars = sugars.unwrap_or(0.0);
        let other_solids = other_solids.unwrap_or(0.0);

        assert_are_positive(&[cacao_solids, cocoa_butter, sugars, other_solids])?;
        assert_is_subset(cocoa_butter, cacao_solids, "cocoa_butter <= cacao_solids")?;
        assert_is_100_percent(cacao_solids + sugars + other_solids)?;

        let cocoa_snf = cacao_solids - cocoa_butter;
        let sugars = Sugars::new().sucrose(sugars);

        let cocoa_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(cocoa_butter)
                    .saturated(cocoa_butter * cacao::STD_SATURATED_FAT_IN_COCOA_BUTTER),
            )
            .proteins(cocoa_snf * cacao::STD_PROTEIN_IN_COCOA_SOLIDS)
            .carbohydrates(
                Carbohydrates::new()
                    .fiber(Fibers::new().other(cocoa_snf * cacao::STD_FIBER_IN_COCOA_SOLIDS))
                    .others_from_total(cocoa_snf * cacao::STD_CARBOHYDRATES_IN_COCOA_SOLIDS)?,
            )
            .others(cocoa_snf * cacao::STD_ASH_IN_COCOA_SOLIDS);

        let other_solids = SolidsBreakdown::new()
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .others(other_solids);

        Ok(Composition::new()
            .energy(cocoa_solids.energy()? + other_solids.energy()?)
            .solids(Solids::new().cocoa(cocoa_solids).other(other_solids))
            .pod(sugars.to_pod()?)
            .pac(
                PAC::new().sugars(sugars.to_pac()?).hardness_factor(
                    cocoa_butter * constants::hf::CACAO_BUTTER + cocoa_snf * constants::hf::COCOA_SOLIDS,
                ),
            ))
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::{
        composition::CompKey,
        ingredients::Category,
        specs::{IngredientSpec, Spec},
    };

    pub(crate) const ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 70% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 70,
        "cocoa_butter": 40,
        "sugars": 30
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 70% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: Spec::ChocolateSpec(ChocolateSpec {
                cacao_solids: 70.0,
                cocoa_butter: 40.0,
                sugars: Some(30.0),
                other_solids: None,
            }),
        });

    pub(crate) static COMP_LINDT_70_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(543.0)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(40.0).saturated(24.0))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(12.0))
                                    .others_from_total(20.4)
                                    .unwrap(),
                            )
                            .proteins(7.35)
                            .others(2.25),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(30.0))),
                    ),
            )
            .pod(30.0)
            .pac(PAC::new().sugars(30.0).hardness_factor(90.0))
    });

    #[test]
    fn into_composition_chocolate_spec_lindt_70_dark_chocolate() {
        let comp = ING_SPEC_CHOCOLATE_LINDT_70_DARK_CHOCOLATE
            .spec
            .into_composition()
            .unwrap();

        assert_eq!(comp.get(CompKey::Energy), 543.0);
        assert_eq!(comp.get(CompKey::TotalFats), 40.0);
        assert_eq!(comp.solids.cocoa.fats.saturated, 24.0);
        assert_eq!(comp.get(CompKey::TotalProteins), 7.35);
        assert_eq!(comp.get(CompKey::Fiber), 12.0);

        assert_eq!(comp.get(CompKey::Sucrose), 30.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 30.0);

        // Added sugars in chocolates is considered part of total sweeteners, not part of Cacao Solids
        assert_eq!(comp.get(CompKey::CacaoSolids), comp.get(CompKey::TotalSolids) - comp.get(CompKey::TotalSweeteners));
        assert_eq!(comp.get(CompKey::CacaoSolids), 70.0);
        assert_eq!(comp.get(CompKey::CocoaButter), 40.0);
        assert_eq!(comp.get(CompKey::CocoaSolids), 30.0);
        assert_eq!(comp.solids.cocoa.others, 2.25);
        assert_eq!(comp.get(CompKey::OtherSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 30.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 30.0);
        assert_eq!(comp.get(CompKey::PACtotal), 30.0);
        assert_eq!(comp.get(CompKey::HF), 90.0);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 95% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 95,
        "cocoa_butter": 57.5,
        "sugars": 3,
        "other_solids": 2
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 95% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: Spec::ChocolateSpec(ChocolateSpec {
                cacao_solids: 95.0,
                cocoa_butter: 57.5,
                sugars: Some(3.0),
                other_solids: Some(2.0),
            }),
        });

    pub(crate) static COMP_LINDT_95_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(608.25)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(57.5).saturated(34.5))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(15.0))
                                    .others_from_total(25.5)
                                    .unwrap(),
                            )
                            .proteins(9.1875)
                            .others(2.8125),
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
    fn into_composition_chocolate_spec_lindt_95_dark_chocolate_other_solids() {
        let comp = ING_SPEC_CHOCOLATE_LINDT_95_DARK_CHOCOLATE_OTHER_SOLIDS
            .spec
            .into_composition()
            .unwrap();

        assert_eq!(comp.get(CompKey::Energy), 608.25);
        assert_eq!(comp.get(CompKey::TotalFats), 57.5);
        assert_eq!(comp.solids.cocoa.fats.saturated, 34.5);
        assert_eq!(comp.get(CompKey::TotalProteins), 9.1875);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 15.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 3.0);

        assert_eq!(comp.get(CompKey::CacaoSolids), 95.0);
        assert_eq!(comp.get(CompKey::CocoaButter), 57.5);
        assert_eq!(comp.get(CompKey::CocoaSolids), 37.5);
        assert_eq_flt_test!(comp.solids.cocoa.others, 2.8125);
        assert_eq!(comp.solids.other.others, 2.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalCarbohydrates), 28.5);
        assert_eq!(comp.get(CompKey::OtherSNFS), 2.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 39.5);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 3.0);
        assert_eq!(comp.get(CompKey::PACtotal), 3.0);
        assert_eq!(comp.get(CompKey::HF), 119.25);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 100% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 100,
        "cocoa_butter": 54
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 100% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: Spec::ChocolateSpec(ChocolateSpec {
                cacao_solids: 100.0,
                cocoa_butter: 54.0,
                sugars: None,
                other_solids: None,
            }),
        });

    pub(crate) static COMP_LINDT_100_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(582.6)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(54.0).saturated(32.4))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(18.4))
                                .others_from_total(31.28)
                                .unwrap(),
                        )
                        .proteins(11.27)
                        .others(3.45),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(131.4))
    });

    #[test]
    fn into_composition_chocolate_spec_lindt_100_dark_chocolate() {
        let comp = ING_SPEC_CHOCOLATE_LINDT_100_DARK_CHOCOLATE
            .spec
            .into_composition()
            .unwrap();

        assert_eq!(comp.get(CompKey::Energy), 582.6);
        assert_eq!(comp.get(CompKey::TotalFats), 54.0);
        assert_eq!(comp.solids.cocoa.fats.saturated, 32.4);
        assert_eq!(comp.get(CompKey::TotalProteins), 11.27);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 18.4);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);

        assert_eq!(comp.get(CompKey::CacaoSolids), 100.0);
        assert_eq!(comp.get(CompKey::CocoaButter), 54.0);
        assert_eq!(comp.get(CompKey::CocoaSolids), 46.0);
        assert_eq_flt_test!(comp.solids.cocoa.others, 3.45);
        assert_eq!(comp.get(CompKey::OtherSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACtotal), 0.0);
        assert_eq!(comp.get(CompKey::HF), 131.4);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_GHIRARDELLI_100_COCOA_POWDER_STR: &str = r#"{
      "name": "Ghirardelli 100% Unsweetened Cocoa Powder",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 100,
        "cocoa_butter": 16.67
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_GHIRARDELLI_100_COCOA_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Ghirardelli 100% Unsweetened Cocoa Powder".to_string(),
            category: Category::Chocolate,
            spec: Spec::ChocolateSpec(ChocolateSpec {
                cacao_solids: 100.0,
                cocoa_butter: 16.67,
                sugars: None,
                other_solids: None,
            }),
        });

    pub(crate) static COMP_GHIRARDELLI_100_COCOA_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(325.023)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(16.67).saturated(10.002))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(33.332))
                                .others_from_total(56.6644)
                                .unwrap(),
                        )
                        .proteins(20.4159)
                        .others(6.2498),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(164.997))
    });

    #[test]
    fn into_composition_chocolate_spec_ghirardelli_100_cocoa_powder() {
        let comp = ING_SPEC_CHOCOLATE_GHIRARDELLI_100_COCOA_POWDER
            .spec
            .into_composition()
            .unwrap();

        // Different similar products list the energy from 250 to 325
        assert_eq!(comp.get(CompKey::Energy), 325.023);
        assert_eq!(comp.get(CompKey::TotalFats), 16.67);
        assert_eq!(comp.solids.cocoa.fats.saturated, 10.002);
        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 20.4159);
        assert_eq_flt_test!(comp.get(CompKey::Fiber), 33.332);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);

        assert_eq!(comp.get(CompKey::CacaoSolids), 100.0);
        assert_eq!(comp.get(CompKey::CocoaButter), 16.67);
        assert_eq!(comp.get(CompKey::CocoaSolids), 83.33);
        assert_eq_flt_test!(comp.solids.cocoa.others, 6.2498);
        assert_eq!(comp.get(CompKey::OtherSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACtotal), 0.0);
        assert_eq!(comp.get(CompKey::HF), 164.997);
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
                    ING_SPEC_CHOCOLATE_GHIRARDELLI_100_COCOA_POWDER_STR,
                    ING_SPEC_CHOCOLATE_GHIRARDELLI_100_COCOA_POWDER.clone(),
                    Some(*COMP_GHIRARDELLI_100_COCOA_POWDER),
                ),
            ]
        });
}
