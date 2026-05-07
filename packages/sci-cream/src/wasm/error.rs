//! WASM compatible error types

use wasm_bindgen::prelude::*;

/// Convenience type alias for [`Result<T, JsValue>`].
pub type JsResult<T> = Result<T, JsValue>;
