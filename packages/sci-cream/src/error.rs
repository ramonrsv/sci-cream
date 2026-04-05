//! Error types for Sci-Cream.

use thiserror::Error;

#[cfg(feature = "wasm")]
use wasm_bindgen::JsValue;

use crate::specs::Unit;

#[cfg(doc)]
use crate::{
    composition::{Composition, ToComposition},
    database::IngredientDatabase,
    specs::CompositeSpec,
};

/// Error type for Sci-Cream.
#[derive(Error, Debug)]
pub enum Error {
    /// Cannot compute energy due to unmet preconditions.
    #[error("Preconditions for computing energy not met: {0}")]
    CannotComputeEnergy(String),
    /// Cannot compute POD due to unmet preconditions.
    #[error("Preconditions for computing POD not met: {0}")]
    CannotComputePOD(String),
    /// Cannot compute PAC due to unmet preconditions.
    #[error("Preconditions for computing PAC not met: {0}")]
    CannotComputePAC(String),
    /// Composition value is not within [0, 100]%.
    #[error("Composition is not within [0, 100]%: {0}")]
    CompositionNotWithin100Percent(f64),
    /// Composition does not sum to 100%.
    #[error("Composition does not sum to 100%: {0}")]
    CompositionNot100Percent(f64),
    /// Composition value is not positive.
    #[error("Composition value is not positive: {0}")]
    CompositionNotPositive(f64),
    /// General invalid composition error.
    #[error("Invalid composition: {0}")]
    InvalidComposition(String),
    /// [PAC](crate::docs#pac-afp-fpdf-se) value is negative.
    #[error("PAC value cannot be negative: {0}")]
    NegativePacValue(f64),
    /// [FPD](crate::docs#pac-afp-fpdf-se) value is positive.
    #[error("FPD value cannot be positive: {0}")]
    PositiveFpdValue(f64),
    /// Composition unit is not supported for this operation.
    #[error("Composition unit is not supported for this operation: {0}")]
    UnsupportedCompositionUnit(Unit),
    /// Ingredient not found in database or embedded list.
    #[error("Ingredient not found: {0}")]
    IngredientNotFound(String),
    /// A spec entry or ingredient spec is not supported in a certain context, e.g. converting a
    /// [`CompositeSpec`] directly into a [`Composition`] via [`ToComposition::to_composition`].
    #[error("Unsupported spec: {0}")]
    UnsupportedSpec(String),
    /// Ingredient name is not unique in a collection where uniqueness is required, e.g. when
    /// seeding an [`IngredientDatabase`] with a list of ingredients or ingredient specs.
    #[error("Ingredient name is not unique: {0}")]
    IngredientNameNotUnique(String),
    /// Invalid ingredient spec, e.g. due to missing required fields, invalid values, etc.
    #[error("Invalid ingredient spec: {0}")]
    InvalidSpec(String),
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
impl From<Error> for JsValue {
    fn from(error: Error) -> Self {
        Self::from_str(&error.to_string())
    }
}

/// Convenience type alias for [`Result<T, sci_cream::error::Error>`].
pub type Result<T> = std::result::Result<T, Error>;
