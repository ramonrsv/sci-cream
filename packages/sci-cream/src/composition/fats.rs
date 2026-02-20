//! [`Fats`] and associated functionality to represent the fat composition of an ingredient or mix,
//! reflecting the breakdown in nutrition facts labels

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{composition::ScaleComponents, constants, util::iter_all_abs_diff_eq};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Breakdown of fat components, reflecting the standard nutrition facts labelling
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Fats {
    /// Total fat content
    pub total: f64,
    /// Saturated fat content, a subset of total fat content; should be <= [`Fats::total`]
    pub saturated: f64,
    /// Trans fat content, a subset of total fat content; should be <= [`Fats::total`]
    pub trans: f64,
}

impl Fats {
    /// Creates an empty [`Fats`] struct with all fields set to zero
    #[must_use]
    pub fn empty() -> Self {
        Self {
            total: 0.0,
            saturated: 0.0,
            trans: 0.0,
        }
    }

    /// Field-update method for [`total`](Self::total)
    #[must_use]
    pub fn total(self, total: f64) -> Self {
        Self { total, ..self }
    }

    /// Field-update method for [`saturated`](Self::saturated)
    #[must_use]
    pub fn saturated(self, saturated: f64) -> Self {
        Self { saturated, ..self }
    }

    /// Field-update method for [`trans`](Self::trans)
    #[must_use]
    pub fn trans(self, trans: f64) -> Self {
        Self { trans, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Fats {
    /// Creates a new empty `Fats` struct, forwards to [`Fats::empty`]
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }

    /// Calculates the total energy contributed by the fats, in kcal per 100g of mix
    #[must_use]
    pub fn energy(&self) -> f64 {
        self.total * constants::energy::FATS
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

impl Default for Fats {
    fn default() -> Self {
        Self::empty()
    }
}
