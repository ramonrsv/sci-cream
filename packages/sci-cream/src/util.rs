use std::ops::Add;

use approx::AbsDiffEq;
use struct_iterable::Iterable;

pub fn add_option<T: Add<Output = T>>(a: Option<T>, b: Option<T>) -> Option<T> {
    return match (a, b) {
        (Some(x), Some(y)) => Some(x + y),
        (Some(x), None) => Some(x),
        (None, Some(y)) => Some(y),
        (None, None) => None,
    };
}

pub fn abs_diff_eq_option<E: AbsDiffEq, T: AbsDiffEq<Epsilon = E>>(
    a: &Option<T>,
    b: &Option<T>,
    epsilon: E,
) -> bool {
    match (a, b) {
        (Some(x), Some(y)) => x.abs_diff_eq(y, epsilon),
        (None, None) => true,
        _ => false,
    }
}

pub fn iter_all_abs_diff_eq_option<
    E: AbsDiffEq + Copy,
    T: AbsDiffEq<Epsilon = E> + 'static,
    I: Iterable,
>(
    lhs: &I,
    rhs: &I,
    epsilon: E,
) -> bool {
    lhs.iter().zip(rhs.iter()).all(|((_, a_val), (_, b_val))| {
        abs_diff_eq_option(
            a_val.downcast_ref::<Option<T>>().unwrap(),
            b_val.downcast_ref::<Option<T>>().unwrap(),
            epsilon,
        )
    })
}
