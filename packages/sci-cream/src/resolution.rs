//! Module containing types and utilities for resolving ingredients from specs that reference other
//! ingredients, such as [`AliasSpec`] and [`CompositeSpec`], for validating spec collections, etc.

use crate::{error::Result, ingredient::Ingredient};

#[cfg(doc)]
use crate::{
    error::Error,
    specs::{AliasSpec, CompositeSpec, SpecEntry},
};

/// Trait for retrieving ingredients by name, used in resolving dependent specs like [`AliasSpec`]
/// and [`CompositeSpec`], which need to look up other ingredients to resolve their compositions.
pub trait IngredientGetter {
    /// Retrieves an [`Ingredient`] by its name.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if no ingredient with the specified name is found.
    fn get_ingredient_by_name(&self, name: &str) -> Result<Ingredient>;
}
