//! Miscellaneous utility functions used across the codebase.
use std::ops::Add;

use approx::AbsDiffEq;
use struct_iterable::Iterable;

/// Adds two [`Option<T>`] values, treating [`None`] as zero. If both are [`None`], returns [`None`]
pub fn add_option<T: Add<Output = T>>(a: Option<T>, b: Option<T>) -> Option<T> {
    match (a, b) {
        (Some(x), Some(y)) => Some(x + y),
        (Some(x), None) => Some(x),
        (None, Some(y)) => Some(y),
        (None, None) => None,
    }
}

/// Returns an iterator over the fields of an [`Iterable`] struct, downcasting each to type `T`.
///
/// # Panics
///
/// Panics if any field cannot be downcast to type `T`, with a message indicating the field name
/// and the expected and actual types.
pub fn iter_fields_as<'a, T: 'a + 'static, I: Iterable>(iterable: &'a I) -> impl Iterator<Item = &'a T> {
    iterable.iter().map(|(field_name, field_val)| {
        field_val.downcast_ref::<T>().unwrap_or_else(|| {
            panic!(
                "Field '{}' should be of type '{}', but is '{:?}",
                field_name,
                std::any::type_name::<T>(),
                field_val.type_id()
            )
        })
    })
}

/// Returns a vector of the fields of an [`Iterable`] struct, downcasting each to type `T`
///
/// # Panics
///
/// Panics if any field cannot be downcast to type `T`, with a message indicating the field name
/// and the expected and actual types.
pub fn collect_fields_copied_as<T: 'static + Copy, I: Iterable>(iterable: &I) -> Vec<T> {
    iter_fields_as::<T, _>(iterable).copied().collect()
}

/// Compares two [`Option<T>`] values via [`AbsDiffEq`], treating [`None`] as equal to each other.
///
/// That is, if both are [`Some`], the inner values are compared via [`AbsDiffEq`]; if both are
/// [`None`], they are considered equal; otherwise (i.e. if one is [`Some`] and the other is
/// [`None`]), they are considered not equal.
pub fn abs_diff_eq_option<E: AbsDiffEq, T: AbsDiffEq<Epsilon = E>>(a: &Option<T>, b: &Option<T>, epsilon: E) -> bool {
    match (a, b) {
        (Some(x), Some(y)) => x.abs_diff_eq(y, epsilon),
        (None, None) => true,
        _ => false,
    }
}

/// Compares all fields of two [`Iterable`] structs via [`AbsDiffEq`], downcasting each to type `T`.
///
/// Returns `true` if [`AbsDiffEq::abs_diff_eq`] is `true` for all fields, and `false` otherwise.
pub fn iter_all_abs_diff_eq<E: AbsDiffEq + Copy, T: AbsDiffEq<Epsilon = E> + 'static, I: Iterable>(
    lhs: &I,
    rhs: &I,
    epsilon: E,
) -> bool {
    iter_fields_as::<T, _>(lhs)
        .zip(iter_fields_as::<T, _>(rhs))
        .all(|(lhs, rhs)| lhs.abs_diff_eq(rhs, epsilon))
}

/// Compares all fields of two [`Iterable`] structs via [`AbsDiffEq`], downcasting to [`Option<T>`].
///
/// Returns `true` if [`abs_diff_eq_option`] is `true` for all fields, and `false` otherwise.
pub fn iter_all_abs_diff_eq_option<E: AbsDiffEq + Copy, T: AbsDiffEq<Epsilon = E> + 'static, I: Iterable>(
    lhs: &I,
    rhs: &I,
    epsilon: E,
) -> bool {
    iter_fields_as::<Option<T>, _>(lhs)
        .zip(iter_fields_as::<Option<T>, _>(rhs))
        .all(|(lhs, rhs)| abs_diff_eq_option(lhs, rhs, epsilon))
}

/// Rounds a floating-point number to a specified number of decimal places.
#[must_use]
pub fn round_to_decimals(value: f64, decimals: u32) -> f64 {
    let factor = 10f64.powi(decimals.cast_signed());
    (value * factor).round() / factor
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use struct_iterable::Iterable;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    // --- add_option ---

    #[test]
    fn add_option() {
        assert_eq!(super::add_option(Some(1.0_f64), Some(2.0)), Some(3.0));
        assert_eq!(super::add_option(None, Some(5.0_f64)), Some(5.0));
        assert_eq!(super::add_option(Some(3.0_f64), None), Some(3.0));
        assert_eq!(super::add_option::<f64>(None, None), None);

        assert_eq!(super::add_option(Some(7_i32), Some(3)), Some(10));
    }

    // --- iter_fields_as ---

    #[derive(Iterable)]
    struct TwoF64 {
        a: f64,
        b: f64,
    }

    #[test]
    fn iter_fields_as_returns_all_values() {
        let s = TwoF64 { a: 1.5, b: 2.5 };
        let vals: Vec<&f64> = iter_fields_as::<f64, _>(&s).collect();
        assert_eq!(vals, vec![&1.5_f64, &2.5_f64]);
    }

    #[test]
    fn iter_fields_as_count_matches_field_count() {
        let s = TwoF64 { a: 0.0, b: 0.0 };
        assert_eq!(iter_fields_as::<f64, _>(&s).count(), 2);
    }

    #[test]
    #[should_panic(expected = "Field 'a' should be of type")]
    fn iter_fields_as_panics_on_wrong_type() {
        let s = TwoF64 { a: 1.0, b: 2.0 };
        // Attempt to downcast f64 fields as i32 — must panic
        drop(iter_fields_as::<i32, _>(&s).collect::<Vec<&i32>>());
    }

    // --- collect_fields_copied_as ---

    #[test]
    fn collect_fields_copied_as_returns_all_values() {
        let s = TwoF64 { a: 1.5, b: 2.5 };
        assert_eq!(collect_fields_copied_as::<f64, _>(&s), vec![1.5_f64, 2.5_f64]);
    }

    #[test]
    fn collect_fields_copied_as_count_matches_field_count() {
        let s = TwoF64 { a: 0.0, b: 0.0 };
        assert_eq!(collect_fields_copied_as::<f64, _>(&s).len(), 2);
    }

    #[test]
    fn collect_fields_copied_as_returns_owned_copies() {
        let s = TwoF64 { a: 3.0, b: 7.0 };
        let mut vals = collect_fields_copied_as::<f64, _>(&s);
        vals[0] = 99.0;
        // Original struct is unaffected — vals are independent copies
        assert_eq!(s.a, 3.0);
    }

    #[test]
    #[should_panic(expected = "Field 'a' should be of type")]
    fn collect_fields_copied_as_panics_on_wrong_type() {
        let s = TwoF64 { a: 1.0, b: 2.0 };
        drop(collect_fields_copied_as::<i32, _>(&s));
    }

    // --- abs_diff_eq_option ---

    #[test]
    fn abs_diff_eq_option() {
        assert_true!(super::abs_diff_eq_option(&Some(1.0_f64), &Some(1.0), 1e-9));
        assert_true!(super::abs_diff_eq_option(&Some(1.0_f64), &Some(1.0 + 1e-10), 1e-9));
        assert_false!(super::abs_diff_eq_option(&Some(1.0_f64), &Some(2.0), 1e-9));
        assert_true!(super::abs_diff_eq_option::<f64, f64>(&None, &None, 1e-9));
        assert_false!(super::abs_diff_eq_option(&Some(1.0_f64), &None, 1e-9));
        assert_false!(super::abs_diff_eq_option(&None, &Some(1.0_f64), 1e-9));
    }

    // --- iter_all_abs_diff_eq ---

    #[test]
    fn iter_all_abs_diff_eq_equal_structs() {
        let lhs = TwoF64 { a: 1.0, b: 2.0 };
        let rhs = TwoF64 { a: 1.0, b: 2.0 };
        assert_true!(iter_all_abs_diff_eq::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    #[test]
    fn iter_all_abs_diff_eq_within_epsilon() {
        let lhs = TwoF64 { a: 1.0, b: 2.0 };
        let rhs = TwoF64 {
            a: 1.0 + 1e-10,
            b: 2.0 - 1e-10,
        };
        assert_true!(iter_all_abs_diff_eq::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    #[test]
    fn iter_all_abs_diff_eq_one_field_differs() {
        let lhs = TwoF64 { a: 1.0, b: 2.0 };
        let rhs = TwoF64 { a: 1.0, b: 99.0 };
        assert_false!(iter_all_abs_diff_eq::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    #[test]
    fn iter_all_abs_diff_eq_all_fields_differ() {
        let lhs = TwoF64 { a: 1.0, b: 2.0 };
        let rhs = TwoF64 { a: 10.0, b: 20.0 };
        assert_false!(iter_all_abs_diff_eq::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    // --- iter_all_abs_diff_eq_option ---

    #[derive(Iterable)]
    struct TwoOptionF64 {
        x: Option<f64>,
        y: Option<f64>,
    }

    #[test]
    fn iter_all_abs_diff_eq_option_both_some_equal() {
        let lhs = TwoOptionF64 {
            x: Some(1.0),
            y: Some(2.0),
        };
        let rhs = TwoOptionF64 {
            x: Some(1.0),
            y: Some(2.0),
        };
        assert_true!(iter_all_abs_diff_eq_option::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    #[test]
    fn iter_all_abs_diff_eq_option_both_none() {
        let lhs = TwoOptionF64 { x: None, y: None };
        let rhs = TwoOptionF64 { x: None, y: None };
        assert_true!(iter_all_abs_diff_eq_option::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    #[test]
    fn iter_all_abs_diff_eq_option_mixed_none_and_some_eq() {
        let lhs = TwoOptionF64 { x: Some(1.0), y: None };
        let rhs = TwoOptionF64 { x: Some(1.0), y: None };
        assert_true!(iter_all_abs_diff_eq_option::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    #[test]
    fn iter_all_abs_diff_eq_option_mixed_none_and_some_ne() {
        let lhs = TwoOptionF64 { x: Some(1.0), y: None };
        let rhs = TwoOptionF64 {
            x: Some(1.0),
            y: Some(0.0),
        };
        assert_false!(iter_all_abs_diff_eq_option::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    #[test]
    fn iter_all_abs_diff_eq_option_one_field_differs() {
        let lhs = TwoOptionF64 {
            x: Some(1.0),
            y: Some(2.0),
        };
        let rhs = TwoOptionF64 {
            x: Some(1.0),
            y: Some(99.0),
        };
        assert_false!(iter_all_abs_diff_eq_option::<f64, f64, _>(&lhs, &rhs, 1e-9));
    }

    // --- round_to_decimals ---

    #[test]
    fn round_to_decimals() {
        assert_eq!(super::round_to_decimals(3.4235, 2), 3.42);
        assert_eq!(super::round_to_decimals(2.675, 2), 2.68); // round up
        assert_eq!(super::round_to_decimals(4.6, 0), 5.0); // unit
        assert_eq!(super::round_to_decimals(1.5, 1), 1.5); // no change
        assert_eq!(super::round_to_decimals(-3.145, 2), -3.15); // negative
        assert_eq!(super::round_to_decimals(0.0, 5), 0.0); // zero
    }
}
