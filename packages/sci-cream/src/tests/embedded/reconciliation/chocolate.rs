//! Reconciles the USDA chocolate and cocoa entries against the proximates their listings measure.
//!
//! The `compare_specs` suites compare two spec-derived compositions, so for cocoa powders a wrong
//! constant shifts both sides equally and passes unnoticed. Here one side is measured, so what the
//! tolerance bounds is the model's error rather than the distance between two sets of inputs. Fat,
//! sugars for the dark chocolates, and water for the cocoa powders are transcribed from their
//! listings, so they reconcile by construction.
//!
//! The milk and white entries split their listing between cocoa and milk by its fiber and protein,
//! see [`estimate_chocolate_msnf`], which the Callebaut entries, whose milk solids their
//! specification sheets declare, check against known answers.
//!
//! Cocoa powders whose sources omit their water default to [`STD_WATER_IN_COCOA_POWDER`], which the
//! USDA and Callebaut powders, whose sources give it, check against known answers.
//!
//! Energy is excluded: the listings share no convention, with 170273 on general Atwater and the
//! cocoas on specific factors that discount fiber, landing near 220 where Atwater gives over 400.

#![cfg_attr(coverage, coverage(off))]
#![expect(clippy::doc_markdown)] // _FoodData_ false positive

use crate::tests::asserts::shadow_asserts::assert_eq;
#[expect(unused_imports)]
use crate::tests::asserts::*;

use crate::tests::embedded::variants::get_comp_by_name;

use super::util::{EXACT_MATCH, Proximates, reconcile_proximates};
use crate::{
    composition::CompKey,
    constants::composition::{
        cacao::STD_WATER_IN_COCOA_POWDER,
        dairy::{STD_BUTTERFAT_IN_WHOLE_MILK_POWDER, milk::STD_LACTOSE_IN_MSNF},
    },
    data::get_spec_entry_by_name,
    specs::{
        ChocolateFat, ChocolateSpec, CocoaPowderSpec, IngredientSpec, SpecEntry, TaggedSpec, estimate_chocolate_msnf,
        estimate_cocoa_snf,
    },
    util::round_to_decimals,
};

#[cfg(doc)]
use crate::constants::composition::{cacao, dairy::milk};

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
    // https://fdc.nal.usda.gov/food-details/167587/nutrients
    (
        "USDA Milk Chocolate",
        Proximates {
            water: 1.5,
            protein: 7.65,
            fat: 29.66,
            carbohydrate: 59.4,
            fiber: 3.4,
            sugars: 51.5,
            ash: 1.78,
        },
        MILK_CHOCOLATE_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/167571/nutrients
    //
    // Sugars here are calculated by USDA from other nutrients, not analytical
    (
        "USDA White Chocolate",
        Proximates {
            water: 1.3,
            protein: 5.87,
            fat: 32.09,
            carbohydrate: 59.24,
            fiber: 0.2,
            sugars: 59.0,
            ash: 1.5,
        },
        MILK_CHOCOLATE_CEILING,
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

/// Encodes a full miss, typically for an unmodeled field
const FULL_MISS: f64 = 100.0;

/// Per-field ceilings on relative error against the measured value, in percent — dark chocolates.
///
/// Fat and sugars are transcribed from the listing rather than predicted, so both must match
/// exactly. [`ChocolateSpec`](crate::specs::ChocolateSpec) has no water field, so water reads as a
/// full miss, a ceiling that records the gap rather than tolerates drift. That same water stays
/// inside `cacao_solids` and inflates the cocoa solids, while the sugars intrinsic to cocoa deflate
/// them by leaving with the declared `sugars` ([`cacao::STD_SUGARS_IN_COCOA_SOLIDS`]); the rest
/// bound that net overstatement plus the scatter of each constant, fiber being the loosest.
const CHOCOLATE_CEILING: Proximates = Proximates {
    water: FULL_MISS,
    protein: 4.5,
    fat: EXACT_MATCH,
    carbohydrate: 3.0,
    fiber: 16.0,
    sugars: EXACT_MATCH,
    ash: 9.0,
};

/// Per-field ceilings on relative error against the measured value, in percent — milk and white.
///
/// Each entry splits its listing between cocoa and milk by fiber and protein, see
/// [`estimate_chocolate_msnf`], and transcribes its fat. So fat matches exactly, and protein,
/// fiber, and sugars match within the entry's one-decimal rounding, which at white's 0.2 g of fiber
/// is 7.0% of it. Water reads as a full miss, as for the dark chocolates.
///
/// Ash is the loosest: white's entry gets nearly all its ash from its milk solids, at
/// [`milk::STD_MINERALS_IN_MSNF`], which falls about 16% short of what its listing reports.
const MILK_CHOCOLATE_CEILING: Proximates = Proximates {
    water: FULL_MISS,
    protein: 0.4,
    fat: EXACT_MATCH,
    carbohydrate: 3.0,
    fiber: 7.5,
    sugars: 0.1,
    ash: 16.0,
};

/// Per-field ceilings on relative error against the measured value, in percent — cocoa powders.
///
/// [`CocoaPowderSpec`](crate::specs::CocoaPowderSpec) has no sugars field, so each listing's sugars
/// read as a full miss; that mass stays inside the modeled cocoa solids as carbohydrate, keeping
/// that row tight. Fat and water are transcribed, so both match exactly. Ash tracks alkalization
/// via [`cacao::STD_ASH_IN_DUTCHED_COCOA_SOLIDS`], missing only where a listing departs from it.
/// Fiber is the loosest, with protein also wide against a shared constant.
const COCOA_CEILING: Proximates = Proximates {
    water: EXACT_MATCH,
    protein: 9.0,
    fat: EXACT_MATCH,
    carbohydrate: 3.0,
    fiber: 18.5,
    sugars: FULL_MISS,
    ash: 8.5,
};

#[test]
fn usda_chocolate_and_cocoa_reconcile() {
    let lines = reconcile_proximates(USDA_LISTINGS);
    insta::assert_snapshot!(lines.join("\n"));
}

/// Derives a USDA dark chocolate entry from its listing, as its prose describes: `total_fat` and
/// `sugars` from the listing, and `cacao_solids` as `100 - sugars`.
fn derive_usda_dark_chocolate(listing: &Proximates) -> ChocolateSpec {
    ChocolateSpec {
        cacao_solids: round_to_decimals(100.0 - listing.sugars, 1),
        milk_solids: None,
        fat: Some(ChocolateFat::Total(listing.fat)),
        sugars: Some(listing.sugars),
        other_solids: None,
    }
}

/// Derives a USDA milk or white chocolate entry from its listing, as its prose describes. Each
/// field is rounded to the one decimal its entry is written with, and later fields build on those.
fn derive_usda_milk_chocolate(listing: &Proximates) -> ChocolateSpec {
    let msnf = estimate_chocolate_msnf(listing.protein, listing.fiber);
    let milk_solids = round_to_decimals(msnf / (1.0 - STD_BUTTERFAT_IN_WHOLE_MILK_POWDER), 1);
    let milk_fat = milk_solids * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER;
    let cacao_solids = round_to_decimals(listing.fat - milk_fat + estimate_cocoa_snf(listing.fiber), 1);
    let sugars = round_to_decimals(listing.sugars - (milk_solids - milk_fat) * STD_LACTOSE_IN_MSNF, 1);

    ChocolateSpec {
        cacao_solids,
        milk_solids: Some(milk_solids),
        fat: Some(ChocolateFat::Total(listing.fat)),
        sugars: Some(sugars),
        other_solids: Some(round_to_decimals(100.0 - cacao_solids - milk_solids - sugars, 1)),
    }
}

/// Each USDA chocolate entry is exactly what its prose derives from its listing.
#[test]
fn usda_chocolate_entries_follow_their_derivation() {
    let mut checked = 0;

    for (name, listing, _) in USDA_LISTINGS {
        let Ok(SpecEntry::Ingredient(IngredientSpec {
            spec: TaggedSpec::ChocolateSpec(spec),
            ..
        })) = get_spec_entry_by_name(name)
        else {
            continue; // A cocoa powder
        };

        let derived = if spec.milk_solids.is_some() {
            derive_usda_milk_chocolate(listing)
        } else {
            derive_usda_dark_chocolate(listing)
        };

        assert_eq!(spec, derived, "{name}");
        checked += 1;
    }

    assert_eq!(checked, 5);
}

/// Protein and fiber per 100 g of each Callebaut entry with milk solids, from the nutritional data
/// of the specification sheet its prose links, which also declares its milk solids.
const CALLEBAUT_SHEETS: &[(&str, f64, f64)] = &[
    ("Callebaut 823 Milk Chocolate", 7.0, 2.1),
    ("Callebaut 665 Milk Chocolate", 8.1, 1.1),
    ("Callebaut Power 41 Milk Chocolate", 8.5, 4.1),
    ("Callebaut Arriba Milk Chocolate", 9.1, 2.8),
    ("Callebaut W2 White Chocolate", 6.0, 0.0),
    ("Mona Lisa Milk Chocolate Blossoms", 6.5, 2.7),
];

/// Ceiling on [`estimate_chocolate_msnf`]'s relative error, in percent, against each entry's MSNF.
///
/// The estimate reads low on every entry, as the sheets that list milk protein put it at 35.5-36.9%
/// of the MSNF, below [`milk::STD_PROTEIN_IN_MSNF`]. Like the rest of their nutritional data, those
/// figures are calculated from the vendor's reference values rather than measured.
const CALLEBAUT_MSNF_CEILING: f64 = 6.5;

/// [`estimate_chocolate_msnf`] recovers each Callebaut entry's MSNF from its sheet's protein and
/// fiber; the snapshot tables each estimate and its error.
#[test]
fn estimate_chocolate_msnf_recovers_callebaut_entries() {
    let mut lines = vec![format!(
        "{:<34}{:>9}{:>7}{:>8}{:>10}{:>9}",
        "entry", "protein", "fiber", "MSNF", "estimate", "error"
    )];

    for &(name, protein, fiber) in CALLEBAUT_SHEETS {
        let msnf = get_comp_by_name(name).get(CompKey::MSNF);
        let estimate = estimate_chocolate_msnf(protein, fiber);
        let error = (estimate - msnf) / msnf * 100.0;

        lines.push(format!("{name:<34}{protein:>9.1}{fiber:>7.1}{msnf:>8.2}{estimate:>10.2}{error:>+8.2}%"));

        assert!(
            error.abs() <= CALLEBAUT_MSNF_CEILING,
            "{name}: MSNF from protein is {error:+.2}% off the entry's {msnf:.2} \
             (estimated {estimate:.2}, ceiling {CALLEBAUT_MSNF_CEILING:.2}%)"
        );
    }

    insta::assert_snapshot!(lines.join("\n"));
}

/// Cocoa powders whose water comes from their source, measured by USDA or left over from
/// Callebaut's nutritional data, unlike Valrhona's assumed default and Corvitto's conventional 0.
const SOURCED_COCOA_WATER: &[&str] = &[
    "USDA Unsweetened Cocoa Powder",
    "USDA Unsweetened Cocoa Powder, Processed with Alkali",
    "USDA Unsweetened Cocoa Powder, Processed with Alkali, High Fat",
    "Callebaut Botanical Extra Brute Cocoa Powder",
    "Callebaut Zestina Plein Arome Cocoa Powder",
    "Callebaut 10/12 Natural Cocoa Powder",
];

/// Ceiling on [`STD_WATER_IN_COCOA_POWDER`]'s relative error, in percent, against each entry.
///
/// Near the USDA listings' mean, the default reads above their 2.7% and below Callebaut's 3.5%.
const COCOA_WATER_CEILING: f64 = 14.5;

/// [`STD_WATER_IN_COCOA_POWDER`] approximates the water of each [`SOURCED_COCOA_WATER`] entry; the
/// snapshot tables each entry's water and the default's error.
#[test]
fn std_water_in_cocoa_powder_approximates_sourced_entries() {
    let default = STD_WATER_IN_COCOA_POWDER * 100.0;
    let mut lines = vec![format!("{:<63}{:>6}{:>9}{:>9}", "entry", "water", "default", "error")];

    for &name in SOURCED_COCOA_WATER {
        let Ok(SpecEntry::Ingredient(IngredientSpec {
            spec: TaggedSpec::CocoaPowderSpec(CocoaPowderSpec { water: Some(water), .. }),
            ..
        })) = get_spec_entry_by_name(name)
        else {
            panic!("{name} is not an embedded CocoaPowderSpec with its water");
        };

        let error = (default - water) / water * 100.0;

        lines.push(format!("{name:<63}{water:>6.2}{default:>9.2}{error:>+8.2}%"));

        assert!(
            error.abs() <= COCOA_WATER_CEILING,
            "{name}: default water is {error:+.2}% off the entry's {water:.2} \
             (default {default:.2}, ceiling {COCOA_WATER_CEILING:.2}%)"
        );
    }

    insta::assert_snapshot!(lines.join("\n"));
}
