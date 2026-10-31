//! Floating-point assertions, for doc tests and tests alike
//!
//! | Assertion                               | Passes within                                   |
//! | --------------------------------------- | ----------------------------------------------- |
//! | `assert_eq_flt!(a, b)`                  | [`MAX_ULPS`] units in the last place            |
//! | `assert_eq_8dp!(a, b)`                  | [`EPSILON_8DP`], half a unit in the 8th decimal |
//! | `assert_eq_6dp!(a, b)`                  | [`EPSILON_6DP`], half a unit in the 6th decimal |
//! | `assert_eq_4dp!(a, b)`                  | [`EPSILON_4DP`], half a unit in the 4th decimal |
//! | `assert_eq_flt!(a, b, epsilon = 0.006)` | 0.006                                           |
//!
//! `assert_eq_flt!` is for a value expected exactly, up to floating-point noise. `assert_eq_6dp!`
//! is for a value correctly rounded to six decimals, the default for tests, `assert_eq_8dp!` for
//! one rounded to eight, such as a solver's output, and `assert_eq_4dp!` for one rounded to four,
//! as in doc examples; all three add [`TIE_ALLOWANCE`], so a value exactly halfway between two
//! written ones passes either way. Any other bound, such as a stated agreement, is an explicit
//! `epsilon`. The decimal-places forms and `epsilon` accept any [`AbsDiffEq`] type, such as a whole
//! composition. The boolean forms, [`eq_flt`], [`eq_8dp`], [`eq_6dp`], [`eq_4dp`], and
//! [`eq_epsilon`], serve predicates.

use std::fmt::Debug;

use approx::{AbsDiffEq, UlpsEq};

use crate::constants::tolerances::{EPSILON_4DP, EPSILON_6DP, EPSILON_8DP, MAX_ULPS, TIE_ALLOWANCE};

pub use crate::{assert_eq_4dp, assert_eq_6dp, assert_eq_8dp, assert_eq_flt};

/// Whether `a` and `b` are the same value up to floating-point noise: within [`MAX_ULPS`] units
/// in the last place, or within [`f64::EPSILON`] near zero, where those shrink without bound
#[must_use]
pub fn eq_flt(a: f64, b: f64) -> bool {
    a.ulps_eq(&b, f64::EPSILON, MAX_ULPS)
}

/// Whether `a` and `b` agree to eight decimals: within [`EPSILON_8DP`] plus [`TIE_ALLOWANCE`]
#[must_use]
pub fn eq_8dp<T: AbsDiffEq<Epsilon = f64> + ?Sized>(a: &T, b: &T) -> bool {
    eq_epsilon(a, b, EPSILON_8DP + TIE_ALLOWANCE)
}

/// Whether `a` and `b` agree to six decimals: within [`EPSILON_6DP`] plus [`TIE_ALLOWANCE`]
#[must_use]
pub fn eq_6dp<T: AbsDiffEq<Epsilon = f64> + ?Sized>(a: &T, b: &T) -> bool {
    eq_epsilon(a, b, EPSILON_6DP + TIE_ALLOWANCE)
}

/// Whether `a` and `b` agree to four decimals: within [`EPSILON_4DP`] plus [`TIE_ALLOWANCE`]
#[must_use]
pub fn eq_4dp<T: AbsDiffEq<Epsilon = f64> + ?Sized>(a: &T, b: &T) -> bool {
    eq_epsilon(a, b, EPSILON_4DP + TIE_ALLOWANCE)
}

/// Whether `a` and `b` are within `epsilon` of each other, for any [`AbsDiffEq`] type
#[must_use]
pub fn eq_epsilon<T: AbsDiffEq<Epsilon = f64> + ?Sized>(a: &T, b: &T, epsilon: f64) -> bool {
    a.abs_diff_eq(b, epsilon)
}

/// Panics, reporting `given` against `expected`, unless they are `equal`; for the assertions
///
/// # Panics
///
/// Panics unless `equal`.
#[doc(hidden)]
#[track_caller]
pub fn check_flt(equal: bool, assertion: &str, given: f64, expected: f64) {
    assert!(
        equal,
        "{assertion} failed\n     given: {given:?}\n  expected: {expected:?}\ndifference: {:e}",
        (given - expected).abs()
    );
}

/// [`check_flt`] for any [`Debug`] type, such as a whole composition
///
/// # Panics
///
/// Panics unless `equal`.
#[doc(hidden)]
#[track_caller]
pub fn check_debug<T: Debug + ?Sized>(equal: bool, assertion: &str, given: &T, expected: &T) {
    assert!(equal, "{assertion} failed\n   given: {given:?}\nexpected: {expected:?}");
}

/// Asserts that two values are the same up to floating-point noise, or within a stated `epsilon`
///
/// Without `epsilon`, the values must be `f64`s, compared by units in the last place: that goes
/// through approx's [`UlpsEq`], which the crate's own types, such as the composition structs, don't
/// implement. To compare those, state an `epsilon`, which takes any [`AbsDiffEq`] type, or use
/// [`assert_eq_6dp!`] or [`assert_eq_4dp!`], which do too.
///
/// ```
/// use sci_cream::asserts::assert_eq_flt;
///
/// assert_eq_flt!(0.1 + 0.2, 0.3);
/// assert_eq_flt!(0.78, 0.11 / 0.14, epsilon = 0.006);
/// ```
///
/// ```should_panic
/// # use sci_cream::asserts::assert_eq_flt;
/// assert_eq_flt!(2.0 / 3.0, 0.666_667);
/// ```
#[macro_export]
macro_rules! assert_eq_flt {
    ($given:expr, $expected:expr $(,)?) => {{
        let (given, expected): (f64, f64) = ($given, $expected);
        $crate::asserts::check_flt(
            $crate::asserts::eq_flt(given, expected),
            ::core::concat!("assert_eq_flt!(", ::core::stringify!($given), ", ", ::core::stringify!($expected), ")"),
            given,
            expected,
        );
    }};
    ($given:expr, $expected:expr, epsilon = $epsilon:expr $(,)?) => {{
        let (given, expected) = (&$given, &$expected);
        $crate::asserts::check_debug(
            $crate::asserts::eq_epsilon(given, expected, $epsilon),
            ::core::concat!(
                "assert_eq_flt!(",
                ::core::stringify!($given),
                ", ",
                ::core::stringify!($expected),
                ", epsilon = ",
                ::core::stringify!($epsilon),
                ")"
            ),
            given,
            expected,
        );
    }};
}

/// Asserts that a value, correctly rounded to eight decimals, is the expected one; see [`eq_8dp`]
///
/// The values may be of any [`AbsDiffEq`] type, such as whole compositions.
///
/// ```
/// use sci_cream::asserts::assert_eq_8dp;
///
/// assert_eq_8dp!(2.0 / 3.0, 0.666_666_67);
/// ```
///
/// A last digit rounded the wrong way fails:
///
/// ```should_panic
/// # use sci_cream::asserts::assert_eq_8dp;
/// assert_eq_8dp!(2.0 / 3.0, 0.666_666_66);
/// ```
#[macro_export]
macro_rules! assert_eq_8dp {
    ($given:expr, $expected:expr $(,)?) => {{
        let (given, expected) = (&$given, &$expected);
        $crate::asserts::check_debug(
            $crate::asserts::eq_8dp(given, expected),
            ::core::concat!("assert_eq_8dp!(", ::core::stringify!($given), ", ", ::core::stringify!($expected), ")"),
            given,
            expected,
        );
    }};
}

/// Asserts that a value, correctly rounded to six decimals, is the expected one; see [`eq_6dp`]
///
/// The values may be of any [`AbsDiffEq`] type, such as whole compositions.
///
/// ```
/// use sci_cream::asserts::assert_eq_6dp;
///
/// assert_eq_6dp!(2.0 / 3.0, 0.666_667);
/// ```
///
/// A last digit rounded the wrong way fails:
///
/// ```should_panic
/// # use sci_cream::asserts::assert_eq_6dp;
/// assert_eq_6dp!(2.0 / 3.0, 0.666_666);
/// ```
#[macro_export]
macro_rules! assert_eq_6dp {
    ($given:expr, $expected:expr $(,)?) => {{
        let (given, expected) = (&$given, &$expected);
        $crate::asserts::check_debug(
            $crate::asserts::eq_6dp(given, expected),
            ::core::concat!("assert_eq_6dp!(", ::core::stringify!($given), ", ", ::core::stringify!($expected), ")"),
            given,
            expected,
        );
    }};
}

/// Asserts that a value, correctly rounded to four decimals, is the expected one; see [`eq_4dp`]
///
/// The values may be of any [`AbsDiffEq`] type, such as whole compositions.
///
/// ```
/// use sci_cream::asserts::assert_eq_4dp;
///
/// assert_eq_4dp!(2.0 / 3.0, 0.6667);
/// ```
///
/// A last digit rounded the wrong way fails:
///
/// ```should_panic
/// # use sci_cream::asserts::assert_eq_4dp;
/// assert_eq_4dp!(2.0 / 3.0, 0.6666);
/// ```
#[macro_export]
macro_rules! assert_eq_4dp {
    ($given:expr, $expected:expr $(,)?) => {{
        let (given, expected) = (&$given, &$expected);
        $crate::asserts::check_debug(
            $crate::asserts::eq_4dp(given, expected),
            ::core::concat!("assert_eq_4dp!(", ::core::stringify!($given), ", ", ::core::stringify!($expected), ")"),
            given,
            expected,
        );
    }};
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use super::*;
    use crate::composition::Composition;

    /// `x` moved `ulps` units in the last place up
    fn ulps_up(x: f64, ulps: u64) -> f64 {
        f64::from_bits(x.to_bits() + ulps)
    }

    #[test]
    fn eq_flt_allows_floating_point_noise_only() {
        assert!(eq_flt(0.1 + 0.2, 0.3));
        assert!(eq_flt(ulps_up(50.4576, 4), 50.4576));
        assert!(!eq_flt(ulps_up(50.4576, 5), 50.4576));

        // Near zero, units in the last place shrink without bound, so `f64::EPSILON` applies
        assert!(eq_flt(1e-17, 0.0));
        assert!(!eq_flt(1e-15, 0.0));
    }

    #[test]
    fn eq_epsilon_compares_any_abs_diff_eq_type() {
        let comp = Composition::new().energy(100.0);
        assert!(eq_epsilon(&comp, &Composition::new().energy(100.005), 0.006));
        assert!(!eq_epsilon(&comp, &Composition::new().energy(100.007), 0.006));
    }

    #[test]
    fn assert_eq_flt_passes_within_each_tolerance() {
        assert_eq_flt!(0.1 + 0.2, 0.3);
        assert_eq_flt!(ulps_up(1.0, 4), 1.0);
        assert_eq_flt!(&Composition::new().energy(100.005), &Composition::new().energy(100.0), epsilon = 0.006);
    }

    #[test]
    #[should_panic(expected = "assert_eq_flt!(ulps_up(1.0, 5), 1.0) failed")]
    fn assert_eq_flt_rejects_more_than_noise() {
        assert_eq_flt!(ulps_up(1.0, 5), 1.0);
    }

    #[test]
    #[should_panic(expected = "assert_eq_flt!(0.78, 0.11 / 0.14, epsilon = 0.005) failed")]
    fn assert_eq_flt_rejects_past_epsilon() {
        assert_eq_flt!(0.78, 0.11 / 0.14, epsilon = 0.005);
    }

    #[test]
    fn assert_eq_8dp_passes_within_half_a_unit_in_the_eighth_decimal() {
        assert_eq_8dp!(2.0 / 3.0, 0.666_666_67);
        assert_eq_8dp!(1.000_000_004, 1.0);
        assert_eq_8dp!(&Composition::new().energy(100.000_000_004), &Composition::new().energy(100.0));
    }

    #[test]
    fn assert_eq_8dp_passes_a_tie_either_way() {
        let tie: f64 = 123.456_789_125;
        for given in [f64::from_bits(tie.to_bits() - 4), tie, ulps_up(tie, 4)] {
            assert_eq_8dp!(given, 123.456_789_12);
            assert_eq_8dp!(given, 123.456_789_13);
        }
    }

    #[test]
    #[should_panic(expected = "assert_eq_8dp!(1.000_000_006, 1.0) failed")]
    fn assert_eq_8dp_rejects_past_half_a_unit_in_the_eighth_decimal() {
        assert_eq_8dp!(1.000_000_006, 1.0);
    }

    #[test]
    fn assert_eq_6dp_passes_within_half_a_unit_in_the_sixth_decimal() {
        assert_eq_6dp!(2.0 / 3.0, 0.666_667);
        assert_eq_6dp!(1.000_000_4, 1.0);
        assert_eq_6dp!(&Composition::new().energy(100.000_000_4), &Composition::new().energy(100.0));
    }

    #[test]
    fn assert_eq_6dp_passes_a_tie_either_way() {
        let tie: f64 = 123.456_789_5;
        for given in [f64::from_bits(tie.to_bits() - 4), tie, ulps_up(tie, 4)] {
            assert_eq_6dp!(given, 123.456_789);
            assert_eq_6dp!(given, 123.456_790);
        }
    }

    #[test]
    #[should_panic(expected = "assert_eq_6dp!(1.000_000_6, 1.0) failed")]
    fn assert_eq_6dp_rejects_past_half_a_unit_in_the_sixth_decimal() {
        assert_eq_6dp!(1.000_000_6, 1.0);
    }

    #[test]
    fn assert_eq_4dp_passes_within_half_a_unit_in_the_fourth_decimal() {
        assert_eq_4dp!(2.0 / 3.0, 0.6667);
        assert_eq_4dp!(1.000_04, 1.0);
        assert_eq_4dp!(&Composition::new().energy(100.000_04), &Composition::new().energy(100.0));
    }

    #[test]
    fn assert_eq_4dp_passes_a_tie_either_way() {
        let tie: f64 = 123.456_75;
        for given in [f64::from_bits(tie.to_bits() - 4), tie, ulps_up(tie, 4)] {
            assert_eq_4dp!(given, 123.4567);
            assert_eq_4dp!(given, 123.4568);
        }
    }

    #[test]
    #[should_panic(expected = "assert_eq_4dp!(1.000_06, 1.0) failed")]
    fn assert_eq_4dp_rejects_past_half_a_unit_in_the_fourth_decimal() {
        assert_eq_4dp!(1.000_06, 1.0);
    }
}
