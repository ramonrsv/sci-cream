//! Units and scaling methods for ingredient composition values in specs

use serde::{Deserialize, Serialize};

use crate::constants::molar_mass;

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

/// Added salt (sodium chloride) in an ingredient, per 100 g, as grams of salt or from its sodium
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum AddedSalt {
    /// Grams of salt
    #[serde(rename = "grams")]
    Grams(f64),
    /// Milligrams of sodium from the added salt
    #[serde(rename = "from_sodium")]
    FromSodium(f64),
}

impl AddedSalt {
    /// Grams of salt per 100 g, either as given or from the sodium of the added salt
    ///
    /// From sodium, it's <code>sodium_mg / 1000 * [molar_mass::SALT] / [molar_mass::SODIUM]</code>
    #[must_use]
    pub const fn to_grams(self) -> f64 {
        match self {
            Self::Grams(grams) => grams,
            Self::FromSodium(sodium_mg) => sodium_mg / 1000.0 * molar_mass::SALT / molar_mass::SODIUM,
        }
    }
}

/// Scaling method values outside of the main [`CompositionBasis`]
#[derive(Eq, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum Scaling<T> {
    /// Value is already for the ingredient as a whole, so it does not require scaling
    OfWhole(T),
    /// Value is for the dry solids, so it is scaled accordingly for the ingredient as a whole
    OfSolids(T),
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn added_salt_grams_are_as_given() {
        assert_eq!(AddedSalt::Grams(1.61).to_grams(), 1.61);
    }

    #[test]
    fn added_salt_from_sodium_converts_by_molar_mass() {
        // A mole of sodium, 22.990 g, makes a mole of salt, 58.443 g
        assert_eq_flt!(AddedSalt::FromSodium(22_990.0).to_grams(), 58.443);
        assert_eq_6dp!(AddedSalt::FromSodium(632.0).to_grams(), 1.606_611);
    }

    #[test]
    fn added_salt_deserializes_either_form() {
        let grams: AddedSalt = serde_json::from_str(r#"{ "grams": 1.61 }"#).unwrap();
        let from_sodium: AddedSalt = serde_json::from_str(r#"{ "from_sodium": 632 }"#).unwrap();

        assert_eq!(grams, AddedSalt::Grams(1.61));
        assert_eq!(from_sodium, AddedSalt::FromSodium(632.0));
        assert!(serde_json::from_str::<AddedSalt>("1.61").is_err());
        assert!(serde_json::from_str::<AddedSalt>(r#"{ "sodium": 632 }"#).is_err());
    }
}
