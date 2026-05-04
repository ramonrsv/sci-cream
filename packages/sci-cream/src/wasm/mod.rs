//! Modules exclusively for WASM interoperability. These are gated behind the `wasm` feature.
//!
//! The general philosophy for WASM interoperability support in this crate is to expose as little of
//! the internal Rust API as possible while still providing a convenient and efficient interface
//! and, where necessary, to provide higher-level abstractions and utilities that are specifically
//! designed for WASM consumers. This allows more freedom to design the Rust API in a way that is
//! idiomatic and efficient for Rust, without having to worry about the constraints and limitations
//! of `wasm_bindgen` as much.
//!
//! As a result of the above, the majority of the structs in the Rust API do not have `wasm_bindgen`
//! support. When necessary, newtype wrapper are created that make the internals opaque and expose
//! only the necessary interface. For example, [`wasm::Composition`](Composition) is a newtype
//! wrapper around the internal Rust [`Composition`](crate::composition::Composition) struct,
//! exposing only the [`get(CompKey)`](crate::composition::Composition::get) method. Similar
//! wrappers exist for [`Ingredient`], [`MixProperties`], [`Recipe`], etc.
//!
//! [`Bridge`] is a higher-level abstraction that provides a convenient, ergonomic, and consolidated
//! interface for JavaScript users, which obviates the need to use the above interfaces directly.

#[cfg(feature = "database")]
pub mod bridge;
pub mod composition;
pub mod database;
pub mod ingredient;
pub mod log;
pub mod properties;
pub mod recipe;

#[cfg(feature = "database")]
pub use bridge::*;
pub use composition::*;
pub use database::*;
pub use ingredient::*;
pub use log::*;
pub use properties::*;
pub use recipe::*;
