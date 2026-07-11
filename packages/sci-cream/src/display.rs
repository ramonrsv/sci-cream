//! Utilities to facilitate displaying various keys and values
//!
//! This module provides traits and functions to convert various lookup keys to strings suitable for
//! display, as well as functions to compute composition values in various formats for displaying.
//! This module is not necessary for core computations but is useful for UI and reporting purposes.

use std::fmt;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    balancing::{BalanceKey, BalancingIssue, BalancingReport, Severity},
    composition::{CompKey, RatioKey},
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
            _ => self.as_med_str(),
        }
    }

    fn as_med_str(&self) -> &'static str {
        match self {
            Self::Energy => "Energy",

            Self::MilkSolids => "Milk Solids",
            Self::MilkFat => "Milk Fat",
            Self::MSNF => "MSNF",
            Self::MilkSugars => "Milk Sugars",
            Self::MilkSNFS => "Milk SNFS",
            Self::MilkProteins => "Milk Proteins",
            Self::Casein => "Casein",
            Self::Whey => "Whey",

            Self::CacaoSolids => "Cacao Solids",
            Self::CocoaButter => "Cocoa Butter",
            Self::CocoaSolids => "Cocoa Solids",

            Self::NutSolids => "Nut Solids",
            Self::NutFat => "Nut Fat",
            Self::NutSNF => "Nut SNF",

            Self::EggSolids => "Egg Solids",
            Self::EggFat => "Egg Fat",
            Self::EggSNF => "Egg SNF",
            Self::EggProteins => "Egg Proteins",
            Self::WhiteProteins => "White Proteins",
            Self::YolkProteins => "Yolk Proteins",

            Self::OtherFats => "Other Fats",
            Self::OtherSNFS => "Other SNFS",

            Self::TotalSolids => "Solids",
            Self::TotalFats => "Fats",
            Self::TotalSNF => "SNF",
            Self::TotalSNFS => "SNFS",
            Self::TotalProteins => "Proteins",

            Self::Water => "Water",

            Self::TotalCarbohydrates => "Carbohydrates",

            Self::TotalFiber => "Fiber",
            Self::Inulin => "Inulin",
            Self::Oligofructose => "Oligofructose",

            Self::TotalSugars => "Sugars",
            Self::Glucose => "Glucose",
            Self::Fructose => "Fructose",
            Self::Galactose => "Galactose",
            Self::Sucrose => "Sucrose",
            Self::Lactose => "Lactose",
            Self::Maltose => "Maltose",
            Self::Trehalose => "Trehalose",

            Self::TotalPolyols => "Polyols",
            Self::Erythritol => "Erythritol",
            Self::Maltitol => "Maltitol",
            Self::Sorbitol => "Sorbitol",
            Self::Xylitol => "Xylitol",

            Self::TotalArtificial => "Artificial",
            Self::Aspartame => "Aspartame",
            Self::Cyclamate => "Cyclamate",
            Self::Saccharin => "Saccharin",
            Self::Sucralose => "Sucralose",
            Self::Steviosides => "Steviosides",
            Self::Mogrosides => "Mogrosides",

            Self::TotalSweeteners => "Sweeteners",

            Self::Salt => "Salt",

            Self::TotalStabilizers => "Stabilizers",
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

            Self::TotalEmulsifiers => "Emulsifiers",
            Self::Lecithin => "Lecithin",

            Self::Alcohol => "Alcohol",
            Self::ABV => "ABV",

            Self::POD => "POD",

            Self::NetPAC => "Net PAC",
            Self::TotalPAC => "PAC",
            Self::PACsgr => "PACsgr",
            Self::PACslt => "PACslt",
            Self::PACmlk => "PACmlk",
            Self::PACalc => "PACalc",

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
            Self::TotalSolids => "Total Solids",
            Self::TotalFats => "Total Fats",
            Self::TotalSNF => "Total Solids Non-Fat",
            Self::TotalSNFS => "Total Solids Non-Fat Non-Sugar",
            Self::TotalProteins => "Total Proteins",
            Self::TotalCarbohydrates => "Total Carbohydrates",
            Self::TotalFiber => "Total Fiber",
            Self::TotalSugars => "Total Sugars",
            Self::TotalPolyols => "Total Polyols",
            Self::TotalArtificial => "Total Artificial",
            Self::TotalSweeteners => "Total Sweeteners",
            Self::TotalStabilizers => "Total Stabilizers",
            Self::TotalEmulsifiers => "Total Emulsifiers",
            Self::ABV => "Alcohol by Volume",
            Self::TotalPAC => "Total PAC",
            Self::PACsgr => "PAC (Sugars)",
            Self::PACslt => "PAC (Salt)",
            Self::PACmlk => "PAC (Milk)",
            Self::PACalc => "PAC (Alcohol)",
            Self::HF => "Hardness Factor",
            _ => self.as_med_str(),
        }
    }
}

impl KeyAsStrings for RatioKey {
    fn as_short_str(&self) -> &'static str {
        match self {
            Self::StabilizersPerWater => "Stab./Water",
            Self::EmulsifiersPerFat => "Emul./Fat",
            _ => self.as_med_str(),
        }
    }

    fn as_med_str(&self) -> &'static str {
        match self {
            Self::StabilizersPerWater => "Stabilizers/Water",
            Self::EmulsifiersPerFat => "Emulsifiers/Fat",
            Self::AbsNetPAC => "Abs.Net PAC",
            Self::AbsPAC => "Abs.PAC",
        }
    }

    fn as_long_str(&self) -> &'static str {
        match self {
            Self::AbsNetPAC => "Absolute Net PAC",
            Self::AbsPAC => "Absolute PAC",
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

impl KeyAsStrings for BalanceKey {
    fn as_short_str(&self) -> &'static str {
        match self {
            Self::Comp(comp_key) => comp_key.as_short_str(),
            Self::Ratio(ratio_key) => ratio_key.as_short_str(),
        }
    }

    fn as_med_str(&self) -> &'static str {
        match self {
            Self::Comp(comp_key) => comp_key.as_med_str(),
            Self::Ratio(ratio_key) => ratio_key.as_med_str(),
        }
    }

    fn as_long_str(&self) -> &'static str {
        match self {
            Self::Comp(comp_key) => comp_key.as_long_str(),
            Self::Ratio(ratio_key) => ratio_key.as_long_str(),
        }
    }
}

impl KeyAsStrings for PropKey {
    fn as_short_str(&self) -> &'static str {
        match self {
            Self::Comp(comp_key) => comp_key.as_short_str(),
            Self::Fpd(fpd_key) => fpd_key.as_short_str(),
            Self::Ratio(ratio_key) => ratio_key.as_short_str(),
        }
    }

    fn as_med_str(&self) -> &'static str {
        match self {
            Self::Comp(comp_key) => comp_key.as_med_str(),
            Self::Fpd(fpd_key) => fpd_key.as_med_str(),
            Self::Ratio(ratio_key) => ratio_key.as_med_str(),
        }
    }

    fn as_long_str(&self) -> &'static str {
        match self {
            Self::Comp(comp_key) => comp_key.as_long_str(),
            Self::Fpd(fpd_key) => fpd_key.as_long_str(),
            Self::Ratio(ratio_key) => ratio_key.as_long_str(),
        }
    }
}

/// Joins balance keys as a quoted, ` + `-separated list (e.g. `'Sucrose' + 'Fructose'`)
fn join_keys(keys: &[BalanceKey]) -> String {
    keys.iter()
        .map(|key| format!("'{}'", key.as_med_str()))
        .collect::<Vec<_>>()
        .join(" + ")
}

/// Formats a number with up to two decimal places, dropping trailing zeros and any trailing decimal
/// point — e.g. `20.00 → "20"`, `0.40 → "0.4"`. An infinite value renders as `"∞"` / `"-∞"`.
fn round2(value: f64) -> String {
    if value.is_infinite() {
        return if value < 0.0 {
            "-∞".to_owned()
        } else {
            "∞".to_owned()
        };
    }

    format!("{value:.2}")
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_owned()
}

/// Writes the palette-derived [`DominanceViolation`](BalancingIssue::DominanceViolation) message,
/// using the pairwise wording for a single `lesser` key and the additive wording for several.
fn fmt_dominance(
    f: &mut fmt::Formatter<'_>,
    lesser: &[BalanceKey],
    greater: BalanceKey,
    lesser_target_sum: f64,
    greater_target: f64,
) -> fmt::Result {
    let greater = greater.as_med_str();
    let lesser_target_sum = round2(lesser_target_sum);
    let greater_target = round2(greater_target);
    if let [only] = lesser {
        write!(
            f,
            "Target for '{lesser}' ({lesser_target_sum}) exceeds target for '{greater}' \
             ({greater_target}), but no ingredient mix can satisfy both — every ingredient's \
             '{lesser}' ≤ its '{greater}'",
            lesser = only.as_med_str(),
        )
    } else {
        write!(
            f,
            "Targets {parts} sum to {lesser_target_sum}, exceeding the target for '{greater}' \
             ({greater_target}), but no ingredient mix can satisfy them all — every ingredient's \
             parts sum to ≤ its '{greater}'",
            parts = join_keys(lesser),
        )
    }
}

/// Writes the palette-independent [`StructuralViolation`](BalancingIssue::StructuralViolation)
/// message, using the pairwise wording for a single `part` and the additive wording for several.
fn fmt_structural_dominance(
    f: &mut fmt::Formatter<'_>,
    parts: &[BalanceKey],
    whole: BalanceKey,
    parts_target_sum: f64,
    whole_target: f64,
) -> fmt::Result {
    let whole = whole.as_med_str();
    let parts_target_sum = round2(parts_target_sum);
    let whole_target = round2(whole_target);
    if let [only] = parts {
        write!(
            f,
            "Target for '{part}' ({parts_target_sum}) exceeds target for '{whole}' \
             ({whole_target}), but '{part}' is part of '{whole}', so it can never be larger",
            part = only.as_med_str(),
        )
    } else {
        write!(
            f,
            "Targets {parts} sum to {parts_target_sum}, exceeding the target for '{whole}' \
             ({whole_target}), but they are parts of '{whole}', so cannot sum above it",
            parts = join_keys(parts),
        )
    }
}

impl fmt::Display for BalancingIssue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NonFiniteTarget { key, value } => {
                write!(f, "Target for '{}' is not finite ({value})", key.as_med_str())
            }
            Self::NegativeTarget { key, value } => {
                write!(f, "Target for '{}' is negative ({value})", key.as_med_str())
            }
            Self::DuplicateTarget { key } => {
                write!(f, "'{}' appears more than once in the targets", key.as_med_str())
            }
            Self::UnaffectableTarget { key } => {
                write!(f, "No ingredient contributes to '{}', so its target cannot be affected", key.as_med_str())
            }
            Self::UnreachableTarget { key, target, min, max } => write!(
                f,
                "Target for '{}' ({}) is outside the reachable range [{}, {}]",
                key.as_med_str(),
                round2(*target),
                round2(*min),
                round2(*max),
            ),
            Self::DominanceViolation {
                lesser,
                greater,
                lesser_target_sum,
                greater_target,
            } => fmt_dominance(f, lesser, *greater, *lesser_target_sum, *greater_target),
            Self::RatioInfeasibility {
                numerator,
                denominator,
                target_ratio,
                min_ratio,
                max_ratio,
            } => write!(
                f,
                "Target ratio {numerator} : '{denominator}' ({target_ratio}) is outside the range \
                 [{min_ratio}, {max_ratio}] the ingredients allow",
                numerator = join_keys(numerator),
                denominator = denominator.as_med_str(),
                target_ratio = round2(*target_ratio),
                min_ratio = round2(*min_ratio),
                max_ratio = round2(*max_ratio),
            ),
            Self::StructuralViolation {
                parts,
                whole,
                parts_target_sum,
                whole_target,
            } => fmt_structural_dominance(f, parts, *whole, *parts_target_sum, *whole_target),
            Self::RollupSumMismatch {
                whole,
                parts,
                parts_target_sum,
                whole_target,
            } => write!(
                f,
                "'{whole}' is exactly the sum of {parts}, so its target ({whole_target}) is inconsistent \
                 with theirs (summing to {parts_target_sum})",
                whole = whole.as_med_str(),
                parts = join_keys(parts),
                whole_target = round2(*whole_target),
                parts_target_sum = round2(*parts_target_sum),
            ),
            Self::OverDetermined {
                target_count,
                ingredient_count,
            } => write!(
                f,
                "{target_count} targets with only {ingredient_count} ingredients: at most {} can be met exactly, \
                 so the balance is a best-fit compromise",
                ingredient_count.saturating_sub(1),
            ),
            Self::InvalidLockedFraction { index, fraction } => {
                write!(f, "Locked ingredient at position {} has an invalid fraction ({})", index + 1, round2(*fraction))
            }
            Self::LockedFractionsExceedMix { locked_total } => {
                write!(f, "Locked ingredients sum to {} of the mix, exceeding the whole (1.0)", round2(*locked_total))
            }
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
                Severity::Info => "information",
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
        ];
        for (expected, key) in some_expected {
            assert_eq!(key.as_short_str(), expected);
        }
    }

    #[test]
    fn comp_keys_as_med_str() {
        let some_expected = vec![
            ("Milk Fat", CompKey::MilkFat),
            ("MSNF", CompKey::MSNF),
            ("Sugars", CompKey::TotalSugars),
            ("PAC", CompKey::TotalPAC),
            ("Saturated Fat", CompKey::SaturatedFat),
        ];
        for (expected, key) in some_expected {
            assert_eq!(key.as_med_str(), expected);
        }
    }

    #[test]
    fn comp_keys_as_long_str() {
        let some_expected = vec![
            // SNF / SNFS expansions
            ("Milk Solids Non-Fat", CompKey::MSNF),
            ("Milk Solids Non-Fat Non-Sugar", CompKey::MilkSNFS),
            // Total* prefix restored on aggregate keys
            ("Total Carbohydrates", CompKey::TotalCarbohydrates),
            // PAC sub-keys and other expanded acronyms
            ("PAC (Sugars)", CompKey::PACsgr),
            ("Hardness Factor", CompKey::HF),
            ("Alcohol by Volume", CompKey::ABV),
            // keys unchanged from as_med_str
            ("Milk Fat", CompKey::MilkFat),
        ];
        for (expected, key) in some_expected {
            assert_eq!(key.as_long_str(), expected);
        }
    }

    #[test]
    fn comp_keys_all_str_non_empty() {
        for key in CompKey::iter() {
            assert_false!(key.as_short_str().is_empty());
            assert_false!(key.as_med_str().is_empty());
            assert_false!(key.as_long_str().is_empty());
        }
    }

    #[test]
    fn ratio_keys_as_short_str() {
        let expected = vec![
            ("Abs.PAC", RatioKey::AbsPAC),
            ("Emul./Fat", RatioKey::EmulsifiersPerFat),
            ("Stab./Water", RatioKey::StabilizersPerWater),
        ];
        for (expected, key) in expected {
            assert_eq!(key.as_short_str(), expected);
        }
    }

    #[test]
    fn ratio_keys_as_med_str() {
        let expected = vec![
            ("Abs.PAC", RatioKey::AbsPAC),
            ("Emulsifiers/Fat", RatioKey::EmulsifiersPerFat),
            ("Stabilizers/Water", RatioKey::StabilizersPerWater),
        ];
        for (expected, key) in expected {
            assert_eq!(key.as_med_str(), expected);
        }
    }

    #[test]
    fn ratio_keys_as_long_str() {
        assert_eq!(RatioKey::AbsPAC.as_long_str(), "Absolute PAC");
        assert_eq!(RatioKey::EmulsifiersPerFat.as_long_str(), "Emulsifiers/Fat");
        assert_eq!(RatioKey::StabilizersPerWater.as_long_str(), "Stabilizers/Water");
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
    fn prop_keys_as_short_str() {
        assert_eq!(PropKey::Comp(CompKey::CarboxymethylCellulose).as_short_str(), "CMC");
        assert_eq!(PropKey::Fpd(FpdKey::ServingTemp).as_short_str(), "Serving Temp");
    }

    #[test]
    fn prop_keys_as_med_str() {
        assert_eq!(PropKey::Comp(CompKey::MilkFat).as_med_str(), "Milk Fat");
        assert_eq!(PropKey::Fpd(FpdKey::FPD).as_med_str(), "FPD");
    }

    #[test]
    fn prop_keys_as_long_str() {
        assert_eq!(PropKey::Comp(CompKey::TotalFats).as_long_str(), "Total Fats");
        assert_eq!(PropKey::Fpd(FpdKey::FPD).as_long_str(), "Freezing Point Depression");
    }

    #[test]
    fn balancing_issue_display_message_dominance_violation() {
        // A single "lesser" key uses the pairwise wording.
        let dominance = BalancingIssue::DominanceViolation {
            lesser: vec![CompKey::Sucrose.into()],
            greater: CompKey::TotalSugars.into(),
            lesser_target_sum: 20.0,
            greater_target: 15.0,
        };
        let text = dominance.to_string();
        assert_true!(text.contains("Sucrose"));
        assert_true!(text.contains("Sugars"));
        assert_true!(text.contains("exceeds"));
    }

    #[test]
    fn balancing_issue_display_message_grouped_dominance_violation() {
        // Several "lesser" keys use the additive (summing) wording.
        let additive = BalancingIssue::DominanceViolation {
            lesser: vec![CompKey::Sucrose.into(), CompKey::Fructose.into()],
            greater: CompKey::TotalSugars.into(),
            lesser_target_sum: 20.0,
            greater_target: 15.0,
        };
        let text = additive.to_string();
        assert_true!(text.contains("'Sucrose' + 'Fructose'"));
        assert_true!(text.contains("sum to"));
        assert_true!(text.contains("Sugars"));
    }

    #[test]
    fn balancing_issue_display_message_ratio_infeasibility() {
        let ratio = BalancingIssue::RatioInfeasibility {
            numerator: vec![CompKey::CocoaButter.into()],
            denominator: CompKey::CocoaSolids.into(),
            target_ratio: 0.5,
            min_ratio: 0.2,
            max_ratio: 0.2,
        };
        let text = ratio.to_string();
        assert_true!(text.contains("Cocoa Butter"));
        assert_true!(text.contains("range"));
    }

    #[test]
    fn balancing_issue_display_message_ratio_infeasibility_infinite_upper() {
        // An unbounded-above band renders the upper bound as ∞ rather than a number.
        let ratio = BalancingIssue::RatioInfeasibility {
            numerator: vec![CompKey::CocoaButter.into()],
            denominator: CompKey::CocoaSolids.into(),
            target_ratio: 0.0,
            min_ratio: 1.0,
            max_ratio: f64::INFINITY,
        };
        assert_true!(ratio.to_string().contains('∞'));
    }

    #[test]
    fn balancing_issue_display_message_ratio_infeasibility_multi_key_numerator() {
        // join_keys renders multiple numerator keys with " + " between them.
        let ratio = BalancingIssue::RatioInfeasibility {
            numerator: vec![CompKey::MilkFat.into(), CompKey::CocoaButter.into()],
            denominator: CompKey::TotalFats.into(),
            target_ratio: 0.9,
            min_ratio: 0.2,
            max_ratio: 0.8,
        };
        let text = ratio.to_string();
        assert_true!(text.contains("Milk Fat"));
        assert_true!(text.contains("Cocoa Butter"));
        assert_true!(text.contains('+'));
    }

    #[test]
    fn balancing_issue_display_message_structural_dominance_violation() {
        let structural = BalancingIssue::StructuralViolation {
            parts: vec![CompKey::MilkFat.into()],
            whole: CompKey::TotalFats.into(),
            parts_target_sum: 20.0,
            whole_target: 15.0,
        };
        let text = structural.to_string();
        assert_true!(text.contains("Milk Fat"));
        assert_true!(text.contains("part of"));
    }

    #[test]
    fn balancing_issue_display_message_rollup_sum_mismatch() {
        let mismatch = BalancingIssue::RollupSumMismatch {
            whole: CompKey::MilkSolids.into(),
            parts: vec![CompKey::MilkFat.into(), CompKey::MSNF.into()],
            parts_target_sum: 15.0,
            whole_target: 20.0,
        };
        let text = mismatch.to_string();
        assert_true!(text.contains("inconsistent"));
        assert_true!(text.contains("'Milk Fat' + 'MSNF'"));
    }

    #[test]
    fn round2_drops_trailing_zeros_and_handles_infinity() {
        assert_eq!(round2(20.0), "20"); // "20.00" → "20"
        assert_eq!(round2(0.4), "0.4"); // "0.40" → "0.4"
        assert_eq!(round2(15.25), "15.25"); // already two decimals, unchanged
        assert_eq!(round2(16.666), "16.67"); // rounds to two decimals
        assert_eq!(round2(f64::INFINITY), "∞");
    }

    #[test]
    fn balancing_issue_display_message_over_determined() {
        let issue = BalancingIssue::OverDetermined {
            target_count: 4,
            ingredient_count: 3,
        };
        let text = issue.to_string();
        assert_true!(text.contains("4 targets"));
        assert_true!(text.contains("compromise"));
    }

    #[test]
    fn balancing_issue_display_message_negative_target() {
        let text = BalancingIssue::NegativeTarget {
            key: CompKey::MilkFat.into(),
            value: -5.0,
        }
        .to_string();
        assert_true!(text.contains(CompKey::MilkFat.as_med_str()));
        assert_true!(text.contains("negative"));
    }

    #[test]
    fn balancing_report_display_lists_issues() {
        let report = BalancingReport {
            issues: vec![
                BalancingIssue::DuplicateTarget {
                    key: RatioKey::AbsPAC.into(),
                },
                BalancingIssue::UnaffectableTarget {
                    key: CompKey::Alcohol.into(),
                },
            ],
        };
        let text = report.to_string();
        assert_true!(text.contains("[error]"));
        assert_true!(text.contains("[warning]"));
    }

    #[test]
    fn balancing_report_display_labels_information() {
        let report = BalancingReport {
            issues: vec![BalancingIssue::OverDetermined {
                target_count: 4,
                ingredient_count: 3,
            }],
        };
        assert_true!(report.to_string().contains("[information]"));
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
