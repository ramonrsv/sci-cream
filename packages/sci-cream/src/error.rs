use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Preconditions for computing POD not met: {0}")]
    CannotComputePOD(String),
    #[error("Preconditions for computing PAC not met: {0}")]
    CannotComputePAC(String),
}

/// Convenience type alias for [`Result<T, sci_cream::error::Error>`].
pub type Result<T> = std::result::Result<T, Error>;
