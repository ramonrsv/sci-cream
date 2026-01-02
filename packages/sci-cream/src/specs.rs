use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "diesel")]
use crate::diesel::ingredients;
#[cfg(feature = "diesel")]
use diesel::{Queryable, Selectable};

use crate::{
    composition::{Alcohol, Composition, Micro, PAC, ScaleComponents, Solids, SolidsBreakdown, Sugars, Sweeteners},
    constants,
    error::{Error, Result},
    ingredients::{Category, Ingredient},
};

#[cfg(doc)]
use crate::{
    composition::CompKey,
    constants::{STD_LACTOSE_IN_MSNF, STD_MSNF_IN_MILK_SERUM},
};

pub trait IntoComposition {
    fn into_composition(self) -> Result<Composition>;
}

/// Indicates whether composition values for an ingredient are a percentage of dry or total weight.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum CompositionBasis {
    /// Composition values are given as percentages of the dry weight (solids) of the ingredient.
    ///
    /// The composition values must add up to 100%, and are then scaled by the `solids` value to get
    /// the actual composition of the ingredient as a whole, equivalent to a `ByTotalWeight` basis.
    ByDryWeight { solids: f64 },
    /// Composition values are given as percentages of the total weight of the ingredient.
    ///
    /// The composition values plus the `water` value must add up to 100%.
    ByTotalWeight { water: f64 },
}

/// Spec for trivial dairy ingredients, e.g. Milk, Cream, Milk Powder, etc.
///
/// For most ingredients it is sufficient to specify the fat content; the rest of the components are
/// calculated from standard values, notably [`STD_MSNF_IN_MILK_SERUM`] and [`STD_LACTOSE_IN_MSNF`].
/// For milk powder ingredients it's necessary to specify the `msnf`, e.g. 97 for Skimmed MIlk
/// Powder - 3% water, no fat, the rest is `msnf`, or 73 for Whole Milk Powder - total less 27% fat.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySpec {
    pub fat: f64,
    pub msnf: Option<f64>,
}

/// Spec for sweeteners, with a specified [`Sweeteners`] composition and optional POD/PAC
///
/// If [`basis`](Self::basis) is [`ByDryWeight`](CompositionBasis::ByDryWeight), the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the dry weight (solids), its total and [`other_solids`](Self::other_solids) adding up to 100.
/// For example, Invert Sugar might be composed of `sugars.glucose = 42.5`, `sugars.fructose =
/// 42.5`, and `sugars.sucrose = 15`, with `ByDryWeight { solids: 80 }`, meaning that 85% of the
/// sucrose was split into glucose/fructose,  with 15% sucrose remaining, and the syrup containing
/// 20% water. If [`basis`](Self::basis) is [`ByTotalWeight`](CompositionBasis::ByTotalWeight), then
/// the values in [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a
/// percentage of the total weight of the ingredient, their total plus `other_solids` and `water`
/// adding up to 100. For example, Honey might be composed of `sugars.glucose = 36`,
/// `sugars.fructose = 41`, `sugars.sucrose = 2`, and `other_solids = 1`, with `ByTotalWeight {
/// water = 20 }`.
///
/// [`other_solids`](Self::other_solids) represents any non-sweetener impurities that may be in the
/// ingredient, e.g. minerals, pollen, etc., for example 1% in Honey. This value should rarely be
/// needed, and is assumed to be zero if not specified. This field is also scaled depending on the
/// chosen [`basis`](Self::basis).
///
/// If the POD or PAC value is not specified, then it is automatically calculated based on the
/// composition of known mono- and disaccharides, and in the case of `ByDryWeight` basis it's scaled
/// accordingly to represent the values for the ingredient as a whole. If the values are specified,
/// then they are used as-is, ignoring internal calculations, and without any scaling. For automatic
/// calculations the polysaccharide component is ignored, and it is an error if `sugars.unspecified`
/// or `sweeteners.artificial` are non-zero.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SweetenerSpec {
    pub sweeteners: Sweeteners,
    pub other_solids: Option<f64>,
    #[serde(flatten)]
    pub basis: CompositionBasis,
    pub pod: Option<f64>,
    pub pac: Option<f64>,
}

/// Spec for fruit ingredients, with a specified [`Sugars`] composition and water content
///
/// Fruits are specified by their sugar content (glucose, fructose, sucrose, etc.), water content,
/// and optional fat content. The remaining portion up to 100% is assumed to be non-sugar, non-fat
/// solids (snfs).
///
/// The composition for fruit ingredients can usually be found in food composition databases, like
/// [USDA FoodData Central](https://fdc.nal.usda.gov/food-search).
///
/// # Examples
///
/// (Strawberries, raw, 2019)[^101] per 100g:
/// - Water: 91g
/// - Total lipid (fat): 0.3g
/// - Sucrose: 0.47g
/// - Glucose: 1.99g
/// - Fructose: 2.44g
///
/// ```
/// use sci_cream::{
///     composition::{CompKey, Sugars, Sweeteners},
///     specs::{FruitSpec, IntoComposition}
/// };
///
/// let comp = FruitSpec {
///     sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
///     water: 91.0,
///     fat: Some(0.3),
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::Glucose), 1.99);
/// assert_eq!(comp.get(CompKey::Fructose), 2.44);
/// assert_eq!(comp.get(CompKey::Sucrose), 0.47);
///
/// assert_eq!(comp.get(CompKey::POD), 6.29116);
/// assert_eq!(comp.get(CompKey::PACsgr), 8.887);
/// ```
#[doc = include_str!("../docs/bibs/101.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FruitSpec {
    pub sugars: Sugars,
    pub water: f64,
    pub fat: Option<f64>,
}

/// Spec for chocolate ingredients, with cacao solids, cocoa butter, and optional sugar
///
/// The terminology around chocolate ingredients can be confusing and used inconsistently across
/// different industries and stages of processing. For clarity, within this library we define:
///   - _Cacao_ solids: the total dry matter content derived from the cacao bean (sometimes referred
///     to as "chocolate liquor", "cocoa mass", etc.) including both cocoa butter (fat) and cocoa
///     solids (non-fat solids). This is the percentage advertised on chocolate packaging, e.g. 70%
///     dark chocolate has 70% cacao solids. Corresponds to [`cacao_solids`](Self::cacao_solids).
///     The value is specified in [`Composition`] via [`CompKey::CacaoSolids`].
///   - Cocoa butter: the fat component extracted from cacao solids (sometimes referred to as "cocoa
///     fat"). This is rarely advertised on packaging, but can usually be inferred from the
///     nutrition table. Corresponds to [`cocoa_butter`](Self::cocoa_butter). The value is
///     specified in [`Composition`] via [`CompKey::CocoaButter`].
///   - _Cocoa_ solids: the non-fat component of cacao solids (sometimes referred to as "cocoa
///     powder" or "cocoa fiber"), i.e. cacao solids minus cocoa butter. In ice cream mixes, this
///     generally determines how "chocolatey" the flavor is. This value is specified in
///     [`Composition`] via [`CompKey::CocoaSolids`].
///
/// The relation of the above components is `cacao solids = cocoa butter + cocoa solids`. The sugar
/// content of chocolate ingredients is optional, assumed to be zero if not specified, as some
/// chocolates (e.g. Unsweetened Chocolate) may not contain any sugar at all. The total solids
/// content of chocolate ingredients is assumed to be 100% (i.e. no water content). If
/// [`sugar`](Self::sugar) and [`cacao_solids`](Self::cacao_solids) do not add up to 100%, then the
/// remaining portion is assumed to be other non-sugar, non-fat solids, specified in [`Composition`]
/// via [`CompKey::OtherSNFS`], e.g. emulsifiers, impurities in demerara sugar, etc. Cocoa Powder
/// products are typically 100% cacao solids, with no sugar, and cocoa butter content ranging from
/// ~10-24%.
///
/// # Examples
///
/// ```
/// use sci_cream::{
///     composition::CompKey,
///     specs::{ChocolateSpec, IntoComposition}
/// };
///
/// // 70% Cacao Dark Chocolate
/// // https://www.lindt.ca/en/lindt-excellence-70-cacao-dark-chocolate-bar-100g
/// // 16g/40g fat in nutrition table => 40%% cocoa butter
/// // 12g/40g sugars in nutrition table => 30% sugar
/// let comp = ChocolateSpec {
///     cacao_solids: 70.0,
///     cocoa_butter: 40.0,
///     sugar: Some(30.0),
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::Sucrose), 30.0);
/// assert_eq!(comp.get(CompKey::CacaoSolids), 70.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 40.0);
/// assert_eq!(comp.get(CompKey::CocoaSolids), 30.0);
///
/// // 100% Unsweetened Cocoa Powder
/// // https://www.ghirardelli.com/premium-baking-cocoa-100-unsweetened-cocoa-powder-6-bags-61703cs
/// // 1g/6g fat in nutrition table => 16.67% cocoa butter
/// let comp = ChocolateSpec {
///     cacao_solids: 100.0,
///     cocoa_butter: 16.67,
///     sugar: None,
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
/// assert_eq!(comp.get(CompKey::CacaoSolids), 100.0);
/// assert_eq!(comp.get(CompKey::CocoaButter), 16.67);
/// assert_eq!(comp.get(CompKey::CocoaSolids), 83.33);
/// ```
// @todo Add a `msnf` field to support milk chocolate products (some professional chocolatier use)
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ChocolateSpec {
    pub cacao_solids: f64,
    pub cocoa_butter: f64,
    pub sugar: Option<f64>,
}

/// Spec for nut ingredients, usually nut butters, with fat, sugar, and water content
///
/// Nut ingredients are specified by their [`fat`](Self::fat) content, [`sugar`](Self::sugar)
/// content, and [`water`](Self::water) content, by total weight. The remaining portion up to 100%
/// is assumed to be non-sugar, non-fat solids (snfs). Sugars are assumed to be all sucrose. Fat and
/// sugar values are specified in [`Solids::nut`](Solids::nut), in [`fats`](SolidsBreakdown::fats)
/// and [`sweeteners`](SolidsBreakdown::sweeteners) respectively.
///
/// The composition of nut ingredients can usually be found in food in the nutrition facts tables
/// provided by the manufacturer, or in food composition databases, like [USDA FoodData
/// Central](https://fdc.nal.usda.gov/food-search).
///
/// # Examples
///
/// (Nuts, almonds, 2019)[^102] per 100g:
/// - Water: 4.41g
/// - Total lipid (fat): 49.9g
/// - Total Sugars: 4.35g
///
/// ```
/// use sci_cream::{
///     composition::CompKey,
///     specs::{NutSpec, IntoComposition},
///     util::round_to_decimals,
/// };
///
/// let comp = NutSpec {
///    fat: 49.9,
///    sugar: 4.35,
///    water: 4.41,
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::NutFat), 49.9);
/// assert_eq!(comp.get(CompKey::NutSNFS), 41.34);
/// assert_eq!(round_to_decimals(comp.get(CompKey::NutSolids), 2), 91.24);
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 4.35);
/// assert_eq!(comp.get(CompKey::TotalSolids), 95.59);
/// assert_eq!(comp.get(CompKey::POD), 4.35);
/// assert_eq!(comp.get(CompKey::HF), 69.86);
/// ```
#[doc = include_str!("../docs/bibs/102.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct NutSpec {
    pub fat: f64,
    pub sugar: f64,
    pub water: f64,
}

/// Spec for egg ingredients, with water content, fat content, and lecithin (emulsifier) content
///
/// The composition of egg ingredients can usually be found in food composition databases, like
/// [USDA FoodData Central](https://fdc.nal.usda.gov/food-search), in the manufacturers' data, or in
/// reference texts, e.g. _Ice Cream 7th Edition_ (Goff & Hartel, 2013, p. 49)[^2] or _The Science
/// of Ice Cream_ (Clarke, 2004, p. 49)[^4]. Note that [`lecithin`](Self::lecithin) is a subset of
/// [`fats`](Self::fats), and considered an emulsifier with relative strength of 100, specified in
/// [`Micro::emulsifiers`](Micro::emulsifiers). The remaining portion of `100 - water - fats` is
/// assumed to be non-fat non-sugar solids (snfs), specified in
/// [`Solids::egg`](Solids::egg)`.`[`snfs`](SolidsBreakdown::snfs).
///
/// # Examples
///
/// Based on a combination of multiple sources:
///
/// - Water: 52.1%, Protein: 16.2%, Total Lipid: 28.8% (Eggs, Grade A, Large, egg yolk, 2019)[^100]
/// - Fat: 33%, Protein: 15.8%, Total Solids: 51.2% (Goff & Hartel, 2013, p. 49)[^2]
/// - Water: 50%, Protein: 16%, Lecithin: 9%, Other Fat: 23% (Clarke, 2004, p. 49)[^4]
///
/// ```
/// use sci_cream::{
///     composition::CompKey,
///     specs::{EggSpec, IntoComposition}
/// };
///
/// let comp = EggSpec {
///     water: 51.0,
///     fats: 30.0,
///     lecithin: 9.0,
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::EggFat), 30.0);
/// assert_eq!(comp.get(CompKey::EggSNFS), 19.0);
/// assert_eq!(comp.get(CompKey::EggSolids), 49.0);
/// assert_eq!(comp.get(CompKey::Emulsifiers), 9.0);
/// ```
#[doc = include_str!("../docs/bibs/2.md")]
#[doc = include_str!("../docs/bibs/4.md")]
#[doc = include_str!("../docs/bibs/100.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EggSpec {
    pub water: f64,
    pub fats: f64,
    pub lecithin: f64,
}

/// Spec for alcohol beverages and other ingredients, with ABV, optional sugar, fat, and solids
///
/// The composition of spirits is trivial, consisting of only the [`ABV`](Self::abv) ("Alcohol by
/// volume", 2025)[^8]) that is always present on the label, and is internally converted to `ABW`
/// (Alcohol by weight) via [`constants::ABV_TO_ABW_RATIO`]. Liqueurs, creams, and other alcohol
/// ingredients may also contain sugar, fat, and other solids. These can be tricky to find, since
/// nutrition facts tables are not usually mandated for alcoholic beverages. The best approach is
/// to find a nutrition facts table from the manufacturer, if available, otherwise to look for
/// unofficial sources online. The exact composition is not usually critical, since alcohol
/// ingredients are typically used in small amounts in ice cream mixes.
///
/// In the fields below, [`sugar`](Self::sugar) is assumed to be sucrose, zero if not specified, and
/// its contributions to PAC and POD are internally calculated accordingly. [`fat`](Self::fat) is
/// assumed to be [`Solids::other`](Solids::other)`.`[`fats`](SolidsBreakdown::fats), zero if not
/// specified. [`solids`](Self::solids) less `sugar` and `fat` is assumed to be
/// [`Solids::other`](Solids::other)`.`[`snfs`](SolidsBreakdown::snfs). If not specified, it is
/// calculated as `sugar + fat`. If specified, it is required that `solids >= sugar + fat`. Overall,
/// the sum of `abw + solids <= 100%`.
#[doc = include_str!("../docs/bibs/8.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AlcoholSpec {
    pub abv: f64,
    pub sugar: Option<f64>,
    pub fat: Option<f64>,
    pub solids: Option<f64>,
}

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
#[doc = include_str!("../docs/bibs/5.md")]
#[doc = include_str!("../docs/bibs/6.md")]
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
    pub solids: Option<Solids>,
    pub sweeteners: Option<Sweeteners>,
    pub micro: Option<Micro>,
    pub abv: Option<f64>,
    pub pod: Option<f64>,
    pub pac: Option<PAC>,
}

/// Tagged enum for all the supported specs, which is useful for (de)serialization of specs.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Spec {
    DairySpec(DairySpec),
    SweetenerSpec(SweetenerSpec),
    FruitSpec(FruitSpec),
    ChocolateSpec(ChocolateSpec),
    NutSpec(NutSpec),
    EggSpec(EggSpec),
    AlcoholSpec(AlcoholSpec),
    MicroSpec(MicroSpec),
    FullSpec(FullSpec),
}

#[cfg_attr(feature = "diesel", derive(Queryable, Selectable), diesel(table_name = ingredients))]
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct IngredientSpec {
    pub name: String,
    pub category: Category,
    #[serde(flatten)]
    pub spec: Spec,
}

impl IntoComposition for Spec {
    fn into_composition(self) -> Result<Composition> {
        match self {
            Spec::DairySpec(spec) => spec.into_composition(),
            Spec::SweetenerSpec(spec) => spec.into_composition(),
            Spec::FruitSpec(spec) => spec.into_composition(),
            Spec::ChocolateSpec(spec) => spec.into_composition(),
            Spec::NutSpec(spec) => spec.into_composition(),
            Spec::EggSpec(spec) => spec.into_composition(),
            Spec::AlcoholSpec(spec) => spec.into_composition(),
            Spec::MicroSpec(spec) => spec.into_composition(),
            Spec::FullSpec(spec) => spec.into_composition(),
        }
    }
}

impl IngredientSpec {
    pub fn into_ingredient(self) -> Ingredient {
        Ingredient {
            name: self.name,
            category: self.category,
            composition: self.spec.into_composition().unwrap(),
        }
    }
}

fn is_within_100_percent(value: f64) -> bool {
    (0.0..=100.0).contains(&value)
}

impl IntoComposition for DairySpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { fat, msnf } = self;

        let calculated_msnf = (100.0 - fat) * constants::STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);
        let lactose = msnf * constants::STD_LACTOSE_IN_MSNF;
        let snfs = msnf - lactose;

        let sweeteners = Sweeteners::new().sugars(Sugars::new().lactose(lactose));
        let pod = sweeteners.to_pod().unwrap();
        let pad = PAC::new()
            .sugars(sweeteners.to_pac().unwrap())
            .msnf_ws_salts(msnf * constants::pac::MSNF_WS_SALTS / 100.0);

        Ok(Composition::new()
            .solids(Solids::new().milk(SolidsBreakdown::new().fats(fat).sweeteners(lactose).snfs(snfs)))
            .sweeteners(sweeteners)
            .pod(pod)
            .pac(pad))
    }
}

impl IntoComposition for SweetenerSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            sweeteners,
            other_solids,
            basis,
            pod,
            pac,
        } = self;

        let other_solids = other_solids.unwrap_or(0.0);

        let mut factor = None;

        match basis {
            CompositionBasis::ByDryWeight { solids } => {
                if sweeteners.total() + other_solids != 100.0 {
                    return Err(Error::CompositionNot100Percent(sweeteners.total() + other_solids));
                }

                if !is_within_100_percent(solids) {
                    return Err(Error::CompositionNotWithin100Percent(solids));
                }

                factor = Some(solids / 100.0);
            }
            CompositionBasis::ByTotalWeight { water } => {
                if sweeteners.total() + other_solids + water != 100.0 {
                    return Err(Error::CompositionNot100Percent(sweeteners.total() + other_solids + water));
                }
            }
        };

        let (sweeteners, other_solids) = if let Some(factor) = factor {
            (sweeteners.scale(factor), other_solids * factor)
        } else {
            (sweeteners, other_solids)
        };

        let ignore_polysaccharides = |s: Sweeteners| Sweeteners {
            polysaccharides: 0.0,
            ..s
        };

        let pod = pod.unwrap_or(ignore_polysaccharides(sweeteners).to_pod().unwrap());
        let pac = pac.unwrap_or(ignore_polysaccharides(sweeteners).to_pac().unwrap());

        Ok(Composition::new()
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .sweeteners(sweeteners.total() - sweeteners.polysaccharides)
                        .snfs(sweeteners.polysaccharides + other_solids),
                ),
            )
            .sweeteners(sweeteners)
            .pod(pod)
            .pac(PAC::new().sugars(pac)))
    }
}

impl IntoComposition for FruitSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { sugars, water, fat } = self;
        let fat = fat.unwrap_or(0.0);

        if !is_within_100_percent(sugars.total() + water + fat) {
            return Err(Error::CompositionNotWithin100Percent(sugars.total() + water + fat));
        }

        let snfs = 100.0 - (sugars.total() + water + fat);
        let sweeteners = Sweeteners::new().sugars(sugars);

        Ok(Composition::new()
            .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(sugars.total()).fats(fat).snfs(snfs)))
            .sweeteners(sweeteners)
            .pod(sweeteners.to_pod().unwrap())
            .pac(PAC::new().sugars(sweeteners.to_pac().unwrap())))
    }
}

impl IntoComposition for ChocolateSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            cacao_solids,
            cocoa_butter,
            sugar,
        } = self;

        let sugar = sugar.unwrap_or(0.0);

        if cocoa_butter > cacao_solids {
            return Err(Error::InvalidComposition(format!(
                "Cocoa butter ({cocoa_butter}) is a subset of and cannot be greater than cacao solids ({cacao_solids})"
            )));
        }

        if !is_within_100_percent(cacao_solids + sugar) {
            return Err(Error::CompositionNotWithin100Percent(cacao_solids + sugar));
        }

        let cocoa_snfs = cacao_solids - cocoa_butter;
        let other_snfs = 100.0 - (cacao_solids + sugar);

        let sweeteners = Sweeteners::new().sugars(Sugars::new().sucrose(sugar));

        Ok(Composition::new()
            .solids(
                Solids::new()
                    .cocoa(SolidsBreakdown::new().fats(cocoa_butter).snfs(cocoa_snfs))
                    .other(SolidsBreakdown::new().sweeteners(sugar).snfs(other_snfs)),
            )
            .sweeteners(sweeteners)
            .pod(sweeteners.to_pod().unwrap())
            .pac(PAC::new().sugars(sweeteners.to_pac().unwrap()).hardness_factor(
                cocoa_butter * constants::hf::CACAO_BUTTER + cocoa_snfs * constants::hf::COCOA_SOLIDS,
            )))
    }
}

impl IntoComposition for NutSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { fat, sugar, water } = self;

        if !is_within_100_percent(fat + sugar + water) {
            return Err(Error::CompositionNotWithin100Percent(fat + sugar + water));
        }

        let snfs = 100.0 - (fat + sugar + water);
        let sweeteners = Sweeteners::new().sugars(Sugars::new().sucrose(sugar));

        Ok(Composition::new()
            .solids(Solids::new().nut(SolidsBreakdown::new().fats(fat).sweeteners(sugar).snfs(snfs)))
            .sweeteners(sweeteners)
            .pod(sweeteners.to_pod().unwrap())
            .pac(
                PAC::new()
                    .sugars(sweeteners.to_pac().unwrap())
                    .hardness_factor(fat * constants::hf::NUT_FAT),
            ))
    }
}

impl IntoComposition for EggSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { water, fats, lecithin } = self;

        if water + fats > 100.0 {
            return Err(Error::CompositionNotWithin100Percent(water + fats));
        }

        if lecithin > fats {
            return Err(Error::InvalidComposition(format!(
                "Lecithin ({lecithin}) is a subset of and cannot be greater than fats ({fats})"
            )));
        }

        Ok(Composition::new()
            .solids(Solids::new().egg(SolidsBreakdown::new().fats(fats).snfs(100.0 - water - fats)))
            .micro(Micro::new().emulsifiers(lecithin)))
    }
}

impl IntoComposition for AlcoholSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            abv,
            sugar,
            fat,
            solids,
        } = self;

        let sugar = sugar.unwrap_or_default();
        let fat = fat.unwrap_or_default();
        let solids = solids.unwrap_or(sugar + fat);
        let alcohol = Alcohol::from_abv(abv);

        if abv < 0.0 || sugar < 0.0 || fat < 0.0 || solids < 0.0 {
            return Err(Error::InvalidComposition("ABV, sugar, fat, and solids must be non-negative".to_string()));
        }

        if solids < sugar + fat {
            return Err(Error::InvalidComposition(format!(
                "Total solids ({solids}) cannot be less than the sum of sugar ({sugar}) and fat ({fat})"
            )));
        }

        if !is_within_100_percent(alcohol.by_weight + solids) {
            return Err(Error::CompositionNotWithin100Percent(alcohol.by_weight + solids));
        }

        let sweeteners = Sweeteners::new().sugars(Sugars::new().sucrose(sugar));

        Ok(Composition::new()
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .sweeteners(sugar)
                        .fats(fat)
                        .snfs(solids - sugar - fat),
                ),
            )
            .sweeteners(sweeteners)
            .alcohol(alcohol)
            .pod(sweeteners.to_pod().unwrap())
            .pac(
                PAC::new()
                    .sugars(sweeteners.to_pac().unwrap())
                    .alcohol(alcohol.to_pac()),
            ))
    }
}

impl IntoComposition for MicroSpec {
    fn into_composition(self) -> Result<Composition> {
        let make_emulsifier_stabilizer_composition =
            |emulsifiers_strength: Option<f64>, stabilizers_strength: Option<f64>| -> Result<Composition> {
                let emulsifiers_strength = emulsifiers_strength.unwrap_or(0.0);
                let stabilizers_strength = stabilizers_strength.unwrap_or(0.0);

                if emulsifiers_strength < 0.0 || stabilizers_strength < 0.0 {
                    return Err(Error::InvalidComposition(
                        "Emulsifier and Stabilizer strengths must be non-negative".to_string(),
                    ));
                }

                Ok(Composition::new()
                    .solids(Solids::new().other(SolidsBreakdown::new().snfs(100.0)))
                    .micro(
                        Micro::new()
                            .emulsifiers(emulsifiers_strength)
                            .stabilizers(stabilizers_strength),
                    ))
            };

        match self {
            MicroSpec::Salt => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().snfs(100.0)))
                .micro(Micro::new().salt(100.0))
                .pac(PAC::new().salt(constants::pac::SALT))),
            MicroSpec::Lecithin => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().snfs(100.0)))
                .micro(Micro::new().emulsifiers(100.0))),
            MicroSpec::Stabilizer { strength } => make_emulsifier_stabilizer_composition(None, Some(strength)),
            MicroSpec::Emulsifier { strength } => make_emulsifier_stabilizer_composition(Some(strength), None),
            MicroSpec::EmulsifierStabilizer {
                emulsifier_strength,
                stabilizer_strength,
            } => make_emulsifier_stabilizer_composition(Some(emulsifier_strength), Some(stabilizer_strength)),
        }
    }
}

impl IntoComposition for FullSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            solids,
            sweeteners,
            micro,
            abv,
            pod,
            pac,
        } = self;

        let alcohol = if let Some(abv) = abv {
            Alcohol::from_abv(abv)
        } else {
            Alcohol::default()
        };

        let comp = Composition::new()
            .solids(solids.unwrap_or_default())
            .sweeteners(sweeteners.unwrap_or_default())
            .micro(micro.unwrap_or_default())
            .alcohol(alcohol)
            .pod(pod.unwrap_or_default())
            .pac(pac.unwrap_or_default());

        if !is_within_100_percent(comp.solids.total() + alcohol.by_weight) {
            return Err(Error::CompositionNotWithin100Percent(comp.solids.total() + alcohol.by_weight));
        }

        Ok(comp)
    }
}

#[cfg(feature = "wasm")]
pub mod wasm {
    use super::*;

    #[wasm_bindgen]
    pub fn into_ingredient_from_spec(spec: JsValue) -> Ingredient {
        serde_wasm_bindgen::from_value::<IngredientSpec>(spec)
            .unwrap()
            .into_ingredient()
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;
    use crate::tests::data::get_ingredient_spec_by_name_or_panic;

    use super::*;
    use crate::composition::CompKey;

    pub(crate) const ING_SPEC_DAIRY_2_MILK_STR: &str = r#"{
      "name": "2% Milk",
      "category": "Dairy",
      "DairySpec": {
        "fat": 2
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_2_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec { fat: 2.0, msnf: None }),
    });

    pub(crate) static COMP_2_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .solids(Solids::new().milk(SolidsBreakdown::new().fats(2.0).sweeteners(4.8069).snfs(4.0131)))
            .sweeteners(Sweeteners::new().sugars(Sugars::new().lactose(4.8069)))
            .pod(0.769104)
            .pac(PAC::new().sugars(4.8069).msnf_ws_salts(3.2405))
    });

    #[test]
    fn into_composition_dairy_spec_2_milk() {
        let comp = ING_SPEC_DAIRY_2_MILK.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::TotalSolids), 10.82);
        assert_eq!(comp.get(CompKey::Water), 89.18);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_abs_diff_eq!(comp.get(CompKey::POD), 0.769104, epsilon = TESTS_EPSILON);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_abs_diff_eq!(comp.get(CompKey::Lactose), 4.8069, epsilon = TESTS_EPSILON);
        assert_eq!(comp.get(CompKey::MSNF), 8.82);
        assert_eq!(comp.get(CompKey::MilkSNFS), 4.0131);
        assert_eq!(comp.get(CompKey::MilkSolids), 10.82);

        assert_abs_diff_eq!(comp.get(CompKey::PACsgr), 4.8069, epsilon = TESTS_EPSILON);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_abs_diff_eq!(comp.get(CompKey::PACmlk), 3.2405, epsilon = TESTS_EPSILON);
        assert_abs_diff_eq!(comp.get(CompKey::PACtotal), 8.0474, epsilon = TESTS_EPSILON);
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
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_SUCROSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(100.0)))
            .sweeteners(Sweeteners::new().sugars(Sugars::new().sucrose(100.0)))
            .pod(100.0)
            .pac(PAC::new().sugars(100.0))
    });

    #[test]
    fn into_composition_sweetener_spec_sucrose() {
        let comp = ING_SPEC_SWEETENER_SUCROSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Sucrose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
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
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 92.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_dextrose() {
        let comp = ING_SPEC_SWEETENER_DEXTROSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Glucose), 92.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 92.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 92.0);
        assert_eq!(comp.get(CompKey::POD), 73.968);
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
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_FRUCTOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(100.0)))
            .sweeteners(Sweeteners::new().sugars(Sugars::new().fructose(100.0)))
            .pod(173.0)
            .pac(PAC::new().sugars(190.0))
    });

    #[test]
    fn into_composition_sweetener_spec_fructose() {
        let comp = ING_SPEC_SWEETENER_FRUCTOSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Fructose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 173.0);
        assert_eq!(comp.get(CompKey::PACsgr), 190.0);
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
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 80.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_invert_sugar() {
        let comp = ING_SPEC_SWEETENER_INVERT_SUGAR.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Glucose), 34.0);
        assert_eq!(comp.get(CompKey::Fructose), 34.0);
        assert_eq!(comp.get(CompKey::Sucrose), 12.0);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 80.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 80.0);
        assert_eq!(comp.get(CompKey::POD), 98.156);
        assert_eq!(comp.get(CompKey::PACsgr), 141.2);
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
            other_solids: Some(1.0),
            basis: CompositionBasis::ByTotalWeight { water: 17.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_honey() {
        let comp = ING_SPEC_SWEETENER_HONEY.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Glucose), 36.0);
        assert_eq!(comp.get(CompKey::Fructose), 41.0);
        assert_eq!(comp.get(CompKey::Sucrose), 2.0);
        assert_eq!(comp.get(CompKey::Galactose), 1.5);
        assert_eq!(comp.get(CompKey::Maltose), 1.5);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 82.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 1.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 83.0);
        assert_eq!(comp.get(CompKey::POD), 103.329);
        assert_eq!(comp.get(CompKey::PACsgr), 152.65);
    }

    pub(crate) const ING_SPEC_SWEETENER_HFCS42_STR: &str = r#"{
      "name": "HFCS 42",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "fructose": 42,
            "glucose": 53
          },
          "polysaccharides": 5
        },
        "ByDryWeight": {
          "solids": 76
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HFCS42: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "HFCS 42".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new()
                .sugars(Sugars::new().fructose(42.0).glucose(53.0))
                .polysaccharide(5.0),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 76.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_hfcs42() {
        let comp = ING_SPEC_SWEETENER_HFCS42.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Fructose), 31.92);
        assert_eq!(comp.get(CompKey::Glucose), 40.28);
        assert_eq!(comp.get(CompKey::Polysaccharides), 3.8);

        assert_eq!(comp.get(CompKey::Sugars), 72.2);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 76.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 3.8);
        assert_eq!(comp.get(CompKey::TotalSolids), 76.0);
        assert_eq!(comp.get(CompKey::POD), 87.60672000000001);
        assert_eq!(comp.get(CompKey::PACsgr), 137.18);
    }

    pub(crate) const ING_SPEC_FRUIT_STRAWBERRY_STR: &str = r#"{
      "name": "Strawberry",
      "category": "Fruit",
      "FruitSpec": {
        "sugars": {
          "glucose": 1.99,
          "fructose": 2.44,
          "sucrose": 0.47
        },
        "water": 91,
        "fat": 0.3
      }
    }"#;

    pub(crate) static ING_SPEC_FRUIT_STRAWBERRY: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Strawberry".to_string(),
        category: Category::Fruit,
        spec: Spec::FruitSpec(FruitSpec {
            sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
            water: 91.0,
            fat: Some(0.3),
        }),
    });

    #[test]
    fn into_composition_fruit_spec_strawberry() {
        let comp = ING_SPEC_FRUIT_STRAWBERRY.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Glucose), 1.99);
        assert_eq!(comp.get(CompKey::Fructose), 2.44);
        assert_eq!(comp.get(CompKey::Sucrose), 0.47);

        assert_abs_diff_eq!(comp.get(CompKey::TotalSweeteners), 4.90, epsilon = TESTS_EPSILON);
        assert_eq!(comp.get(CompKey::TotalFats), 0.3);
        assert_abs_diff_eq!(comp.get(CompKey::TotalSNFS), 3.8, epsilon = TESTS_EPSILON);
        assert_abs_diff_eq!(comp.get(CompKey::TotalSolids), 9.0, epsilon = TESTS_EPSILON);
        assert_eq!(comp.get(CompKey::POD), 6.29116);
        assert_eq!(comp.get(CompKey::PACsgr), 8.887);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_70_STR: &str = r#"{
      "name": "Chocolate 70%",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 70,
        "cocoa_butter": 40,
        "sugar": 30
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_70: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Chocolate 70%".to_string(),
        category: Category::Chocolate,
        spec: Spec::ChocolateSpec(ChocolateSpec {
            cacao_solids: 70.0,
            cocoa_butter: 40.0,
            sugar: Some(30.0),
        }),
    });

    #[test]
    fn into_composition_chocolate_spec_70() {
        let comp = ING_SPEC_CHOCOLATE_70.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Sucrose), 30.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 30.0);

        // Added sugars in chocolates is considered part of total sweeteners, not part of Cacao Solids
        assert_eq!(comp.get(CompKey::CacaoSolids), comp.get(CompKey::TotalSolids) - comp.get(CompKey::TotalSweeteners));

        assert_eq!(comp.get(CompKey::CacaoSolids), 70.0);
        assert_eq!(comp.get(CompKey::CocoaButter), 40.0);
        assert_eq!(comp.get(CompKey::CocoaSolids), 30.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 30.0);
        assert_eq!(comp.get(CompKey::PACtotal), 30.0);
        assert_eq!(comp.get(CompKey::HF), 90.0);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_100_STR: &str = r#"{
      "name": "Chocolate 100%",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 100,
        "cocoa_butter": 54
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_100: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Chocolate 100%".to_string(),
        category: Category::Chocolate,
        spec: Spec::ChocolateSpec(ChocolateSpec {
            cacao_solids: 100.0,
            cocoa_butter: 54.0,
            sugar: None,
        }),
    });

    #[test]
    fn into_composition_chocolate_spec_100() {
        let comp = ING_SPEC_CHOCOLATE_100.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);

        assert_eq!(comp.get(CompKey::CacaoSolids), 100.0);
        assert_eq!(comp.get(CompKey::CocoaButter), 54.0);
        assert_eq!(comp.get(CompKey::CocoaSolids), 46.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACtotal), 0.0);
        assert_eq!(comp.get(CompKey::HF), 131.4);
    }

    pub(crate) const ING_SPEC_CHOCOLATE_COCOA_POWDER_17_STR: &str = r#"{
      "name": "Cocoa Powder 17%",
      "category": "Chocolate",
      "ChocolateSpec": {
        "cacao_solids": 100,
        "cocoa_butter": 16.67
      }
    }"#;

    pub(crate) static ING_SPEC_CHOCOLATE_COCOA_POWDER_17: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Cocoa Powder 17%".to_string(),
        category: Category::Chocolate,
        spec: Spec::ChocolateSpec(ChocolateSpec {
            cacao_solids: 100.0,
            cocoa_butter: 16.67,
            sugar: None,
        }),
    });

    #[test]
    fn into_composition_chocolate_spec_cocoa_powder_17() {
        let comp = ING_SPEC_CHOCOLATE_COCOA_POWDER_17.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);

        assert_eq!(comp.get(CompKey::CacaoSolids), 100.0);
        assert_eq!(comp.get(CompKey::CocoaButter), 16.67);
        assert_eq!(comp.get(CompKey::CocoaSolids), 83.33);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACtotal), 0.0);
        assert_eq!(comp.get(CompKey::HF), 164.997);
    }

    pub(crate) const ING_SPEC_NUT_ALMOND_STR: &str = r#"{
      "name": "Almond",
      "category": "Nut",
      "NutSpec": {
        "fat": 49.9,
        "sugar": 4.35,
        "water": 4.41
      }
    }"#;

    pub(crate) static ING_SPEC_NUT_ALMOND: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Almond".to_string(),
        category: Category::Nut,
        spec: Spec::NutSpec(NutSpec {
            fat: 49.9,
            sugar: 4.35,
            water: 4.41,
        }),
    });

    #[test]
    fn into_composition_nut_spec_almond() {
        let comp = ING_SPEC_NUT_ALMOND.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::NutFat), 49.9);
        assert_eq!(comp.get(CompKey::NutSNFS), 41.34);
        assert_abs_diff_eq!(comp.get(CompKey::NutSolids), 91.24, epsilon = TESTS_EPSILON);

        // Sugar in nuts is considered part of total sweeteners, not part of Nut Solids
        assert_eq!(comp.get(CompKey::TotalSweeteners), 4.35);
        assert_eq!(comp.get(CompKey::NutSolids), comp.get(CompKey::NutFat) + comp.get(CompKey::NutSNFS));
        assert_eq!(comp.get(CompKey::NutSolids), comp.get(CompKey::TotalSolids) - comp.get(CompKey::TotalSweeteners));

        assert_eq!(comp.get(CompKey::TotalSolids), 95.59);
        assert_abs_diff_eq!(comp.get(CompKey::Water), 4.41, epsilon = TESTS_EPSILON);
        assert_eq!(comp.get(CompKey::POD), 4.35);
        assert_eq!(comp.get(CompKey::HF), 69.86);
    }

    pub(crate) const ING_SPEC_EGG_YOLK_STR: &str = r#"{
      "name": "Egg Yolk",
      "category": "Egg",
      "EggSpec": {
        "water": 51,
        "fats": 30,
        "lecithin": 9
      }
    }"#;

    pub(crate) static ING_SPEC_EGG_YOLK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Egg Yolk".to_string(),
        category: Category::Egg,
        spec: Spec::EggSpec(EggSpec {
            water: 51.0,
            fats: 30.0,
            lecithin: 9.0,
        }),
    });

    #[test]
    fn into_composition_egg_spec_egg_yolk() {
        let comp = ING_SPEC_EGG_YOLK.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::EggFat), 30.0);
        assert_eq!(comp.get(CompKey::EggSNFS), 19.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 49.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 9.0);
    }

    pub(crate) const ING_SPEC_ALCOHOL_40_ABV_SPIRIT_STR: &str = r#"{
      "name": "40% ABV Spirit",
      "category": "Alcohol",
      "AlcoholSpec": {
        "abv": 40
      }
    }"#;

    pub(crate) static ING_SPEC_ALCOHOL_40_ABV_SPIRIT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "40% ABV Spirit".to_string(),
        category: Category::Alcohol,
        spec: Spec::AlcoholSpec(AlcoholSpec {
            abv: 40.0,
            sugar: None,
            fat: None,
            solids: None,
        }),
    });

    #[test]
    fn into_composition_alcohol_spec_40_abv_spirit() {
        let comp = ING_SPEC_ALCOHOL_40_ABV_SPIRIT.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::ABV), 40.0);
        assert_abs_diff_eq!(comp.get(CompKey::Alcohol), 31.56, epsilon = TESTS_EPSILON);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_abs_diff_eq!(comp.get(CompKey::Water), 68.44, epsilon = TESTS_EPSILON);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACalc), 234.4908);
        assert_eq!(comp.get(CompKey::PACtotal), 234.4908);

        assert_eq!(comp.alcohol.to_abv(), comp.get(CompKey::ABV));
        assert_eq!(comp.alcohol.by_weight, comp.get(CompKey::Alcohol));
        assert_eq!(comp.alcohol.to_pac(), comp.get(CompKey::PACalc));
    }

    pub(crate) const ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM_STR: &str = r#"{
      "name": "Baileys Irish Cream",
      "category": "Alcohol",
      "AlcoholSpec": {
        "abv": 17,
        "sugar": 18,
        "fat": 13.6
      }
    }"#;

    pub(crate) static ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Baileys Irish Cream".to_string(),
            category: Category::Alcohol,
            spec: Spec::AlcoholSpec(AlcoholSpec {
                abv: 17.0,
                sugar: Some(18.0),
                fat: Some(13.6),
                solids: None,
            }),
        });

    #[test]
    fn into_composition_alcohol_spec_baileys_irish_cream() {
        let comp = ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM.spec.into_composition().unwrap();

        assert_abs_diff_eq!(comp.get(CompKey::Alcohol), 13.413, epsilon = TESTS_EPSILON);
        assert_abs_diff_eq!(comp.get(CompKey::TotalSolids), 31.6, epsilon = TESTS_EPSILON);
        assert_abs_diff_eq!(comp.get(CompKey::Water), 54.987, epsilon = TESTS_EPSILON);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 18.0);
        assert_eq!(comp.get(CompKey::POD), 18.0);
        assert_eq!(comp.get(CompKey::PACalc), 99.65859);
        assert_eq!(comp.get(CompKey::PACsgr), 18.0);
        assert_eq!(comp.get(CompKey::PACtotal), 117.65859);

        assert_eq!(comp.alcohol.to_abv(), comp.get(CompKey::ABV));
        assert_eq!(comp.alcohol.by_weight, comp.get(CompKey::Alcohol));
        assert_eq!(comp.alcohol.to_pac(), comp.get(CompKey::PACalc));
    }

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

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 100.0);
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

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 100.0);
    }

    #[test]
    fn into_composition_micro_spec_stabilizer_not_100() {
        let comp = MicroSpec::Stabilizer { strength: 85.0 }.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 85.0);
    }

    #[test]
    fn into_composition_micro_spec_emulsifier_not_100() {
        let comp = MicroSpec::Emulsifier { strength: 60.0 }.into_composition().unwrap();

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

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 40.0);
    }

    pub(crate) const ING_SPEC_FULL_WATER_STR: &str = r#"{
      "name": "Water",
      "category": "Miscellaneous",
      "FullSpec": {}
    }"#;

    pub(crate) static ING_SPEC_FULL_WATER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Water".to_string(),
        category: Category::Miscellaneous,
        spec: Spec::FullSpec(FullSpec {
            solids: None,
            sweeteners: None,
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_full_spec_water() {
        let comp = ING_SPEC_FULL_WATER.spec.into_composition().unwrap();

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

    static INGREDIENT_ASSETS_TABLE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> = LazyLock::new(|| {
        vec![
            (ING_SPEC_DAIRY_2_MILK_STR, ING_SPEC_DAIRY_2_MILK.clone(), Some(*COMP_2_MILK)),
            (ING_SPEC_SWEETENER_SUCROSE_STR, ING_SPEC_SWEETENER_SUCROSE.clone(), Some(*COMP_SUCROSE)),
            (ING_SPEC_SWEETENER_DEXTROSE_STR, ING_SPEC_SWEETENER_DEXTROSE.clone(), None),
            (ING_SPEC_SWEETENER_FRUCTOSE_STR, ING_SPEC_SWEETENER_FRUCTOSE.clone(), Some(*COMP_FRUCTOSE)),
            (ING_SPEC_SWEETENER_INVERT_SUGAR_STR, ING_SPEC_SWEETENER_INVERT_SUGAR.clone(), None),
            (ING_SPEC_SWEETENER_HONEY_STR, ING_SPEC_SWEETENER_HONEY.clone(), None),
            (ING_SPEC_SWEETENER_HFCS42_STR, ING_SPEC_SWEETENER_HFCS42.clone(), None),
            (ING_SPEC_FRUIT_STRAWBERRY_STR, ING_SPEC_FRUIT_STRAWBERRY.clone(), None),
            (ING_SPEC_CHOCOLATE_70_STR, ING_SPEC_CHOCOLATE_70.clone(), None),
            (ING_SPEC_CHOCOLATE_100_STR, ING_SPEC_CHOCOLATE_100.clone(), None),
            (ING_SPEC_CHOCOLATE_COCOA_POWDER_17_STR, ING_SPEC_CHOCOLATE_COCOA_POWDER_17.clone(), None),
            (ING_SPEC_NUT_ALMOND_STR, ING_SPEC_NUT_ALMOND.clone(), None),
            (ING_SPEC_EGG_YOLK_STR, ING_SPEC_EGG_YOLK.clone(), None),
            (ING_SPEC_ALCOHOL_40_ABV_SPIRIT_STR, ING_SPEC_ALCOHOL_40_ABV_SPIRIT.clone(), None),
            (ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM_STR, ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM.clone(), None),
            (ING_SPEC_MICRO_SALT_STR, ING_SPEC_MICRO_SALT.clone(), None),
            (ING_SPEC_MICRO_LECITHIN_STR, ING_SPEC_MICRO_LECITHIN.clone(), None),
            (ING_SPEC_MICRO_STABILIZER_STR, ING_SPEC_MICRO_STABILIZER.clone(), None),
            (ING_SPEC_MICRO_LOUIS_STAB2K_STR, ING_SPEC_MICRO_LOUIS_STAB2K.clone(), None),
            (ING_SPEC_FULL_WATER_STR, ING_SPEC_FULL_WATER.clone(), None),
        ]
    });

    #[test]
    fn deserialize_ingredient_spec() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(spec_str, spec, _)| {
            assert_eq!(
                serde_json::from_str::<IngredientSpec>(spec_str)
                    .unwrap_or_else(|e| panic!("Failed to deserialize spec '{}': {}", spec.name, e)),
                *spec
            );
        });
    }

    #[test]
    fn ingredient_spec_database_matches_assets() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(_, spec, _)| {
            assert_eq!(spec, &get_ingredient_spec_by_name_or_panic(&spec.name));
        });
    }
}
