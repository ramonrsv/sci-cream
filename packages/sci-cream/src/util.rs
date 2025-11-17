use std::ops::Add;

use approx::AbsDiffEq;

pub fn add_option<T: Add<Output = T>>(a: Option<T>, b: Option<T>) -> Option<T> {
    return match (a, b) {
        (Some(x), Some(y)) => Some(x + y),
        (Some(x), None) => Some(x),
        (None, Some(y)) => Some(y),
        (None, None) => None,
    };
}

pub fn abs_diff_eq_option<T: AbsDiffEq<Epsilon = f64>>(
    a: &Option<T>,
    b: &Option<T>,
    epsilon: f64,
) -> bool {
    match (a, b) {
        (Some(x), Some(y)) => x.abs_diff_eq(y, epsilon),
        (None, None) => true,
        _ => false,
    }
}
