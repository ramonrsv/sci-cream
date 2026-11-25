//! Helpers shared by the reconciliation suites: proximates reconciliation against USDA listings,
//! serving-mass estimation from component densities (via [`mixture_density`]), and label rounding,
//! the FDA's (21 CFR 101.9) and by market, [`LabelRounding`].

use std::ops::Range;

use struct_iterable::Iterable;

use crate::tests::asserts::EPSILON_8DP;

use crate::tests::{embedded::variants::get_embedded_or_variant_comp_by_name, util::relative_diff_percent};

use crate::{
    composition::{CompKey, Composition},
    constants::density::{MixDensityParams, OTHER_DISSOLVED_SOLIDS, mixture_density, sugars::SUCROSE},
    error::Result,
    util::round_to_decimals,
};

/// Encodes an exact match, for a field transcribed from the listing rather than predicted
pub(super) const EXACT_MATCH: f64 = EPSILON_8DP;

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
    /// Ash is read as [`CompKey::TotalMinerals`], the minerals of all its solids.
    fn modeled(name: &str) -> Self {
        let comp: Composition = get_embedded_or_variant_comp_by_name(name);

        Self {
            water: comp.get(CompKey::Water),
            protein: comp.get(CompKey::TotalProteins),
            fat: comp.get(CompKey::TotalFats),
            carbohydrate: comp.get(CompKey::TotalCarbohydrates),
            fiber: comp.get(CompKey::TotalFiber),
            sugars: comp.get(CompKey::TotalSugars),
            ash: comp.get(CompKey::TotalMinerals),
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
/// (U.S. FDA, CFR 21, 101.9(c)(1))[^123]
#[doc = include_str!("../../../../docs/references/index/123.md")]
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
/// (U.S. FDA, CFR 21, 101.9(c)(2))[^123]
#[doc = include_str!("../../../../docs/references/index/123.md")]
pub(super) fn fda_round_grams(grams: f64) -> f64 {
    if grams < 0.5 {
        0.0
    } else if grams <= 5.0 {
        (grams / 0.5).round() * 0.5
    } else {
        grams.round()
    }
}

/// EU nutrient rounding (g), per 100 g: 0.5 or under reads 0, under 10 to the nearest 0.1, and
/// from 10 to the nearest 1.
///
/// (European Commission, 2012, Table 4)[^133]
#[doc = include_str!("../../../../docs/references/index/133.md")]
fn eu_round_grams(grams: f64) -> f64 {
    if grams >= 10.0 {
        grams.round()
    } else if grams > 0.5 {
        round_to_decimals(grams, 1)
    } else {
        0.0
    }
}

/// A nutrition label's rounding, by the market it's printed for
///
/// US labels follow 21 CFR 101.9(c)[^123], Canadian ones the table to B.01.401[^124], and EU and UK
/// ones the European Commission's rounding guidelines, Table 4[^133], which apply per 100 g.
#[doc = include_str!("../../../../docs/references/index/123.md")]
#[doc = include_str!("../../../../docs/references/index/124.md")]
#[doc = include_str!("../../../../docs/references/index/133.md")]
#[derive(Copy, Clone, Debug)]
pub(super) enum LabelRounding {
    /// Canada's Food and Drug Regulations
    Canada,
    /// The European Commission's guidelines, for EU and UK labels per 100 g
    EU,
    /// The FDA's regulations
    US,
}

impl LabelRounding {
    /// Rounds a serving's fat, in grams, as the label prints it
    pub(super) fn fat(self, grams: f64) -> f64 {
        match self {
            Self::Canada if grams < 0.5 => round_to_decimals(grams, 1),
            Self::Canada if grams <= 5.0 => (grams * 2.0).round() / 2.0,
            Self::Canada => grams.round(),
            Self::EU => eu_round_grams(grams),
            Self::US => fda_round_grams(grams),
        }
    }

    /// The range of amounts of a serving's fat, in grams, that the label prints as `printed`
    pub(super) fn fat_range(self, printed: f64) -> Range<f64> {
        // Every market rounds fat to the gram or finer, so a gram more always prints more
        let upper = printed + 1.0;
        least_amount_where(|grams| self.fat(grams) >= printed, upper)
            ..least_amount_where(|grams| self.fat(grams) > printed, upper)
    }

    /// Rounds a serving's carbohydrate, fiber, or sugars, in grams, as the label prints it
    ///
    /// A US label may print less than 1 g as _"less than 1 gram"_, which this doesn't model.
    pub(super) fn carbohydrate(self, grams: f64) -> f64 {
        match self {
            Self::Canada | Self::US => grams.round(),
            Self::EU => eu_round_grams(grams),
        }
    }

    /// Rounds a serving's protein, in grams, as the label prints it
    pub(super) fn protein(self, grams: f64) -> f64 {
        match self {
            Self::Canada if grams < 0.5 => round_to_decimals(grams, 1),
            Self::Canada | Self::US => grams.round(),
            Self::EU => eu_round_grams(grams),
        }
    }
}

/// The least amount, from 0 to `upper`, at which `holds`, by bisection:
/// it must hold at `upper`, and wherever it holds, at every larger amount too
fn least_amount_where(holds: impl Fn(f64) -> bool, upper: f64) -> f64 {
    assert!(holds(upper), "the predicate must hold at the upper bound, {upper}");

    if holds(0.0) {
        return 0.0;
    }

    let (mut low, mut high) = (0.0, upper);
    // Halving 64 times narrows the bracket past an ulp of any bound the markets' rules have
    for _ in 0..64 {
        let mid = f64::midpoint(low, high);
        if holds(mid) {
            high = mid;
        } else {
            low = mid;
        }
    }
    high
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::assert_eq_flt;

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

    #[test]
    fn label_rounding_buckets() {
        assert_eq!(LabelRounding::Canada.fat(0.43), 0.4);
        assert_eq!(LabelRounding::US.fat(0.43), 0.0);
        assert_eq!(LabelRounding::Canada.fat(3.2), 3.0);
        assert_eq!(LabelRounding::US.fat(6.4), 6.0);
        assert_eq!(LabelRounding::EU.fat(31.6), 32.0);
        assert_eq!(LabelRounding::EU.fat(2.84), 2.8);
        assert_eq!(LabelRounding::EU.fat(0.4), 0.0);

        assert_eq!(LabelRounding::Canada.carbohydrate(0.43), 0.0);
        assert_eq!(LabelRounding::US.carbohydrate(0.7), 1.0);
        assert_eq!(LabelRounding::EU.carbohydrate(9.96), 10.0);

        assert_eq!(LabelRounding::Canada.protein(0.43), 0.4);
        assert_eq!(LabelRounding::US.protein(0.43), 0.0);
        assert_eq!(LabelRounding::EU.protein(7.94), 7.9);
    }

    #[test]
    fn label_rounding_fat_ranges() {
        let cases = [
            (LabelRounding::US, 0.0, 0.0..0.5),
            (LabelRounding::US, 0.5, 0.5..0.75),
            (LabelRounding::US, 1.0, 0.75..1.25),
            (LabelRounding::US, 5.0, 4.75..5.5),
            (LabelRounding::Canada, 0.4, 0.35..0.45),
            (LabelRounding::Canada, 0.5, 0.45..0.75),
            (LabelRounding::Canada, 8.0, 7.5..8.5),
            (LabelRounding::EU, 0.0, 0.0..0.5),
            (LabelRounding::EU, 2.8, 2.75..2.85),
            (LabelRounding::EU, 32.0, 31.5..32.5),
        ];

        for (rounding, printed, expected) in cases {
            let range = rounding.fat_range(printed);
            assert_eq_flt!(range.start, expected.start);
            assert_eq_flt!(range.end, expected.end);
        }
    }
}
