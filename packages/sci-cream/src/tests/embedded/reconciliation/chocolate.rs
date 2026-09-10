//! Reconciles the USDA chocolate and cocoa entries against the proximates their listings measure.
//!
//! The `compare_specs` suites compare two spec-derived compositions, so for cocoa powders a wrong
//! constant shifts both sides equally and passes unnoticed. Here one side is measured, so what the
//! tolerance bounds is the model's error rather than the distance between two sets of inputs.
//! Fat, and sugars for chocolate, are transcribed inputs and reconcile by construction.
//!
//! Energy is excluded: the listings share no convention, with 170273 on general Atwater and the
//! cocoas on specific factors that discount fiber, landing near 220 where Atwater gives over 400.

#![cfg_attr(coverage, coverage(off))]
#![allow(clippy::unwrap_used, clippy::float_cmp)]
#![expect(clippy::doc_markdown)] // _FoodData_ false positive

use struct_iterable::Iterable;

use crate::composition::{CompKey, Composition};
use crate::tests::{asserts::TESTS_EPSILON, assets::get_comp_by_name, util::relative_diff_percent};

#[cfg(doc)]
use crate::constants::composition::cacao;

/// Proximate analysis of an ingredient, per 100 g.
///
/// USDA's proximate components are water, protein, total lipid (fat), total carbohydrate and ash
/// (USDA, 2024, "FoodData Central Foundation Foods Documentation")[^83]; fiber and sugars are the
/// carbohydrate subfractions its listings report alongside.
#[doc = include_str!("../../../../docs/references/index/83.md")]
#[derive(Iterable, Copy, Clone, Debug)]
struct Proximates {
    water: f64,
    protein: f64,
    fat: f64,
    carbohydrate: f64,
    fiber: f64,
    sugars: f64,
    ash: f64,
}

impl Proximates {
    /// Field name and value pairs, in declaration order.
    fn fields(&self) -> impl Iterator<Item = (&'static str, f64)> {
        self.iter()
            .map(|(name, value)| (name, *value.downcast_ref::<f64>().unwrap()))
    }

    /// The modeled proximates of an embedded ingredient.
    ///
    /// Ash has no [`CompKey`]: cacao's ash is the cocoa solids' `others`, while an entry's
    /// `other_solids` is a separate bucket that is not ash.
    fn modeled(name: &str) -> Self {
        let comp: Composition = get_comp_by_name(name);

        Self {
            water: comp.get(CompKey::Water),
            protein: comp.get(CompKey::TotalProteins),
            fat: comp.get(CompKey::TotalFats),
            carbohydrate: comp.get(CompKey::TotalCarbohydrates),
            fiber: comp.get(CompKey::TotalFiber),
            sugars: comp.get(CompKey::TotalSugars),
            ash: comp.solids.cocoa.others,
        }
    }
}

/// Measured proximates of each embedded `USDA …` entry, from its FoodData Central listing.
const USDA_LISTINGS: &[(&str, Proximates, Proximates)] = &[
    // https://fdc.nal.usda.gov/food-details/170271/nutrients
    (
        "USDA Dark Chocolate, 45-59% Cacao Solids",
        Proximates {
            water: 0.97,
            protein: 4.88,
            fat: 31.3,
            carbohydrate: 61.2,
            fiber: 7.0,
            sugars: 47.9,
            ash: 1.7,
        },
        CHOCOLATE_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/170272/nutrients
    (
        "USDA Dark Chocolate, 60-69% Cacao Solids",
        Proximates {
            water: 1.25,
            protein: 6.12,
            fat: 38.3,
            carbohydrate: 52.4,
            fiber: 8.0,
            sugars: 36.7,
            ash: 1.9,
        },
        CHOCOLATE_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/170273/nutrients
    (
        "USDA Dark Chocolate, 70-85% Cacao Solids",
        Proximates {
            water: 1.37,
            protein: 7.79,
            fat: 42.6,
            carbohydrate: 45.9,
            fiber: 10.9,
            sugars: 24.0,
            ash: 2.32,
        },
        CHOCOLATE_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/169593/nutrients
    (
        "USDA Unsweetened Cocoa Powder",
        Proximates {
            water: 3.0,
            protein: 19.6,
            fat: 13.7,
            carbohydrate: 57.9,
            fiber: 37.0,
            sugars: 1.75,
            ash: 5.8,
        },
        COCOA_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/169594/nutrients
    (
        "USDA Unsweetened Cocoa Powder, Processed with Alkali",
        Proximates {
            water: 2.7,
            protein: 18.1,
            fat: 13.1,
            carbohydrate: 58.3,
            fiber: 29.8,
            sugars: 1.76,
            ash: 7.8,
        },
        COCOA_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/170657/nutrients
    //
    // Ash and sugars here are imputed by USDA from a similar food, not analytical
    (
        "USDA Unsweetened Cocoa Powder, Processed with Alkali, High Fat",
        Proximates {
            water: 3.0,
            protein: 16.8,
            fat: 23.7,
            carbohydrate: 49.7,
            fiber: 33.9,
            sugars: 1.53,
            ash: 6.79,
        },
        COCOA_CEILING,
    ),
];

/// Per-field ceilings on relative error against the measured value, in percent — dark chocolates.
///
/// Fat and sugars are transcribed from the listing rather than predicted, so both must match
/// exactly. Water is unmodeled and so reads as a full miss; that ceiling records the gap rather
/// than tolerates drift, and tightening it is the acceptance criterion for a `water` field.
const CHOCOLATE_CEILING: Proximates = Proximates {
    water: 101.0,
    protein: 5.0,
    fat: TESTS_EPSILON,
    carbohydrate: 3.0,
    fiber: 21.0,
    sugars: TESTS_EPSILON,
    ash: 9.0,
};

/// Per-field ceilings on relative error against the measured value, in percent — cocoa powders.
///
/// [`CocoaPowderSpec`](crate::specs::CocoaPowderSpec) has no sugars field, so the ~1.7 g each
/// listing measures is a full miss, the same unmodeled-component gap as water. Protein and ash
/// reconcile markedly worse here than on chocolate, 15.0% and 16.4% against 4.8% and 8.2%, while
/// fiber does better, 14.3% against 20.0%.
const COCOA_CEILING: Proximates = Proximates {
    water: 101.0,
    protein: 15.5,
    fat: TESTS_EPSILON,
    carbohydrate: 5.0,
    fiber: 15.0,
    sugars: 101.0,
    ash: 17.0,
};

#[test]
fn usda_chocolate_and_cocoa_reconcile() {
    let mut lines = Vec::new();

    for (name, measured, ceiling) in USDA_LISTINGS {
        lines.push((*name).to_string());
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

    insta::assert_snapshot!(lines.join("\n"));
}
