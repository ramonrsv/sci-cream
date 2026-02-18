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
