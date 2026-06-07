//! WASM compatible wrappers for [`crate::display`] functions and trait methods.

use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, KeyScope, RatioKey},
    display::KeyAsStrings,
    fpd::FpdKey,
};

macro_rules! key_str_wrappers {
    ($($fn:ident => ($key:ty, $method:ident, $label:literal)),+ $(,)?) => {
        $(
            #[doc = concat!(
                "WASM compatible wrapper for [`KeyAsStrings::", stringify!($method), "`] for [`", $label, "`]")]
            #[wasm_bindgen]
            #[must_use]
            pub fn $fn(key: $key) -> String {
                key.$method().to_string()
            }
        )+
    };
}

key_str_wrappers! {
    comp_key_as_short_str  => (CompKey,  as_short_str, "CompKey"),
    comp_key_as_med_str    => (CompKey,  as_med_str,   "CompKey"),
    comp_key_as_long_str   => (CompKey,  as_long_str,  "CompKey"),
    ratio_key_as_short_str => (RatioKey, as_short_str, "RatioKey"),
    ratio_key_as_med_str   => (RatioKey, as_med_str,   "RatioKey"),
    ratio_key_as_long_str  => (RatioKey, as_long_str,  "RatioKey"),
    fpd_key_as_short_str   => (FpdKey,   as_short_str, "FpdKey"),
    fpd_key_as_med_str     => (FpdKey,   as_med_str,   "FpdKey"),
    fpd_key_as_long_str    => (FpdKey,   as_long_str,  "FpdKey"),
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

    macro_rules! key_str_wrapper_tests {
        ($($test:ident => ($fn:ident, $iter:expr, $method:ident)),+ $(,)?) => {
            $(
                #[test]
                fn $test() {
                    for key in $iter {
                        assert_eq!($fn(key), key.$method());
                    }
                }
            )+
        };
    }

    key_str_wrapper_tests! {
        comp_key_as_short_str_matches_inner  => (comp_key_as_short_str,  CompKey::iter(),  as_short_str),
        comp_key_as_med_str_matches_inner    => (comp_key_as_med_str,    CompKey::iter(),  as_med_str),
        comp_key_as_long_str_matches_inner   => (comp_key_as_long_str,   CompKey::iter(),  as_long_str),
        ratio_key_as_short_str_matches_inner => (ratio_key_as_short_str, RatioKey::iter(), as_short_str),
        ratio_key_as_med_str_matches_inner   => (ratio_key_as_med_str,   RatioKey::iter(), as_med_str),
        ratio_key_as_long_str_matches_inner  => (ratio_key_as_long_str,  RatioKey::iter(), as_long_str),
        fpd_key_as_short_str_matches_inner   => (fpd_key_as_short_str,   FpdKey::iter(),   as_short_str),
        fpd_key_as_med_str_matches_inner     => (fpd_key_as_med_str,     FpdKey::iter(),   as_med_str),
        fpd_key_as_long_str_matches_inner    => (fpd_key_as_long_str,    FpdKey::iter(),   as_long_str),
    }

    #[test]
    fn ratio_key_scope_matches_inner() {
        for key in RatioKey::iter() {
            assert_eq!(ratio_key_scope(key), key.scope());
        }
    }
}
