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

/// Non-Fat Solids
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct SolidsNF {
    pub milk: Option<f64>,
    pub egg: Option<f64>,
    pub cocoa: Option<f64>,
    pub nut: Option<f64>,
    pub other: Option<f64>,
}

/// Non-Fat, Non-Sweetener Solids
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct SolidsNFS {
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
    pub snf: Option<SolidsNF>,
    pub sweeteners: Option<Sweeteners>,
    pub snfs: Option<SolidsNFS>,
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
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            milk: None,
            egg: None,
            cacao: None,
            nut: None,
            other: None,
        }
    }

    pub fn milk(self, milk: f64) -> Self {
        Self {
            milk: Some(milk),
            ..self
        }
    }

    pub fn egg(self, egg: f64) -> Self {
        Self {
            egg: Some(egg),
            ..self
        }
    }

    pub fn cacao(self, cacao: f64) -> Self {
        Self {
            cacao: Some(cacao),
            ..self
        }
    }

    pub fn nut(self, nut: f64) -> Self {
        Self {
            nut: Some(nut),
            ..self
        }
    }

    pub fn other(self, other: f64) -> Self {
        Self {
            other: Some(other),
            ..self
        }
    }
}

impl Sugar {
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
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            sugar: None,
            polysaccharide: None,
            artificial: None,
        }
    }

    pub fn sugar(self, sugar: Sugar) -> Self {
        Self {
            sugar: Some(sugar),
            ..self
        }
    }

    pub fn polysaccharide(self, polysaccharide: f64) -> Self {
        Self {
            polysaccharide: Some(polysaccharide),
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

impl SolidsNF {
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

    pub fn milk(self, milk: f64) -> Self {
        Self {
            milk: Some(milk),
            ..self
        }
    }

    pub fn egg(self, egg: f64) -> Self {
        Self {
            egg: Some(egg),
            ..self
        }
    }

    pub fn cocoa(self, cocoa: f64) -> Self {
        Self {
            cocoa: Some(cocoa),
            ..self
        }
    }

    pub fn nut(self, nut: f64) -> Self {
        Self {
            nut: Some(nut),
            ..self
        }
    }

    pub fn other(self, other: f64) -> Self {
        Self {
            other: Some(other),
            ..self
        }
    }
}

impl SolidsNFS {
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

    pub fn milk(self, milk: f64) -> Self {
        Self {
            milk: Some(milk),
            ..self
        }
    }

    pub fn egg(self, egg: f64) -> Self {
        Self {
            egg: Some(egg),
            ..self
        }
    }

    pub fn cocoa(self, cocoa: f64) -> Self {
        Self {
            cocoa: Some(cocoa),
            ..self
        }
    }

    pub fn nut(self, nut: f64) -> Self {
        Self {
            nut: Some(nut),
            ..self
        }
    }

    pub fn other(self, other: f64) -> Self {
        Self {
            other: Some(other),
            ..self
        }
    }
}

impl Solids {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            fats: None,
            snf: None,
            sweeteners: None,
            snfs: None,
        }
    }

    pub fn fats(self, fats: Fats) -> Self {
        Self {
            fats: Some(fats),
            ..self
        }
    }

    pub fn snf(self, snf: SolidsNF) -> Self {
        Self {
            snf: Some(snf),
            ..self
        }
    }

    pub fn sweeteners(self, sweeteners: Sweeteners) -> Self {
        Self {
            sweeteners: Some(sweeteners),
            ..self
        }
    }

    pub fn snfs(self, snfs: SolidsNFS) -> Self {
        Self {
            snfs: Some(snfs),
            ..self
        }
    }
}

impl PAC {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            sugar: None,
            salt: None,
            alcohol: None,
            hardness_factor: None,
        }
    }

    pub fn sugar(self, sugar: f64) -> Self {
        Self {
            sugar: Some(sugar),
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

impl Composition {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            solids: None,
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

impl AbsDiffEq for SolidsNFS {
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
