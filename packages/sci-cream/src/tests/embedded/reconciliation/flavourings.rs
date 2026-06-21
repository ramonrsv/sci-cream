//! Reconciles the Nielsen-Massey flavourings against their published per-serving nutrition labels.
//!
//! These extracts are mostly an ethanol-water solution with a little flavor oil and (for the
//! vanilla extract and paste) sugar. The chosen `fat`/`sugars` keep every flavor oil below the
//! 0.5g/serving threshold (rounding to the label's 0g) and reproduce the label calories where
//! physically possible. A few labels are not reproducible: their calories exceed what the stated
//! ABV with all-zero macros allows under FDA rounding (the labels appear rounded up), so the
//! expected value is the modeled one with the published figure noted alongside.

#![cfg_attr(coverage, coverage(off))]
#![allow(clippy::unwrap_used, clippy::float_cmp)]

use super::util::*;
use crate::composition::CompKey;
use crate::constants::density::oils;
use crate::tests::assets::get_comp_by_name;

#[test]
fn nielsen_massey_extracts_reconcile() {
    // Expected values are what the model produces; where they differ from the label is noted.
    #[rustfmt::skip]
    let cases = [
        // (name, oil_density, expected_kcal per-5mL serving, expected_sugar_g)
        ("Nielsen-Massey Pure Vanilla Extract", NO_OIL,               10.0, 0.0), // label 15 kcal
        ("Nielsen-Massey Pure Vanilla Bean Paste", NO_OIL,           15.0, 3.0),  // label 17 kcal
        ("Nielsen-Massey Pure Almond Extract", oils::BITTER_ALMOND,  25.0, 0.0),
        ("Nielsen-Massey Pure Chocolate Extract", oils::COCOA_BUTTER, 15.0, 0.0),
        ("Nielsen-Massey Pure Coffee Extract", oils::COFFEE,         15.0, 0.0),  // label 20 kcal
        ("Nielsen-Massey Pure Lemon Extract", oils::CITRUS,          30.0, 0.0),
        ("Nielsen-Massey Pure Orange Extract", oils::CITRUS,         30.0, 0.0),
        ("Nielsen-Massey Pure Peppermint Extract", oils::PEPPERMINT, 30.0, 0.0),
    ];

    // all are under the 0.5g/serving threshold so they round to 0 on the label
    let exp_fat = 0.0;

    for (name, oil_density, exp_kcal, exp_sugar) in cases {
        let comp = get_comp_by_name(name);
        let mass = serving_mass_g(&comp, oil_density, 5.0).unwrap();

        let kcal = fda_round_calories(comp.get(CompKey::Energy) * mass / 100.0);
        let fat = fda_round_grams(comp.get(CompKey::TotalFats) * mass / 100.0);
        let sugar = fda_round_grams(comp.get(CompKey::TotalSugars) * mass / 100.0);

        assert_eq!(kcal, exp_kcal, "{name}: calories");
        assert_eq!(fat, exp_fat, "{name}: fat");
        assert_eq!(sugar, exp_sugar, "{name}: sugar");
    }
}

#[test]
fn nielsen_massey_vanilla_powder_reconciles() {
    let comp = get_comp_by_name("Nielsen-Massey Pure Vanilla Powder");

    // A dry powder: reconcile its "5mL" serving as a ~5g, which agrees with the label's 5g total
    // carbohydrate, and 20 kcal per serving - disregard maltodextrin's bulk density.
    let mass = 5.0;
    assert_eq!(fda_round_calories(comp.get(CompKey::Energy) * mass / 100.0), 20.0);
    assert_eq!(fda_round_grams(comp.get(CompKey::TotalCarbohydrates) * mass / 100.0), 5.0);
    assert_eq!(fda_round_grams(comp.get(CompKey::TotalSugars) * mass / 100.0), 0.0);
    assert_eq!(fda_round_grams(comp.get(CompKey::TotalFats) * mass / 100.0), 0.0);
}
