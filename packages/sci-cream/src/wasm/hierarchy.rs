//! WASM/JS-facing view of the [`CompKey`] hierarchy in [`crate::composition::hierarchy`]
//!
//! Both accessors return a forest of nested trees where each node is `{ key, children }`, with
//! `key` a [`CompKey`] variant-name string and a node being a roll-up exactly when its `children`
//! are non-empty. They differ only in which part/whole edges they include. Each serializes its
//! forest directly and returns a serialization error if it cannot be converted to a `JsValue`.

use wasm_bindgen::prelude::*;

use crate::{
    composition::{display_hierarchy, structural_hierarchy},
    wasm::JsResult,
};

#[cfg(doc)]
use crate::composition::CompKey;

/// Returns the structural composition hierarchy, holding only additive part/whole identities.
///
/// See the [module docs](self) for the node shape and error semantics.
///
/// # Errors
///
/// Returns a serialization error if the forest cannot be converted to a `JsValue`.
#[wasm_bindgen(js_name = "structural_hierarchy")]
pub fn structural_hierarchy_wasm() -> JsResult<JsValue> {
    serde_wasm_bindgen::to_value(structural_hierarchy()).map_err(Into::into)
}

/// Returns the display composition hierarchy, faithful to the underlying DAG — a key shared by
/// several roll-ups appears under each, so choosing a projection is the caller's responsibility.
///
/// See the [module docs](self) for the node shape and error semantics.
///
/// # Errors
///
/// Returns a serialization error if the forest cannot be converted to a `JsValue`.
#[wasm_bindgen(js_name = "display_hierarchy")]
pub fn display_hierarchy_wasm() -> JsResult<JsValue> {
    serde_wasm_bindgen::to_value(display_hierarchy()).map_err(Into::into)
}
