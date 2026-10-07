//! Helpers shared by the reconciliation suites: proximates reconciliation against USDA listings,
//! serving-mass estimation from component densities (via [`mixture_density`]), and FDA label
//! rounding (21 CFR 101.9).

use struct_iterable::Iterable;

use crate::{
    composition::{CompKey, Composition},
    constants::density::{MixDensityParams, OTHER_DISSOLVED_SOLIDS, mixture_density, sugars::SUCROSE},
    error::Result,
    tests::{embedded::variants::get_comp_by_name, util::relative_diff_percent},
};

/// Proximate analysis of an ingredient, per 100 g.
///
/// USDA's proximate components are water, protein, total lipid (fat), total carbohydrate and ash
/// (USDA, 2024, "FoodData Central Foundation Foods Documentation")[^83]; fiber and sugars are the
/// carbohydrate subfractions its listings report alongside.
#[doc = include_str!("../../../../docs/references/index/83.md")]
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[derive(Iterable, Copy, Clone, Debug)]
pub(super) struct Proximates {
    pub(super) water: f64,
    pub(super) protein: f64,
    pub(super) fat: f64,
    pub(super) carbohydrate: f64,
    pub(super) fiber: f64,
    pub(super) sugars: f64,
    pub(super) ash: f64,
}

impl Proximates {
    /// Constructs a new `Proximates` instance with all fields set to the same value.
    pub(super) const fn splat(value: f64) -> Self {
        Self {
            water: value,
            protein: value,
            fat: value,
            carbohydrate: value,
            fiber: value,
            sugars: value,
            ash: value,
        }
    }

    /// Field name and value pairs, in declaration order.
    #[allow(clippy::unwrap_used)] // Every field is an `f64`
    fn fields(&self) -> impl Iterator<Item = (&'static str, f64)> {
        self.iter()
            .map(|(name, value)| (name, *value.downcast_ref::<f64>().unwrap()))
    }

    /// The modeled proximates of an embedded or test-only ingredient.
    ///
    /// Ash has no [`CompKey`]: cacao's ash is the cocoa solids' `others`, and milk's the milk
    /// solids' `others`, the MSNF remainder beyond its sugars and protein. `solids.other` is a
    /// separate bucket that is not ash.
    fn modeled(name: &str) -> Self {
        let comp: Composition = get_comp_by_name(name);

        Self {
            water: comp.get(CompKey::Water),
            protein: comp.get(CompKey::TotalProteins),
            fat: comp.get(CompKey::TotalFats),
            carbohydrate: comp.get(CompKey::TotalCarbohydrates),
            fiber: comp.get(CompKey::TotalFiber),
            sugars: comp.get(CompKey::TotalSugars),
            ash: comp.solids.cocoa.others + comp.solids.milk.others,
        }
    }
}

/// Reconciles each `(name, measured, ceiling)` listing against the named entry's modeled
/// proximates, asserting each field's relative error, in percent, within its ceiling.
///
/// Returns the report lines, one table per listing, for a review snapshot.
pub(super) fn reconcile_proximates<S: AsRef<str>>(listings: &[(S, Proximates, Proximates)]) -> Vec<String> {
    let mut lines = Vec::new();

    for (name, measured, ceiling) in listings {
        let name = name.as_ref();
        lines.push(name.to_string());
        lines.push("  [     key      | modeled | measured |  diff  ]".to_string());

        let ingredient = Proximates::modeled(name);

        for (((key, modeled), (_, measured)), (_, limit)) in
            ingredient.fields().zip(measured.fields()).zip(ceiling.fields())
        {
            let diff = relative_diff_percent(modeled, measured);
            lines.push(format!("  {key:<16}{modeled:>7.2}   {measured:>7.2}    {diff:>6.2} %"));

            assert!(
                diff <= limit,
                "{name}: {key} is {diff:.2}% off the measured {measured:.2} \
                 (modeled {modeled:.2}, ceiling {limit:.2}%)"
            );
        }

        lines.push(String::new());
    }

    lines
}

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
