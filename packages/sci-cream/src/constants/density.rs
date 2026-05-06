//! Constants and utilities for density and conversions between volume and weight

/// Ratio to convert Alcohol by Volume (ABV) to Alcohol by Weight (ABW)
///
/// _"Because of the miscibility of alcohol and water, the conversion factor is not constant but
/// rather depends upon the concentration of alcohol."_ ("Alcohol by volume", 2025)[^8] However,
/// for typical ice cream alcohol contents the approximation of 0.789 is sufficiently accurate.
#[doc = include_str!("../../docs/references/index/8.md")]
pub const ABV_TO_ABW_RATIO: f64 = 0.789;

/// Density (g/mL) of milk with 2% fat content
///
/// _Milk, liquid, partially skimmed_ (Charrondiere et al., 2011, p. 2)[^14]
#[doc = include_str!("../../docs/references/index/14.md")]
pub const MILK_2: f64 = 1.034;

/// Density (g/mL) of milk with 3.5% fat content
///
/// _Milk, liquid, whole_ (Charrondiere et al., 2011, p. 2)[^14]
#[doc = include_str!("../../docs/references/index/14.md")]
pub const MILK_3_5: f64 = 1.03;

/// Density (g/mL) of cream with 40% fat content
///
/// _Cream, whipping (about 40% fat)_ (Charrondiere et al., 2011, p. 2)[^14]
#[doc = include_str!("../../docs/references/index/14.md")]
pub const CREAM_40: f64 = 0.96;

/// Convert dairy volume in milliliters to grams based on fat content percentage
///
/// Interpolates density between known values for milk/cream of different fat contents;
/// see [`MILK_2`], [`MILK_3_5`], and [`CREAM_40`].
///
/// # Panics
///
/// Panics if `fat_content` is negative or greater than 100.
#[must_use]
pub const fn dairy_milliliters_to_grams(ml: f64, fat_content: f64) -> f64 {
    let less_than_2 = MILK_2;
    let between_2_and_3_5 = ((MILK_3_5 - MILK_2) / (3.5 - 2.0) * (fat_content - 2.0)) + MILK_2;
    let between_3_5_and_40 = ((CREAM_40 - MILK_3_5) / (40.0 - 3.5) * (fat_content - 3.5)) + MILK_3_5;
    let more_than_40 = CREAM_40;

    match fat_content {
        0.0..=2.0 => ml * less_than_2,
        2.0..=3.5 => ml * between_2_and_3_5,
        3.5..=40.0 => ml * between_3_5_and_40,
        40.0..=100.0 => ml * more_than_40,
        _ => panic!("Invalid fat content"),
    }
}

/// Grams of sugar in one teaspoon (US) of granulated sugar (Anderson, 2020)[^31]
#[doc = include_str!("../../docs/references/index/31.md")]
pub const GRAMS_IN_TEASPOON_OF_SUGAR: f64 = 4.2;

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::*;

    #[test]
    fn dairy_milliliters_to_grams() {
        let expected_conversions = [
            (0.0, 1.034),
            (2.0, 1.034),
            (3.0, 1.0313_333),
            (3.5, 1.03),
            (5.0, 1.0271_233),
            (35.0, 0.969_589),
            (40.0, 0.96),
            (50.0, 0.96),
        ];

        for (fat_content, expected_density) in expected_conversions {
            let grams = super::dairy_milliliters_to_grams(100.0, fat_content);
            let expected_grams = 100.0 * expected_density;
            assert_eq_flt_test!(grams, expected_grams);
        }
    }
}
