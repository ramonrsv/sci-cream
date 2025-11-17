use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    constants,
    util::{abs_diff_eq_option, add_option, iter_all_abs_diff_eq, iter_all_abs_diff_eq_option},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Sugars {
    pub glucose: Option<f64>,
    pub fructose: Option<f64>,
    pub galactose: Option<f64>,
    pub sucrose: Option<f64>,
    pub lactose: Option<f64>,
    pub maltose: Option<f64>,
    pub unspecified: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Sweeteners {
    pub sugars: Option<Sugars>,
    pub polysaccharides: Option<f64>,
    pub artificial: Option<f64>,
}

/// Breakdown of Solid Components, per 100g of an ingredient
///
/// `snf == 100 - fats - water`
/// `snfs == snf - sweeteners(.sugars + .artificial)`
///
/// `total == snf + fats == snfs + sweeteners + fats`
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct SolidsBreakdown {
    /// Fats
    pub fats: f64,
    /// Sugars and artificial sweeteners
    pub sweeteners: f64,
    /// Non-Fat, Non-Sweetener Solids, but including Polysaccharides
    pub snfs: f64,
}

/// Solid Components, where the breakdown is per 100g of an ingredient
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Solids {
    pub milk: Option<SolidsBreakdown>,
    pub egg: Option<SolidsBreakdown>,
    pub cocoa: Option<SolidsBreakdown>,
    pub nut: Option<SolidsBreakdown>,
    pub other: Option<SolidsBreakdown>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Micro {
    pub salt: Option<f64>,
    pub emulsifiers: Option<f64>,
    pub stabilizers: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct PAC {
    pub sugars: Option<f64>,
    pub salt: Option<f64>,
    pub alcohol: Option<f64>,
    pub hardness_factor: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Composition {
    pub solids: Option<Solids>,
    pub sweeteners: Option<Sweeteners>,
    pub micro: Option<Micro>,
    pub alcohol: Option<f64>,
    pub pod: Option<f64>,
    pub pac: Option<PAC>,
}

impl Sugars {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            glucose: None,
            fructose: None,
            galactose: None,
            sucrose: None,
            lactose: None,
            maltose: None,
            unspecified: None,
        }
    }

    pub fn glucose(self, glucose: f64) -> Self {
        Self {
            glucose: Some(glucose),
            ..self
        }
    }

    pub fn fructose(self, fructose: f64) -> Self {
        Self {
            fructose: Some(fructose),
            ..self
        }
    }

    pub fn galactose(self, galactose: f64) -> Self {
        Self {
            galactose: Some(galactose),
            ..self
        }
    }

    pub fn sucrose(self, sucrose: f64) -> Self {
        Self {
            sucrose: Some(sucrose),
            ..self
        }
    }

    pub fn lactose(self, lactose: f64) -> Self {
        Self {
            lactose: Some(lactose),
            ..self
        }
    }

    pub fn maltose(self, maltose: f64) -> Self {
        Self {
            maltose: Some(maltose),
            ..self
        }
    }

    pub fn unspecified(self, unspecified: f64) -> Self {
        Self {
            unspecified: Some(unspecified),
            ..self
        }
    }

    pub fn to_pod(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.unspecified.is_none());

        [
            self.glucose.unwrap_or(0f64) * constants::GLUCOSE_POD as f64,
            self.fructose.unwrap_or(0f64) * constants::FRUCTOSE_POD as f64,
            self.galactose.unwrap_or(0f64) * 0f64,
            self.sucrose.unwrap_or(0f64) * constants::SUCROSE_POD as f64,
            self.lactose.unwrap_or(0f64) * constants::LACTOSE_POD as f64,
            self.maltose.unwrap_or(0f64) * 0f64,
        ]
        .into_iter()
        .sum::<f64>()
            / 100f64
    }

    pub fn to_pac(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.unspecified.is_none());

        [
            self.glucose.unwrap_or(0f64) * constants::GLUCOSE_PAC as f64,
            self.fructose.unwrap_or(0f64) * constants::FRUCTOSE_PAC as f64,
            self.galactose.unwrap_or(0f64) * 0f64,
            self.sucrose.unwrap_or(0f64) * constants::SUCROSE_PAC as f64,
            self.lactose.unwrap_or(0f64) * constants::LACTOSE_PAC as f64,
            self.maltose.unwrap_or(0f64) * 0f64,
        ]
        .into_iter()
        .sum::<f64>()
            / 100f64
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Sugars {
    pub fn total(&self) -> f64 {
        [
            self.glucose,
            self.fructose,
            self.galactose,
            self.sucrose,
            self.lactose,
            self.maltose,
            self.unspecified,
        ]
        .into_iter()
        .reduce(|acc, x| add_option(acc, x))
        .unwrap_or_else(|| unreachable!())
        // @todo Consider returning a Result<f64, Error> instead, as users may set these manually
        .unwrap_or_else(|| unreachable!("At least one of the elements must be Some(_)"))
    }
}

impl Sweeteners {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            sugars: None,
            polysaccharides: None,
            artificial: None,
        }
    }

    pub fn sugars(self, sugars: Sugars) -> Self {
        Self {
            sugars: Some(sugars),
            ..self
        }
    }

    pub fn polysaccharide(self, polysaccharide: f64) -> Self {
        Self {
            polysaccharides: Some(polysaccharide),
            ..self
        }
    }

    pub fn artificial(self, artificial: f64) -> Self {
        Self {
            artificial: Some(artificial),
            ..self
        }
    }

    pub fn to_pod(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.polysaccharides.is_none());
        assert!(self.artificial.is_none());

        self.sugars.unwrap().to_pod()
    }

    pub fn to_pac(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.polysaccharides.is_none());
        assert!(self.artificial.is_none());

        self.sugars.unwrap().to_pac()
    }
}

impl SolidsBreakdown {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            fats: 0f64,
            sweeteners: 0f64,
            snfs: 0f64,
        }
    }

    pub fn fats(self, fats: f64) -> Self {
        Self { fats: fats, ..self }
    }

    pub fn sweeteners(self, sweeteners: f64) -> Self {
        Self {
            sweeteners: sweeteners,
            ..self
        }
    }

    pub fn snfs(self, snfs: f64) -> Self {
        Self { snfs: snfs, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl SolidsBreakdown {
    pub fn total(&self) -> f64 {
        self.fats + self.sweeteners + self.snfs
    }

    pub fn snf(&self) -> f64 {
        self.total() - self.fats
    }

    pub fn water(&self) -> f64 {
        100f64 - self.total()
    }
}

impl Solids {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            milk: None,
            egg: None,
            cocoa: None,
            nut: None,
            other: None,
        }
    }

    pub fn milk(self, milk: SolidsBreakdown) -> Self {
        Self {
            milk: Some(milk),
            ..self
        }
    }

    pub fn egg(self, egg: SolidsBreakdown) -> Self {
        Self {
            egg: Some(egg),
            ..self
        }
    }

    pub fn cocoa(self, cocoa: SolidsBreakdown) -> Self {
        Self {
            cocoa: Some(cocoa),
            ..self
        }
    }

    pub fn nut(self, nut: SolidsBreakdown) -> Self {
        Self {
            nut: Some(nut),
            ..self
        }
    }

    pub fn other(self, other: SolidsBreakdown) -> Self {
        Self {
            other: Some(other),
            ..self
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Solids {
    pub fn total(&self) -> f64 {
        self.iter()
            .filter_map(|(_, comp)| comp.downcast_ref::<Option<SolidsBreakdown>>())
            .map(|breakdown| breakdown.map_or(0f64, |b| b.total()))
            .sum::<f64>()
    }

    pub fn snf(&self) -> f64 {
        self.iter()
            .filter_map(|(_, comp)| comp.downcast_ref::<Option<SolidsBreakdown>>())
            .map(|breakdown| breakdown.map_or(0f64, |b| b.snf()))
            .sum::<f64>()
    }

    pub fn water(&self) -> f64 {
        100f64 - self.total()
    }
}

impl PAC {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            sugars: None,
            salt: None,
            alcohol: None,
            hardness_factor: None,
        }
    }

    pub fn sugars(self, sugars: f64) -> Self {
        Self {
            sugars: Some(sugars),
            ..self
        }
    }

    pub fn salt(self, salt: f64) -> Self {
        Self {
            salt: Some(salt),
            ..self
        }
    }

    pub fn alcohol(self, alcohol: f64) -> Self {
        Self {
            alcohol: Some(alcohol),
            ..self
        }
    }

    pub fn hardness_factor(self, hardness_factor: f64) -> Self {
        Self {
            hardness_factor: Some(hardness_factor),
            ..self
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl PAC {
    pub fn total(&self) -> f64 {
        self.iter()
            .filter_map(|(_, comp)| comp.downcast_ref::<Option<f64>>())
            .map(|value| value.unwrap_or(0f64))
            .sum::<f64>()
    }
}

impl Composition {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            solids: None,
            sweeteners: None,
            micro: None,
            alcohol: None,
            pod: None,
            pac: None,
        }
    }

    pub fn solids(self, solids: Solids) -> Self {
        Self {
            solids: Some(solids),
            ..self
        }
    }

    pub fn sweeteners(self, sweeteners: Sweeteners) -> Self {
        Self {
            sweeteners: Some(sweeteners),
            ..self
        }
    }

    pub fn micro(self, micro: Micro) -> Self {
        Self {
            micro: Some(micro),
            ..self
        }
    }

    pub fn alcohol(self, alcohol: f64) -> Self {
        Self {
            alcohol: Some(alcohol),
            ..self
        }
    }

    pub fn pod(self, pod: f64) -> Self {
        Self {
            pod: Some(pod),
            ..self
        }
    }

    pub fn pac(self, pac: PAC) -> Self {
        Self {
            pac: Some(pac),
            ..self
        }
    }
}

impl AbsDiffEq for Sugars {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq_option::<f64, f64, Self>(self, other, epsilon)
    }
}

impl AbsDiffEq for Sweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.sugars, &other.sugars, epsilon)
            && abs_diff_eq_option(&self.polysaccharides, &other.polysaccharides, epsilon)
            && abs_diff_eq_option(&self.artificial, &other.artificial, epsilon)
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
        iter_all_abs_diff_eq_option::<f64, SolidsBreakdown, Self>(self, other, epsilon)
    }
}

impl AbsDiffEq for Micro {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq_option::<f64, f64, Self>(self, other, epsilon)
    }
}

impl AbsDiffEq for PAC {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq_option::<f64, f64, Self>(self, other, epsilon)
    }
}

impl AbsDiffEq for Composition {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.solids, &other.solids, epsilon)
            && abs_diff_eq_option(&self.sweeteners, &other.sweeteners, epsilon)
            && abs_diff_eq_option(&self.micro, &other.micro, epsilon)
            && abs_diff_eq_option(&self.alcohol, &other.alcohol, epsilon)
            && abs_diff_eq_option(&self.pod, &other.pod, epsilon)
            && abs_diff_eq_option(&self.pac, &other.pac, epsilon)
    }
}
