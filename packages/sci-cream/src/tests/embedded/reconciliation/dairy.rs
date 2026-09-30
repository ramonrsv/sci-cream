//! Reconciles the SR Legacy `USDA …` dairy entries against the proximates their listings measure.
//!
//! Protein, fat and sugars are transcribed inputs, and these listings give sugars equal to
//! carbohydrate by difference, so all four match exactly. Water and ash show how [`DairyLabelSpec`]
//! estimates the milk solids non-fat (MSNF) around them: by difference, the sugars already hold the
//! citrate and other non-ash solids, and the [`STD_MINERALS_IN_MSNF`] remainder it adds covers them
//! again. The overstated MSNF reads as excess ash, and as water short by about the same mass.
//!
//! The FNDDS-sourced entries are left out, as FNDDS lists no ash.

#![cfg_attr(coverage, coverage(off))]
#![expect(clippy::doc_markdown)] // _FoodData_ false positive

use super::util::{Proximates, reconcile_proximates};
use crate::tests::asserts::TESTS_EPSILON;

#[cfg(doc)]
use crate::{
    constants::composition::dairy::{STD_MIN_WATER_CONTENT_IN_MILK_POWDER, STD_MINERALS_IN_MSNF},
    specs::DairyLabelSpec,
};

/// Measured proximates of each SR Legacy `USDA …` dairy entry, from its FoodData Central listing.
const USDA_LISTINGS: &[(&str, Proximates, Proximates)] = &[
    // https://fdc.nal.usda.gov/food-details/171275/nutrients
    (
        "USDA Sweetened Condensed Milk",
        Proximates {
            water: 27.2,
            protein: 7.91,
            fat: 8.7,
            carbohydrate: 54.4,
            fiber: 0.0,
            sugars: 54.4,
            ash: 1.83,
        },
        CONDENSED_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/170877/nutrients
    (
        "USDA Skim Milk Powder",
        Proximates {
            water: 3.16,
            protein: 36.2,
            fat: 0.77,
            carbohydrate: 52.0,
            fiber: 0.0,
            sugars: 52.0,
            ash: 7.93,
        },
        POWDER_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/173454/nutrients
    (
        "USDA Whole Milk Powder",
        Proximates {
            water: 2.47,
            protein: 26.3,
            fat: 26.7,
            carbohydrate: 38.4,
            fiber: 0.0,
            sugars: 38.4,
            ash: 6.08,
        },
        POWDER_CEILING,
    ),
];

/// Per-field ceilings on relative error against the measured value, in percent — condensed milk.
///
/// Water and ash carry the MSNF overstatement in full.
const CONDENSED_CEILING: Proximates = Proximates {
    water: 1.0,
    protein: TESTS_EPSILON,
    fat: TESTS_EPSILON,
    carbohydrate: TESTS_EPSILON,
    fiber: TESTS_EPSILON,
    sugars: TESTS_EPSILON,
    ash: 11.0,
};

/// Per-field ceilings on relative error against the measured value, in percent — milk powders.
///
/// The MSNF overstatement exceeds the water a powder holds above the
/// [`STD_MIN_WATER_CONTENT_IN_MILK_POWDER`] floor, so water stops there, capping the excess ash.
const POWDER_CEILING: Proximates = Proximates {
    water: 37.0,
    protein: TESTS_EPSILON,
    fat: TESTS_EPSILON,
    carbohydrate: TESTS_EPSILON,
    fiber: TESTS_EPSILON,
    sugars: TESTS_EPSILON,
    ash: 12.5,
};

#[test]
fn usda_dairy_reconcile() {
    let lines = reconcile_proximates(USDA_LISTINGS);
    insta::assert_snapshot!(lines.join("\n"));
}
