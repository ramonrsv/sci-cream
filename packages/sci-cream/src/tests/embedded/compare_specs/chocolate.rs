//! Cross-source consistency checks for chocolate ingredients — dark chocolates and cocoa powder —
//! comparing each Simple/default entry against Lindt and Ghirardelli label references.

#![cfg_attr(coverage, coverage(off))]

use crate::composition::CompKey;
use crate::tests::util::{KeyCeiling, assert_compositions_consistent, compare_compositions, source_str_to_comp};

/// Composition keys compared when cross-checking chocolate ingredient data sources.
///
/// These keys carry meaningful, generally non-zero values for chocolate-based ingredients. Keys
/// irrelevant to chocolate (milk, nut, egg, and other non-cocoa components) are excluded so
/// that comparisons stay focused on values a reader would expect to differ between sources.
///
/// **Energy:** as `kcal/g of solids × 100` it lands in `[400, 900]` vs `[0, 100]` for mass
/// components, so the same fractional precision error shows up 4–9× larger. Energy ceiling
/// overrides are common as a result; 20–45 pp is typical, past ~60 pp likely flags a real
/// solids energy density disagreement.
const COMPARABLE_CHOCOLATE_KEYS: &[CompKey] = &[
    CompKey::Energy,
    CompKey::TotalFats,
    CompKey::CacaoSolids,
    CompKey::CocoaButter,
    CompKey::CocoaSolids,
    CompKey::TotalFiber,
    CompKey::TotalSugars,
    CompKey::TotalCarbohydrates,
    CompKey::OtherSNFS,
    CompKey::TotalSNFS,
    CompKey::TotalProteins,
    CompKey::TotalSolids,
    CompKey::Water,
    CompKey::POD,
    CompKey::PACsgr,
    CompKey::HF,
    CompKey::TotalPAC,
    CompKey::SaturatedFat,
    CompKey::TransFat,
];

#[test]
fn compare_specs_chocolate_65() {
    let sources = [
        ("Simple", "65% Dark Chocolate"),
        ("USDA", "USDA Dark Chocolate, 60-69% Cacao Solids"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(3.0).with(CompKey::Energy, 12.0).with(CompKey::HF, 4.5);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_70() {
    let sources = [
        ("Simple", "70% Dark Chocolate"),
        ("Lindt", "Lindt EXCELLENCE 70% Cacao Dark Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(1.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_85() {
    let sources = [
        ("Simple", "85% Dark Chocolate"),
        ("Lindt", "Lindt EXCELLENCE 85% Cacao Dark Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(4.0).with(CompKey::Energy, 24.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_95() {
    let sources = [
        ("Simple", "95% Dark Chocolate"),
        ("Lindt", "Lindt EXCELLENCE 95% Cacao Dark Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(4.0)
        .with(CompKey::TotalCarbohydrates, 5.0)
        .with(CompKey::Energy, 24.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_100() {
    let sources = [
        ("Simple", "100% Dark Chocolate"),
        ("Lindt", "Lindt EXCELLENCE 100% Cacao Dark Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(4.0).with(CompKey::Energy, 21.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_cocoa_powder_13_fat() {
    let sources = [
        ("Simple", "Cocoa Powder, 13% Fat"),
        ("USDA", "USDA Unsweetened Cocoa Powder"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(1.0).with(CompKey::Energy, 5.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_cocoa_powder_17_fat() {
    let sources = [
        ("Simple", "Cocoa Powder, 17% Fat"),
        ("Ghirardelli", "Ghirardelli 100% Unsweetened Cocoa Powder"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(1.0).with(CompKey::Energy, 3.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}
