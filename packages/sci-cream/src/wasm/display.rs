//! WASM compatible wrappers for [`crate::display`] functions and trait methods.

use wasm_bindgen::prelude::*;

use crate::{composition::CompKey, display::KeyAsStrings, fpd::FpdKey};

/// WASM compatible wrapper for [`KeyAsStrings::as_med_str`] for [`CompKey`]
#[wasm_bindgen]
#[must_use]
pub fn comp_key_as_med_str(key: CompKey) -> String {
    key.as_med_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_med_str`] for [`FpdKey`]
#[wasm_bindgen]
#[must_use]
pub fn fpd_key_as_med_str(key: FpdKey) -> String {
    key.as_med_str().to_string()
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused)]
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn comp_key_as_med_str_matches_inner() {
        for key in CompKey::iter() {
            assert_eq!(comp_key_as_med_str(key), key.as_med_str());
        }
    }

    #[test]
    fn fpd_key_as_med_str_matches_inner() {
        for key in FpdKey::iter() {
            assert_eq!(fpd_key_as_med_str(key), key.as_med_str());
        }
    }
}
