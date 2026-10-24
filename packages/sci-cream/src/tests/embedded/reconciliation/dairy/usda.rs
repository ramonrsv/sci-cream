//! Reconciles the `USDA …` dairy entries against the proximates their listings measure.
//!
//! Each listing is reconciled twice, as its embedded [`DairySheetSpec`] and as the test-only
//! [`DairyLabelSpec`] of the same listing, named `… (Label)`. Protein, fat and sugars are
//! transcribed inputs to both, so they match exactly. Both take the carbohydrate as the sugars,
//! except heavy cream's label, which transcribes it, so it misses wherever a listing's sugars are
//! measured lactose, as for milk and cream, rather than its carbohydrate by difference.
//!
//! The sheets' water and ash are transcribed too, the ash as their minerals, so both match exactly
//! unless a listing's proximates sum past 100 g, when its water gives way to the listed solids and
//! misses by the overshoot. Where they fall short, the other milk solids hold the rest: beside
//! measurement error, the organic acids, mostly citrate, that only carbohydrate by difference
//! counts. Since the composition keeps those as other milk solids rather than carbohydrate, a sheet
//! has no carbohydrates field. The FNDDS listings report no ash, so their sheets model the
//! minerals, reconciled against the ash their proximates leave.
//!
//! The labels' water and ash show how [`DairyLabelSpec`] estimates the milk solids non-fat (MSNF)
//! around them: sugars and protein make up all of it but the minerals that [`minerals_in_snf`]
//! gives at their protein fraction, which are the labels' ash. Each listing's water and ash miss by
//! how far its own MSNF departs from that split, either way.
//!
//! For whey, the labels' estimate also adds the solids that lactose, protein, and minerals leave
//! unaccounted, see [`unaccounted_in_snf`], as other milk solids, apart from the ash. The whey
//! listings' sugars are carbohydrate by difference, which holds them already, so the labels count
//! them twice and fall short of water, the powder's down to the 2% floor, which then cuts those
//! solids before the minerals.

#![cfg_attr(coverage, coverage(off))]
#![expect(clippy::doc_markdown)] // _FoodData_ false positive

use crate::tests::asserts::TESTS_EPSILON;
use crate::tests::embedded::reconciliation::util::{Proximates, reconcile_proximates};

#[cfg(doc)]
use crate::{
    constants::composition::dairy::{minerals_in_snf, unaccounted_in_snf},
    specs::{DairyLabelSpec, DairySheetSpec},
};

/// Measured proximates of each `USDA …` dairy entry, from its FoodData Central listing, with the
/// ceilings for its sheet and its label.
///
/// Foundation listings report no fiber, taken as zero since dairy has none.
const USDA_LISTINGS: &[(&str, Proximates, Proximates, Proximates)] = &[
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
        MILK_SHEET_CEILING,
        MILK_LABEL_CEILING,
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
        MILK_SHEET_CEILING,
        MILK_LABEL_CEILING,
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
        MILK_SHEET_CEILING,
        MILK_LABEL_CEILING,
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
        CREAM_SHEET_CEILING,
        CREAM_LABEL_CEILING,
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
        CREAM_SHEET_CEILING,
        CREAM_LABEL_CEILING,
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
        HEAVY_CREAM_SHEET_CEILING,
        CREAM_LABEL_CEILING,
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
        EVAPORATED_SHEET_CEILING,
        EVAPORATED_LABEL_CEILING,
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
        EVAPORATED_SHEET_CEILING,
        EVAPORATED_LABEL_CEILING,
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
        EVAPORATED_SHEET_CEILING,
        EVAPORATED_LABEL_CEILING,
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
        CONDENSED_SHEET_CEILING,
        CONDENSED_LABEL_CEILING,
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
        POWDER_SHEET_CEILING,
        POWDER_LABEL_CEILING,
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
        POWDER_SHEET_CEILING,
        POWDER_LABEL_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/171282/nutrients
    (
        "USDA Sweet Whey",
        Proximates {
            water: 93.1,
            protein: 0.85,
            fat: 0.36,
            carbohydrate: 5.14,
            fiber: 0.0,
            sugars: 5.14,
            ash: 0.53,
        },
        WHEY_SHEET_CEILING,
        WHEY_LABEL_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/171283/nutrients
    (
        "USDA Sweet Whey Powder",
        Proximates {
            water: 3.19,
            protein: 12.9,
            fat: 1.07,
            carbohydrate: 74.5,
            fiber: 0.0,
            sugars: 74.5,
            ash: 8.35,
        },
        WHEY_POWDER_SHEET_CEILING,
        WHEY_POWDER_LABEL_CEILING,
    ),
];

/// Per-field ceilings on relative error vs the measured value, in percent — fluid milk sheets.
const MILK_SHEET_CEILING: Proximates = Proximates {
    water: 0.5,
    carbohydrate: 4.0,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — fluid milk labels.
const MILK_LABEL_CEILING: Proximates = Proximates {
    water: 0.5,
    carbohydrate: 4.0,
    ash: 12.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — cream sheets.
const CREAM_SHEET_CEILING: Proximates = Proximates {
    water: 0.5,
    carbohydrate: 4.0,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — heavy cream sheet.
///
/// The 0.88 g by which its listing's carbohydrate exceeds its sugars isn't carbohydrate in the
/// sheet, and its modeled minerals miss the 0.49 g of ash its proximates leave.
const HEAVY_CREAM_SHEET_CEILING: Proximates = Proximates {
    carbohydrate: 23.5,
    ash: 4.0,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — cream labels.
const CREAM_LABEL_CEILING: Proximates = Proximates {
    water: 0.5,
    carbohydrate: 4.0,
    ash: 19.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — evaporated milk sheets.
const EVAPORATED_SHEET_CEILING: Proximates = Proximates {
    water: 0.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — evaporated milk labels.
const EVAPORATED_LABEL_CEILING: Proximates = Proximates {
    water: 0.5,
    ash: 9.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — condensed milk sheet.
const CONDENSED_SHEET_CEILING: Proximates = Proximates {
    water: 0.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — condensed milk label.
const CONDENSED_LABEL_CEILING: Proximates = Proximates {
    water: 1.5,
    ash: 17.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — milk powder sheets.
const POWDER_SHEET_CEILING: Proximates = Proximates {
    water: 2.0,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — milk powder labels.
///
/// A powder holds little water, so even a small MSNF miss is a large relative water miss.
const POWDER_LABEL_CEILING: Proximates = Proximates {
    water: 17.0,
    ash: 7.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — fluid whey sheet.
const WHEY_SHEET_CEILING: Proximates = Proximates::splat(TESTS_EPSILON);

/// Per-field ceilings on relative error vs the measured value, in percent — fluid whey label.
const WHEY_LABEL_CEILING: Proximates = Proximates {
    water: 0.5,
    ash: 7.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — whey powder sheet.
const WHEY_POWDER_SHEET_CEILING: Proximates = Proximates {
    water: 0.5,
    ..Proximates::splat(TESTS_EPSILON)
};

/// Per-field ceilings on relative error vs the measured value, in percent — whey powder label.
const WHEY_POWDER_LABEL_CEILING: Proximates = Proximates {
    water: 37.5,
    ash: 2.0,
    ..Proximates::splat(TESTS_EPSILON)
};

#[test]
fn usda_dairy_reconcile() {
    let listings: Vec<(String, Proximates, Proximates)> = USDA_LISTINGS
        .iter()
        .flat_map(|&(name, measured, sheet_ceiling, label_ceiling)| {
            [
                (name.to_string(), measured, sheet_ceiling),
                (format!("{name} (Label)"), measured, label_ceiling),
            ]
        })
        .collect();

    let lines = reconcile_proximates(&listings);
    insta::assert_snapshot!(lines.join("\n"));
}
