use thiserror::Error;

#[cfg(feature = "wasm")]
use wasm_bindgen::JsValue;

use crate::specs::Unit;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Preconditions for computing energy not met: {0}")]
    CannotComputeEnergy(String),
    #[error("Preconditions for computing POD not met: {0}")]
    CannotComputePOD(String),
    #[error("Preconditions for computing PAC not met: {0}")]
    CannotComputePAC(String),
    #[error("Composition is not within [0, 100]%: {0}")]
    CompositionNotWithin100Percent(f64),
    #[error("Composition does not sum to 100%: {0}")]
    CompositionNot100Percent(f64),
    #[error("Composition value is not positive: {0}")]
    CompositionNotPositive(f64),
    #[error("Invalid composition: {0}")]
    InvalidComposition(String),
    #[error("PAC value cannot be negative: {0}")]
    NegativePacValue(f64),
    #[error("FPD value cannot be positive: {0}")]
    PositiveFpdValue(f64),
    #[error("Composition unit is not supported for this operation: {0}")]
    UnsupportedCompositionUnit(Unit),
    #[error("Ingredient not found: {0}")]
    IngredientNotFound(String),
}

#[cfg(feature = "wasm")]
impl From<Error> for JsValue {
    fn from(error: Error) -> Self {
        JsValue::from_str(&error.to_string())
    }
}

/// Convenience type alias for [`Result<T, sci_cream::error::Error>`].
pub type Result<T> = std::result::Result<T, Error>;
