use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    constants,
    util::{iter_all_abs_diff_eq, iter_fields_as},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Sugars {
    #[serde(default)]
    pub glucose: f64,
    #[serde(default)]
    pub fructose: f64,
    #[serde(default)]
    pub galactose: f64,
    #[serde(default)]
    pub sucrose: f64,
    #[serde(default)]
    pub lactose: f64,
    #[serde(default)]
    pub maltose: f64,
    #[serde(default)]
    pub unspecified: f64,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Sweeteners {
    pub sugars: Sugars,
    pub polysaccharides: f64,
    pub artificial: f64,
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
    pub milk: SolidsBreakdown,
    pub egg: SolidsBreakdown,
    pub cocoa: SolidsBreakdown,
    pub nut: SolidsBreakdown,
    pub other: SolidsBreakdown,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Micro {
    pub salt: f64,
    pub emulsifiers: f64,
    pub stabilizers: f64,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct PAC {
    pub sugars: f64,
    pub salt: f64,
    pub alcohol: f64,
    pub hardness_factor: f64,
}

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

impl Sugars {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            glucose: 0f64,
            fructose: 0f64,
            galactose: 0f64,
            sucrose: 0f64,
            lactose: 0f64,
            maltose: 0f64,
            unspecified: 0f64,
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

    pub fn to_pod(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.unspecified == 0f64);

        [
            self.glucose * constants::GLUCOSE_POD as f64,
            self.fructose * constants::FRUCTOSE_POD as f64,
            self.galactose * constants::GALACTOSE_POD as f64,
            self.sucrose * constants::SUCROSE_POD as f64,
            self.lactose * constants::LACTOSE_POD as f64,
            self.maltose * constants::MALTOSE_POD as f64,
        ]
        .into_iter()
        .sum::<f64>()
            / 100f64
    }

    pub fn to_pac(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.unspecified == 0f64);

        [
            self.glucose * constants::GLUCOSE_PAC as f64,
            self.fructose * constants::FRUCTOSE_PAC as f64,
            self.galactose * constants::GALACTOSE_PAC as f64,
            self.sucrose * constants::SUCROSE_PAC as f64,
            self.lactose * constants::LACTOSE_PAC as f64,
            self.maltose * constants::MALTOSE_PAC as f64,
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
        .sum()
    }
}

impl Sweeteners {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            sugars: Sugars::empty(),
            polysaccharides: 0f64,
            artificial: 0f64,
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

    pub fn to_pod(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.polysaccharides == 0f64);
        assert!(self.artificial == 0f64);

        self.sugars.to_pod()
    }

    pub fn to_pac(&self) -> f64 {
        // @todo Not allowed, need to return Result<f64, Error>
        assert!(self.polysaccharides == 0f64);
        assert!(self.artificial == 0f64);

        self.sugars.to_pac()
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
    fn iter_fields_as_solids_breakdown(&self) -> impl Iterator<Item = &SolidsBreakdown> {
        iter_fields_as::<SolidsBreakdown, _>(self)
    }

    pub fn total(&self) -> f64 {
        self.iter_fields_as_solids_breakdown()
            .map(|b| b.total())
            .sum::<f64>()
    }

    pub fn fats(&self) -> f64 {
        self.iter_fields_as_solids_breakdown()
            .map(|b| b.fats)
            .sum::<f64>()
    }

    pub fn snf(&self) -> f64 {
        self.iter_fields_as_solids_breakdown()
            .map(|b| b.snf())
            .sum::<f64>()
    }

    pub fn sweeteners(&self) -> f64 {
        self.iter_fields_as_solids_breakdown()
            .map(|b| b.sweeteners)
            .sum::<f64>()
    }

    pub fn snfs(&self) -> f64 {
        self.iter_fields_as_solids_breakdown()
            .map(|b| b.snfs)
            .sum::<f64>()
    }

    pub fn water(&self) -> f64 {
        100f64 - self.total()
    }
}

impl Micro {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            salt: 0f64,
            emulsifiers: 0f64,
            stabilizers: 0f64,
        }
    }
}

impl PAC {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            sugars: 0f64,
            salt: 0f64,
            alcohol: 0f64,
            hardness_factor: 0f64,
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
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }
}

impl Composition {
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn empty() -> Self {
        Self {
            solids: Solids::empty(),
            sweeteners: Sweeteners::empty(),
            micro: Micro::empty(),
            alcohol: 0f64,
            pod: 0f64,
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
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    #[test]
    fn pac_total() {
        let pac = COMP_MILK_2_PERCENT.pac;
        assert_eq!(pac.sugars, 4.8069f64);
        assert_eq!(pac.total(), 4.8069f64);
    }
}
