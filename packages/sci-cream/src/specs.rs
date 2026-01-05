use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "diesel")]
use crate::diesel::ingredients;
#[cfg(feature = "diesel")]
use diesel::{Queryable, Selectable};

use crate::{
    composition::{
        Alcohol, Carbohydrates, CompKey, Composition, Fats, Micro, PAC, ScaleComponents, Solids, SolidsBreakdown,
        Sugars, Sweeteners,
    },
    constants::{self, density::dairy_milliliters_to_grams, molar_mass::pac_from_molar_mass},
    error::{Error, Result},
    ingredients::{Category, Ingredient},
    validate::{assert_are_positive, assert_is_100_percent, assert_is_subset, assert_within_100_percent},
};

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, Polyols},
    constants::composition::{
        STD_LACTOSE_IN_MSNF, STD_MSNF_IN_MILK_SERUM, STD_PROTEIN_IN_MSNF, STD_SATURATED_FAT_IN_MILK_FAT,
    },
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

/// Unit for specifying ingredient amounts in specs, either grams, ml, percent, or molar mass
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum Unit {
    #[serde(rename = "grams")]
    Grams(f64),
    #[serde(rename = "ml")]
    Milliliters(f64),
    #[serde(rename = "percent")]
    Percent(f64),
    #[serde(rename = "molar_mass")]
    MolarMass(f64),
}

impl std::fmt::Display for Unit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Debug::fmt(self, f)
    }
}

/// Scaling method values outside of the main [`CompositionBasis`]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum Scaling<T> {
    /// Value is already for the ingredient as a whole, so it does not require scaling
    OfWhole(T),
    /// Value is for the dry solids, so it is scaled accordingly for the ingredient as a whole
    OfSolids(T),
}

/// Spec for trivial dairy ingredients, e.g. Milk, Cream, Milk Powder, etc.
///
/// For most ingredients it is sufficient to specify the fat content; the rest of the components are
/// calculated from standard values, notably [`STD_MSNF_IN_MILK_SERUM`], [`STD_LACTOSE_IN_MSNF`],
/// [`STD_PROTEIN_IN_MSNF`], and [`STD_SATURATED_FAT_IN_MILK_FAT`]. For milk powder ingredients it's
/// necessary to specify the `msnf`, e.g. 97 for Skimmed MIlk Powder - 3% water, no fat, the rest is
/// milk solids non-fat, or 70 for Whole Milk Powder - 3% water, 27% fat, the rest is `msnf`.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySpec {
    pub fat: f64,
    pub msnf: Option<f64>,
}

impl IntoComposition for DairySpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { fat, msnf } = self;

        let calculated_msnf = (100.0 - fat) * constants::composition::STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);
        assert_are_positive(&[fat, msnf])?;
        assert_within_100_percent(fat + msnf)?;

        let lactose = msnf * constants::composition::STD_LACTOSE_IN_MSNF;
        let proteins = msnf * constants::composition::STD_PROTEIN_IN_MSNF;

        let milk_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(fat)
                    .saturated(fat * constants::composition::STD_SATURATED_FAT_IN_MILK_FAT)
                    .trans(fat * constants::composition::STD_TRANS_FAT_IN_MILK_FAT),
            )
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(lactose)))
            .proteins(proteins)
            .others(msnf - lactose - proteins);

        let pod = milk_solids.carbohydrates.to_pod()?;
        let pad = PAC::new()
            .sugars(milk_solids.carbohydrates.to_pac()?)
            .msnf_ws_salts(msnf * constants::pac::MSNF_WS_SALTS / 100.0);

        Ok(Composition::new()
            .energy(milk_solids.energy()?)
            .solids(Solids::new().milk(milk_solids))
            .pod(pod)
            .pac(pad))
    }
}

/// Spec for dairy ingredients derived from nutrition facts labels, with detailed breakdown
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairyFromNutritionSpec {
    /// Serving size in grams; if given in ml, it is converted to grams based on fat content
    ///
    /// See [`constants::density::dairy_milliliters_to_grams`].
    pub serving_size: Unit,
    /// Energy per serving, in kcal
    pub energy: f64,
    /// Total fat content per serving; it can be given in grams or as a percentage of serving size
    ///
    /// If a dairy product states a fat content percentage on the label, that is usually more
    /// accurate than the whole unit grams in the nutrition facts table, so specifying a total fat
    /// percentage is recommended whenever possible.
    pub total_fat: Unit,
    pub saturated_fat: f64,
    pub trans_fat: f64,
    pub sugars: f64,
    pub protein: f64,
    pub is_lactose_free: bool,
}

impl IntoComposition for DairyFromNutritionSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            serving_size,
            energy,
            total_fat,
            saturated_fat,
            trans_fat,
            sugars,
            protein,
            is_lactose_free,
        } = self;

        let (serving_size, total_fat) = match total_fat {
            Unit::Grams(fat_grams) => match serving_size {
                Unit::Grams(size_grams) => (size_grams, fat_grams),
                Unit::Milliliters(size_ml) => (dairy_milliliters_to_grams(size_ml, fat_grams), fat_grams),
                _ => Err(Error::UnsupportedCompositionUnit(serving_size))?,
            },
            Unit::Percent(fat_percent) => match serving_size {
                Unit::Grams(size_grams) => (size_grams, size_grams * fat_percent / 100.0),
                Unit::Milliliters(size_ml) => {
                    let size_grams = dairy_milliliters_to_grams(size_ml, fat_percent);
                    (size_grams, size_grams * fat_percent / 100.0)
                }
                _ => Err(Error::UnsupportedCompositionUnit(serving_size))?,
            },
            _ => Err(Error::UnsupportedCompositionUnit(serving_size))?,
        };

        assert_are_positive(&[serving_size, total_fat, saturated_fat, trans_fat, sugars, protein])?;
        assert_is_subset(saturated_fat, total_fat, "Saturated fat cannot exceed total fat".to_string())?;
        assert_is_subset(trans_fat, total_fat, "Trans fats cannot exceed total fats".to_string())?;
        assert_is_subset(
            total_fat + sugars + protein,
            serving_size,
            "Sum of fats, sugars, and proteins cannot exceed serving size".to_string(),
        )?;

        let sugars = if !is_lactose_free {
            Sugars::new().lactose(sugars / serving_size * 100.0)
        } else {
            Sugars::new()
                .glucose(sugars / serving_size * 100.0 / 2.0)
                .galactose(sugars / serving_size * 100.0 / 2.0)
        };

        let milk_solids = SolidsBreakdown::new()
            .fats(
                Fats::new()
                    .total(total_fat / serving_size * 100.0)
                    .saturated(saturated_fat / serving_size * 100.0)
                    .trans(trans_fat / serving_size * 100.0),
            )
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .proteins(protein / serving_size * 100.0);

        Ok(Composition::new()
            .energy(energy / serving_size * 100.0)
            .solids(Solids::new().milk(milk_solids))
            .pod(sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(sugars.to_pac()?)
                    .msnf_ws_salts(milk_solids.snf() * constants::pac::MSNF_WS_SALTS / 100.0),
            ))
    }
}

/// Spec for sweeteners, with a specified [`Sweeteners`] composition and optional POD/PAC
///
/// If [`basis`](Self::basis) is [`ByDryWeight`](CompositionBasis::ByDryWeight), the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the dry weight (solids), its total plus [`other_carbohydrates`](Self::other_carbohydrates) and
/// [`other_solids`](Self::other_solids) adding up to 100. For example, Invert Sugar might be
/// composed of `sugars.glucose = 42.5`, `sugars.fructose = 42.5`, and `sugars.sucrose = 15`, with
/// `ByDryWeight { solids: 80 }`, meaning that 85% of the sucrose was split into glucose/fructose,
/// with 15% sucrose remaining, and the syrup containing 20% water. If [`basis`](Self::basis) is
/// [`ByTotalWeight`](CompositionBasis::ByTotalWeight), then the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the total weight of the ingredient, their total plus `other_carbohydrates`, `other_solids`, and
/// `water` adding up to 100. For example, Honey might be composed of `sugars.glucose = 36`,
/// `sugars.fructose = 41`, `sugars.sucrose = 2`, and `other_solids = 1`, with `ByTotalWeight {
/// water = 20 }`.
///
/// [`other_carbohydrates`](Self::other_carbohydrates) are any carbohydrates other than mono- and
/// disaccharides, e.g. maltodextrin and oligosaccharides found in glucose/corn syrups.
/// [`other_solids`](Self::other_solids) represents any non-sweetener impurities that may be in the
/// ingredient, e.g. minerals, pollen, etc., for example 1% in Honey. This value should rarely be
/// needed, and is assumed to be zero if not specified. This field is also scaled depending on the
/// chosen [`basis`](Self::basis).
///
/// If the POD or PAC values are not specified, then they are automatically calculated based on the
/// composition of known mono- and disaccharides. If the PAC value is in [`Unit::MolarMass`], then
/// it is calculated via [`pac_from_molar_mass`]. If specified, POD and PAC values are scaled based
/// on the [`Scaling`]. If [`OfWhole`](Scaling::OfWhole) then they are left as-is, since they are
/// already for the ingredient as a whole. If [`OfSolids`](Scaling::OfSolids), then they are scaled
/// based on the dry solids content. Note that this scaling is independent of the chosen
/// [`basis`](Self::basis).
///
/// For automatic calculations the [`other_carbohydrates`](Self::other_carbohydrates) and
/// [`other_solids`](Self::other_solids) components are ignored, and it is an error if
/// [`sugars.other`](Sugars::other), [`polyols.other`](Polyols::other), or
/// [`artificial.other`](ArtificialSweeteners::other) are non-zero.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SweetenerSpec {
    pub sweeteners: Sweeteners,
    pub other_carbohydrates: Option<f64>,
    pub other_solids: Option<f64>,
    #[serde(flatten)]
    pub basis: CompositionBasis,
    pub pod: Option<Scaling<f64>>,
    pub pac: Option<Scaling<Unit>>,
}

impl IntoComposition for SweetenerSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            sweeteners,
            other_carbohydrates,
            other_solids,
            basis,
            pod,
            pac,
        } = self;

        let other_carbohydrates = other_carbohydrates.unwrap_or(0.0);
        let other_solids = other_solids.unwrap_or(0.0);
        assert_are_positive(&[other_carbohydrates, other_solids])?;

        let mut factor = None;

        match basis {
            CompositionBasis::ByDryWeight { solids } => {
                assert_within_100_percent(sweeteners.total() + other_carbohydrates + other_solids)?;
                assert_within_100_percent(solids)?;

                factor = Some(solids / 100.0);
            }
            CompositionBasis::ByTotalWeight { water } => {
                assert_is_100_percent(sweeteners.total() + other_carbohydrates + other_solids + water)?;
            }
        };

        let (sweeteners, other_carbohydrates, other_solids) = if let Some(factor) = factor {
            (sweeteners.scale(factor), other_carbohydrates * factor, other_solids * factor)
        } else {
            (sweeteners, other_carbohydrates, other_solids)
        };

        let solids = SolidsBreakdown::new()
            .carbohydrates(
                Carbohydrates::new()
                    .sugars(sweeteners.sugars)
                    .polyols(sweeteners.polyols)
                    .others(other_carbohydrates),
            )
            .artificial_sweeteners(sweeteners.artificial)
            .others(other_solids);

        let pod = match pod {
            None => sweeteners.to_pod()?,
            Some(scaling) => match scaling {
                Scaling::OfWhole(value) => value,
                Scaling::OfSolids(value) => value * (solids.total() / 100.0),
            },
        };

        let pac = match pac {
            None => sweeteners.to_pac()?,
            Some(scaling) => {
                let (unit, factor) = match scaling {
                    Scaling::OfWhole(unit) => (unit, 1.0),
                    Scaling::OfSolids(unit) => (unit, solids.total() / 100.0),
                };

                match unit {
                    Unit::Grams(grams) => grams * factor,
                    Unit::MolarMass(molar_mass) => pac_from_molar_mass(molar_mass) * factor,
                    _ => Err(Error::UnsupportedCompositionUnit(unit))?,
                }
            }
        };

        Ok(Composition::new()
            .energy(solids.energy()?)
            .solids(Solids::new().other(solids))
            .pod(pod)
            .pac(PAC::new().sugars(pac)))
    }
}

/// Spec for fruit ingredients, with a specified [`Sugars`] composition and water content
///
/// Fruits are specified by their [`sugar`](Self::sugars) content (glucose, fructose, sucrose,
/// etc.), [`water`](Self::water) content, and optional [`energy`](Self::energy),
/// [`protein`](Self::protein), [`fat`](Self::fat), and [`fiber`](Self::fiber) content. If `energy`
/// is not specified, it is automatically calculated from the rest of the composition. If
/// `carbohydrates` is not specified, then it is equal to `sugars`. If any other optional values are
/// not specified, they are assumed to be zero. Adding up all the components, any remaining portion
/// up to 100% is assumed to be non-fat, non-sugar solids (snfs).
///
/// The composition for fruit ingredients can usually be found in food composition databases, like
/// [USDA FoodData Central](https://fdc.nal.usda.gov/food-search).
///
/// # Examples
///
/// (Strawberries, raw, 2019)[^101] per 100g:
/// - Water: 91g
/// - Energy: 32 kcal
/// - Protein: 0.67g
/// - Total lipid (fat): 0.3g
/// - Carbohydrate: 7.68g
/// - Fiber: 2g
/// - Sucrose: 0.47g
/// - Glucose: 1.99g
/// - Fructose: 2.44g
///
/// ```
/// # use sci_cream::docs::assert_eq_float;
/// use sci_cream::{
///     composition::{CompKey, Sugars, Sweeteners},
///     specs::{FruitSpec, IntoComposition}
/// };
///
/// let comp = FruitSpec {
///     water: 91.0,
///     energy: Some(32.0),
///     protein: Some(0.7),
///     fat: Some(0.3),
///     carbohydrates: Some(7.68),
///     fiber: Some(2.0),
///     sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::Energy), 32.0);
/// assert_eq!(comp.get(CompKey::TotalProteins), 0.7);
/// assert_eq!(comp.get(CompKey::TotalFats), 0.3);
/// assert_eq!(comp.get(CompKey::TotalCarbohydrates), 7.68);
///
/// assert_eq!(comp.get(CompKey::Glucose), 1.99);
/// assert_eq!(comp.get(CompKey::Fructose), 2.44);
/// assert_eq!(comp.get(CompKey::Sucrose), 0.47);
///
/// assert_eq_float!(comp.get(CompKey::POD), 6.28312);
/// assert_eq!(comp.get(CompKey::PACsgr), 8.887);
/// ```
#[doc = include_str!("../docs/bibs/101.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FruitSpec {
    pub water: f64,
    pub energy: Option<f64>,
    pub protein: Option<f64>,
    pub fat: Option<f64>,
    pub carbohydrates: Option<f64>,
    pub fiber: Option<f64>,
    pub sugars: Sugars,
}

impl IntoComposition for FruitSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            water,
            energy,
            protein,
            fat,
            carbohydrates,
            fiber,
            sugars,
        } = self;

        let protein = protein.unwrap_or(0.0);
        let fat = fat.unwrap_or(0.0);
        let fiber = fiber.unwrap_or(0.0);
        let carbohydrates = carbohydrates.unwrap_or(fiber + sugars.total());

        assert_is_subset(fiber + sugars.total(), carbohydrates, "Sugars + fiber <= carbohydrates".to_string())?;
        assert_are_positive(&[water, protein, fat, carbohydrates, fiber, sugars.total()])?;
        assert_within_100_percent(water + protein + fat + carbohydrates)?;

        let solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fat))
            .carbohydrates(
                Carbohydrates::new()
                    .sugars(sugars)
                    .fiber(fiber)
                    .others_from_total(carbohydrates)?,
            )
            .proteins(protein)
            .others_from_total(100.0 - water)?;

        let energy = energy.unwrap_or(solids.energy()?);
        assert_are_positive(&[energy])?;

        Ok(Composition::new()
            .energy(energy)
            .solids(Solids::new().other(solids))
            .pod(solids.carbohydrates.to_pod()?)
            .pac(PAC::new().sugars(solids.carbohydrates.to_pac()?)))
    }
}

/// Spec for chocolate ingredients, with cacao solids, cocoa butter, and optional sugar
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
/// The relation of the above components is `cacao solids = cocoa butter + cocoa solids`. The sugar
/// content of chocolate ingredients is optional, assumed to be zero if not specified, as some
/// chocolates (e.g. Unsweetened Chocolate) may not contain any sugar at all. Any non-zero sugar
/// content is specified in [`Composition`] accessible via [`CompKey::TotalSugars`]. The total
/// solids content of chocolate ingredients is assumed to be 100% (i.e. no water content). If
/// [`sugar`](Self::sugar) and [`cacao_solids`](Self::cacao_solids) do not add up to 100%, then the
/// remaining portion is assumed to be other non-sugar, non-fat solids, specified in [`Composition`]
/// accessible via [`CompKey::OtherSNFS`], e.g. emulsifiers, impurities in demerara sugar, etc.
/// Cocoa Powder products are typically 100% cacao solids, with no sugar, and cocoa butter content
/// ranging from ~10-24%.
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

impl IntoComposition for ChocolateSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            cacao_solids,
            cocoa_butter,
            sugar,
        } = self;

        let sugar = sugar.unwrap_or(0.0);

        assert_are_positive(&[cacao_solids, cocoa_butter, sugar])?;
        assert_is_subset(cocoa_butter, cacao_solids, "Cacao butter must be a subset of cacao solids".to_string())?;
        assert_within_100_percent(cacao_solids + sugar)?;

        let cocoa_snf = cacao_solids - cocoa_butter;
        let sugars = Sugars::new().sucrose(sugar);

        let cocoa_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(cocoa_butter))
            .others_from_total(cacao_solids)?;

        let other_solids = SolidsBreakdown::new()
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .others_from_total(100.0 - cacao_solids)?;

        Ok(Composition::new()
            .energy(cocoa_solids.energy()? + other_solids.energy()?)
            .solids(Solids::new().cocoa(cocoa_solids).other(other_solids))
            .pod(sugars.to_pod().unwrap())
            .pac(
                PAC::new().sugars(sugars.to_pac().unwrap()).hardness_factor(
                    cocoa_butter * constants::hf::CACAO_BUTTER + cocoa_snf * constants::hf::COCOA_SOLIDS,
                ),
            ))
    }
}

/// Spec for nut ingredients, usually nut butters, with fat, sugar, and water content
///
/// Nut ingredients are specified by their [`fat`](Self::fat) content, [`sugar`](Self::sugar)
/// content, and [`water`](Self::water) content, by total weight. The remaining portion up to 100%
/// is assumed to be non-fat, non-sugar solids (snfs). Sugars are assumed to be all sucrose. Fat and
/// sugar values are specified in [`Composition`] via [`CompKey::NutFat`] and
/// [`CompKey::TotalSweeteners`], respectively.
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
/// assert_eq!(comp.get(CompKey::NutSNF), 41.34);
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

impl IntoComposition for NutSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { fat, sugar, water } = self;

        assert_are_positive(&[fat, sugar, water])?;
        assert_within_100_percent(fat + sugar + water)?;

        let sugars = Sugars::new().sucrose(sugar);

        let nut_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fat))
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .others_from_total(100.0 - water)?;

        Ok(Composition::new()
            .energy(nut_solids.energy()?)
            .solids(Solids::new().nut(nut_solids))
            .pod(sugars.to_pod().unwrap())
            .pac(
                PAC::new()
                    .sugars(sugars.to_pac().unwrap())
                    .hardness_factor(fat * constants::hf::NUT_FAT),
            ))
    }
}

/// Spec for egg ingredients, with water content, fat content, and lecithin (emulsifier) content
///
/// The composition of egg ingredients can usually be found in food composition databases, like
/// [USDA FoodData Central](https://fdc.nal.usda.gov/food-search), in the manufacturers' data, or in
/// reference texts, e.g. _Ice Cream 7th Edition_ (Goff & Hartel, 2013, p. 49)[^2] or _The Science
/// of Ice Cream_ (Clarke, 2004, p. 49)[^4]. Note that [`lecithin`](Self::lecithin) is a subset of
/// [`fats`](Self::fats) and considered an emulsifier with relative strength of 100, specified in
/// [`Composition`] via [`CompKey::Emulsifiers`]. The remaining portion of `100 - water - fats` is
/// assumed to be non-fat solids (snf), specified in [`Composition`] via [`CompKey::EggSNF`].
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
/// assert_eq!(comp.get(CompKey::EggSNF), 19.0);
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

impl IntoComposition for EggSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { water, fats, lecithin } = self;

        assert_are_positive(&[water, fats, lecithin])?;
        assert_within_100_percent(water + fats)?;
        assert_is_subset(lecithin, fats, "Lecithin must be a subset of fats".to_string())?;

        let egg_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fats))
            .others_from_total(100.0 - water)?;

        Ok(Composition::new()
            .energy(egg_solids.energy()?)
            .solids(Solids::new().egg(egg_solids))
            .micro(Micro::new().lecithin(lecithin).emulsifiers(lecithin)))
    }
}

/// Spec for alcohol beverages and other ingredients, with ABV, optional sugar, fat, and solids
///
/// The composition of spirits is trivial, consisting of only the [`ABV`](Self::abv) ("Alcohol by
/// volume", 2025)[^8]) that is always present on the label, and is internally converted to `ABW`
/// (Alcohol by weight) via [`constants::density::ABV_TO_ABW_RATIO`]. Liqueurs, creams, and other
/// alcohol ingredients may also contain sugar, fat, and other solids. These can be tricky to find,
/// since nutrition facts tables are not usually mandated for alcoholic beverages. The best approach
/// is to find a nutrition facts table from the manufacturer if available, otherwise to look for
/// unofficial sources online. Aside from `ABV`, the exact composition is not usually critical,
/// since alcohol ingredients are typically used in small amounts in ice cream mixes.
///
/// In the fields below, [`sugar`](Self::sugar) is assumed to be sucrose, zero if not specified, and
/// its contributions to PAC and POD are internally calculated accordingly. [`fat`](Self::fat), zero
/// if not specified, is stored in [`Composition`] accessible via [`CompKey::OtherFats`]. If
/// [`solids`](Self::solids) is not specified, it is calculated as `sugar + fat`. If specified, it
/// is required that `solids >= sugar + fat`. `solids` less `sugar` and `fat` is store in
/// [`Composition`] accessible via [`CompKey::OtherSNFS`]. Overall, `abw` plus `solids` must not
/// exceed 100%, i.e. `abw + solids <= 100%`.
#[doc = include_str!("../docs/bibs/8.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AlcoholSpec {
    pub abv: f64,
    pub sugar: Option<f64>,
    pub fat: Option<f64>,
    pub solids: Option<f64>,
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

        assert_are_positive(&[abv, sugar, fat, solids])?;
        assert_is_subset(sugar + fat, solids, "Sugar and fat must be a subset of solids".to_string())?;
        assert_within_100_percent(alcohol.by_weight + solids)?;

        let sugars = Sugars::new().sucrose(sugar);

        let solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fat))
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .others_from_total(solids)?;

        Ok(Composition::new()
            .energy(solids.energy()? + alcohol.energy())
            .solids(Solids::new().other(solids))
            .alcohol(alcohol)
            .pod(sugars.to_pod().unwrap())
            .pac(PAC::new().sugars(sugars.to_pac().unwrap()).alcohol(alcohol.to_pac())))
    }
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

impl IntoComposition for MicroSpec {
    fn into_composition(self) -> Result<Composition> {
        let make_emulsifier_stabilizer_composition =
            |emulsifiers_strength: Option<f64>, stabilizers_strength: Option<f64>| -> Result<Composition> {
                let emulsifiers_strength = emulsifiers_strength.unwrap_or(0.0);
                let stabilizers_strength = stabilizers_strength.unwrap_or(0.0);

                assert_are_positive(&[emulsifiers_strength, stabilizers_strength])?;

                Ok(Composition::new()
                    .solids(Solids::new().other(SolidsBreakdown::new().others(100.0)))
                    .micro(
                        Micro::new()
                            .emulsifiers(emulsifiers_strength)
                            .stabilizers(stabilizers_strength),
                    ))
            };

        match self {
            MicroSpec::Salt => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().others(100.0)))
                .micro(Micro::new().salt(100.0))
                .pac(PAC::new().salt(constants::pac::SALT))),
            MicroSpec::Lecithin => Ok(Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().others(100.0)))
                .micro(Micro::new().lecithin(100.0).emulsifiers(100.0))),
            MicroSpec::Stabilizer { strength } => make_emulsifier_stabilizer_composition(None, Some(strength)),
            MicroSpec::Emulsifier { strength } => make_emulsifier_stabilizer_composition(Some(strength), None),
            MicroSpec::EmulsifierStabilizer {
                emulsifier_strength,
                stabilizer_strength,
            } => make_emulsifier_stabilizer_composition(Some(emulsifier_strength), Some(stabilizer_strength)),
        }
    }
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
    pub micro: Option<Micro>,
    pub abv: Option<f64>,
    pub pod: Option<f64>,
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

        let (solids, micro, pod, pac) = (
            solids.unwrap_or_default(),
            micro.unwrap_or_default(),
            pod.unwrap_or_default(),
            pac.unwrap_or_default(),
        );

        let alcohol = if let Some(abv) = abv {
            Alcohol::from_abv(abv)
        } else {
            Alcohol::default()
        };

        let comp = Composition::new()
            .energy(solids.all().energy()? + alcohol.energy())
            .solids(solids)
            .micro(micro)
            .alcohol(alcohol)
            .pod(pod)
            .pac(pac);

        assert_within_100_percent(comp.get(CompKey::TotalSolids) + comp.get(CompKey::Alcohol))?;

        Ok(comp)
    }
}

/// Tagged enum for all the supported specs, which is useful for (de)serialization of specs.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[allow(clippy::large_enum_variant)] // @todo Deal with this issue later
pub enum Spec {
    DairySpec(DairySpec),
    DairyFromNutritionSpec(DairyFromNutritionSpec),
    SweetenerSpec(SweetenerSpec),
    FruitSpec(FruitSpec),
    ChocolateSpec(ChocolateSpec),
    NutSpec(NutSpec),
    EggSpec(EggSpec),
    AlcoholSpec(AlcoholSpec),
    MicroSpec(MicroSpec),
    FullSpec(FullSpec),
}

impl IntoComposition for Spec {
    fn into_composition(self) -> Result<Composition> {
        match self {
            Spec::DairySpec(spec) => spec.into_composition(),
            Spec::DairyFromNutritionSpec(spec) => spec.into_composition(),
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

#[cfg_attr(feature = "diesel", derive(Queryable, Selectable), diesel(table_name = ingredients))]
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct IngredientSpec {
    pub name: String,
    pub category: Category,
    #[serde(flatten)]
    pub spec: Spec,
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

impl IntoComposition for IngredientSpec {
    fn into_composition(self) -> Result<Composition> {
        self.spec.into_composition()
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
    use crate::composition::{CompKey, Polyols};

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
            .energy(49.5756)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.3).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.8069)))
                        .proteins(3.087)
                        .others_from_total(2.0 + 8.82)
                        .unwrap(),
                ),
            )
            .pod(0.769104)
            .pac(PAC::new().sugars(4.8069).msnf_ws_salts(3.2405))
    });

    #[test]
    fn into_composition_dairy_spec_2_milk() {
        let comp = ING_SPEC_DAIRY_2_MILK.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 49.5756);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.8069);
        assert_eq!(comp.get(CompKey::MSNF), 8.82);
        assert_eq!(comp.get(CompKey::MilkSNFS), 4.0131);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.087);
        assert_eq!(comp.get(CompKey::MilkSolids), 10.82);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.087);
        assert_eq!(comp.get(CompKey::TotalSolids), 10.82);
        assert_eq!(comp.get(CompKey::Water), 89.18);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.769104);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.8069);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.2405);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 8.0474);
    }

    pub(crate) const ING_SPEC_DAIRY_3_25_MILK_STR: &str = r#"{
      "name": "3.25% Milk",
      "category": "Dairy",
      "DairySpec": {
        "fat": 3.25
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_3_25_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "3.25% Milk".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec { fat: 3.25, msnf: None }),
    });

    pub(crate) static COMP_3_25_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(60.42285)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(2.1125).trans(0.11375))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.7456)))
                        .proteins(3.0476)
                        .others(0.9143),
                ),
            )
            .pod(0.7593)
            .pac(PAC::new().sugars(4.7456).msnf_ws_salts(3.1992))
    });

    #[test]
    fn into_composition_dairy_spec_3_25_milk() {
        let comp = ING_SPEC_DAIRY_3_25_MILK.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 60.42285);

        assert_eq!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.7456);
        assert_eq!(comp.get(CompKey::MSNF), 8.7075);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.9619);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.0476);
        assert_eq!(comp.get(CompKey::MilkSolids), 11.9575);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.0476);
        assert_eq!(comp.get(CompKey::TotalSolids), 11.9575);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.0425);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7593);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.7456);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.1992);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 7.9448);
    }

    pub(crate) const ING_SPEC_DAIRY_40_CREAM_STR: &str = r#"{
      "name": "40% Cream",
      "category": "Dairy",
      "DairySpec": {
        "fat": 40
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_40_CREAM: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "40% Cream".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec { fat: 40.0, msnf: None }),
    });

    pub(crate) static COMP_40_CREAM: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(379.332)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(40.0).saturated(26.0).trans(1.4))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.943)))
                        .proteins(1.89)
                        .others_from_total(40.0 + 5.4)
                        .unwrap(),
                ),
            )
            .pod(0.47088)
            .pac(PAC::new().sugars(2.943).msnf_ws_salts(1.984))
    });

    #[test]
    fn into_composition_dairy_spec_40_cream() {
        let comp = ING_SPEC_DAIRY_40_CREAM.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 379.332);

        assert_eq!(comp.get(CompKey::MilkFat), 40.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.943);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 5.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 2.457);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 1.89);
        assert_eq!(comp.get(CompKey::MilkSolids), 45.4);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 1.89);
        assert_eq!(comp.get(CompKey::TotalSolids), 45.4);
        assert_eq!(comp.get(CompKey::Water), 54.6);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.47088);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.943);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 1.984);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 4.927);
    }

    pub(crate) const ING_SPEC_DAIRY_SKIMMED_POWDER_STR: &str = r#"{
      "name": "Skimmed Milk Powder",
      "category": "Dairy",
      "DairySpec": {
        "fat": 0,
        "msnf": 97
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SKIMMED_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Skimmed Milk Powder".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec {
            fat: 0.0,
            msnf: Some(97.0),
        }),
    });

    pub(crate) static COMP_SKIMMED_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(347.26)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(52.865)))
                        .proteins(33.95)
                        .others_from_total(97.0)
                        .unwrap(),
                ),
            )
            .pod(8.4584)
            .pac(PAC::new().sugars(52.865).msnf_ws_salts(35.6382))
    });

    #[test]
    fn into_composition_dairy_spec_skimmed_powder() {
        let comp = ING_SPEC_DAIRY_SKIMMED_POWDER.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 347.26);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 52.865);
        assert_eq!(comp.get(CompKey::MSNF), 97.0);
        assert_eq!(comp.get(CompKey::MilkSNFS), 44.135);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 33.95);
        assert_eq!(comp.get(CompKey::MilkSolids), 97.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 33.95);
        assert_eq!(comp.get(CompKey::TotalSolids), 97.0);
        assert_eq!(comp.get(CompKey::Water), 3.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 8.4584);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 52.865);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.6382);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 88.5032);
    }

    pub(crate) const ING_SPEC_DAIRY_WHOLE_POWDER_STR: &str = r#"{
      "name": "Whole Milk Powder",
      "category": "Dairy",
      "DairySpec": {
        "fat": 27,
        "msnf": 70
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_WHOLE_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Whole Milk Powder".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(DairySpec {
            fat: 27.0,
            msnf: Some(70.0),
        }),
    });

    pub(crate) static COMP_WHOLE_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(493.6)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(27.0).saturated(17.55).trans(0.945))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(38.15)))
                        .proteins(24.5)
                        .others_from_total(97.0)
                        .unwrap(),
                ),
            )
            .pod(6.104)
            .pac(PAC::new().sugars(38.15).msnf_ws_salts(25.7183))
    });

    #[test]
    fn into_composition_dairy_spec_whole_powder() {
        let comp = ING_SPEC_DAIRY_WHOLE_POWDER.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 493.6);

        assert_eq!(comp.get(CompKey::MilkFat), 27.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 38.15);
        assert_eq!(comp.get(CompKey::MSNF), 70.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 31.85);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 24.5);
        assert_eq!(comp.get(CompKey::MilkSolids), 97.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 24.5);
        assert_eq!(comp.get(CompKey::TotalSolids), 97.0);
        assert_eq!(comp.get(CompKey::Water), 3.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 6.104);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 38.15);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 25.7183);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 63.8683);
    }

    pub(crate) const ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK_STR: &str = r#"{
      "name": "3.25% Milk (from nutrition facts)",
      "category": "Dairy",
      "DairyFromNutritionSpec": {
        "serving_size": { "ml": 250 },
        "energy": 160,
        "total_fat": { "percent": 3.25 },
        "saturated_fat": 5,
        "trans_fat": 0.3,
        "sugars": 13,
        "protein": 9,
        "is_lactose_free": false
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "3.25% Milk (from nutrition facts)".to_string(),
            category: Category::Dairy,
            spec: Spec::DairyFromNutritionSpec(DairyFromNutritionSpec {
                serving_size: Unit::Milliliters(250.0), // 257.6667 grams
                energy: 160.0,
                total_fat: Unit::Percent(3.25), // 3.25% is 8.3742g, not 8g
                saturated_fat: 5.0,
                trans_fat: 0.3,
                sugars: 13.0,
                protein: 9.0,
                is_lactose_free: false,
            }),
        });

    pub(crate) static COMP_3_25_MILK_FROM_NUTRITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(62.0957)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(1.9405).trans(0.1164))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.04528)))
                        .proteins(3.49288),
                ),
            )
            .pod(0.8072)
            .pac(PAC::new().sugars(5.04528).msnf_ws_salts(3.137))
    });

    #[test]
    fn into_composition_dairy_from_nutrition_spec_3_25_milk() {
        let comp = ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 62.0957);

        assert_eq!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.04528);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.53816);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.78816);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.49288);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.78816);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.2118);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.8072);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 5.04528);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.137);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 8.1823);
    }

    pub(crate) const ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR: &str = r#"{
      "name": "Whole Ultra-Filtered Lactose-Free Milk",
      "category": "Dairy",
      "DairyFromNutritionSpec": {
        "serving_size": { "ml": 240 },
        "energy": 150,
        "total_fat": { "grams": 8 },
        "saturated_fat": 5,
        "trans_fat": 0,
        "sugars": 6,
        "protein": 13,
        "is_lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Whole Ultra-Filtered Lactose-Free Milk".to_string(),
            category: Category::Dairy,
            spec: Spec::DairyFromNutritionSpec(DairyFromNutritionSpec {
                serving_size: Unit::Milliliters(240.0), // 245.1288 grams
                energy: 150.0,
                total_fat: Unit::Grams(8.0), // 8g is 3.2636%
                saturated_fat: 5.0,
                trans_fat: 0.0,
                sugars: 6.0,
                protein: 13.0,
                is_lactose_free: true,
            }),
        });

    pub(crate) static COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.1923)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.2636).saturated(2.0397).trans(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(1.22385).galactose(1.22385)))
                        .proteins(5.3033),
                ),
            )
            .pod(1.7746)
            .pac(PAC::new().sugars(4.65063).msnf_ws_salts(2.8477))
    });

    #[test]
    fn into_composition_dairy_spec_whole_ultra_filtered_lactose_free() {
        let comp = ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE
            .spec
            .into_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 61.1923);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 3.2636);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 1.22385);
        assert_eq_flt_test!(comp.get(CompKey::Galactose), 1.22385);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 7.751);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.0146);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.3033);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.0146);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.9854);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.7746);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.65063);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 2.8477);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 7.4983);
    }

    pub(crate) const ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE_STR: &str = r#"{
      "name": "Whey Isolate",
      "category": "Dairy",
      "DairyFromNutritionSpec": {
        "serving_size": { "grams": 39 },
        "energy": 150,
        "total_fat": { "grams": 0.5 },
        "saturated_fat": 0.3,
        "trans_fat": 0,
        "sugars": 1,
        "protein": 35,
        "is_lactose_free": false
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Whey Isolate".to_string(),
            category: Category::Dairy,
            spec: Spec::DairyFromNutritionSpec(DairyFromNutritionSpec {
                serving_size: Unit::Grams(39.0),
                energy: 150.0,
                total_fat: Unit::Grams(0.5),
                saturated_fat: 0.3,
                trans_fat: 0.0,
                sugars: 1.0,
                protein: 35.0,
                is_lactose_free: false,
            }),
        });

    pub(crate) static COMP_WHEY_ISOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(384.6154)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.2821).saturated(0.7692).trans(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.5641)))
                        .proteins(89.7436),
                ),
            )
            .pod(0.4103)
            .pac(PAC::new().sugars(2.5641).msnf_ws_salts(33.9142))
    });

    #[test]
    fn into_composition_dairy_from_nutrition_spec_whey_isolate() {
        let comp = ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE
            .spec
            .into_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 384.6154);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.2821);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.5641);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 92.3077);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 93.5898);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 93.5898);
        assert_eq_flt_test!(comp.get(CompKey::Water), 6.4102);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.4103);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.5641);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 33.9142);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 36.4783);
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
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_SUCROSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(400.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(100.0))),
                ))
                .pod(100.0)
                .pac(PAC::new().sugars(100.0))
        });

    #[test]
    fn into_composition_sweetener_spec_sucrose() {
        let comp = ING_SPEC_SWEETENER_SUCROSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Sucrose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
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
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 92.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_DEXTROSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(368.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(92.0))),
                ))
                .pod(73.6)
                .pac(PAC::new().sugars(174.8))
        });

    #[test]
    fn into_composition_sweetener_spec_dextrose() {
        let comp = ING_SPEC_SWEETENER_DEXTROSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 368.0);

        assert_eq!(comp.get(CompKey::Glucose), 92.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 92.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 92.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 92.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 92.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 73.6);
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
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_FRUCTOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(400.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().fructose(100.0))),
            ))
            .pod(173.0)
            .pac(PAC::new().sugars(190.0))
    });

    #[test]
    fn into_composition_sweetener_spec_fructose() {
        let comp = ING_SPEC_SWEETENER_FRUCTOSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Fructose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 173.0);
        assert_eq!(comp.get(CompKey::PACsgr), 190.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_TREHALOSE_STR: &str = r#"{
      "name": "Trehalose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "trehalose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_TREHALOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Trehalose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().trehalose(100.0)),
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_TREHALOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(400.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().trehalose(100.0))),
            ))
            .pod(45.0)
            .pac(PAC::new().sugars(100.0))
    });

    #[test]
    fn into_composition_sweetener_spec_trehalose() {
        let comp = ING_SPEC_SWEETENER_TREHALOSE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 400.0);

        assert_eq!(comp.get(CompKey::Trehalose), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 100.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 45.0);
        assert_eq!(comp.get(CompKey::PACsgr), 100.0);
    }

    pub(crate) const ING_SPEC_SWEETENER_ERYTHRITOL_STR: &str = r#"{
      "name": "Erythritol",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "polyols": {
            "erythritol": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_ERYTHRITOL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Erythritol".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().polyols(Polyols::new().erythritol(100.0)),
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }),
    });

    pub(crate) static COMP_ERYTHRITOL: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(0.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().polyols(Polyols::new().erythritol(100.0))),
            ))
            .pod(70.0)
            // @todo Should PAC for polyols be separate?
            .pac(PAC::new().sugars(280.0))
    });

    #[test]
    fn into_composition_sweetener_spec_erythritol() {
        let comp = ING_SPEC_SWEETENER_ERYTHRITOL.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);

        assert_eq!(comp.get(CompKey::Erythritol), 100.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 0.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 100.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 100.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 100.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::POD), 70.0);
        assert_eq!(comp.get(CompKey::PACsgr), 280.0);
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
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 80.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_invert_sugar() {
        let comp = ING_SPEC_SWEETENER_INVERT_SUGAR.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 320.0);

        assert_eq!(comp.get(CompKey::Glucose), 34.0);
        assert_eq!(comp.get(CompKey::Fructose), 34.0);
        assert_eq!(comp.get(CompKey::Sucrose), 12.0);
        assert_eq!(comp.get(CompKey::TotalSugars), 80.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 80.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 80.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 98.02);
        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 141.2);
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
            other_carbohydrates: None,
            other_solids: Some(1.0),
            basis: CompositionBasis::ByTotalWeight { water: 17.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_honey() {
        let comp = ING_SPEC_SWEETENER_HONEY.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 328.0);

        assert_eq!(comp.get(CompKey::Glucose), 36.0);
        assert_eq!(comp.get(CompKey::Fructose), 41.0);
        assert_eq!(comp.get(CompKey::Sucrose), 2.0);
        assert_eq!(comp.get(CompKey::Galactose), 1.5);
        assert_eq!(comp.get(CompKey::Maltose), 1.5);
        assert_eq!(comp.get(CompKey::TotalSugars), 82.0);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 82.0);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 82.0);
        assert_eq!(comp.get(CompKey::TotalSNFS), 1.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 83.0);
        assert_eq!(comp.get(CompKey::POD), 103.185);
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
          }
        },
        "other_carbohydrates": 5,
        "ByDryWeight": {
          "solids": 76
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HFCS42: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "HFCS 42".to_string(),
        category: Category::Sweetener,
        spec: Spec::SweetenerSpec(SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(42.0).glucose(53.0)),
            other_carbohydrates: Some(5.0),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 76.0 },
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_sweetener_spec_hfcs42() {
        let comp = ING_SPEC_SWEETENER_HFCS42.spec.into_composition().unwrap();

        // @todo This is a bit higher than reference 281
        assert_eq!(comp.get(CompKey::Energy), 304.0);

        assert_eq!(comp.get(CompKey::Fructose), 31.92);
        assert_eq!(comp.get(CompKey::Glucose), 40.28);
        assert_eq!(comp.get(CompKey::TotalSugars), 72.2);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 72.2);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 76.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 3.8);
        assert_eq!(comp.get(CompKey::TotalSolids), 76.0);
        assert_eq!(comp.get(CompKey::POD), 87.4456);
        assert_eq!(comp.get(CompKey::PACsgr), 137.18);
    }

    pub(crate) const ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE_STR: &str = r#"{
      "name": "Maltodextrin 10 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 0.6,
            "maltose": 2.8
          }
        },
        "other_carbohydrates": 96.6,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 11
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 1800
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Maltodextrin 10 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(0.6).maltose(2.8)),
                other_carbohydrates: Some(96.6),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(11.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(1800.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_maltodextrin_10_de() {
        let comp = ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 380.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq!(comp.get(CompKey::Glucose), 0.57);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 2.66);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 3.23);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 3.23);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 91.77);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq!(comp.get(CompKey::POD), 10.45);
        assert_eq!(comp.get(CompKey::PACsgr), 18.05);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE_STR: &str = r#"{
      "name": "Glucose Syrup 42 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 19,
            "maltose": 14
          }
        },
        "other_carbohydrates": 67,
        "ByDryWeight": {
          "solids": 80
        },
        "pod": {
          "OfSolids": 50
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 429
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Syrup 42 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(19.0).maltose(14.0)),
                other_carbohydrates: Some(67.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 80.0 },
                pod: Some(Scaling::OfSolids(50.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(429.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_glucose_syrup_42_de() {
        let comp = ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE.spec.into_composition().unwrap();

        // @todo This is significantly higher than reference 280
        assert_eq!(comp.get(CompKey::Energy), 320.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 15.2);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 11.2);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 26.4);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 26.4);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 53.6);
        assert_eq!(comp.get(CompKey::TotalSolids), 80.0);
        assert_eq!(comp.get(CompKey::POD), 40.0);
        assert_eq!(comp.get(CompKey::PACsgr), 63.2);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE_STR: &str = r#"{
      "name": "Glucose Powder 25 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 2,
            "maltose": 10
          }
        },
        "other_carbohydrates": 88,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 28
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 720
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Powder 25 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(2.0).maltose(10.0)),
                other_carbohydrates: Some(88.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(28.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(720.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_glucose_powder_25_de() {
        let comp = ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 380.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 1.9);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 9.5);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 11.4);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 11.4);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 83.6);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 26.6);
        assert_eq!(comp.get(CompKey::PACsgr), 44.65);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE_STR: &str = r#"{
      "name": "Glucose Powder 42 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 19,
            "maltose": 14
          }
        },
        "other_carbohydrates": 67,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 50
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 429
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Powder 42 DE".to_string(),
            category: Category::Sweetener,
            spec: Spec::SweetenerSpec(SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(19.0).maltose(14.0)),
                other_carbohydrates: Some(67.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(50.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(429.0))),
            }),
        });

    #[test]
    fn into_composition_sweetener_spec_glucose_powder_42_de() {
        let comp = ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 380.0);

        assert_eq!(comp.get(CompKey::Fructose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 18.05);
        assert_eq_flt_test!(comp.get(CompKey::Maltose), 13.3);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 31.35);
        assert_eq!(comp.get(CompKey::TotalPolyols), 0.0);
        assert_eq!(comp.get(CompKey::TotalArtificial), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 31.35);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 63.65);
        assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
        assert_eq!(comp.get(CompKey::POD), 47.5);
        assert_eq!(comp.get(CompKey::PACsgr), 75.05);
    }

    pub(crate) const ING_SPEC_FRUIT_STRAWBERRY_STR: &str = r#"{
      "name": "Strawberry",
      "category": "Fruit",
      "FruitSpec": {
        "water": 91,
        "energy": 32,
        "protein": 0.67,
        "fat": 0.3,
        "carbohydrates": 7.68,
        "fiber": 2,
        "sugars": {
          "glucose": 1.99,
          "fructose": 2.44,
          "sucrose": 0.47
        }
      }
    }"#;

    pub(crate) static ING_SPEC_FRUIT_STRAWBERRY: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Strawberry".to_string(),
        category: Category::Fruit,
        spec: Spec::FruitSpec(FruitSpec {
            water: 91.0,
            energy: Some(32.0),
            protein: Some(0.67),
            fat: Some(0.3),
            carbohydrates: Some(7.68),
            fiber: Some(2.0),
            sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
        }),
    });

    #[test]
    // false positive, sees 6.2832 as f64::consts::TAU
    #[allow(clippy::approx_constant)]
    fn into_composition_fruit_spec_strawberry() {
        let comp = ING_SPEC_FRUIT_STRAWBERRY.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 32.0);

        assert_eq!(comp.get(CompKey::TotalFats), 0.3);
        assert_eq!(comp.get(CompKey::TotalProteins), 0.67);
        assert_eq!(comp.get(CompKey::Fiber), 2.0);
        assert_eq!(comp.get(CompKey::Glucose), 1.99);
        assert_eq!(comp.get(CompKey::Fructose), 2.44);
        assert_eq!(comp.get(CompKey::Sucrose), 0.47);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 4.9);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 7.68);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 4.90);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 3.8);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 9.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 6.2832);
        assert_eq!(comp.get(CompKey::PACsgr), 8.887);
    }

    pub(crate) const ING_SPEC_FRUIT_NAVEL_ORANGE_STR: &str = r#"{
      "name": "Navel Orange",
      "category": "Fruit",
      "FruitSpec": {
        "water": 86.7,
        "protein": 0.91,
        "fat": 0.15,
        "fiber": 2,
        "sugars": {
          "glucose": 2.02,
          "fructose": 2.36,
          "sucrose": 4.19
        }
      }
    }"#;

    pub(crate) static ING_SPEC_FRUIT_NAVEL_ORANGE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Navel Orange".to_string(),
        category: Category::Fruit,
        spec: Spec::FruitSpec(FruitSpec {
            water: 86.7,
            energy: None,
            protein: Some(0.91),
            fat: Some(0.15),
            carbohydrates: None,
            fiber: Some(2.0),
            sugars: Sugars::new().glucose(2.02).fructose(2.36).sucrose(4.19),
        }),
    });

    #[test]
    fn into_composition_fruit_spec_navel_orange() {
        let comp = ING_SPEC_FRUIT_NAVEL_ORANGE.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 39.27);

        assert_eq!(comp.get(CompKey::TotalFats), 0.15);
        assert_eq!(comp.get(CompKey::TotalProteins), 0.91);
        assert_eq!(comp.get(CompKey::Fiber), 2.0);
        assert_eq!(comp.get(CompKey::Glucose), 2.02);
        assert_eq!(comp.get(CompKey::Fructose), 2.36);
        assert_eq!(comp.get(CompKey::Sucrose), 4.19);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 8.57);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 10.57);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 8.57);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 4.58);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 13.3);
        assert_eq_flt_test!(comp.get(CompKey::POD), 9.8888);
        assert_eq!(comp.get(CompKey::PACsgr), 12.512);
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
        assert_eq!(comp.get(CompKey::NutSNF), 41.34);
        assert_eq_flt_test!(comp.get(CompKey::NutSolids), 91.24);

        // Sugar in nuts is considered part of total sweeteners, not part of Nut Solids
        assert_eq!(comp.get(CompKey::TotalSweeteners), 4.35);
        assert_eq!(comp.get(CompKey::NutSolids), comp.get(CompKey::NutFat) + comp.get(CompKey::NutSNF));
        assert_eq!(comp.get(CompKey::NutSolids), comp.get(CompKey::TotalSolids) - comp.get(CompKey::TotalSweeteners));

        assert_eq!(comp.get(CompKey::TotalSolids), 95.59);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.41);
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
        assert_eq!(comp.get(CompKey::EggSNF), 19.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 49.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 9.0);
        assert_eq!(comp.get(CompKey::Lecithin), 9.0);
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

        assert_eq!(comp.get(CompKey::Energy), 218.7108);

        assert_eq!(comp.get(CompKey::ABV), 40.0);
        assert_eq_flt_test!(comp.get(CompKey::Alcohol), 31.56);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 68.44);

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

        assert_eq_flt_test!(comp.get(CompKey::Energy), 287.3521);

        assert_eq_flt_test!(comp.get(CompKey::Alcohol), 13.413);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 31.6);
        assert_eq_flt_test!(comp.get(CompKey::Water), 54.987);

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

        assert_eq!(comp.get(CompKey::Energy), 0.0);

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

        // @todo This should be 9.0 kcal/g since lecithin is a lipid
        assert_eq!(comp.get(CompKey::Energy), 0.0);

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 100.0);
        assert_eq!(comp.get(CompKey::Lecithin), 100.0);
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

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 100.0);
    }

    #[test]
    fn into_composition_micro_spec_stabilizer_not_100() {
        let comp = MicroSpec::Stabilizer { strength: 85.0 }.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 85.0);
    }

    #[test]
    fn into_composition_micro_spec_emulsifier_not_100() {
        let comp = MicroSpec::Emulsifier { strength: 60.0 }.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
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

        assert_eq!(comp.get(CompKey::Energy), 0.0);
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
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }),
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

    static INGREDIENT_ASSETS_TABLE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> = LazyLock::new(|| {
        vec![
            (ING_SPEC_DAIRY_2_MILK_STR, ING_SPEC_DAIRY_2_MILK.clone(), Some(*COMP_2_MILK)),
            (ING_SPEC_DAIRY_3_25_MILK_STR, ING_SPEC_DAIRY_3_25_MILK.clone(), Some(*COMP_3_25_MILK)),
            (ING_SPEC_DAIRY_40_CREAM_STR, ING_SPEC_DAIRY_40_CREAM.clone(), Some(*COMP_40_CREAM)),
            (ING_SPEC_DAIRY_SKIMMED_POWDER_STR, ING_SPEC_DAIRY_SKIMMED_POWDER.clone(), Some(*COMP_SKIMMED_POWDER)),
            (ING_SPEC_DAIRY_WHOLE_POWDER_STR, ING_SPEC_DAIRY_WHOLE_POWDER.clone(), Some(*COMP_WHOLE_POWDER)),
            (
                ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK_STR,
                ING_SPEC_DAIRY_FROM_NUTRITION_3_25_MILK.clone(),
                Some(*COMP_3_25_MILK_FROM_NUTRITION),
            ),
            (
                ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR,
                ING_SPEC_DAIRY_FROM_NUTRITION_WHOLE_ULTRA_FILTERED_LACTOSE_FREE.clone(),
                Some(*COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE),
            ),
            (
                ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE_STR,
                ING_SPEC_DAIRY_FROM_NUTRITION_WHEY_ISOLATE.clone(),
                Some(*COMP_WHEY_ISOLATE),
            ),
            (ING_SPEC_SWEETENER_SUCROSE_STR, ING_SPEC_SWEETENER_SUCROSE.clone(), Some(*COMP_SUCROSE)),
            (ING_SPEC_SWEETENER_DEXTROSE_STR, ING_SPEC_SWEETENER_DEXTROSE.clone(), Some(*COMP_DEXTROSE)),
            (ING_SPEC_SWEETENER_FRUCTOSE_STR, ING_SPEC_SWEETENER_FRUCTOSE.clone(), Some(*COMP_FRUCTOSE)),
            (ING_SPEC_SWEETENER_TREHALOSE_STR, ING_SPEC_SWEETENER_TREHALOSE.clone(), Some(*COMP_TREHALOSE)),
            (ING_SPEC_SWEETENER_ERYTHRITOL_STR, ING_SPEC_SWEETENER_ERYTHRITOL.clone(), Some(*COMP_ERYTHRITOL)),
            (ING_SPEC_SWEETENER_INVERT_SUGAR_STR, ING_SPEC_SWEETENER_INVERT_SUGAR.clone(), None),
            (ING_SPEC_SWEETENER_HONEY_STR, ING_SPEC_SWEETENER_HONEY.clone(), None),
            (ING_SPEC_SWEETENER_HFCS42_STR, ING_SPEC_SWEETENER_HFCS42.clone(), None),
            (ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE_STR, ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE.clone(), None),
            (ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE.clone(), None),
            (ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE.clone(), None),
            (ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE.clone(), None),
            (ING_SPEC_FRUIT_STRAWBERRY_STR, ING_SPEC_FRUIT_STRAWBERRY.clone(), None),
            (ING_SPEC_FRUIT_NAVEL_ORANGE_STR, ING_SPEC_FRUIT_NAVEL_ORANGE.clone(), None),
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

    #[test]
    fn ingredient_spec_into_composition_matches_assets() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(_, spec, expected_comp_opt)| {
            let comp = spec.spec.into_composition().unwrap();
            if let Some(expected_comp) = expected_comp_opt {
                // assert_eq!(&comp, expected_comp);
                // println!("Testing composition for spec: {}", spec.name);
                assert_eq_flt_test!(&comp, expected_comp);
            }
        });
    }
}
