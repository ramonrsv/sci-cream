//! [`ChocolateLabelSpec`] and associated implementations, for chocolates from nutrition labels

use serde::{Deserialize, Serialize};

use crate::{
    composition::{CompKey, Composition, ToComposition},
    constants::composition::{cacao::STD_WATER_IN_COCOA_POWDER, dairy::milk::STD_LACTOSE_IN_MSNF},
    error::{Error, Result},
    specs::{
        chocolate::{
            ChocolateFat, ChocolateSpec, CocoaPowderSpec,
            util::{
                actual_or, derive_dark_chocolate_solids, derive_milk_chocolate_solids, derive_white_chocolate_solids,
                milk_fat_from_milk_solids, verify_cocoa_sugars_are_intrinsic, verify_declared_minimum,
                verify_protein_is_within_rounding,
            },
        },
        units::Unit,
    },
    validate::{verify_are_above_zero, verify_are_positive, verify_is_subset},
};

#[cfg(doc)]
use crate::constants::composition::{
    cacao,
    dairy::{self, milk},
};

/// Kind of chocolate or cocoa product, which fixes composition details not provided by the label
#[derive(PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum ChocolateKind {
    /// Dark chocolates, with only cacao solids and sugars, all the fat being cocoa butter
    ///
    /// Products can include cacao solids from various sources, e.g. cocoa mass, cocoa powder, or
    /// cocoa butter. Minor ingredients like emulsifiers or flavorings may be present in traces.
    DarkChocolate,
    /// Milk chocolates, with cacao and milk solids and sugars, fat being cocoa butter and milk fat
    ///
    /// Products can include cacao solids from various sources, e.g. cocoa mass, cocoa powder, or
    /// cocoa butter. Milk solids should come primarily from whole milk powder, see
    /// [standard fractions](super#standard-fractions) for the blends that don't fit. Minor
    /// ingredients like emulsifiers or flavorings may be present in traces.
    MilkChocolate,
    /// White chocolates, with cocoa butter, milk solids, and sugars, and no cocoa solids non-fat
    ///
    /// Cocoa butter should be the only cacao ingredient present. Milk solids should come primarily
    /// from whole milk powder, see [standard fractions](super#standard-fractions) for the blends
    /// that don't fit. Minor ingredients like emulsifiers or flavorings may be present in traces.
    WhiteChocolate,
    /// Cocoa powders, without added sugars
    ///
    /// The only ingredient should be cocoa, the composition being only cocoa solids and cocoa
    /// butter, with water at [`cacao::STD_WATER_IN_COCOA_POWDER`].
    CocoaPowder,
}

/// A solids content that a label, spec sheet, or product name declares, as a percentage
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum DeclaredSolids {
    /// The content itself, which replaces the estimate from the label's other figures
    ///
    /// For a value known to be the content, such as a spec sheet's _"actual"_ value or the 100% of
    /// a _"CACAO SOLIDS: 100%"_ bar. A product name's percentage usually restates the label's
    /// minimum, so is a [`Min`](Self::Min), as is any value in doubt: a minimum only bounds the
    /// estimate, never overriding the label's figures.
    #[serde(rename = "actual")]
    Actual(f64),
    /// A minimum, which bounds the estimate from the label's other figures
    ///
    /// For example, Lindt's _"CACAO SOLIDS: 70% MINIMUM"_. An estimate below it is an error, except
    /// in milk and white chocolates, where it can raise the estimate, see
    /// [`derive_milk_chocolate_solids`] and [`derive_white_chocolate_solids`].
    #[serde(rename = "min")]
    Min(f64),
}

/// Carbohydrate content as a label prints it, per serving, in grams, with or without fiber
///
/// Where a label is from, not the name it prints, decides which: US[^123] and Canadian[^124][^125]
/// labels give total carbohydrate, while EU[^126], UK[^127], Mexican[^128], and Australian and
/// New Zealand[^129][^130][^131] ones give available carbohydrate, as the Codex Alimentarius
/// recommends[^132]. So a bare "Carbohydrate" is total in Canada but available in the EU, and
/// "Carbohydrate, total" is available in Australia and New Zealand.
#[doc = include_str!("../../../docs/references/index/123.md")]
#[doc = include_str!("../../../docs/references/index/124.md")]
#[doc = include_str!("../../../docs/references/index/125.md")]
#[doc = include_str!("../../../docs/references/index/126.md")]
#[doc = include_str!("../../../docs/references/index/127.md")]
#[doc = include_str!("../../../docs/references/index/128.md")]
#[doc = include_str!("../../../docs/references/index/129.md")]
#[doc = include_str!("../../../docs/references/index/130.md")]
#[doc = include_str!("../../../docs/references/index/131.md")]
#[doc = include_str!("../../../docs/references/index/132.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum CarbohydrateAmount {
    /// Total carbohydrate, including fiber, as US and Canadian labels print it
    #[serde(rename = "total")]
    Total(f64),
    /// Available carbohydrate, excluding fiber, as EU, UK, Mexican, Australian, and
    /// New Zealand labels print it
    #[serde(rename = "available")]
    Available(f64),
}

impl CarbohydrateAmount {
    /// The carbohydrate the label prints, in grams, total or available as it states it
    pub(crate) const fn printed(self) -> f64 {
        match self {
            Self::Total(grams) | Self::Available(grams) => grams,
        }
    }

    /// The total carbohydrate, in grams, adding the `fiber` back to an available figure
    pub(crate) const fn total(self, fiber: f64) -> f64 {
        match self {
            Self::Total(total) => total,
            Self::Available(available) => available + fiber,
        }
    }
}

/// Carbohydrate figures of a label, per serving, in grams
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct LabelCarbohydrates {
    /// Carbohydrate content, total or available, whichever the label prints
    #[serde(flatten)]
    pub amount: CarbohydrateAmount,
    /// Fiber content, as given on the label, if any
    ///
    /// EU[^126], UK[^127], Australian, and New Zealand[^130] labels may leave out the fiber
    /// content, as may US[^123] labels if it is under 1 g per serving.
    #[doc = include_str!("../../../docs/references/index/123.md")]
    #[doc = include_str!("../../../docs/references/index/126.md")]
    #[doc = include_str!("../../../docs/references/index/127.md")]
    #[doc = include_str!("../../../docs/references/index/130.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiber: Option<f64>,
    /// Sugars content, as given on the label, i.e. total sugars
    ///
    /// This includes added sugars, such as sucrose, as well as lactose naturally present in milk
    /// solids, and sugars intrinsic to the cocoa solids; see [`cacao::STD_SUGARS_IN_COCOA_SOLIDS`].
    pub sugars: f64,
}

/// Spec for chocolates and cocoa powders from nutrition labels, with the solids they may declare
///
/// See the [chocolate documentation](crate::docs#chocolate) for more details on chocolate
/// ingredients and the terminology used to define its various constituent components, e.g. _cacao_
/// solids, cocoa butter, _cocoa_ solids, etc.
///
/// **Note:** This spec is a last resort for estimating composition details from nutrition labels
/// when no detailed composition information is available, e.g. from specification sheets. If such
/// information is available, prefer using the underlying [`ChocolateSpec`] or [`CocoaPowderSpec`]
/// directly. See the [chocolate ingredients](crate::docs::ingredients#chocolates) for more details,
/// guidance, and examples of ingredients defined using all the supported chocolate specifications.
///
/// The figures are per serving, as printed. The [`kind`](Self::kind) fixes composition details that
/// are not provided by the nutrition label, such as whether there is milk, whether there are cocoa
/// solids non-fat, etc. Each kind interprets the figures, scaled to 100 g of product, as follows:
///
/// - [`DarkChocolate`](ChocolateKind::DarkChocolate): a dark chocolate, where all the fat is cocoa
///   butter, and the cacao solids are `100 - sugars`, unless an actual content is declared, which
///   is taken as given. A declared minimum sets a floor for that estimate, the sugars taking the
///   rest, if their rounding and the cocoa's own sugars cover the gap, and it's an error otherwise.
/// - [`CocoaPowder`](ChocolateKind::CocoaPowder): a pure cocoa powder, where all but the water, at
///   [`cacao::STD_WATER_IN_COCOA_POWDER`], is cacao solids. All the fat is cocoa butter, and any
///   sugars are taken as intrinsic to the cocoa, so they are counted as part of its cocoa solids;
///   the label's sugars must not exceed the cocoa's own; see [`cacao::STD_SUGARS_IN_COCOA_SOLIDS`].
/// - [`MilkChocolate`](ChocolateKind::MilkChocolate): a milk chocolate that contains both cacao and
///   milk solids. The protein is shared between the cocoa solids non-fat and the milk solids
///   non-fat (MSNF), at [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`] and [`milk::STD_PROTEIN_IN_MSNF`],
///   and [`derive_milk_chocolate_solids`] splits it by the declared contents, or else by the fiber.
/// - [`WhiteChocolate`](ChocolateKind::WhiteChocolate): a white chocolate that contains both cacao
///   and milk solids, but where the cacao solids are all cocoa butter, and so all the protein is
///   from milk solids. Actual declared contents are taken as given, else the solids are estimated
///   from the protein and fat, floored by declared minimums; see [`derive_white_chocolate_solids`].
///
/// In milk and white chocolates, the milk fat is [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`] of
/// the milk solids, the rest of the fat being cocoa butter, unless a white chocolate's declared
/// cacao solids set the cocoa butter. The label's sugars, less the lactose that the MSNF carry at
/// [`milk::STD_LACTOSE_IN_MSNF`], are taken as sucrose, and the rest of 100 g is other solids.
///
/// **Note:** This spec is a forwarder to the [`ChocolateSpec`] and [`CocoaPowderSpec`] specs. It
/// attempts to interpret the label's figures and declared contents to derive the cacao and milk
/// solids content, but ultimately the composition is determined by the underlying specs via the
/// [standard fractions](super#standard-fractions), so the resulting nutritional composition may
/// differ somewhat from the label's printed figures.
///
/// # Errors
///
/// It is an error if the label gives what its kind can't have, such as a dark chocolate's milk
/// solids or a cocoa powder's added sugars, if the parts exceed 100 g, or if the solids fall short
/// of a declared minimum. A milk or white chocolate's solids must also compose the label's protein,
/// to within its rounding.
///
/// # Examples
///
/// (Lindt 70% Cacao Dark Chocolate, 2026)[^507] per 40 g serving:
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::{
///         CarbohydrateAmount, ChocolateKind, ChocolateLabelSpec, DeclaredSolids,
///         LabelCarbohydrates, units::Unit,
///     },
/// };
///
/// let comp = ChocolateLabelSpec {
///     kind: ChocolateKind::DarkChocolate,
///     serving_size: Unit::Grams(40.0),
///     total_fat: 16.0,
///     carbohydrates: LabelCarbohydrates {
///         amount: CarbohydrateAmount::Total(19.0),
///         fiber: Some(5.0),
///         sugars: 12.0,
///     },
///     protein: 4.0,
///     cacao_solids: Some(DeclaredSolids::Min(70.0)),
///     milk_solids: None,
///     dutch_processed: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::CocoaSolids), 70.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 40.0);
/// assert_eq!(comp.get(CompKey::Sucrose), 30.0);
/// # Ok(()) }
/// ```
///
/// (Green & Black's Organic Milk Chocolate, 2026)[^546] per 100 g:
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_4dp;
/// # use sci_cream::{
/// #     composition::{CompKey, ToComposition},
/// #     specs::{
/// #         CarbohydrateAmount, ChocolateKind, ChocolateLabelSpec, DeclaredSolids,
/// #         LabelCarbohydrates, units::Unit,
/// #     },
/// # };
/// #
/// let comp = ChocolateLabelSpec {
///     kind: ChocolateKind::MilkChocolate,
///     serving_size: Unit::Grams(100.0),
///     total_fat: 36.0,
///     carbohydrates: LabelCarbohydrates {
///         amount: CarbohydrateAmount::Available(48.0),
///         fiber: Some(2.8),
///         sugars: 46.0,
///     },
///     protein: 9.8,
///     cacao_solids: Some(DeclaredSolids::Min(37.0)),
///     milk_solids: Some(DeclaredSolids::Min(24.0)),
///     dutch_processed: None,
/// }.to_composition()?;
///
/// assert_eq_4dp!(comp.get(CompKey::CocoaSolids), 37.0);
/// assert_eq_4dp!(comp.get(CompKey::MilkSolids), 28.2487);
/// assert_eq_4dp!(comp.get(CompKey::TotalProteins), 9.8);
/// assert_eq_4dp!(comp.get(CompKey::TotalSugars), 46.0);
/// # Ok(()) }
/// ```
#[doc = include_str!("../../../docs/references/index/507.md")]
#[doc = include_str!("../../../docs/references/index/546.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ChocolateLabelSpec {
    /// Kind of chocolate or cocoa product; fixes composition details not provided by the label
    pub kind: ChocolateKind,
    /// Serving size the label's figures are given for, in grams
    pub serving_size: Unit,
    /// Fat content per serving, in grams
    ///
    /// Dark chocolates and cocoa powders take it all as cocoa butter, and milk and white chocolates
    /// split it with their milk fat.
    pub total_fat: f64,
    /// Carbohydrate, fiber, and sugars contents per serving, in grams
    pub carbohydrates: LabelCarbohydrates,
    /// Protein content per serving, in grams
    ///
    /// Only milk and white chocolates use it, to estimate their milk solids. Dark chocolates and
    /// cocoa powders take theirs from the [standard fractions](super#standard-fractions).
    pub protein: f64,
    /// Cacao solids content that the label declares, as a percentage of the product as a whole
    ///
    /// They include the cocoa butter, as in [`ChocolateSpec::cacao_solids`], and a white
    /// chocolate's are all cocoa butter.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cacao_solids: Option<DeclaredSolids>,
    /// Milk solids content that the label declares, as a percentage of the product as a whole
    ///
    /// They include the milk fat, as in [`ChocolateSpec::milk_solids`], and only milk and white
    /// chocolates can declare them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub milk_solids: Option<DeclaredSolids>,
    /// Whether a cocoa powder is alkalized, see [`CocoaPowderSpec::dutch_processed`]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dutch_processed: Option<bool>,
}

impl ToComposition for ChocolateLabelSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            kind,
            serving_size,
            total_fat,
            carbohydrates,
            protein,
            cacao_solids,
            milk_solids,
            dutch_processed,
        } = *self;
        let LabelCarbohydrates { amount, fiber, sugars } = carbohydrates;

        let Unit::Grams(serving_size) = serving_size else {
            return Err(Error::UnsupportedCompositionUnit(serving_size));
        };

        let (printed_carbs, label_fiber) = (amount.printed(), fiber.unwrap_or(0.0));
        let total_carbohydrates = amount.total(label_fiber);

        verify_are_above_zero(&[serving_size])?;
        verify_are_positive(&[total_fat, printed_carbs, label_fiber, sugars, protein])?;
        verify_is_subset(sugars + label_fiber, total_carbohydrates, "sugars + fiber <= carbohydrates")?;
        verify_is_subset(
            total_fat + total_carbohydrates + protein,
            serving_size,
            "total_fat + carbohydrates + protein <= serving_size",
        )?;

        if milk_solids.is_some() && matches!(kind, ChocolateKind::DarkChocolate | ChocolateKind::CocoaPowder) {
            return Err(Error::InvalidSpec(format!("{kind:?} labels cannot declare milk solids")));
        }
        if dutch_processed.is_some() && kind != ChocolateKind::CocoaPowder {
            return Err(Error::InvalidSpec(format!("{kind:?} labels cannot be dutch processed")));
        }

        let per_100g = 100.0 / serving_size;
        let (fat, sugars, protein) = (total_fat * per_100g, sugars * per_100g, protein * per_100g);
        let fiber = fiber.map(|fiber| fiber * per_100g);

        let with_milk = |cacao: f64, milk: f64, milk_fat: f64| -> Result<Composition> {
            let (cocoa_butter, sugars) = (fat - milk_fat, sugars - (milk - milk_fat) * STD_LACTOSE_IN_MSNF);
            verify_is_subset(cacao + milk + sugars, 100.0, "cacao_solids + milk_solids + sugars <= 100")?;

            let comp = ChocolateSpec {
                cacao_solids: cacao,
                milk_solids: Some(milk),
                fat: Some(ChocolateFat::Split { cocoa_butter, milk_fat }),
                sugars: Some(sugars),
                other_solids: Some(100.0 - cacao - milk - sugars),
            }
            .to_composition()?;

            verify_protein_is_within_rounding(comp.get(CompKey::TotalProteins), protein, serving_size)?;
            Ok(comp)
        };

        match kind {
            ChocolateKind::DarkChocolate => {
                let (cacao, added_sugars) = derive_dark_chocolate_solids(sugars, cacao_solids);
                verify_is_subset(cacao + added_sugars, 100.0, "cacao_solids + sugars <= 100")?;
                verify_cocoa_sugars_are_intrinsic(sugars - added_sugars, cacao - fat, serving_size)?;

                ChocolateSpec {
                    cacao_solids: cacao,
                    milk_solids: None,
                    fat: Some(ChocolateFat::Total(fat)),
                    sugars: Some(added_sugars),
                    other_solids: Some(100.0 - cacao - added_sugars),
                }
                .to_composition()
            }
            ChocolateKind::CocoaPowder => {
                let water = STD_WATER_IN_COCOA_POWDER * 100.0;
                let cacao = actual_or(cacao_solids, 100.0 - water);
                verify_declared_minimum(cacao_solids, cacao, "cacao_solids")?;
                verify_is_subset(water + cacao, 100.0, "water + cacao_solids <= 100")?;
                verify_cocoa_sugars_are_intrinsic(sugars, cacao - fat, serving_size)?;

                CocoaPowderSpec {
                    cacao_solids: Some(cacao),
                    cocoa_butter: fat,
                    other_solids: Some(100.0 - water - cacao),
                    water: Some(water),
                    dutch_processed,
                }
                .to_composition()
            }
            ChocolateKind::MilkChocolate => {
                let (cacao, milk) = derive_milk_chocolate_solids(protein, fat, fiber, cacao_solids, milk_solids)?;
                with_milk(cacao, milk, milk_fat_from_milk_solids(milk))
            }
            ChocolateKind::WhiteChocolate => {
                let (cacao, milk) = derive_white_chocolate_solids(protein, fat, cacao_solids, milk_solids)?;
                with_milk(cacao, milk, fat - cacao)
            }
        }
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
        composition::{Carbohydrates, CompKey, Fats, Fibers, PAC, SimpleProteins, Solids, SolidsBreakdown, Sugars},
        ingredient::Category,
        specs::IngredientSpec,
    };

    // https://www.lindt.ca/en/lindt-excellence-70-cacao-dark-chocolate-bar-100g
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_LINDT_70_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 70% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "DarkChocolate",
        "serving_size": { "grams": 40 },
        "total_fat": 16,
        "carbohydrates": { "total": 19, "fiber": 5, "sugars": 12 },
        "protein": 4,
        "cacao_solids": { "min": 70 }
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_LINDT_70_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 70% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::DarkChocolate,
                serving_size: Unit::Grams(40.0),
                total_fat: 16.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(19.0),
                    fiber: Some(5.0),
                    sugars: 12.0,
                },
                protein: 4.0,
                cacao_solids: Some(DeclaredSolids::Min(70.0)),
                milk_solids: None,
                dutch_processed: None,
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
    fn to_composition_chocolate_label_spec_lindt_70_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_LINDT_70_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 545.52),
            (CompKey::CocoaSolids, 70.0),
            (CompKey::CocoaButter, 40.0),
            (CompKey::CocoaSNF, 30.0),
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

        assert_eq!(comp.solids.cocoa.minerals, 2.28);
    }

    // https://www.lindt.ca/en/lindt-excellence-95-cacao-dark-chocolate-bar-80g
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_LINDT_95_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 95% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "DarkChocolate",
        "serving_size": { "grams": 40 },
        "total_fat": 23,
        "carbohydrates": { "total": 10, "fiber": 7, "sugars": 1 },
        "protein": 5,
        "cacao_solids": { "min": 95 }
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_LINDT_95_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 95% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::DarkChocolate,
                serving_size: Unit::Grams(40.0),
                total_fat: 23.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(10.0),
                    fiber: Some(7.0),
                    sugars: 1.0,
                },
                protein: 5.0,
                cacao_solids: Some(DeclaredSolids::Min(95.0)),
                milk_solids: None,
                dutch_processed: None,
            }
            .into(),
        });

    pub(crate) static COMP_LINDT_95_DARK_CHOCOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(614.86)
            .solids(
                Solids::new()
                    .cocoa(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(57.5).saturated(34.5))
                            .carbohydrates(
                                Carbohydrates::new()
                                    .fiber(Fibers::new().other(15.12))
                                    .others_from_total(27.56)
                                    .unwrap(),
                            )
                            .proteins(SimpleProteins::from_total(9.4))
                            .minerals(3.04),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(2.5))),
                    ),
            )
            .pod(2.5)
            .pac(PAC::new().sugars(2.5).hardness_factor(123.75))
    });

    #[test]
    fn to_composition_chocolate_label_spec_lindt_95_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_LINDT_95_DARK_CHOCOLATE);

        // 1 g of sugars per 40 g leaves 97.5% cacao solids, above the declared 95% minimum, rather
        // than 95% with the rest as other solids
        comp.assert_all_keys(&[
            (CompKey::Energy, 614.86),
            (CompKey::CocoaSolids, 97.5),
            (CompKey::CocoaButter, 57.5),
            (CompKey::CocoaSNF, 40.0),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalFats, 57.5),
            (CompKey::TotalSNF, 42.5),
            (CompKey::TotalSNFS, 40.0),
            (CompKey::TotalProteins, 9.4),
            (CompKey::TotalMinerals, 3.04),
            (CompKey::Water, 0.0),
            (CompKey::TotalCarbohydrates, 30.06),
            (CompKey::TotalFiber, 15.12),
            (CompKey::TotalSugars, 2.5),
            (CompKey::Sucrose, 2.5),
            (CompKey::TotalSweeteners, 2.5),
            (CompKey::POD, 2.5),
            (CompKey::NetPAC, -121.25),
            (CompKey::TotalPAC, 2.5),
            (CompKey::PACsgr, 2.5),
            (CompKey::HF, 123.75),
            (CompKey::SaturatedFat, 34.5),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_flt!(comp.solids.cocoa.minerals, 3.04);
        assert_eq!(comp.solids.other.others, 0.0);
    }

    // https://www.lindt.ca/en/lindt-excellence-100-cacao-bar-50g
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_LINDT_100_DARK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt EXCELLENCE 100% Cacao Dark Chocolate",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "DarkChocolate",
        "serving_size": { "grams": 50 },
        "total_fat": 27,
        "carbohydrates": { "total": 14, "fiber": 8, "sugars": 0 },
        "protein": 7,
        "cacao_solids": { "actual": 100 }
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_LINDT_100_DARK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt EXCELLENCE 100% Cacao Dark Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::DarkChocolate,
                serving_size: Unit::Grams(50.0),
                total_fat: 27.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(14.0),
                    fiber: Some(8.0),
                    sugars: 0.0,
                },
                protein: 7.0,
                cacao_solids: Some(DeclaredSolids::Actual(100.0)),
                milk_solids: None,
                dutch_processed: None,
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
    fn to_composition_chocolate_label_spec_lindt_100_dark_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_LINDT_100_DARK_CHOCOLATE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 586.464),
            (CompKey::CocoaSolids, 100.0),
            (CompKey::CocoaButter, 54.0),
            (CompKey::CocoaSNF, 46.0),
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

    // https://fdc.nal.usda.gov/food-details/167587/nutrients
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_USDA_MILK_CHOCOLATE_STR: &str = r#"{
      "name": "USDA Milk Chocolate (Label)",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "MilkChocolate",
        "serving_size": { "grams": 100 },
        "total_fat": 29.7,
        "carbohydrates": { "total": 59.4, "fiber": 3.4, "sugars": 51.5 },
        "protein": 7.65
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_USDA_MILK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Milk Chocolate (Label)".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::MilkChocolate,
                serving_size: Unit::Grams(100.0),
                total_fat: 29.7,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(59.4),
                    fiber: Some(3.4),
                    sugars: 51.5,
                },
                protein: 7.65,
                cacao_solids: None,
                milk_solids: None,
                dutch_processed: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_chocolate_label_spec_usda_milk_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_USDA_MILK_CHOCOLATE);

        // The fiber sets the cocoa solids non-fat, so the label's fat, protein, fiber, and sugars
        // all come back, the sugars as the MSNF's lactose and the rest sucrose
        comp.assert_keys(&[
            (CompKey::MilkSolids, 19.950_427),
            (CompKey::MilkFat, 5.187_111),
            (CompKey::MSNF, 14.763_316),
            (CompKey::CocoaSolids, 33.507_598),
            (CompKey::CocoaButter, 24.512_889),
            (CompKey::CocoaSNF, 8.994_709),
            (CompKey::OtherSNFS, 3.087_982),
            (CompKey::TotalFats, 29.7),
            (CompKey::TotalProteins, 7.65),
            (CompKey::TotalFiber, 3.4),
            (CompKey::TotalSugars, 51.5),
            (CompKey::Sucrose, 43.453_993),
            (CompKey::Lactose, 8.046_007),
        ]);
    }

    // https://www.lindt.co.uk/lindt-classic-recipe-milk-chocolate-100g
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE_STR: &str = r#"{
      "name": "Lindt Classic Milk Chocolate",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "MilkChocolate",
        "serving_size": { "grams": 100 },
        "total_fat": 32,
        "carbohydrates": { "available": 56, "sugars": 55 },
        "protein": 7,
        "cacao_solids": { "min": 30 },
        "milk_solids": { "min": 20 }
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lindt Classic Milk Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::MilkChocolate,
                serving_size: Unit::Grams(100.0),
                total_fat: 32.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Available(56.0),
                    fiber: None,
                    sugars: 55.0,
                },
                protein: 7.0,
                cacao_solids: Some(DeclaredSolids::Min(30.0)),
                milk_solids: Some(DeclaredSolids::Min(20.0)),
                dutch_processed: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_chocolate_label_spec_lindt_classic_milk_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE);

        // Without a fiber, the cacao minimum stands in for the cacao solids
        comp.assert_keys(&[
            (CompKey::MilkSolids, 22.061_429),
            (CompKey::MilkFat, 5.735_972),
            (CompKey::MSNF, 16.325_458),
            (CompKey::CocoaSolids, 30.0),
            (CompKey::CocoaButter, 26.264_028),
            (CompKey::CocoaSNF, 3.735_972),
            (CompKey::OtherSNFS, 1.835_945),
            (CompKey::TotalFats, 32.0),
            (CompKey::TotalProteins, 7.0),
            (CompKey::TotalFiber, 1.412_197),
            (CompKey::TotalSugars, 55.0),
            (CompKey::Sucrose, 46.102_626),
            (CompKey::Lactose, 8.897_374),
        ]);
    }

    // https://www.ocado.com/products/green-black-s-organic-milk-chocolate-bar/15055011
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_MILK_CHOCOLATE_STR: &str = r#"{
      "name": "Green & Black's Organic Milk Chocolate",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "MilkChocolate",
        "serving_size": { "grams": 100 },
        "total_fat": 36,
        "carbohydrates": { "available": 48, "fiber": 2.8, "sugars": 46 },
        "protein": 9.8,
        "cacao_solids": { "min": 37 },
        "milk_solids": { "min": 24 }
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_MILK_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Green & Black's Organic Milk Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::MilkChocolate,
                serving_size: Unit::Grams(100.0),
                total_fat: 36.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Available(48.0),
                    fiber: Some(2.8),
                    sugars: 46.0,
                },
                protein: 9.8,
                cacao_solids: Some(DeclaredSolids::Min(37.0)),
                milk_solids: Some(DeclaredSolids::Min(24.0)),
                dutch_processed: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_chocolate_label_spec_green_and_blacks_milk_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_MILK_CHOCOLATE);

        // The fiber's 35.9% cacao solids fall short of the declared 37%, which floors them, so the
        // protein comes back and the fiber doesn't
        comp.assert_keys(&[
            (CompKey::MilkSolids, 28.248_671),
            (CompKey::MilkFat, 7.344_654),
            (CompKey::MSNF, 20.904_017),
            (CompKey::CocoaSolids, 37.0),
            (CompKey::CocoaButter, 28.655_346),
            (CompKey::CocoaSNF, 8.344_654),
            (CompKey::OtherSNFS, 0.144_018),
            (CompKey::TotalFats, 36.0),
            (CompKey::TotalProteins, 9.8),
            (CompKey::TotalFiber, 3.154_279),
            (CompKey::TotalSugars, 46.0),
            (CompKey::Sucrose, 34.607_311),
            (CompKey::Lactose, 11.392_689),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/167571/nutrients
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_USDA_WHITE_CHOCOLATE_STR: &str = r#"{
      "name": "USDA White Chocolate (Label)",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "WhiteChocolate",
        "serving_size": { "grams": 100 },
        "total_fat": 32.1,
        "carbohydrates": { "total": 59.2, "fiber": 0.2, "sugars": 59 },
        "protein": 5.87
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_USDA_WHITE_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA White Chocolate (Label)".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::WhiteChocolate,
                serving_size: Unit::Grams(100.0),
                total_fat: 32.1,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(59.2),
                    fiber: Some(0.2),
                    sugars: 59.0,
                },
                protein: 5.87,
                cacao_solids: None,
                milk_solids: None,
                dutch_processed: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_chocolate_label_spec_usda_white_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_USDA_WHITE_CHOCOLATE);

        // All the protein is milk's, and with no cocoa solids non-fat, the fiber stays in the other
        // solids rather than coming back as fiber
        comp.assert_keys(&[
            (CompKey::MilkSolids, 21.153_153),
            (CompKey::MilkFat, 5.499_820),
            (CompKey::MSNF, 15.653_333),
            (CompKey::MilkProteins, 5.87),
            (CompKey::CocoaSolids, 26.600_180),
            (CompKey::CocoaButter, 26.600_180),
            (CompKey::CocoaSNF, 0.0),
            (CompKey::OtherSNFS, 1.777_733),
            (CompKey::TotalFats, 32.1),
            (CompKey::TotalProteins, 5.87),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 59.0),
            (CompKey::Sucrose, 50.468_933),
            (CompKey::Lactose, 8.531_067),
        ]);
    }

    // https://www.ocado.com/products/green-black-s-organic-white-chocolate-bar/13811011
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_WHITE_CHOCOLATE_STR: &str = r#"{
      "name": "Green & Black's Organic White Chocolate",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "WhiteChocolate",
        "serving_size": { "grams": 100 },
        "total_fat": 38,
        "carbohydrates": { "available": 51, "fiber": 0, "sugars": 51 },
        "protein": 7.9,
        "cacao_solids": { "min": 30 },
        "milk_solids": { "min": 26 }
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_WHITE_CHOCOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Green & Black's Organic White Chocolate".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::WhiteChocolate,
                serving_size: Unit::Grams(100.0),
                total_fat: 38.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Available(51.0),
                    fiber: Some(0.0),
                    sugars: 51.0,
                },
                protein: 7.9,
                cacao_solids: Some(DeclaredSolids::Min(30.0)),
                milk_solids: Some(DeclaredSolids::Min(26.0)),
                dutch_processed: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_chocolate_label_spec_green_and_blacks_white_chocolate() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_WHITE_CHOCOLATE);

        // All the protein is milk's, and all the cacao solids cocoa butter
        comp.assert_keys(&[
            (CompKey::MilkSolids, 28.468_468),
            (CompKey::MilkFat, 7.401_802),
            (CompKey::MSNF, 21.066_667),
            (CompKey::MilkProteins, 7.9),
            (CompKey::CocoaSolids, 30.598_198),
            (CompKey::CocoaButter, 30.598_198),
            (CompKey::CocoaSNF, 0.0),
            (CompKey::OtherSNFS, 1.414_667),
            (CompKey::TotalFats, 38.0),
            (CompKey::TotalProteins, 7.9),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 51.0),
            (CompKey::Sucrose, 39.518_667),
            (CompKey::Lactose, 11.481_333),
        ]);
    }

    // https://fdc.nal.usda.gov/food-details/169593/nutrients
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_USDA_COCOA_POWDER_STR: &str = r#"{
      "name": "USDA Unsweetened Cocoa Powder (Label)",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "CocoaPowder",
        "serving_size": { "grams": 100 },
        "total_fat": 13.7,
        "carbohydrates": { "total": 57.9, "fiber": 37, "sugars": 1.75 },
        "protein": 19.6
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_USDA_COCOA_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Unsweetened Cocoa Powder (Label)".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::CocoaPowder,
                serving_size: Unit::Grams(100.0),
                total_fat: 13.7,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(57.9),
                    fiber: Some(37.0),
                    sugars: 1.75,
                },
                protein: 19.6,
                cacao_solids: None,
                milk_solids: None,
                dutch_processed: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_chocolate_label_spec_usda_cocoa_powder() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_USDA_COCOA_POWDER);

        // The standard water leaves the cacao solids, and the intrinsic sugars stay inside them
        comp.assert_keys(&[
            (CompKey::CocoaSolids, 97.0),
            (CompKey::CocoaButter, 13.7),
            (CompKey::CocoaSNF, 83.3),
            (CompKey::TotalFats, 13.7),
            (CompKey::Water, 3.0),
            (CompKey::TotalSugars, 0.0),
        ]);
    }

    // https://www.ghirardelli.com/premium-baking-cocoa-100-unsweetened-cocoa-powder-6-bags-61703cs
    pub(crate) const ING_SPEC_CHOCOLATE_LABEL_GHIRARDELLI_100_COCOA_POWDER_STR: &str = r#"{
      "name": "Ghirardelli 100% Unsweetened Cocoa Powder",
      "category": "Chocolate",
      "ChocolateLabelSpec": {
        "kind": "CocoaPowder",
        "serving_size": { "grams": 6 },
        "total_fat": 1,
        "carbohydrates": { "total": 3, "fiber": 2, "sugars": 0 },
        "protein": 1
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_LABEL_GHIRARDELLI_100_COCOA_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Ghirardelli 100% Unsweetened Cocoa Powder".to_string(),
            category: Category::Chocolate,
            spec: ChocolateLabelSpec {
                kind: ChocolateKind::CocoaPowder,
                serving_size: Unit::Grams(6.0),
                total_fat: 1.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(3.0),
                    fiber: Some(2.0),
                    sugars: 0.0,
                },
                protein: 1.0,
                cacao_solids: None,
                milk_solids: None,
                dutch_processed: None,
            }
            .into(),
        });

    pub(crate) static COMP_GHIRARDELLI_100_COCOA_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(325.448)
            .solids(
                Solids::new().cocoa(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(16.666_667).saturated(10.0))
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().other(30.366))
                                .others_from_total(55.349_667)
                                .unwrap(),
                        )
                        .proteins(SimpleProteins::from_total(18.878_333))
                        .minerals(6.105_333),
                ),
            )
            .pod(0.0)
            .pac(PAC::new().hardness_factor(159.6))
    });

    #[test]
    fn to_composition_chocolate_label_spec_ghirardelli_100_cocoa_powder() {
        let comp = asset_composition(&ING_SPEC_CHOCOLATE_LABEL_GHIRARDELLI_100_COCOA_POWDER);

        comp.assert_all_keys(&[
            // Different similar products list the energy from 250 to 325
            (CompKey::Energy, 325.448),
            (CompKey::CocoaSolids, 97.0),
            (CompKey::CocoaButter, 16.666_667),
            (CompKey::CocoaSNF, 80.333_333),
            (CompKey::OtherSNFS, 0.0),
            (CompKey::TotalSolids, 97.0),
            (CompKey::TotalFats, 16.666_667),
            (CompKey::TotalSNF, 80.333_333),
            (CompKey::TotalSNFS, 80.333_333),
            (CompKey::TotalProteins, 18.878_333),
            (CompKey::TotalMinerals, 6.105_333),
            (CompKey::Water, 3.0),
            (CompKey::TotalCarbohydrates, 55.349_667),
            (CompKey::TotalFiber, 30.366),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::NetPAC, -159.6),
            (CompKey::TotalPAC, 0.0),
            (CompKey::HF, 159.6),
            (CompKey::SaturatedFat, 10.0),
            (CompKey::TransFat, 0.0),
        ]);

        assert_eq_6dp!(comp.solids.cocoa.minerals, 6.105_333);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_CHOCOLATE_LABEL: LazyLock<
        Vec<(&str, IngredientSpec, Option<Composition>)>,
    > = LazyLock::new(|| {
        vec![
            (
                ING_SPEC_CHOCOLATE_LABEL_LINDT_70_DARK_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_LINDT_70_DARK_CHOCOLATE.clone(),
                Some(*COMP_LINDT_70_DARK_CHOCOLATE),
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_LINDT_95_DARK_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_LINDT_95_DARK_CHOCOLATE.clone(),
                Some(*COMP_LINDT_95_DARK_CHOCOLATE),
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_LINDT_100_DARK_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_LINDT_100_DARK_CHOCOLATE.clone(),
                Some(*COMP_LINDT_100_DARK_CHOCOLATE),
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_USDA_MILK_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_USDA_MILK_CHOCOLATE.clone(),
                None,
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE.clone(),
                None,
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_MILK_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_MILK_CHOCOLATE.clone(),
                None,
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_USDA_WHITE_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_USDA_WHITE_CHOCOLATE.clone(),
                None,
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_WHITE_CHOCOLATE_STR,
                ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_WHITE_CHOCOLATE.clone(),
                None,
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_USDA_COCOA_POWDER_STR,
                ING_SPEC_CHOCOLATE_LABEL_USDA_COCOA_POWDER.clone(),
                None,
            ),
            (
                ING_SPEC_CHOCOLATE_LABEL_GHIRARDELLI_100_COCOA_POWDER_STR,
                ING_SPEC_CHOCOLATE_LABEL_GHIRARDELLI_100_COCOA_POWDER.clone(),
                Some(*COMP_GHIRARDELLI_100_COCOA_POWDER),
            ),
        ]
    });

    /// Lindt EXCELLENCE 70%'s label, the base of the cases below
    fn lindt_70_label() -> ChocolateLabelSpec {
        ING_SPEC_CHOCOLATE_LABEL_LINDT_70_DARK_CHOCOLATE
            .spec
            .clone()
            .into_chocolate_label_spec()
            .unwrap()
    }

    #[test]
    fn to_composition_available_carbohydrates_exclude_the_fiber() {
        let available = ChocolateLabelSpec {
            carbohydrates: LabelCarbohydrates {
                amount: CarbohydrateAmount::Available(14.0),
                ..lindt_70_label().carbohydrates
            },
            ..lindt_70_label()
        };

        assert_eq!(available.to_composition().unwrap(), lindt_70_label().to_composition().unwrap());
    }

    #[test]
    fn to_composition_err_on_negative_figure() {
        let label = lindt_70_label();
        let carbohydrates = label.carbohydrates;
        let negative_labels = [
            ChocolateLabelSpec {
                total_fat: -1.0,
                ..label
            },
            ChocolateLabelSpec { protein: -1.0, ..label },
            ChocolateLabelSpec {
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Available(-1.0),
                    ..carbohydrates
                },
                ..label
            },
            ChocolateLabelSpec {
                carbohydrates: LabelCarbohydrates {
                    fiber: Some(-1.0),
                    ..carbohydrates
                },
                ..label
            },
            ChocolateLabelSpec {
                carbohydrates: LabelCarbohydrates {
                    sugars: -1.0,
                    ..carbohydrates
                },
                ..label
            },
        ];

        for label in negative_labels {
            assert!(matches!(label.to_composition(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn to_composition_err_when_sugars_and_fiber_exceed_the_carbohydrates() {
        let label = lindt_70_label();
        let carbohydrates = label.carbohydrates;
        let exceeding_labels = [
            ChocolateLabelSpec {
                carbohydrates: LabelCarbohydrates {
                    fiber: Some(8.0),
                    ..carbohydrates
                },
                ..label
            },
            ChocolateLabelSpec {
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Available(11.0),
                    ..carbohydrates
                },
                ..label
            },
        ];

        for label in exceeding_labels {
            assert!(matches!(label.to_composition(), Err(Error::InvalidComposition(_))));
        }
    }

    #[test]
    fn to_composition_err_when_the_figures_exceed_the_serving() {
        let label = ChocolateLabelSpec {
            total_fat: 18.0,
            ..lindt_70_label()
        };
        assert!(matches!(label.to_composition(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_err_on_a_serving_size_in_milliliters() {
        let label = ChocolateLabelSpec {
            serving_size: Unit::Milliliters(40.0),
            ..lindt_70_label()
        };
        assert!(matches!(label.to_composition(), Err(Error::UnsupportedCompositionUnit(_))));
    }

    #[test]
    fn to_composition_err_on_a_serving_size_not_above_zero() {
        for serving_size in [0.0, -40.0] {
            let label = ChocolateLabelSpec {
                serving_size: Unit::Grams(serving_size),
                total_fat: 0.0,
                carbohydrates: LabelCarbohydrates {
                    amount: CarbohydrateAmount::Total(0.0),
                    fiber: None,
                    sugars: 0.0,
                },
                protein: 0.0,
                ..lindt_70_label()
            };
            assert!(matches!(label.to_composition(), Err(Error::CompositionNotAboveZero(_))));
        }
    }

    #[test]
    fn to_composition_err_below_the_declared_cacao_solids_minimum() {
        let label = ChocolateLabelSpec {
            cacao_solids: Some(DeclaredSolids::Min(75.0)),
            ..lindt_70_label()
        };
        assert!(matches!(label.to_composition(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_cacao_solids_minimum_allows_for_rounded_up_sugars() {
        // Lindt 70%'s label on a 13 g serving, whose 3.9 g of sugars print as 4 g. Alone, those
        // 30.8% would leave 69.2% cacao solids, short of the declared 70% only by the rounding.
        let label = ChocolateLabelSpec {
            serving_size: Unit::Grams(13.0),
            total_fat: 5.0,
            carbohydrates: LabelCarbohydrates {
                amount: CarbohydrateAmount::Total(6.0),
                fiber: Some(2.0),
                sugars: 4.0,
            },
            protein: 1.0,
            ..lindt_70_label()
        };
        let comp = label.to_composition().unwrap();

        assert_eq_flt!(comp.get(CompKey::CocoaSolids), 70.0);
        assert_eq_flt!(comp.get(CompKey::TotalSugars), 30.0);
    }

    #[test]
    fn to_composition_actual_cacao_solids_leave_the_rest_as_other_solids() {
        let comp = ChocolateLabelSpec {
            cacao_solids: Some(DeclaredSolids::Actual(68.0)),
            ..lindt_70_label()
        }
        .to_composition()
        .unwrap();

        assert_eq!(comp.get(CompKey::CocoaSolids), 68.0);
        assert_eq_flt!(comp.get(CompKey::OtherSNFS), 2.0);
    }

    #[test]
    fn to_composition_err_when_actual_cacao_solids_leave_no_room_for_the_sugars() {
        let label = ChocolateLabelSpec {
            cacao_solids: Some(DeclaredSolids::Actual(75.0)),
            ..lindt_70_label()
        };
        assert!(matches!(label.to_composition(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_err_when_the_milk_chocolate_solids_exceed_100_g() {
        // Lindt Classic Milk with a mistaken 15% actual milk solids, too few for its protein: the
        // protein left gives more cocoa solids non-fat than 100 g has room for
        let label = ChocolateLabelSpec {
            milk_solids: Some(DeclaredSolids::Actual(15.0)),
            ..ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE
                .spec
                .clone()
                .into_chocolate_label_spec()
                .unwrap()
        };
        assert!(matches!(label.to_composition(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_actual_white_cacao_solids_set_the_fat_split() {
        let comp = ChocolateLabelSpec {
            cacao_solids: Some(DeclaredSolids::Actual(30.0)),
            ..ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_WHITE_CHOCOLATE
                .spec
                .clone()
                .into_chocolate_label_spec()
                .unwrap()
        }
        .to_composition()
        .unwrap();

        assert_eq!(comp.get(CompKey::CocoaButter), 30.0);
        assert_eq!(comp.get(CompKey::CocoaSNF), 0.0);
        assert_eq!(comp.get(CompKey::MilkFat), 8.0);
        assert_eq_flt!(comp.get(CompKey::TotalProteins), 7.9);
    }

    #[test]
    fn to_composition_declared_solids_compose_the_protein_within_rounding() {
        // Lindt Classic Milk at its 30% cacao solids minimum and 21% milk solids, taken as actual,
        // composes 6.6406 g of protein, within the 6.5-7.5 g that its printed 7 g may be
        let comp = ChocolateLabelSpec {
            cacao_solids: Some(DeclaredSolids::Actual(30.0)),
            milk_solids: Some(DeclaredSolids::Actual(21.0)),
            ..ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE
                .spec
                .clone()
                .into_chocolate_label_spec()
                .unwrap()
        }
        .to_composition()
        .unwrap();

        assert_eq_6dp!(comp.get(CompKey::TotalProteins), 6.6406);
    }

    #[test]
    fn to_composition_err_when_declared_solids_compose_a_protein_beyond_rounding() {
        // Taken as actual, Lindt Classic Milk's minima compose 6.302 g of protein against its 7 g,
        // and Green & Black's White's milk solids minimum 7.215 g against its 7.9 g
        let lindt = ChocolateLabelSpec {
            cacao_solids: Some(DeclaredSolids::Actual(30.0)),
            milk_solids: Some(DeclaredSolids::Actual(20.0)),
            ..ING_SPEC_CHOCOLATE_LABEL_LINDT_CLASSIC_MILK_CHOCOLATE
                .spec
                .clone()
                .into_chocolate_label_spec()
                .unwrap()
        };
        let green_and_blacks = ChocolateLabelSpec {
            milk_solids: Some(DeclaredSolids::Actual(26.0)),
            ..ING_SPEC_CHOCOLATE_LABEL_GREEN_AND_BLACKS_WHITE_CHOCOLATE
                .spec
                .clone()
                .into_chocolate_label_spec()
                .unwrap()
        };

        for label in [lindt, green_and_blacks] {
            assert!(matches!(label.to_composition(), Err(Error::InvalidComposition(_))));
        }
    }

    #[test]
    fn to_composition_err_when_milk_solids_are_declared_without_milk() {
        for kind in [ChocolateKind::DarkChocolate, ChocolateKind::CocoaPowder] {
            let label = ChocolateLabelSpec {
                kind,
                milk_solids: Some(DeclaredSolids::Min(1.0)),
                ..lindt_70_label()
            };
            assert!(matches!(label.to_composition(), Err(Error::InvalidSpec(_))));
        }
    }

    #[test]
    fn to_composition_err_when_dutch_processed_is_not_a_cocoa_powder() {
        let label = ChocolateLabelSpec {
            dutch_processed: Some(true),
            ..lindt_70_label()
        };
        assert!(matches!(label.to_composition(), Err(Error::InvalidSpec(_))));
    }

    #[test]
    fn to_composition_err_when_a_cocoa_powder_has_added_sugars() {
        // A drinking chocolate's 18 g of sugars per 25 g, far beyond a cocoa powder's own
        let label = ChocolateLabelSpec {
            kind: ChocolateKind::CocoaPowder,
            serving_size: Unit::Grams(25.0),
            total_fat: 2.5,
            carbohydrates: LabelCarbohydrates {
                amount: CarbohydrateAmount::Total(20.0),
                fiber: Some(2.0),
                sugars: 18.0,
            },
            protein: 1.5,
            cacao_solids: None,
            milk_solids: None,
            dutch_processed: None,
        };
        assert!(matches!(label.to_composition(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn label_carbohydrates_serialize_flattened() {
        for (json, amount) in [
            (r#"{"total":19.0,"fiber":5.0,"sugars":12.0}"#, CarbohydrateAmount::Total(19.0)),
            (r#"{"available":14.0,"fiber":5.0,"sugars":12.0}"#, CarbohydrateAmount::Available(14.0)),
        ] {
            let carbohydrates = LabelCarbohydrates {
                amount,
                fiber: Some(5.0),
                sugars: 12.0,
            };
            assert_eq!(serde_json::to_string(&carbohydrates).unwrap(), json);
            assert_eq!(serde_json::from_str::<LabelCarbohydrates>(json).unwrap(), carbohydrates);
        }
    }

    #[test]
    fn label_carbohydrates_deserialization_rejects_both_or_neither_amount() {
        for json in [
            r#"{"total":19,"available":14,"sugars":12}"#,
            r#"{"fiber":5,"sugars":12}"#,
            r#"{"totall":19,"sugars":12}"#,
        ] {
            assert!(serde_json::from_str::<LabelCarbohydrates>(json).is_err());
        }
    }

    #[test]
    fn declared_solids_serialize_as_actual_or_min() {
        for (json, declared) in [
            (r#"{"actual":23.0}"#, DeclaredSolids::Actual(23.0)),
            (r#"{"min":30.0}"#, DeclaredSolids::Min(30.0)),
        ] {
            assert_eq!(serde_json::to_string(&declared).unwrap(), json);
            assert_eq!(serde_json::from_str::<DeclaredSolids>(json).unwrap(), declared);
        }
    }
}
