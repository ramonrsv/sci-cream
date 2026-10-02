//! Reconciles the `USDA …` dairy entries against the proximates their listings measure.
//!
//! Protein, fat and sugars are transcribed inputs, so they match exactly. Water and ash show how
//! [`DairyLabelSpec`] estimates the milk solids non-fat (MSNF) around them: sugars and protein make
//! up all of it but its [`STD_MINERALS_IN_MSNF`] share of ash. Each listing's water and ash miss by
//! how far its own MSNF departs from that split, in either direction.

#![cfg_attr(coverage, coverage(off))]
#![expect(clippy::doc_markdown)] // _FoodData_ false positive

use super::util::{Proximates, reconcile_proximates};
use crate::tests::asserts::TESTS_EPSILON;

#[cfg(doc)]
use crate::{constants::composition::dairy::STD_MINERALS_IN_MSNF, specs::DairyLabelSpec};

/// Measured proximates of each `USDA …` dairy entry, from its FoodData Central listing.
///
/// Foundation listings report no fiber, taken as zero since dairy has none.
const USDA_LISTINGS: &[(&str, Proximates, Proximates)] = &[
    // https://fdc.nal.usda.gov/food-details/746776/nutrients
    (
        "USDA Fat-Free (Skim) Milk",
        Proximates {
            water: 90.8,
            protein: 3.43,
            fat: 0.08,
            carbohydrate: 4.92,
            fiber: 0.0,
            sugars: 5.05,
            ash: 0.77,
        },
        MILK_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/746778/nutrients
    (
        "USDA 2% Reduced-Fat Milk",
        Proximates {
            water: 89.1,
            protein: 3.36,
            fat: 1.9,
            carbohydrate: 4.9,
            fiber: 0.0,
            sugars: 4.89,
            ash: 0.75,
        },
        MILK_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/746782/nutrients
    (
        "USDA Whole Milk",
        Proximates {
            water: 88.1,
            protein: 3.27,
            fat: 3.2,
            carbohydrate: 4.63,
            fiber: 0.0,
            sugars: 4.81,
            ash: 0.8,
        },
        MILK_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/171255/nutrients
    (
        "USDA Half and Half Cream",
        Proximates {
            water: 80.6,
            protein: 3.13,
            fat: 11.5,
            carbohydrate: 4.3,
            fiber: 0.0,
            sugars: 4.13,
            ash: 0.51,
        },
        CREAM_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/170857/nutrients
    (
        "USDA Light Cream",
        Proximates {
            water: 73.8,
            protein: 2.96,
            fat: 19.1,
            carbohydrate: 3.66,
            fiber: 0.0,
            sugars: 3.67,
            ash: 0.61,
        },
        CREAM_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/2705597/nutrients
    //
    // FNDDS reports no ash, so it is the remainder of the listed proximates
    (
        "USDA Heavy Cream",
        Proximates {
            water: 58.13,
            protein: 2.02,
            fat: 35.56,
            carbohydrate: 3.8,
            fiber: 0.0,
            sugars: 2.92,
            ash: 0.49,
        },
        CREAM_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/170878/nutrients
    (
        "USDA Fat-Free Evaporated Milk",
        Proximates {
            water: 79.4,
            protein: 7.55,
            fat: 0.2,
            carbohydrate: 11.4,
            fiber: 0.0,
            sugars: 11.4,
            ash: 1.5,
        },
        EVAPORATED_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/2705400/nutrients
    //
    // FNDDS reports no ash, so it is the remainder of the listed proximates
    (
        "USDA 2% Reduced-Fat Evaporated Milk",
        Proximates {
            water: 78.0,
            protein: 7.42,
            fat: 1.96,
            carbohydrate: 11.15,
            fiber: 0.0,
            sugars: 11.15,
            ash: 1.47,
        },
        EVAPORATED_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/171276/nutrients
    (
        "USDA Whole Evaporated Milk",
        Proximates {
            water: 74.0,
            protein: 6.81,
            fat: 7.56,
            carbohydrate: 10.0,
            fiber: 0.0,
            sugars: 10.0,
            ash: 1.55,
        },
        EVAPORATED_CEILING,
    ),
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

/// Per-field ceilings on relative error against the measured value, in percent — fluid milk.
///
/// Carbohydrate reads each listing's measured lactose against its carbohydrate by difference.
const MILK_CEILING: Proximates = Proximates {
    water: 0.5,
    carbohydrate: 4.0,
    ash: 12.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error against the measured value, in percent — cream.
///
/// Carbohydrate reads measured lactose as in [`MILK_CEILING`], except heavy cream's, transcribed.
const CREAM_CEILING: Proximates = Proximates {
    water: 0.5,
    carbohydrate: 4.0,
    ash: 19.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error against the measured value, in percent — evaporated milk.
///
/// The listings give sugars equal to carbohydrate by difference, so carbohydrate matches exactly.
const EVAPORATED_CEILING: Proximates = Proximates {
    water: 0.5,
    ash: 9.0,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error against the measured value, in percent — condensed milk.
///
/// Sugars, added sucrose included, equal carbohydrate by difference, as in [`EVAPORATED_CEILING`].
const CONDENSED_CEILING: Proximates = Proximates {
    water: 1.0,
    ash: 17.0,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error against the measured value, in percent — milk powders.
///
/// A powder holds little water, so even a small MSNF miss is a large relative water miss.
const POWDER_CEILING: Proximates = Proximates {
    water: 17.0,
    ash: 7.5,
    ..Proximates::splat(TESTS_EPSILON)
};

#[test]
fn usda_dairy_reconcile() {
    let lines = reconcile_proximates(USDA_LISTINGS);
    insta::assert_snapshot!(lines.join("\n"));
}
