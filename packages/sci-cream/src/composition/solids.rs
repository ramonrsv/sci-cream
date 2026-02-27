//! [`Solids`] and associated functionality to represent the breakdown of solid components by key
//! ingredient categories, e.g. milk solids, egg solids, cocoa solids, nut solids, and other solids.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{ScaleComponents, SolidsBreakdown},
    util::{iter_all_abs_diff_eq, iter_fields_as},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Solid Components of an ingredient or mix broken down by key ingredient categories
///
/// This struct holds a [`SolidsBreakdown`] for each key ingredient category relevant to ice cream
/// science, including milk solids, egg solids, cocoa solids, nut solids, and other solids. This
/// allows for a more detailed analysis of the composition of a mix than would be possible with a
/// single overall solids breakdown, as it enables accounting for the different properties of
/// solids components from different ingredient categories, e.g. milk solids non-fat (MSNF) vs.
/// cocoa solids, which have vastly different properties and contributions to key ice cream
/// properties like freezing point, ice crystal formation control, texture, etc.
///
/// Note that the values here are expressed as grams per 100g of _total_ ingredient/mix, not as a
/// percentage of total solids, e.g. a 10g:90g sucrose:water mix would have `solids.total() == 10`
/// and `solids.other.sweeteners.sucrose == 10`, in spite of sucrose being 100% of the solids.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Solids {
    /// Breakdown of solid components from milk, cream, and other dairy ingredients
    pub milk: SolidsBreakdown,
    /// Breakdown of solid components from eggs and egg products
    pub egg: SolidsBreakdown,
    /// Breakdown of solid components from cocoa and chocolate ingredients
    pub cocoa: SolidsBreakdown,
    /// Breakdown of solid components from nuts and nut products
    pub nut: SolidsBreakdown,
    /// Breakdown of solid components from other ingredients not included in the above categories
    pub other: SolidsBreakdown,
}

impl Solids {
    /// Creates an empty [`Solids`] struct with all fields set to [`SolidsBreakdown::empty()`]
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            milk: SolidsBreakdown::empty(),
            egg: SolidsBreakdown::empty(),
            cocoa: SolidsBreakdown::empty(),
            nut: SolidsBreakdown::empty(),
            other: SolidsBreakdown::empty(),
        }
    }

    /// Creates a new empty `Solids` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`milk`](Self::milk)
    #[must_use]
    pub const fn milk(self, milk: SolidsBreakdown) -> Self {
        Self { milk, ..self }
    }

    /// Field-update method for [`egg`](Self::egg)
    #[must_use]
    pub const fn egg(self, egg: SolidsBreakdown) -> Self {
        Self { egg, ..self }
    }

    /// Field-update method for [`cocoa`](Self::cocoa)
    #[must_use]
    pub const fn cocoa(self, cocoa: SolidsBreakdown) -> Self {
        Self { cocoa, ..self }
    }

    /// Field-update method for [`nut`](Self::nut)
    #[must_use]
    pub const fn nut(self, nut: SolidsBreakdown) -> Self {
        Self { nut, ..self }
    }

    /// Field-update method for [`other`](Self::other)
    #[must_use]
    pub const fn other(self, other: SolidsBreakdown) -> Self {
        Self { other, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Solids {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[cfg_attr(coverage, coverage(off))]
    #[cfg(feature = "wasm")]
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }

    /// Iterate over all field across ingredient categories as [`SolidsBreakdown`]s
    fn iter_fields_as_solids_breakdown(&self) -> impl Iterator<Item = &SolidsBreakdown> {
        iter_fields_as::<SolidsBreakdown, _>(self)
    }

    /// Sum a specific field across all ingredient categories, e.g. [`SolidsBreakdown::total`], etc.
    fn sum_solid_breakdowns_field(&self, f: fn(&SolidsBreakdown) -> f64) -> f64 {
        self.iter_fields_as_solids_breakdown().map(f).sum::<f64>()
    }

    /// Calculates the total solids content of the mix, independent of ingredient category
    #[must_use]
    pub fn total(&self) -> f64 {
        // @todo Should be equivalent to .all().total(); add unit test to verify this,
        // and benchmarks to evaluate if it's worth having a separate implementation
        self.sum_solid_breakdowns_field(SolidsBreakdown::total)
    }

    /// Calculates the overall breakdown of solid components, independent of ingredient category
    ///
    /// This function returns a [`SolidsBreakdown`] that represents the overall breakdown of solid
    /// components in a mix, as if they had not been tracked by ingredient category, by summing the
    /// contributions from all ingredient categories. It is useful for accessing overall properties
    /// of the solids, e.g. total fat content, total carbohydrate content, total solids, etc.
    /// without needing to manually sum contributions across ingredient categories.
    #[must_use]
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
