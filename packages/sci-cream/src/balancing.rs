//! Utilities for balancing compositions to match target values for specified keys, usually by
//! solving a least squares problem, through [`nalgebra`] SVD, [`mod@nnls`] non-negative, etc.
//!
//! For example, for [3.25% Milk, 40 % Cream, Skimmed Powder] and target [Milk Fat, MSNF].
//!
//! We want to solve the least squares problem for:
//!
//!   [3.25, 40,    0]   \[x1\]   \[16\]  // Milk Fat
//!   [8.71,  5.4, 97] * \[x2\] = \[11\]  // MSNF
//!   [1,     1,    1]   \[x3\]    \[1\]  // Total sums to 100%
//!
//! Where x1, x2, x3 are the amounts of each composition/ingredient to use.
//!
//! @todo This is a work in progress, and the API and implementation may change significantly in the
//! near future. For now, it's mostly intended for benchmarking and testing different approaches.

use nalgebra::{DMatrix, DVector, SVD};
use ndarray::{Array1, Array2};
use nnls::nnls;
use strum::IntoEnumIterator;

use crate::{
    composition::{CompKey, Composition},
    error::{Error, Result},
};

/// Balances the given compositions to match target values for the specified keys, using nalgebra
///
/// This function solves the least squares problem to find the optimal combination of the given
/// compositions that matches the target values for the specified keys. It returns a vector of
/// compositions and their corresponding amounts in the balanced combination, normalized to sum 1.
///
/// **Note**: This function does not enforce non-negativity constraints on the amounts, so it may
/// return negative values. If non-negativity is required, consider using
/// [`balance_compositions_nnls`] instead.
///
/// # Errors
///
/// Returns an error if the least squares problem cannot be solved, e.g. due to incompatible
/// compositions and targets, numerical issues, etc.
pub fn balance_compositions_nalgebra(
    comps: &[Composition],
    targets: &[(CompKey, f64)],
) -> Result<Vec<(Composition, f64)>> {
    let flat_a = make_matrix_a(comps, targets);
    let flat_y = make_vector_y(targets);

    let a = DMatrix::from_row_slice(targets.len() + 1, comps.len(), &flat_a);
    let y = DVector::from_vec(flat_y);

    let svd = SVD::new(a, true, true);

    let x = svd
        .solve(&y, 1e-10)
        .map_err(|e| Error::FailedToBalanceCompositions(e.to_string()))?;

    Ok(x.iter().enumerate().map(|(i, amount)| (comps[i], *amount)).collect())
}

/// Balances the given compositions to match target values for the specified keys, using nnls
///
/// This function solves the non-negative least squares problem to find the optimal combination of
/// the given compositions that matches the target values for the specified keys. It returns a
/// vector of compositions and their corresponding amounts, normalized to sum 1.
///
/// # Errors
///
/// Returns an error if the non-negative least squares problem cannot be solved, e.g. due to
/// incompatible compositions and targets, numerical issues, etc.
pub fn balance_compositions_nnls(comps: &[Composition], targets: &[(CompKey, f64)]) -> Result<Vec<(Composition, f64)>> {
    let a = Array2::from_shape_vec((targets.len() + 1, comps.len()), make_matrix_a(comps, targets))
        .map_err(|e| Error::FailedToBalanceCompositions(e.to_string()))?;

    let y = Array1::from_vec(make_vector_y(targets));

    let (x, _residual) = nnls(a.view(), y.view());

    Ok(x.iter().enumerate().map(|(i, amount)| (comps[i], *amount)).collect())
}

/// Helper function to construct the matrix A for the least squares problem
///
/// Each row corresponds to a target key in `targets`, the last row corresponds to the total sum
/// constraint, and each column corresponds to a composition in `comps`.
///
/// [3.25, 40,    0]
/// [8.71,  5.4, 97]
/// [1,     1,    1]
fn make_matrix_a(comps: &[Composition], targets: &[(CompKey, f64)]) -> Vec<f64> {
    targets
        .iter()
        .flat_map(|t| comps.iter().map(|comp| comp.get(t.0)))
        .chain(std::iter::repeat_n(1.0, comps.len()))
        .collect::<Vec<_>>()
}

/// Helper function to construct the matrix Y for the least squares problem
///
/// Each element corresponds to a target value for the specified keys in `targets`, and the last
/// element corresponds to the total sum constraint.
///
/// \[16\]  // Milk Fat
/// \[11\]  // MSNF
///  \[1\]  // Total sums to 100%
fn make_vector_y(targets: &[(CompKey, f64)]) -> Vec<f64> {
    targets
        .iter()
        .map(|(_, amount)| *amount)
        .chain(std::iter::once(1.0))
        .collect::<Vec<_>>()
}

/// Returns true if the given [`CompKey`] is a ratio key, e.g. [`CompKey::AbsPAC`], etc.
#[must_use]
pub const fn is_ratio_key(key: CompKey) -> bool {
    matches!(key, CompKey::AbsPAC | CompKey::StabilizersPerWater | CompKey::EmulsifiersPerFat)
}

/// The [`CompKey`]s that can be used as balancing targets, i.e. every key except ratio keys.
///
/// Ratio keys cannot be balanced directly, because they are a ratio of two other extensive keys,
/// and so are not expressed as a weighted sum of the per-ingredient values, a requirement for this
/// balancing model. They can also go `f64::NAN` on a zero denominator (e.g. no water / no fat),
/// which poisons the whole SVD/NNLS solve. For now, these should simply be excluded from balancing.
///
/// @todo It should be possible to balance these keys by adding a different row for them, e.g.
/// `StabPerWater = R` es equivalent to the linear constraint `Stabilizers - R * Water = 0`, which
/// can be added as a row to the matrix A.
#[must_use]
pub fn get_balanceable_comp_keys() -> Vec<CompKey> {
    CompKey::iter().filter(|key| !is_ratio_key(*key)).collect()
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp, clippy::unwrap_used)]
mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::*;
    use crate::tests::util::{KeyCeiling, root_mean_square};

    use super::*;
    use crate::{
        database::IngredientDatabase,
        recipe::{OwnedLightRecipe, Recipe},
        resolution::IngredientGetter,
    };

    /// A balancing function pointer (e.g. [`balance_compositions_nalgebra`]).
    type SolverFn = fn(&[Composition], &[(CompKey, f64)]) -> Result<Vec<(Composition, f64)>>;

    /// A labelled balancing function, so several solvers can be run side-by-side in one report.
    type LabeledSolver = (&'static str, SolverFn);

    /// Both solvers, paired for side-by-side quality reports.
    const BOTH_SOLVERS: &[LabeledSolver] = &[
        ("nalgebra", balance_compositions_nalgebra),
        ("nnls", balance_compositions_nnls),
    ];

    /// Denominator floor for relative-error reporting, so zero / near-zero targets stay finite.
    const BALANCE_REL_FLOOR: f64 = 0.1;

    /// A shared ingredient database for all tests, seeded with embedded data
    static DATABASE: LazyLock<IngredientDatabase> = LazyLock::new(IngredientDatabase::new_seeded_from_embedded_data);

    /// Helper function to fetch an ingredient's composition from the shared [`DATABASE`] by name.
    fn comp_by_name(name: &str) -> Composition {
        DATABASE.get_ingredient_by_name(name).unwrap().composition
    }

    /// Helper function to extract compositions from a light recipe, via [`DATABASE`] lookups
    fn comps_from_light_recipe(light_recipe: &OwnedLightRecipe) -> Vec<Composition> {
        Recipe::from_light_recipe(None, light_recipe, &DATABASE)
            .unwrap()
            .lines
            .iter()
            .map(|line| line.ingredient.composition)
            .collect()
    }

    /// Helper function to extract compositions from a list of ingredient names, via [`DATABASE`]
    fn comps_from_names(names: &[&str]) -> Vec<Composition> {
        names.iter().map(|name| comp_by_name(name)).collect()
    }

    /// Helper function to extract target pairs from a Composition for specified keys
    fn get_targets_from_composition(composition: &Composition, keys: &[CompKey]) -> Vec<(CompKey, f64)> {
        keys.iter().map(|key| (*key, composition.get(*key))).collect()
    }

    /// Helper function to extract target pairs from a light recipe's calculated composition
    fn get_targets_from_light_recipe(light_recipe: &OwnedLightRecipe, keys: &[CompKey]) -> Vec<(CompKey, f64)> {
        get_targets_from_composition(
            &Recipe::from_light_recipe(None, light_recipe, &DATABASE)
                .unwrap()
                .calculate_composition()
                .unwrap(),
            keys,
        )
    }

    /// Helper function to filter a list of CompKey-value pairs to only include specified keys
    #[expect(unused)]
    fn filter_targets_for_keys(targets: &[(CompKey, f64)], keys: &[CompKey]) -> Vec<(CompKey, f64)> {
        targets.iter().filter(|(key, _)| keys.contains(key)).copied().collect()
    }

    /// The raw mix composition value for a key, summed without the renormalization that
    /// [`Composition::from_combination`] applies.
    ///
    /// This faithfully reports the amount produced by a balancing operation, trusting the raw
    /// fractions, and keeping any negative amounts a non-negativity-free solver may return.
    fn achieved_value(balanced: &[(Composition, f64)], key: CompKey) -> f64 {
        balanced.iter().map(|(comp, amount)| *amount * comp.get(key)).sum()
    }

    /// Relative error of an achieved value against its target, in percentage points.
    ///
    /// `|achieved − target| / max(|target|, FLOOR) × 100`, where `FLOOR` is
    /// [`BALANCE_REL_FLOOR`]. The floor keeps a zero target (e.g. a recipe with no cocoa or
    /// stabilizer) from producing a non-finite result.
    fn balance_rel_error_pp(achieved: f64, target: f64) -> f64 {
        (achieved - target).abs() / target.abs().max(BALANCE_REL_FLOOR) * 100.0
    }

    /// Epsilon values for different types of assertions in the balance composition tests
    ///
    /// If specified as [`None`], then tests will not check that condition at all, e.g. if `amount`
    /// is `None`, then tests will not assert that the balanced amounts sum to 1 within any epsilon.
    #[derive(Debug, Clone, Copy)]
    struct Epsilons {
        /// Epsilon for asserting composition amounts, e.g. that they sum to 1
        amount: Option<f64>,
        /// Epsilon for asserting that composition amounts are non-negative
        neg: Option<f64>,
    }

    impl Epsilons {
        /// Returns an `Epsilons` with all fields set to `None`, i.e. no assertions
        #[expect(unused)]
        fn none() -> Self {
            Self {
                amount: None,
                neg: None,
            }
        }
    }

    impl Default for Epsilons {
        fn default() -> Self {
            Self {
                amount: Some(TESTS_EPSILON),
                neg: Some(TESTS_EPSILON),
            }
        }
    }

    /// Helper function to assert that a given balancing function produces a balanced recipe within
    /// specified hard parameters, e.g. within an absolute epsilon of target values, etc.
    ///
    /// The checks are dictated by the [`Epsilons`] and [`KeyCeiling`] parameters. [`Epsilons`]
    /// controls optional amount sum, negativity, and target value assertions. If an epsilon is
    /// `None`, then that check is skipped. [`KeyCeiling`] sets the maximum allowed relative error
    /// for each key; see [`balance_rel_error_pp`].
    fn assert_balance_compositions<F>(
        comps: &[Composition],
        targets: &[(CompKey, f64)],
        solve: F,
        epsilons: Epsilons,
        ceiling: &KeyCeiling,
    ) where
        F: Fn(&[Composition], &[(CompKey, f64)]) -> Result<Vec<(Composition, f64)>>,
    {
        let balanced = solve(comps, targets).unwrap();
        assert_eq!(balanced.len(), comps.len());

        let amount_sum: f64 = balanced.iter().map(|(_, amount)| *amount).sum();
        if let Some(epsilon) = epsilons.amount {
            assert_abs_diff_eq!(amount_sum, 1.0, epsilon = epsilon);
        }

        for (idx, (_comp, amount)) in balanced.iter().enumerate() {
            if let Some(neg_epsilon) = epsilons.neg {
                assert_gt!(*amount, 0.0 - neg_epsilon, "Negative amount {:.5} for composition idx {}", amount, idx);
            }
        }

        for (key, target) in targets {
            let achieved = achieved_value(&balanced, *key);
            assert_true!(achieved.is_finite(), "Non-finite achieved value for {:?}: {}", key, achieved);

            let error = balance_rel_error_pp(achieved, *target);
            let limit = ceiling.for_key(*key);

            assert_true!(
                error <= limit,
                "Relative error for {:?} is {:.2} pp (ceiling {:.2} pp): got {:.4}, target {:.4}",
                key,
                error,
                limit,
                achieved,
                target
            );
        }
    }

    /// Builds a deterministic, human-readable balance-quality report for `insta` snapshots.
    ///
    /// Runs every solver in `solvers` against the same `comps` / `targets` and, per solver, lists
    /// each target's `target`, achieved value, and [`balance_rel_error_pp`], followed by a summary
    /// line (amount sum, negative-amount count, max and RMS relative error). A solver that errors
    /// renders a stable `FAILED` line instead of panicking, so infeasible systems still snapshot.
    fn report_balance_quality(
        comps: &[Composition],
        targets: &[(CompKey, f64)],
        solvers: &[LabeledSolver],
        names: Option<&[&str]>,
    ) -> String {
        let key_str = |key| format!("{key:?}");

        let truncate_to = |name: &str, length: usize| {
            if name.len() > length {
                format!("{}...", &name[..length - 3])
            } else {
                name.to_string()
            }
        };

        let mut lines = Vec::new();

        let header = targets
            .iter()
            .map(|(key, value)| format!("  {:<14}{value:>7.2}", key_str(key)))
            .collect::<Vec<_>>()
            .join("\n");
        lines.append(&mut vec![format!("targets:\n{header}")]);

        for (label, solve) in solvers {
            lines.push(String::new());

            let balanced = match solve(comps, targets) {
                Ok(balanced) => balanced,
                Err(error) => {
                    lines.push(format!("[{label}] FAILED: {error}"));
                    continue;
                }
            };

            lines.push(format!("[{label}]"));

            if let Some(names) = names {
                assert_eq!(names.len(), balanced.len());
                lines.push("  [           ingredient           | qty ]".to_string());
                for (name, amount) in names.iter().zip(balanced.iter().map(|(_, amount)| *amount)) {
                    lines.push(format!("  {:<31} {:>7.2}", truncate_to(name, 31), amount * 100.0));
                }
                lines.push(String::new());
            }

            lines.push("  [    key     | target | achieved |  error  ]".to_string());

            let mut errors = Vec::with_capacity(targets.len());
            for (key, target) in targets {
                let achieved = achieved_value(&balanced, *key);
                let error = balance_rel_error_pp(achieved, *target);
                errors.push(error);
                lines.push(format!("  {:<14}{target:>7.2}   {achieved:>7.2}   {error:>7.2} pp", key_str(key)));
            }

            let amounts_sum: f64 = balanced.iter().map(|(_, amount)| *amount).sum();
            let neg_count = balanced.iter().filter(|(_, amount)| *amount < 0.0).count();
            let max = errors.iter().copied().fold(0.0_f64, f64::max);
            let rms = root_mean_square(&errors);

            lines.push("\n  [    sum     |  neg. |    max    |    rms  ]".to_string());
            lines.push(format!("    {amounts_sum:>7.4}      {neg_count:>3}    {max:>7.2} pp  {rms:>7.2} pp"));
        }

        lines.join("\n")
    }

    // --- Compositions, ingredients, recipes ---

    /// Reference recipes' mix compositions are used as balancing targets to check that the
    /// balancing function can at least recover the original recipe, a basic sanity check.
    static REF_LIGHT_RECIPES: LazyLock<Vec<OwnedLightRecipe>> = LazyLock::new(|| {
        vec![
            MAIN_RECIPE_LIGHT.clone(),
            REF_A_RECIPE_LIGHT.clone(),
            REF_B_RECIPE_LIGHT.clone(),
        ]
    });

    /// Typical dairy ingredients for balancing tests, e.g. 3.25% Milk, 40% Cream, Skimmed Powder.
    const DAIRY_ING: &[&str] = &["3.25% Milk", "40% Cream", "Skimmed Milk Powder"];

    /// `DAIRY_ING` plus a stabilizer, to test that balancing can hit a zero stabilizer target.
    const DAIRY_STABILIZER_ING: &[&str] = &["3.25% Milk", "40% Cream", "Skimmed Milk Powder", "Stabilizer Blend"];

    /// Dairy plus sucrose, a minimal white-base palette for sugar-bearing balancing targets.
    const DAIRY_SUGAR_ING: &[&str] = &["3.25% Milk", "40% Cream", "Skimmed Milk Powder", "Sucrose"];

    /// Dairy plus cocoa powder and sucrose, a minimal chocolate-base palette. The single cocoa
    /// source couples [`CompKey::CocoaSolids`] and [`CompKey::CocoaButter`] at a fixed ratio.
    const DAIRY_COCOA_ING: &[&str] = &[
        "3.25% Milk",
        "40% Cream",
        "Ghirardelli 100% Unsweetened Cocoa Powder",
        "Sucrose",
    ];

    /// A minimal sorbet palette: water, two sugars, and a sorbet stabilizer blend.
    const SORBET_ING: &[&str] = &["Water", "Sucrose", "Dextrose", "Underbelly Sorbet Stabilizer Blend"];

    /// A minimal booze-base palette: dairy, sucrose, and a liqueur. The liqueur's large
    /// [`CompKey::PACtotal`] per gram makes a separate PAC target easy to over-constrain.
    const BOOZY_ING: &[&str] = &["3.25% Milk", "40% Cream", "Sucrose", "Grand Marnier Cordon Rouge"];

    // --- Exact balancing targets ---

    /// Trivial dairy targets that the dairy compositions can match exactly, used for sanity checks.
    static DAIRY_TRIVIAL_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| vec![(CompKey::MilkFat, 16.0), (CompKey::MSNF, 11.0)]);

    /// Dairy targets including a zero-valued [`CompKey::Stabilizers`] target, exercising the
    /// relative-error floor path (i.e. that the result is finite, and no division by zero).
    static DAIRY_ZERO_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::MilkFat, 16.0),
            (CompKey::MSNF, 11.0),
            (CompKey::Stabilizers, 0.0),
        ]
    });

    // --- Disparate balancing targets ---

    // Over-determined disparate targets that cannot be supplied by the respective compositions,
    // and so require best-effort balancing, exercising the absolute-LS magnitude skew, where large
    // targets (e.g. Energy) are fit more closely, and small targets (e.g. POD) are ignored.

    /// Over-determined dairy targets, with an incompatible [`CompKey::Energy`] target
    ///
    /// The [`CompKey::MilkFat`] and [`CompKey::MSNF`] targets result in ~150 kcal/100g, which is
    /// incompatible with the 200 kcal/100g [`CompKey::Energy`] target. It includes a large
    /// [`CompKey::Energy`] down to a small [`CompKey::POD`] target to exercise the magnitude skew.
    static DAIRY_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::Energy, 200.0),
            (CompKey::MilkFat, 12.0),
            (CompKey::MSNF, 8.0),
            (CompKey::POD, 0.5),
        ]
    });

    /// "Light premium" paradox: a rich [`CompKey::MilkFat`] target against a capped
    /// [`CompKey::Energy`] target — physically opposed, since milk fat is ~9 kcal/g, so 16% fat
    /// alone already exceeds the 150 kcal/100g [`CompKey::Energy`] target.
    static LIGHT_PREMIUM_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::Energy, 150.0),
            (CompKey::MilkFat, 16.0),
            (CompKey::MSNF, 11.0),
            (CompKey::TotalSugars, 18.0),
        ]
    });

    /// Chocolate intensity vs. lean: high [`CompKey::CocoaSolids`] and low [`CompKey::CocoaButter`]
    /// targets, which the single cocoa source cannot satisfy independently (the two are coupled by
    /// its fixed solids:butter ratio).
    static CHOCOLATE_COUPLED_COCOA_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::CocoaSolids, 6.0),
            (CompKey::CocoaButter, 1.0),
            (CompKey::TotalSugars, 20.0),
        ]
    });

    /// High-MSNF "sandiness" limit: a high [`CompKey::MSNF`] target (for body) against a
    /// [`CompKey::Lactose`] target capped low to avoid lactose crystallization — opposed, because
    /// dairy ties lactose to MSNF at a roughly fixed ratio (~0.5). With only the three dairy comps
    /// the capped lactose cannot be held while MSNF is pushed high, so the system is infeasible.
    static DAIRY_HIGH_MSNF_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| vec![(CompKey::MSNF, 16.0), (CompKey::Lactose, 5.0), (CompKey::MilkFat, 10.0)]);

    /// Sorbet sweetness vs. hardness: a restrained [`CompKey::POD`] (not too sweet) against a high
    /// [`CompKey::PACtotal`] (soft, scoopable) target — opposed, since both rise with sugar. Spans
    /// the large solids/sugar/PAC targets down to a trace [`CompKey::Stabilizers`].
    static SORBET_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSolids, 32.0),
            (CompKey::TotalSugars, 26.0),
            (CompKey::PACtotal, 32.0),
            (CompKey::POD, 14.0),
            (CompKey::Stabilizers, 0.40),
        ]
    });

    /// Booze base: a modest [`CompKey::ABV`] target plus a separate [`CompKey::PACtotal`] target,
    /// which the liqueur's outsized per-gram PAC contribution over-constrains.
    static BOOZY_DISPARATE_TARGETS: LazyLock<Vec<(CompKey, f64)>> = LazyLock::new(|| {
        vec![
            (CompKey::TotalSugars, 17.0),
            (CompKey::PACtotal, 28.0),
            (CompKey::ABV, 4.0),
        ]
    });

    // --- Balancing tests ---

    #[test]
    fn balance_compositions_nalgebra_ref_recipes_all_targets() {
        for light_recipe in REF_LIGHT_RECIPES.iter() {
            assert_balance_compositions(
                &comps_from_light_recipe(light_recipe),
                &get_targets_from_light_recipe(light_recipe, &get_balanceable_comp_keys()),
                balance_compositions_nalgebra,
                Epsilons::default(),
                &KeyCeiling::exact(),
            );
        }
    }

    #[test]
    fn balance_compositions_nnls_ref_recipes_all_targets() {
        for light_recipe in REF_LIGHT_RECIPES.iter() {
            assert_balance_compositions(
                &comps_from_light_recipe(light_recipe),
                &get_targets_from_light_recipe(light_recipe, &get_balanceable_comp_keys()),
                balance_compositions_nnls,
                Epsilons::default(),
                &KeyCeiling::exact(),
            );
        }
    }

    #[test]
    fn balance_compositions_nalgebra_dairy_trivial() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_TRIVIAL_TARGETS,
            balance_compositions_nalgebra,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_compositions_nnls_dairy_trivial() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_TRIVIAL_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_dairy_zero_target_no_stabilizer() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_ZERO_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_dairy_zero_target_with_stabilizer() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_STABILIZER_ING),
            &DAIRY_ZERO_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::exact(),
        );
    }

    #[test]
    fn balance_dairy_disparate_targets() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_DISPARATE_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(100.0),
        );
    }

    #[test]
    fn balance_light_premium_fat_vs_energy() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_SUGAR_ING),
            &LIGHT_PREMIUM_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(50.0),
        );
    }

    #[test]
    fn balance_chocolate_coupled_cocoa() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_COCOA_ING),
            &CHOCOLATE_COUPLED_COCOA_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(50.0),
        );
    }

    #[test]
    fn balance_dairy_high_msnf() {
        assert_balance_compositions(
            &comps_from_names(DAIRY_ING),
            &DAIRY_HIGH_MSNF_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(60.0),
        );
    }

    // Good example of extreme magnitude skew, blowing up the stabilizers to >100% to
    // satisfy other targets that are larger in absolute terms, e.g. `TotalSolids`.
    #[test]
    fn balance_sorbet_sweetness_vs_hardness() {
        assert_balance_compositions(
            &comps_from_names(SORBET_ING),
            &SORBET_DISPARATE_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(1200.0),
        );
    }

    // Completely breaks down the balancer, not respecting the total quantity constraint
    #[test]
    #[should_panic(expected = "amount_sum")] // @todo Remove once the balancer is improved
    fn balance_boozy_abv_vs_pac() {
        assert_balance_compositions(
            &comps_from_names(BOOZY_ING),
            &BOOZY_DISPARATE_TARGETS,
            balance_compositions_nnls,
            Epsilons::default(),
            &KeyCeiling::new(50.0),
        );
    }

    // --- Balance quality reports ---

    #[test]
    fn balance_quality_dairy_disparate_targets() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_ING),
            &DAIRY_DISPARATE_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_ING)
        ));
    }

    #[test]
    fn balance_quality_light_premium_fat_vs_energy() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_SUGAR_ING),
            &LIGHT_PREMIUM_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_SUGAR_ING)
        ));
    }

    #[test]
    fn balance_quality_chocolate_coupled_cocoa() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_COCOA_ING),
            &CHOCOLATE_COUPLED_COCOA_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_COCOA_ING)
        ));
    }

    #[test]
    fn balance_quality_dairy_high_msnf() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(DAIRY_ING),
            &DAIRY_HIGH_MSNF_TARGETS,
            BOTH_SOLVERS,
            Some(DAIRY_ING)
        ));
    }

    #[test]
    fn balance_quality_sorbet_sweetness_vs_hardness() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(SORBET_ING),
            &SORBET_DISPARATE_TARGETS,
            BOTH_SOLVERS,
            Some(SORBET_ING)
        ));
    }

    #[test]
    fn balance_quality_boozy_abv_vs_pac() {
        insta::assert_snapshot!(report_balance_quality(
            &comps_from_names(BOOZY_ING),
            &BOOZY_DISPARATE_TARGETS,
            BOTH_SOLVERS,
            Some(BOOZY_ING)
        ));
    }
}
