//! Cross-source consistency checks for dairy ingredients — milk, ultrafiltered milk, protein
//! beverages, cream, evaporated and condensed milk, milk powders, milk protein concentrates, whey,
//! casein, and protein powders — comparing each Simple/default entry against USDA, USDEC, Sealtest,
//! Lactantia, Carnation, Goff & Hartel, Southward, and brand references. Each USDA listing is
//! compared both as its embedded sheet and as its test-only `… (Label)` variant.

#![cfg_attr(coverage, coverage(off))]
#![allow(clippy::unwrap_used)]

#[expect(unused_imports)]
use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
use crate::tests::asserts::*;

use crate::tests::{
    assets::get_comp_by_name,
    util::{KeyCeiling, assert_compositions_consistent, compare_compositions, is_alias_for, source_str_to_comp},
};

use crate::{
    balancing::{BalanceKey, balance_compositions, composition_balance_targets},
    composition::{CompKey, Composition, ToComposition},
    data::get_independent_ingredient_spec_by_name,
    specs::{DairySimpleSpec, IngredientSpec, TaggedSpec},
};

/// Composition keys compared when cross-checking dairy ingredient data sources.
///
/// These keys carry meaningful, generally non-zero values for milk-based ingredients. Keys
/// irrelevant to dairy (cocoa, nut, egg, and other non-milk components) are excluded so that
/// comparisons stay focused on values a reader would expect to differ between sources.
///
/// **Energy:** as `kcal/g of solids × 100` it lands in `[400, 900]` vs `[0, 100]` for mass
/// components, so the same fractional precision error shows up 4–9× larger. Energy ceiling
/// overrides are common as a result; 20–45 pp is typical, past ~60 pp likely flags a real
/// solids energy density disagreement.
const COMPARABLE_DAIRY_KEYS: &[CompKey] = &[
    CompKey::Energy,
    CompKey::MilkFat,
    CompKey::Lactose,
    CompKey::MSNF,
    CompKey::MilkSNFS,
    CompKey::MilkProteins,
    CompKey::MilkMinerals,
    CompKey::MilkSolids,
    CompKey::TotalSolids,
    CompKey::Water,
    CompKey::POD,
    CompKey::PACsgr,
    CompKey::PACmlk,
    CompKey::TotalPAC,
    CompKey::SaturatedFat,
    CompKey::TransFat,
];

/// [`COMPARABLE_DAIRY_KEYS`] for lactose-free dairy, with [`CompKey::MilkSugars`] in place of
/// [`CompKey::Lactose`], which is zero in every source.
const COMPARABLE_LACTOSE_FREE_DAIRY_KEYS: &[CompKey] = &[
    CompKey::Energy,
    CompKey::MilkFat,
    CompKey::MilkSugars,
    CompKey::MSNF,
    CompKey::MilkSNFS,
    CompKey::MilkProteins,
    CompKey::MilkMinerals,
    CompKey::MilkSolids,
    CompKey::TotalSolids,
    CompKey::Water,
    CompKey::POD,
    CompKey::PACsgr,
    CompKey::PACmlk,
    CompKey::TotalPAC,
    CompKey::SaturatedFat,
    CompKey::TransFat,
];

#[test]
fn compare_specs_skim_milk() {
    assert_true!(is_alias_for("Skim Milk", "0% Milk"));

    let sources = [
        ("Simple", "0% Milk"),
        ("Goff & Hartel", "Goff & Hartel Skim Milk"),
        ("USDA", "USDA Fat-Free (Skim) Milk"),
        ("USDA Label", "USDA Fat-Free (Skim) Milk (Label)"),
        ("Sealtest", "Sealtest 0% Skim Milk"),
        ("Lactantia", "Lactantia PurFiltre Skim Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with_source("Sealtest", CompKey::Energy, 30.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_1_milk() {
    let sources = [
        ("Simple", "1% Milk"),
        ("Sealtest", "Sealtest 1% Milk"),
        ("Lactantia", "Lactantia PurFiltre 1% Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with_source("Lactantia", CompKey::Energy, 27.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_2_milk() {
    let sources = [
        ("Simple", "2% Milk"),
        ("USDA", "USDA 2% Reduced-Fat Milk"),
        ("USDA Label", "USDA 2% Reduced-Fat Milk (Label)"),
        ("Sealtest", "Sealtest 2% Milk"),
        ("Lactantia", "Lactantia PurFiltre 2% Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0)
        .with_source("Sealtest", CompKey::Energy, 20.0)
        .with_source("Lactantia", CompKey::Energy, 21.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_whole_milk() {
    assert_true!(is_alias_for("Whole Milk", "3.25% Milk"));

    let sources = [
        ("Simple", "3.25% Milk"),
        ("Goff & Hartel", "Goff & Hartel 3% Milk"),
        ("USDA", "USDA Whole Milk"),
        ("USDA Label", "USDA Whole Milk (Label)"),
        ("Sealtest", "Sealtest 3.25% Milk"),
        ("Lactantia", "Lactantia PurFiltre 3.25% Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0)
        .with_source("Sealtest", CompKey::Energy, 18.0)
        .with_source("Lactantia", CompKey::Energy, 24.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_fairlife_skim_milk() {
    let sources = [
        ("Fairlife (US)", "Fairlife Fat Free Ultra-Filtered Lactose-Free Milk"),
        ("Fairlife (Canada)", "Fairlife Skim Ultrafiltered Lactose-Free Milk (Canada)"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with(CompKey::Energy, 25.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_fairlife_2_milk() {
    let sources = [
        ("Fairlife (US)", "Fairlife 2% Reduced Fat Ultra-Filtered Lactose-Free Milk"),
        ("Fairlife (Canada)", "Fairlife 2% Ultrafiltered Lactose-Free Milk (Canada)"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with(CompKey::Energy, 19.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_fairlife_whole_milk() {
    let sources = [
        ("Fairlife (US)", "Fairlife Whole Ultra-Filtered Lactose-Free Milk"),
        ("Fairlife (Canada)", "Fairlife Whole Ultrafiltered Lactose-Free Milk (Canada)"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with(CompKey::Energy, 15.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_ultrafiltered_milks_protein_to_sugars() {
    // Ultrafiltered milks carry 2.0-2.3 g of protein per gram of sugars, about three times plain
    // milk's, the largest ratio within 1.2 times the smallest. That's a market regularity, not a
    // standard, so a product outside it, like Chobani's 20 g to 6 g, isn't necessarily wrong. The
    // protein share of the solids non-fat follows from the ratio, so it's reported, not asserted.
    let sources = [
        ("Fairlife Fat Free (US)", "Fairlife Fat Free Ultra-Filtered Lactose-Free Milk"),
        ("Fairlife 2% (US)", "Fairlife 2% Reduced Fat Ultra-Filtered Lactose-Free Milk"),
        ("Fairlife Whole (US)", "Fairlife Whole Ultra-Filtered Lactose-Free Milk"),
        ("Fairlife Skim (Canada)", "Fairlife Skim Ultrafiltered Lactose-Free Milk (Canada)"),
        ("Fairlife 2% (Canada)", "Fairlife 2% Ultrafiltered Lactose-Free Milk (Canada)"),
        ("Fairlife Whole (Canada)", "Fairlife Whole Ultrafiltered Lactose-Free Milk (Canada)"),
        ("UltraPur 0%", "Lactantia UltraPur 0% Ultrafiltered Lactose-Free Milk"),
        ("UltraPur 2%", "Lactantia UltraPur 2% Ultrafiltered Lactose-Free Milk"),
        ("UltraPur 3.25%", "Lactantia UltraPur 3.25% Ultrafiltered Lactose-Free Milk"),
        ("Neilson 0%", "Neilson 0% Ultrafiltered Skim Milk"),
        ("Neilson 2%", "Neilson 2% Ultrafiltered Partly Skimmed Milk"),
        ("Neilson 3.25%", "Neilson 3.25% Ultrafiltered Homogenized Milk"),
    ]
    .map(source_str_to_comp);

    let mut lines = vec![format!(
        "{:<24} {:>7} {:>7} {:>6} {:>9}",
        "g per 100 g", "protein", "sugars", "ratio", "% of MSNF"
    )];
    let mut ratios = Vec::new();

    for (label, comp) in &sources {
        let (protein, sugars) = (comp.get(CompKey::MilkProteins), comp.get(CompKey::TotalSugars));
        let ratio = protein / sugars;
        let share = protein / comp.get(CompKey::MSNF) * 100.0;
        ratios.push(ratio);
        lines.push(format!("{label:<24} {protein:>7.2} {sugars:>7.2} {ratio:>6.2} {share:>9.1}"));
    }

    let min = ratios.iter().copied().fold(f64::INFINITY, f64::min);
    let max = ratios.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    assert_le!(max / min, 1.2, "protein to sugars ratios spread {:.3} times", max / min);

    insta::assert_snapshot!(lines.join("\n"));
}

#[test]
fn compare_specs_protein_beverages_formulation() {
    // Each beverage lists skim milk, water, milk protein concentrate, and cream, the 3.25%'s cream
    // ahead of its concentrate, with lactase. Water and lactose-free defaults of the rest, MPC 85
    // standing in for the unlisted grade, balance to its label in the listed order.
    let Ok(IngredientSpec {
        spec: TaggedSpec::DairySimpleSpec(mpc_85),
        ..
    }) = get_independent_ingredient_spec_by_name("Milk Protein Concentrate 85%")
    else {
        panic!("Milk Protein Concentrate 85% is not an embedded DairySimpleSpec");
    };
    let lactose_free_mpc_85 = DairySimpleSpec {
        lactose_free: Some(true),
        ..mpc_85
    };

    let components = [
        ("skim milk", get_comp_by_name("Lactose-Free 0% Milk")),
        ("water", get_comp_by_name("Water")),
        ("MPC 85", lactose_free_mpc_85.to_composition().unwrap()),
        ("cream", get_comp_by_name("Lactose-Free 35% Cream")),
    ];
    let comps = components.map(|(_, comp)| (comp, None));
    let keys = [CompKey::MilkFat, CompKey::MilkProteins, CompKey::MilkSugars].map(BalanceKey::from);

    let mut lines = vec![format!(
        "{:<14} {:>9} {:>7} {:>7} {:>7}",
        "% by weight", "skim milk", "water", "MPC 85", "cream"
    )];

    let mpc_then_cream = ["skim milk", "water", "MPC 85", "cream"];
    let cream_then_mpc = ["skim milk", "water", "cream", "MPC 85"];

    for (label, name, listed) in [
        ("Neilson 1%", "Neilson 1% 18g Protein Beverage, Lactose-Free", mpc_then_cream),
        ("Neilson 2%", "Neilson 2% 18g Protein Beverage, Lactose-Free", mpc_then_cream),
        ("Neilson 3.25%", "Neilson 3.25% 18g Protein Beverage, Lactose-Free", cream_then_mpc),
    ] {
        let beverage = get_comp_by_name(name);
        let targets: Vec<_> = composition_balance_targets(&beverage, &keys)
            .into_iter()
            .map(|(key, value)| (key, value, None))
            .collect();

        let balanced = balance_compositions(&comps, &targets, None, None).unwrap();
        let blend = Composition::from_combination(&balanced).unwrap();

        // Fit to the label's fat, protein, and sugars, the blend matches its minerals, POD, and
        // PAC too, as the defaults all lie on the milk solids lines
        for key in [
            CompKey::MilkFat,
            CompKey::MilkProteins,
            CompKey::MilkSugars,
            CompKey::MilkMinerals,
            CompKey::POD,
            CompKey::TotalPAC,
        ] {
            assert_eq_8dp!(blend.get(key), beverage.get(key));
        }

        let percents: Vec<_> = balanced.iter().map(|(_, fraction)| fraction * 100.0).collect();
        let percent = |component| percents[components.iter().position(|(c, _)| *c == component).unwrap()];
        for pair in listed.windows(2) {
            assert_gt!(percent(pair[0]), percent(pair[1]), "{label} lists {} ahead of {}", pair[0], pair[1]);
        }

        lines.push(format!(
            "{label:<14} {:>9.2} {:>7.2} {:>7.2} {:>7.2}",
            percents[0], percents[1], percents[2], percents[3]
        ));
    }

    insta::assert_snapshot!(lines.join("\n"));
}

#[test]
fn compare_specs_5_cream() {
    let sources = [
        ("Simple", "5% Cream"),
        ("Goff & Hartel", "Goff & Hartel 5% Milk"),
        ("Sealtest", "Sealtest Light Cream 5%"),
    ]
    .map(source_str_to_comp);

    // Sealtest's small 15ml serving rounds energy coarsely, in addition to the usual issue with
    // energy's higher fractional precision vs mass components, pushing a high error, ~150 pp.
    let ceiling = KeyCeiling::new(10.0).with_source("Sealtest", CompKey::Energy, 149.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_half_and_half() {
    assert_true!(is_alias_for("Half and Half", "10% Cream"));

    let sources = [
        ("Simple", "10% Cream"),
        ("USDA", "USDA Half and Half Cream"),
        ("USDA Label", "USDA Half and Half Cream (Label)"),
        ("Sealtest", "Sealtest Half and Half Cream 10%"),
        ("Lactantia", "Lactantia Half and Half Cream 10%"),
    ]
    .map(source_str_to_comp);

    // Sealtest's small 15ml serving rounds sugars coarsely (1g/15ml = 6.67g/100g), pulling
    // Lactose, PACsgr, and TotalPAC a few pp above the default ceiling. Lactantia's also rounds
    // its protein up, to 0.5 g, taking its MSNF to 10.6% vs Simple's 8.1%, and its fat share down.
    let ceiling = KeyCeiling::new(10.0)
        .with(CompKey::Energy, 14.0)
        .with_source("Sealtest", CompKey::Energy, 23.0)
        .with_source("Sealtest", CompKey::Lactose, 12.0)
        .with_source("Sealtest", CompKey::PACsgr, 12.0)
        .with_source("Sealtest", CompKey::TotalPAC, 15.0)
        .with_source("Lactantia", CompKey::Energy, 38.0)
        .with_source("Lactantia", CompKey::MilkFat, 12.0)
        .with_source("Lactantia", CompKey::Lactose, 11.0)
        .with_source("Lactantia", CompKey::MSNF, 12.0)
        .with_source("Lactantia", CompKey::PACsgr, 11.0)
        .with_source("Lactantia", CompKey::TotalPAC, 15.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_18_cream() {
    assert_true!(is_alias_for("Table Cream", "18% Cream"));

    let sources = [
        ("Simple", "18% Cream"),
        ("USDA", "USDA Light Cream"),
        ("USDA Label", "USDA Light Cream (Label)"),
        ("Sealtest", "Sealtest Table Cream 18%"),
        ("Lactantia", "Lactantia Table Cream 18%"),
    ]
    .map(source_str_to_comp);

    // Sealtest's 15ml serving rounds sugars and saturated fat coarsely, pushing TotalPAC and
    // SaturatedFat above the default ceiling. Lactantia's rounds fat down, to 16.4%, and sugars up,
    // to 6.6% lactose vs Simple's 4.0%; its 25 kcal sits below the ~28 its macronutrients give.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("Sealtest", CompKey::Energy, 42.0)
        .with_source("Sealtest", CompKey::TotalPAC, 13.0)
        .with_source("Sealtest", CompKey::SaturatedFat, 11.0)
        .with_source("Lactantia", CompKey::Energy, 125.0)
        .with_source("Lactantia", CompKey::MilkFat, 11.0)
        .with_source("Lactantia", CompKey::Lactose, 11.0)
        .with_source("Lactantia", CompKey::MSNF, 11.0)
        .with_source("Lactantia", CompKey::PACsgr, 11.0)
        .with_source("Lactantia", CompKey::TotalPAC, 15.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_whipping_cream() {
    assert_true!(is_alias_for("Whipping Cream", "35% Cream"));

    let sources = [
        ("Simple", "35% Cream"),
        ("Goff & Hartel", "Goff & Hartel 35% Cream"),
        ("USDA", "USDA Heavy Cream"),
        ("USDA Label", "USDA Heavy Cream (Label)"),
        ("Sealtest", "Sealtest Whipping Cream 35%"),
        ("Lactantia", "Lactantia Whipping Cream 35%"),
    ]
    .map(source_str_to_comp);

    // USDA Heavy Cream is 35.56% fat; close enough to compare with the 35% Simple/Sealtest
    // entries. Sealtest's 15ml serving rounds the lactose label to 0g sugars at this fat
    // level, which cascades through MilkSolids and TotalPAC (missing lactose is exactly
    // missing solids). Its 3g saturated fat label is also only ~58% of its fat, against the
    // standard 65%. USDA's sheet counts the 0.88 g by which its listing's carbohydrate
    // exceeds its sugars as MSNF, taking its MSNF gap with Sealtest just past the default ceiling.
    // Lactantia's label rounds its sugars to 0g too, and its fat down to 5g while its 50 kcal
    // stays, 9.4 kcal per gram of solids, above fat's own 9; Sealtest's 1g of carbohydrate,
    // counted as other solids, dilutes its fat share against Lactantia's.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("Sealtest", CompKey::Energy, 64.0)
        .with_source("Sealtest", CompKey::MSNF, 11.0)
        .with_source("Sealtest", CompKey::MilkSolids, 16.0)
        .with_source("Sealtest", CompKey::TotalPAC, 12.0)
        .with_source("Sealtest", CompKey::SaturatedFat, 11.0)
        .with_source("Lactantia", CompKey::Energy, 178.0)
        .with_source("Lactantia", CompKey::MilkFat, 15.0)
        .with_source("Lactantia", CompKey::TotalPAC, 11.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_double_cream() {
    assert_true!(is_alias_for("Double Cream", "48% Cream"));

    let sources = [
        ("Simple", "Double Cream"),
        ("Devon", "Devon Cream Company Double Cream"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(2.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_clotted_cream() {
    assert_true!(is_alias_for("Clotted Cream", "55% Cream"));

    let sources = [
        ("Simple", "Clotted Cream"),
        ("Devon", "Devon Cream Company Clotted Cream"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(1.0).with(CompKey::Energy, 15.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_lactose_free_skim_milk() {
    assert_true!(is_alias_for("Lactose-Free Skim Milk", "Lactose-Free 0% Milk"));

    let sources = [
        ("Simple", "Lactose-Free 0% Milk"),
        ("Lactantia", "Lactantia Lactose-Free Skim Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS));
}

#[test]
fn compare_specs_lactose_free_1_milk() {
    let sources = [
        ("Simple", "Lactose-Free 1% Milk"),
        ("Lactantia", "Lactantia Lactose-Free 1% Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with_source("Lactantia", CompKey::Energy, 27.0);

    assert_compositions_consistent(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS));
}

#[test]
fn compare_specs_lactose_free_2_milk() {
    let sources = [
        ("Simple", "Lactose-Free 2% Milk"),
        ("Lactantia", "Lactantia Lactose-Free 2% Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS));
}

#[test]
fn compare_specs_lactose_free_whole_milk() {
    assert_true!(is_alias_for("Lactose-Free Whole Milk", "Lactose-Free 3.25% Milk"));

    let sources = [
        ("Simple", "Lactose-Free 3.25% Milk"),
        ("Lactantia", "Lactantia Lactose-Free 3.25% Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS));
}

#[test]
fn compare_specs_lactose_free_half_and_half() {
    assert_true!(is_alias_for("Lactose-Free Half and Half", "Lactose-Free 10% Cream"));

    let sources = [
        ("Simple", "Lactose-Free 10% Cream"),
        ("Lactantia", "Lactantia Lactose-Free Half and Half Cream 10%"),
    ]
    .map(source_str_to_comp);

    // Lactantia's 15ml serving rounds as in `compare_specs_half_and_half`, its PAC misses running
    // higher as glucose and galactose carry nearly twice lactose's PAC per gram.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("Lactantia", CompKey::Energy, 24.0)
        .with_source("Lactantia", CompKey::PACsgr, 15.0)
        .with_source("Lactantia", CompKey::TotalPAC, 18.0);

    assert_compositions_consistent(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS));
}

#[test]
fn compare_specs_lactose_free_whipping_cream() {
    assert_true!(is_alias_for("Lactose-Free Whipping Cream", "Lactose-Free 35% Cream"));

    let sources = [
        ("Simple", "Lactose-Free 35% Cream"),
        ("Lactantia", "Lactantia Lactose-Free Whipping Cream 35%"),
    ]
    .map(source_str_to_comp);

    // Lactantia's 15ml serving rounds as in `compare_specs_whipping_cream`, its sugars to 0g, so it
    // lacks the glucose and galactose behind Simple's PAC.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("Lactantia", CompKey::Energy, 116.0)
        .with_source("Lactantia", CompKey::PACsgr, 15.0)
        .with_source("Lactantia", CompKey::TotalPAC, 18.0);

    assert_compositions_consistent(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_LACTOSE_FREE_DAIRY_KEYS));
}

#[test]
fn compare_specs_lactose_free_labels_match_regular() {
    // Lactantia's lactose-free tables are its regular ones, so only the sugars' species differs.
    let keys: Vec<CompKey> = COMPARABLE_LACTOSE_FREE_DAIRY_KEYS
        .iter()
        .copied()
        .filter(|key| ![CompKey::POD, CompKey::PACsgr, CompKey::TotalPAC].contains(key))
        .collect();

    for (lactose_free, regular) in [
        ("Lactantia Lactose-Free Skim Milk", "Lactantia PurFiltre Skim Milk"),
        ("Lactantia Lactose-Free 1% Milk", "Lactantia PurFiltre 1% Milk"),
        ("Lactantia Lactose-Free 2% Milk", "Lactantia PurFiltre 2% Milk"),
        ("Lactantia Lactose-Free 3.25% Milk", "Lactantia PurFiltre 3.25% Milk"),
        ("Lactantia Lactose-Free Half and Half Cream 10%", "Lactantia Half and Half Cream 10%"),
        ("Lactantia Lactose-Free Whipping Cream 35%", "Lactantia Whipping Cream 35%"),
    ] {
        let sources = [(lactose_free, lactose_free), (regular, regular)].map(source_str_to_comp);
        assert_compositions_consistent(&sources, &keys, &KeyCeiling::exact());
    }
}

#[test]
fn compare_specs_skim_evaporated_milk() {
    let sources = [
        ("Goff & Hartel", "Goff & Hartel Condensed Skim Milk, 20% MSNF"),
        ("USDA", "USDA Fat-Free Evaporated Milk"),
        ("USDA Label", "USDA Fat-Free Evaporated Milk (Label)"),
        ("Carnation", "Carnation Fat Free Evaporated Milk"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with_source("Carnation", CompKey::Energy, 72.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_2_evaporated_milk() {
    let sources = [
        ("USDA", "USDA 2% Reduced-Fat Evaporated Milk"),
        ("USDA Label", "USDA 2% Reduced-Fat Evaporated Milk (Label)"),
        ("Carnation", "Carnation 2% Evaporated Partly Skimmed Milk"),
    ]
    .map(source_str_to_comp);

    // Taking Carnation sugars as the literal label value (1g) instead of the midpoint
    // between the 2g of total carbohydrates and 1g of sugars (i.e. 1.5g) causes a big
    // difference in Lactose content, which cascades into every lactose-derived field
    // (POD, PACsgr) and — via the MSNF-from-lactose+protein estimate — into MSNF,
    // MilkSolids, PACmlk, and TotalPAC.
    //
    // @todo Worth revisiting whether the midpoint heuristic was the better choice here,
    // given how much cross-source consistency it bought us.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("Carnation", CompKey::Energy, 15.0)
        .with_source("Carnation", CompKey::Lactose, 23.0)
        .with_source("Carnation", CompKey::MSNF, 29.0)
        .with_source("Carnation", CompKey::MilkSolids, 29.0)
        .with_source("Carnation", CompKey::PACsgr, 23.0)
        .with_source("Carnation", CompKey::PACmlk, 11.0)
        .with_source("Carnation", CompKey::TotalPAC, 33.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_whole_evaporated_milk() {
    let sources = [
        ("Goff & Hartel", "Goff & Hartel 8% Condensed Milk"),
        ("USDA", "USDA Whole Evaporated Milk"),
        ("USDA Label", "USDA Whole Evaporated Milk (Label)"),
        ("Carnation", "Carnation Evaporated Milk"),
    ]
    .map(source_str_to_comp);

    // Taking Carnation sugars as the literal label value (1g) instead of the midpoint
    // between the 2g of total carbohydrates and 1g of sugars (i.e. 1.5g) causes a big
    // difference in Lactose content, which cascades into every lactose-derived field
    // (POD, PACsgr) and — via the MSNF-from-lactose+protein estimate — into MSNF,
    // MilkSolids, PACmlk, and TotalPAC.
    //
    // @todo Worth revisiting whether the midpoint heuristic was the better choice here,
    // given how much cross-source consistency it bought us.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("Carnation", CompKey::Energy, 40.0)
        .with_source("Carnation", CompKey::Lactose, 17.0)
        .with_source("Carnation", CompKey::MSNF, 22.0)
        .with_source("Carnation", CompKey::MilkSolids, 24.0)
        .with_source("Carnation", CompKey::PACsgr, 17.0)
        .with_source("Carnation", CompKey::TotalPAC, 24.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_sweetened_condensed_milk() {
    let sources = [
        ("USDA", "USDA Sweetened Condensed Milk"),
        ("USDA Label", "USDA Sweetened Condensed Milk (Label)"),
        ("Goff & Hartel", "Goff & Hartel Sweetened Condensed Milk"),
        ("Eagle Brand", "Eagle Brand Original Sweetened Condensed Milk"),
        ("Carnation", "Carnation Sweetened Condensed Milk (US)"),
    ]
    .map(source_str_to_comp);

    // Energy stands out at ~67 pp — high even for this suite — and likely flags a real disagreement
    // in solids energy density: USDA's 321 kcal/100g vs Eagle Brand's 359 kcal/100g at similar TS.
    // @todo investigate which side has the more accurate energy density.
    //
    // (Rodrigues, 2017)[^50] reports protein at 6.04g/100g, Eagle Brand at 5.13g/100g (1g per 19.5g
    // serving), USDA at 7.91g/100g, and Goff & Hartel at 8.5g/100g. Low-Fat Eagle Brand jumps to
    // 10.2g/100g (1g -> 2g per serving), consistent with Goff & Hartel's 11.1g/100g for Skim Milk.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("Eagle Brand", CompKey::Energy, 68.0)
        .with_source("Carnation", CompKey::Energy, 24.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_skim_milk_powder() {
    let sources = [
        ("Simple", "Skimmed Milk Powder"),
        ("Goff & Hartel", "Goff & Hartel Skim Milk Powder"),
        ("USDA", "USDA Skim Milk Powder"),
        ("USDA Label", "USDA Skim Milk Powder (Label)"),
        ("Medallion", "Medallion Skim Milk Powder"),
        ("Theland", "Theland Skim Milk Powder"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_whole_milk_powder() {
    let sources = [
        ("Simple", "Whole Milk Powder"),
        ("Goff & Hartel", "Goff & Hartel Whole Milk Powder"),
        ("USDA", "USDA Whole Milk Powder"),
        ("USDA Label", "USDA Whole Milk Powder (Label)"),
        ("Medallion", "Medallion Whole Milk Powder"),
        ("Theland", "Theland Whole Milk Powder"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0)
        .with_source("Medallion", CompKey::Energy, 16.0)
        .with_source("Theland", CompKey::Energy, 27.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_mpc_42() {
    assert_true!(is_alias_for("MPC 42", "Milk Protein Concentrate 42%"));

    let sources = [
        ("Simple", "Milk Protein Concentrate 42%"),
        ("USDEC", "USDEC Milk Protein Concentrate 42%"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_mpc_56() {
    assert_true!(is_alias_for("MPC 56", "Milk Protein Concentrate 56%"));

    let sources = [
        ("Simple", "Milk Protein Concentrate 56%"),
        ("USDEC", "USDEC Milk Protein Concentrate 56%"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_mpc_70() {
    assert_true!(is_alias_for("MPC 70", "Milk Protein Concentrate 70%"));

    let sources = [
        ("Simple", "Milk Protein Concentrate 70%"),
        ("USDEC", "USDEC Milk Protein Concentrate 70%"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_mpc_80() {
    assert_true!(is_alias_for("MPC 80", "Milk Protein Concentrate 80%"));

    let sources = [
        ("Simple", "Milk Protein Concentrate 80%"),
        ("VanWees", "VanWees Milk Protein Concentrate 80%"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_mpc_85() {
    assert_true!(is_alias_for("MPC 85", "Milk Protein Concentrate 85%"));

    let sources = [
        ("Simple", "Milk Protein Concentrate 85%"),
        ("USDEC", "USDEC Milk Protein Concentrate 85%"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_sweet_whey() {
    let sources = [("USDA", "USDA Sweet Whey"), ("USDA Label", "USDA Sweet Whey (Label)")].map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_whey_powder() {
    let sources = [
        ("Simple", "Whey Powder"),
        ("Goff & Hartel", "Goff & Hartel Dry Whey"),
        ("USDA", "USDA Sweet Whey Powder"),
        ("USDA Label", "USDA Sweet Whey Powder (Label)"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_wpc_34() {
    assert_true!(is_alias_for("WPC 34", "Whey Protein Concentrate 34%"));
    assert_true!(is_alias_for("USDEC WPC 34", "USDEC Whey Protein Concentrate 34%"));

    let sources = [
        ("Simple", "Whey Protein Concentrate 34%"),
        ("USDEC", "USDEC Whey Protein Concentrate 34%"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_whey_protein() {
    assert_true!(is_alias_for("WPC 80", "Whey Protein Concentrate 80%"));
    assert_true!(is_alias_for("USDEC WPC 80", "USDEC Whey Protein Concentrate 80%"));

    let sources = [
        ("Simple", "Whey Protein Concentrate 80%"),
        ("USDEC", "USDEC Whey Protein Concentrate 80%"),
        ("MyProtein", "MyProtein Impact Whey Protein"),
        ("Optimum Nutrition", "Optimum Nutrition Gold Standard 100% Whey"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0).with_source("Optimum Nutrition", CompKey::Energy, 21.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_whey_isolate() {
    assert_true!(is_alias_for("WPI", "Whey Protein Isolate"));
    assert_true!(is_alias_for("USDEC WPI", "USDEC Whey Protein Isolate"));

    let sources = [
        ("Simple", "Whey Protein Isolate"),
        ("USDEC", "USDEC Whey Protein Isolate"),
        ("Hilmar", "Hilmar 9000 Whey Protein Isolate"),
        ("Bulk Barn", "Bulk Barn Whey Protein Isolate 90%"),
        ("Leanfit", "Leanfit Sport Whey Isolate"),
        ("MyProtein", "MyProtein Clear Whey Isolate"),
        ("Optimum Nutrition", "Optimum Nutrition Gold Standard 100% Isolate"),
    ]
    .map(source_str_to_comp);

    // The four retail isolates span very different formulations. Bulk Barn and Leanfit sit at the
    // upper end of WPI purity (~90% protein, residual fat and sugars), as do the Simple, USDEC,
    // and Hilmar entries; ON Gold Standard 100% Isolate sits in the middle at ~83% protein with
    // low but non-zero fat and sugar. MyProtein Clear is a hydrolyzed/extra-filtered isolate
    // intended to mix into a clear juice-like drink rather than a shake — it lists only 80%
    // protein and exactly 0g fat and 0g sugar, so whatever else its solids hold shows up as water.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("MyProtein", CompKey::Energy, 13.0)
        .with_source("MyProtein", CompKey::TotalSolids, 15.0)
        .with_source("MyProtein", CompKey::Water, 15.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_mcc_80() {
    assert_true!(is_alias_for("MCC 80", "Micellar Casein Concentrate 80%"));

    let sources = [
        ("Simple", "Micellar Casein Concentrate 80%"),
        ("Kommineni", "Kommineni Micellar Casein Concentrate 80%"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_micellar_casein() {
    assert_true!(is_alias_for("MCI", "Micellar Casein Isolate"));

    let sources = [
        ("Simple", "Micellar Casein Isolate"),
        ("USDEC", "USDEC Micellar Casein Concentrate"),
        ("California Gold", "California Gold Nutrition, Sport, Micellar Casein"),
        ("MyProtein", "MyProtein Slow-Release Casein"),
        ("Optimum Nutrition", "Optimum Nutrition Gold Standard 100% Casein"),
    ]
    .map(source_str_to_comp);

    // MyProtein and Optimum Nutrition are flavored blends, ~73-77% protein with 6.7 g of other
    // carbohydrates per 100 g, while the Simple and USDEC entries are unflavored, ~83-86% protein.
    // USDEC's sheet lists no energy, and the 2.2 g its values leave unaccounted carry none.
    let ceiling = KeyCeiling::new(10.0)
        .with_source("USDEC", CompKey::Energy, 17.0)
        .with_source("MyProtein", CompKey::MilkSNFS, 12.0)
        .with_source("MyProtein", CompKey::MilkProteins, 12.0)
        .with_source("Optimum Nutrition", CompKey::MilkSNFS, 13.0)
        .with_source("Optimum Nutrition", CompKey::MilkProteins, 12.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}

#[test]
fn compare_specs_sodium_caseinate() {
    let sources = [
        ("Simple", "Sodium Caseinate"),
        ("Southward", "Southward Sodium Caseinate"),
        ("USDEC", "USDEC Sodium Caseinate"),
    ]
    .map(source_str_to_comp);

    let ceiling = KeyCeiling::new(10.0);

    assert_compositions_consistent(&sources, COMPARABLE_DAIRY_KEYS, &ceiling);
    insta::assert_snapshot!(compare_compositions(&sources, COMPARABLE_DAIRY_KEYS));
}
