//! Types and utilities for representing ice cream ingredients

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use strum_macros::{Display, EnumIter};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::composition::Composition;

/// Ingredient categories
///
/// These are mostly for organizational purposes and filtering in interfaces and UIs, they do not
/// affect calculations; although they may be used to gate future features, e.g. Brix calculations.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Display, Hash, Eq, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Category {
    /// Dairy ingredients, e.g. milk, cream, milk powders, whey protein, etc.
    Dairy,
    /// Sweeteners, including sugars, syrups, sugar alcohols, artificial sweeteners, etc.
    Sweetener,
    /// Fruits, including fresh, frozen, purees, concentrates, etc.
    Fruit,
    /// Chocolate and cocoa products, e.g. dark chocolate, cocoa powder, etc.
    Chocolate,
    /// Nuts and nut products, e.g. almonds, hazelnuts, nut butters, etc.
    Nut,
    /// Eggs and egg products, e.g. egg yolks, egg powder, etc.
    Egg,
    /// Alcoholic ingredients, e.g. spirits, liqueurs, etc.
    Alcohol,
    /// Salt, emulsifiers and stabilizers, e.g. guar gum, carrageenan, lecithin, etc.
    Micro,
    /// Miscellaneous ingredients that do not fit into other categories
    Miscellaneous,
}

/// Represents an ingredient used in an ice cream recipe
///
/// Most database and lookup utilities, including embedded [`crate::data`] functions and in-memory
/// [`IngredientDatabase`](crate::database::IngredientDatabase), require that ingredient names be
/// unique. The [`category`](Self::category) is mostly used for filtering and organization, and does
/// not affect calculations. The [`composition`](Self::composition) holds the actual data used in
/// calculations, and does not depend on the other fields.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct Ingredient {
    /// The name of the ingredient, usually required to be unique, e.g. "Whole Milk", "Sucrose"
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub name: String,
    /// The category of the ingredient, e.g. [`Category::Dairy`], [`Category::Sweetener`], etc.
    pub category: Category,
    /// The [`Composition`] of the ingredient, holding its properties and data used in calculations
    pub composition: Composition,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Ingredient {
    /// Creates a new [`Ingredient`] instance with the given name, category, and composition
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new(name: String, category: Category, composition: Composition) -> Self {
        Self {
            name,
            category,
            composition,
        }
    }
}

/// WASM compatible wrappers for [`crate::ingredient`] functions and [`Ingredient`] methods.
#[cfg(feature = "wasm")]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::Ingredient;

    #[wasm_bindgen]
    impl Ingredient {
        /// Clones the `Ingredient` instance, useful when handling WASM objects in JavaScript.
        ///
        /// **Note**: This can be very inefficient depending on the use case, so use with caution.
        /// Consider using [`Bridge`](crate::wasm::Bridge) patterns to avoid excessive cloning.
        #[wasm_bindgen(js_name = "clone")]
        #[must_use]
        pub fn clone_wasm(&self) -> Ingredient {
            self.clone()
        }
    }
}

impl AbsDiffEq for Ingredient {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.name.eq(&other.name)
            && self.category.eq(&other.category)
            && self.composition.abs_diff_eq(&other.composition, epsilon)
    }
}
