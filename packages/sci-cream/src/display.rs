//! Utilities to facilitate displaying various keys and values
//!
//! This module provides traits and functions to convert various lookup keys to strings suitable for
//! display, as well as functions to compute composition values in various formats for displaying.
//! This module is not necessary for core computations but is useful for UI and reporting purposes.

use std::fmt;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    balancing::{BalancingIssue, BalancingReport, Severity},
    composition::CompKey,
    fpd::FpdKey,
    properties::PropKey,
};

/// Trait to convert keys to display-friendly strings at varying levels of verbosity.
pub trait KeyAsStrings {
    /// Returns a compact string for space-constrained contexts (chart labels, narrow columns).
    ///
    /// Identical to [`as_med_str`](KeyAsStrings::as_med_str) for most keys; provides standard
    /// industry abbreviations where they meaningfully reduce length (e.g. "CMC", "LBG", "Carbs").
    fn as_short_str(&self) -> &'static str;

    /// Returns a medium verbosity string representation of the key.
    fn as_med_str(&self) -> &'static str;

    /// Returns a full-length string for tooltips and verbose reports.
    ///
    /// Restores the "Total" prefix on aggregate keys and expands abbreviations: SNF → "Solids
    /// Non-Fat", SNFS → "Solids Non-Fat Non-Sugar", FPD → "Freezing Point Depression", etc.
    fn as_long_str(&self) -> &'static str;
}

impl KeyAsStrings for CompKey {
    fn as_short_str(&self) -> &'static str {
        match self {
            Self::TotalCarbohydrates => "Carbs",
            Self::LocustBeanGum => "LBG",
            Self::CarboxymethylCellulose => "CMC",
            Self::SaturatedFat => "Sat. Fat",
            Self::EmulsifiersPerFat => "Emul./Fat",
            Self::StabilizersPerWater => "Stab./Water",
            _ => self.as_med_str(),
        }
    }

    fn as_med_str(&self) -> &'static str {
        match self {
            Self::Energy => "Energy",

            Self::MilkFat => "Milk Fat",
            Self::MSNF => "MSNF",
            Self::MilkSNFS => "Milk SNFS",
            Self::MilkProteins => "Milk Proteins",
            Self::MilkSolids => "Milk Solids",

            Self::CocoaButter => "Cocoa Butter",
            Self::CocoaSolids => "Cocoa Solids",
            Self::CacaoSolids => "Cacao Solids",

            Self::NutFat => "Nut Fat",
            Self::NutSNF => "Nut SNF",
            Self::NutSolids => "Nut Solids",

            Self::EggFat => "Egg Fat",
            Self::EggSNF => "Egg SNF",
            Self::EggSolids => "Egg Solids",

            Self::OtherFats => "Other Fats",
            Self::OtherSNFS => "Other SNFS",

            Self::TotalFats => "Fats",
            Self::TotalSNF => "SNF",
            Self::TotalSNFS => "SNFS",
            Self::TotalProteins => "Proteins",
            Self::TotalSolids => "Solids",

            Self::Water => "Water",

            Self::Inulin => "Inulin",
            Self::Oligofructose => "Oligofructose",
            Self::TotalFiber => "Fiber",
            Self::Glucose => "Glucose",
            Self::Fructose => "Fructose",
            Self::Galactose => "Galactose",
            Self::Sucrose => "Sucrose",
            Self::Lactose => "Lactose",
            Self::Maltose => "Maltose",
            Self::Trehalose => "Trehalose",
            Self::TotalSugars => "Sugars",
            Self::Erythritol => "Erythritol",
            Self::Maltitol => "Maltitol",
            Self::Sorbitol => "Sorbitol",
            Self::Xylitol => "Xylitol",
            Self::TotalPolyols => "Polyols",
            Self::Aspartame => "Aspartame",
            Self::Cyclamate => "Cyclamate",
            Self::Saccharin => "Saccharin",
            Self::Sucralose => "Sucralose",
            Self::Steviosides => "Steviosides",
            Self::Mogrosides => "Mogrosides",
            Self::TotalArtificial => "Artificial",
            Self::TotalSweeteners => "Sweeteners",
            Self::TotalCarbohydrates => "Carbohydrates",

            Self::Alcohol => "Alcohol",
            Self::ABV => "ABV",

            Self::Salt => "Salt",
            Self::Lecithin => "Lecithin",
            Self::TotalEmulsifiers => "Emulsifiers",
            Self::Cornstarch => "Cornstarch",
            Self::TapiocaStarch => "Tapioca Starch",
            Self::Pectin => "Pectin",
            Self::Gelatin => "Gelatin",
            Self::LocustBeanGum => "Locust Bean Gum",
            Self::GuarGum => "Guar Gum",
            Self::Carrageenans => "Carrageenans",
            Self::CarboxymethylCellulose => "Carboxymethyl Cellulose",
            Self::XanthanGum => "Xanthan Gum",
            Self::SodiumAlginate => "Sodium Alginate",
            Self::TaraGum => "Tara Gum",
            Self::TotalStabilizers => "Stabilizers",
            Self::EmulsifiersPerFat => "Emulsifiers/Fat",
            Self::StabilizersPerWater => "Stabilizers/Water",

            Self::POD => "POD",

            Self::PACsgr => "PACsgr",
            Self::PACslt => "PACslt",
            Self::PACmlk => "PACmlk",
            Self::PACalc => "PACalc",
            Self::TotalPAC => "PAC",
            Self::AbsPAC => "Abs.PAC",
            Self::HF => "HF",

            Self::SaturatedFat => "Saturated Fat",
            Self::TransFat => "Trans Fat",
        }
    }

    fn as_long_str(&self) -> &'static str {
        match self {
            Self::MSNF => "Milk Solids Non-Fat",
            Self::MilkSNFS => "Milk Solids Non-Fat Non-Sugar",
            Self::NutSNF => "Nut Solids Non-Fat",
            Self::EggSNF => "Egg Solids Non-Fat",
            Self::OtherSNFS => "Other Solids Non-Fat Non-Sugar",
            Self::TotalFats => "Total Fats",
            Self::TotalSNF => "Total Solids Non-Fat",
            Self::TotalSNFS => "Total Solids Non-Fat Non-Sugar",
            Self::TotalProteins => "Total Proteins",
            Self::TotalSolids => "Total Solids",
            Self::TotalFiber => "Total Fiber",
            Self::TotalSugars => "Total Sugars",
            Self::TotalPolyols => "Total Polyols",
            Self::TotalArtificial => "Total Artificial",
            Self::TotalSweeteners => "Total Sweeteners",
            Self::TotalCarbohydrates => "Total Carbohydrates",
            Self::TotalEmulsifiers => "Total Emulsifiers",
            Self::TotalStabilizers => "Total Stabilizers",
            Self::TotalPAC => "Total PAC",
            Self::PACsgr => "PAC (Sugars)",
            Self::PACslt => "PAC (Salt)",
            Self::PACmlk => "PAC (Milk)",
            Self::PACalc => "PAC (Alcohol)",
            Self::AbsPAC => "Absolute PAC",
            Self::HF => "Hardness Factor",
            Self::ABV => "Alcohol by Volume",
            _ => self.as_med_str(),
        }
    }
}

impl KeyAsStrings for FpdKey {
    fn as_short_str(&self) -> &'static str {
        self.as_med_str()
    }

    fn as_med_str(&self) -> &'static str {
        match self {
            Self::FPD => "FPD",
            Self::ServingTemp => "Serving Temp",
            Self::HardnessAt14C => "Hardness @-14°C",
        }
    }

    fn as_long_str(&self) -> &'static str {
        match self {
            Self::FPD => "Freezing Point Depression",
            Self::ServingTemp => "Serving Temperature",
            Self::HardnessAt14C => "Hardness at -14°C",
        }
    }
}

impl KeyAsStrings for PropKey {
    fn as_short_str(&self) -> &'static str {
        match self {
            Self::CompKey(comp_key) => comp_key.as_short_str(),
            Self::FpdKey(fpd_key) => fpd_key.as_short_str(),
        }
    }

    fn as_med_str(&self) -> &'static str {
        match self {
            Self::CompKey(comp_key) => comp_key.as_med_str(),
            Self::FpdKey(fpd_key) => fpd_key.as_med_str(),
        }
    }

    fn as_long_str(&self) -> &'static str {
        match self {
            Self::CompKey(comp_key) => comp_key.as_long_str(),
            Self::FpdKey(fpd_key) => fpd_key.as_long_str(),
        }
    }
}

impl fmt::Display for BalancingIssue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NonFiniteTarget { key, value } => {
                write!(f, "target for '{}' is not finite ({value})", key.as_med_str())
            }
            Self::DuplicateTarget { key } => {
                write!(f, "'{}' appears more than once in the targets", key.as_med_str())
            }
            Self::DuplicatePriority { key } => {
                write!(f, "'{}' appears more than once in the priorities", key.as_med_str())
            }
            Self::UnaffectableTarget { key } => {
                write!(f, "no ingredient contributes to '{}', so its target cannot be affected", key.as_med_str())
            }
            Self::UnreachableTarget { key, target, min, max } => write!(
                f,
                "target for '{}' ({target:.2}) is outside the reachable range [{min:.2}, {max:.2}]",
                key.as_med_str()
            ),
            Self::DominanceViolation {
                lesser,
                greater,
                lesser_target,
                greater_target,
            } => write!(
                f,
                "target for '{lesser}' ({lesser_target:.2}) exceeds target for '{greater}' ({greater_target:.2}), but \
                 no non-negative ingredient mix can satisfy both — every ingredient's '{lesser}' ≤ its '{greater}'",
                lesser = lesser.as_med_str(),
                greater = greater.as_med_str(),
            ),
            Self::AdditiveDominanceViolation {
                whole,
                parts,
                parts_target_sum,
                whole_target,
            } => {
                let parts = parts
                    .iter()
                    .map(|key| format!("'{}'", key.as_med_str()))
                    .collect::<Vec<_>>()
                    .join(" + ");
                write!(
                    f,
                    "targets {parts} sum to {parts_target_sum:.2}, exceeding the target for '{whole}' \
                     ({whole_target:.2}), but no non-negative ingredient mix can satisfy them all — every \
                     ingredient's parts sum to ≤ its '{whole}'",
                    whole = whole.as_med_str(),
                )
            }
            Self::PriorityWithoutTarget { key } => write!(
                f,
                "priority set for '{}', which is not among the targets, so it has no effect",
                key.as_med_str()
            ),
        }
    }
}

impl fmt::Display for BalancingReport {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.issues.is_empty() {
            return write!(f, "no balancing issues");
        }
        for (index, issue) in self.issues.iter().enumerate() {
            if index > 0 {
                writeln!(f)?;
            }
            let label = match issue.severity() {
                Severity::Error => "error",
                Severity::Warning => "warning",
            };
            write!(f, "[{label}] {issue}")?;
        }
        Ok(())
    }
}

/// Computes a composition value as an absolute quantity based on the ingredient or mix quantity.
///
/// # Arguments
///
/// * `comp` - The composition value (grams per 100 grams) from [`Composition`](crate::Composition).
/// * `qty` - The total quantity (grams) of the ingredient or mix.
///
/// # Examples
///
/// ```
/// use sci_cream::display::composition_value_as_quantity;
/// let milk_2_fat_comp = 2.0; // 2% milk fat, g/100g
/// let milk_qty = 500.0; // grams
/// let milk_fat_qty = composition_value_as_quantity(milk_2_fat_comp, milk_qty);
/// assert_eq!(milk_fat_qty, 10.0);
/// ```
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[must_use]
pub fn composition_value_as_quantity(comp: f64, qty: f64) -> f64 {
    (comp * qty) / 100.0
}

/// Computes an ingredient composition value and quantity as a percentage of the total mix.
///
/// # Arguments
///
/// * `comp` - The composition value (grams per 100 grams) from [`Composition`](crate::Composition).
/// * `int_qty` - The quantity (grams) of the ingredient.
/// * `mix_total` - The total quantity (grams) of the entire mix.
///
/// # Examples
///
/// ```
/// use sci_cream::display::composition_value_as_percentage;
/// let milk_2_fat_comp = 2.0; // 2% milk fat, g/100g
/// let milk_qty = 500.0; // grams
/// let mix_total = 1000.0; // grams
/// let milk_fat_percentage = composition_value_as_percentage(milk_2_fat_comp, milk_qty, mix_total);
/// assert_eq!(milk_fat_percentage, 1.0);
/// ```
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[must_use]
pub fn composition_value_as_percentage(comp: f64, int_qty: f64, mix_total: f64) -> f64 {
    (comp * int_qty) / mix_total
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use std::collections::HashSet;

    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn comp_keys_as_short_str() {
        let some_expected = vec![
            // keys that differ from as_med_str
            ("Carbs", CompKey::TotalCarbohydrates),
            ("LBG", CompKey::LocustBeanGum),
            ("CMC", CompKey::CarboxymethylCellulose),
            ("Sat. Fat", CompKey::SaturatedFat),
            ("Emul./Fat", CompKey::EmulsifiersPerFat),
            ("Stab./Water", CompKey::StabilizersPerWater),
        ];
        for (expected, key) in some_expected {
            assert_eq!(key.as_short_str(), expected);
        }
    }

    #[test]
    fn comp_keys_as_long_str() {
        let some_expected = vec![
            // SNF / SNFS expansions
            ("Milk Solids Non-Fat", CompKey::MSNF),
            ("Milk Solids Non-Fat Non-Sugar", CompKey::MilkSNFS),
            ("Nut Solids Non-Fat", CompKey::NutSNF),
            ("Egg Solids Non-Fat", CompKey::EggSNF),
            ("Other Solids Non-Fat Non-Sugar", CompKey::OtherSNFS),
            ("Total Solids Non-Fat", CompKey::TotalSNF),
            ("Total Solids Non-Fat Non-Sugar", CompKey::TotalSNFS),
            // Total* prefix
            ("Total Fats", CompKey::TotalFats),
            ("Total Proteins", CompKey::TotalProteins),
            ("Total Solids", CompKey::TotalSolids),
            ("Total Fiber", CompKey::TotalFiber),
            ("Total Sugars", CompKey::TotalSugars),
            ("Total Polyols", CompKey::TotalPolyols),
            ("Total Artificial", CompKey::TotalArtificial),
            ("Total Sweeteners", CompKey::TotalSweeteners),
            ("Total Carbohydrates", CompKey::TotalCarbohydrates),
            ("Total Emulsifiers", CompKey::TotalEmulsifiers),
            ("Total Stabilizers", CompKey::TotalStabilizers),
            ("Total PAC", CompKey::TotalPAC),
            // PAC sub-keys and other expanded acronyms
            ("PAC (Sugars)", CompKey::PACsgr),
            ("PAC (Salt)", CompKey::PACslt),
            ("PAC (Milk)", CompKey::PACmlk),
            ("PAC (Alcohol)", CompKey::PACalc),
            ("Absolute PAC", CompKey::AbsPAC),
            ("Hardness Factor", CompKey::HF),
            ("Alcohol by Volume", CompKey::ABV),
            // keys unchanged from as_med_str
            ("Milk Fat", CompKey::MilkFat),
            ("POD", CompKey::POD),
        ];
        for (expected, key) in some_expected {
            assert_eq!(key.as_long_str(), expected);
        }
    }

    #[test]
    fn comp_keys_as_med_str() {
        let some_expected = vec![
            "Energy",
            "Milk Fat",
            "MSNF",
            "Milk SNFS",
            "Milk Proteins",
            "Milk Solids",
            "Cocoa Butter",
            "Cocoa Solids",
            "Cacao Solids",
            "Nut Fat",
            "Nut SNF",
            "Nut Solids",
            "Egg Fat",
            "Egg SNF",
            "Egg Solids",
            "Other Fats",
            "Other SNFS",
            "Fats",
            "SNF",
            "SNFS",
            "Proteins",
            "Solids",
            "Water",
            "Inulin",
            "Oligofructose",
            "Fiber",
            "Glucose",
            "Fructose",
            "Galactose",
            "Sucrose",
            "Lactose",
            "Maltose",
            "Trehalose",
            "Sugars",
            "Erythritol",
            "Maltitol",
            "Sorbitol",
            "Xylitol",
            "Polyols",
            "Aspartame",
            "Cyclamate",
            "Saccharin",
            "Sucralose",
            "Steviosides",
            "Mogrosides",
            "Artificial",
            "Sweeteners",
            "Carbohydrates",
            "Alcohol",
            "ABV",
            "Salt",
            "Lecithin",
            "Emulsifiers",
            "Cornstarch",
            "Tapioca Starch",
            "Pectin",
            "Gelatin",
            "Locust Bean Gum",
            "Guar Gum",
            "Carrageenans",
            "Carboxymethyl Cellulose",
            "Xanthan Gum",
            "Sodium Alginate",
            "Tara Gum",
            "Stabilizers",
            "Emulsifiers/Fat",
            "Stabilizers/Water",
            "POD",
            "PACsgr",
            "PACslt",
            "PACmlk",
            "PACalc",
            "PAC",
            "Abs.PAC",
            "HF",
            "Saturated Fat",
            "Trans Fat",
        ];

        let actual_set: HashSet<&'static str> = CompKey::iter().map(|h| h.as_med_str()).collect();

        for expected in some_expected {
            assert_true!(actual_set.contains(expected));
        }
    }

    #[test]
    fn fpd_keys_as_short_str() {
        let expected_vec = vec!["FPD", "Serving Temp", "Hardness @-14°C"];
        let actual_vec: Vec<&'static str> = FpdKey::iter().map(|h| h.as_short_str()).collect();
        assert_eq!(actual_vec, expected_vec);
    }

    #[test]
    fn fpd_keys_as_med_str() {
        let expected_vec = vec!["FPD", "Serving Temp", "Hardness @-14°C"];
        let actual_vec: Vec<&'static str> = FpdKey::iter().map(|h| h.as_med_str()).collect();
        assert_eq!(actual_vec, expected_vec);
    }

    #[test]
    fn fpd_keys_as_long_str() {
        let expected_vec = vec!["Freezing Point Depression", "Serving Temperature", "Hardness at -14°C"];
        let actual_vec: Vec<&'static str> = FpdKey::iter().map(|h| h.as_long_str()).collect();
        assert_eq!(actual_vec, expected_vec);
    }

    #[test]
    fn prop_keys_as_med_str() {
        assert_eq!(PropKey::CompKey(CompKey::MilkFat).as_med_str(), "Milk Fat");
        assert_eq!(PropKey::FpdKey(FpdKey::FPD).as_med_str(), "FPD");
    }

    #[test]
    fn prop_keys_as_short_str() {
        assert_eq!(PropKey::CompKey(CompKey::CarboxymethylCellulose).as_short_str(), "CMC");
        assert_eq!(PropKey::FpdKey(FpdKey::ServingTemp).as_short_str(), "Serving Temp");
    }

    #[test]
    fn prop_keys_as_long_str() {
        assert_eq!(PropKey::CompKey(CompKey::TotalFats).as_long_str(), "Total Fats");
        assert_eq!(PropKey::FpdKey(FpdKey::FPD).as_long_str(), "Freezing Point Depression");
    }

    #[test]
    fn balancing_issue_display_message_dominance_violation() {
        let dominance = BalancingIssue::DominanceViolation {
            lesser: CompKey::Sucrose,
            greater: CompKey::TotalSugars,
            lesser_target: 20.0,
            greater_target: 15.0,
        };
        let text = dominance.to_string();
        assert_true!(text.contains("Sucrose"));
        assert_true!(text.contains("Sugars"));
    }

    #[test]
    fn balancing_issue_display_message_additive_dominance_violation() {
        let additive = BalancingIssue::AdditiveDominanceViolation {
            whole: CompKey::TotalSugars,
            parts: vec![CompKey::Sucrose, CompKey::Fructose],
            parts_target_sum: 20.0,
            whole_target: 15.0,
        };
        let text = additive.to_string();
        assert_true!(text.contains("'Sucrose' + 'Fructose'"));
        assert_true!(text.contains("Sugars"));
    }

    #[test]
    fn balancing_issue_display_message_duplicate_priority() {
        let text = BalancingIssue::DuplicatePriority { key: CompKey::MilkFat }.to_string();
        assert_true!(text.contains(CompKey::MilkFat.as_med_str()));
        assert_true!(text.contains("priorities"));
    }

    #[test]
    fn balancing_issue_display_message_priority_without_target() {
        let text = BalancingIssue::PriorityWithoutTarget { key: CompKey::MSNF }.to_string();
        assert_true!(text.contains(CompKey::MSNF.as_med_str()));
        assert_true!(text.contains("no effect"));
    }

    #[test]
    fn balancing_report_display_lists_issues() {
        let report = BalancingReport {
            issues: vec![
                BalancingIssue::DuplicateTarget { key: CompKey::AbsPAC },
                BalancingIssue::UnaffectableTarget { key: CompKey::Alcohol },
            ],
        };
        let text = report.to_string();
        assert_true!(text.contains("[error]"));
        assert_true!(text.contains("[warning]"));
    }

    #[test]
    fn composition_value_as_quantity() {
        let comp = 2.0; // 2% milk fat, g/100g
        let qty = 500.0;
        let qty_result = super::composition_value_as_quantity(comp, qty);
        assert_eq!(qty_result, 10.0);
    }

    #[test]
    fn composition_value_as_percentage() {
        let comp = 2.0; // 2% milk fat, g/100g
        let ing_qty = 500.0;
        let mix_total = 1000.0;
        let milk_fat_percentage = super::composition_value_as_percentage(comp, ing_qty, mix_total);
        assert_eq!(milk_fat_percentage, 1.0);
    }
}
