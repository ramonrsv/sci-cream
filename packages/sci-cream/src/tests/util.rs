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

/// Per-key ceilings for [`assert_compositions_consistent`].
///
/// A single default ceiling applies to every comparable keys list entry, with optional
/// per-key overrides for components known to diverge more widely between data sources.
pub(crate) struct CompCeiling {
    default_percent: f64,
    overrides: Vec<(CompKey, f64)>,
}

impl CompCeiling {
    /// Creates a ceiling where every key allows up to `default_percent` difference.
    pub(crate) const fn new(default_percent: f64) -> Self {
        Self {
            default_percent,
            overrides: Vec::new(),
        }
    }

    /// Overrides the ceiling for a single key, e.g. for a component with known wide variance.
    #[must_use]
    pub(crate) fn with(mut self, key: CompKey, percent: f64) -> Self {
        self.overrides.push((key, percent));
        self
    }

    /// Returns the ceiling percentage that applies to `key`.
    fn for_key(&self, key: CompKey) -> f64 {
        self.overrides
            .iter()
            .find(|(overridden, _)| *overridden == key)
            .map_or(self.default_percent, |(_, percent)| *percent)
    }
}

/// Asserts that several compositions of the same conceptual ingredient agree within a ceiling.
///
/// Every pair of `sources` (a `(label, composition)` slice) is compared across `keys`; a key whose
/// symmetric relative difference exceeds its [`CompCeiling`] entry fails the assertion. This is a
/// deliberately loose backstop against regressions — the precise per-key discrepancies are
/// recorded separately by [`compare_compositions`] snapshots.
pub(crate) fn assert_compositions_consistent(sources: &[(&str, Composition)], keys: &[CompKey], ceiling: &CompCeiling) {
    for &key in keys {
        let limit = ceiling.for_key(key);

        for (index, (label_a, comp_a)) in sources.iter().enumerate() {
            for (label_b, comp_b) in &sources[index + 1..] {
                let diff = relative_diff_percent(comp_a.get(key), comp_b.get(key));
                assert_true!(
                    diff <= limit,
                    "Composition values for {:?} differ by {:.2}% between {} and {} (ceiling {:.2}%)",
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
/// For each source pair the report lists the symmetric relative difference of every `keys` entry.
/// It is intended to be captured by an `insta` snapshot so discrepancies stay documented and are
/// reviewed when the underlying ingredients data changes.
pub(crate) fn compare_compositions(sources: &[(&str, Composition)], keys: &[CompKey]) -> String {
    let labels: Vec<&str> = sources.iter().map(|(label, _)| *label).collect();
    let mut lines = vec![format!("sources: {}", labels.join(", "))];

    for (index, (label_a, comp_a)) in sources.iter().enumerate() {
        for (label_b, comp_b) in &sources[index + 1..] {
            lines.push(String::new());
            for &key in keys {
                let key_name = format!("{key:?}");
                let diff = relative_diff_percent(comp_a.get(key), comp_b.get(key));
                lines.push(format!("{key_name:<14} {diff:>6.2}%  ({label_a} vs {label_b})"));
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
        assert_f64_fields_ne_zero, compare_compositions, relative_diff_percent,
    };
    use crate::composition::{CompKey, Composition};
    use crate::tests::asserts::{assert_eq_flt_test, assert_true};

    #[derive(Iterable)]
    struct TwoFields {
        a: f64,
        b: f64,
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
        let a = Composition::new().energy(100.0).pod(10.0);
        let b = Composition::new().energy(105.0).pod(10.5);
        let sources = [("A", a), ("B", b)];
        assert_compositions_consistent(&sources, &[CompKey::Energy, CompKey::POD], &CompCeiling::new(25.0));
    }

    #[test]
    fn assert_compositions_consistent_passes_for_three_sources() {
        let a = Composition::new().energy(100.0).pod(10.0);
        let b = Composition::new().energy(105.0).pod(10.5);
        let c = Composition::new().energy(98.0).pod(9.8);
        let sources = [("A", a), ("B", b), ("C", c)];
        assert_compositions_consistent(&sources, &[CompKey::Energy, CompKey::POD], &CompCeiling::new(25.0));
    }

    #[test]
    #[should_panic(expected = "differ by")]
    fn assert_compositions_consistent_panics_above_ceiling() {
        let a = Composition::new().energy(100.0);
        let b = Composition::new().energy(200.0);
        let sources = [("A", a), ("B", b)];
        assert_compositions_consistent(&sources, &[CompKey::Energy], &CompCeiling::new(25.0));
    }

    #[test]
    #[should_panic(expected = "differ by")]
    fn assert_compositions_consistent_checks_non_adjacent_pairs() {
        // A-B (20%) and B-C (~21.9%) are within the 25% ceiling; only the non-adjacent A-C
        // pair (37.5%) exceeds it, so it must still be compared.
        let a = Composition::new().energy(100.0);
        let b = Composition::new().energy(125.0);
        let c = Composition::new().energy(160.0);
        let sources = [("A", a), ("B", b), ("C", c)];
        assert_compositions_consistent(&sources, &[CompKey::Energy], &CompCeiling::new(25.0));
    }

    #[test]
    fn assert_compositions_consistent_honors_per_key_override() {
        let a = Composition::new().energy(100.0);
        let b = Composition::new().energy(200.0);
        let sources = [("A", a), ("B", b)];
        // The 50% difference would fail the 25% default, but the per-key override permits it.
        let ceiling = CompCeiling::new(25.0).with(CompKey::Energy, 60.0);
        assert_compositions_consistent(&sources, &[CompKey::Energy], &ceiling);
    }

    // --- compare_compositions ---

    #[test]
    fn compare_compositions_lists_header_and_every_key() {
        let a = Composition::new().energy(100.0).pod(10.0);
        let b = Composition::new().energy(100.0).pod(10.0);
        let report = compare_compositions(&[("A", a), ("B", b)], &[CompKey::Energy, CompKey::POD]);
        assert_true!(report.contains("sources: A, B"));
        assert_true!(report.contains("Energy"));
        assert_true!(report.contains("POD"));
    }

    #[test]
    fn compare_compositions_lists_pair_even_when_values_match() {
        let a = Composition::new().energy(100.0);
        let b = Composition::new().energy(100.0);
        let report = compare_compositions(&[("A", a), ("B", b)], &[CompKey::Energy]);
        // Identical values still produce a line, reported as a 0.00% difference.
        assert_true!(report.contains("(A vs B)"));
        assert_true!(report.contains("0.00%"));
    }

    #[test]
    fn compare_compositions_annotates_pair_when_values_differ() {
        let a = Composition::new().energy(100.0);
        let b = Composition::new().energy(110.0);
        let report = compare_compositions(&[("A", a), ("B", b)], &[CompKey::Energy]);
        assert_true!(report.contains("(A vs B)"));
    }

    #[test]
    fn compare_compositions_lists_every_source_pair() {
        let a = Composition::new().energy(100.0);
        let b = Composition::new().energy(105.0);
        let c = Composition::new().energy(200.0);
        let report = compare_compositions(&[("A", a), ("B", b), ("C", c)], &[CompKey::Energy]);
        // All three combinations of the three sources are reported, not just the widest.
        assert_true!(report.contains("(A vs B)"));
        assert_true!(report.contains("(A vs C)"));
        assert_true!(report.contains("(B vs C)"));
    }
}
