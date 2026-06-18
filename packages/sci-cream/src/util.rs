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

/// Checks if a lookup table of `(T, U)` pairs supports interpolation via [`interpolate_pairs`].
///
/// The table must have at least 2 entries, and `from` values must be in strictly ascending order.
#[must_use]
pub fn table_supports_interpolation<T, U>(table: &[(T, U)], from: fn(&(T, U)) -> f64) -> bool {
    table.len() >= 2 && table.windows(2).all(|pair| from(&pair[1]) > from(&pair[0]))
}

/// Piecewise-linear interpolation of `x` over a lookup table of `(T, U)` pairs.
///
/// The columns are read via the `from` and `to` functions, allowing for interpolation in either
/// direction of a lookup table. The table must be sorted in ascending order of the `from` values.
/// If `x` is outside the bounds of the table, the function will perform linear extrapolation based
/// on the slope of the nearest segment. This function runs in O(n) time. For tables with evenly
/// spaced `from` values of `usize` type, see [`fast_interpolate_pairs`] which runs in O(1).
///
/// **Warning**: This function does not check preconditions such as table length or ordering. It's
/// up to the caller to validate via [`table_supports_interpolation`] before using this function.
#[must_use]
pub fn interpolate_pairs<T, U>(table: &[(T, U)], x: f64, from: fn(&(T, U)) -> f64, to: fn(&(T, U)) -> f64) -> f64 {
    let slope = |lhs: &(T, U), rhs: &(T, U)| (to(rhs) - to(lhs)) / (from(rhs) - from(lhs));
    let inter = |x: f64, lhs: &(T, U), rhs: &(T, U)| to(lhs) + slope(lhs, rhs) * (x - from(lhs));

    let (first, last) = (&table[0], &table[table.len() - 1]);

    if x <= from(first) {
        return inter(x, first, &table[1]);
    }

    for pair in table.windows(2) {
        let (lo, hi) = (&pair[0], &pair[1]);
        if x <= from(hi) {
            return inter(x, lo, hi);
        }
    }

    inter(x, &table[table.len() - 2], last)
}

/// Checks if a `(usize, f64)` lookup table supports interpolation via [`fast_interpolate_pairs`].
///
/// The table must have at least 2 entries, `u32` values must be in strictly ascending order, and
/// the `u32` values must be evenly spaced across the full range(i.e. have a constant step size).
#[must_use]
pub fn table_supports_fast_interpolation(table: &[(u32, f64)]) -> bool {
    if table_supports_interpolation(table, |pair| f64::from(pair.0)) {
        let step = table[1].0 - table[0].0;
        table.windows(2).all(|pair| (pair[1].0 - pair[0].0) == step)
    } else {
        false
    }
}

/// Fast piecewise-linear interpolation of `x` over a lookup table of `(u32, f64)` pairs with
/// evenly spaced `u32` values.
///
/// The table must be sorted in ascending order of the `u32` values, and the `u32` values must
/// be evenly spaced across the full range. If `x` is outside the bounds of the table, the function
/// will perform linear extrapolation based on the slope of the nearest segment. This function runs
/// in O(1) time. For tables that do not meet these preconditions, see [`interpolate_pairs`].
///
/// **Warning**: This function does not check preconditions such as table length, ordering, or
/// spacing. It's up to the caller to validate the input table via
/// [`table_supports_fast_interpolation`] before using this function.
#[expect(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
#[must_use]
pub fn fast_interpolate_pairs(table: &[(u32, f64)], x: f64) -> f64 {
    let slope = |lhs: &(u32, f64), rhs: &(u32, f64)| (rhs.1 - lhs.1) / (f64::from(rhs.0 - lhs.0));
    let inter = |x: f64, lhs: &(u32, f64), rhs: &(u32, f64)| lhs.1 + slope(lhs, rhs) * (x - f64::from(lhs.0));

    let (first, last) = (&table[0], &table[table.len() - 1]);

    if x <= f64::from(first.0) {
        return inter(x, first, &table[1]);
    } else if x > f64::from(last.0) {
        return inter(x, &table[table.len() - 2], last);
    }

    let step_usize = table[1].0 - table[0].0;
    let step_f64 = f64::from(step_usize);
    let (x_floor, x_ceil) = ((x / step_f64).floor() as u32 * step_usize, (x / step_f64).ceil() as u32 * step_usize);
    let (low_idx, high_idx) = (x_floor / step_usize, x_ceil / step_usize);
    let (low, high) = (&table[low_idx as usize], &table[high_idx as usize]);

    if low_idx == high_idx {
        table[low_idx as usize].1
    } else {
        inter(x, low, high)
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp, clippy::cast_precision_loss)]
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

    // -- table interpolation tests ---

    const SAMPLE_F64_TABLE: &[(f64, f64)] = &[
        (0.0, 1.0),
        (1.5, 3.0),
        (2.0, 4.0),
        (2.5, 5.0),
        (3.0, 4.0),
        (4.0, 3.0),
        (4.5, 2.0),
        (5.0, 1.5),
    ];

    const SAMPLE_U32_TABLE: &[(u32, f64)] = &[
        (0, 1.0),
        (2, 3.0),
        (4, 5.0),
        (6, 7.0),
        (8, 9.0),
        (10, 5.0),
        (12, 3.0),
        (14, 1.5),
    ];

    fn x<T: Copy + Into<f64>>(p: &(T, f64)) -> f64 {
        p.0.into()
    }

    fn y<T: Copy + Into<f64>>(p: &(T, f64)) -> f64 {
        p.1
    }

    // --- table_supports_interpolation ---

    #[test]
    fn table_supports_interpolation() {
        let table_expected_support: &[(&[(f64, f64)], bool)] = &[
            (&[], false),                                              // empty
            (&[(1.0, 0.0)], false),                                    // single entry
            (&[(0.0, 0.0), (1.0, 1.0)], true),                         // two, ascending
            (&[(0.0, 0.0), (1.0, 1.0), (2.0, 4.0), (3.0, 9.0)], true), // multiple, ascending
            (&[(0.0, 0.0), (1.0, 1.0), (1.0, 2.0)], false),            // duplicate x
            (&[(2.0, 0.0), (1.0, 1.0)], false),                        // descending x
            (&[(1.0, 2.0), (2.0, 1.0)], true),                         // descending y
        ];

        for (table, expected) in table_expected_support {
            assert_eq!(super::table_supports_interpolation(table, |pair| pair.0), *expected);
        }
    }

    // --- interpolate_pairs ---

    #[test]
    fn interpolate_pairs_f64_table() {
        let table = SAMPLE_F64_TABLE;
        assert_eq!(interpolate_pairs(table, 0.0, x, y), 1.0); // at first point
        assert_eq!(interpolate_pairs(table, 5.0, x, y), 1.5); // at last point
        assert_eq!(interpolate_pairs(table, 2.5, x, y), 5.0); // at interior point
        assert_eq!(interpolate_pairs(table, 3.5, x, y), 3.5); // half between points
        assert_eq!(interpolate_pairs(table, 0.5, x, y), 1.0 + 2.0 / 3.0); // third between points
    }

    #[test]
    fn interpolate_pairs_u32_table() {
        let table = SAMPLE_U32_TABLE;
        assert_eq!(interpolate_pairs(table, 0.0, x, y), 1.0); // at first point
        assert_eq!(interpolate_pairs(table, 14.0, x, y), 1.5); // at last point
        assert_eq!(interpolate_pairs(table, 4.0, x, y), 5.0); // at interior point
        assert_eq!(interpolate_pairs(table, 1.0, x, y), 2.0); // midpoint of first segment
        assert_eq!(interpolate_pairs(table, 5.0, x, y), 6.0); // midpoint of interior segment
        assert_eq!(interpolate_pairs(table, 11.0, x, y), 4.0); // midpoint of last segment
    }

    #[test]
    fn extrapolate_pairs_out_of_bounds() {
        let table = SAMPLE_F64_TABLE;
        assert_eq!(interpolate_pairs(table, -1.5, x, y), -1.0); // left extrapolation
        assert_eq!(interpolate_pairs(table, 6.0, x, y), 0.5); // right extrapolation
    }

    #[test]
    fn interpolate_pairs_reversed_columns() {
        let table = &[(0.0_f64, 0.0_f64), (2.0, 4.0)];
        assert_eq!(interpolate_pairs(table, 2.0, y, x), 1.0);
    }

    // --- table_supports_fast_interpolation ---

    #[test]
    fn table_supports_fast_interpolation() {
        let table_expected_support: &[(&[(u32, f64)], bool)] = &[
            (&[], false),                             // empty
            (&[(0, 1.0)], false),                     // single entry
            (&[(0, 0.0), (1, 2.0), (2, 0.0)], true),  // valid, unit step
            (&[(0, 0.0), (2, 4.0), (4, 0.0)], true),  // valid, step 2
            (&[(0, 0.0), (1, 1.0), (3, 4.0)], false), // uneven spacing
            (&[(2, 0.0), (1, 1.0)], false),           // descending keys
            (&[(1, 0.0), (1, 1.0)], false),           // equal keys
            (&[(1, 1.0), (2, 0.0)], true),            // descending values
        ];

        for (table, expected) in table_expected_support {
            assert_eq!(super::table_supports_fast_interpolation(table), *expected);
        }
    }

    // --- fast_interpolate_pairs ---

    #[test]
    fn fast_interpolate_pairs_u32_table() {
        let table = SAMPLE_U32_TABLE;
        assert_eq!(fast_interpolate_pairs(table, 0.0), 1.0); // at first node
        assert_eq!(fast_interpolate_pairs(table, 14.0), 1.5); // at last node
        assert_eq!(fast_interpolate_pairs(table, 4.0), 5.0); // at interior node
        assert_eq!(fast_interpolate_pairs(table, 1.0), 2.0); // midpoint of first segment
        assert_eq!(fast_interpolate_pairs(table, 5.0), 6.0); // midpoint of interior segment
        assert_eq!(fast_interpolate_pairs(table, 11.0), 4.0); // midpoint of last segment
    }

    #[test]
    fn fast_interpolate_pairs_out_of_bounds() {
        let table = SAMPLE_U32_TABLE;
        assert_eq!(fast_interpolate_pairs(table, -1.0), 0.0); // left extrapolation
        assert_eq!(fast_interpolate_pairs(table, 16.0), 0.0); // right extrapolation
    }

    #[test]
    fn fast_interpolate_pairs_matches_interpolate_pairs() {
        let table = SAMPLE_U32_TABLE;
        for x_val in [0.5, 1.0, 3.5, 7.0, 8.0, 10.5] {
            assert_eq!(fast_interpolate_pairs(table, x_val), interpolate_pairs(table, x_val, x, y),);
        }
    }
}
