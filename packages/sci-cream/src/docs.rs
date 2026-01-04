/// Asserts for floating point comparisons in doc tests
#[macro_export(local_inner_macros)]
macro_rules! assert_eq_float {
    ($given:expr, $expected:expr) => {
        approx::assert_abs_diff_eq!($given, $expected, epsilon = 0.001)
    };
}

// @todo See if it's possible to export only for doc tests
pub use assert_eq_float;
