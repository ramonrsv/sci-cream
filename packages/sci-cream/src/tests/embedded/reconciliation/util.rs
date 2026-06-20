//! Helpers shared by the label-reconciliation suites: serving-mass estimation from component
//! densities (via [`mixture_density`]) and FDA label rounding (21 CFR 101.9).

use crate::{
    composition::{CompKey, Composition},
    constants::density::{MixDensityParams, OTHER_DISSOLVED_SOLIDS, mixture_density, sugars::SUCROSE},
    error::Result,
};

/// Placeholder oil density for fat-free rows, where the `fat / density` term is zero regardless.
pub(super) const NO_OIL: f64 = 1.0;

/// Estimate the mass (g) of one `serving_ml` serving from a per-100g composition, via the
/// [`mixture_density`] estimate with the flavor oil's density `oil_density`.
///
/// # Errors
///
/// Propagates the [`mixture_density`] error if the composition is not a valid per-100g mixture.
pub(super) fn serving_mass_g(comp: &Composition, oil_density: f64, serving_ml: f64) -> Result<f64> {
    let sugar = comp.get(CompKey::TotalSugars);
    let fat = comp.get(CompKey::TotalFats);
    let other_solids = comp.get(CompKey::TotalSolids) - sugar - fat;

    let density = mixture_density(MixDensityParams {
        ethanol: comp.get(CompKey::Alcohol),
        water: comp.get(CompKey::Water),
        sugar: Some((sugar, SUCROSE)),
        fat: Some((fat, oil_density)),
        other_solids: Some((other_solids, OTHER_DISSOLVED_SOLIDS)),
    })?;

    Ok(density * serving_ml)
}

/// FDA calorie rounding: under 5 reads 0, 5 to 50 to the nearest 5, over 50 to the nearest 10.
///
/// (U.S. FDA, CFR 21, 101.9 Nutrition labeling of food)[^52]
#[doc = include_str!("../../../../docs/references/index/52.md")]
pub(super) fn fda_round_calories(kcal: f64) -> f64 {
    if kcal < 5.0 {
        0.0
    } else if kcal <= 50.0 {
        (kcal / 5.0).round() * 5.0
    } else {
        (kcal / 10.0).round() * 10.0
    }
}

/// FDA nutrient rounding (g): under 0.5 reads 0, 0.5 to 5 to the nearest 0.5, over 5 to nearest 1.
///
/// (U.S. FDA, CFR 21, 101.9 Nutrition labeling of food)[^52]
#[doc = include_str!("../../../../docs/references/index/52.md")]
pub(super) fn fda_round_grams(grams: f64) -> f64 {
    if grams < 0.5 {
        0.0
    } else if grams <= 5.0 {
        (grams / 0.5).round() * 0.5
    } else {
        grams.round()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use super::*;

    #[test]
    fn fda_rounding_buckets() {
        assert_eq!(fda_round_calories(4.9), 0.0);
        assert_eq!(fda_round_calories(12.4), 10.0);
        assert_eq!(fda_round_calories(12.6), 15.0);
        assert_eq!(fda_round_calories(55.0), 60.0);

        assert_eq!(fda_round_grams(0.43), 0.0);
        assert_eq!(fda_round_grams(0.7), 0.5);
        assert_eq!(fda_round_grams(3.01), 3.0);
        assert_eq!(fda_round_grams(6.4), 6.0);
    }
}
