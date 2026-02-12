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
//! Where x1, x2, x3 are the amounts of each composition to use.
//!
//! @todo This is a work in progress, and the API and implementation may change significantly in the
//! near future. For now, it's mostly intended for benchmarking and testing different approaches.

use std::sync::LazyLock;

use nalgebra::{DMatrix, DVector, SVD};
use ndarray::{Array1, Array2};
use nnls::nnls;

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

    let a_t = a.transpose();
    let svd = SVD::new(a_t.clone() * a, true, true);

    let x = svd
        .solve(&(a_t * y), 1e-10)
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
/// [3.25, 40,    0]   \[x1\]   \[16\]  // Milk Fat
/// [8.71,  5.4, 97] * \[x2\] = \[11\]  // MSNF
/// [1,     1,    1]   \[x3\]    \[1\]  // Total sums to 100%
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
/// [3.25, 40,    0]   \[x1\]   \[16\]  // Milk Fat
/// [8.71,  5.4, 97] * \[x2\] = \[11\]  // MSNF
/// [1,     1,    1]   \[x3\]    \[1\]  // Total sums to 100%
fn make_vector_y(targets: &[(CompKey, f64)]) -> Vec<f64> {
    targets
        .iter()
        .map(|(_, amount)| *amount)
        .chain(std::iter::once(1.0))
        .collect::<Vec<_>>()
}

/// Example list of important [`CompKey`]s to use as targets for balancing recipe compositions,
/// since balancing based on too many [`CompKey`]s can cause time and/or accuracy issues.
///
/// Based on preliminary testing, balancing with too many target keys can take a long time using
/// [`nalgebra`] SVD (unsure if it completes), or give inaccurate results using [`mod@nnls`].
//
// @todo This is temporary, mostly here to enable benchmarks for balancing recipe compositions, and
// should be replaced with a more systematic approach to select target keys for balancing recipes.
// As balance-to-reference list, it's missing important keys like Egg and Nut compositions, etc.
pub static IMPORTANT_TARGET_KEYS: LazyLock<Vec<CompKey>> = LazyLock::new(|| {
    #[allow(clippy::enum_glob_use)]
    use CompKey::*;

    vec![
        MilkFat,
        Lactose,
        MSNF,
        MilkProteins,
        MilkSolids,
        CocoaButter,
        CocoaSolids,
        TotalSugars,
        ABV,
        Salt,
        TotalSolids,
        TotalFats,
        Water,
        Stabilizers,
        Emulsifiers,
        POD,
        PACtotal,
    ]
});

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp, clippy::unwrap_used)]
mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    use super::*;
    use crate::{
        database::IngredientDatabase,
        properties::PropKey,
        recipe::{OwnedLightRecipe, Recipe},
    };

    /// A shared ingredient database for all tests, seeded with embedded data
    static DATABASE: LazyLock<IngredientDatabase> = LazyLock::new(IngredientDatabase::new_seeded_from_embedded_data);

    /// Helper function to extract compositions from a light recipe
    fn comps_from_light_recipe(light_recipe: &OwnedLightRecipe) -> Vec<Composition> {
        Recipe::from_light_recipe(None, light_recipe, &DATABASE)
            .unwrap()
            .lines
            .iter()
            .map(|line| line.ingredient.composition)
            .collect()
    }

    /// Helper function to extract CompKey-value pairs from a list of PropKey-value pairs,
    /// filtering only those that correspond to [`CompKey`], for use as balancing targets.
    fn targets_from_properties(properties: &[(PropKey, f64)]) -> Vec<(CompKey, f64)> {
        properties
            .iter()
            .filter_map(|(prop_key, value)| match prop_key {
                PropKey::CompKey(c) => Some((*c, *value)),
                PropKey::FpdKey(_) => None,
            })
            .collect()
    }

    /// Helper function to filter a list of CompKey-value pairs to only include specified keys
    fn filter_targets_for_keys(targets: &[(CompKey, f64)], keys: &[CompKey]) -> Vec<(CompKey, f64)> {
        targets.iter().filter(|(key, _)| keys.contains(key)).copied().collect()
    }

    /// Helper function to verify that a given balancing function produces a combination of
    /// composition amounts that matches the target values for the specified keys, and sum to 1.
    fn verify_balance_composition<T: Fn(&[Composition], &[(CompKey, f64)]) -> Result<Vec<(Composition, f64)>>>(
        comps: &[Composition],
        targets: &[(CompKey, f64)],
        balance_compositions: T,
        epsilon: Option<f64>,
    ) {
        let balanced = balance_compositions(comps, targets).unwrap();

        assert_eq!(balanced.len(), comps.len());
        assert_eq_flt_test!(balanced.iter().map(|(_, amount)| *amount).sum::<f64>(), 1.0);

        let comp = Composition::from_combination(&balanced).unwrap();

        for (key, target_amount) in targets {
            assert_abs_diff_eq!(comp.get(*key), target_amount, epsilon = epsilon.unwrap_or(TESTS_EPSILON));
        }
    }

    // --- Dairy compositions and targets ---

    static DAIRY_COMPS: LazyLock<Vec<Composition>> =
        LazyLock::new(|| vec![*COMP_3_25_MILK, *COMP_40_CREAM, *COMP_SKIMMED_POWDER]);

    static DAIRY_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| vec![(CompKey::MilkFat, 16.0), (CompKey::MSNF, 11.0)]);

    // --- Reference recipe compositions ---

    static MAIN_RECIPE_COMPS: LazyLock<Vec<Composition>> =
        LazyLock::new(|| comps_from_light_recipe(&MAIN_RECIPE_LIGHT));

    static REF_A_RECIPE_COMPS: LazyLock<Vec<Composition>> =
        LazyLock::new(|| comps_from_light_recipe(&REF_A_RECIPE_LIGHT));

    static REF_B_RECIPE_COMPS: LazyLock<Vec<Composition>> =
        LazyLock::new(|| comps_from_light_recipe(&REF_B_RECIPE_LIGHT));

    // --- Reference recipe targets ---

    static MAIN_RECIPE_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| targets_from_properties(&MAIN_RECIPE_PROPERTIES));

    static REF_A_RECIPE_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| targets_from_properties(&REF_A_RECIPE_PROPERTIES));

    static REF_B_RECIPE_TARGETS: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| targets_from_properties(&REF_B_RECIPE_PROPERTIES));

    // -- Reference recipe targets for important keys only ---

    static MAIN_RECIPE_TARGETS_IMPORTANT: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| filter_targets_for_keys(&MAIN_RECIPE_TARGETS, &IMPORTANT_TARGET_KEYS));

    static REF_A_RECIPE_TARGETS_IMPORTANT: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| filter_targets_for_keys(&REF_A_RECIPE_TARGETS, &IMPORTANT_TARGET_KEYS));

    static REF_B_RECIPE_TARGETS_IMPORTANT: LazyLock<Vec<(CompKey, f64)>> =
        LazyLock::new(|| filter_targets_for_keys(&REF_B_RECIPE_TARGETS, &IMPORTANT_TARGET_KEYS));

    // --- Balancing tests ---

    #[test]
    fn balance_compositions_nalgebra_dairy() {
        verify_balance_composition(&DAIRY_COMPS, &DAIRY_TARGETS, balance_compositions_nalgebra, None);
    }

    #[test]
    fn balance_compositions_nnls_dairy() {
        verify_balance_composition(&DAIRY_COMPS, &DAIRY_TARGETS, balance_compositions_nnls, None);
    }

    #[test]
    fn balance_compositions_nalgebra_important_targets_main_recipe() {
        verify_balance_composition(
            &MAIN_RECIPE_COMPS,
            &MAIN_RECIPE_TARGETS_IMPORTANT,
            balance_compositions_nalgebra,
            Some(0.001),
        );
    }

    #[test]
    fn balance_compositions_nalgebra_important_targets_ref_a_recipe() {
        verify_balance_composition(
            &REF_A_RECIPE_COMPS,
            &REF_A_RECIPE_TARGETS_IMPORTANT,
            balance_compositions_nalgebra,
            Some(0.001),
        );
    }

    // Ref B recipe gives a negative composition amount with nalgebra, even through valid +ve values
    // exist for this set of compositions and targets. Following tests using nnls pass for Ref B.

    #[test]
    fn balance_compositions_nnls_important_targets_main_recipe() {
        verify_balance_composition(
            &MAIN_RECIPE_COMPS,
            &MAIN_RECIPE_TARGETS_IMPORTANT,
            balance_compositions_nnls,
            Some(0.001),
        );
    }

    #[test]
    fn balance_compositions_nnls_important_targets_ref_a_recipe() {
        verify_balance_composition(
            &REF_A_RECIPE_COMPS,
            &REF_A_RECIPE_TARGETS_IMPORTANT,
            balance_compositions_nnls,
            Some(0.001),
        );
    }

    #[test]
    fn balance_compositions_nnls_important_targets_ref_b_recipe() {
        verify_balance_composition(
            &REF_B_RECIPE_COMPS,
            &REF_B_RECIPE_TARGETS_IMPORTANT,
            balance_compositions_nnls,
            Some(0.001),
        );
    }
}
