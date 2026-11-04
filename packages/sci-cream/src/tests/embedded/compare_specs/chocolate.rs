//! Cross-source consistency checks for chocolate ingredients, spanning dark, milk, white and
//! cocoa powder, lining up each entry against labelled references from other sources.

#![cfg_attr(coverage, coverage(off))]

use crate::tests::util::{KeyCeiling, assert_compositions_consistent, compare_compositions, source_str_to_comp};

use crate::composition::CompKey;

/// Composition keys compared when cross-checking chocolate ingredient data sources.
///
/// These keys carry meaningful, generally non-zero values for chocolate-based ingredients. Keys
/// irrelevant to chocolate (nut, egg, and other non-cocoa components) are excluded so that
/// comparisons stay focused on values a reader would expect to differ between sources. One list
/// spans the whole category — dark, milk, white and cocoa powder. The milk components read zero on
/// both sides of a cocoa-only pairing.
const COMPARABLE_CHOCOLATE_KEYS: &[CompKey] = &[
    CompKey::Energy,
    CompKey::TotalFats,
    CompKey::CacaoSolids,
    CompKey::CocoaButter,
    CompKey::CocoaSolids,
    CompKey::MilkFat,
    CompKey::MilkSolids,
    CompKey::MSNF,
    CompKey::MilkSNFS,
    CompKey::MilkProteins,
    CompKey::Lactose,
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
    CompKey::PACmlk,
    CompKey::HF,
    CompKey::TotalPAC,
    CompKey::SaturatedFat,
    CompKey::TransFat,
];

#[test]
fn compare_specs_chocolate_50() {
    let sources = [
        ("Simple", "50% Dark Chocolate"),
        ("USDA", "USDA Dark Chocolate, 45-59% Cacao Solids"),
        ("Mona Lisa", "Mona Lisa Dark Chocolate Curved Shavings"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(3.0).with(CompKey::Energy, 3.5).with(CompKey::HF, 4.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_55() {
    let sources = [
        ("Simple", "55% Dark Chocolate"),
        ("Corvitto", "Corvitto 55% Dark Chocolate"),
        ("Callebaut", "Callebaut 811 Dark Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(5.5).with(CompKey::Energy, 6.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_60() {
    let sources = [
        ("Simple", "60% Dark Chocolate"),
        ("Corvitto", "Corvitto 60% Dark Chocolate"),
        ("Callebaut 2815", "Callebaut 2815 Dark Chocolate"),
        ("Callebaut 60-40-38", "Callebaut 60-40-38 Dark Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(5.5).with(CompKey::Energy, 6.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_65() {
    let sources = [
        ("Simple", "65% Dark Chocolate"),
        ("Corvitto", "Corvitto 65% Dark Chocolate"),
        ("USDA", "USDA Dark Chocolate, 60-69% Cacao Solids"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(3.0).with(CompKey::Energy, 4.5).with(CompKey::HF, 4.5);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_70() {
    let sources = [
        ("Simple", "70% Dark Chocolate"),
        ("Corvitto", "Corvitto 70% Dark Chocolate"),
        ("Lindt", "Lindt EXCELLENCE 70% Cacao Dark Chocolate"),
        ("Callebaut", "Callebaut 70-30-38 Dark Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(4.5)
        .with(CompKey::Energy, 7.5)
        .with(CompKey::CocoaSolids, 6.5)
        .with(CompKey::TotalSNFS, 8.0)
        .with(CompKey::HF, 8.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_chocolate_75() {
    let sources = [
        ("Simple", "75% Dark Chocolate"),
        ("USDA", "USDA Dark Chocolate, 70-85% Cacao Solids"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(2.0);

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

    let ceiling = KeyCeiling::new(3.5).with(CompKey::Energy, 5.0);

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

    let ceiling = KeyCeiling::new(3.5).with(CompKey::TotalCarbohydrates, 4.5);

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

    let ceiling = KeyCeiling::new(3.5).with(CompKey::Energy, 4.5);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_milk_chocolate_30() {
    let sources = [
        ("USDA", "USDA Milk Chocolate"),
        ("Mona Lisa", "Mona Lisa Milk Chocolate Blossoms"),
    ]
    .map(source_str_to_comp);

    // USDA carries markedly less sugar than the Callebaut-made blossoms, driving the largest gaps.
    let ceiling = KeyCeiling::new(9.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_milk_chocolate_35() {
    let sources = [
        ("Callebaut 823", "Callebaut 823 Milk Chocolate"),
        ("Callebaut 665", "Callebaut 665 Milk Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(5.5);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_milk_chocolate_40() {
    let sources = [
        ("Corvitto", "Corvitto 40% Milk Chocolate"),
        ("Callebaut Power 41", "Callebaut Power 41 Milk Chocolate"),
        ("Callebaut Arriba", "Callebaut Arriba Milk Chocolate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(5.5).with(CompKey::HF, 6.5).with(CompKey::Energy, 6.5);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_white_chocolate() {
    let sources = [
        ("Corvitto", "Corvitto White Chocolate"),
        ("USDA", "USDA White Chocolate"),
        ("Callebaut", "Callebaut W2 White Chocolate"),
    ]
    .map(source_str_to_comp);

    // Corvitto's idealized 40% fat, 40% sugar, and 30% milk solids sit furthest from USDA's lower
    // fat and milk solids and higher sugar, past the default for energy, milk solids, and POD.
    let ceiling = KeyCeiling::new(8.5)
        .with_source("Corvitto", CompKey::Energy, 9.0)
        .with_source("Corvitto", CompKey::MilkSolids, 9.5)
        .with_source("Corvitto", CompKey::POD, 10.5);

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

    let ceiling = KeyCeiling::new(1.0);

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

    let ceiling = KeyCeiling::new(0.5);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_cocoa_powder_10_12_fat() {
    let sources = [
        ("Simple", "Cocoa Powder, 10/12% Fat"),
        ("Corvitto", "Corvitto Cocoa Powder, 10/12% Fat"),
        ("Callebaut", "Callebaut 10/12 Natural Cocoa Powder"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(1.0)
        .with(CompKey::TotalSolids, 4.0)
        .with(CompKey::Water, 4.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_cocoa_powder_20_22_fat() {
    let sources = [
        ("Simple", "Cocoa Powder, 20/22% Fat"),
        ("Valrhona", "Valrhona Unsweetened Cocoa Powder"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(4.5).with(CompKey::HF, 7.5);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}

#[test]
fn compare_specs_cocoa_powder_22_24_fat() {
    let sources = [
        ("Simple", "Cocoa Powder, 22/24% Fat"),
        ("Corvitto", "Corvitto Cocoa Powder, 22/24% Fat"),
        ("Callebaut Plein Arome", "Callebaut Zestina Plein Arome Cocoa Powder"),
        ("Callebaut Extra Brute", "Callebaut Botanical Extra Brute Cocoa Powder"),
        ("USDA", "USDA Unsweetened Cocoa Powder, Processed with Alkali, High Fat"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(2.5)
        .with(CompKey::TotalCarbohydrates, 3.0)
        .with(CompKey::TotalSolids, 4.0)
        .with(CompKey::Water, 4.0);

    assert_compositions_consistent(&sources, COMPARABLE_CHOCOLATE_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_CHOCOLATE_KEYS));
}
