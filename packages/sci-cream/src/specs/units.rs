//! Units and scaling methods for ingredient composition values in specs

use serde::{Deserialize, Serialize};

/// Indicates whether composition values for an ingredient are a percentage of dry or total weight.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum CompositionBasis {
    /// Composition values are given as percentages of the dry weight (solids) of the ingredient.
    ///
    /// The composition values must add up to 100%, and are then scaled by the `solids` value to get
    /// the actual composition of the ingredient as a whole, equivalent to a `ByTotalWeight` basis.
    ByDryWeight {
        /// The percentage of the ingredient as a whole that is dry solids
        solids: f64,
    },
    /// Composition values are given as percentages of the total weight of the ingredient.
    ///
    /// The composition values plus the `water` value must add up to 100%.
    ByTotalWeight {
        /// The percentage of the ingredient as a whole that is water
        water: f64,
    },
}

/// Unit for specifying ingredient amounts in specs, either grams, ml, percent, or molar mass
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum Unit {
    /// Value is in grams
    #[serde(rename = "grams")]
    Grams(f64),
    /// Value is in milliliters
    #[serde(rename = "ml")]
    Milliliters(f64),
    /// Value is a percentage
    #[serde(rename = "percent")]
    Percent(f64),
    /// Value is in grams per mole
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
