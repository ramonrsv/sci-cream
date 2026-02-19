//! Modules exclusively for WASM interoperability. These are gated behind the `wasm` feature.

#[cfg(feature = "database")]
pub mod bridge;
pub mod log;

#[cfg(feature = "database")]
pub use bridge::*;
pub use log::*;
