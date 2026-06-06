//! WASM compatible wrappers for [`crate::display`] functions and trait methods.

use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, KeyScope, RatioKey},
    display::KeyAsStrings,
    fpd::FpdKey,
};

/// WASM compatible wrapper for [`KeyAsStrings::as_short_str`] for [`CompKey`]
#[wasm_bindgen]
#[must_use]
pub fn comp_key_as_short_str(key: CompKey) -> String {
    key.as_short_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_med_str`] for [`CompKey`]
#[wasm_bindgen]
#[must_use]
pub fn comp_key_as_med_str(key: CompKey) -> String {
    key.as_med_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_long_str`] for [`CompKey`]
#[wasm_bindgen]
#[must_use]
pub fn comp_key_as_long_str(key: CompKey) -> String {
    key.as_long_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_short_str`] for [`RatioKey`]
#[wasm_bindgen]
#[must_use]
pub fn ratio_key_as_short_str(key: RatioKey) -> String {
    key.as_short_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_med_str`] for [`RatioKey`]
#[wasm_bindgen]
#[must_use]
pub fn ratio_key_as_med_str(key: RatioKey) -> String {
    key.as_med_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_long_str`] for [`RatioKey`]
#[wasm_bindgen]
#[must_use]
pub fn ratio_key_as_long_str(key: RatioKey) -> String {
    key.as_long_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_short_str`] for [`FpdKey`]
#[wasm_bindgen]
#[must_use]
pub fn fpd_key_as_short_str(key: FpdKey) -> String {
    key.as_short_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_med_str`] for [`FpdKey`]
#[wasm_bindgen]
#[must_use]
pub fn fpd_key_as_med_str(key: FpdKey) -> String {
    key.as_med_str().to_string()
}

/// WASM compatible wrapper for [`KeyAsStrings::as_long_str`] for [`FpdKey`]
#[wasm_bindgen]
#[must_use]
pub fn fpd_key_as_long_str(key: FpdKey) -> String {
    key.as_long_str().to_string()
}

/// WASM compatible wrapper for [`RatioKey::scope`]
#[wasm_bindgen]
#[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
#[must_use]
pub fn ratio_key_scope(key: RatioKey) -> KeyScope {
    key.scope()
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
    fn comp_key_as_short_str_matches_inner() {
        for key in CompKey::iter() {
            assert_eq!(comp_key_as_short_str(key), key.as_short_str());
        }
    }

    #[test]
    fn comp_key_as_med_str_matches_inner() {
        for key in CompKey::iter() {
            assert_eq!(comp_key_as_med_str(key), key.as_med_str());
        }
    }

    #[test]
    fn comp_key_as_long_str_matches_inner() {
        for key in CompKey::iter() {
            assert_eq!(comp_key_as_long_str(key), key.as_long_str());
        }
    }

    #[test]
    fn ratio_key_as_short_str_matches_inner() {
        for key in RatioKey::iter() {
            assert_eq!(ratio_key_as_short_str(key), key.as_short_str());
        }
    }

    #[test]
    fn ratio_key_as_med_str_matches_inner() {
        for key in RatioKey::iter() {
            assert_eq!(ratio_key_as_med_str(key), key.as_med_str());
        }
    }

    #[test]
    fn ratio_key_as_long_str_matches_inner() {
        for key in RatioKey::iter() {
            assert_eq!(ratio_key_as_long_str(key), key.as_long_str());
        }
    }

    #[test]
    fn fpd_key_as_short_str_matches_inner() {
        for key in FpdKey::iter() {
            assert_eq!(fpd_key_as_short_str(key), key.as_short_str());
        }
    }

    #[test]
    fn fpd_key_as_med_str_matches_inner() {
        for key in FpdKey::iter() {
            assert_eq!(fpd_key_as_med_str(key), key.as_med_str());
        }
    }

    #[test]
    fn fpd_key_as_long_str_matches_inner() {
        for key in FpdKey::iter() {
            assert_eq!(fpd_key_as_long_str(key), key.as_long_str());
        }
    }

    #[test]
    fn ratio_key_scope_matches_inner() {
        for key in RatioKey::iter() {
            assert_eq!(ratio_key_scope(key), key.scope());
        }
    }
}
