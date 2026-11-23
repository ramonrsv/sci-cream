//! Test-only variants of embedded ingredients, for suites that check them against the originals,
//! and as spec test fixtures that the embedded entries don't hold.
//!
//! Each `variants/<category>.json` file holds ingredient specs named after the entries they vary,
//! which are seeded with the embedded data into a database of their own. Each entry's `comments`,
//! as in the generated data, link its listing and note anything particular to it.
//!
//! `dairy.json` has a [`DairyLabelSpec`] variant of each `USDA …` [`DairySheetSpec`] entry, named
//! `… (Label)`: its listing as a 100 g nutrition label would give it, without water or ash.
//!
//! `chocolates.json` has a [`ChocolateLabelSpec`] variant of each `USDA …` entry, named
//! `… (Label)`: its listing as a 100 g label would give it. It also has one of each Callebaut and
//! Mona Lisa entry with a specification sheet: the sheet's nutritional data as a 100 g label would
//! give it, without the solids it declares. Its [`CHOCOLATE_LABEL_FIXTURES`] are other labels,
//! which no entry holds.

#![cfg_attr(coverage, coverage(off))]

use std::sync::LazyLock;

use crate::tests::asserts::shadow_asserts::assert_eq;
use crate::tests::asserts::*;

use crate::{
    composition::Composition,
    data::get_spec_entry_by_name,
    database::{IngredientDatabase, OnConflict},
    resolution::IngredientGetter,
    specs::{ChocolateFat, IngredientSpec, SpecEntry, TaggedSpec, units::Unit},
};

#[cfg(doc)]
use crate::specs::{ChocolateLabelSpec, ChocolateSpec, CocoaPowderSpec, DairyLabelSpec, DairySheetSpec};

/// Each variant file's name and contents.
const VARIANT_FILES: &[(&str, &str)] = &[
    ("chocolates.json", include_str!("variants/chocolates.json")),
    ("dairy.json", include_str!("variants/dairy.json")),
];

/// The `chocolates.json` variants that are labels in their own right, not an entry's `… (Label)`:
/// the Cadbury Dairy Milk entries' in other sizes or declarations, and Cadbury Darkmilk's.
pub(crate) const CHOCOLATE_LABEL_FIXTURES: &[&str] = &[
    "Cadbury Dairy Milk Chocolate (UK, Minima)",
    "Cadbury Dairy Milk Chocolate (Canada, 42 g Bar)",
    "Cadbury Dairy Milk Chocolate (Canada, Mini Bars)",
    "Cadbury Darkmilk Chocolate",
];

/// The ingredient specs of every [`VARIANT_FILES`] entry.
static VARIANT_SPECS: LazyLock<Vec<IngredientSpec>> = LazyLock::new(|| {
    VARIANT_FILES
        .iter()
        .flat_map(|(file, json)| {
            serde_json::from_str::<Vec<IngredientSpec>>(json)
                .unwrap_or_else(|e| panic!("invalid variant specs in '{file}': {e}"))
        })
        .collect()
});

/// Database seeded once from the embedded data plus the [`VARIANT_SPECS`].
pub(crate) static VARIANTS_DB: LazyLock<IngredientDatabase> = LazyLock::new(|| {
    let db = IngredientDatabase::new_seeded_from_embedded_data();
    let variants: Vec<SpecEntry> = VARIANT_SPECS.iter().cloned().map(SpecEntry::Ingredient).collect();
    db.seed_from_specs(&variants, OnConflict::Reject)
        .unwrap_or_else(|e| panic!("failed to seed the variant specs: {e}"));
    db
});

/// Resolve an embedded or variant ingredient's composition by name, panicking if it is absent.
pub(crate) fn get_embedded_or_variant_comp_by_name(name: &str) -> Composition {
    VARIANTS_DB
        .get_ingredient_by_name(name)
        .unwrap_or_else(|e| panic!("missing ingredient '{name}': {e}"))
        .composition
}

/// Resolve an embedded or variant ingredient's spec by name, panicking if it is absent or an alias.
pub(crate) fn get_embedded_or_variant_spec_by_name(name: &str) -> IngredientSpec {
    if let Some(variant) = VARIANT_SPECS.iter().find(|variant| variant.name == name) {
        return variant.clone();
    }

    match get_spec_entry_by_name(name) {
        Ok(SpecEntry::Ingredient(spec)) => spec,
        _ => panic!("missing ingredient spec '{name}'"),
    }
}

/// Each [`DairyLabelSpec`] variant transcribes the listing of the [`DairySheetSpec`] it's named
/// after, so the values they share agree.
#[test]
#[allow(clippy::float_cmp)] // Both transcribe the same listed values, so they're exactly equal
fn dairy_label_variants_match_their_sheets() {
    for variant in VARIANT_SPECS.iter() {
        let TaggedSpec::DairyLabelSpec(label) = variant.spec else {
            continue;
        };
        let Some(name) = variant.name.strip_suffix(" (Label)") else {
            panic!("{} is a DairyLabelSpec variant not named '… (Label)'", variant.name);
        };
        let Ok(SpecEntry::Ingredient(IngredientSpec {
            spec: TaggedSpec::DairySheetSpec(sheet),
            ..
        })) = get_spec_entry_by_name(name)
        else {
            panic!("{name} is not an embedded DairySheetSpec");
        };

        assert_eq!(label.serving_size, Unit::Grams(100.0));
        assert_eq!(label.energy, sheet.energy);
        assert_eq!(label.total_fat, Unit::Grams(sheet.fat));
        assert_eq!(label.saturated_fat, sheet.saturated_fat);
        assert_eq_flt!(label.sugars, sheet.sugars.total());
        assert_eq!(label.sucrose.unwrap_or(0.0), sheet.sugars.sucrose);
        assert_eq!(label.protein, sheet.protein);
        assert_eq!(label.solids_source, sheet.solids_source);
    }
}

/// Each [`ChocolateLabelSpec`] variant but the [`CHOCOLATE_LABEL_FIXTURES`] transcribes the listing
/// or sheet of the [`ChocolateSpec`] or [`CocoaPowderSpec`] it's named after, so their fat agrees:
/// the entry's, split or not, adds up to the label's total.
#[test]
fn chocolate_label_variants_match_their_entries() {
    for variant in VARIANT_SPECS.iter() {
        let TaggedSpec::ChocolateLabelSpec(label) = variant.spec else {
            continue;
        };
        if CHOCOLATE_LABEL_FIXTURES.contains(&variant.name.as_str()) {
            continue;
        }
        let Some(name) = variant.name.strip_suffix(" (Label)") else {
            panic!("{} is a ChocolateLabelSpec variant not named '… (Label)'", variant.name);
        };
        let Ok(SpecEntry::Ingredient(entry)) = get_spec_entry_by_name(name) else {
            panic!("{name} is not an embedded ingredient");
        };
        let fat = match entry.spec {
            TaggedSpec::ChocolateSpec(spec) => match spec.fat {
                Some(ChocolateFat::Total(total)) => total,
                Some(ChocolateFat::Split { cocoa_butter, milk_fat }) => cocoa_butter + milk_fat,
                None => panic!("{name} has no fat to check its variant against"),
            },
            TaggedSpec::CocoaPowderSpec(spec) => spec.cocoa_butter,
            _ => panic!("{name} is not an embedded ChocolateSpec or CocoaPowderSpec"),
        };

        assert_eq!(label.serving_size, Unit::Grams(100.0));
        assert_eq_flt!(label.total_fat, fat);
    }
}
