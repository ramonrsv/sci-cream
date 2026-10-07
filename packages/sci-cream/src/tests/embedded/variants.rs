//! Test-only variants of embedded ingredients, for suites that check them against the originals.
//!
//! Each `variants/<category>.json` file holds ingredient specs named after the entries they vary,
//! which are seeded with the embedded data into a database of their own. Each entry's `comments`,
//! as in the generated data, link its listing and note anything particular to it.
//!
//! `dairy.json` has a [`DairyLabelSpec`] variant of each `USDA …` [`DairySheetSpec`] entry, named
//! `… (Label)`: its listing as a 100 g nutrition label would give it, without water or ash.

#![cfg_attr(coverage, coverage(off))]

use std::sync::LazyLock;

use crate::tests::asserts::shadow_asserts::assert_eq;
use crate::tests::asserts::*;

use crate::{
    composition::Composition,
    data::get_spec_entry_by_name,
    database::{IngredientDatabase, OnConflict},
    resolution::IngredientGetter,
    specs::{IngredientSpec, SpecEntry, TaggedSpec, units::Unit},
};

#[cfg(doc)]
use crate::specs::{DairyLabelSpec, DairySheetSpec};

/// Each variant file's name and contents.
const VARIANT_FILES: &[(&str, &str)] = &[("dairy.json", include_str!("variants/dairy.json"))];

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
static VARIANTS_DB: LazyLock<IngredientDatabase> = LazyLock::new(|| {
    let db = IngredientDatabase::new_seeded_from_embedded_data();
    let variants: Vec<SpecEntry> = VARIANT_SPECS.iter().cloned().map(SpecEntry::Ingredient).collect();
    db.seed_from_specs(&variants, OnConflict::Reject)
        .unwrap_or_else(|e| panic!("failed to seed the variant specs: {e}"));
    db
});

/// Resolve an embedded or variant ingredient's composition by name, panicking if it is absent.
pub(crate) fn get_comp_by_name(name: &str) -> Composition {
    VARIANTS_DB
        .get_ingredient_by_name(name)
        .unwrap_or_else(|e| panic!("missing ingredient '{name}': {e}"))
        .composition
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
        assert_eq_flt_test!(label.sugars, sheet.sugars.total());
        assert_eq!(label.sucrose.unwrap_or(0.0), sheet.sugars.sucrose);
        assert_eq!(label.protein, sheet.protein);
        assert_eq!(label.solids_source, sheet.solids_source);
    }
}
