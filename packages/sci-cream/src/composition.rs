use approx::{AbsDiffEq, RelativeEq};
use serde::{Deserialize, Serialize};

use crate::{
    constants,
    util::{abs_diff_eq_option, add_option},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Fats {
    pub milk: Option<f64>,
    pub egg: Option<f64>,
    pub cacao: Option<f64>,
    pub nut: Option<f64>,
    pub other: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Sugar {
    pub glucose: Option<f64>,
    pub fructose: Option<f64>,
    pub galactose: Option<f64>,
    pub sucrose: Option<f64>,
    pub lactose: Option<f64>,
    pub maltose: Option<f64>,
    pub unspecified: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Sweeteners {
    pub sugar: Option<Sugar>,
    pub polysaccharide: Option<f64>,
    pub artificial: Option<f64>,
}

/// Non-Fat, Non-Sweetener Solids
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct SolidsNFNS {
    pub milk: Option<f64>,
    pub egg: Option<f64>,
    pub cocoa: Option<f64>,
    pub nut: Option<f64>,
    pub other: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Solids {
    pub fats: Option<Fats>,
    pub sweeteners: Option<Sweeteners>,
    pub snfs: Option<SolidsNFNS>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Micro {
    pub salt: Option<f64>,
    pub emulsifiers: Option<f64>,
    pub stabilizers: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct PAC {
    pub sugar: Option<f64>,
    pub salt: Option<f64>,
    pub alcohol: Option<f64>,
    pub hardness_factor: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Composition {
    pub solids: Option<Solids>,
    pub micro: Option<Micro>,
    pub alcohol: Option<f64>,
    pub pod: Option<f64>,
    pub pac: Option<PAC>,
}

impl Fats {
    pub fn empty() -> Self {
        Fats {
            milk: None,
            egg: None,
            cacao: None,
            nut: None,
            other: None,
        }
    }
}

impl Sugar {
    pub fn empty() -> Self {
        Sugar {
            glucose: None,
            fructose: None,
            galactose: None,
            sucrose: None,
            lactose: None,
            maltose: None,
            unspecified: None,
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
impl Sugar {
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
    pub fn empty() -> Self {
        Sweeteners {
            sugar: None,
            polysaccharide: None,
            artificial: None,
        }
    }

    pub fn to_pod(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.polysaccharide.is_none());
        assert!(self.artificial.is_none());

        self.sugar.unwrap().to_pod()
    }

    pub fn to_pac(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.polysaccharide.is_none());
        assert!(self.artificial.is_none());

        self.sugar.unwrap().to_pac()
    }
}

impl SolidsNFNS {
    pub fn empty() -> Self {
        SolidsNFNS {
            milk: None,
            egg: None,
            cocoa: None,
            nut: None,
            other: None,
        }
    }
}

impl PAC {
    pub fn empty() -> Self {
        PAC {
            sugar: None,
            salt: None,
            alcohol: None,
            hardness_factor: None,
        }
    }
}

impl Composition {
    pub fn empty() -> Self {
        Composition {
            solids: None,
            micro: None,
            alcohol: None,
            pod: None,
            pac: None,
        }
    }
}

impl AbsDiffEq for Fats {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.milk, &other.milk, epsilon)
            && abs_diff_eq_option(&self.egg, &other.egg, epsilon)
            && abs_diff_eq_option(&self.cacao, &other.cacao, epsilon)
            && abs_diff_eq_option(&self.nut, &other.nut, epsilon)
            && abs_diff_eq_option(&self.other, &other.other, epsilon)
    }
}

impl AbsDiffEq for Sugar {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.glucose, &other.glucose, epsilon)
            && abs_diff_eq_option(&self.fructose, &other.fructose, epsilon)
            && abs_diff_eq_option(&self.galactose, &other.galactose, epsilon)
            && abs_diff_eq_option(&self.sucrose, &other.sucrose, epsilon)
            && abs_diff_eq_option(&self.lactose, &other.lactose, epsilon)
            && abs_diff_eq_option(&self.maltose, &other.maltose, epsilon)
            && abs_diff_eq_option(&self.unspecified, &other.unspecified, epsilon)
    }
}

impl AbsDiffEq for Sweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.sugar, &other.sugar, epsilon)
            && abs_diff_eq_option(&self.polysaccharide, &other.polysaccharide, epsilon)
            && abs_diff_eq_option(&self.artificial, &other.artificial, epsilon)
    }
}

impl AbsDiffEq for SolidsNFNS {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.milk, &other.milk, epsilon)
            && abs_diff_eq_option(&self.egg, &other.egg, epsilon)
            && abs_diff_eq_option(&self.cocoa, &other.cocoa, epsilon)
            && abs_diff_eq_option(&self.nut, &other.nut, epsilon)
            && abs_diff_eq_option(&self.other, &other.other, epsilon)
    }
}

impl AbsDiffEq for Solids {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.fats, &other.fats, epsilon)
            && abs_diff_eq_option(&self.sweeteners, &other.sweeteners, epsilon)
            && abs_diff_eq_option(&self.snfs, &other.snfs, epsilon)
    }
}

impl AbsDiffEq for Micro {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.salt, &other.salt, epsilon)
            && abs_diff_eq_option(&self.emulsifiers, &other.emulsifiers, epsilon)
            && abs_diff_eq_option(&self.stabilizers, &other.stabilizers, epsilon)
    }
}

impl AbsDiffEq for PAC {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.sugar, &other.sugar, epsilon)
            && abs_diff_eq_option(&self.salt, &other.salt, epsilon)
            && abs_diff_eq_option(&self.alcohol, &other.alcohol, epsilon)
            && abs_diff_eq_option(&self.hardness_factor, &other.hardness_factor, epsilon)
    }
}

impl AbsDiffEq for Composition {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        abs_diff_eq_option(&self.solids, &other.solids, epsilon)
            && abs_diff_eq_option(&self.micro, &other.micro, epsilon)
            && abs_diff_eq_option(&self.alcohol, &other.alcohol, epsilon)
            && abs_diff_eq_option(&self.pod, &other.pod, epsilon)
            && abs_diff_eq_option(&self.pac, &other.pac, epsilon)
    }
}
