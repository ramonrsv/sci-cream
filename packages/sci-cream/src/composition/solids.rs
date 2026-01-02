use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{ScaleComponents, SolidsBreakdown},
    util::{iter_all_abs_diff_eq, iter_fields_as},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

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

impl Default for Solids {
    fn default() -> Self {
        Self::empty()
    }
}
