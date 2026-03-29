//! Types and utilities for representing ice cream ingredients

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use strum_macros::{Display, EnumIter};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{composition::Composition, error::Result, resolution::IngredientGetter};

#[cfg(doc)]
use crate::{
    composition::{ResolveComposition, ToComposition},
    error::Error,
    specs::{AliasSpec, CompositeSpec, IngredientSpec},
};

/// Trait for converting various types, e.g. [`IngredientSpec`]s, into an [`Ingredient`]
pub trait IntoIngredient {
    /// Converts `self` into a full [`Ingredient`] instance
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if the [`spec`](crate::specs) fails to convert into a [`Composition`],
    /// likely due to invalid values, e.g. negative percentages, not summing to 100%, etc.
    /// See [`ToComposition::to_composition`] and [`specs`](crate::specs) for more details.
    fn into_ingredient(self) -> Result<Ingredient>;
}

/// Trait for resolving an [`Ingredient`] from a type that may reference other ingredients
pub trait ResolveIntoIngredient {
    /// Converts `self` into a full [`Ingredient`] instance, supporting dependent specs like
    /// [`AliasSpec`]s and [`CompositeSpec`]s by resolving them against the provided getter.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if the [`spec`](crate::specs) fails to resolve into a [`Composition`],
    /// likely due to invalid values, e.g. negative percentages, etc., or if the spec is a
    /// [`CompositeSpec`] that fails to resolve due to failed ingredient lookups via the getter. See
    /// [`ResolveComposition::resolve_composition`] and [`specs`](crate::specs) for more details.
    fn resolve_into_ingredient(self, getter: &dyn IngredientGetter) -> Result<Ingredient>;
}

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
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
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
        pub fn clone_wasm(&self) -> Self {
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

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::Composition;

    // --- Category ---

    #[test]
    fn category_equality() {
        assert_eq!(Category::Dairy, Category::Dairy);
        assert_ne!(Category::Dairy, Category::Egg);
    }

    #[test]
    fn category_display() {
        assert_eq!(Category::Dairy.to_string(), "Dairy");
        assert_eq!(Category::Sweetener.to_string(), "Sweetener");
        assert_eq!(Category::Fruit.to_string(), "Fruit");
        assert_eq!(Category::Chocolate.to_string(), "Chocolate");
        assert_eq!(Category::Nut.to_string(), "Nut");
        assert_eq!(Category::Egg.to_string(), "Egg");
        assert_eq!(Category::Alcohol.to_string(), "Alcohol");
        assert_eq!(Category::Micro.to_string(), "Micro");
        assert_eq!(Category::Miscellaneous.to_string(), "Miscellaneous");
    }

    #[test]
    fn category_serde_roundtrip() {
        for cat in [
            Category::Dairy,
            Category::Sweetener,
            Category::Chocolate,
            Category::Egg,
            Category::Miscellaneous,
        ] {
            let ser = serde_json::to_string(&cat).unwrap();
            let de: Category = serde_json::from_str(&ser).unwrap();
            assert_eq!(cat, de);
        }
    }

    // --- Ingredient ---

    #[test]
    fn ingredient_new_stores_fields() {
        let comp = Composition::empty().energy(42.0);
        let ing = Ingredient::new("Whole Milk".to_string(), Category::Dairy, comp);
        assert_eq!(ing.name, "Whole Milk");
        assert_eq!(ing.category, Category::Dairy);
        assert_eq!(ing.composition, comp);
    }

    #[test]
    fn ingredient_clone_is_equal() {
        let comp = Composition::empty().energy(10.0);
        let ing1 = Ingredient::new("Egg Yolk".to_string(), Category::Egg, comp);
        let ing2 = ing1.clone();
        assert_eq!(ing1, ing2);
    }

    #[test]
    fn ingredient_equality_same() {
        let comp = Composition::empty().energy(5.0);
        let a = Ingredient::new("Sugar".to_string(), Category::Sweetener, comp);
        let b = Ingredient::new("Sugar".to_string(), Category::Sweetener, comp);
        assert_eq!(a, b);
        assert_abs_diff_eq!(a, b);
    }

    #[test]
    fn ingredient_inequality_different_name() {
        let comp = Composition::empty();
        let a = Ingredient::new("Milk".to_string(), Category::Dairy, comp);
        let b = Ingredient::new("Cream".to_string(), Category::Dairy, comp);
        assert_ne!(a, b);
        assert_abs_diff_ne!(a, b);
    }

    #[test]
    fn ingredient_inequality_different_category() {
        let comp = Composition::empty();
        let a = Ingredient::new("X".to_string(), Category::Dairy, comp);
        let b = Ingredient::new("X".to_string(), Category::Sweetener, comp);
        assert_ne!(a, b);
        assert_abs_diff_ne!(a, b);
    }

    #[test]
    fn ingredient_inequality_different_composition() {
        let comp1 = Composition::empty().energy(1.0);
        let comp2 = Composition::empty().energy(2.0);
        let a = Ingredient::new("X".to_string(), Category::Micro, comp1);
        let b = Ingredient::new("X".to_string(), Category::Micro, comp2);
        assert_ne!(a, b);
        assert_abs_diff_ne!(a, b);
    }

    #[test]
    fn ingredient_abs_diff_eq_within_epsilon() {
        let comp1 = Composition::empty().energy(1.0);
        let comp2 = Composition::empty().energy(1.0 + 1e-10);
        let a = Ingredient::new("Salt".to_string(), Category::Micro, comp1);
        let b = Ingredient::new("Salt".to_string(), Category::Micro, comp2);
        assert_abs_diff_eq!(a, b, epsilon = 1e-9);
    }

    #[test]
    fn ingredient_abs_diff_eq_outside_epsilon() {
        let comp1 = Composition::empty().energy(1.0);
        let comp2 = Composition::empty().energy(2.0);
        let a = Ingredient::new("Salt".to_string(), Category::Micro, comp1);
        let b = Ingredient::new("Salt".to_string(), Category::Micro, comp2);
        assert_abs_diff_ne!(a, b, epsilon = 1e-10);
    }

    #[test]
    fn ingredient_serde_roundtrip() {
        let comp = Composition::empty().energy(5.5);
        let ing = Ingredient::new("Sucrose".to_string(), Category::Sweetener, comp);
        let ser = serde_json::to_string(&ing).unwrap();
        let de: Ingredient = serde_json::from_str(&ser).unwrap();
        assert_eq!(ing, de);
    }
}
