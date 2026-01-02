use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;
use strum_macros::EnumIter;

use crate::{
    constants,
    error::{Error, Result},
    util::{iter_all_abs_diff_eq, iter_fields_as},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::specs::ChocolateSpec;

pub trait ScaleComponents {
    fn scale(&self, factor: f64) -> Self;
    fn add(&self, other: &Self) -> Self;
}

/// Composition of an ingredient or mix, as grams of component per 100g of ingredient/mix
///
/// In a hypothetical 100g of ingredient/mix: `solids.total() + alcohol + water() == 100`.
///
/// `sweeteners` and `micro` components are both accounted for in `solids`, and should not be
/// double-counted. They are provided separately to facilitate the analysis of key components.
///
/// POD and [PAC](crate::docs#pac-afp-fpdf-se) are expressed as a sucrose equivalence and do not
/// necessarily represent real weights of components. While some underlying components may have
/// utilities to calculate their contributions to POD and PAC, the overall POD and PAC of a
/// composition are independent values and are set during composition construction, taking all
/// underlying contributions into account.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Composition {
    pub solids: Solids,
    pub micro: Micro,
    pub alcohol: Alcohol,
    pub pod: f64,
    pub pac: PAC,
}

/// Keys for accessing specific composition values from a [`Composition`] via [`Composition::get()`]
///
/// [`Composition`] is a complex struct with several levels of nesting, and may continuously evolve
/// to include more components, which makes direct field access cumbersome and error-prone. This
/// enum provides a more stable and convenient interface for accessing specific composition values.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum CompKey {
    /// Milk Fats, the fat content of dairy ingredients, e.g. 2% in 2% milk, etc.
    ///
    /// This is a key component of ice cream mixes, contributing to creaminess and mouthfeel.
    MilkFat,
    /// Milk Solids Non-Fat (MSNF), the non-fat solid content of dairy ingredients
    ///
    /// This includes lactose, proteins, and minerals. It is a key component in the analysis of ice
    /// cream mixes, contributing to freezing point depression, body, and texture.
    MSNF,
    /// Milk Solids Non-Fat Non-Sugar (SNFS), the non-fat non-lactose content of dairy ingredients
    ///
    /// This includes proteins and minerals; and is equivalent to [`CompKey::MSNF`] minus lactose.
    MilkSNFS,
    /// Total solids from milk ingredients
    ///
    /// Ths includes fats, lactose, proteins, and minerals. It is the sum of both
    /// [`CompKey::MilkFat`] and [`CompKey::MSNF`].
    MilkSolids,

    /// Cocoa butter, the fat component extracted from cacao solids [`CompKey::CacaoSolids`].
    ///
    /// Sometimes referred to as "cocoa fat"; see [`ChocolateSpec`] for more details. This component
    /// affects the texture of ice creams by hardening the frozen product, and contributes to the
    /// rich mouthfeel of chocolate ice creams due to the way that cocoa fats melt in the mouth.
    CocoaButter,
    /// _Cocoa_ solids, the non-fat component of cacao solids [`CompKey::CacaoSolids`]
    ///
    /// Sometimes referred to as "cocoa powder" or "cocoa fiber", i.e. cacao solids minus cocoa
    /// butter; see [`ChocolateSpec`] for more details. In ice cream mixes, this generally
    /// determines how "chocolatey" the flavor is, and contributes to the texture and body.
    CocoaSolids,
    /// _Cacao_ solids, the total dry matter content derived from the cacao bean
    ///
    /// Sometimes referred to as "chocolate liquor", "cocoa mass", etc., it includes both cocoa
    /// butter (fat) [`CompKey::CocoaButter`] and cocoa solids (non-fat solids)
    /// [`CompKey::CocoaSolids`]. See [`ChocolateSpec`] for more details.
    ///
    /// **Note**: This does not include any sugar content that may be present in chocolate
    /// ingredients; that is accounted for separately via [`CompKey::TotalSugars`].
    CacaoSolids,

    /// Nut Fats, the fat content of nut ingredients
    ///
    /// It is roughly equivalent to [`CompKey::CocoaButter`] if cacao were treated as a nut.
    /// This component affects the texture of ice creams by hardening the frozen product.
    NutFat,
    /// Nut Solids Non-Fat Non-Sugar (SNFS), the non-fat, non-sugar solid content of nuts
    ///
    /// This generally includes proteins, fibers, and minerals. It is roughly equivalent to
    /// [`CompKey::CocoaSolids`] if cacao were treated as a nut. For nut flavored ice cream recipes,
    /// this value directly correlates with the perceived intensity of the nut flavor.
    ///
    /// **Note**: This does not include any sugar content that may be present in nut ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`]. As such, it would be
    /// equivalent to a hypothetical `NutSNFS` (Nut Solids Non-Fat Non-Sugar).
    NutSNF,
    /// Nut Solids, the total solid content of nut ingredients
    ///
    /// This generally includes fats, proteins, fibers, and minerals. It includes both
    /// [`CompKey::NutFat`] and [`CompKey::NutSNF`], and is roughly equivalent to
    /// [`CompKey::CacaoSolids`] if cacao were treated as a nut.
    ///
    /// **Note**: This does not include any sugar content that may be present in nut ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`].
    NutSolids,

    /// Egg Fats, the fat content of egg ingredients
    EggFat,
    /// Egg Solids Non-Fat (SNF), the non-fat solid content of egg ingredients
    ///
    /// **Note**: This does not include any sugar content that may be present in egg ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`]. As such, it would be
    /// equivalent to a hypothetical `EggSNFS` (Egg Solids Non-Fat Non-Sugar).
    EggSNF,
    /// Egg Solids, the total solid content of egg ingredients
    ///
    /// **Note**: This does not include any sugar content that may be present in egg ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`].
    EggSolids,

    /// Other Fats, the fat content of other ingredients not milk, cocoa, nut, or egg
    OtherFats,
    /// Other Solids Non-Fat Non-Sugar (SNFS), the non-fat, non-sugar solid content of other
    /// ingredients not milk, cocoa, nut, or egg
    OtherSNFS,

    /// Total Fats, sum of all fat components
    ///
    /// This is a key component of ice cream mixes, contributing to creaminess and mouthfeel.
    TotalFats,
    /// Total Solids Non-Fat, sum of all non-fat solid components
    TotalSNF,
    /// Total Solids Non-Fat Non-Sugar (SNFS), sum of all non-fat, non-sugar solid components
    ///
    /// This is a key component in the analysis of ice cream mixes, contributing to freezing point
    /// depression, body, and texture. If ice creams feel "cakey" or "spongy", this value is often
    /// a key indicator of the cause, being too high or too low, respectively.
    TotalSNFS,
    /// Total Solids, sum of all solid components
    TotalSolids,

    /// Water content, `100 - TotalSolids - Alcohol.by_weight`
    Water,

    Glucose,
    Fructose,
    Galactose,
    Sucrose,
    Lactose,
    Maltose,
    TotalSugars,
    Polyols,
    TotalCarbohydrates,
    ArtificialSweeteners,
    TotalSweeteners,

    Alcohol,
    ABV,

    Salt,
    Lecithin,
    Emulsifiers,
    Stabilizers,
    EmulsifiersPerFat,
    StabilizersPerWater,

    POD,

    PACsgr,
    PACslt,
    PACmlk,
    PACalc,
    PACtotal,
    AbsPAC,
    HF,
}

impl Composition {
    /// Create an empty composition, which is equivalent to the composition of 100% water.
    pub fn empty() -> Self {
        Self {
            solids: Solids::empty(),
            micro: Micro::empty(),
            alcohol: Alcohol::empty(),
            pod: 0.0,
            pac: PAC::empty(),
        }
    }

    pub fn solids(self, solids: Solids) -> Self {
        Self { solids, ..self }
    }

    pub fn micro(self, micro: Micro) -> Self {
        Self { micro, ..self }
    }

    pub fn alcohol(self, alcohol: Alcohol) -> Self {
        Self { alcohol, ..self }
    }

    pub fn pod(self, pod: f64) -> Self {
        Self { pod, ..self }
    }

    pub fn pac(self, pac: PAC) -> Self {
        Self { pac, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Composition {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn water(&self) -> f64 {
        100.0 - self.solids.total() - self.alcohol.by_weight
    }

    /// Note that [`f64::NAN`] is a valid result, if there are no fats
    pub fn emulsifiers_per_fat(&self) -> f64 {
        if self.solids.all().fats.total > 0.0 {
            (self.micro.emulsifiers / self.solids.all().fats.total) * 100.0
        } else {
            f64::NAN
        }
    }

    /// Note that [`f64::NAN`] is a valid result, if there is no water
    pub fn stabilizers_per_water(&self) -> f64 {
        if self.water() > 0.0 {
            (self.micro.stabilizers / self.water()) * 100.0
        } else {
            f64::NAN
        }
    }

    /// Note that [`f64::NAN`] is a valid result, if there is no water
    /// Excluding hardness factor, i.e. `self.pac.total() / self.water()`
    pub fn absolute_pac(&self) -> f64 {
        if self.water() > 0.0 {
            (self.pac.total() / self.water()) * 100.0
        } else {
            f64::NAN
        }
    }

    pub fn get(&self, key: CompKey) -> f64 {
        match key {
            CompKey::MilkFat => self.solids.milk.fats.total,
            CompKey::MSNF => self.solids.milk.snf(),
            CompKey::MilkSNFS => self.solids.milk.snfs(),
            CompKey::MilkSolids => self.solids.milk.total(),

            CompKey::CocoaButter => self.solids.cocoa.fats.total,
            CompKey::CocoaSolids => self.solids.cocoa.snfs(),
            CompKey::CacaoSolids => self.solids.cocoa.total() - self.solids.cocoa.carbohydrates.sugars.total(),
            CompKey::NutFat => self.solids.nut.fats.total,
            CompKey::NutSNF => self.solids.nut.snfs(),
            CompKey::NutSolids => self.solids.nut.total() - self.solids.nut.carbohydrates.sugars.total(),

            CompKey::EggFat => self.solids.egg.fats.total,
            CompKey::EggSNF => self.solids.egg.snfs(),
            CompKey::EggSolids => self.solids.egg.total() - self.solids.egg.carbohydrates.sugars.total(),
            CompKey::OtherFats => self.solids.other.fats.total,
            CompKey::OtherSNFS => self.solids.other.snfs(),

            CompKey::TotalFats => self.solids.all().fats.total,
            CompKey::TotalSNF => self.solids.all().snf(),
            CompKey::TotalSNFS => self.solids.all().snfs(),
            CompKey::TotalSolids => self.solids.total(),

            CompKey::Water => self.water(),

            CompKey::Glucose => self.solids.all().carbohydrates.sugars.glucose,
            CompKey::Fructose => self.solids.all().carbohydrates.sugars.fructose,
            CompKey::Galactose => self.solids.all().carbohydrates.sugars.galactose,
            CompKey::Sucrose => self.solids.all().carbohydrates.sugars.sucrose,
            CompKey::Lactose => self.solids.all().carbohydrates.sugars.lactose,
            CompKey::Maltose => self.solids.all().carbohydrates.sugars.maltose,
            CompKey::TotalSugars => self.solids.all().carbohydrates.sugars.total(),
            CompKey::Polyols => self.solids.all().carbohydrates.polyols.total(),
            CompKey::TotalCarbohydrates => self.solids.all().carbohydrates.total(),
            CompKey::ArtificialSweeteners => self.solids.all().artificial_sweeteners.total(),
            CompKey::TotalSweeteners => {
                self.solids.all().carbohydrates.sugars.total()
                    + self.solids.all().carbohydrates.polyols.total()
                    + self.solids.all().artificial_sweeteners.total()
            }

            CompKey::Alcohol => self.alcohol.by_weight,
            CompKey::ABV => self.alcohol.to_abv(),

            CompKey::Salt => self.micro.salt,
            CompKey::Lecithin => self.micro.lecithin,
            CompKey::Emulsifiers => self.micro.emulsifiers,
            CompKey::Stabilizers => self.micro.stabilizers,
            CompKey::EmulsifiersPerFat => self.emulsifiers_per_fat(),
            CompKey::StabilizersPerWater => self.stabilizers_per_water(),

            CompKey::POD => self.pod,

            CompKey::PACsgr => self.pac.sugars,
            CompKey::PACslt => self.pac.salt,
            CompKey::PACmlk => self.pac.msnf_ws_salts,
            CompKey::PACalc => self.pac.alcohol,
            CompKey::PACtotal => self.pac.total(),
            CompKey::AbsPAC => self.absolute_pac(),
            CompKey::HF => self.pac.hardness_factor,
        }
    }
}

impl ScaleComponents for Composition {
    fn scale(&self, factor: f64) -> Self {
        Self {
            solids: self.solids.scale(factor),
            micro: self.micro.scale(factor),
            alcohol: self.alcohol.scale(factor),
            pod: self.pod * factor,
            pac: self.pac.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            solids: self.solids.add(&other.solids),
            micro: self.micro.add(&other.micro),
            alcohol: self.alcohol.add(&other.alcohol),
            pod: self.pod + other.pod,
            pac: self.pac.add(&other.pac),
        }
    }
}

impl AbsDiffEq for Composition {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.solids.abs_diff_eq(&other.solids, epsilon)
            && self.micro.abs_diff_eq(&other.micro, epsilon)
            && self.alcohol.abs_diff_eq(&other.alcohol, epsilon)
            && self.pod.abs_diff_eq(&other.pod, epsilon)
            && self.pac.abs_diff_eq(&other.pac, epsilon)
    }
}

/// Solid Components of an ingredient or mix, as grams of component per 100g of ingredient/mix
///
/// Note that the values here are expressed as grams per 100g of _total_ ingredient/mix, not as a
/// percentage of total solids, e.g. a 10g:90g sucrose:water mix would have `solids.total() == 10`
/// and `solids.other.sweeteners.sucrose == 10`, in spite of sucrose being 100% of the solids.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Solids {
    pub milk: SolidsBreakdown,
    pub egg: SolidsBreakdown,
    pub cocoa: SolidsBreakdown,
    pub nut: SolidsBreakdown,
    pub other: SolidsBreakdown,
}

impl Solids {
    pub fn empty() -> Self {
        Self {
            milk: SolidsBreakdown::empty(),
            egg: SolidsBreakdown::empty(),
            cocoa: SolidsBreakdown::empty(),
            nut: SolidsBreakdown::empty(),
            other: SolidsBreakdown::empty(),
        }
    }

    pub fn milk(self, milk: SolidsBreakdown) -> Self {
        Self { milk, ..self }
    }

    pub fn egg(self, egg: SolidsBreakdown) -> Self {
        Self { egg, ..self }
    }

    pub fn cocoa(self, cocoa: SolidsBreakdown) -> Self {
        Self { cocoa, ..self }
    }

    pub fn nut(self, nut: SolidsBreakdown) -> Self {
        Self { nut, ..self }
    }

    pub fn other(self, other: SolidsBreakdown) -> Self {
        Self { other, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Solids {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    fn iter_fields_as_solids_breakdown(&self) -> impl Iterator<Item = &SolidsBreakdown> {
        iter_fields_as::<SolidsBreakdown, _>(self)
    }

    fn sum_solid_breakdowns_field(&self, f: fn(&SolidsBreakdown) -> f64) -> f64 {
        self.iter_fields_as_solids_breakdown().map(f).sum::<f64>()
    }

    pub fn total(&self) -> f64 {
        self.sum_solid_breakdowns_field(|b| b.total())
    }

    pub fn all(&self) -> SolidsBreakdown {
        self.iter_fields_as_solids_breakdown()
            .fold(SolidsBreakdown::empty(), |acc, b| acc.add(b))
    }
}

impl ScaleComponents for Solids {
    fn scale(&self, factor: f64) -> Self {
        Self {
            milk: self.milk.scale(factor),
            egg: self.egg.scale(factor),
            cocoa: self.cocoa.scale(factor),
            nut: self.nut.scale(factor),
            other: self.other.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            milk: self.milk.add(&other.milk),
            egg: self.egg.add(&other.egg),
            cocoa: self.cocoa.add(&other.cocoa),
            nut: self.nut.add(&other.nut),
            other: self.other.add(&other.other),
        }
    }
}

impl AbsDiffEq for Solids {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, SolidsBreakdown, Self>(self, other, epsilon)
    }
}

/// Breakdown of solid components, as grams of component per 100g of ingredient/mix
///
/// This breakdown reflects the standard nutrition facts labelling; for most ingredients with a
/// nutrition facts label, these values can be directly taken from the label. Internally these
/// structs provide an interface to infer breakdowns relevant for ice cream science, e.g. solids
/// non-fat (SNF), solids non-fat non-sugar (SNFS), etc. The following relationships hold:
///
/// `total() >= fats + carbohydrates + proteins + artificial_sweeteners`
/// `snf() == total() - fats`
/// `snfs() == snf() - carbohydrates.sugars`
///
/// Note that the values here are expressed as grams per 100g of _total_ ingredient/mix, not as a
/// percentage of a particular ingredient's solids, i.e. it describes this ingredient's contribution
/// to the total mix, taking into account its proportion in the mix. For example, a 50g:50g
/// 2% milk:water mix would have `milk.fats == 1`, in spite of the milk ingredient being 2% fat.

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct SolidsBreakdown {
    pub fats: Fats,
    pub carbohydrates: Carbohydrates,
    pub proteins: f64,
    pub artificial_sweeteners: ArtificialSweeteners,
    pub others: f64,
}

impl SolidsBreakdown {
    pub fn empty() -> Self {
        Self {
            fats: Fats::empty(),
            carbohydrates: Carbohydrates::empty(),
            proteins: 0.0,
            artificial_sweeteners: ArtificialSweeteners::empty(),
            others: 0.0,
        }
    }

    pub fn fats(self, fats: Fats) -> Self {
        Self { fats, ..self }
    }

    pub fn carbohydrates(self, carbohydrates: Carbohydrates) -> Self {
        Self { carbohydrates, ..self }
    }

    pub fn proteins(self, proteins: f64) -> Self {
        Self { proteins, ..self }
    }

    pub fn artificial_sweeteners(self, artificial_sweeteners: ArtificialSweeteners) -> Self {
        Self {
            artificial_sweeteners,
            ..self
        }
    }

    pub fn others(self, others: f64) -> Self {
        Self { others, ..self }
    }

    /// Sets `others = total - (fats + carbohydrates + proteins + artificial_sweeteners)`
    ///
    /// # Errors
    ///
    /// Returns an [`Error::InvalidComposition`] if `total < fats + carbohydrates + proteins +
    /// artificial_sweeteners`; this should only be called once all other components have been set.
    pub fn others_from_total(&self, total: f64) -> Result<Self> {
        if (self.total() - self.others) > total {
            return Err(Error::InvalidComposition(format!(
                "Cannot set others from total: total {} is less than sum of other components {}",
                total,
                self.total() - self.others
            )));
        }

        Ok(Self {
            others: total - (self.total() - self.others),
            ..*self
        })
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl SolidsBreakdown {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        self.fats.total + self.carbohydrates.total() + self.proteins + self.artificial_sweeteners.total() + self.others
    }

    pub fn snf(&self) -> f64 {
        self.total() - self.fats.total
    }

    pub fn snfs(&self) -> f64 {
        self.snf() - self.carbohydrates.sugars.total()
    }
}

impl ScaleComponents for SolidsBreakdown {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fats: self.fats.scale(factor),
            carbohydrates: self.carbohydrates.scale(factor),
            proteins: self.proteins * factor,
            artificial_sweeteners: self.artificial_sweeteners.scale(factor),
            others: self.others * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fats: self.fats.add(&other.fats),
            carbohydrates: self.carbohydrates.add(&other.carbohydrates),
            proteins: self.proteins + other.proteins,
            artificial_sweeteners: self.artificial_sweeteners.add(&other.artificial_sweeteners),
            others: self.others + other.others,
        }
    }
}

impl AbsDiffEq for SolidsBreakdown {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.fats.abs_diff_eq(&other.fats, epsilon)
            && self.carbohydrates.abs_diff_eq(&other.carbohydrates, epsilon)
            && self.proteins.abs_diff_eq(&other.proteins, epsilon)
            && self
                .artificial_sweeteners
                .abs_diff_eq(&other.artificial_sweeteners, epsilon)
            && self.others.abs_diff_eq(&other.others, epsilon)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Fats {
    pub total: f64,
    pub saturated: f64,
    pub trans: f64,
}

impl Fats {
    pub fn empty() -> Self {
        Self {
            total: 0.0,
            saturated: 0.0,
            trans: 0.0,
        }
    }

    pub fn total(self, total: f64) -> Self {
        Self { total, ..self }
    }

    pub fn saturated(self, saturated: f64) -> Self {
        Self { saturated, ..self }
    }

    pub fn trans(self, trans: f64) -> Self {
        Self { trans, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Fats {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }
}

impl ScaleComponents for Fats {
    fn scale(&self, factor: f64) -> Self {
        Self {
            total: self.total * factor,
            saturated: self.saturated * factor,
            trans: self.trans * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            total: self.total + other.total,
            saturated: self.saturated + other.saturated,
            trans: self.trans + other.trans,
        }
    }
}

impl AbsDiffEq for Fats {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Carbohydrates {
    pub fiber: f64,
    pub sugars: Sugars,
    pub polyols: Polyols,
    pub others: f64,
}

impl Carbohydrates {
    pub fn empty() -> Self {
        Self {
            fiber: 0.0,
            sugars: Sugars::empty(),
            polyols: Polyols::empty(),
            others: 0.0,
        }
    }

    pub fn fiber(self, fiber: f64) -> Self {
        Self { fiber, ..self }
    }

    pub fn sugars(self, sugars: Sugars) -> Self {
        Self { sugars, ..self }
    }

    pub fn polyols(self, polyols: Polyols) -> Self {
        Self { polyols, ..self }
    }

    pub fn others(self, others: f64) -> Self {
        Self { others, ..self }
    }

    /// Sets `others = total - (fiber + sugars.total() + polyols.total())`
    ///
    /// # Errors
    ///
    /// Returns an [`Error::InvalidComposition`] if `total < (fiber + sugars.total() +
    /// polyols.total())`; this should only be called once all other components have been set.
    pub fn others_from_total(&self, total: f64) -> Result<Self> {
        if (self.total() - self.others) > total {
            return Err(Error::InvalidComposition(format!(
                "Cannot set carbohydrate others from total: total {} is less than sum of other components {}",
                total,
                self.total() - self.others
            )));
        }

        Ok(Self {
            others: total - (self.total() - self.others),
            ..*self
        })
    }

    pub fn to_pod(&self) -> Result<f64> {
        Ok(self.sugars.to_pod()? + self.polyols.to_pod()?)
    }

    pub fn to_pac(&self) -> Result<f64> {
        Ok(self.sugars.to_pac()? + self.polyols.to_pac()?)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Carbohydrates {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        self.fiber + self.sugars.total() + self.polyols.total() + self.others
    }
}

impl ScaleComponents for Carbohydrates {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fiber: self.fiber * factor,
            sugars: self.sugars.scale(factor),
            polyols: self.polyols.scale(factor),
            others: self.others * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fiber: self.fiber + other.fiber,
            sugars: self.sugars.add(&other.sugars),
            polyols: self.polyols.add(&other.polyols),
            others: self.others + other.others,
        }
    }
}

impl AbsDiffEq for Carbohydrates {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.fiber.abs_diff_eq(&other.fiber, epsilon)
            && self.sugars.abs_diff_eq(&other.sugars, epsilon)
            && self.polyols.abs_diff_eq(&other.polyols, epsilon)
            && self.others.abs_diff_eq(&other.others, epsilon)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sweeteners {
    pub sugars: Sugars,
    pub polyols: Polyols,
    pub artificial: ArtificialSweeteners,
}

impl Sweeteners {
    pub fn empty() -> Self {
        Self {
            sugars: Sugars::empty(),
            polyols: Polyols::empty(),
            artificial: ArtificialSweeteners::empty(),
        }
    }

    pub fn sugars(self, sugars: Sugars) -> Self {
        Self { sugars, ..self }
    }

    pub fn polyols(self, polyols: Polyols) -> Self {
        Self { polyols, ..self }
    }

    pub fn artificial(self, artificial: ArtificialSweeteners) -> Self {
        Self { artificial, ..self }
    }

    pub fn to_pod(&self) -> Result<f64> {
        Ok(self.sugars.to_pod()? + self.polyols.to_pod()? + self.artificial.to_pod()?)
    }

    pub fn to_pac(&self) -> Result<f64> {
        Ok(self.sugars.to_pac()? + self.polyols.to_pac()? + self.artificial.to_pac()?)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Sweeteners {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        self.sugars.total() + self.polyols.total() + self.artificial.total()
    }
}

impl ScaleComponents for Sweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars.scale(factor),
            polyols: self.polyols.scale(factor),
            artificial: self.artificial.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars.add(&other.sugars),
            polyols: self.polyols.add(&other.polyols),
            artificial: self.artificial.add(&other.artificial),
        }
    }
}

impl AbsDiffEq for Sweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.sugars.abs_diff_eq(&other.sugars, epsilon)
            && self.polyols.abs_diff_eq(&other.polyols, epsilon)
            && self.artificial.abs_diff_eq(&other.artificial, epsilon)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sugars {
    pub glucose: f64,
    pub fructose: f64,
    pub galactose: f64,
    pub sucrose: f64,
    pub lactose: f64,
    pub maltose: f64,
    pub unspecified: f64,
}

impl Sugars {
    pub fn empty() -> Self {
        Self {
            glucose: 0.0,
            fructose: 0.0,
            galactose: 0.0,
            sucrose: 0.0,
            lactose: 0.0,
            maltose: 0.0,
            unspecified: 0.0,
        }
    }

    pub fn glucose(self, glucose: f64) -> Self {
        Self { glucose, ..self }
    }

    pub fn fructose(self, fructose: f64) -> Self {
        Self { fructose, ..self }
    }

    pub fn galactose(self, galactose: f64) -> Self {
        Self { galactose, ..self }
    }

    pub fn sucrose(self, sucrose: f64) -> Self {
        Self { sucrose, ..self }
    }

    pub fn lactose(self, lactose: f64) -> Self {
        Self { lactose, ..self }
    }

    pub fn maltose(self, maltose: f64) -> Self {
        Self { maltose, ..self }
    }

    pub fn unspecified(self, unspecified: f64) -> Self {
        Self { unspecified, ..self }
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.unspecified != 0.0 {
            return Err(Error::CannotComputePOD("Unspecified sugars should be zero".to_string()));
        }

        Ok([
            self.glucose * constants::pod::GLUCOSE,
            self.fructose * constants::pod::FRUCTOSE,
            self.galactose * constants::pod::GALACTOSE,
            self.sucrose * constants::pod::SUCROSE,
            self.lactose * constants::pod::LACTOSE,
            self.maltose * constants::pod::MALTOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.unspecified != 0.0 {
            return Err(Error::CannotComputePAC("Unspecified sugars should be zero".to_string()));
        }

        Ok([
            self.glucose * constants::pac::GLUCOSE,
            self.fructose * constants::pac::FRUCTOSE,
            self.galactose * constants::pac::GALACTOSE,
            self.sucrose * constants::pac::SUCROSE,
            self.lactose * constants::pac::LACTOSE,
            self.maltose * constants::pac::MALTOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Sugars {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    #[cfg(feature = "wasm")]
    pub fn to_pod_wasm(&self) -> std::result::Result<f64, JsValue> {
        self.to_pod().map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[cfg(feature = "wasm")]
    pub fn to_pac_wasm(&self) -> std::result::Result<f64, JsValue> {
        self.to_pac().map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

impl ScaleComponents for Sugars {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sucrose: self.sucrose * factor,
            glucose: self.glucose * factor,
            fructose: self.fructose * factor,
            lactose: self.lactose * factor,
            maltose: self.maltose * factor,
            galactose: self.galactose * factor,
            unspecified: self.unspecified * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sucrose: self.sucrose + other.sucrose,
            glucose: self.glucose + other.glucose,
            fructose: self.fructose + other.fructose,
            lactose: self.lactose + other.lactose,
            maltose: self.maltose + other.maltose,
            galactose: self.galactose + other.galactose,
            unspecified: self.unspecified + other.unspecified,
        }
    }
}

impl AbsDiffEq for Sugars {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

/// Sugar alcohols, commonly used as sugar substitutes, e.g. erythritol, maltitol, etc.
///
/// **Note**: These are distinct from non-saccharide artificial sweeteners (e.g. aspartame,
/// sucralose, etc.) which are not used in similar quantities. See [`ArtificialSweeteners`].
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Polyols {
    pub erythritol: f64,
    pub maltitol: f64,
    pub sorbitol: f64,
    pub xylitol: f64,
    pub other: f64,
}

impl Polyols {
    pub fn empty() -> Self {
        Self {
            erythritol: 0.0,
            maltitol: 0.0,
            sorbitol: 0.0,
            xylitol: 0.0,
            other: 0.0,
        }
    }

    pub fn erythritol(self, erythritol: f64) -> Self {
        Self { erythritol, ..self }
    }

    pub fn maltitol(self, maltitol: f64) -> Self {
        Self { maltitol, ..self }
    }

    pub fn sorbitol(self, sorbitol: f64) -> Self {
        Self { sorbitol, ..self }
    }

    pub fn xylitol(self, xylitol: f64) -> Self {
        Self { xylitol, ..self }
    }

    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Other polyols should be zero".to_string()));
        }

        Ok([
            self.erythritol * constants::pac::ERYTHRITOL,
            self.maltitol * constants::pac::MALTITOL,
            self.sorbitol * constants::pac::SORBITOL,
            self.xylitol * constants::pac::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Other polyols should be zero".to_string()));
        }

        Ok([
            self.erythritol * constants::pod::ERYTHRITOL,
            self.maltitol * constants::pod::MALTITOL,
            self.sorbitol * constants::pod::SORBITOL,
            self.xylitol * constants::pod::XYLITOL,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Polyols {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }
}

impl ScaleComponents for Polyols {
    fn scale(&self, factor: f64) -> Self {
        Self {
            erythritol: self.erythritol * factor,
            maltitol: self.maltitol * factor,
            sorbitol: self.sorbitol * factor,
            xylitol: self.xylitol * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            erythritol: self.erythritol + other.erythritol,
            maltitol: self.maltitol + other.maltitol,
            sorbitol: self.sorbitol + other.sorbitol,
            xylitol: self.xylitol + other.xylitol,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Polyols {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

/// Non-saccharide artificial sweeteners, commonly used as sugar substitutes, e.g. aspartame
///
/// **Note**: These are distinct from sugar alcohols (e.g. erythritol, maltitol, etc.) which are
/// not used in similar quantities. See [`Polyols`].
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct ArtificialSweeteners {
    pub aspartame: f64,
    pub saccharin: f64,
    pub sucralose: f64,
    pub other: f64,
}

impl ArtificialSweeteners {
    pub fn empty() -> Self {
        Self {
            aspartame: 0.0,
            saccharin: 0.0,
            sucralose: 0.0,

            other: 0.0,
        }
    }

    pub fn aspartame(self, aspartame: f64) -> Self {
        Self { aspartame, ..self }
    }

    pub fn saccharin(self, saccharin: f64) -> Self {
        Self { saccharin, ..self }
    }

    pub fn sucralose(self, sucralose: f64) -> Self {
        Self { sucralose, ..self }
    }

    pub fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePOD("Other artificial sweeteners should be zero".to_string()));
        }

        Ok([
            self.aspartame * constants::pod::ASPARTAME,
            self.saccharin * constants::pod::SACCHARIN,
            self.sucralose * constants::pod::SUCRALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.other != 0.0 {
            return Err(Error::CannotComputePAC("Other artificial sweeteners should be zero".to_string()));
        }

        Ok([
            self.aspartame * constants::pac::ASPARTAME,
            self.saccharin * constants::pac::SACCHARIN,
            self.sucralose * constants::pac::SUCRALOSE,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl ArtificialSweeteners {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }
}

impl ScaleComponents for ArtificialSweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            aspartame: self.aspartame * factor,
            saccharin: self.saccharin * factor,
            sucralose: self.sucralose * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            aspartame: self.aspartame + other.aspartame,
            saccharin: self.saccharin + other.saccharin,
            sucralose: self.sucralose + other.sucralose,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for ArtificialSweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Micro {
    pub salt: f64,
    pub lecithin: f64,
    pub emulsifiers: f64,
    pub stabilizers: f64,
}

impl Micro {
    pub fn empty() -> Self {
        Self {
            salt: 0.0,
            lecithin: 0.0,
            emulsifiers: 0.0,
            stabilizers: 0.0,
        }
    }

    pub fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    pub fn lecithin(self, lecithin: f64) -> Self {
        Self { lecithin, ..self }
    }

    pub fn emulsifiers(self, emulsifiers: f64) -> Self {
        Self { emulsifiers, ..self }
    }

    pub fn stabilizers(self, stabilizers: f64) -> Self {
        Self { stabilizers, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Micro {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }
}

impl ScaleComponents for Micro {
    fn scale(&self, factor: f64) -> Self {
        Self {
            salt: self.salt * factor,
            lecithin: self.lecithin * factor,
            stabilizers: self.stabilizers * factor,
            emulsifiers: self.emulsifiers * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            salt: self.salt + other.salt,
            lecithin: self.lecithin + other.lecithin,
            stabilizers: self.stabilizers + other.stabilizers,
            emulsifiers: self.emulsifiers + other.emulsifiers,
        }
    }
}

impl AbsDiffEq for Micro {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Alcohol {
    pub by_weight: f64,
}

impl Alcohol {
    pub fn empty() -> Self {
        Self { by_weight: 0.0 }
    }

    pub fn by_weight(self, by_weight: f64) -> Self {
        Self { by_weight }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Alcohol {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn from_abv(abv: f64) -> Self {
        Self {
            by_weight: abv * constants::ABV_TO_ABW_RATIO,
        }
    }

    pub fn to_abv(&self) -> f64 {
        self.by_weight / constants::ABV_TO_ABW_RATIO
    }

    pub fn to_pac(&self) -> f64 {
        self.by_weight * constants::pac::ALCOHOL / 100.0
    }
}

impl ScaleComponents for Alcohol {
    fn scale(&self, factor: f64) -> Self {
        Self {
            by_weight: self.by_weight * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            by_weight: self.by_weight + other.by_weight,
        }
    }
}

impl AbsDiffEq for Alcohol {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct PAC {
    pub sugars: f64,
    pub salt: f64,
    pub msnf_ws_salts: f64,
    pub alcohol: f64,
    pub hardness_factor: f64,
}

impl PAC {
    pub fn empty() -> Self {
        Self {
            sugars: 0.0,
            salt: 0.0,
            msnf_ws_salts: 0.0,
            alcohol: 0.0,
            hardness_factor: 0.0,
        }
    }

    pub fn sugars(self, sugars: f64) -> Self {
        Self { sugars, ..self }
    }

    pub fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    pub fn msnf_ws_salts(self, msnf_ws_salts: f64) -> Self {
        Self { msnf_ws_salts, ..self }
    }

    pub fn alcohol(self, alcohol: f64) -> Self {
        Self { alcohol, ..self }
    }

    pub fn hardness_factor(self, hardness_factor: f64) -> Self {
        Self {
            hardness_factor,
            ..self
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl PAC {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    /// Total PAC values from all sources, excluding hardness factor
    pub fn total(&self) -> f64 {
        self.sugars + self.salt + self.msnf_ws_salts + self.alcohol
    }
}

impl ScaleComponents for PAC {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars * factor,
            salt: self.salt * factor,
            msnf_ws_salts: self.msnf_ws_salts * factor,
            alcohol: self.alcohol * factor,
            hardness_factor: self.hardness_factor * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars + other.sugars,
            salt: self.salt + other.salt,
            msnf_ws_salts: self.msnf_ws_salts + other.msnf_ws_salts,
            alcohol: self.alcohol + other.alcohol,
            hardness_factor: self.hardness_factor + other.hardness_factor,
        }
    }
}

impl AbsDiffEq for PAC {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Composition {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Solids {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for SolidsBreakdown {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Fats {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Carbohydrates {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Sweeteners {
    fn default() -> Self {
        Sweeteners::empty()
    }
}

impl Default for Sugars {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Polyols {
    fn default() -> Self {
        Self::empty()
    }
}
impl Default for ArtificialSweeteners {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Micro {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Alcohol {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for PAC {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::assets::*;

    #[test]
    fn sugars_to_pod() {
        assert_eq!(Sugars::new().sucrose(10.0).to_pod().unwrap(), 10.0);
    }

    #[test]
    fn sugars_to_pod_error() {
        assert!(matches!(Sugars::new().unspecified(10.0).to_pod(), Err(Error::CannotComputePOD(_))));
    }

    #[test]
    fn sugars_to_pac() {
        assert_eq!(Sugars::new().sucrose(10.0).to_pac().unwrap(), 10.0);
    }

    #[test]
    fn sugars_to_pac_error() {
        assert!(matches!(Sugars::new().unspecified(10.0).to_pac(), Err(Error::CannotComputePAC(_))));
    }

    #[test]
    fn carbohydrates_to_pod() {
        let carbohydrates = Carbohydrates::new().sugars(Sugars::new().sucrose(10.0));
        assert_eq!(carbohydrates.to_pod().unwrap(), 10.0);
    }

    // #[test]
    // fn sweeteners_to_pod_error() {
    //     assert!(matches!(Sweeteners::new().polysaccharide(10.0).to_pod(), Err(Error::CannotComputePOD(_))));
    //     assert!(matches!(Sweeteners::new().artificial(10.0).to_pod(), Err(Error::CannotComputePOD(_))));
    // }

    #[test]
    fn sweeteners_to_pac() {
        let carbohydrates = Carbohydrates::new().sugars(Sugars::new().sucrose(10.0));
        assert_eq!(carbohydrates.to_pac().unwrap(), 10.0);
    }

    // #[test]
    // fn sweeteners_to_pac_error() {
    //     assert!(matches!(Sweeteners::new().polysaccharide(10.0).to_pac(), Err(Error::CannotComputePAC(_))));
    //     assert!(matches!(Sweeteners::new().artificial(10.0).to_pac(), Err(Error::CannotComputePAC(_))));
    // }

    #[test]
    fn pac_total() {
        let pac = COMP_2_MILK.pac;
        assert_eq!(pac.sugars, 4.8069);
        assert_eq!(pac.salt, 0.0);
        assert_eq!(pac.msnf_ws_salts, 3.2405);
        assert_eq!(pac.alcohol, 0.0);
        assert_eq!(pac.total(), 8.0474);
    }

    #[test]
    fn composition_nan_values() {
        let comp = Composition::new();

        assert_eq!(comp.get(CompKey::Water), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_eq!(comp.get(CompKey::TotalFats), 0.0);
        assert!(comp.get(CompKey::EmulsifiersPerFat).is_nan());
        assert_eq!(comp.get(CompKey::StabilizersPerWater), 0.0);
        assert_eq!(comp.get(CompKey::AbsPAC), 0.0);

        let comp = Composition::new().solids(Solids::new().other(SolidsBreakdown::new().others(100.0)));

        assert_eq!(comp.get(CompKey::Water), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert!(comp.get(CompKey::EmulsifiersPerFat).is_nan());
        assert!(comp.get(CompKey::StabilizersPerWater).is_nan());
        assert!(comp.get(CompKey::AbsPAC).is_nan());
    }

    #[test]
    fn composition_get() {
        let expected = HashMap::from([
            (CompKey::MilkFat, 2.0),
            (CompKey::MSNF, 8.82),
            (CompKey::MilkSNFS, 4.0131),
            (CompKey::MilkSolids, 10.82),
            (CompKey::TotalFats, 2.0),
            (CompKey::TotalSNF, 8.82),
            (CompKey::TotalSNFS, 4.0131),
            (CompKey::TotalSolids, 10.82),
            (CompKey::Water, 89.18),
            (CompKey::Lactose, 4.8069),
            (CompKey::TotalSugars, 4.8069),
            (CompKey::TotalCarbohydrates, 4.8069),
            (CompKey::ArtificialSweeteners, 0.0),
            (CompKey::TotalSweeteners, 4.8069),
            (CompKey::POD, 0.769104),
            (CompKey::PACsgr, 4.8069),
            (CompKey::PACmlk, 3.2405),
            (CompKey::PACtotal, 8.0474),
            (CompKey::AbsPAC, 9.02377),
        ]);

        CompKey::iter().for_each(|key| {
            assert_abs_diff_eq!(COMP_2_MILK.get(key), *expected.get(&key).unwrap_or(&0.0), epsilon = TESTS_EPSILON)
        });
    }
}
