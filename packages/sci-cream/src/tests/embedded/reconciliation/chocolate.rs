//! Reconciles the chocolate and cocoa entries against what their sources measure or print.
//!
//! The `compare_specs` suites compare two spec-derived compositions, so for cocoa powders a wrong
//! constant shifts both sides equally and passes unnoticed. Here one side is measured, so what the
//! tolerance bounds is the model's error rather than the distance between two sets of inputs. Fat,
//! sugars for the dark chocolates, and water for the cocoa powders are transcribed from their
//! listings, so they reconcile by construction.
//!
//! The milk and white entries split their listings between cocoa and milk by fiber and protein,
//! see [`estimate_chocolate_snf_split_from_protein_by_fiber`], which the Callebaut and Valrhona
//! entries, whose milk solids their specification sheets declare, check against known answers.
//!
//! Each listing is also reconciled as its test-only [`ChocolateLabelSpec`], named `… (Label)`, see
//! [`variants`](crate::tests::embedded::variants). The dark chocolate and cocoa powder labels take
//! no more from a listing than its entry does, leaving its protein and fiber to the [`cocoa`]
//! fractions, which come from these listings. The milk and white labels split theirs as the entries
//! do, without rounding.
//!
//! Each label entry is reconciled against the figures its label prints, within the label's
//! rounding, see [`LabelRounding`]. The Callebaut, Mona Lisa, and Valrhona `… (Label)` variants,
//! which leave out the solids their sources declare, are reconciled against their entries with them
//! declared: their sources' minima, or their sheet's actual cocoa and milk solids. The milk and
//! white ones, so declared, must still compose their label's protein, to within its rounding.
//!
//! The Cadbury labels compose the fat and sugars they print, to within their rounding, those whose
//! rounding leaves their parts over 100 g being scaled into it.
//!
//! Cocoa powders whose sources omit their water default to [`STD_WATER_IN_COCOA_POWDER`], which the
//! USDA and Callebaut powders, whose sources give it, check against known answers.
//!
//! Energy is excluded: the listings share no convention, with 170273 on general Atwater and the
//! cocoas on specific factors that discount fiber, landing near 220 where Atwater gives over 400.

#![cfg_attr(coverage, coverage(off))]
#![expect(clippy::doc_markdown)] // _FoodData_ false positive

use std::collections::BTreeSet;

use crate::tests::asserts::shadow_asserts::assert_eq;
use crate::tests::asserts::*;

use crate::tests::{
    embedded::variants::{
        CHOCOLATE_LABEL_FIXTURES, get_embedded_or_variant_comp_by_name, get_embedded_or_variant_spec_by_name,
    },
    util::relative_error_percent,
};

use super::util::{EXACT_MATCH, LabelRounding, Proximates, reconcile_proximates};
use crate::{
    composition::{CompKey, Composition, ToComposition},
    constants::{
        composition::{
            cocoa::STD_WATER_IN_COCOA_POWDER,
            dairy::{STD_BUTTERFAT_IN_WHOLE_MILK_POWDER, milk::STD_LACTOSE_IN_MSNF},
        },
        tolerances::COMPOSITION_EPSILON,
    },
    data::{get_all_spec_entries, get_spec_entry_by_name},
    specs::{
        CarbohydrateAmount, ChocolateFat, ChocolateKind, ChocolateLabelSpec, ChocolateSpec, CocoaPowderSpec,
        DeclaredSolids, IngredientSpec, LabelCarbohydrates, SpecEntry, TaggedSpec,
        estimate_chocolate_snf_split_from_protein_by_fiber, units::Unit,
    },
    util::round_to_decimals,
    validate::{are_equal, is_within_range},
};

#[cfg(doc)]
use crate::constants::composition::{cocoa, dairy::milk};

/// Measured proximates of each embedded `USDA …` entry, from its FoodData Central listing, with
/// the ceilings for its entry and for its `… (Label)` variant.
const USDA_LISTINGS: &[(&str, Proximates, Proximates, Proximates)] = &[
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
        CHOCOLATE_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/167587/nutrients
    (
        "USDA Milk Chocolate",
        Proximates {
            water: 1.5,
            protein: 7.65,
            fat: 29.7,
            carbohydrate: 59.4,
            fiber: 3.4,
            sugars: 51.5,
            ash: 1.78,
        },
        MILK_CHOCOLATE_CEILING,
        MILK_CHOCOLATE_LABEL_CEILING,
    ),
    // https://fdc.nal.usda.gov/food-details/167571/nutrients
    //
    // Sugars here are calculated by USDA from other nutrients, not analytical
    (
        "USDA White Chocolate",
        Proximates {
            water: 1.3,
            protein: 5.87,
            fat: 32.1,
            carbohydrate: 59.2,
            fiber: 0.2,
            sugars: 59.0,
            ash: 1.5,
        },
        MILK_CHOCOLATE_CEILING,
        WHITE_CHOCOLATE_LABEL_CEILING,
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
        COCOA_LABEL_CEILING,
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
        COCOA_LABEL_CEILING,
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
        COCOA_LABEL_CEILING,
    ),
];

/// Encodes a full miss, typically for an unmodeled field
const FULL_MISS: f64 = 100.0;

/// Per-field ceilings on relative error against the measured value, in percent — dark chocolates.
///
/// Fat and sugars are transcribed from the listing rather than predicted, so both must match
/// exactly. [`ChocolateSpec`](crate::specs::ChocolateSpec) has no water field, so water reads as a
/// full miss, a ceiling that records the gap rather than tolerates drift. That same water stays
/// inside `cocoa_solids` and inflates the cocoa SNF, while the sugars intrinsic to cocoa deflate
/// them by leaving with the declared `sugars` ([`cocoa::STD_SUGARS_IN_COCOA_SNF`]); the rest
/// bound that net overstatement plus the scatter of each constant, fiber being the loosest.
///
/// The `… (Label)` variants model the same compositions, a dark chocolate label's cocoa solids
/// being `100 - sugars` too, with its protein and fiber left to the standard fractions.
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
/// [`estimate_chocolate_snf_split_from_protein_by_fiber`], and transcribes its fat. So fat matches
/// exactly, and protein, fiber, and sugars match within the entry's one-decimal rounding, which at
/// white's 0.2 g of fiber is 8.9% of it. Water reads as a full miss, as for the dark chocolates.
///
/// Ash is the loosest: white's entry gets nearly all its ash from its milk solids, at
/// [`milk::STD_MINERALS_IN_MSNF`], which falls about 16% short of what its listing reports.
const MILK_CHOCOLATE_CEILING: Proximates = Proximates {
    water: FULL_MISS,
    protein: 0.4,
    fat: EXACT_MATCH,
    carbohydrate: 3.0,
    fiber: 9.0,
    sugars: 0.1,
    ash: 16.0,
};

/// Per-field ceilings on relative error against the measured value, in percent — milk label.
///
/// The `… (Label)` variant splits its listing as the entry does, without rounding, so its fat,
/// protein, fiber, and sugars match exactly. Water reads as a full miss, as for the entries.
const MILK_CHOCOLATE_LABEL_CEILING: Proximates = Proximates {
    water: FULL_MISS,
    protein: EXACT_MATCH,
    fat: EXACT_MATCH,
    carbohydrate: 3.0,
    fiber: EXACT_MATCH,
    sugars: EXACT_MATCH,
    ash: 5.0,
};

/// Per-field ceilings on relative error against the measured value, in percent — white label.
///
/// As for milk's, but without cocoa solids non-fat, the listing's 0.2 g of fiber stays in the other
/// solids, reading as a full miss. Ash is the loosest of the rest: nearly all of it comes from the
/// milk solids, at [`milk::STD_MINERALS_IN_MSNF`], which falls 16.5% short of the listing.
const WHITE_CHOCOLATE_LABEL_CEILING: Proximates = Proximates {
    water: FULL_MISS,
    protein: EXACT_MATCH,
    fat: EXACT_MATCH,
    carbohydrate: 0.5,
    fiber: FULL_MISS,
    sugars: EXACT_MATCH,
    ash: 17.0,
};

/// Per-field ceilings on relative error against the measured value, in percent — cocoa powders.
///
/// [`CocoaPowderSpec`](crate::specs::CocoaPowderSpec) has no sugars field, so each listing's sugars
/// read as a full miss; that mass stays inside the modeled cocoa solids as carbohydrate, keeping
/// that row tight. Fat and water are transcribed, so both match exactly. Ash tracks alkalization
/// via [`cocoa::STD_ASH_IN_DUTCHED_COCOA_SNF`], missing only where a listing departs from it.
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

/// Per-field ceilings on relative error against the measured value, in percent — cocoa labels.
///
/// The `… (Label)` variants model their entries' compositions, but with the water at
/// [`STD_WATER_IN_COCOA_POWDER`], so the alkalized powder's misses its listing's 2.7%, and its
/// cocoa solids take up the difference.
const COCOA_LABEL_CEILING: Proximates = Proximates {
    water: 10.5,
    carbohydrate: 3.5,
    ..COCOA_CEILING
};

/// Rounds a derived field to the one decimal its entry is written with.
///
/// Each derivation rounds as it goes, so later fields build on the values the entry shows.
fn round_1dp(value: f64) -> f64 {
    round_to_decimals(value, 1)
}

#[test]
fn usda_chocolate_and_cocoa_reconcile() {
    let listings: Vec<(String, Proximates, Proximates)> = USDA_LISTINGS
        .iter()
        .flat_map(|&(name, measured, ceiling, label_ceiling)| {
            [
                (name.to_string(), measured, ceiling),
                (format!("{name} (Label)"), measured, label_ceiling),
            ]
        })
        .collect();

    let lines = reconcile_proximates(&listings);
    insta::assert_snapshot!(lines.join("\n"));
}

/// Each USDA listing's `… (Label)` variant is the listing as a 100 g label, with the listing's
/// carbohydrate as the total.
#[test]
#[allow(clippy::float_cmp)] // Both transcribe the same listed values, so they're exactly equal
fn usda_chocolate_labels_transcribe_their_listings() {
    for (name, listing, ..) in USDA_LISTINGS {
        let label_name = format!("{name} (Label)");
        let TaggedSpec::ChocolateLabelSpec(label) = get_embedded_or_variant_spec_by_name(&label_name).spec else {
            panic!("{label_name} is not a ChocolateLabelSpec");
        };

        assert_eq!(label.serving_size, Unit::Grams(100.0), "{label_name}");
        assert_eq!(label.total_fat, listing.fat, "{label_name}");
        assert_eq!(label.protein, listing.protein, "{label_name}");
        assert_eq!(
            label.carbohydrates,
            LabelCarbohydrates {
                amount: CarbohydrateAmount::Total(listing.carbohydrate),
                fiber: Some(listing.fiber),
                sugars: listing.sugars,
            },
            "{label_name}"
        );
    }
}

/// Derives a USDA dark chocolate entry from its listing, as its prose describes: `total_fat` and
/// `sugars` from the listing, and `cocoa_solids` as `100 - sugars`.
fn derive_usda_dark_chocolate(listing: &Proximates) -> ChocolateSpec {
    ChocolateSpec {
        cocoa_solids: round_1dp(100.0 - listing.sugars),
        milk_solids: None,
        fat: Some(ChocolateFat::Total(listing.fat)),
        sugars: Some(listing.sugars),
        other_solids: None,
    }
}

/// Derives a USDA milk or white chocolate entry from its listing, as its prose describes.
fn derive_usda_milk_chocolate(listing: &Proximates) -> ChocolateSpec {
    let (cocoa_snf, msnf) = estimate_chocolate_snf_split_from_protein_by_fiber(listing.protein, listing.fiber);
    let milk_solids = round_1dp(msnf / (1.0 - STD_BUTTERFAT_IN_WHOLE_MILK_POWDER));
    let milk_fat = milk_solids * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER;
    let cocoa_solids = round_1dp(listing.fat - milk_fat + cocoa_snf);
    let sugars = round_1dp(listing.sugars - (milk_solids - milk_fat) * STD_LACTOSE_IN_MSNF);

    ChocolateSpec {
        cocoa_solids,
        milk_solids: Some(milk_solids),
        fat: Some(ChocolateFat::Total(listing.fat)),
        sugars: Some(sugars),
        other_solids: Some(round_1dp(100.0 - cocoa_solids - milk_solids - sugars)),
    }
}

/// Each USDA chocolate entry is exactly what its prose derives from its listing.
#[test]
fn usda_chocolate_entries_follow_their_derivation() {
    let mut checked = 0;

    for (name, listing, ..) in USDA_LISTINGS {
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

/// Ceilings on how far a label entry's figures may miss what its label prints
///
/// As relative errors against the printed figures, in percent, for figures that don't round to
/// them; see [`LabelRounding`]. A printed zero has no relative error, so it must round exactly.
#[derive(Copy, Clone, Debug)]
struct FigureCeilings {
    fat: f64,
    carbohydrate: f64,
    fiber: f64,
    sugars: f64,
    protein: f64,
}

/// No ceilings, for an entry whose figures all round to what its label prints.
const AS_PRINTED: FigureCeilings = FigureCeilings {
    fat: 0.0,
    carbohydrate: 0.0,
    fiber: 0.0,
    sugars: 0.0,
    protein: 0.0,
};

/// Each embedded [`ChocolateLabelSpec`] entry, with the rounding its label follows and the ceilings
/// its figures need; see [`LabelRounding`].
///
/// Fat and sugars are transcribed, or scaled within their rounding, and the milk and white labels
/// split their protein, so those round to what the labels print. The dark chocolates and cocoa
/// powders instead take their protein, fiber, and carbohydrate from the [`cocoa`] fractions of
/// their cocoa solids non-fat:
///
/// - Lindt's dark labels put 30-33% protein in the cocoa solids non-fat, against
///   [`cocoa::STD_PROTEIN_IN_COCOA_SNF`]'s 23.5%, and correspondingly less carbohydrate, so
///   their protein reads up to 29.5% low and their carbohydrate up to 20.2% high. The 95% and
///   100% put 44% and 35% fiber in it, against [`cocoa::STD_FIBER_IN_COCOA_SNF`]'s 37.8%.
/// - Purest's figures account for only 9.5 g of its 12 g serving, leaving more than its water and
///   ash take, so its carbohydrate reads 16.4% high.
/// - Green & Black's Milk's cocoa solids minimum raises its cocoa solids non-fat past what its
///   fiber gives, so its fiber and carbohydrate read high.
/// - Cadbury's UK actual milk solids carry all but 0.92 g of its protein, which leaves less cocoa
///   solids non-fat than its fiber gives, so its fiber reads 29.7% low.
/// - Cadbury's Canadian carbohydrate is just its sugars and fiber, leaving none for the cocoa's
///   other carbohydrate, so it reads 2.2% high.
const LABEL_ENTRIES: &[(&str, LabelRounding, FigureCeilings)] = &[
    (
        "Lindt EXCELLENCE 70% Cacao Dark Chocolate",
        LabelRounding::Canada,
        FigureCeilings {
            carbohydrate: 7.0,
            protein: 30.0,
            ..AS_PRINTED
        },
    ),
    (
        "Lindt EXCELLENCE 85% Cacao Dark Chocolate",
        LabelRounding::Canada,
        FigureCeilings {
            carbohydrate: 13.5,
            protein: 25.0,
            ..AS_PRINTED
        },
    ),
    (
        "Lindt EXCELLENCE 95% Cacao Dark Chocolate",
        LabelRounding::Canada,
        FigureCeilings {
            carbohydrate: 20.5,
            fiber: 14.0,
            protein: 25.0,
            ..AS_PRINTED
        },
    ),
    (
        "Lindt EXCELLENCE 100% Cacao Dark Chocolate",
        LabelRounding::Canada,
        FigureCeilings {
            carbohydrate: 13.5,
            fiber: 9.0,
            protein: 23.0,
            ..AS_PRINTED
        },
    ),
    ("Lindt Classic Milk Chocolate", LabelRounding::EU, AS_PRINTED),
    ("Lindt Classic White Chocolate", LabelRounding::Canada, AS_PRINTED),
    (
        "Green & Black's Organic Milk Chocolate",
        LabelRounding::EU,
        FigureCeilings {
            carbohydrate: 1.5,
            fiber: 13.0,
            ..AS_PRINTED
        },
    ),
    ("Green & Black's Organic White Chocolate", LabelRounding::EU, AS_PRINTED),
    (
        "Cadbury Dairy Milk Chocolate (UK)",
        LabelRounding::EU,
        FigureCeilings {
            fiber: 30.0,
            ..AS_PRINTED
        },
    ),
    (
        "Cadbury Dairy Milk Chocolate (Canada)",
        LabelRounding::Canada,
        FigureCeilings {
            carbohydrate: 2.5,
            ..AS_PRINTED
        },
    ),
    ("Ghirardelli 100% Unsweetened Cocoa Powder", LabelRounding::US, AS_PRINTED),
    ("Baker's Unsweetened Chocolate", LabelRounding::Canada, AS_PRINTED),
    ("Hershey's 100% Natural Unsweetened Cocoa Powder", LabelRounding::Canada, AS_PRINTED),
    (
        "Purest Natural Cocoa Powder",
        LabelRounding::Canada,
        FigureCeilings {
            carbohydrate: 16.5,
            ..AS_PRINTED
        },
    ),
];

/// Each [`LABEL_ENTRIES`] entry composes to what its label prints, each figure rounding to it or
/// within its ceiling; the snapshot tables each figure per serving.
#[test]
#[allow(clippy::float_cmp)] // Rounding lands a figure on its label's own increments
fn chocolate_labels_reproduce_their_printed_figures() {
    let embedded_labels: BTreeSet<String> = get_all_spec_entries()
        .into_iter()
        .filter_map(|entry| match entry {
            SpecEntry::Ingredient(IngredientSpec {
                name,
                spec: TaggedSpec::ChocolateLabelSpec(_),
                ..
            }) => Some(name),
            _ => None,
        })
        .collect();
    let listed_labels: BTreeSet<String> = LABEL_ENTRIES.iter().map(|&(name, ..)| name.to_string()).collect();
    assert_eq!(listed_labels.len(), LABEL_ENTRIES.len(), "a label entry is listed twice");
    assert_eq!(listed_labels, embedded_labels, "the listed label entries differ from the embedded ones");

    let mut lines = Vec::new();

    for &(name, rounding, ceilings) in LABEL_ENTRIES {
        let TaggedSpec::ChocolateLabelSpec(label) = get_embedded_or_variant_spec_by_name(name).spec else {
            panic!("{name} is not a ChocolateLabelSpec");
        };
        let Unit::Grams(serving) = label.serving_size else {
            panic!("{name}'s serving is not in grams");
        };
        assert_false!(matches!(rounding, LabelRounding::EU) && serving != 100.0, "{}: EU rounding is per 100 g", name);

        let comp = get_embedded_or_variant_comp_by_name(name);
        let per_serving = |key| comp.get(key) * serving / 100.0;
        let (fat, fiber, sugars, protein) = (
            per_serving(CompKey::TotalFats),
            per_serving(CompKey::TotalFiber),
            per_serving(CompKey::TotalSugars),
            per_serving(CompKey::TotalProteins),
        );

        let LabelCarbohydrates { amount, .. } = label.carbohydrates;
        let carbohydrate = match amount {
            CarbohydrateAmount::Total(_) => per_serving(CompKey::TotalCarbohydrates),
            CarbohydrateAmount::Available(_) => per_serving(CompKey::TotalCarbohydrates) - fiber,
        };

        let figures = [
            ("fat", Some(label.total_fat), fat, rounding.fat(fat), ceilings.fat),
            (
                "carbohydrate",
                Some(amount.printed()),
                carbohydrate,
                rounding.carbohydrate(carbohydrate),
                ceilings.carbohydrate,
            ),
            ("fiber", label.carbohydrates.fiber, fiber, rounding.carbohydrate(fiber), ceilings.fiber),
            ("sugars", Some(label.carbohydrates.sugars), sugars, rounding.carbohydrate(sugars), ceilings.sugars),
            ("protein", Some(label.protein), protein, rounding.protein(protein), ceilings.protein),
        ];

        lines.push(format!("{name}, per {serving} g ({rounding:?})"));
        lines.push("  [    figure    | printed | modeled | rounded |  diff  | error ]".to_string());

        for (figure, printed, modeled, rounded, ceiling) in figures {
            let Some(printed) = printed else {
                lines.push(format!("  {figure:<16}{:>7}", "-"));
                continue;
            };
            let diff = modeled - printed;
            let row = format!("  {figure:<16}{printed:>7.2}   {modeled:>7.2}   {rounded:>7.2}   {diff:>+6.2}");

            if printed == 0.0 {
                lines.push(format!("{row}{:>10}", "-"));
                assert!(
                    rounded == printed,
                    "{name}: {figure} of {modeled:.2} g prints as {rounded:.2}, not the label's 0"
                );
            } else {
                let error = relative_error_percent(modeled, printed);
                lines.push(format!("{row}   {error:>+6.1}%"));

                assert!(
                    rounded == printed || error.abs() <= ceiling,
                    "{name}: {figure} of {modeled:.2} g prints as {rounded:.2}, not the label's {printed:.2} \
                     ({diff:+.2} g, {error:+.2}%, ceiling {ceiling:.2}%)"
                );
            }
        }

        lines.push(String::new());
    }

    insta::assert_snapshot!(lines.join("\n"));
}

/// Each Cadbury label, an entry or one of the [`CHOCOLATE_LABEL_FIXTURES`], composes the fat and
/// sugars it prints, less half a gram per serving at most: those whose rounding leaves their parts
/// over 100 g scale into it, keeping no other solids. The snapshot tables each label's scale.
#[test]
fn cadbury_labels_scale_into_100_g_within_their_rounding() {
    let mut lines = vec![format!(
        "{:<50}{:>8}{:>8}{:>10}{:>8}{:>10}{:>8}{:>8}",
        "label, per serving", "serving", "fat", "composed", "sugars", "composed", "scale", "other"
    )];

    let entries = [
        "Cadbury Dairy Milk Chocolate (UK)",
        "Cadbury Dairy Milk Chocolate (Canada)",
    ];
    for name in entries.into_iter().chain(CHOCOLATE_LABEL_FIXTURES.iter().copied()) {
        let TaggedSpec::ChocolateLabelSpec(label) = get_embedded_or_variant_spec_by_name(name).spec else {
            panic!("{name} is not a ChocolateLabelSpec");
        };
        let Unit::Grams(serving) = label.serving_size else {
            panic!("{name}'s serving is not in grams");
        };

        let comp = get_embedded_or_variant_comp_by_name(name);
        let per_serving = |key| comp.get(key) * serving / 100.0;
        let (fat, sugars) = (per_serving(CompKey::TotalFats), per_serving(CompKey::TotalSugars));
        let (printed_fat, printed_sugars) = (label.total_fat, label.carbohydrates.sugars);
        let (scale, other) = (fat / printed_fat, comp.get(CompKey::OtherSNFS));

        for (figure, printed, composed) in [("fat", printed_fat, fat), ("sugars", printed_sugars, sugars)] {
            assert!(
                is_within_range(printed - composed, 0.0, 0.5),
                "{name}: composes {composed:.4} g of {figure} against the {printed} g it prints"
            );
        }
        if !are_equal(scale, 1.0) {
            assert_eq_flt!(other, 0.0, epsilon = COMPOSITION_EPSILON);
        }

        let figures = format!("{printed_fat:>8.2}{fat:>10.2}{printed_sugars:>8.2}{sugars:>10.2}");
        lines.push(format!("{name:<50}{serving:>8}{figures}{scale:>8.4}{other:>8.2}"));
    }

    insta::assert_snapshot!(lines.join("\n"));
}

/// Protein and fiber per 100 g of each Callebaut, Mona Lisa, and Valrhona entry with milk solids,
/// from the nutritional data of the specification sheet its prose links, which also declares its
/// milk solids. Belcolade Blanc Selection's is left out, its nutritional data disagreeing with its
/// declared solids: its protein comes to 33.5% of its MSNF, against 36% on its older sheet.
const SPEC_SHEETS: &[(&str, f64, f64)] = &[
    ("Callebaut 823 Milk Chocolate", 7.0, 2.1),
    ("Callebaut 665 Milk Chocolate", 8.1, 1.1),
    ("Callebaut Power 41 Milk Chocolate", 8.5, 4.1),
    ("Callebaut Arriba Milk Chocolate", 9.1, 2.8),
    ("Callebaut W2 White Chocolate", 6.0, 0.0),
    ("Mona Lisa Milk Chocolate Blossoms", 6.5, 2.7),
    ("Valrhona Ivoire 35% White Chocolate", 5.7, 0.0),
    ("Valrhona Opalys 33% White Chocolate", 8.2, 0.0),
    ("Valrhona Ariaga Blanche 30% White Chocolate", 7.2, 0.0),
];

/// Ceiling on the relative error of [`estimate_chocolate_snf_split_from_protein_by_fiber`]'s MSNF,
/// in percent, against the MSNF that each [`SPEC_SHEETS`] entry's declared milk solids give.
///
/// The estimate reads low on the Callebaut entries, as the sheets that list milk protein put it at
/// 35.5-36.9% of the MSNF, below [`milk::STD_PROTEIN_IN_MSNF`]. Like the rest of their nutritional
/// data, those figures are calculated from the vendor's reference values rather than measured. On
/// the Valrhona ones it reads just high, their protein coming to 37.7-38.0% of their MSNF.
const SHEET_MSNF_CEILING: f64 = 6.5;

/// [`estimate_chocolate_snf_split_from_protein_by_fiber`] recovers each [`SPEC_SHEETS`] entry's
/// MSNF from its sheet's protein and fiber; the snapshot tables each estimate and its error.
#[test]
fn estimate_chocolate_snf_split_from_protein_by_fiber_recovers_sheet_entries() {
    let mut lines = vec![format!(
        "{:<44}{:>9}{:>7}{:>8}{:>10}{:>9}",
        "entry", "protein", "fiber", "MSNF", "estimate", "error"
    )];

    for &(name, protein, fiber) in SPEC_SHEETS {
        let msnf = get_embedded_or_variant_comp_by_name(name).get(CompKey::MSNF);
        let (_, estimate) = estimate_chocolate_snf_split_from_protein_by_fiber(protein, fiber);
        let error = relative_error_percent(estimate, msnf);

        lines.push(format!("{name:<44}{protein:>9.1}{fiber:>7.1}{msnf:>8.2}{estimate:>10.2}{error:>+8.2}%"));

        assert!(
            error.abs() <= SHEET_MSNF_CEILING,
            "{name}: MSNF from protein is {error:+.2}% off the entry's {msnf:.2} \
             (estimated {estimate:.2}, ceiling {SHEET_MSNF_CEILING:.2}%)"
        );
    }

    insta::assert_snapshot!(lines.join("\n"));
}

/// Minimum cocoa and milk solids that each Callebaut, Mona Lisa, and Valrhona entry with a
/// `… (Label)` variant declares, on its product page or in its legal name, which the variant leaves
/// out; `(name, cocoa_solids, milk_solids)`
const LABEL_VARIANT_MINIMA: &[(&str, Option<f64>, Option<f64>)] = &[
    ("Callebaut 811 Dark Chocolate", Some(54.5), None),
    ("Callebaut 60-40-38 Dark Chocolate", Some(60.1), None),
    ("Callebaut 70-30-38 Dark Chocolate", Some(70.5), None),
    ("Callebaut 823 Milk Chocolate", Some(33.6), Some(20.8)),
    ("Callebaut 665 Milk Chocolate", Some(31.0), Some(25.1)),
    ("Callebaut Power 41 Milk Chocolate", Some(40.7), Some(19.4)),
    ("Callebaut Arriba Milk Chocolate", Some(39.0), Some(24.0)),
    ("Callebaut W2 White Chocolate", Some(28.0), Some(22.0)),
    ("Mona Lisa Dark Chocolate Curved Shavings", None, None),
    ("Mona Lisa Milk Chocolate Blossoms", Some(28.0), None),
    ("Valrhona Ivoire 35% White Chocolate", Some(35.0), None),
    ("Valrhona Opalys 33% White Chocolate", Some(33.0), None),
    ("Valrhona Ariaga Blanche 30% White Chocolate", Some(30.0), None),
    ("Callebaut Botanical Extra Brute Cocoa Powder", None, None),
    ("Callebaut Zestina Plein Arome Cocoa Powder", None, None),
    ("Callebaut 10/12 Natural Cocoa Powder", None, None),
];

/// Ceilings on each solid's relative error, in percent, when a [`LABEL_VARIANT_MINIMA`] variant
/// declares nothing, its minima, or its sheet's actual solids, against its entry.
///
/// The milk fat, at [`STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`] of the milk solids, misses widest
/// however the solids are declared: the sheets' milk solids carry 20-30% milk fat, so the milk fat
/// misses by up to 36%, and the cocoa butter by the same grams the other way. The cocoa solids
/// non-fat, the cocoa solids less the cocoa butter, take on the errors of both, and in 665 come to
/// only 3.2 g, so they miss by up to 35%.
const DECLARED_SOLIDS_CEILINGS: &[(CompKey, f64)] = &[
    (CompKey::CocoaSolids, 5.5),
    (CompKey::CocoaButter, 5.5),
    (CompKey::CocoaSNF, 35.5),
    (CompKey::MilkSolids, 6.5),
    (CompKey::MilkFat, 36.5),
];

/// The declarations a [`LABEL_VARIANT_MINIMA`] variant of `kind` is composed with, as its kind
/// takes them: none, its minima if it has any, or its `entry`'s actual cocoa and milk solids;
/// `(case, cocoa_solids, milk_solids)`
fn declared_solids_cases(
    kind: ChocolateKind,
    min_cocoa: Option<f64>,
    min_milk: Option<f64>,
    entry: &Composition,
) -> Vec<(&'static str, Option<DeclaredSolids>, Option<DeclaredSolids>)> {
    let cocoa = Some(DeclaredSolids::Actual(entry.get(CompKey::CocoaSolids)));
    let milk = Some(DeclaredSolids::Actual(entry.get(CompKey::MilkSolids)));

    let mut cases = vec![("none", None, None)];
    if min_cocoa.is_some() || min_milk.is_some() {
        cases.push(("minima", min_cocoa.map(DeclaredSolids::Min), min_milk.map(DeclaredSolids::Min)));
    }
    match kind {
        ChocolateKind::DarkChocolate => cases.push(("actual cocoa", cocoa, None)),
        ChocolateKind::MilkChocolate | ChocolateKind::WhiteChocolate => cases.extend([
            ("actual cocoa", cocoa, None),
            ("actual milk", None, milk),
            ("actual both", cocoa, milk),
        ]),
        ChocolateKind::CocoaPowder => {}
    }
    cases
}

/// Each [`LABEL_VARIANT_MINIMA`] variant recovers its entry's solids and fat split within the
/// [`DECLARED_SOLIDS_CEILINGS`], declaring nothing, its minima, or its sheet's actual solids, as
/// its kind takes them; the snapshot tables each case's errors. A solid its entry lacks, such as a
/// dark chocolate's milk solids, must come out zero.
#[test]
fn sheet_labels_recover_their_entries_with_declared_solids() {
    let header = DECLARED_SOLIDS_CEILINGS
        .iter()
        .map(|(key, _)| {
            let key = format!("{key:?}");
            format!("{key:>16}")
        })
        .collect::<Vec<_>>()
        .concat();
    let mut lines = Vec::new();

    for &(name, min_cocoa, min_milk) in LABEL_VARIANT_MINIMA {
        let variant = format!("{name} (Label)");
        let TaggedSpec::ChocolateLabelSpec(label) = get_embedded_or_variant_spec_by_name(&variant).spec else {
            panic!("{variant} is not a ChocolateLabelSpec");
        };
        let entry = get_embedded_or_variant_comp_by_name(name);

        let values = DECLARED_SOLIDS_CEILINGS
            .iter()
            .map(|&(key, _)| format!("{:>16.2}", entry.get(key)))
            .collect::<Vec<_>>()
            .concat();
        lines.push(variant.clone());
        lines.push(format!("  {:<14}{header}", "case"));
        lines.push(format!("  {:<14}{values}", "entry (g)"));

        for (case, cocoa_solids, milk_solids) in declared_solids_cases(label.kind, min_cocoa, min_milk, &entry) {
            let comp = ChocolateLabelSpec {
                cocoa_solids,
                milk_solids,
                ..label
            }
            .to_composition()
            .unwrap_or_else(|e| panic!("{variant}, {case}: {e}"));

            let mut cells = Vec::new();
            for &(key, ceiling) in DECLARED_SOLIDS_CEILINGS {
                let (expected, modeled) = (entry.get(key), comp.get(key));

                if expected == 0.0 {
                    assert!(eq_flt(modeled, 0.0), "{variant}, {case}: {key:?} is {modeled:?} where the entry has none");
                    cells.push(format!("{:>16}", "-"));
                } else {
                    let error = relative_error_percent(modeled, expected);
                    let cell = format!("{:+.2} ({error:+.1}%)", modeled - expected);
                    cells.push(format!("{cell:>16}"));

                    assert!(
                        error.abs() <= ceiling,
                        "{variant}, {case}: {key:?} is {error:+.2}% off the entry's {expected:.2} \
                         (modeled {modeled:.2}, ceiling {ceiling:.2}%)"
                    );
                }
            }
            lines.push(format!("  {case:<14}{}", cells.concat()));
        }

        lines.push(String::new());
    }

    insta::assert_snapshot!(lines.join("\n"));
}

/// Each [`LABEL_VARIANT_MINIMA`] milk and white chocolate variant composes its label's protein to
/// within rounding, as [`ChocolateLabelSpec`] requires, in each of its [`declared_solids_cases`];
/// the snapshot tables each case's composed protein against the label's.
#[test]
fn sheet_labels_compose_their_protein_with_declared_solids() {
    let mut lines = Vec::new();

    for &(name, min_cocoa, min_milk) in LABEL_VARIANT_MINIMA {
        let variant = format!("{name} (Label)");
        let TaggedSpec::ChocolateLabelSpec(label) = get_embedded_or_variant_spec_by_name(&variant).spec else {
            panic!("{variant} is not a ChocolateLabelSpec");
        };
        if !matches!(label.kind, ChocolateKind::MilkChocolate | ChocolateKind::WhiteChocolate) {
            continue;
        }
        let Unit::Grams(serving) = label.serving_size else {
            panic!("{variant}'s serving is not in grams");
        };
        let protein = label.protein * 100.0 / serving;
        let entry = get_embedded_or_variant_comp_by_name(name);

        lines.push(format!("{variant}, {protein:.2} g of protein per 100 g"));
        lines.push(format!("  {:<14}{:>10}{:>16}", "case", "composed", "diff"));

        for (case, cocoa_solids, milk_solids) in declared_solids_cases(label.kind, min_cocoa, min_milk, &entry) {
            let comp = ChocolateLabelSpec {
                cocoa_solids,
                milk_solids,
                ..label
            }
            .to_composition()
            .unwrap_or_else(|e| panic!("{variant}, {case}: {e}"));

            let composed = comp.get(CompKey::TotalProteins);
            let error = relative_error_percent(composed, protein);
            let diff = format!("{:+.2} ({error:+.1}%)", composed - protein);
            lines.push(format!("  {case:<14}{composed:>10.2}{diff:>16}"));
        }

        lines.push(String::new());
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
    let mut lines = vec![format!("{:<72}{:>6}{:>9}{:>9}", "entry", "water", "default", "error")];

    for &name in SOURCED_COCOA_WATER {
        let TaggedSpec::CocoaPowderSpec(CocoaPowderSpec { water: Some(water), .. }) =
            get_embedded_or_variant_spec_by_name(name).spec
        else {
            panic!("{name} is not a CocoaPowderSpec with its water");
        };

        let error = relative_error_percent(default, water);

        lines.push(format!("{name:<72}{water:>6.2}{default:>9.2}{error:>+8.2}%"));

        assert!(
            error.abs() <= COCOA_WATER_CEILING,
            "{name}: default water is {error:+.2}% off the entry's {water:.2} \
             (default {default:.2}, ceiling {COCOA_WATER_CEILING:.2}%)"
        );
    }

    insta::assert_snapshot!(lines.join("\n"));
}
