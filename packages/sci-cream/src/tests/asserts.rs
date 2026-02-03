//! Module to re-export commonly used assertion macros so that they can be uniformly imported by
//! tests as `use crate::tests::asserts::*;`, and so that dependencies can be better managed.
//!
//! Test modules should `use crate::tests::asserts::*;`, to glob import all assertions macros. If
//! there are "`assert_eq/ne` is ambiguous" errors, they should also add
//! `use shadow_asserts::{assert_eq, assert_ne};` to shadow the prelude's `assert_eq/ne` macros.

// @todo Investigating using `all_asserts::{assert_range, assert_nrange}` for range checks.
pub(crate) use all_asserts::{assert_false, assert_true};

#[expect(unused_imports)]
pub(crate) use more_asserts::{assert_ge, assert_gt, assert_le, assert_lt};

/// These `assert_eq` and `assert_ne` re-exports are actually never used, since glob imports are not
/// allowed to shadow imports in the prelude. However, they trigger an error that "`assert_eq/ne` is
/// ambiguous", which forces the user to `use shadow_asserts::{assert_eq, assert_ne};` and therefore
/// prevents silently using the wrong `assert_eq` and `assert_ne` macros from the prelude.
// @todo: Consider using `pretty_assertions::assert_matches!` macro when it stabilizes.
#[allow(unused_imports)]
pub(crate) use pretty_assertions::{assert_eq, assert_ne};

pub(crate) mod shadow_asserts {
    #[expect(unused_imports)]
    pub(crate) use pretty_assertions::{assert_eq, assert_ne};
}

pub(crate) use approx::assert_abs_diff_eq;

pub(crate) const TESTS_EPSILON: f64 = 0.0001;

/// `assert_eq_flt_test!` that forwards to `assert_abs_diff_eq!` with a predefined epsilon for tests
///
/// @todo It would be great if these could be made to work like `pretty_assertions`, showing diffs.
macro_rules! assert_eq_flt_test {
    ($given:expr, $expected:expr) => {
        approx::assert_abs_diff_eq!($given, $expected, epsilon = $crate::tests::asserts::TESTS_EPSILON)
    };
}

pub(crate) use assert_eq_flt_test;
