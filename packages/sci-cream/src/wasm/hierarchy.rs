//! WASM/JS-facing view of the [`CompKey`] hierarchy in [`crate::composition::hierarchy`]

use wasm_bindgen::prelude::*;

use crate::{composition::comp_hierarchy as comp_hierarchy_forest, wasm::JsResult};

#[cfg(doc)]
use crate::composition::CompKey;

/// Returns the whole composition hierarchy as a forest of nested trees.
///
/// Serializes [`comp_hierarchy`](comp_hierarchy_forest) directly: each node is `{ key, children }`,
/// with `key` a [`CompKey`] variant-name string and a node being a roll-up exactly when its
/// `children` are non-empty. The forest is faithful to the underlying DAG — a key shared by several
/// roll-ups appears under each — so choosing a projection is the caller's responsibility.
///
/// # Errors
///
/// Returns a serialization error if the forest cannot be converted to a `JsValue`.
#[wasm_bindgen]
pub fn comp_hierarchy() -> JsResult<JsValue> {
    serde_wasm_bindgen::to_value(comp_hierarchy_forest()).map_err(Into::into)
}
