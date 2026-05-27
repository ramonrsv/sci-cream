//! Miscellaneous utility functions used in tests across the codebase.

use approx::AbsDiffEq;
use struct_iterable::Iterable;

use crate::{
    composition::{CompKey, Composition},
    util::iter_fields_as,
};

use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
use crate::tests::asserts::*;

/// Asserts that two composition values for a key are equal within a given percentage tolerance.
pub(crate) fn assert_comp_eq_percent(lhs: &Composition, rhs: &Composition, key: CompKey, tolerance_percent: f64) {
    let lhs = lhs.get(key);
    let rhs = rhs.get(key);
    let tolerance = lhs * tolerance_percent / 100.0;

    assert_true!(
        lhs.abs_diff_eq(&rhs, tolerance),
        "Composition values for {:?} differ by {:.2}% (max allowed {:.2}%)",
        key,
        ((lhs - rhs).abs() / lhs) * 100.0,
        tolerance_percent
    );
}

/// Asserts that all fields of an [`Iterable`] downcast to [`f64`] are equal to zero
pub(crate) fn assert_f64_fields_eq_zero<T: Iterable>(iterable: &T) {
    #[allow(clippy::float_cmp)] // We want to check for exact equality after init
    for field in iter_fields_as::<f64, _>(iterable) {
        assert_eq!(field, &0.0);
    }
}

/// Asserts that all fields of an [`Iterable`] downcast to [`f64`] are not equal to zero
pub(crate) fn assert_f64_fields_ne_zero<T: Iterable>(iterable: &T) {
    #[allow(clippy::float_cmp)] // We want to check for exact (in)equality after init
    for field in iter_fields_as::<f64, _>(iterable) {
        assert_ne!(field, &0.0);
    }
}

/// Symmetric relative difference between two values, as a percentage.
///
/// The larger magnitude is used as the denominator so the result does not depend on argument
/// order, and so that a zero on one side yields a finite (100%) difference rather than infinity.
/// Two exact zeroes are treated as a 0% difference.
pub(crate) fn relative_diff_percent(lhs: f64, rhs: f64) -> f64 {
    let denominator = lhs.abs().max(rhs.abs());

    #[allow(clippy::float_cmp)] // An exact zero denominator is the only degenerate case to guard
    if denominator == 0.0 {
        0.0
    } else {
        (lhs - rhs).abs() / denominator * 100.0
    }
}

/// Difference between two component values expressed as percentage points of each source's total
/// solids — a proxy for "how different will the resulting ice cream mix composition be if I
/// substitute one source for the other while dosing each to the same solids contribution."
///
/// `lhs` / `rhs` are per-100g-of-product values; `ts_lhs` / `ts_rhs` are per-100g-of-product
/// [`CompKey::TotalSolids`]. The output is `|lhs/ts_lhs − rhs/ts_rhs| × 100`, in percentage
/// points of solids composition. For keys that aren't components-of-solids
/// ([`CompKey::TotalSolids`] itself, [`CompKey::Water`]), pass the raw 100.0 as the TS values so
/// the function degenerates to a direct percentage-point diff.
///
/// A zero [`CompKey::TotalSolids`] on either side is treated as a zero solids fraction.
pub(crate) fn solids_fraction_diff_pp(lhs: f64, ts_lhs: f64, rhs: f64, ts_rhs: f64) -> f64 {
    #[allow(clippy::float_cmp)] // Exact zero TS is the only degenerate case to guard
    let frac_lhs = if ts_lhs == 0.0 { 0.0 } else { lhs / ts_lhs };
    #[allow(clippy::float_cmp)]
    let frac_rhs = if ts_rhs == 0.0 { 0.0 } else { rhs / ts_rhs };
    (frac_lhs - frac_rhs).abs() * 100.0
}

/// Returns the appropriate total solids "denominator" for solids-fraction comparison of `key`.
///
/// For component-of-solids keys (every fat, sugar, protein, mineral, derived value, etc.), this
/// returns the composition's [`CompKey::TotalSolids`]. For keys that are already in
/// "fraction of whole product" units ([`CompKey::TotalSolids`] itself, [`CompKey::Water`]), it
/// returns 100, which makes [`solids_fraction_diff_pp`] degenerate into a direct percentage-point
/// comparison. [`CompKey::Energy`] is divided by [`CompKey::TotalSolids`] too — the resulting
/// "kcal per gram of solids" is the natural concentration unit.
fn solids_denominator_for(key: CompKey, comp: &Composition) -> f64 {
    match key {
        CompKey::TotalSolids | CompKey::Water => 100.0,
        _ => comp.get(CompKey::TotalSolids),
    }
}

/// Per-key ceilings for [`assert_compositions_consistent`], expressed in percentage points of
/// solids composition (matching [`solids_fraction_diff_pp`]).
///
/// A single default ceiling applies to every comparable keys list entry, with optional
/// per-key overrides for components known to diverge more widely between data sources.
pub(crate) struct CompCeiling {
    default_pp: f64,
    overrides: Vec<(CompKey, f64)>,
}

impl CompCeiling {
    /// Creates a ceiling where every key allows up to `default_pp` difference, in percentage
    /// points of solids composition.
    pub(crate) const fn new(default_pp: f64) -> Self {
        Self {
            default_pp,
            overrides: Vec::new(),
        }
    }

    /// Overrides the ceiling for a single key, e.g. for a component with known wide variance.
    #[must_use]
    pub(crate) fn with(mut self, key: CompKey, pp: f64) -> Self {
        self.overrides.push((key, pp));
        self
    }

    /// Returns the ceiling, in percentage points of solids composition, that applies to `key`.
    fn for_key(&self, key: CompKey) -> f64 {
        self.overrides
            .iter()
            .find(|(overridden, _)| *overridden == key)
            .map_or(self.default_pp, |(_, pp)| *pp)
    }
}

/// Asserts that several compositions of the same conceptual ingredient agree within a ceiling.
///
/// Every pair of `sources` (a `(label, composition)` slice) is compared across `keys`; a key
/// whose [`solids_fraction_diff_pp`] (in percentage points of each source's solids composition)
/// exceeds its [`CompCeiling`] entry fails the assertion. This is a deliberately loose backstop
/// against regressions — the precise per-key discrepancies are recorded separately by
/// [`compare_compositions`] snapshots.
pub(crate) fn assert_compositions_consistent(sources: &[(&str, Composition)], keys: &[CompKey], ceiling: &CompCeiling) {
    for &key in keys {
        let limit = ceiling.for_key(key);

        for (index, (label_a, comp_a)) in sources.iter().enumerate() {
            for (label_b, comp_b) in &sources[index + 1..] {
                let diff = solids_fraction_diff_pp(
                    comp_a.get(key),
                    solids_denominator_for(key, comp_a),
                    comp_b.get(key),
                    solids_denominator_for(key, comp_b),
                );
                assert_true!(
                    diff <= limit,
                    "Composition values for {:?} differ by {:.2} pp of solids between {} and {} (ceiling {:.2} pp)",
                    key,
                    diff,
                    label_a,
                    label_b,
                    limit
                );
            }
        }
    }
}

/// Builds a deterministic, human-readable report of per-key discrepancies between `sources`.
///
/// For each source pair the report lists the [`solids_fraction_diff_pp`] of every `keys` entry —
/// in percentage points of each source's [`CompKey::TotalSolids`] composition. It is intended to
/// be captured by an `insta` snapshot so discrepancies stay documented and are reviewed when the
/// underlying ingredients data changes.
pub(crate) fn compare_compositions(sources: &[(&str, Composition)], keys: &[CompKey]) -> String {
    let labels: Vec<&str> = sources.iter().map(|(label, _)| *label).collect();
    let mut lines = vec![format!("sources: {}", labels.join(", "))];

    for (index, (label_a, comp_a)) in sources.iter().enumerate() {
        for (label_b, comp_b) in &sources[index + 1..] {
            lines.push(String::new());
            for &key in keys {
                let key_name = format!("{key:?}");
                let diff = solids_fraction_diff_pp(
                    comp_a.get(key),
                    solids_denominator_for(key, comp_a),
                    comp_b.get(key),
                    solids_denominator_for(key, comp_b),
                );
                lines.push(format!("{key_name:<14} {diff:>6.2} pp  ({label_a} vs {label_b})"));
            }
        }
    }

    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use struct_iterable::Iterable;

    use super::{
        CompCeiling, assert_comp_eq_percent, assert_compositions_consistent, assert_f64_fields_eq_zero,
        assert_f64_fields_ne_zero, compare_compositions, relative_diff_percent, solids_fraction_diff_pp,
    };
    use crate::composition::{CompKey, Composition, Solids, SolidsBreakdown};
    use crate::tests::asserts::{assert_eq_flt_test, assert_true};

    #[derive(Iterable)]
    struct TwoFields {
        a: f64,
        b: f64,
    }

    /// Builds a stub composition with a target [`CompKey::TotalSolids`] by putting all of it
    /// under `milk.proteins`. Used by the assertion tests below where the value of
    /// [`CompKey::TotalSolids`] itself is what's being compared (so the metric reduces to a
    /// direct percentage-point diff).
    fn comp_ts(ts: f64) -> Composition {
        Composition::new().solids(Solids::new().milk(SolidsBreakdown::new().proteins(ts)))
    }

    // --- relative_diff_percent ---

    #[test]
    fn relative_diff_percent_is_zero_for_equal_values() {
        assert_eq_flt_test!(relative_diff_percent(50.0, 50.0), 0.0);
    }

    #[test]
    fn relative_diff_percent_treats_two_zeroes_as_zero() {
        assert_eq_flt_test!(relative_diff_percent(0.0, 0.0), 0.0);
    }

    #[test]
    fn relative_diff_percent_uses_larger_magnitude_as_denominator() {
        // An absolute difference of 10 over a larger magnitude of 110.
        assert_eq_flt_test!(relative_diff_percent(100.0, 110.0), 10.0 / 110.0 * 100.0);
    }

    #[test]
    fn relative_diff_percent_is_independent_of_argument_order() {
        assert_eq_flt_test!(relative_diff_percent(100.0, 110.0), relative_diff_percent(110.0, 100.0));
    }

    #[test]
    fn relative_diff_percent_is_100_when_one_side_is_zero() {
        assert_eq_flt_test!(relative_diff_percent(0.0, 5.0), 100.0);
        assert_eq_flt_test!(relative_diff_percent(5.0, 0.0), 100.0);
    }

    // --- solids_fraction_diff_pp ---

    #[test]
    fn solids_fraction_diff_pp_is_zero_for_equal_fractions() {
        // Same value at same TS → 0; same fraction at different absolute values also → 0.
        assert_eq_flt_test!(solids_fraction_diff_pp(5.0, 10.0, 5.0, 10.0), 0.0);
        assert_eq_flt_test!(solids_fraction_diff_pp(5.0, 10.0, 50.0, 100.0), 0.0);
    }

    #[test]
    fn solids_fraction_diff_pp_reports_fraction_gap_times_100() {
        // 0.5 / 10 - 0.4 / 10 = 0.01 fraction gap → 1.00 pp
        assert_eq_flt_test!(solids_fraction_diff_pp(0.5, 10.0, 0.4, 10.0), 1.0);
    }

    #[test]
    fn solids_fraction_diff_pp_is_independent_of_argument_order() {
        let forward = solids_fraction_diff_pp(0.5, 10.0, 0.4, 10.0);
        let reverse = solids_fraction_diff_pp(0.4, 10.0, 0.5, 10.0);
        assert_eq_flt_test!(forward, reverse);
    }

    #[test]
    fn solids_fraction_diff_pp_tames_near_zero_degeneracy() {
        // Old relative metric reports 100% for 0 vs 0.08; the solids-fraction view at TS=9
        // correctly says "0.89 pp of solids" — small, as it should be.
        assert_eq_flt_test!(solids_fraction_diff_pp(0.0, 9.0, 0.08, 9.0), 0.08 / 9.0 * 100.0);
    }

    #[test]
    fn solids_fraction_diff_pp_treats_zero_ts_as_zero_fraction() {
        // Guards against div-by-zero; a source with zero TotalSolids contributes 0 to the
        // solids fraction, so the diff is the other side's fraction.
        assert_eq_flt_test!(solids_fraction_diff_pp(0.0, 0.0, 5.0, 50.0), 10.0);
        assert_eq_flt_test!(solids_fraction_diff_pp(5.0, 50.0, 0.0, 0.0), 10.0);
        assert_eq_flt_test!(solids_fraction_diff_pp(0.0, 0.0, 0.0, 0.0), 0.0);
    }

    // --- CompCeiling ---

    #[test]
    fn comp_ceiling_returns_default_for_unoverridden_key() {
        assert_eq_flt_test!(CompCeiling::new(25.0).for_key(CompKey::Energy), 25.0);
    }

    #[test]
    fn comp_ceiling_override_applies_only_to_its_key() {
        let ceiling = CompCeiling::new(25.0).with(CompKey::MilkProteins, 60.0);
        assert_eq_flt_test!(ceiling.for_key(CompKey::MilkProteins), 60.0);
        assert_eq_flt_test!(ceiling.for_key(CompKey::Energy), 25.0);
    }

    // --- assert_comp_eq_percent ---

    #[test]
    fn assert_comp_eq_percent_passes_within_tolerance() {
        let lhs = Composition::new().energy(100.0);
        let rhs = Composition::new().energy(105.0);
        // A 5% difference, allowed up to 10%.
        assert_comp_eq_percent(&lhs, &rhs, CompKey::Energy, 10.0);
    }

    #[test]
    #[should_panic(expected = "differ by")]
    fn assert_comp_eq_percent_panics_outside_tolerance() {
        let lhs = Composition::new().energy(100.0);
        let rhs = Composition::new().energy(130.0);
        // A 30% difference, allowed only 10%.
        assert_comp_eq_percent(&lhs, &rhs, CompKey::Energy, 10.0);
    }

    // --- assert_f64_fields_eq_zero / assert_f64_fields_ne_zero ---

    #[test]
    fn assert_f64_fields_eq_zero_passes_when_all_fields_zero() {
        assert_f64_fields_eq_zero(&TwoFields { a: 0.0, b: 0.0 });
    }

    #[test]
    #[should_panic(expected = "assertion failed")]
    fn assert_f64_fields_eq_zero_panics_on_nonzero_field() {
        assert_f64_fields_eq_zero(&TwoFields { a: 0.0, b: 1.0 });
    }

    #[test]
    fn assert_f64_fields_ne_zero_passes_when_all_fields_nonzero() {
        assert_f64_fields_ne_zero(&TwoFields { a: 1.0, b: 2.0 });
    }

    #[test]
    #[should_panic(expected = "assertion failed")]
    fn assert_f64_fields_ne_zero_panics_on_zero_field() {
        assert_f64_fields_ne_zero(&TwoFields { a: 1.0, b: 0.0 });
    }

    // --- assert_compositions_consistent ---

    #[test]
    fn assert_compositions_consistent_passes_within_ceiling() {
        // 10pp vs 12pp TotalSolids → 2 pp diff, well within the 25 pp ceiling.
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(12.0))];
        assert_compositions_consistent(&sources, &[CompKey::TotalSolids], &CompCeiling::new(25.0));
    }

    #[test]
    fn assert_compositions_consistent_passes_for_three_sources() {
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(12.0)), ("C", comp_ts(8.0))];
        assert_compositions_consistent(&sources, &[CompKey::TotalSolids], &CompCeiling::new(25.0));
    }

    #[test]
    #[should_panic(expected = "differ by")]
    fn assert_compositions_consistent_panics_above_ceiling() {
        // 10 vs 40 → 30 pp diff, exceeds the 25 pp ceiling.
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(40.0))];
        assert_compositions_consistent(&sources, &[CompKey::TotalSolids], &CompCeiling::new(25.0));
    }

    #[test]
    #[should_panic(expected = "differ by")]
    fn assert_compositions_consistent_checks_non_adjacent_pairs() {
        // A-B (12.5 pp) and B-C (20 pp) are within the 25 pp ceiling; only the non-adjacent A-C
        // pair (32.5 pp) exceeds it, so it must still be compared.
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(22.5)), ("C", comp_ts(42.5))];
        assert_compositions_consistent(&sources, &[CompKey::TotalSolids], &CompCeiling::new(25.0));
    }

    #[test]
    fn assert_compositions_consistent_honors_per_key_override() {
        // 50 pp difference would fail the 25 pp default, but the per-key override permits it.
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(60.0))];
        let ceiling = CompCeiling::new(25.0).with(CompKey::TotalSolids, 60.0);
        assert_compositions_consistent(&sources, &[CompKey::TotalSolids], &ceiling);
    }

    // --- compare_compositions ---

    #[test]
    fn compare_compositions_lists_header_and_every_key() {
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(10.0))];
        let report = compare_compositions(&sources, &[CompKey::TotalSolids, CompKey::Water]);
        assert_true!(report.contains("sources: A, B"));
        assert_true!(report.contains("TotalSolids"));
        assert_true!(report.contains("Water"));
    }

    #[test]
    fn compare_compositions_lists_pair_even_when_values_match() {
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(10.0))];
        let report = compare_compositions(&sources, &[CompKey::TotalSolids]);
        // Identical values still produce a line, reported as a 0.00 pp difference.
        assert_true!(report.contains("(A vs B)"));
        assert_true!(report.contains("0.00 pp"));
    }

    #[test]
    fn compare_compositions_annotates_pair_when_values_differ() {
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(15.0))];
        let report = compare_compositions(&sources, &[CompKey::TotalSolids]);
        assert_true!(report.contains("(A vs B)"));
    }

    #[test]
    fn compare_compositions_lists_every_source_pair() {
        let sources = [("A", comp_ts(10.0)), ("B", comp_ts(12.0)), ("C", comp_ts(20.0))];
        let report = compare_compositions(&sources, &[CompKey::TotalSolids]);
        // All three combinations of the three sources are reported, not just the widest.
        assert_true!(report.contains("(A vs B)"));
        assert_true!(report.contains("(A vs C)"));
        assert_true!(report.contains("(B vs C)"));
    }
}
