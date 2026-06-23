//! Cross-source consistency checks for egg ingredients — comparing the consolidated default egg
//! yolk against the Clarke, Goff & Hartel, and USDA label references it is built from.

#![cfg_attr(coverage, coverage(off))]

use crate::composition::CompKey;
use crate::tests::util::{KeyCeiling, assert_compositions_consistent, compare_compositions, source_str_to_comp};

/// Composition keys compared when cross-checking egg ingredient data sources.
///
/// These keys carry meaningful, generally non-zero values for egg-based ingredients. Keys
/// irrelevant to eggs (milk, cocoa, nut, sugar, and other non-egg components) are excluded so
/// that comparisons stay focused on values a reader would expect to differ between sources.
///
/// **Energy:** as `kcal/g of solids × 100` it lands in `[400, 900]` vs `[0, 100]` for mass
/// components, so the same fractional precision error shows up 4–9× larger. Energy ceiling
/// overrides are common as a result; 20–45 pp is typical, past ~60 pp likely flags a real
/// solids energy density disagreement.
const COMPARABLE_EGG_KEYS: &[CompKey] = &[
    CompKey::Energy,
    CompKey::EggFat,
    CompKey::EggProteins,
    CompKey::EggSNF,
    CompKey::EggSolids,
    CompKey::TotalSolids,
    CompKey::Water,
    CompKey::Lecithin,
    CompKey::SaturatedFat,
];

#[test]
fn compare_specs_egg_yolk() {
    let sources = [
        ("Consolidated", "Egg Yolk"),
        ("Clarke", "Clarke Egg Yolk"),
        ("Goff & Hartel", "Goff & Hartel Egg Yolk"),
        ("USDA", "USDA Raw Egg Yolk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(5.0).with(CompKey::Energy, 28.0);

    assert_compositions_consistent(&sources, COMPARABLE_EGG_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_EGG_KEYS));
}
