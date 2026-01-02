use std::ops::Add;

use approx::AbsDiffEq;
use struct_iterable::Iterable;

pub fn add_option<T: Add<Output = T>>(a: Option<T>, b: Option<T>) -> Option<T> {
    match (a, b) {
        (Some(x), Some(y)) => Some(x + y),
        (Some(x), None) => Some(x),
        (None, Some(y)) => Some(y),
        (None, None) => None,
    }
}

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

pub fn abs_diff_eq_option<E: AbsDiffEq, T: AbsDiffEq<Epsilon = E>>(a: &Option<T>, b: &Option<T>, epsilon: E) -> bool {
    match (a, b) {
        (Some(x), Some(y)) => x.abs_diff_eq(y, epsilon),
        (None, None) => true,
        _ => false,
    }
}

pub fn iter_all_abs_diff_eq<E: AbsDiffEq + Copy, T: AbsDiffEq<Epsilon = E> + 'static, I: Iterable>(
    lhs: &I,
    rhs: &I,
    epsilon: E,
) -> bool {
    iter_fields_as::<T, _>(lhs)
        .zip(iter_fields_as::<T, _>(rhs))
        .all(|(lhs, rhs)| lhs.abs_diff_eq(rhs, epsilon))
}

pub fn iter_all_abs_diff_eq_option<E: AbsDiffEq + Copy, T: AbsDiffEq<Epsilon = E> + 'static, I: Iterable>(
    lhs: &I,
    rhs: &I,
    epsilon: E,
) -> bool {
    iter_fields_as::<Option<T>, _>(lhs)
        .zip(iter_fields_as::<Option<T>, _>(rhs))
        .all(|(lhs, rhs)| abs_diff_eq_option(lhs, rhs, epsilon))
}

pub fn round_to_decimals(value: f64, decimals: u32) -> f64 {
    let factor = 10f64.powi(decimals as i32);
    (value * factor).round() / factor
}
