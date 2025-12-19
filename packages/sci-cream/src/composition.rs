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

/// Breakdown of solid components, as grams of component per 100g of ingredient/mix
///
/// Note that the values here are expressed as grams per 100g of _total_ ingredient/mix, not as a
/// percentage of a particular ingredient's solids, i.e. it describes this ingredient's contribution
/// to the total mix, taking into account its proportion in the mix. For example, a 50g:50g
/// 2% milk:water mix would have `milk.fats == 1`, in spite of the milk ingredient being 2% fat.
///
/// `total == fats + sweeteners + SNFS`
/// `SNF == total - fats`
/// `SNFS == SNF - sweeteners`
///
/// **Note**: Polysaccharides are not counted as sweeteners here; they are part of the SNFS.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct SolidsBreakdown {
    /// Fats
    pub fats: f64,
    /// Sugars and artificial sweeteners
    pub sweeteners: f64,
    /// Non-Fat, Non-Sweetener solids, but including Polysaccharides
    pub snfs: f64,
}

/// Solid Components of an ingredient or mix, as grams of component per 100g of ingredient/mix
///
/// Note that the values here are expressed as grams per 100g of _total_ ingredient/mix, not as a
/// percentage of total solids, e.g. a 10g:90g sucrose:water mix would have `solids.total() == 10`
/// and `solids.other.sweeteners == 10`, in spite of sucrose being 100% of the solids.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Solids {
    pub milk: SolidsBreakdown,
    pub egg: SolidsBreakdown,
    pub cocoa: SolidsBreakdown,
    pub nut: SolidsBreakdown,
    pub other: SolidsBreakdown,
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

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sweeteners {
    pub sugars: Sugars,
    pub polysaccharides: f64,
    pub artificial: f64,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Micro {
    pub salt: f64,
    pub emulsifiers: f64,
    pub stabilizers: f64,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct PAC {
    pub sugars: f64,
    pub salt: f64,
    pub alcohol: f64,
    pub hardness_factor: f64,
}

/// Composition of an ingredient or mix, as grams of component per 100g of ingredient/mix
///
/// In a hypothetical 100g of ingredient/mix: `solids.total() + alcohol + water() == 100`.
///
/// `sweeteners` and `micro` components are both accounted for in `solids`, and should not be
/// double-counted. They are provided separately to facilitate the analysis of key components.
///
/// POD and
/// [PAC](https://github.com/ramonrsv/sci-cream/blob/main/docs/freezing-point-depression.md#pac-afp-fpdf-se)
/// are expressed as a sucrose equivalence and do not necessarily represent real weights of
/// components. While some underlying components may have utilities to calculate their contributions
/// to POD and PAC, the overall POD and PAC of a composition are independent values and are set
/// during composition construction, taking all underlying contributions into account.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Composition {
    pub solids: Solids,
    pub sweeteners: Sweeteners,
    pub micro: Micro,
    pub alcohol: f64,
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
    MilkFat,
    CacaoFat,
    NutFat,
    EggFat,
    OtherFat,
    TotalFat,
    MSNF,
    CocoaSNF,
    NutSNF,
    EggSNF,
    OtherSNF,
    TotalSNF,
    MilkSNFS,
    OtherSNFS,
    TotalSNFS,
    Lactose,
    Sugars,
    ArtificialSweeteners,
    TotalSolids,
    Water,
    Salt,
    Alcohol,
    Emulsifiers,
    Stabilizers,
    EmulsifiersPerFat,
    StabilizersPerWater,
    POD,
    PACsgr,
    PACslt,
    PACalc,
    PACtotal,
    AbsPAC,
    HF,
}

impl SolidsBreakdown {
    pub fn empty() -> Self {
        Self {
            fats: 0.0,
            sweeteners: 0.0,
            snfs: 0.0,
        }
    }

    pub fn fats(self, fats: f64) -> Self {
        Self { fats, ..self }
    }

    pub fn sweeteners(self, sweeteners: f64) -> Self {
        Self { sweeteners, ..self }
    }

    pub fn snfs(self, snfs: f64) -> Self {
        Self { snfs, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl SolidsBreakdown {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    pub fn snf(&self) -> f64 {
        self.total() - self.fats
    }
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

    pub fn fats(&self) -> f64 {
        self.sum_solid_breakdowns_field(|b| b.fats)
    }

    pub fn snf(&self) -> f64 {
        self.sum_solid_breakdowns_field(|b| b.snf())
    }

    pub fn sweeteners(&self) -> f64 {
        self.sum_solid_breakdowns_field(|b| b.sweeteners)
    }

    pub fn snfs(&self) -> f64 {
        self.sum_solid_breakdowns_field(|b| b.snfs)
    }
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
        Self {
            unspecified,
            ..self
        }
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.unspecified != 0.0 {
            return Err(Error::CannotComputePOD(
                "Unspecified sugars should be zero".to_string(),
            ));
        }

        Ok([
            self.glucose * constants::GLUCOSE_POD,
            self.fructose * constants::FRUCTOSE_POD,
            self.galactose * constants::GALACTOSE_POD,
            self.sucrose * constants::SUCROSE_POD,
            self.lactose * constants::LACTOSE_POD,
            self.maltose * constants::MALTOSE_POD,
        ]
        .into_iter()
        .sum::<f64>()
            / 100.0)
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.unspecified != 0.0 {
            return Err(Error::CannotComputePAC(
                "Unspecified sugars should be zero".to_string(),
            ));
        }

        Ok([
            self.glucose * constants::GLUCOSE_PAC,
            self.fructose * constants::FRUCTOSE_PAC,
            self.galactose * constants::GALACTOSE_PAC,
            self.sucrose * constants::SUCROSE_PAC,
            self.lactose * constants::LACTOSE_PAC,
            self.maltose * constants::MALTOSE_PAC,
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
    pub fn to_pod_js(&self) -> Option<f64> {
        self.to_pod().ok()
    }

    #[cfg(feature = "wasm")]
    pub fn to_pac_js(&self) -> Option<f64> {
        self.to_pac().ok()
    }
}

impl Sweeteners {
    pub fn empty() -> Self {
        Self {
            sugars: Sugars::empty(),
            polysaccharides: 0.0,
            artificial: 0.0,
        }
    }

    pub fn sugars(self, sugars: Sugars) -> Self {
        Self { sugars, ..self }
    }

    pub fn polysaccharide(self, polysaccharides: f64) -> Self {
        Self {
            polysaccharides,
            ..self
        }
    }

    pub fn artificial(self, artificial: f64) -> Self {
        Self { artificial, ..self }
    }

    pub fn to_pod(&self) -> Result<f64> {
        if self.polysaccharides != 0.0 {
            return Err(Error::CannotComputePOD(
                "Polysaccharides should be zero".to_string(),
            ));
        }
        if self.artificial != 0.0 {
            return Err(Error::CannotComputePOD(
                "Artificial sweeteners should be zero".to_string(),
            ));
        }

        self.sugars.to_pod()
    }

    pub fn to_pac(&self) -> Result<f64> {
        if self.polysaccharides != 0.0 {
            return Err(Error::CannotComputePAC(
                "Polysaccharides should be zero".to_string(),
            ));
        }
        if self.artificial != 0.0 {
            return Err(Error::CannotComputePAC(
                "Artificial sweeteners should be zero".to_string(),
            ));
        }

        self.sugars.to_pac()
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Sweeteners {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn total(&self) -> f64 {
        self.sugars.total() + self.polysaccharides + self.artificial
    }

    #[cfg(feature = "wasm")]
    pub fn to_pod_js(&self) -> Option<f64> {
        self.to_pod().ok()
    }

    #[cfg(feature = "wasm")]
    pub fn to_pac_js(&self) -> Option<f64> {
        self.to_pac().ok()
    }
}

impl Micro {
    pub fn empty() -> Self {
        Self {
            salt: 0.0,
            emulsifiers: 0.0,
            stabilizers: 0.0,
        }
    }

    pub fn salt(self, salt: f64) -> Self {
        Self { salt, ..self }
    }

    pub fn emulsifiers(self, emulsifiers: f64) -> Self {
        Self {
            emulsifiers,
            ..self
        }
    }

    pub fn stabilizers(self, stabilizers: f64) -> Self {
        Self {
            stabilizers,
            ..self
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Micro {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }
}

impl PAC {
    pub fn empty() -> Self {
        Self {
            sugars: 0.0,
            salt: 0.0,
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

    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    /// Note that [`f64::NAN`] is a valid result, if there is no water
    pub fn absolute(&self, water: f64) -> f64 {
        if water > 0.0 {
            (self.total() / water) * 100.0
        } else {
            f64::NAN
        }
    }
}

impl Composition {
    pub fn empty() -> Self {
        Self {
            solids: Solids::empty(),
            sweeteners: Sweeteners::empty(),
            micro: Micro::empty(),
            alcohol: 0.0,
            pod: 0.0,
            pac: PAC::empty(),
        }
    }

    pub fn solids(self, solids: Solids) -> Self {
        Self { solids, ..self }
    }

    pub fn sweeteners(self, sweeteners: Sweeteners) -> Self {
        Self { sweeteners, ..self }
    }

    pub fn micro(self, micro: Micro) -> Self {
        Self { micro, ..self }
    }

    pub fn alcohol(self, alcohol: f64) -> Self {
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
        100.0 - self.solids.total() - self.alcohol
    }

    /// Note that [`f64::NAN`] is a valid result, if there are no fats
    pub fn emulsifiers_per_fat(&self) -> f64 {
        if self.solids.fats() > 0.0 {
            (self.micro.emulsifiers / self.solids.fats()) * 100.0
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
    pub fn absolute_pac(&self) -> f64 {
        self.pac.absolute(self.water())
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Composition {
    pub fn get(&self, key: CompKey) -> f64 {
        match key {
            CompKey::MilkFat => self.solids.milk.fats,
            CompKey::CacaoFat => self.solids.cocoa.fats,
            CompKey::NutFat => self.solids.nut.fats,
            CompKey::EggFat => self.solids.egg.fats,
            CompKey::OtherFat => self.solids.other.fats,
            CompKey::TotalFat => self.solids.fats(),
            CompKey::MSNF => self.solids.milk.snf(),
            CompKey::CocoaSNF => self.solids.cocoa.snf(),
            CompKey::NutSNF => self.solids.nut.snf(),
            CompKey::EggSNF => self.solids.egg.snf(),
            CompKey::OtherSNF => self.solids.other.snf(),
            CompKey::TotalSNF => self.solids.snf(),
            CompKey::MilkSNFS => self.solids.milk.snfs,
            CompKey::OtherSNFS => self.solids.other.snfs,
            CompKey::TotalSNFS => self.solids.snfs(),
            CompKey::Lactose => self.sweeteners.sugars.lactose,
            CompKey::Sugars => self.sweeteners.sugars.total(),
            CompKey::ArtificialSweeteners => self.sweeteners.artificial,
            CompKey::TotalSolids => self.solids.total(),
            CompKey::Water => self.water(),
            CompKey::Salt => self.micro.salt,
            CompKey::Alcohol => self.alcohol,
            CompKey::Emulsifiers => self.micro.emulsifiers,
            CompKey::Stabilizers => self.micro.stabilizers,
            CompKey::EmulsifiersPerFat => self.emulsifiers_per_fat(),
            CompKey::StabilizersPerWater => self.stabilizers_per_water(),
            CompKey::POD => self.pod,
            CompKey::PACsgr => self.pac.sugars,
            CompKey::PACslt => self.pac.salt,
            CompKey::PACalc => self.pac.alcohol,
            CompKey::PACtotal => self.pac.total(),
            CompKey::AbsPAC => self.absolute_pac(),
            CompKey::HF => self.pac.hardness_factor,
        }
    }
}

pub trait ScaleComponents {
    fn scale(&self, factor: f64) -> Self;
    fn add(&self, other: &Self) -> Self;
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

impl ScaleComponents for Sweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars.scale(factor),
            polysaccharides: self.polysaccharides * factor,
            artificial: self.artificial * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars.add(&other.sugars),
            polysaccharides: self.polysaccharides + other.polysaccharides,
            artificial: self.artificial + other.artificial,
        }
    }
}

impl ScaleComponents for SolidsBreakdown {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fats: self.fats * factor,
            sweeteners: self.sweeteners * factor,
            snfs: self.snfs * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fats: self.fats + other.fats,
            sweeteners: self.sweeteners + other.sweeteners,
            snfs: self.snfs + other.snfs,
        }
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

impl ScaleComponents for Micro {
    fn scale(&self, factor: f64) -> Self {
        Self {
            salt: self.salt * factor,
            stabilizers: self.stabilizers * factor,
            emulsifiers: self.emulsifiers * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            salt: self.salt + other.salt,
            stabilizers: self.stabilizers + other.stabilizers,
            emulsifiers: self.emulsifiers + other.emulsifiers,
        }
    }
}

impl ScaleComponents for PAC {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars * factor,
            salt: self.salt * factor,
            alcohol: self.alcohol * factor,
            hardness_factor: self.hardness_factor * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars + other.sugars,
            salt: self.salt + other.salt,
            alcohol: self.alcohol + other.alcohol,
            hardness_factor: self.hardness_factor + other.hardness_factor,
        }
    }
}

impl ScaleComponents for Composition {
    fn scale(&self, factor: f64) -> Self {
        Self {
            solids: self.solids.scale(factor),
            sweeteners: self.sweeteners.scale(factor),
            micro: self.micro.scale(factor),
            alcohol: self.alcohol * factor,
            pod: self.pod * factor,
            pac: self.pac.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            solids: self.solids.add(&other.solids),
            sweeteners: self.sweeteners.add(&other.sweeteners),
            micro: self.micro.add(&other.micro),
            alcohol: self.alcohol + other.alcohol,
            pod: self.pod + other.pod,
            pac: self.pac.add(&other.pac),
        }
    }
}

impl Default for SolidsBreakdown {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Solids {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Sugars {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Sweeteners {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Micro {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for PAC {
    fn default() -> Self {
        Self::empty()
    }
}

impl Default for Composition {
    fn default() -> Self {
        Self::empty()
    }
}

impl AbsDiffEq for SolidsBreakdown {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
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

impl AbsDiffEq for Sugars {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl AbsDiffEq for Sweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.sugars.abs_diff_eq(&other.sugars, epsilon)
            && self
                .polysaccharides
                .abs_diff_eq(&other.polysaccharides, epsilon)
            && self.artificial.abs_diff_eq(&other.artificial, epsilon)
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

impl AbsDiffEq for PAC {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl AbsDiffEq for Composition {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.solids.abs_diff_eq(&other.solids, epsilon)
            && self.sweeteners.abs_diff_eq(&other.sweeteners, epsilon)
            && self.micro.abs_diff_eq(&other.micro, epsilon)
            && self.alcohol.abs_diff_eq(&other.alcohol, epsilon)
            && self.pod.abs_diff_eq(&other.pod, epsilon)
            && self.pac.abs_diff_eq(&other.pac, epsilon)
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
        assert!(matches!(
            Sugars::new().unspecified(10.0).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
    }

    #[test]
    fn sugars_to_pac() {
        assert_eq!(Sugars::new().sucrose(10.0).to_pac().unwrap(), 10.0);
    }

    #[test]
    fn sugars_to_pac_error() {
        assert!(matches!(
            Sugars::new().unspecified(10.0).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
    }

    #[test]
    fn sweeteners_to_poc() {
        let sweeteners = Sweeteners::new().sugars(Sugars::new().sucrose(10.0));
        assert_eq!(sweeteners.to_pod().unwrap(), 10.0);
    }

    #[test]
    fn sweeteners_to_pod_error() {
        assert!(matches!(
            Sweeteners::new().polysaccharide(10.0).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
        assert!(matches!(
            Sweeteners::new().artificial(10.0).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
    }

    #[test]
    fn sweeteners_to_pac() {
        let sweeteners = Sweeteners::new().sugars(Sugars::new().sucrose(10.0));
        assert_eq!(sweeteners.to_pac().unwrap(), 10.0);
    }

    #[test]
    fn sweeteners_to_pac_error() {
        assert!(matches!(
            Sweeteners::new().polysaccharide(10.0).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
        assert!(matches!(
            Sweeteners::new().artificial(10.0).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
    }

    #[test]
    fn pac_total() {
        let pac = COMP_MILK_2_PERCENT.pac;
        assert_eq!(pac.sugars, 4.8069);
        assert_eq!(pac.total(), 4.8069);
    }

    #[test]
    fn composition_get() {
        let expected = HashMap::from([
            (CompKey::MilkFat, 2.0),
            (CompKey::TotalFat, 2.0),
            (CompKey::MSNF, 8.82),
            (CompKey::TotalSNF, 8.82),
            (CompKey::MilkSNFS, 4.0131),
            (CompKey::TotalSNFS, 4.0131),
            (CompKey::Lactose, 4.8069),
            (CompKey::Sugars, 4.8069),
            (CompKey::ArtificialSweeteners, 0.0),
            (CompKey::TotalSolids, 10.82),
            (CompKey::Water, 89.18),
            (CompKey::POD, 0.769104),
            (CompKey::PACsgr, 4.8069),
            (CompKey::PACtotal, 4.8069),
            (CompKey::AbsPAC, 5.390109890109889),
        ]);

        CompKey::iter().for_each(|key| {
            assert_eq!(
                COMP_MILK_2_PERCENT.get(key),
                *expected.get(&key).unwrap_or(&0.0),
                "Unexpected for CompKey::{:?}",
                key
            )
        });
    }
}
