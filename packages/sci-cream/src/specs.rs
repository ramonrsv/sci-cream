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
use crate::constants::{STD_LACTOSE_IN_MSNF, STD_MSNF_IN_MILK_SERUM};

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
pub struct SweetenersSpec {
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
/// USDA FoodData Central (<https://fdc.nal.usda.gov/food-search>).
///
/// # Examples
///
/// Based on: SR Legacy - 9316 (<https://fdc.nal.usda.gov/food-details/167762/nutrients>)
///
///   - Strawberries, raw, per 100g:
///     - Water: 91g
///     - Total lipid (fat): 0.3g
///     - Sucrose: 0.47g
///     - Glucose: 1.99g
///     - Fructose: 2.44g
///
/// ```
/// use sci_cream::{
///     composition::{Sugars, Sweeteners},
///     specs::{FruitsSpec, IntoComposition}
/// };
///
/// let comp = FruitsSpec {
///     sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
///     water: 91.0,
///     fat: Some(0.3),
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.sweeteners, Sweeteners::new().sugars(
///    Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47)));
///
/// assert_eq!(comp.pod, 6.29116);
/// assert_eq!(comp.pac.sugars, 8.887);
/// ```
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FruitsSpec {
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
///   - Cocoa butter: the fat component extracted from cacao solids (sometimes referred to as "cocoa
///     fat"). This is rarely advertised on packaging, but can usually be inferred from the
///     nutrition table. Corresponds to [`cocoa_butter`](Self::cocoa_butter).
///   - _Cocoa_ solids: the non-fat component of cacao solids (sometimes referred to as "cocoa
///     powder" or "cocoa fiber"), i.e. cacao solids minus cocoa butter. In ice cream mixes, this
///     generally determines how "chocolatey" the flavor is. This value is specified in
///     [`Solids::cocoa`](Solids::cocoa)`.`[`snf`](SolidsBreakdown::snf).
///
/// The relation of the above components is `cacao solids = cocoa butter + cocoa solids`. The sugar
/// content of chocolate ingredients is optional, assumed to be zero if not specified, as some
/// chocolates (e.g. Unsweetened Chocolate) may not contain any sugar at all. The total solids
/// content of chocolate ingredients is assumed to be 100% (i.e. no water content). If
/// [`sugar`](Self::sugar) and [`cacao_solids`](Self::cacao_solids) do not add up to 100%, then the
/// remaining portion is assumed to be other non-sugar, non-fat solids, specified in
/// [`Solids::other`](Solids::other)`.`[`snfs`](SolidsBreakdown::snfs), e.g. emulsifiers, impurities
/// in demerara sugar, etc. Cocoa Powder products are typically 100% cacao solids, with no sugar,
/// and cocoa butter content ranging from ~10-24%.
///
/// # Examples
///
/// ```
/// use sci_cream::{
///     composition::{Sugars, Sweeteners},
///     specs::{ChocolatesSpec, IntoComposition}
/// };
///
/// // 70% Cacao Dark Chocolate
/// // https://www.lindt.ca/en/lindt-excellence-70-cacao-dark-chocolate-bar-100g
/// // 16g/40g fat in nutrition table => 40%% cocoa butter
/// // 12g/40g sugars in nutrition table => 30% sugar
/// let comp = ChocolatesSpec {
///     cacao_solids: 70.0,
///     cocoa_butter: 40.0,
///     sugar: Some(30.0),
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.sweeteners.sugars.sucrose, 30.0);
/// assert_eq!(comp.solids.cocoa.total(), 70.0);
/// assert_eq!(comp.solids.cocoa.fats, 40.0);
/// assert_eq!(comp.solids.cocoa.snf(), 30.0);
///
/// // 100% Unsweetened Cocoa Powder
/// // https://www.ghirardelli.com/premium-baking-cocoa-100-unsweetened-cocoa-powder-6-bags-61703cs
/// // 1g/6g fat in nutrition table => 16.67% cocoa butter
/// let comp = ChocolatesSpec {
///     cacao_solids: 100.0,
///     cocoa_butter: 16.67,
///     sugar: None,
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.sweeteners.total(), 0.0);
/// assert_eq!(comp.solids.cocoa.total(), 100.0);
/// assert_eq!(comp.solids.cocoa.fats, 16.67);
/// assert_eq!(comp.solids.cocoa.snf(), 83.33);
/// ```
// @todo Add a `msnf` field to support milk chocolate products (some professional chocolatier use)
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ChocolatesSpec {
    pub cacao_solids: f64,
    pub cocoa_butter: f64,
    pub sugar: Option<f64>,
}

/// Spec for egg ingredients, with water content, fat content, and lecithin (emulsifier) content
///
/// The composition of egg ingredients can usually be found in food composition databases, like
/// USDA FoodData Central (<https://fdc.nal.usda.gov/food-search>), in the manufacturers' data, or
/// in reference texts, e.g. _The Science of Ice Cream_ (Clarke, 2004, p. 49)[^4]. Note that
/// [`lecithin`](Self::lecithin) is a subset of [`fats`](Self::fats), and considered an emulsifier
/// with relative strength of 100, specified in [`Micro::emulsifiers`](Micro::emulsifiers). The
/// remaining portion of `100 - water - fats` is assumed to be non-fat non-sugar solids (snfs),
/// specified in [`Solids::egg`](Solids::egg)`.`[`snfs`](SolidsBreakdown::snfs).
///
/// # Examples
///
/// Based on a combination of two sources:
///     - Foundation - 1125 (<https://fdc.nal.usda.gov/food-details/748236/nutrients>)
///     - The Science of Ice Cream, C. Clarke, p. 49
///
/// ```
/// use sci_cream::{composition::{Micro, Solids}, specs::{EggsSpec, IntoComposition}};
///
/// let comp = EggsSpec {
///     water: 52.0,
///     fats: 29.0,
///     lecithin: 9.0,
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.solids.egg.fats, 29.0);
/// assert_eq!(comp.solids.egg.snfs, 19.0);
/// assert_eq!(comp.solids.total(), 48.0);
/// assert_eq!(comp.micro.emulsifiers, 9.0);
/// ```
#[doc = include_str!("../docs/bibs/4.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EggsSpec {
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
pub enum MicrosSpec {
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

/// Spec for one-off ingredients that aren't worth defining a spec for, e.g. Water
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum OneOffSpec {
    Water,
}

/// Tagged enum for all the supported specs, which is useful for (de)serialization of specs.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Spec {
    DairySpec(DairySpec),
    SweetenersSpec(SweetenersSpec),
    FruitsSpec(FruitsSpec),
    ChocolatesSpec(ChocolatesSpec),
    EggsSpec(EggsSpec),
    AlcoholSpec(AlcoholSpec),
    MicrosSpec(MicrosSpec),
    OneOffSpec(OneOffSpec),
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
            Spec::SweetenersSpec(spec) => spec.into_composition(),
            Spec::FruitsSpec(spec) => spec.into_composition(),
            Spec::ChocolatesSpec(spec) => spec.into_composition(),
            Spec::EggsSpec(spec) => spec.into_composition(),
            Spec::AlcoholSpec(spec) => spec.into_composition(),
            Spec::MicrosSpec(spec) => spec.into_composition(),
            Spec::OneOffSpec(spec) => spec.into_composition(),
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

impl IntoComposition for SweetenersSpec {
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

impl IntoComposition for FruitsSpec {
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

impl IntoComposition for ChocolatesSpec {
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

impl IntoComposition for EggsSpec {
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

impl IntoComposition for MicrosSpec {
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
            MicrosSpec::Salt => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().snfs(100.0)))
                .micro(Micro::new().salt(100.0))
                .pac(PAC::new().salt(constants::pac::SALT))),
            MicrosSpec::Lecithin => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().snfs(100.0)))
                .micro(Micro::new().emulsifiers(100.0))),
            MicrosSpec::Stabilizer { strength } => make_emulsifier_stabilizer_composition(None, Some(strength)),
            MicrosSpec::Emulsifier { strength } => make_emulsifier_stabilizer_composition(Some(strength), None),
            MicrosSpec::EmulsifierStabilizer {
                emulsifier_strength,
                stabilizer_strength,
            } => make_emulsifier_stabilizer_composition(Some(emulsifier_strength), Some(stabilizer_strength)),
        }
    }
}

impl IntoComposition for OneOffSpec {
    fn into_composition(self) -> Result<Composition> {
        match self {
            OneOffSpec::Water => Ok(Composition::new()),
        }
    }
}

#[cfg(feature = "wasm")]
pub mod js {
    use super::*;

    #[wasm_bindgen]
    pub fn into_ingredient_from_spec_js(spec: JsValue) -> Ingredient {
        serde_wasm_bindgen::from_value::<IngredientSpec>(spec)
            .unwrap()
            .into_ingredient()
    }
}

#[cfg(test)]
mod test {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::assets::*;

    #[test]
    fn into_composition_dairy_spec() {
        let Composition {
            solids,
            sweeteners,
            micro,
            alcohol,
            pod,
            pac,
        } = *COMP_MILK_2_PERCENT;

        assert_eq!(solids.total(), 10.82);
        assert_eq!(COMP_MILK_2_PERCENT.water(), 89.18);

        assert_eq!(micro.salt, 0.0);
        assert_eq!(micro.emulsifiers, 0.0);
        assert_eq!(micro.stabilizers, 0.0);
        assert_eq!(alcohol.by_weight, 0.0);
        assert_eq!(pod, 0.769104);

        let Solids { milk, .. } = solids;

        assert_eq!(milk.fats, 2.0);
        assert_eq!(milk.sweeteners, 4.8069);
        assert_eq!(milk.snf(), 8.82);
        assert_eq!(milk.snfs, 4.0131);
        assert_eq!(milk.total(), 10.82);

        assert_eq!(sweeteners.sugars.lactose, 4.8069);
        assert_eq!(sweeteners.sugars.total(), 4.8069);

        assert_eq!(pac.sugars, 4.8069);
        assert_eq!(pac.salt, 0.0);
        assert_eq!(pac.msnf_ws_salts, 3.2405);
        assert_eq!(pac.total(), 8.0474);

        assert_abs_diff_eq!(
            SPEC_DAIRY_2_PERCENT.into_composition().unwrap(),
            *COMP_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn into_composition_sweeteners_spec_sucrose() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners.sugars.sucrose, 100.0);
        assert_eq!(solids.sweeteners(), 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(pod, 100.0);
        assert_eq!(pac.sugars, 100.0);
    }

    #[test]
    fn into_composition_sweeteners_spec_dextrose() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(100.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 92.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners.sugars.glucose, 92.0);
        assert_eq!(solids.sweeteners(), 92.0);
        assert_eq!(solids.total(), 92.0);
        assert_eq!(pod, 73.968);
        assert_eq!(pac.sugars, 174.8);
    }

    #[test]
    fn into_composition_sweeteners_spec_fructose() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(100.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners.sugars.fructose, 100.0);
        assert_eq!(solids.sweeteners(), 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(pod, 173.0);
        assert_eq!(pac.sugars, 190.0);
    }

    #[test]
    fn into_composition_sugars_spec_invert_sugar() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(42.5).fructose(42.5).sucrose(15.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 80.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners, Sweeteners::new().sugars(Sugars::new().glucose(34.0).fructose(34.0).sucrose(12.0)));

        assert_eq!(solids.sweeteners(), 80.0);
        assert_eq!(solids.total(), 80.0);
        assert_eq!(pod, 98.156);
        assert_eq!(pac.sugars, 141.2);
    }

    #[test]
    fn into_composition_sweeteners_spec_honey() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
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
        }
        .into_composition()
        .unwrap();

        assert_eq!(
            sweeteners,
            Sweeteners::new().sugars(
                Sugars::new()
                    .glucose(36.0)
                    .fructose(41.0)
                    .sucrose(2.0)
                    .galactose(1.5)
                    .maltose(1.5)
            )
        );

        assert_eq!(solids.sweeteners(), 82.0);
        assert_eq!(solids.snfs(), 1.0);
        assert_eq!(solids.total(), 83.0);
        assert_eq!(pod, 102.354);
        assert_eq!(pac.sugars, 152.65);
    }

    #[test]
    fn into_composition_sweeteners_spec_hfcs42() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new()
                .sugars(Sugars::new().fructose(42.0).glucose(53.0))
                .polysaccharide(5.0),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 76.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(
            sweeteners,
            Sweeteners::new()
                .sugars(Sugars::new().fructose(31.92).glucose(40.28))
                .polysaccharide(3.8)
        );

        assert_eq!(solids.sweeteners(), 72.2);
        assert_eq!(solids.snfs(), 3.8);
        assert_eq!(solids.total(), 76.0);
        assert_eq!(pod, 87.60672000000001);
        assert_eq!(pac.sugars, 137.18);
    }

    #[test]
    fn into_composition_fruits_spec_strawberry() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = FruitsSpec {
            sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
            water: 91.0,
            fat: Some(0.3),
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners, Sweeteners::new().sugars(Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47)));

        assert_abs_diff_eq!(solids.sweeteners(), 4.90, epsilon = TESTS_EPSILON);
        assert_eq!(solids.fats(), 0.3);
        assert_abs_diff_eq!(solids.snfs(), 3.8, epsilon = TESTS_EPSILON);
        assert_abs_diff_eq!(solids.total(), 9.0, epsilon = TESTS_EPSILON);
        assert_eq!(pod, 6.29116);
        assert_eq!(pac.sugars, 8.887);
    }

    #[test]
    fn into_composition_chocolates_spec_70_dark_chocolate() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = ChocolatesSpec {
            cacao_solids: 70.0,
            cocoa_butter: 40.0,
            sugar: Some(30.0),
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners, Sweeteners::new().sugars(Sugars::new().sucrose(30.0)));

        assert_eq!(solids.cocoa.total(), 70.0);
        assert_eq!(solids.cocoa.fats, 40.0);
        assert_eq!(solids.cocoa.snf(), 30.0);
        assert_eq!(solids.other.sweeteners, 30.0);
        assert_eq!(solids.other.snfs, 0.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(pod, 30.0);
        assert_eq!(pac.sugars, 30.0);
        assert_eq!(pac.hardness_factor, 90.0);
        assert_eq!(pac.total(), 30.0);
        assert_eq!(pac.total() - pac.hardness_factor, -60.0);
    }

    #[test]
    fn into_composition_chocolates_spec_100_unsweetened_cocoa_powder() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = ChocolatesSpec {
            cacao_solids: 100.0,
            cocoa_butter: 16.67,
            sugar: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners.total(), 0.0);

        assert_eq!(solids.cocoa.total(), 100.0);
        assert_eq!(solids.cocoa.fats, 16.67);
        assert_eq!(solids.cocoa.snf(), 83.33);
        assert_eq!(solids.other.sweeteners, 0.0);
        assert_eq!(solids.other.snfs, 0.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(pod, 0.0);
        assert_eq!(pac.sugars, 0.0);
    }

    #[test]
    fn into_composition_eggs_spec_egg_yolk() {
        let Composition { solids, micro, .. } = EggsSpec {
            water: 52.0,
            fats: 29.0,
            lecithin: 9.0,
        }
        .into_composition()
        .unwrap();

        assert_eq!(solids.egg.fats, 29.0);
        assert_eq!(solids.egg.snfs, 19.0);
        assert_eq!(solids.total(), 48.0);
        assert_eq!(micro.emulsifiers, 9.0);
    }

    #[test]
    fn into_composition_alcohol_spec_40_abv_spirit() {
        let comp = AlcoholSpec {
            abv: 40.0,
            sugar: None,
            fat: None,
            solids: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(comp.alcohol.to_abv(), 40.0);
        assert_abs_diff_eq!(comp.alcohol.by_weight, 31.56, epsilon = TESTS_EPSILON);
        assert_eq!(comp.solids.total(), 0.0);
        assert_eq!(comp.water(), 68.44);

        assert_eq!(comp.sweeteners.total(), 0.0);
        assert_eq!(comp.pod, 0.0);
        assert_eq!(comp.alcohol.to_pac(), 233.544);
        assert_eq!(comp.pac.total(), 233.544);
        assert_eq!(comp.pac.alcohol, 233.544);
    }

    #[test]
    fn into_composition_alcohol_spec_baileys_irish_cream() {
        let comp = AlcoholSpec {
            abv: 17.0,
            sugar: Some(18.0),
            fat: Some(13.6),
            solids: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(comp.alcohol.to_abv(), 17.0);
        assert_abs_diff_eq!(comp.alcohol.by_weight, 13.413, epsilon = TESTS_EPSILON);
        assert_abs_diff_eq!(comp.solids.total(), 31.6, epsilon = TESTS_EPSILON);
        assert_abs_diff_eq!(comp.water(), 54.987, epsilon = TESTS_EPSILON);

        assert_eq!(comp.sweeteners.total(), 18.0);
        assert_eq!(comp.pod, 18.0);
        assert_eq!(comp.alcohol.to_pac(), 99.2562);
        assert_eq!(comp.pac.alcohol, 99.2562);
        assert_eq!(comp.pac.sugars, 18.0);
        assert_eq!(comp.pac.total(), 117.2562);
    }

    #[test]
    fn into_composition_micro_spec_salt() {
        let Composition { solids, micro, pac, .. } = MicrosSpec::Salt.into_composition().unwrap();
        assert_eq!(solids.other.snfs, 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(micro.salt, 100.0);
        assert_eq!(pac.salt, 585.0);
    }

    #[test]
    fn into_composition_micro_spec_lecithin() {
        let Composition { solids, micro, .. } = MicrosSpec::Lecithin.into_composition().unwrap();
        assert_eq!(solids.other.snfs, 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(micro.emulsifiers, 100.0);
    }

    #[test]
    fn into_composition_micro_spec_stabilizer() {
        let Composition { solids, micro, .. } = MicrosSpec::Stabilizer { strength: 85.0 }.into_composition().unwrap();
        assert_eq!(solids.other.snfs, 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(micro.stabilizers, 85.0);
    }

    #[test]
    fn into_composition_micro_spec_emulsifier() {
        let Composition { solids, micro, .. } = MicrosSpec::Emulsifier { strength: 60.0 }.into_composition().unwrap();
        assert_eq!(solids.other.snfs, 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(micro.emulsifiers, 60.0);
    }

    #[test]
    fn into_composition_emulsifiers_stabilizers_spec() {
        let Composition { solids, micro, .. } = MicrosSpec::EmulsifierStabilizer {
            emulsifier_strength: 70.0,
            stabilizer_strength: 30.0,
        }
        .into_composition()
        .unwrap();

        assert_eq!(solids.other.snfs, 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(micro.emulsifiers, 70.0);
        assert_eq!(micro.stabilizers, 30.0);
    }

    #[test]
    fn into_composition_one_off_spec_water() {
        let comp = OneOffSpec::Water.into_composition().unwrap();

        assert_eq!(comp.water(), 100.0);
        assert_eq!(comp.solids.total(), 0.0);
        assert_eq!(comp.sweeteners.total(), 0.0);
        assert_eq!(comp.micro.salt, 0.0);
        assert_eq!(comp.micro.lecithin, 0.0);
        assert_eq!(comp.micro.emulsifiers, 0.0);
        assert_eq!(comp.micro.stabilizers, 0.0);
        assert_eq!(comp.alcohol.by_weight, 0.0);
        assert_eq!(comp.pod, 0.0);
        assert_eq!(comp.pac.total(), 0.0);
        assert_eq!(comp.pac.hardness_factor, 0.0);
    }

    #[test]
    fn deserialize_ingredient_spec() {
        [
            (ING_SPEC_MILK_2_PERCENT_STR, ING_SPEC_MILK_2_PERCENT.clone()),
            (ING_SPEC_SUCROSE_STR, ING_SPEC_SUCROSE.clone()),
            (ING_SPEC_DEXTROSE_STR, ING_SPEC_DEXTROSE.clone()),
            (ING_SPEC_FRUCTOSE_STR, ING_SPEC_FRUCTOSE.clone()),
            (ING_SPEC_SALT_STR, ING_SPEC_SALT.clone()),
            (ING_SPEC_LECITHIN_STR, ING_SPEC_LECITHIN.clone()),
            (ING_SPEC_STABILIZER_STR, ING_SPEC_STABILIZER.clone()),
            (ING_SPEC_LOUIS_STAB2K_STR, ING_SPEC_LOUIS_STAB2K.clone()),
            (ING_SPEC_WATER_STR, ING_SPEC_WATER.clone()),
            (ING_40_ABV_SPIRITS_STR, ING_SPEC_40_ABV_SPIRIT.clone()),
            (ING_BAILEYS_IRISH_CREAM_STR, ING_SPEC_BAILEYS_IRISH_CREAM.clone()),
        ]
        .iter()
        .for_each(|(spec_str, spec)| {
            assert_eq!(serde_json::from_str::<IngredientSpec>(spec_str).unwrap(), *spec);
        });
    }

    #[test]
    fn ingredient_spec_into_ingredient() {
        [
            (ING_SPEC_MILK_2_PERCENT.clone(), ING_MILK_2_PERCENT.clone()),
            (ING_SPEC_SUCROSE.clone(), ING_SUCROSE.clone()),
            (ING_SPEC_DEXTROSE.clone(), ING_DEXTROSE.clone()),
            (ING_SPEC_FRUCTOSE.clone(), ING_FRUCTOSE.clone()),
        ]
        .iter()
        .for_each(|(spec, ingredient)| {
            assert_abs_diff_eq!(spec.clone().into_ingredient(), *ingredient, epsilon = TESTS_EPSILON);
        });
    }
}
