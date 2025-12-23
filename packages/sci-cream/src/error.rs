use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Preconditions for computing POD not met: {0}")]
    CannotComputePOD(String),
    #[error("Preconditions for computing PAC not met: {0}")]
    CannotComputePAC(String),
    #[error("Composition is not within [0, 100]%: {0}")]
    CompositionNotWithin100Percent(f64),
    #[error("Composition does not sum to 100%: {0}")]
    CompositionNot100Percent(f64),
    #[error("Invalid composition: {0}")]
    InvalidComposition(String),
    #[error("Invalid FPD computation: {0}")]
    InvalidFpdComputation(String),
}

/// Convenience type alias for [`Result<T, sci_cream::error::Error>`].
pub type Result<T> = std::result::Result<T, Error>;
