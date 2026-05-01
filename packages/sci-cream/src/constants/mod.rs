//! Constants and associated utilities for various ingredient properties

pub mod composition;
pub mod density;
pub mod emulsification;
pub mod energy;
pub mod fpd;
pub mod hf;
pub mod molar_mass;
pub mod pac;
pub mod pod;
pub mod stabilization;

/// Epsilon value for floating point comparisons of compositions, e.g. water content
pub const COMPOSITION_EPSILON: f64 = 1e-13;
