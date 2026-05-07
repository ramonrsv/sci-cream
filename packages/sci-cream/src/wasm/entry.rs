//! WASM compatible wrappers for [`crate::specs::SpecEntry`] methods and trait implementations

use wasm_bindgen::prelude::*;

use crate::{specs::SpecEntry, wasm::JsResult};

/// Create a Rust [`SpecEntry`] from a JavaScript value.
///
/// # Errors
///
/// Returns a `serde::Error` if the input cannot be deserialized into a [`SpecEntry`].
pub fn spec_entry_from_jsvalue(spec: JsValue) -> JsResult<SpecEntry> {
    serde_wasm_bindgen::from_value::<SpecEntry>(spec).map_err(Into::into)
}
