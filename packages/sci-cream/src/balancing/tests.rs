use std::sync::LazyLock;

use strum::IntoEnumIterator;

use crate::tests::asserts::shadow_asserts::assert_eq;
use crate::tests::asserts::*;

use crate::tests::{
    assets::*,
    util::{KeyCeiling, root_mean_square},
};

use super::*;
use crate::{
    composition::{CompKey, Composition, RatioKey},
    data::{get_all_recipe_entries, get_recipe_entry_by_id},
    error::{Error, Result},
    fpd::{FPD, FpdKey},
    recipe::{OwnedLightRecipe, Recipe},
};

/// A solver over a plain unlocked composition list, matching the test-local shadows
/// [`balance_compositions_nnls`] / [`balance_compositions_nalgebra`]. The crate's tuple-taking
/// `SolverFn` covers locks; the tests run mostly unlocked side-by-side comparisons.
type UnlockedSolverFn = fn(
    &[Composition],
    &[(BalanceKey, f64)],
    Option<Weighting>,
    &[(BalanceKey, f64)],
) -> Result<Vec<(Composition, f64)>>;

/// A labelled balancing run: a name, the solver to use, and the priority weights to apply. This
/// lets several runs — different solvers and/or priority levels — be shown side-by-side in one
/// report (an empty priority slice reproduces the unprioritized solve exactly).
type LabeledRun = (&'static str, UnlockedSolverFn, &'static [(BalanceKey, f64)]);

/// Both solvers, unprioritized, paired for side-by-side quality reports.
const BOTH_SOLVERS: &[LabeledRun] = &[
    ("nalgebra", balance_compositions_nalgebra, &[]),
    ("nnls", balance_compositions_nnls, &[]),
];

/// An unprioritized nnls run, for single-column quality reports (e.g. ratio-key targets):
/// nnls is the production solver, and the axis of interest is the targets, not the solver.
const NNLS_ONLY: &[LabeledRun] = &[("nnls", balance_compositions_nnls, &[])];

/// nnls under increasing [`Priority`] on [`CompKey::POD`], for the priority-tradeoff report:
/// each column tightens POD harder, visibly trading off against the competing targets.
const POD_PRIORITY_RUNS: &[LabeledRun] = &[
    ("baseline", balance_compositions_nnls, &[]),
    ("POD High", balance_compositions_nnls, &[(BalanceKey::Comp(CompKey::POD), Priority::High.weight())]),
    (
        "POD Critical",
        balance_compositions_nnls,
        &[(BalanceKey::Comp(CompKey::POD), Priority::Critical.weight())],
    ),
];

/// nnls with and without a [`Priority::Critical`] on the ratio key [`RatioKey::AbsPAC`], for
/// the cross-feature report: prioritizing a ratio target tightens it against extensive ones.
const ABS_PAC_PRIORITY_RUNS: &[LabeledRun] = &[
    ("baseline", balance_compositions_nnls, &[]),
    (
        "AbsPAC Critical",
        balance_compositions_nnls,
        &[(BalanceKey::Ratio(RatioKey::AbsPAC), Priority::Critical.weight())],
    ),
];

/// Denominator floor for relative-error reporting, so zero / near-zero targets stay finite.
const BALANCE_REL_FLOOR: f64 = 0.1;

/// Minimum relative-error change (pp) for a priority effect to count as real rather than
/// [`TESTS_EPSILON`] noise — actual shifts are far larger, so this catches a priority no-op.
const MIN_PRIORITY_EFFECT_PP: f64 = 6.0;

/// Helper function to extract compositions from a light recipe, via [`EMBEDDED_DB`] lookups
fn comps_from_light_recipe(light_recipe: &OwnedLightRecipe) -> Vec<Composition> {
    Recipe::from_light_recipe(None, light_recipe, &EMBEDDED_DB)
        .unwrap()
        .lines
        .iter()
        .map(|line| line.ingredient.composition)
        .collect()
}

/// Helper function to fetch a light recipe from its name and optional author, from [`data`].
fn get_light_recipe_by_id(name: &str, author: Option<&str>) -> OwnedLightRecipe {
    get_recipe_entry_by_id(name, author).unwrap().recipe
}

/// Helper function to extract compositions from a list of ingredient names, via [`EMBEDDED_DB`]
fn comps_from_names(names: &[&str]) -> Vec<Composition> {
    names.iter().map(|name| get_comp_by_name(name)).collect()
}

/// Pairs each composition with no lock, the balancing-input shape for an ordinary (unlocked) solve.
fn unlocked(comps: &[Composition]) -> Vec<(Composition, Option<f64>)> {
    comps.iter().map(|&comp| (comp, None)).collect()
}

/// Fuses separate `targets` and `priorities` into the crate's `(key, value, Option<Priority>)`
/// tuples, so tests can express the two separately while the crate API takes them fused.
fn fuse_targets(
    targets: &[(BalanceKey, f64)],
    priorities: &[(BalanceKey, Priority)],
) -> Vec<(BalanceKey, f64, Option<Priority>)> {
    targets
        .iter()
        .map(|&(key, value)| (key, value, priorities.iter().find(|&&(k, _)| k == key).map(|&(_, p)| p)))
        .collect()
}

/// Pairs compositions with an aligned lock list: `locked[i] == Some(f)` fixes composition `i` at
/// fraction `f` of the mix (see [`balance_compositions`]).
fn with_locks(comps: &[Composition], locked: &[Option<f64>]) -> Vec<(Composition, Option<f64>)> {
    comps.iter().copied().zip(locked.iter().copied()).collect()
}

/// Test-local convenience wrapper (shadowing the crate function of the same name): the crate API
/// takes `&[(Composition, Option<f64>)]`, but most tests balance a plain composition list with
/// nothing locked, so this wraps that common case for readability. Lock-specific tests call
/// [`crate::balancing::balance_compositions`] directly with an explicit lock list.
fn balance_compositions(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priorities: &[(BalanceKey, Priority)],
) -> Result<Vec<(Composition, f64)>> {
    crate::balancing::balance_compositions(&unlocked(comps), &fuse_targets(targets, priorities), weighting, None)
}

/// Test-local shadow: forwards a plain unlocked `&[Composition]` to the crate solver.
fn balance_compositions_nnls(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(BalanceKey, f64)],
) -> Result<Vec<(Composition, f64)>> {
    crate::balancing::balance_compositions_nnls(&unlocked(comps), targets, weighting, priority_weights)
}

/// Test-local shadow: forwards a plain unlocked `&[Composition]` to the crate solver.
fn balance_compositions_nalgebra(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    weighting: Option<Weighting>,
    priority_weights: &[(BalanceKey, f64)],
) -> Result<Vec<(Composition, f64)>> {
    crate::balancing::balance_compositions_nalgebra(&unlocked(comps), targets, weighting, priority_weights)
}

/// Test-local convenience wrapper for unlocked [`crate::balancing::validate_balancing_targets`].
fn validate_balancing_targets(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    priorities: &[(BalanceKey, Priority)],
    rel_tol: Option<f64>,
) -> BalancingReport {
    crate::balancing::validate_balancing_targets(&unlocked(comps), &fuse_targets(targets, priorities), rel_tol, None)
}

/// Runs a single issue generator and returns what it emits, before any deduplication. Lets a
/// test assert that each underlying check independently produces its issue, separately from how
/// [`validate_balancing_targets`] later collapses the overlaps.
fn raw_issues(append: impl FnOnce(&mut Vec<BalancingIssue>)) -> Vec<BalancingIssue> {
    let mut issues = Vec::new();
    append(&mut issues);
    issues
}

/// Helper function to extract target pairs from a Composition for specified keys
fn get_targets_from_composition(composition: &Composition, keys: &[BalanceKey]) -> Vec<(BalanceKey, f64)> {
    keys.iter().map(|key| (*key, key.value(composition))).collect()
}

/// Helper function to extract target pairs from a light recipe's calculated composition
fn get_targets_from_light_recipe(light_recipe: &OwnedLightRecipe, keys: &[BalanceKey]) -> Vec<(BalanceKey, f64)> {
    get_targets_from_composition(
        &Recipe::from_light_recipe(None, light_recipe, &EMBEDDED_DB)
            .unwrap()
            .calculate_composition()
            .unwrap(),
        keys,
    )
}

/// Helper function to filter a list of key-value pairs to only include specified keys
#[expect(unused)]
fn filter_targets_for_keys(targets: &[(BalanceKey, f64)], keys: &[BalanceKey]) -> Vec<(BalanceKey, f64)> {
    targets.iter().filter(|(key, _)| keys.contains(key)).copied().collect()
}

/// Snaps `value` to the precision it is displayed at, mirroring the app's
/// `roundToCompositionValueFormat` (`comp-value-format.ts`): 2 dp below 10, 1 dp for 10–999, and —
/// via the `k` suffix that `parseFloat` reads back as thousands — nearest 100 (in thousands) at
/// >= 1000. Balanceable values stay well below 1000, so the last branch is only for completeness.
fn round_to_display_format(value: f64) -> f64 {
    let magnitude = value.abs().round();
    if magnitude >= 1000.0 {
        (value / 100.0).round() / 10.0
    } else if magnitude < 10.0 {
        (value * 100.0).round() / 100.0
    } else {
        (value * 10.0).round() / 10.0
    }
}

/// Relative error of an achieved value against its target, in percentage points.
///
/// `|achieved − target| / max(|target|, FLOOR) × 100`, where `FLOOR` is
/// [`BALANCE_REL_FLOOR`]. The floor keeps a zero target (e.g. a recipe with no cocoa or
/// stabilizer) from producing a non-finite result.
pub(crate) fn balance_rel_error_pp(achieved: f64, target: f64) -> f64 {
    (achieved - target).abs() / target.max(BALANCE_REL_FLOOR) * 100.0
}

/// The largest [`balance_rel_error_pp`] across all `targets` — the worst-case relative miss, a
/// single summary of how well a balanced result hits its targets.
fn max_rel_error(balanced: &[(Composition, f64)], targets: &[(BalanceKey, f64)]) -> f64 {
    targets
        .iter()
        .map(|(key, target)| balance_rel_error_pp(achieved_value(balanced, *key), *target))
        .fold(0.0_f64, f64::max)
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
fn assert_balance_compositions<F, P>(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    solve: F,
    epsilons: Epsilons,
    ceiling: &KeyCeiling<BalanceKey>,
) where
    F: Fn(&[Composition], &[(BalanceKey, f64)], Option<Weighting>, &[P]) -> Result<Vec<(Composition, f64)>>,
{
    // `P` is the solver's priority element type; the assertions use no priorities, so an empty
    // slice serves both the `&[(BalanceKey, f64)]` and `&[(BalanceKey, Priority)]` signatures.
    let balanced = solve(comps, targets, None, &[]).unwrap();
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

/// Renders a [`BalanceKey`] as its inner variant name (e.g. `MilkFat`, `AbsPAC`).
///
/// Used in snapshot headers so they stay stable across the `CompKey` -> `BalanceKey` migration
/// and read like the source enums (the user-facing report itself uses the friendlier labels).
fn balance_key_label(key: BalanceKey) -> String {
    match key {
        BalanceKey::Comp(comp) => format!("{comp:?}"),
        BalanceKey::Ratio(ratio) => format!("{ratio:?}"),
        BalanceKey::Fpd(fpd) => format!("{fpd:?}"),
    }
}

/// Builds a deterministic, human-readable balance-quality report for `insta` snapshots.
///
/// Runs every labelled run in `runs` against the same `comps` / `targets` and, per run, lists
/// each target's `target`, achieved value, and [`balance_rel_error_pp`], followed by a summary
/// line (amount sum, negative-amount count, max and RMS relative error). A run whose solve
/// fails renders a stable `FAILED` line instead of panicking, so infeasible systems snapshot.
fn report_balance_quality(
    comps: &[Composition],
    targets: &[(BalanceKey, f64)],
    runs: &[LabeledRun],
    names: Option<&[&str]>,
) -> String {
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
        .map(|(key, value)| format!("  {:<18}{value:>7.2}", balance_key_label(*key)))
        .collect::<Vec<_>>()
        .join("\n");
    lines.append(&mut vec![format!("targets:\n{header}")]);

    for &(label, solve, priorities) in runs {
        lines.push(String::new());

        let balanced = match solve(comps, targets, None, priorities) {
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

        lines.push("  [      key       | target | achieved |  error  ]".to_string());

        let mut errors = Vec::with_capacity(targets.len());
        for (key, target) in targets {
            let achieved = achieved_value(&balanced, *key);
            let error = balance_rel_error_pp(achieved, *target);
            errors.push(error);
            lines.push(format!("  {:<18}{target:>7.2}   {achieved:>7.2}   {error:>7.2} pp", balance_key_label(*key)));
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

/// Builds a deterministic, human-readable balancing-issues report for `insta` snapshots.
///
/// Echoes the scenario inputs (palette `names` when given, and each target's value with its
/// [`Priority`] when set), then the user-facing [`BalancingReport`] rendering from
/// [`validate_balancing_targets`] — the same text that crosses the WASM boundary as
/// `BalancingIssueView.message`. Snapshotting it keeps the wording under review: clear, correctly
/// attributed to keys, and free of spurious or duplicate issues.
fn report_balancing_issues(
    comps: &[Composition],
    targets: &[(BalanceKey, f64, Option<Priority>)],
    names: Option<&[&str]>,
) -> String {
    report_balancing_issues_rel(comps, targets, names, None)
}

/// As [`report_balancing_issues`], but taking an explicit `rel_tol` (see
/// [`validate_balancing_targets`]) so a snapshot can contrast exact validation with the tolerance.
fn report_balancing_issues_rel(
    comps: &[Composition],
    targets: &[(BalanceKey, f64, Option<Priority>)],
    names: Option<&[&str]>,
    rel_tol: Option<f64>,
) -> String {
    let mut lines = Vec::new();

    if let Some(names) = names {
        lines.push("palette:".to_string());
        lines.extend(names.iter().map(|name| format!("  {name}")));
    }

    lines.push("targets:".to_string());
    for &(key, value, priority) in targets {
        let suffix = priority.map_or_else(String::new, |p| format!("  {p:?}"));
        lines.push(format!("  {:<20}{value:>8.2}{suffix}", balance_key_label(key)));
    }

    lines.push(String::new());
    lines.push(crate::balancing::validate_balancing_targets(&unlocked(comps), targets, rel_tol, None).to_string());

    lines.join("\n")
}

// --- Compositions, ingredients, recipes ---

/// Reference recipes' mix compositions are used as balancing targets to check that the
/// balancing function can at least recover the original recipe, a basic sanity check.
static REF_LIGHT_RECIPES: LazyLock<Vec<OwnedLightRecipe>> = LazyLock::new(|| {
    let mut recipes = vec![
        MAIN_RECIPE_LIGHT.clone(),
        REF_A_RECIPE_LIGHT.clone(),
        REF_B_RECIPE_LIGHT.clone(),
    ];
    recipes.extend(get_all_recipe_entries().into_iter().map(|entry| entry.recipe));
    recipes
});

/// Subset of [`REF_LIGHT_RECIPES`] that excludes non-typical formulations, e.g. `REF_B`'s
/// artificial sweeteners, for tests that need typical balancing keys to be feasible.
static REF_LIGHT_RECIPES_FOR_TYPICAL_BALANCING_KEYS: LazyLock<Vec<OwnedLightRecipe>> = LazyLock::new(|| {
    vec![
        MAIN_RECIPE_LIGHT.clone(),
        REF_A_RECIPE_LIGHT.clone(),
        // Exclude REF_B since it includes artificial sweeteners
        get_light_recipe_by_id("Standard Base", Some("Underbelly")),
        get_light_recipe_by_id("French Variation", Some("Underbelly")),
        get_light_recipe_by_id("Light Variation", Some("Underbelly")),
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
/// [`CompKey::TotalPAC`] per gram makes a separate PAC target easy to over-constrain.
const BOOZY_ING: &[&str] = &["3.25% Milk", "40% Cream", "Sucrose", "Grand Marnier Cordon Rouge"];

/// A multi-sugar palette whose sugars differ in POD:PAC ratio, giving the solver enough freedom
/// to hit a sweetness ([`CompKey::POD`]) and a hardness ([`CompKey::TotalPAC`]) target at once.
const SUGAR_BLEND_ING: &[&str] = &["Water", "Sucrose", "Dextrose", "Fructose"];

/// A palette with a stabilizer source plus a zero-water ingredient, for the ratio-key tests.
///
/// Sucrose contributes zero water (which used to make `StabilizersPerWater` `NaN` and poison
/// the solve), while Stabilizer Blend keeps a positive-water ratio reachable.
const STABILIZER_AND_SUCROSE_ING: &[&str] = &["3.25% Milk", "40% Cream", "Stabilizer Blend", "Sucrose"];

/// Dairy plus an emulsifier source, for [`RatioKey::EmulsifiersPerFat`] (fat-denominated) ratio
/// tests: Soy Lecithin supplies emulsifier while milk and cream supply the fat denominator.
const EMULSIFIER_ING: &[&str] = &["3.25% Milk", "40% Cream", "Soy Lecithin"];

// --- Exact balancing targets ---

/// Trivial dairy targets that the dairy compositions can match exactly, used for sanity checks.
static DAIRY_TRIVIAL_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> =
    LazyLock::new(|| vec![(CompKey::MilkFat.into(), 16.0), (CompKey::MSNF.into(), 11.0)]);

/// Dairy targets including a zero-valued [`CompKey::TotalStabilizers`] target, exercising the
/// relative-error floor path (i.e. that the result is finite, and no division by zero).
static DAIRY_ZERO_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::MilkFat.into(), 16.0),
        (CompKey::MSNF.into(), 11.0),
        (CompKey::TotalStabilizers.into(), 0.0),
    ]
});

/// Feasible targets for the [`SUGAR_BLEND_ING`] palette: the composition of a real blend
/// (Water 68 / Sucrose 14 / Dextrose 10 / Fructose 8), so the solver can recover them exactly
/// while hitting a sweetness ([`CompKey::POD`]) and hardness ([`CompKey::TotalPAC`]) target at
/// once. These targets genuinely require all three sugars — any two-sugar subset misses by
/// >10 pp (see [`balance_multi_sugar_needs_all_three_sugars`]).
static SUGAR_BLEND_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::TotalSolids.into(), 31.2),
        (CompKey::POD.into(), 35.2),
        (CompKey::TotalPAC.into(), 46.68),
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
static DAIRY_DISPARATE_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::Energy.into(), 200.0),
        (CompKey::MilkFat.into(), 12.0),
        (CompKey::MSNF.into(), 8.0),
        (CompKey::POD.into(), 0.5),
    ]
});

/// "Light premium" paradox: a rich [`CompKey::MilkFat`] target against a capped
/// [`CompKey::Energy`] target — physically opposed, since milk fat is ~9 kcal/g, so 16% fat
/// alone already exceeds the 150 kcal/100g [`CompKey::Energy`] target.
static LIGHT_PREMIUM_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::Energy.into(), 150.0),
        (CompKey::MilkFat.into(), 16.0),
        (CompKey::MSNF.into(), 11.0),
        (CompKey::TotalSugars.into(), 18.0),
    ]
});

/// Chocolate intensity vs. lean: high [`CompKey::CocoaSolids`] and low [`CompKey::CocoaButter`]
/// targets, which the single cocoa source cannot satisfy independently (the two are coupled by
/// its fixed solids:butter ratio).
static CHOCOLATE_COUPLED_COCOA_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::CocoaSolids.into(), 6.0),
        (CompKey::CocoaButter.into(), 1.0),
        (CompKey::TotalSugars.into(), 20.0),
    ]
});

/// High-MSNF "sandiness" limit: a high [`CompKey::MSNF`] target (for body) against a
/// [`CompKey::Lactose`] target capped low to avoid lactose crystallization — opposed, because
/// dairy ties lactose to MSNF at a roughly fixed ratio (~0.5). With only the three dairy comps
/// the capped lactose cannot be held while MSNF is pushed high, so the system is infeasible.
static DAIRY_HIGH_MSNF_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::MSNF.into(), 16.0),
        (CompKey::Lactose.into(), 5.0),
        (CompKey::MilkFat.into(), 10.0),
    ]
});

/// Sorbet sweetness vs. hardness: a restrained [`CompKey::POD`] (not too sweet) against a high
/// [`CompKey::TotalPAC`] (soft, scoopable) target — opposed, since both rise with sugar. Spans
/// the large solids/sugar/PAC targets down to a trace [`CompKey::TotalStabilizers`].
static SORBET_DISPARATE_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::TotalSolids.into(), 32.0),
        (CompKey::TotalSugars.into(), 26.0),
        (CompKey::TotalPAC.into(), 32.0),
        (CompKey::POD.into(), 14.0),
        (CompKey::TotalStabilizers.into(), 0.40),
    ]
});

/// Booze base: a modest [`CompKey::ABV`] target plus a separate [`CompKey::TotalPAC`] target,
/// which the liqueur's outsized per-gram PAC contribution over-constrains.
static BOOZY_DISPARATE_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (CompKey::TotalSugars.into(), 17.0),
        (CompKey::TotalPAC.into(), 28.0),
        // The raw solvers do not translate, so target the additive `Alcohol` proxy of `ABV` (4.0)
        // here; the validated entry point's direct `ABV` path is covered by the translation tests.
        (CompKey::Alcohol.into(), crate::constants::density::abv_to_abw(4.0)),
    ]
});

// --- Ratio-key balancing targets ---

/// A water-denominated [`RatioKey::AbsPAC`] target in conflict with its [`CompKey::TotalPAC`]
/// one (over-determining the palette), plus [`CompKey::POD`] and [`CompKey::TotalSolids`].
static SORBET_ABS_PAC_TARGETS: LazyLock<Vec<(BalanceKey, f64)>> = LazyLock::new(|| {
    vec![
        (RatioKey::AbsPAC.into(), 45.0),
        (CompKey::TotalPAC.into(), 20.0),
        (CompKey::POD.into(), 14.0),
        (CompKey::TotalSolids.into(), 32.0),
    ]
});

// --- Balancing tests ---

/// All native balancing targets of a reference recipe, dropping any whose value is non-finite.
fn finite_balanceable_targets(light_recipe: &OwnedLightRecipe) -> Vec<(BalanceKey, f64)> {
    get_targets_from_light_recipe(light_recipe, &get_all_native_balancing_keys())
        .into_iter()
        .filter(|(_, value)| value.is_finite())
        .collect()
}

#[test]
fn balance_compositions_nalgebra_ref_recipes_all_targets() {
    for light_recipe in REF_LIGHT_RECIPES.iter() {
        assert_balance_compositions(
            &comps_from_light_recipe(light_recipe),
            &finite_balanceable_targets(light_recipe),
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
            &finite_balanceable_targets(light_recipe),
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
fn balance_multi_sugar_pod_and_pac() {
    assert_balance_compositions(
        &comps_from_names(SUGAR_BLEND_ING),
        &SUGAR_BLEND_TARGETS,
        balance_compositions_nnls,
        Epsilons::default(),
        &KeyCeiling::exact(),
    );
}

/// Companion to [`balance_multi_sugar_pod_and_pac`]: dropping any one sugar leaves an
/// over-determined system that misses by over 10 pp, so each sugar is load-bearing.
#[test]
fn balance_multi_sugar_needs_all_three_sugars() {
    // Each palette is water plus two of the three sugars (i.e. one sugar dropped).
    let two_sugar_palettes: [&[&str]; 3] = [
        &["Water", "Sucrose", "Dextrose"],  // no Fructose
        &["Water", "Sucrose", "Fructose"],  // no Dextrose
        &["Water", "Dextrose", "Fructose"], // no Sucrose
    ];

    for palette in two_sugar_palettes {
        let balanced = balance_compositions_nnls(&comps_from_names(palette), &SUGAR_BLEND_TARGETS, None, &[]).unwrap();
        let max_error = max_rel_error(&balanced, &SUGAR_BLEND_TARGETS);
        assert_gt!(max_error, 10.0);
    }
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

#[test]
fn balance_sorbet_sweetness_vs_hardness() {
    assert_balance_compositions(
        &comps_from_names(SORBET_ING),
        &SORBET_DISPARATE_TARGETS,
        balance_compositions_nnls,
        Epsilons::default(),
        &KeyCeiling::new(35.0),
    );
}

// Good example of extreme magnitude skew under absolute weighting, blowing up the stabilizers
// to >100% to satisfy other targets that are larger in absolute terms, e.g. `TotalSolids`.
#[test]
fn balance_sorbet_sweetness_vs_hardness_absolute_weighting() {
    let comps = comps_from_names(SORBET_ING);
    let targets = SORBET_DISPARATE_TARGETS.clone();
    let weighting = Weighting::Absolute;

    let balanced = balance_compositions_nnls(&comps, &targets, Some(weighting), &[]).unwrap();
    assert_gt!(max_rel_error(&balanced, &targets), 1100.0);
}

#[test]
fn balance_boozy_abv_vs_pac() {
    assert_balance_compositions(
        &comps_from_names(BOOZY_ING),
        &BOOZY_DISPARATE_TARGETS,
        balance_compositions_nnls,
        Epsilons::default(),
        &KeyCeiling::new(50.0),
    );
}

// Over-constrained: hitting the ABV target needs the liqueur, which also drives TotalPAC, so
// the two can't both be met exactly. With absolute weighting the solver system breaks down and
// collapses the total amount (must sum to 1) to ~0.29 to meet the larger ABV and PAC targets.
#[test]
fn balance_boozy_abv_vs_pac_absolute_weighting() {
    let comps = comps_from_names(BOOZY_ING);
    let targets = BOOZY_DISPARATE_TARGETS.clone();
    let weighting = Weighting::Absolute;

    let balanced = balance_compositions_nnls(&comps, &targets, Some(weighting), &[]).unwrap();
    assert_lt!(balanced.iter().map(|(_, amount)| *amount).sum::<f64>(), 0.6);
}

// --- Intensive->extensive target translation ---

/// Validates `targets` against the unlocked `comps` — the translation-test shorthand.
fn validation_report(comps: &[Composition], targets: &[(BalanceKey, f64)]) -> BalancingReport {
    validate_balancing_targets(comps, targets, &[], None)
}

/// The composition of the mix balanced to `targets` through the validated (translating) entry
/// point — the shared setup for the translation round-trip tests.
fn balanced_mix(ingredients: &[&str], targets: &[(BalanceKey, f64)]) -> Composition {
    let balanced = balance_compositions(&comps_from_names(ingredients), targets, None, &[]).unwrap();
    Composition::from_combination(&balanced).unwrap()
}

#[test]
fn balance_abv_target_round_trip() {
    // `ABV` translates to its exact-inverse `Alcohol` proxy.
    let mix = balanced_mix(BOOZY_ING, &[(CompKey::ABV.into(), 4.0), (CompKey::MilkFat.into(), 8.0)]);
    assert_eq_flt_test!(mix.get(CompKey::ABV), 4.0);
}

#[test]
fn balance_fpd_target_round_trip() {
    // `FPD` translates to `AbsPAC` via the exact table inverse.
    let mix = balanced_mix(SORBET_ING, &[(FpdKey::FPD.into(), -2.5)]);
    assert_eq_flt_test!(FPD::compute_from_composition(mix).unwrap().fpd, -2.5);
}

#[test]
fn balance_serving_temp_target_round_trip() {
    // `ServingTemp` translates to `AbsNetPAC` via the exact table inverse.
    let mix = balanced_mix(SORBET_ING, &[(FpdKey::ServingTemp.into(), -13.0)]);
    assert_eq_flt_test!(FPD::compute_from_composition(mix).unwrap().serving_temp, -13.0);
}

#[test]
fn balance_hardness_target_round_trip() {
    // `HardnessAt14C` translates to `AbsNetPAC` via the exact table inverse. Integer targets
    // are recovered exactly; non-integer targets may have non-zero linearization residuals.
    let mix = balanced_mix(SORBET_ING, &[(FpdKey::HardnessAt14C.into(), 72.0)]);
    assert_eq_flt_test!(FPD::compute_from_composition(mix).unwrap().hardness_at_14c, 72.0);

    let mix = balanced_mix(SORBET_ING, &[(FpdKey::HardnessAt14C.into(), 72.5)]);
    assert_abs_diff_eq!(FPD::compute_from_composition(mix).unwrap().hardness_at_14c, 72.5, epsilon = 0.01);
}

#[test]
fn abv_priority_rides_to_the_alcohol_row() {
    // A prioritized `ABV` target must solve identically to the equivalent prioritized `Alcohol`
    let comps = unlocked(&comps_from_names(BOOZY_ING));

    let with_abv = crate::balancing::balance_compositions(
        &comps,
        &[
            (CompKey::ABV.into(), 4.0, Some(Priority::High)),
            (CompKey::TotalPAC.into(), 28.0, None),
        ],
        None,
        None,
    )
    .unwrap();

    let with_alcohol = crate::balancing::balance_compositions(
        &comps,
        &[
            (CompKey::Alcohol.into(), crate::constants::density::abv_to_abw(4.0), Some(Priority::High)),
            (CompKey::TotalPAC.into(), 28.0, None),
        ],
        None,
        None,
    )
    .unwrap();
    assert_eq!(with_abv, with_alcohol);
}

#[test]
fn proxy_target_clash_matrix() {
    // Every combination of targets resolving to one solver key raises exactly one error-severity
    // clash naming the original keys in input order, and gates the solve path.
    let comps = comps_from_names(BOOZY_ING);
    let abw = crate::constants::density::abv_to_abw(4.0);
    let cases: &[(&[(BalanceKey, f64)], BalanceKey)] = &[
        (&[(CompKey::ABV.into(), 4.0), (CompKey::Alcohol.into(), abw)], CompKey::Alcohol.into()),
        (&[(FpdKey::FPD.into(), -2.5), (RatioKey::AbsPAC.into(), 40.0)], RatioKey::AbsPAC.into()),
        (
            &[
                (FpdKey::ServingTemp.into(), -13.0),
                (FpdKey::HardnessAt14C.into(), 72.0),
            ],
            RatioKey::AbsNetPAC.into(),
        ),
        (
            &[(FpdKey::ServingTemp.into(), -13.0), (RatioKey::AbsNetPAC.into(), 45.0)],
            RatioKey::AbsNetPAC.into(),
        ),
        (
            &[(FpdKey::HardnessAt14C.into(), 72.0), (RatioKey::AbsNetPAC.into(), 45.0)],
            RatioKey::AbsNetPAC.into(),
        ),
        (
            &[
                (FpdKey::ServingTemp.into(), -13.0),
                (FpdKey::HardnessAt14C.into(), 72.0),
                (RatioKey::AbsNetPAC.into(), 45.0),
            ],
            RatioKey::AbsNetPAC.into(),
        ),
    ];

    for (targets, expected_proxy) in cases {
        let report = validation_report(&comps, targets);
        let clashes: Vec<&BalancingIssue> = report
            .errors()
            .filter(|issue| matches!(issue, BalancingIssue::ProxyTargetClash { .. }))
            .collect();
        assert_eq!(clashes.len(), 1, "expected one clash for {targets:?}");
        let BalancingIssue::ProxyTargetClash { keys, proxy } = clashes[0] else {
            unreachable!("filtered to clashes above");
        };
        assert_eq!(*proxy, *expected_proxy);
        assert_eq!(*keys, targets.iter().map(|&(key, _)| key).collect::<Vec<_>>());

        let error = balance_compositions(&comps, targets, None, &[]).unwrap_err();
        assert_true!(matches!(error, Error::InvalidBalancingTargets(_)));
    }
}

#[test]
fn duplicate_intensive_target_is_a_duplicate_not_a_clash() {
    // A same-key repeat stays a `DuplicateTarget`; clashes are only for distinct keys.
    let comps = comps_from_names(BOOZY_ING);
    let report = validation_report(&comps, &[(CompKey::ABV.into(), 4.0), (CompKey::ABV.into(), 4.0)]);
    let errors: Vec<&BalancingIssue> = report.errors().collect();
    assert_eq!(
        errors,
        vec![&BalancingIssue::DuplicateTarget {
            key: CompKey::ABV.into()
        }]
    );
}

#[test]
fn temperature_targets_admit_negative_values() {
    // Negative temperatures are inside the `FPD`/`ServingTemp` target domain, not errors.
    let comps = comps_from_names(SORBET_ING);
    let report = validation_report(&comps, &[(FpdKey::FPD.into(), -2.5), (FpdKey::ServingTemp.into(), -13.0)]);
    assert_false!(report.has_errors());
}

#[test]
fn out_of_domain_target_values() {
    // A value outside its key's admissible domain is an error naming the original key and the
    // violated bounds, whichever side it falls out on: positive temperatures, a hardness or mass
    // fraction outside [0, 100], a negative `ABV`. A non-finite value falls to the non-finite
    // check instead, and the unbounded keys (`Energy`, `POD`, PAC family) admit any positive value.
    let comps = comps_from_names(SORBET_ING);
    let out_of_domain = |key: BalanceKey, value: f64| {
        let domain = key.target_domain();
        BalancingIssue::OutOfDomainTarget {
            key,
            value,
            min: *domain.start(),
            max: *domain.end(),
        }
    };
    let cases: &[((BalanceKey, f64), BalancingIssue)] = &[
        ((FpdKey::FPD.into(), 1.0), out_of_domain(FpdKey::FPD.into(), 1.0)),
        ((FpdKey::ServingTemp.into(), 1.0), out_of_domain(FpdKey::ServingTemp.into(), 1.0)),
        ((FpdKey::HardnessAt14C.into(), 105.0), out_of_domain(FpdKey::HardnessAt14C.into(), 105.0)),
        ((FpdKey::HardnessAt14C.into(), -5.0), out_of_domain(FpdKey::HardnessAt14C.into(), -5.0)),
        ((CompKey::ABV.into(), -1.0), out_of_domain(CompKey::ABV.into(), -1.0)),
        ((CompKey::ABV.into(), 105.0), out_of_domain(CompKey::ABV.into(), 105.0)),
        ((CompKey::MSNF.into(), 150.0), out_of_domain(CompKey::MSNF.into(), 150.0)),
    ];

    for (target, expected) in cases {
        let report = validation_report(&comps, &[*target]);
        assert_eq!(report.errors().collect::<Vec<_>>(), vec![expected], "for target {target:?}");
    }

    for key in [CompKey::Energy, CompKey::POD, CompKey::TotalPAC] {
        let report = validation_report(&comps, &[(key.into(), 150.0)]);
        assert!(!report.has_errors(), "150 should be in domain for {key:?}");
    }

    let report = validation_report(&comps, &[(FpdKey::ServingTemp.into(), f64::NAN)]);
    let errors: Vec<&BalancingIssue> = report.errors().collect();
    assert_eq!(errors.len(), 1);
    assert_true!(matches!(errors[0], BalancingIssue::NonFiniteTarget { key, .. }
        if *key == BalanceKey::from(FpdKey::ServingTemp)));
}

#[test]
fn balancing_issues_report_proxy_clashes() {
    // One clash per shared solver key, each naming the original keys as passed.
    let comps = comps_from_names(BOOZY_ING);
    let targets = [
        (CompKey::ABV.into(), 4.0),
        (CompKey::Alcohol.into(), 3.2),
        (FpdKey::ServingTemp.into(), -13.0),
        (FpdKey::HardnessAt14C.into(), 72.0),
    ];
    insta::assert_snapshot!(report_balancing_issues(&comps, &fuse_targets(&targets, &[]), Some(BOOZY_ING)));
}

#[test]
fn balancing_issues_report_translated_fpd_targets() {
    // A clean translated validation: FPD-family and ABV targets are checked via their proxies,
    // so any downstream warning names the proxy key (interim attribution; see TODO.md).
    let comps = comps_from_names(SORBET_ING);
    let targets = [(FpdKey::ServingTemp.into(), -13.0), (CompKey::TotalSolids.into(), 32.0)];
    insta::assert_snapshot!(report_balancing_issues(&comps, &fuse_targets(&targets, &[]), Some(SORBET_ING)));
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

#[test]
fn balance_quality_priority_pod_tradeoff() {
    insta::assert_snapshot!(report_balance_quality(
        &comps_from_names(DAIRY_ING),
        &DAIRY_DISPARATE_TARGETS,
        POD_PRIORITY_RUNS,
        Some(DAIRY_ING)
    ));
}

#[test]
fn balance_quality_sorbet_abs_pac_vs_sweetness() {
    insta::assert_snapshot!(report_balance_quality(
        &comps_from_names(SORBET_ING),
        &SORBET_ABS_PAC_TARGETS,
        NNLS_ONLY,
        Some(SORBET_ING)
    ));
}

#[test]
fn balance_quality_priority_abs_pac() {
    insta::assert_snapshot!(report_balance_quality(
        &comps_from_names(SORBET_ING),
        &SORBET_ABS_PAC_TARGETS,
        ABS_PAC_PRIORITY_RUNS,
        Some(SORBET_ING)
    ));
}

// --- Balancing issue reports ---
//
// Snapshots of the user-facing `validate_balancing_targets` report for scenarios that raise
// *several* issues at once, where reading the set as a whole is what catches spurious or
// unhelpful wording. Single-issue cases are covered by the `validate_flags_*` assertions above.

#[test]
fn balancing_issues_report_input_errors() {
    // A grab-bag of caller mistakes: a non-finite and a negative target, and a duplicated target
    // key. Shows how an error-heavy report reads and how errors and warnings interleave.
    let targets = [
        (CompKey::MilkFat.into(), f64::NAN),
        (CompKey::MSNF.into(), -3.0),
        (CompKey::TotalSolids.into(), 30.0),
        (CompKey::TotalSolids.into(), 32.0),
    ];
    insta::assert_snapshot!(report_balancing_issues(
        &comps_from_names(DAIRY_ING),
        &fuse_targets(&targets, &[]),
        Some(DAIRY_ING),
    ));
}

#[test]
fn balancing_issues_report_multiple_warnings() {
    // One over-ambitious target set that trips three different warnings at once: an
    // out-of-range fat target, a sugar dominance conflict, and a cocoa target no ingredient
    // can supply. Confirms a multi-warning report stays informative rather than spurious.
    insta::assert_snapshot!(report_balancing_issues(
        &comps_from_names(DAIRY_SUGAR_ING),
        &fuse_targets(
            &[
                (CompKey::MilkFat.into(), 50.0),
                (CompKey::Sucrose.into(), 20.0),
                (CompKey::TotalSugars.into(), 15.0),
                (CompKey::CocoaSolids.into(), 5.0),
            ],
            &[],
        ),
        Some(DAIRY_SUGAR_ING),
    ));
}

#[test]
fn balancing_issues_report_real_recipe_typical_self_targets() {
    // A real recipe validated against its own typical-key composition. The mix is a feasible
    // point of its own palette, so reachability/dominance stay silent; this captures how the
    // validator treats a genuine recipe — including any typical key the recipe leaves at zero.
    let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
    let comps = comps_from_light_recipe(&recipe);
    let targets = get_targets_from_light_recipe(&recipe, &get_typical_balancing_keys());
    insta::assert_snapshot!(report_balancing_issues(&comps, &fuse_targets(&targets, &[]), None));
}

/// Builds the rounded-self-targets snapshot body for `recipe` over `keys`.
///
/// Fills each target from the recipe's own value (dropping the zero/NaN keys the app's
/// `getDisplayValue` skips), rounds it to shown precision with `round_to_display_format`, then
/// reports validation both exact and with the app's display tolerance (`0.01`).
fn rounded_self_targets_report(recipe: &OwnedLightRecipe, keys: &[BalanceKey]) -> String {
    let comps = comps_from_light_recipe(recipe);
    let targets: Vec<(BalanceKey, f64)> = get_targets_from_light_recipe(recipe, keys)
        .into_iter()
        .filter(|(_, value)| value.is_finite() && *value != 0.0)
        .map(|(key, value)| (key, round_to_display_format(value)))
        .collect();

    let exact = report_balancing_issues_rel(&comps, &fuse_targets(&targets, &[]), None, None);
    let tolerant = report_balancing_issues_rel(&comps, &fuse_targets(&targets, &[]), None, Some(0.01));
    format!("=== exact ===\n{exact}\n\n=== tolerant (rel_tol = 0.01) ===\n{tolerant}")
}

#[test]
fn balancing_issues_report_rounded_self_targets() {
    // A single dairy source pins MSNF:MilkFat and the other milk-sourced ratios to one value no
    // rounded self-target can sit on: exact validation flags the drift, the tolerance clears it.
    let recipe: OwnedLightRecipe = vec![
        ("3.25% Milk".into(), 60.0),
        ("Sucrose".into(), 15.0),
        ("Water".into(), 25.0),
    ];
    insta::assert_snapshot!(rounded_self_targets_report(&recipe, &get_typical_balancing_keys()));
}

#[test]
fn balancing_issues_report_rounded_self_targets_all_keys() {
    // A full recipe's many pinned and narrow ratios flood exact validation with rounding-drift
    // warnings; the tolerance clears them, bar a few against tiny quantities like Salt whose
    // rounding error exceeds it. The native set: the full catalog self-clashes on shared proxies.
    let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
    insta::assert_snapshot!(rounded_self_targets_report(&recipe, &get_all_native_balancing_keys()));
}

#[test]
fn balancing_issues_report_real_recipe_conflicting_targets() {
    // A real recipe's ingredient palette asked for targets it cannot meet: a fat level beyond
    // any single ingredient and a sugar dominance conflict. Shows the report a user would see
    // when pushing a real base past what its ingredients allow.
    let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
    let comps = comps_from_light_recipe(&recipe);
    let targets = [
        (CompKey::MilkFat.into(), 45.0),
        (CompKey::Sucrose.into(), 25.0),
        (CompKey::TotalSugars.into(), 18.0),
    ];
    insta::assert_snapshot!(report_balancing_issues(&comps, &fuse_targets(&targets, &[]), None));
}

#[test]
fn balancing_issues_report_real_setup_with_ref_recipes_chocolate_no_ing() {
    // A typical scenario: balance a chocolate recipe to a reference base + cocoa targets.
    let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
    let comps = comps_from_light_recipe(&recipe);

    let targets = get_targets_from_light_recipe(&recipe, &get_typical_balancing_keys())
        .iter()
        .map(|&(key, value)| match key {
            BalanceKey::Comp(comp_key) => match comp_key {
                CompKey::CocoaSolids => (CompKey::CocoaSolids.into(), 6.0),
                CompKey::CocoaButter => (CompKey::CocoaButter.into(), 2.0),
                _ => (key, value),
            },
            BalanceKey::Ratio(_) | BalanceKey::Fpd(_) => (key, value),
        })
        .collect::<Vec<_>>();

    insta::assert_snapshot!(report_balancing_issues(&comps, &fuse_targets(&targets, &[]), None));
}

#[test]
fn balancing_issues_report_real_setup_with_ref_recipes_chocolate_powder_only() {
    // A typical scenario: balance a chocolate recipe to a reference base + cocoa targets.
    // Adding only cocoa powder produces many warnings that are redundant and confusing.
    let recipe = get_light_recipe_by_id("Standard Base", Some("Underbelly"));
    let comps = comps_from_light_recipe(&[recipe.clone(), vec![("Cocoa Powder, 17% Fat".into(), 0.0)]].concat());

    let targets = get_targets_from_light_recipe(&recipe, &get_typical_balancing_keys())
        .iter()
        .map(|&(key, value)| match key {
            BalanceKey::Comp(comp_key) => match comp_key {
                CompKey::CocoaSolids => (CompKey::CocoaSolids.into(), 6.0),
                CompKey::CocoaButter => (CompKey::CocoaButter.into(), 2.0),
                _ => (key, value),
            },
            BalanceKey::Ratio(_) | BalanceKey::Fpd(_) => (key, value),
        })
        .collect::<Vec<_>>();

    insta::assert_snapshot!(report_balancing_issues(&comps, &fuse_targets(&targets, &[]), None));
}

// --- Ratio keys ---

/// An equal-parts mix of `comps`, expressed as a balanced result so [`achieved_value`] can
/// read it. Any value it yields is reachable by the palette, which makes it a robust source of
/// feasible ratio targets for recovery tests.
fn equal_parts_reference(comps: &[Composition]) -> Vec<(Composition, f64)> {
    #[allow(clippy::cast_precision_loss)] // Ingredient counts stay far below f64's exact range
    let amount = 1.0 / comps.len() as f64;
    comps.iter().map(|comp| (*comp, amount)).collect()
}

#[test]
fn balance_key_is_ratio_identifies_ratio_keys() {
    assert_true!(BalanceKey::from(RatioKey::AbsPAC).is_ratio());
    assert_true!(BalanceKey::from(RatioKey::AbsNetPAC).is_ratio());
    assert_true!(BalanceKey::from(RatioKey::StabilizersPerWater).is_ratio());
    assert_true!(BalanceKey::from(RatioKey::EmulsifiersPerFat).is_ratio());
}

#[test]
fn balance_key_is_ratio_rejects_extensive_keys() {
    assert_false!(BalanceKey::from(CompKey::MilkFat).is_ratio());
    assert_false!(BalanceKey::from(CompKey::Energy).is_ratio());
    assert_false!(BalanceKey::from(CompKey::TotalPAC).is_ratio());
    assert_false!(BalanceKey::from(CompKey::NetPAC).is_ratio());
    assert_false!(BalanceKey::from(CompKey::Water).is_ratio());
}

#[test]
fn balance_key_ratio_parts_maps_each_ratio_key_to_its_extensive_parts() {
    assert_eq!(RatioKey::AbsPAC.parts(), (CompKey::TotalPAC, CompKey::Water));
    assert_eq!(RatioKey::AbsNetPAC.parts(), (CompKey::NetPAC, CompKey::Water));
    assert_eq!(RatioKey::StabilizersPerWater.parts(), (CompKey::TotalStabilizers, CompKey::Water));
    assert_eq!(RatioKey::EmulsifiersPerFat.parts(), (CompKey::TotalEmulsifiers, CompKey::TotalFats));
    assert_eq!(BalanceKey::from(RatioKey::AbsPAC).ratio_parts(), Some((CompKey::TotalPAC, CompKey::Water)));
    assert_eq!(BalanceKey::from(CompKey::MilkFat).ratio_parts(), None);
}

#[test]
fn target_row_coeff_and_rhs_encode_ratio_as_homogeneous_row() {
    let milk = get_comp_by_name("3.25% Milk"); // has both Water and TotalPAC

    // Common case: a ratio key with non-zero numerator and denominator yields the homogeneous
    // combination `num - (R/100)*den` — a finite, non-zero coefficient.
    let r = 9.0;
    let abs_pac_coeff = target_row_coeff(RatioKey::AbsPAC.into(), r, &milk);
    assert_true!(abs_pac_coeff.is_finite() && abs_pac_coeff != 0.0);
    assert_eq!(abs_pac_coeff, milk.get(CompKey::TotalPAC) - (r / 100.0) * milk.get(CompKey::Water));
    assert_eq!(target_row_rhs(RatioKey::AbsPAC.into(), r), 0.0);

    // Degenerate case: a zero denominator (Sucrose has no water) stays finite — no division.
    let sucrose = get_comp_by_name("Sucrose");
    let stab_coeff = target_row_coeff(RatioKey::StabilizersPerWater.into(), 0.5, &sucrose);
    assert_true!(stab_coeff.is_finite());
    // Zero stabilizers and zero water → a zero homogeneous coefficient.
    assert_eq!(stab_coeff, 0.0);
    assert_eq!(target_row_rhs(RatioKey::StabilizersPerWater.into(), 0.5), 0.0);

    // Extensive key: coefficient is comp.get(key), RHS is the target itself.
    assert_eq!(target_row_coeff(CompKey::MilkFat.into(), 16.0, &milk), milk.get(CompKey::MilkFat));
    assert_eq!(target_row_rhs(CompKey::MilkFat.into(), 16.0), 16.0);
}

#[test]
fn get_balanceable_keys_includes_ratio_and_fpd_keys() {
    let balanceable = get_all_balanceable_keys();
    assert_eq!(balanceable.len(), CompKey::iter().count() + RatioKey::iter().count() + FpdKey::iter().count());
    assert_true!(balanceable.contains(&BalanceKey::from(CompKey::ABV)));
    assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::AbsPAC)));
    assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::AbsNetPAC)));
    assert_true!(balanceable.contains(&BalanceKey::from(CompKey::NetPAC)));
    assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::StabilizersPerWater)));
    assert_true!(balanceable.contains(&BalanceKey::from(RatioKey::EmulsifiersPerFat)));
    assert_true!(balanceable.contains(&BalanceKey::from(FpdKey::ServingTemp)));
}

#[test]
fn get_native_balancing_keys_excludes_proxied_keys() {
    let native = get_all_native_balancing_keys();
    // The maximal translation-free set: every key except `ABV` and the FPD keys, which have a
    // proxy. No two native keys resolve to the same solver key, so the whole set is targetable.
    assert_eq!(native.len(), CompKey::iter().count() - 1 + RatioKey::iter().count());
    assert_true!(native.iter().all(|key| key.proxy().is_none()));
    assert_false!(native.contains(&BalanceKey::from(CompKey::ABV)));
    assert_true!(native.contains(&BalanceKey::from(CompKey::Alcohol)));
    assert_true!(native.contains(&BalanceKey::from(RatioKey::AbsPAC)));
}

#[test]
fn balance_key_extent_and_proxy_classification() {
    // The full classification: `ABV`, ratio, and FPD keys are intensive, every other comp key
    // extensive; only `ABV` and the FPD keys have a proxy (ratio keys solve natively).
    for key in get_all_balanceable_keys() {
        match key {
            BalanceKey::Comp(CompKey::ABV) => {
                assert_eq!(key.extent(), Extent::Intensive);
                assert_eq!(key.proxy(), Some(BalanceKey::Comp(CompKey::Alcohol)));
            }
            BalanceKey::Comp(_) => {
                assert_eq!(key.extent(), Extent::Extensive);
                assert_eq!(key.proxy(), None);
            }
            BalanceKey::Ratio(_) => {
                assert_eq!(key.extent(), Extent::Intensive);
                assert_eq!(key.proxy(), None);
            }
            BalanceKey::Fpd(fpd_key) => {
                assert_eq!(key.extent(), Extent::Intensive);
                let expected = match fpd_key {
                    FpdKey::FPD => RatioKey::AbsPAC,
                    FpdKey::ServingTemp | FpdKey::HardnessAt14C => RatioKey::AbsNetPAC,
                };
                assert_eq!(key.proxy(), Some(BalanceKey::Ratio(expected)));
            }
        }
        assert_eq!(
            *key.target_domain().start() < 0.0,
            matches!(key, BalanceKey::Fpd(FpdKey::FPD | FpdKey::ServingTemp))
        );
    }
}

#[test]
fn balance_key_serde_fpd_untagged() {
    // FPD keys join the untagged flat-string encoding shared with `PropKey`.
    let key: BalanceKey = serde_json::from_str("\"ServingTemp\"").unwrap();
    assert_eq!(key, BalanceKey::Fpd(FpdKey::ServingTemp));
    assert_eq!(serde_json::to_string(&key).unwrap(), "\"ServingTemp\"");
}

#[test]
fn balance_key_value_reads_fpd_keys() {
    // An empty composition is all water: FPD 0°C, and hardness undefined (`NaN`)
    let comp = Composition::new();
    assert_eq!(BalanceKey::from(FpdKey::FPD).value(&comp), 0.0);
    assert_true!(BalanceKey::from(FpdKey::HardnessAt14C).value(&comp).is_nan());
}

#[test]
fn composition_balance_targets_reads_key_values() {
    let comp = get_comp_by_name("Whole Milk");
    let keys = [
        BalanceKey::from(CompKey::MilkFat),
        BalanceKey::from(CompKey::Water),
        BalanceKey::from(RatioKey::AbsPAC),
    ];
    let targets = composition_balance_targets(&comp, &keys);

    assert_eq!(targets.len(), keys.len());
    assert_eq_flt_test!(targets[0].1, comp.get(CompKey::MilkFat));
    assert_eq_flt_test!(targets[1].1, comp.get(CompKey::Water));
    assert_eq_flt_test!(targets[2].1, comp.get_ratio(RatioKey::AbsPAC));
}

#[test]
fn ratio_key_zero_denominator_ingredient_stays_finite() {
    let comps = comps_from_names(STABILIZER_AND_SUCROSE_ING);
    let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

    let balanced =
        balance_compositions_nnls(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[]).unwrap();

    assert_true!(balanced.iter().all(|(_, amount)| amount.is_finite()));
    assert_true!(achieved_value(&balanced, RatioKey::StabilizersPerWater).is_finite());
}

#[test]
fn ratio_key_target_nalgebra_does_not_panic() {
    let comps = comps_from_names(STABILIZER_AND_SUCROSE_ING);
    let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

    let balanced =
        balance_compositions_nalgebra(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[]).unwrap();
    assert_true!(achieved_value(&balanced, RatioKey::StabilizersPerWater).is_finite());
}

#[test]
fn balance_recovers_stabilizers_per_water_ratio() {
    let comps = comps_from_names(DAIRY_STABILIZER_ING);
    let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

    let balanced =
        balance_compositions_nnls(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[]).unwrap();
    assert_eq_flt_test!(achieved_value(&balanced, RatioKey::StabilizersPerWater), target);
}

#[test]
fn balance_recovers_abs_pac_ratio() {
    let comps = comps_from_names(SORBET_ING);
    let target = achieved_value(&equal_parts_reference(&comps), RatioKey::AbsPAC);

    let balanced = balance_compositions_nnls(&comps, &[(RatioKey::AbsPAC.into(), target)], None, &[]).unwrap();
    assert_eq_flt_test!(achieved_value(&balanced, RatioKey::AbsPAC), target);
}

/// A realistically-proportioned chocolate reference over [`DAIRY_COCOA_ING`]: enough cocoa to
/// keep `NetPAC` below `TotalPAC`, but little enough that it stays positive — unlike an
/// equal-parts mix (see [`balance_compositions_rejects_negative_net_pac_target`]).
fn chocolate_reference() -> Vec<(Composition, f64)> {
    comps_from_names(DAIRY_COCOA_ING)
        .into_iter()
        .zip([0.50, 0.20, 0.05, 0.25]) // Milk, Cream, Cocoa, Sucrose — sums to 1
        .collect()
}

#[test]
fn balance_recovers_abs_net_pac_ratio() {
    // Cocoa carries a non-zero hardness factor, so NetPAC (= TotalPAC − HF) — and hence the
    // AbsNetPAC ratio — is genuinely distinct from AbsPAC for this palette, not an alias of it.
    let comps = comps_from_names(DAIRY_COCOA_ING);
    let target = achieved_value(&chocolate_reference(), RatioKey::AbsNetPAC);
    assert_gt!(target, 0.0); // guard: the reference keeps NetPAC (and so the ratio) positive

    let balanced = balance_compositions_nnls(&comps, &[(RatioKey::AbsNetPAC.into(), target)], None, &[]).unwrap();
    assert_eq_flt_test!(achieved_value(&balanced, RatioKey::AbsNetPAC), target);
}

#[test]
fn balance_recovers_net_pac_distinct_from_total_pac() {
    // Cocoa's hardness factor keeps NetPAC strictly below TotalPAC; recovering both at once
    // proves NetPAC is its own HF-subtracted extensive key, not an alias of TotalPAC.
    let comps = comps_from_names(DAIRY_COCOA_ING);
    let reference = chocolate_reference();
    let total_pac = achieved_value(&reference, CompKey::TotalPAC);
    let net_pac = achieved_value(&reference, CompKey::NetPAC);

    // The hardness factor separates the two keys, yet NetPAC stays positive for this mix.
    assert_gt!(net_pac, 0.0);
    assert_lt!(net_pac, total_pac);

    let targets = [(CompKey::TotalPAC.into(), total_pac), (CompKey::NetPAC.into(), net_pac)];
    let balanced = balance_compositions_nnls(&comps, &targets, None, &[]).unwrap();

    assert_eq_flt_test!(achieved_value(&balanced, CompKey::TotalPAC), total_pac);
    assert_eq_flt_test!(achieved_value(&balanced, CompKey::NetPAC), net_pac);
}

#[test]
fn balance_compositions_rejects_negative_net_pac_target() {
    // NetPAC can legitimately be negative (HF > TotalPAC), yet balancing still rejects a
    // negative target (see `BalancingIssue::OutOfDomainTarget`). A 25%-cocoa equal-parts mix has
    // enough hardness factor to push its own NetPAC below zero, making it an invalid target.
    let comps = comps_from_names(DAIRY_COCOA_ING);
    let net_pac = achieved_value(&equal_parts_reference(&comps), CompKey::NetPAC);
    assert_lt!(net_pac, 0.0); // the equal-parts cocoa mix drives NetPAC below zero

    let result = balance_compositions(&comps, &[(CompKey::NetPAC.into(), net_pac)], None, &[]);
    assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
}

#[test]
fn balance_recovers_emulsifiers_per_fat_ratio() {
    let comps = comps_from_names(EMULSIFIER_ING);
    let target = achieved_value(&equal_parts_reference(&comps), RatioKey::EmulsifiersPerFat);

    let balanced =
        balance_compositions_nnls(&comps, &[(RatioKey::EmulsifiersPerFat.into(), target)], None, &[]).unwrap();
    assert_eq_flt_test!(achieved_value(&balanced, RatioKey::EmulsifiersPerFat), target);
}

#[test]
fn balance_recovers_stabilizers_per_water_with_extensive_target() {
    let comps = comps_from_names(DAIRY_STABILIZER_ING);
    let reference = equal_parts_reference(&comps);
    let milk_fat = achieved_value(&reference, CompKey::MilkFat);
    let ratio = achieved_value(&reference, RatioKey::StabilizersPerWater);
    let targets = [
        (CompKey::MilkFat.into(), milk_fat),
        (RatioKey::StabilizersPerWater.into(), ratio),
    ];

    let balanced = balance_compositions_nnls(&comps, &targets, None, &[]).unwrap();

    assert_eq_flt_test!(achieved_value(&balanced, CompKey::MilkFat), milk_fat);
    assert_eq_flt_test!(achieved_value(&balanced, RatioKey::StabilizersPerWater), ratio);
}

#[test]
fn balance_recovers_emulsifiers_per_fat_with_extensive_target() {
    let comps = comps_from_names(EMULSIFIER_ING);
    let reference = equal_parts_reference(&comps);
    let milk_fat = achieved_value(&reference, CompKey::MilkFat);
    let ratio = achieved_value(&reference, RatioKey::EmulsifiersPerFat);
    let targets = [
        (CompKey::MilkFat.into(), milk_fat),
        (RatioKey::EmulsifiersPerFat.into(), ratio),
    ];

    let balanced = balance_compositions_nnls(&comps, &targets, None, &[]).unwrap();

    assert_eq_flt_test!(achieved_value(&balanced, CompKey::MilkFat), milk_fat);
    assert_eq_flt_test!(achieved_value(&balanced, RatioKey::EmulsifiersPerFat), ratio);
}

#[test]
fn estimate_ratio_denominator_uses_denominator_target_exactly() {
    // When the denominator key (Water for AbsPAC, TotalFats for EmulsifiersPerFat) is itself a
    // target, that exact value is used — it is the most direct statement of intent.
    assert_eq!(estimate_ratio_denominator(RatioKey::AbsPAC.into(), &[(CompKey::Water.into(), 70.0)]), Some(70.0));
    assert_eq!(
        estimate_ratio_denominator(RatioKey::StabilizersPerWater.into(), &[(CompKey::Water.into(), 55.0)]),
        Some(55.0)
    );
    assert_eq!(
        estimate_ratio_denominator(RatioKey::EmulsifiersPerFat.into(), &[(CompKey::TotalFats.into(), 12.0)]),
        Some(12.0)
    );
}

#[test]
fn estimate_ratio_denominator_infers_water_from_total_solids() {
    // Absent a Water target, Water is inferred as 100 − TotalSolids − Alcohol.
    assert_eq!(
        estimate_ratio_denominator(RatioKey::AbsPAC.into(), &[(CompKey::TotalSolids.into(), 30.0)]),
        Some(70.0)
    );
    // AbsNetPAC is also Water-denominated, so it shares the same inference path.
    assert_eq!(
        estimate_ratio_denominator(RatioKey::AbsNetPAC.into(), &[(CompKey::TotalSolids.into(), 30.0)]),
        Some(70.0)
    );
    assert_eq!(
        estimate_ratio_denominator(
            RatioKey::AbsPAC.into(),
            &[(CompKey::TotalSolids.into(), 30.0), (CompKey::Alcohol.into(), 5.0)]
        ),
        Some(65.0)
    );
}

#[test]
fn estimate_ratio_denominator_falls_back_to_typical_mix_constants() {
    use crate::constants::balancing::{TYPICAL_MIX_FAT, TYPICAL_MIX_WATER};

    // No denominator signal → the typical-mix constant for that denominator.
    assert_eq!(estimate_ratio_denominator(RatioKey::AbsPAC.into(), &[]), Some(TYPICAL_MIX_WATER));
    assert_eq!(
        estimate_ratio_denominator(RatioKey::StabilizersPerWater.into(), &[(CompKey::MilkFat.into(), 12.0)]),
        Some(TYPICAL_MIX_WATER)
    );
    // TotalFats has no inference path, so even a TotalSolids target leaves the fat fallback.
    assert_eq!(
        estimate_ratio_denominator(RatioKey::EmulsifiersPerFat.into(), &[(CompKey::TotalSolids.into(), 30.0)]),
        Some(TYPICAL_MIX_FAT)
    );
}

#[test]
fn estimate_ratio_denominator_returns_none_for_extensive_key() {
    assert_eq!(estimate_ratio_denominator(CompKey::MilkFat.into(), &[]), None);
    assert_eq!(estimate_ratio_denominator(CompKey::Energy.into(), &[(CompKey::Energy.into(), 200.0)]), None);
}

#[test]
fn ratio_reweighting_recovers_despite_off_seed() {
    use crate::constants::balancing::{RATIO_REWEIGHT_TOLERANCE, TYPICAL_MIX_WATER};

    let comps = comps_from_names(DAIRY_STABILIZER_ING);
    let target = achieved_value(&equal_parts_reference(&comps), RatioKey::StabilizersPerWater);

    // With only a ratio target, the seed denominator falls back to TYPICAL_MIX_WATER, far
    // above the dairy base's actual water, so the corrective reweighting pass must run.
    let balanced =
        balance_compositions_nnls(&comps, &[(RatioKey::StabilizersPerWater.into(), target)], None, &[]).unwrap();

    let achieved_water = achieved_value(&balanced, CompKey::Water);
    assert_gt!(
        (achieved_water - TYPICAL_MIX_WATER).abs() / TYPICAL_MIX_WATER,
        RATIO_REWEIGHT_TOLERANCE,
        "seed denominator should be materially off, so the reweighting pass is exercised"
    );
    assert_eq_flt_test!(achieved_value(&balanced, RatioKey::StabilizersPerWater), target);
}

#[test]
fn balance_over_constrained_ratio_yields_valid_mix() {
    // An over-constrained ratio + extensive system (sorbet AbsPAC) must still yield a usable
    // mix — finite, non-negative, summing to 1; the loose ceiling only rejects a blow-up.
    assert_balance_compositions(
        &comps_from_names(SORBET_ING),
        &SORBET_ABS_PAC_TARGETS,
        balance_compositions_nnls,
        Epsilons::default(),
        &KeyCeiling::new(500.0),
    );
}

#[test]
fn priority_tightens_ratio_key() {
    let comps = comps_from_names(SORBET_ING);
    let targets: &[(BalanceKey, f64)] = &SORBET_ABS_PAC_TARGETS;
    let abs_pac_target = targets
        .iter()
        .find(|(key, _)| *key == BalanceKey::from(RatioKey::AbsPAC))
        .unwrap()
        .1;

    let baseline = balance_compositions(&comps, targets, None, &[]).unwrap();
    let prioritized =
        balance_compositions(&comps, targets, None, &[(RatioKey::AbsPAC.into(), Priority::Critical)]).unwrap();

    let abs_pac_error = |balanced: &[(Composition, f64)]| {
        balance_rel_error_pp(achieved_value(balanced, RatioKey::AbsPAC), abs_pac_target)
    };
    assert_lt!(abs_pac_error(&prioritized), abs_pac_error(&baseline) - MIN_PRIORITY_EFFECT_PP);
}

// --- Solver behavior and edge cases ---

#[test]
fn nalgebra_allows_negative_amounts_while_nnls_does_not() {
    let comps = comps_from_names(BOOZY_ING);

    let nalgebra = balance_compositions_nalgebra(&comps, &BOOZY_DISPARATE_TARGETS, None, &[]).unwrap();
    let nnls = balance_compositions_nnls(&comps, &BOOZY_DISPARATE_TARGETS, None, &[]).unwrap();

    assert_true!(nalgebra.iter().any(|(_, amount)| *amount < 0.0));
    assert_true!(nnls.iter().all(|(_, amount)| *amount >= -TESTS_EPSILON),);
}

/// An under-determined system (more ingredients than targets) has many exact solutions; both
/// solvers should still return a combination that sums to 1 and hits the single target.
#[test]
fn balance_underdetermined_system_hits_target() {
    let comps = comps_from_names(DAIRY_ING); // 3 comps
    let targets = [(CompKey::MilkFat.into(), 10.0)]; // 1 target

    let solvers: [UnlockedSolverFn; 2] = [balance_compositions_nalgebra, balance_compositions_nnls];
    for solve in solvers {
        assert_balance_compositions(&comps, &targets, solve, Epsilons::default(), &KeyCeiling::exact());
    }
}

#[test]
fn relative_weighting_beats_absolute_on_disparate_targets() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;

    let max_error_for = |weighting| {
        let balanced = balance_compositions_nnls(&comps, targets, weighting, &[]).unwrap();
        max_rel_error(&balanced, targets)
    };

    let absolute = max_error_for(Some(Weighting::Absolute));
    let relative = max_error_for(None);

    assert_true!(relative < absolute);
}

// --- balance_compositions entry point ---

#[test]
fn balance_compositions_accepts_ratio_key_target() {
    let comps = comps_from_names(DAIRY_SUGAR_ING);
    let result = balance_compositions(&comps, &[(RatioKey::StabilizersPerWater.into(), 0.5)], None, &[]);
    assert!(result.is_ok());
}

#[test]
fn balance_compositions_rejects_duplicate_target() {
    let comps = comps_from_names(DAIRY_ING);
    let result =
        balance_compositions(&comps, &[(CompKey::MilkFat.into(), 16.0), (CompKey::MilkFat.into(), 12.0)], None, &[]);
    assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
}

#[test]
fn balance_compositions_rejects_non_finite_target() {
    let comps = comps_from_names(DAIRY_ING);
    let result = balance_compositions(&comps, &[(CompKey::MilkFat.into(), f64::NAN)], None, &[]);
    assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
}

#[test]
fn balance_compositions_rejects_negative_target() {
    let comps = comps_from_names(DAIRY_ING);
    let result = balance_compositions(&comps, &[(CompKey::MilkFat.into(), -1.0)], None, &[]);
    assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
}

#[test]
#[cfg(debug_assertions)]
#[should_panic(expected = "validated targets")]
fn raw_solver_debug_asserts_on_unvalidated_target() {
    // The raw solvers assume pre-validated targets; in debug builds a negative target (a caller
    // bug, since `balance_compositions` would have rejected it) trips the precondition assert.
    let comps = comps_from_names(DAIRY_ING);
    drop(balance_compositions_nnls(&comps, &[(CompKey::MilkFat.into(), -1.0)], None, &[]));
}

#[test]
fn balance_compositions_recovers_feasible_targets() {
    assert_balance_compositions(
        &comps_from_names(DAIRY_ING),
        &DAIRY_TRIVIAL_TARGETS,
        balance_compositions,
        Epsilons::default(),
        &KeyCeiling::exact(),
    );
}

#[test]
fn balance_compositions_proceeds_despite_warnings() {
    // A Sucrose > TotalSugars pair only warns; the solve still returns a best-effort result.
    let comps = comps_from_names(DAIRY_SUGAR_ING);
    let targets = [(CompKey::Sucrose.into(), 20.0), (CompKey::TotalSugars.into(), 15.0)];
    assert!(balance_compositions(&comps, &targets, None, &[]).is_ok());
}

// --- Priority ---

#[test]
fn priority_weights_increase_with_level() {
    assert_eq!(Priority::default(), Priority::Normal);
    assert_eq!(Priority::Normal.weight(), 1.0);
    assert_lt!(Priority::Low.weight(), Priority::Normal.weight());
    assert_gt!(Priority::High.weight(), Priority::Normal.weight());
    assert_gt!(Priority::Critical.weight(), Priority::High.weight());
}

#[test]
fn empty_priorities_match_explicit_normal() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;

    let empty = balance_compositions(&comps, targets, None, &[]).unwrap();
    let all_normal = balance_compositions(
        &comps,
        targets,
        None,
        &[
            (CompKey::Energy.into(), Priority::Normal),
            (CompKey::MilkFat.into(), Priority::Normal),
            (CompKey::MSNF.into(), Priority::Normal),
            (CompKey::POD.into(), Priority::Normal),
        ],
    )
    .unwrap();

    for ((_, empty_amount), (_, normal_amount)) in empty.iter().zip(all_normal.iter()) {
        assert_eq!(*empty_amount, *normal_amount);
    }
}

#[test]
fn priority_reduces_error_on_prioritized_key() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
    let pod_target = targets
        .iter()
        .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
        .unwrap()
        .1;

    let baseline = balance_compositions_nnls(&comps, targets, None, &[]).unwrap();
    let prioritized =
        balance_compositions_nnls(&comps, targets, None, &[(CompKey::POD.into(), Priority::Critical.weight())])
            .unwrap();

    let pod_error =
        |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
    assert_lt!(pod_error(&prioritized), pod_error(&baseline) - MIN_PRIORITY_EFFECT_PP);

    // Priority never scales the sum-constraint row, so mass balance is preserved.
    let amount_sum: f64 = prioritized.iter().map(|(_, amount)| *amount).sum();
    assert_eq_flt_test!(amount_sum, 1.0);
}

#[test]
fn priority_low_increases_error_on_low_priority_key() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
    let pod_target = targets
        .iter()
        .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
        .unwrap()
        .1;

    let baseline = balance_compositions_nnls(&comps, targets, None, &[]).unwrap();
    let low_weighted =
        balance_compositions_nnls(&comps, targets, None, &[(CompKey::POD.into(), Priority::Low.weight())]).unwrap();

    let pod_error =
        |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
    assert_gt!(pod_error(&low_weighted), pod_error(&baseline) + MIN_PRIORITY_EFFECT_PP);

    // Mass balance is preserved regardless of the priority weight.
    let amount_sum: f64 = low_weighted.iter().map(|(_, amount)| *amount).sum();
    assert_eq_flt_test!(amount_sum, 1.0);
}

#[test]
fn balance_compositions_threads_priorities() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
    let pod_target = targets
        .iter()
        .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
        .unwrap()
        .1;

    let baseline = balance_compositions(&comps, targets, None, &[]).unwrap();
    let prioritized =
        balance_compositions(&comps, targets, None, &[(CompKey::POD.into(), Priority::Critical)]).unwrap();

    let pod_error =
        |balanced: &[(Composition, f64)]| balance_rel_error_pp(achieved_value(balanced, CompKey::POD), pod_target);
    assert_lt!(pod_error(&prioritized), pod_error(&baseline) - MIN_PRIORITY_EFFECT_PP);
}

#[test]
fn priority_weight_values_match_documented_constants() {
    assert_eq!(Priority::Low.weight(), 0.2);
    assert_eq!(Priority::Normal.weight(), 1.0);
    assert_eq!(Priority::High.weight(), 5.0);
    assert_eq!(Priority::Critical.weight(), 25.0);
}

#[test]
fn priority_error_decreases_monotonically_with_level() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
    let pod_target = targets
        .iter()
        .find(|(key, _)| *key == BalanceKey::from(CompKey::POD))
        .unwrap()
        .1;

    let pod_error = |priorities: &[(BalanceKey, f64)]| {
        let balanced = balance_compositions_nnls(&comps, targets, None, priorities).unwrap();
        balance_rel_error_pp(achieved_value(&balanced, CompKey::POD), pod_target)
    };

    let low = pod_error(&[(CompKey::POD.into(), Priority::Low.weight())]);
    let normal = pod_error(&[]);
    let high = pod_error(&[(CompKey::POD.into(), Priority::High.weight())]);
    let critical = pod_error(&[(CompKey::POD.into(), Priority::Critical.weight())]);

    assert_lt!(normal, low - MIN_PRIORITY_EFFECT_PP);
    assert_lt!(high, normal - MIN_PRIORITY_EFFECT_PP);
    assert_lt!(critical, high - MIN_PRIORITY_EFFECT_PP);
}

#[test]
fn priority_trades_off_competing_key() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;

    let baseline = balance_compositions_nnls(&comps, targets, None, &[]).unwrap();
    let prioritized =
        balance_compositions_nnls(&comps, targets, None, &[(CompKey::POD.into(), Priority::Critical.weight())])
            .unwrap();

    let worsened = targets
        .iter()
        .filter(|(key, _)| *key != BalanceKey::from(CompKey::POD))
        .any(|&(key, target)| {
            let baseline_error = balance_rel_error_pp(achieved_value(&baseline, key), target);
            let prioritized_error = balance_rel_error_pp(achieved_value(&prioritized, key), target);
            prioritized_error > baseline_error + MIN_PRIORITY_EFFECT_PP
        });
    assert_true!(worsened, "prioritizing POD should materially worsen a competing target");
}

/// Mixed priority levels act per key, checked ceteris paribus (vary one key's level, hold the
/// other's fixed) since two prioritized keys also trade off against each other.
#[test]
fn priority_mixed_levels_tighten_each_key() {
    let comps = comps_from_names(DAIRY_ING);
    let targets: &[(BalanceKey, f64)] = &DAIRY_DISPARATE_TARGETS;
    let error_for = |priorities: &[(BalanceKey, f64)], key: BalanceKey| {
        let target = targets.iter().find(|(k, _)| *k == key).unwrap().1;
        let balanced = balance_compositions_nnls(&comps, targets, None, priorities).unwrap();
        balance_rel_error_pp(achieved_value(&balanced, key), target)
    };

    let msnf_high = (CompKey::MSNF.into(), Priority::High.weight());
    let pod_critical = (CompKey::POD.into(), Priority::Critical.weight());

    // Raising POD Normal→Critical (MSNF held High) tightens POD by a wide margin.
    let pod_before = error_for(&[msnf_high], CompKey::POD.into());
    let pod_after = error_for(&[pod_critical, msnf_high], CompKey::POD.into());
    assert_lt!(pod_after, pod_before - MIN_PRIORITY_EFFECT_PP);

    // Raising MSNF Normal→High (POD held Critical) slightly tightens MSNF: its own priority
    // pulls the right way, but only a little here, since POD's Critical dominates the solve.
    let msnf_before = error_for(&[pod_critical], CompKey::MSNF.into());
    let msnf_after = error_for(&[pod_critical, msnf_high], CompKey::MSNF.into());
    assert_le!(msnf_after, msnf_before - 0.4);
}

// --- validate_balancing_targets: error-severity issues ---

#[test]
fn validate_does_not_flag_ratio_key_target() {
    // Ratio keys are now balanceable (encoded as homogeneous rows), so they are not an error.
    let report =
        validate_balancing_targets(&comps_from_names(DAIRY_SUGAR_ING), &[(RatioKey::AbsPAC.into(), 9.0)], &[], None);
    assert_false!(report.has_errors());
}

#[test]
fn validate_flags_non_finite_target_as_error() {
    let report = validate_balancing_targets(
        &comps_from_names(DAIRY_ING),
        &[(CompKey::MilkFat.into(), f64::INFINITY)],
        &[],
        None,
    );
    assert_true!(
        report
            .errors()
            .any(|issue| matches!(issue, BalancingIssue::NonFiniteTarget { .. }))
    );
}

#[test]
fn validate_flags_negative_target_as_error() {
    let report =
        validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), -5.0)], &[], None);
    assert_true!(report.errors().any(|issue| matches!(
        issue,
        BalancingIssue::OutOfDomainTarget {
            key: BalanceKey::Comp(CompKey::MilkFat),
            ..
        }
    )));
}

#[test]
fn validate_flags_negative_ratio_target_as_error() {
    let report =
        validate_balancing_targets(&comps_from_names(DAIRY_SUGAR_ING), &[(RatioKey::AbsPAC.into(), -1.0)], &[], None);
    assert_true!(report.errors().any(|issue| matches!(
        issue,
        BalancingIssue::OutOfDomainTarget {
            key: BalanceKey::Ratio(RatioKey::AbsPAC),
            ..
        }
    )));
}

#[test]
fn validate_does_not_double_flag_out_of_domain_target() {
    // An out-of-domain target is dropped before the palette checks, so neither side of the
    // domain also draws an `UnreachableTarget` warning.
    for value in [-5.0, 150.0] {
        let report =
            validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), value)], &[], None);
        assert!(report.has_errors(), "for target value {value}");
        assert!(
            !report
                .warnings()
                .any(|issue| matches!(issue, BalancingIssue::UnreachableTarget { .. })),
            "for target value {value}"
        );
    }
}

#[test]
fn validate_does_not_flag_zero_target_as_negative() {
    let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), 0.0)], &[], None);
    assert_false!(
        report
            .errors()
            .any(|issue| matches!(issue, BalancingIssue::OutOfDomainTarget { .. }))
    );
}

#[test]
fn validate_flags_duplicate_target_as_error() {
    let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MilkFat.into(), 12.0)];
    let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets, &[], None);
    assert_true!(report.errors().any(|issue| matches!(
        issue,
        BalancingIssue::DuplicateTarget {
            key: BalanceKey::Comp(CompKey::MilkFat)
        }
    )));
}

// --- validate_balancing_targets: warning-severity issues ---

#[test]
fn validate_flags_unaffectable_target_as_warning() {
    // Plain dairy has no alcohol source, so no combination can move an Alcohol target off zero.
    let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::Alcohol.into(), 5.0)], &[], None);
    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::UnaffectableTarget {
            key: BalanceKey::Comp(CompKey::Alcohol)
        }
    )));
}

#[test]
fn validate_flags_ratio_key_with_unaffectable_numerator_as_warning() {
    // No stabilizer source in the palette → the StabilizersPerWater numerator is unaffectable,
    // so the only reachable ratio is zero and a nonzero target cannot be met. Flag (warning).
    let report = validate_balancing_targets(
        &comps_from_names(DAIRY_SUGAR_ING),
        &[(RatioKey::StabilizersPerWater.into(), 0.5)],
        &[],
        None,
    );
    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::UnaffectableTarget {
            key: BalanceKey::Ratio(RatioKey::StabilizersPerWater)
        }
    )));
}

#[test]
fn validate_flags_ratio_key_with_unaffectable_denominator_as_warning() {
    // A fat-free sorbet palette → the EmulsifiersPerFat denominator (TotalFats) is
    // unaffectable, so the ratio is undefined and cannot be balanced. Flagged (warning).
    let report = validate_balancing_targets(
        &comps_from_names(SORBET_ING),
        &[(RatioKey::EmulsifiersPerFat.into(), 1.0)],
        &[],
        None,
    );
    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::UnaffectableTarget {
            key: BalanceKey::Ratio(RatioKey::EmulsifiersPerFat)
        }
    )));
}

#[test]
fn validate_flags_unreachable_target_as_warning() {
    // The richest dairy ingredient is 40% cream, so a 50% milk-fat target is out of reach.
    let report =
        validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), 50.0)], &[], None);
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::UnreachableTarget {
            key: BalanceKey::Comp(CompKey::MilkFat),
            target: 50.0,
            min: 1.0,
            max: 40.0,
        }
    )));
}

#[test]
fn ratio_tolerance_suppresses_pinned_ratio_off_by_rounding() {
    // Cocoa is the sole source of both CocoaButter and CocoaSolids, so their ratio is pinned; a
    // feasible target rounded to its shown precision drifts just off that single value.
    let comps = comps_from_names(DAIRY_COCOA_ING);
    let (pin, pin_max) = ratio_band(&comps, &[CompKey::CocoaButter], &[CompKey::CocoaSolids]).unwrap();
    assert_eq_flt_test!(pin, pin_max); // pinned: the band is a single point

    // A feasible point, with CocoaButter rounded to 2 dp as shown.
    let cocoa_solids = 4.0;
    let cocoa_butter = (cocoa_solids * pin * 100.0).round() / 100.0;
    let targets = [
        (CompKey::CocoaSolids.into(), cocoa_solids),
        (CompKey::CocoaButter.into(), cocoa_butter),
    ];

    let strict = validate_balancing_targets(&comps, &targets, &[], None);
    assert_true!(
        strict
            .issues
            .iter()
            .any(|i| matches!(i, BalancingIssue::RatioInfeasibility { .. }))
    );

    let tolerant = validate_balancing_targets(&comps, &targets, &[], Some(0.01));
    assert_false!(
        tolerant
            .issues
            .iter()
            .any(|i| matches!(i, BalancingIssue::RatioInfeasibility { .. }))
    );
}

#[test]
fn structural_tolerance_suppresses_rollup_over_sum_off_by_rounding() {
    // MilkFat and CocoaButter are children of TotalFats, so their targets may not sum above it;
    // rounding each part to its shown precision can nudge that sum a hair over the whole.
    let targets = [
        (CompKey::TotalFats.into(), 6.0),
        (CompKey::MilkFat.into(), 3.0),
        (CompKey::CocoaButter.into(), 3.01),
    ];

    let strict = raw_issues(|o| append_structural_issues(&targets, 0.0, o));
    assert_true!(
        strict
            .iter()
            .any(|i| matches!(i, BalancingIssue::StructuralViolation { .. }))
    );

    let tolerant = raw_issues(|o| append_structural_issues(&targets, 0.01, o));
    assert_false!(
        tolerant
            .iter()
            .any(|i| matches!(i, BalancingIssue::StructuralViolation { .. }))
    );
}

#[test]
fn validate_flags_structural_violation_from_combined_non_exhaustive_children() {
    // MilkFat and CocoaButter are structurally part of TotalFats, so their sum (12) must not
    // exceed the TotalFats target (10), which must be flagged. Individually they are fine, and
    // they are not all the children so an exact rollup violation cannot be flagged.
    let comps = comps_from_names(DAIRY_SUGAR_ING);
    let targets = [
        (CompKey::TotalFats.into(), 10.0),
        (CompKey::MilkFat.into(), 6.0),
        (CompKey::CocoaButter.into(), 6.0),
    ];

    // Raw generators: CocoaButter is unaffectable (no ingredient supplies it), so the unified
    // palette search can never reference it and thus cannot see the over-sum — only the
    // palette-independent structural check flags MilkFat + CocoaButter exceeding TotalFats.
    let structural = raw_issues(|o| append_structural_issues(&targets, 0.0, o));
    assert_true!(
        structural
            .iter()
            .any(|i| matches!(i, BalancingIssue::StructuralViolation { .. }))
    );
    let palette = raw_issues(|o| append_palette_ratio_issues(&comps, &targets, 0.0, o));
    assert_false!(
        palette
            .iter()
            .any(|i| i.affected_keys().contains(&BalanceKey::Comp(CompKey::CocoaButter)))
    );

    // Deduplicated report: the structural over-sum, with nothing to deduplicate against.
    let report = validate_balancing_targets(&comps, &targets, &[], None);
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::StructuralViolation {
            whole: BalanceKey::Comp(CompKey::TotalFats),
            parts_target_sum,
            whole_target,
            parts,
        } if parts.as_slice() == [BalanceKey::Comp(CompKey::MilkFat), BalanceKey::Comp(CompKey::CocoaButter)]
            && *parts_target_sum == 12.0
            && *whole_target == 10.0
    )));
}

#[test]
fn validate_flags_structural_dominance_for_sucrose_over_total_sugars() {
    // Sucrose is structurally part of TotalSugars, so a Sucrose target above the TotalSugars
    // target is a logical contradiction the palette-independent structural check catches first
    let comps = comps_from_names(DAIRY_SUGAR_ING);
    let targets = [(CompKey::Sucrose.into(), 20.0), (CompKey::TotalSugars.into(), 15.0)];

    // Raw generators: structural and the unified palette search both flag the single part over
    // its whole — structural as a StructuralViolation, the palette as a DominanceViolation.
    let structural = raw_issues(|o| append_structural_issues(&targets, 0.0, o));
    let palette = raw_issues(|o| append_palette_ratio_issues(&comps, &targets, 0.0, o));
    assert_true!(
        structural
            .iter()
            .any(|i| matches!(i, BalancingIssue::StructuralViolation { .. }))
    );
    assert_true!(
        palette
            .iter()
            .any(|i| matches!(i, BalancingIssue::DominanceViolation { .. }))
    );

    let report = validate_balancing_targets(&comps, &targets, &[], None);
    assert_false!(report.has_errors());
    // Deduplicated report: the structural framing is the only flag for this part/whole pair.
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::StructuralViolation {
            whole: BalanceKey::Comp(CompKey::TotalSugars),
            parts_target_sum,
            whole_target,
            parts,
        } if parts.as_slice() == [BalanceKey::Comp(CompKey::Sucrose)]
            && *parts_target_sum == 20.0
            && *whole_target == 15.0
    )));
    assert_false!(
        report
            .warnings()
            .any(|issue| matches!(issue, BalancingIssue::DominanceViolation { .. }))
    );
}

#[test]
fn validate_flags_transitive_part_over_distant_whole() {
    // MilkFat is only a *transitive* part of TotalSolids (via TotalFats / MilkSolids, neither
    // targeted), so the direct-only structural check cannot see MilkFat (50) exceeding
    // TotalSolids (40). The palette search catches it (MilkFat <= TotalSolids in every
    // ingredient), and with no structural framing to defer to, it survives deduplication —
    // the case the removed structural-ownership skip used to drop on its transitive branch.
    let comps = comps_from_names(DAIRY_ING);
    let targets = [(CompKey::MilkFat.into(), 50.0), (CompKey::TotalSolids.into(), 40.0)];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.has_errors());
    // The structural check stays silent: neither of MilkFat's direct wholes is a target.
    assert_true!(raw_issues(|o| append_structural_issues(&targets, 0.0, o)).is_empty());
    // The palette dominance is reported, not lost.
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::DominanceViolation {
            greater: BalanceKey::Comp(CompKey::TotalSolids),
            lesser,
            ..
        } if lesser.as_slice() == [BalanceKey::Comp(CompKey::MilkFat)]
    )));
}

#[test]
fn validate_flags_structural_violation_for_sugar_group_over_total_sugars() {
    // Sucrose + Fructose are both parts of TotalSugars, yet their targets sum to 20 > 15 —
    // infeasible only as a group (no single sugar exceeds TotalSugars). The palette-independent
    // structural check owns this part-group-over-whole contradiction; the additive palette
    // dominance that also detects it is deduplicated away (no duplicate report).
    let comps = comps_from_names(SUGAR_BLEND_ING);
    let targets = [
        (CompKey::Sucrose.into(), 10.0),
        (CompKey::Fructose.into(), 10.0),
        (CompKey::TotalSugars.into(), 15.0),
    ];

    // Raw generators: the structural check and the unified palette search both flag the group
    // over its whole — structural as a StructuralViolation, the palette search as the minimal
    // off-band pair (a max≤1 overshoot, so the friendlier DominanceViolation).
    let structural = raw_issues(|o| append_structural_issues(&targets, 0.0, o));
    let palette = raw_issues(|o| append_palette_ratio_issues(&comps, &targets, 0.0, o));
    assert_true!(
        structural
            .iter()
            .any(|i| matches!(i, BalancingIssue::StructuralViolation { .. }))
    );
    assert_true!(
        palette
            .iter()
            .any(|i| matches!(i, BalancingIssue::DominanceViolation { .. }))
    );

    let report = validate_balancing_targets(&comps, &targets, &[], None);
    assert_false!(report.has_errors());
    // No single-part contradiction: every individual sugar target is within TotalSugars.
    assert_false!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::StructuralViolation { parts, .. } if parts.len() == 1
    )));
    // The group is reported once, as a structural violation over the two targeted parts.
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::StructuralViolation {
            whole: BalanceKey::Comp(CompKey::TotalSugars),
            parts,
            parts_target_sum,
            whole_target,
        } if parts.len() == 2
            && parts.contains(&BalanceKey::Comp(CompKey::Sucrose))
            && parts.contains(&BalanceKey::Comp(CompKey::Fructose))
            && *parts_target_sum == 20.0
            && *whole_target == 15.0
    )));
    // The palette search's dominance for the same group is deduplicated against the structural
    // framing — neither a dominance nor a ratio issue should appear in the report.
    assert_false!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::DominanceViolation { .. } | BalancingIssue::RatioInfeasibility { .. }
    )));
}

#[ignore = "TODO: This currently documents an implementation gap, enable once fixed"]
#[test]
fn validate_does_not_flag_unaffectable_for_zero_target() {
    // A zero target for a key no ingredient supplies is trivially satisfied
    let report =
        validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::CocoaSolids.into(), 0.0)], &[], None);

    assert_false!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::UnaffectableTarget {
            key: BalanceKey::Comp(CompKey::CocoaSolids)
        }
    )));
}

#[ignore = "TODO: This currently documents an implementation gap, enable once fixed"]
#[test]
fn validate_does_not_flag_self_dominance_for_duplicate_target() {
    // A duplicated target key is already an error (`DuplicateTarget`); the dominance check must
    // not additionally compare the key against itself and emit a nonsensical "X exceeds X"
    let comps = comps_from_names(DAIRY_ING);
    let targets = [(CompKey::TotalSolids.into(), 30.0), (CompKey::TotalSolids.into(), 32.0)];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::DominanceViolation { lesser, greater, .. } if lesser.first() == Some(greater)
    )));
}

#[test]
fn validate_clean_targets_yield_empty_report() {
    let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &DAIRY_TRIVIAL_TARGETS, &[], None);
    assert_true!(report.is_empty());
    assert_false!(report.has_errors());
}

#[test]
fn validate_flags_ratio_infeasibility_for_pinned_cocoa_ratio() {
    // The only cocoa source pins CocoaButter : CocoaSolids ≈ 0.2. A 2 : 5 (0.4) target is off
    // that pin yet keeps CocoaButter <= CocoaSolids, so only the ratio-band check catches it.
    let comps = comps_from_names(DAIRY_COCOA_ING);
    let targets = [(CompKey::CocoaButter.into(), 2.0), (CompKey::CocoaSolids.into(), 5.0)];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RatioInfeasibility {
            numerator,
            denominator: BalanceKey::Comp(CompKey::CocoaSolids),
            target_ratio,
            ..
        } if numerator.as_slice() == [BalanceKey::Comp(CompKey::CocoaButter)]
            && are_eq_flt_test(*target_ratio, 0.4)
    )));

    // It is an off-band ratio, not a dominance violation (CocoaButter <= CocoaSolids holds).
    assert_false!(
        report
            .warnings()
            .any(|issue| matches!(issue, BalancingIssue::DominanceViolation { .. }))
    );
}

#[test]
fn validate_flags_ratio_infeasibility_from_multiple_sources() {
    // All three dairy ingredients pin MilkProteins : MSNF ≈ 0.35. A target of 3 : 10 = 0.30
    // is off-band even though multiple sources agree on the same pinned value.
    let comps = comps_from_names(DAIRY_ING);
    // MilkProteins is listed first so it becomes the numerator in the pairwise check.
    let targets = [(CompKey::MilkProteins.into(), 3.0), (CompKey::MSNF.into(), 10.0)];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RatioInfeasibility {
            numerator,
            denominator: BalanceKey::Comp(CompKey::MSNF),
            target_ratio,
            ..
        } if numerator.as_slice() == [BalanceKey::Comp(CompKey::MilkProteins)]
            && are_eq_flt_test(*target_ratio, 0.3)
    )));
}

#[test]
fn validate_flags_multi_ratio_infeasibility_from_multiple_sources() {
    // Every sugar in these two milks is a named one (Sealtest is all lactose, lactose-free is
    // all glucose + galactose), so the sugars summed over TotalSugars are pinned near 1. Each
    // sugar fits individually, yet Lactose + one monosaccharide already undershoots that pin —
    // the unified search reports the minimal offending pair, not the full three-key group.
    let comps = comps_from_names(&["Sealtest 0% Skim Milk", "Lactose-Free 0% Milk"]);
    let targets = [
        (CompKey::TotalSugars.into(), 4.7),
        (CompKey::Lactose.into(), 1.0),
        (CompKey::Glucose.into(), 0.5),
        (CompKey::Galactose.into(), 0.5),
    ];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RatioInfeasibility {
            numerator,
            denominator: BalanceKey::Comp(CompKey::TotalSugars),
            target_ratio,
            ..
        } if numerator.len() == 2
            && numerator.contains(&BalanceKey::Comp(CompKey::Lactose))
            && are_eq_flt_test(*target_ratio, 1.5 / 4.7)
    )));
}

#[test]
fn validate_flags_three_key_overshoot_that_no_pair_catches() {
    use crate::composition::{Fats, Micro, Solids, SolidsBreakdown};

    // Anti-correlated synthetic palette over the denominator Salt. Each of OtherFats, NutFat,
    // EggFat peaks (relative to Salt) in a different ingredient, so x/D = [0.4, 1.2] and every
    // 2-key combined ratio is [1.6, 2.4] — yet (OtherFats + NutFat + EggFat) / Salt is pinned
    // at 2.8 everywhere. With targets x=y=z=3, D=3 the singles (1.0) and pairs (2.0) sit
    // in-band, but the triple share 3.0 overshoots 2.8.
    let comp = |x: f64, y: f64, z: f64, d: f64| {
        Composition::new()
            .solids(
                Solids::new()
                    .other(SolidsBreakdown::new().fats(Fats::new().total(x)))
                    .nut(SolidsBreakdown::new().fats(Fats::new().total(y)))
                    .egg(SolidsBreakdown::new().fats(Fats::new().total(z))),
            )
            .micro(Micro::new().salt(d))
    };
    let comps = vec![
        comp(2.4, 2.4, 0.8, 2.0),
        comp(3.6, 1.2, 3.6, 3.0),
        comp(1.6, 4.8, 4.8, 4.0),
    ];
    let targets = [
        (CompKey::OtherFats.into(), 3.0),
        (CompKey::NutFat.into(), 3.0),
        (CompKey::EggFat.into(), 3.0),
        (CompKey::Salt.into(), 3.0),
    ];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.has_errors());
    // Each single and pair is in-band, so no 1- or 2-key numerator is flagged — the overshoot
    // is purely a >= 3-key effect that a pairs-only check would miss.
    assert_false!(report.warnings().any(|issue| match issue {
        BalancingIssue::DominanceViolation { .. } => true,
        BalancingIssue::RatioInfeasibility { numerator, .. } => numerator.len() < 3,
        _ => false,
    }));
    // The unified search forms numerator subsets up to MAX_NUMERATOR_GROUP_SIZE, so it catches
    // the 3-key combined share 3.0 overshooting the [2.8, 2.8] band.
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RatioInfeasibility {
            numerator,
            denominator: BalanceKey::Comp(CompKey::Salt),
            ..
        } if numerator.len() == 3
    )));
}

#[test]
fn validate_flags_multi_ratio_infeasibility_when_combined_exceeds_band_max() {
    // In DAIRY_ING, the (MilkFat + MSNF) / Water band is approximately [0.136, 32.33].
    // The individual pairwise bands for MilkFat/Water ≈ [0.037, 0.733] and
    // MSNF/Water ≈ [0.099, 32] are each satisfied by these targets, but the combined band
    // max (32.33) is lower than the sum of the individual maxima (32.73), so targets can
    // exceed the combined max without triggering either pairwise check.
    let comps = comps_from_names(DAIRY_ING);
    let targets = [
        (CompKey::MilkFat.into(), 1.5), // MilkFat/Water = 0.5 — within [0.037, 0.733]
        (CompKey::MSNF.into(), 96.0),   // MSNF/Water   = 32  — within [0.099, 32]
        (CompKey::Water.into(), 3.0),   // combined     = 32.5 — above 32.33
    ];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RatioInfeasibility {
            numerator,
            denominator: BalanceKey::Comp(CompKey::Water),
            ..
        } if numerator.len() == 2
            && numerator.contains(&BalanceKey::Comp(CompKey::MilkFat))
            && numerator.contains(&BalanceKey::Comp(CompKey::MSNF))
    )));

    // No pairwise ratio issue fires — both individual ratios are within their bands.
    assert_false!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RatioInfeasibility { numerator, .. } if numerator.len() == 1
    )));
}

#[test]
fn validate_no_multi_ratio_issue_when_combined_within_band() {
    // Same palette; combined ratio of 32 is within the [0.136, 32.33] band.
    let comps = comps_from_names(DAIRY_ING);
    let targets = [
        (CompKey::MilkFat.into(), 1.0),
        (CompKey::MSNF.into(), 95.0),
        (CompKey::Water.into(), 3.0),
    ];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RatioInfeasibility { numerator, .. } if numerator.len() == 2
    )));
}

#[test]
fn validate_flags_palette_dominance_for_non_structural_pair() {
    // CocoaButter and CocoaSolids are siblings, and the lone cocoa source pins CocoaButter <=
    // CocoaSolids, so a higher CocoaButter target is a palette dominance violation.
    let comps = comps_from_names(DAIRY_COCOA_ING);
    let targets = [(CompKey::CocoaButter.into(), 10.0), (CompKey::CocoaSolids.into(), 5.0)];

    // Raw generators: a sibling pair is not a part/whole relation, so structural stays silent
    // and only the unified palette search flags the dominance — nothing to deduplicate against.
    let structural = raw_issues(|o| append_structural_issues(&targets, 0.0, o));
    let palette = raw_issues(|o| append_palette_ratio_issues(&comps, &targets, 0.0, o));
    assert_true!(structural.is_empty());
    assert_true!(
        palette
            .iter()
            .any(|i| matches!(i, BalancingIssue::DominanceViolation { .. }))
    );

    let report = validate_balancing_targets(&comps, &targets, &[], None);
    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::DominanceViolation {
            greater: BalanceKey::Comp(CompKey::CocoaSolids),
            lesser,
            lesser_target_sum,
            greater_target,
        } if lesser.as_slice() == [BalanceKey::Comp(CompKey::CocoaButter)]
            && *lesser_target_sum == 10.0
            && *greater_target == 5.0
    )));

    // Siblings, not a part/whole pair, so the structural check stays silent.
    assert_false!(
        report
            .warnings()
            .any(|issue| matches!(issue, BalancingIssue::StructuralViolation { .. }))
    );
}

#[test]
fn validate_flags_rollup_sum_mismatch_for_incomplete_milk_solids() {
    // MilkSolids is a residual-free roll-up of MilkFat + MSNF, so both children targets must
    // sum to it. 10 + 5 = 15 != 20 contradicts the palette-independent completeness check.
    let comps = comps_from_names(DAIRY_ING);
    let targets = [
        (CompKey::MilkFat.into(), 10.0),
        (CompKey::MSNF.into(), 5.0),
        (CompKey::MilkSolids.into(), 20.0),
    ];

    // Raw generators: structural emits the roll-up mismatch; the unified palette search emits a
    // ratio infeasibility for the same children (their band is pinned at 1 by the residual-free
    // roll-up). Both make the same undershoot claim, so the report keeps only the mismatch.
    let structural = raw_issues(|o| append_structural_issues(&targets, 0.0, o));
    let palette = raw_issues(|o| append_palette_ratio_issues(&comps, &targets, 0.0, o));
    assert_true!(
        structural
            .iter()
            .any(|i| matches!(i, BalancingIssue::RollupSumMismatch { .. }))
    );
    assert_true!(
        palette
            .iter()
            .any(|i| matches!(i, BalancingIssue::RatioInfeasibility { .. }))
    );

    let report = validate_balancing_targets(&comps, &targets, &[], None);
    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::RollupSumMismatch {
            whole: BalanceKey::Comp(CompKey::MilkSolids),
            parts,
            parts_target_sum,
            whole_target,
        } if parts.as_slice() == [BalanceKey::Comp(CompKey::MilkFat), BalanceKey::Comp(CompKey::MSNF)]
            && *parts_target_sum == 15.0
            && *whole_target == 20.0
    )));
    // The ratio framing of the same mismatch is deduplicated — only the mismatch remains.
    assert_false!(
        report
            .warnings()
            .any(|issue| matches!(issue, BalancingIssue::RatioInfeasibility { .. }))
    );
}

#[test]
fn validate_flags_unreachable_ratio_key_target() {
    // Ratio keys now get a reachability check: every dairy ingredient has positive water, so
    // AbsPAC (TotalPAC / Water) has a finite band an enormous target overshoots.
    let report =
        validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(RatioKey::AbsPAC.into(), 1.0e9)], &[], None);

    assert_false!(report.has_errors());
    assert_true!(report.warnings().any(|issue| matches!(
        issue,
        BalancingIssue::UnreachableTarget {
            key: BalanceKey::Ratio(RatioKey::AbsPAC),
            ..
        }
    )));
}

#[test]
fn validate_flags_over_determination_as_information() {
    // Three movable targets with only three ingredients: the sum-to-one constraint leaves two
    // free dimensions, so the system is over-determined. Advisory only — never blocks.
    let comps = comps_from_names(DAIRY_ING);
    let targets = [
        (CompKey::MilkFat.into(), 16.0),
        (CompKey::MSNF.into(), 11.0),
        (CompKey::Lactose.into(), 5.0),
    ];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_false!(report.has_errors());
    assert_true!(report.infos().any(|issue| matches!(
        issue,
        BalancingIssue::OverDetermined {
            target_count: 3,
            ingredient_count: 3,
        }
    )));
}

// --- BalancingIssue::affected_keys ---

#[test]
fn affected_keys_single_key_variants() {
    let key = BalanceKey::Comp(CompKey::MilkFat);
    assert_eq!(
        BalancingIssue::OutOfDomainTarget {
            key,
            value: -1.0,
            min: 0.0,
            max: 100.0
        }
        .affected_keys(),
        vec![key]
    );
    assert_eq!(BalancingIssue::UnaffectableTarget { key }.affected_keys(), vec![key]);
    assert_eq!(
        BalancingIssue::UnreachableTarget {
            key,
            target: 9.0,
            min: 0.0,
            max: 5.0
        }
        .affected_keys(),
        vec![key]
    );
}

#[test]
fn affected_keys_dominance_names_greater_then_lesser() {
    let lesser = BalanceKey::Comp(CompKey::Sucrose);
    let greater = BalanceKey::Comp(CompKey::TotalSugars);
    let issue = BalancingIssue::DominanceViolation {
        lesser: vec![lesser],
        greater,
        lesser_target_sum: 20.0,
        greater_target: 15.0,
    };
    // The single "greater" key comes first, then the "lesser" group.
    assert_eq!(issue.affected_keys(), vec![greater, lesser]);
}

#[test]
fn affected_keys_grouped_dominance_names_greater_then_parts() {
    let greater = BalanceKey::Comp(CompKey::TotalSugars);
    let lesser = vec![BalanceKey::Comp(CompKey::Sucrose), BalanceKey::Comp(CompKey::Fructose)];
    let issue = BalancingIssue::DominanceViolation {
        lesser: lesser.clone(),
        greater,
        lesser_target_sum: 20.0,
        greater_target: 15.0,
    };
    assert_eq!(issue.affected_keys(), vec![greater, lesser[0], lesser[1]]);
}

#[test]
fn affected_keys_ratio_infeasibility_names_denominator_then_numerator() {
    let denominator = BalanceKey::Comp(CompKey::CocoaSolids);
    let numerator = vec![BalanceKey::Comp(CompKey::CocoaButter)];
    let issue = BalancingIssue::RatioInfeasibility {
        numerator: numerator.clone(),
        denominator,
        target_ratio: 0.5,
        min_ratio: 0.2,
        max_ratio: 0.2,
    };
    assert_eq!(issue.affected_keys(), vec![denominator, numerator[0]]);
}

#[test]
fn affected_keys_ratio_infeasibility_multi_key_numerator_lists_all_keys() {
    let denominator = BalanceKey::Comp(CompKey::TotalFats);
    let numerator = vec![
        BalanceKey::Comp(CompKey::MilkFat),
        BalanceKey::Comp(CompKey::CocoaButter),
    ];
    let issue = BalancingIssue::RatioInfeasibility {
        numerator: numerator.clone(),
        denominator,
        target_ratio: 0.9,
        min_ratio: 0.2,
        max_ratio: 0.8,
    };
    assert_eq!(issue.affected_keys(), vec![denominator, numerator[0], numerator[1]]);
}

#[test]
fn affected_keys_over_determined_names_no_key() {
    let issue = BalancingIssue::OverDetermined {
        target_count: 4,
        ingredient_count: 3,
    };
    assert_eq!(issue.affected_keys(), Vec::<BalanceKey>::new());
}

// --- BalancingReport ---

#[test]
fn balancing_report_partitions_errors_and_warnings() {
    let comps = comps_from_names(DAIRY_SUGAR_ING);
    let targets = [
        (CompKey::Energy.into(), f64::NAN),  // error: non-finite target
        (CompKey::Sucrose.into(), 20.0),     // warning pair with TotalSugars
        (CompKey::TotalSugars.into(), 15.0), //
    ];
    let report = validate_balancing_targets(&comps, &targets, &[], None);

    assert_true!(report.has_errors());
    assert_false!(report.is_empty());
    assert_eq!(report.errors().count(), 1);

    // Sucrose is part of TotalSugars, so the infeasible pair surfaces as a structural warning.
    assert_true!(
        report
            .warnings()
            .any(|i| matches!(i, BalancingIssue::StructuralViolation { .. }))
    );
}

#[test]
fn balancing_report_into_result_errors_on_error_severity() {
    let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MilkFat.into(), 12.0)];
    let report = validate_balancing_targets(&comps_from_names(DAIRY_ING), &targets, &[], None);
    assert!(matches!(report.into_result(), Err(Error::InvalidBalancingTargets(_))));
}

#[test]
fn balancing_report_into_result_ok_on_warnings_only() {
    // An unreachable target is only a warning, so into_result stays Ok.
    let report =
        validate_balancing_targets(&comps_from_names(DAIRY_ING), &[(CompKey::MilkFat.into(), 50.0)], &[], None);
    assert_true!(report.warnings().count() >= 1);
    assert!(report.into_result().is_ok());
}

// --- Internal check helpers ---

#[test]
fn is_unaffectable_detects_zero_row() {
    let comps = comps_from_names(DAIRY_ING);
    assert_true!(is_unaffectable(&comps, CompKey::Alcohol.into(), 5.0));
    assert_false!(is_unaffectable(&comps, CompKey::MilkFat.into(), 16.0));
}

#[test]
fn is_unaffectable_for_ratio_key_detects_unaffectable_parts() {
    // No stabilizer source → StabilizersPerWater numerator unaffectable.
    let no_stabilizer = comps_from_names(DAIRY_SUGAR_ING);
    assert_true!(is_unaffectable(&no_stabilizer, RatioKey::StabilizersPerWater.into(), 0.5));

    // No fat source → EmulsifiersPerFat denominator unaffectable.
    let no_fat = comps_from_names(SORBET_ING);
    assert_true!(is_unaffectable(&no_fat, RatioKey::EmulsifiersPerFat.into(), 1.0));

    // Both parts affectable (stabilizer + water present) → not unaffectable.
    let stabilizer_and_water = comps_from_names(DAIRY_STABILIZER_ING);
    assert_false!(is_unaffectable(&stabilizer_and_water, RatioKey::StabilizersPerWater.into(), 0.5));
}

// --- Typical balancing keys ---

#[test]
fn typical_balancing_keys_recover_full_reference_composition() {
    // Balancing to only the typical key subset still recovers the full reference
    // composition, except the individual stabilizer-gum breakdown, which the typical
    // keys pin only in aggregate (StabilizersPerWater), not per gum.
    let ceiling = KeyCeiling::exact()
        .with(CompKey::LocustBeanGum.into(), 110.0)
        .with(CompKey::GuarGum.into(), 65.0)
        .with(CompKey::Carrageenans.into(), 44.0);

    for light_recipe in &*REF_LIGHT_RECIPES_FOR_TYPICAL_BALANCING_KEYS {
        let comps = comps_from_light_recipe(light_recipe);
        let typical_targets = get_targets_from_light_recipe(light_recipe, &get_typical_balancing_keys());
        // Deliberately unfiltered: a non-finite balanceable target means a recipe in this
        // list is no longer typical/well-conditioned, so fail loudly rather than skip it.
        let all_targets = get_targets_from_light_recipe(light_recipe, &get_all_native_balancing_keys());

        // The typical keys include `ABV`, so solve through the validated, translating entry point.
        assert_balance_compositions::<_, (BalanceKey, f64)>(
            &comps,
            &all_targets,
            |comps, _, _, _| balance_compositions(comps, &typical_targets, None, &[]),
            Epsilons::default(),
            &ceiling,
        );
    }
}

#[test]
fn ratio_band_with_empty_denominator_is_the_value_range() {
    // An empty denominator gives the absolute magnitude band — the reachable value range.
    let comps = comps_from_names(DAIRY_ING);
    let (min, max) = ratio_band(&comps, &[CompKey::MilkFat], &[]).unwrap();
    let values: Vec<f64> = comps.iter().map(|comp| comp.get(CompKey::MilkFat)).collect();
    assert_eq!(min, values.iter().copied().fold(f64::INFINITY, f64::min));
    assert_eq!(max, values.iter().copied().fold(f64::NEG_INFINITY, f64::max));
}

#[test]
fn ratio_band_pins_a_single_source_ratio() {
    // Only cocoa has CocoaSolids > 0, so CocoaButter : CocoaSolids is pinned to its 16.7 : 83.3
    let comps = comps_from_names(DAIRY_COCOA_ING);
    let (min, max) = ratio_band(&comps, &[CompKey::CocoaButter], &[CompKey::CocoaSolids]).unwrap();
    assert_eq_flt_test!(min, max);
    assert_abs_diff_eq!(min, 16.67 / 83.33, epsilon = 1e-3);
}

#[test]
fn ratio_band_is_unbounded_above_with_zero_denominator_source() {
    // Sucrose has TotalPAC with zero Water, so TotalPAC : Water is unbounded above.
    let comps = comps_from_names(DAIRY_SUGAR_ING);
    let (_, max) = ratio_band(&comps, &[CompKey::TotalPAC], &[CompKey::Water]).unwrap();
    assert_true!(max.is_infinite());
}

#[test]
fn ratio_band_is_none_when_denominator_never_positive() {
    // No cocoa source → CocoaSolids is zero everywhere, so the ratio is undefined.
    let comps = comps_from_names(DAIRY_ING);
    assert!(ratio_band(&comps, &[CompKey::CocoaButter], &[CompKey::CocoaSolids]).is_none());
}

// --- Locked-composition balancing ---------------------------------------------------------------

/// Palette for the locked-balancing tests: three free dairy sources plus Vanilla Extract, the
/// held-fixed ingredient standing in for one chosen outside the composition model.
const LOCK_TEST_ING: &[&str] = &["Whole Milk", "Whipping Cream", "Skimmed Milk Powder", "Vanilla Extract"];

/// Targets read off a feasible reference mix, so a lock at the reference fraction admits an
/// exactly-determined solution — letting the assertions demand the targets be met exactly.
fn lock_test_targets(comps: &[Composition]) -> ([(BalanceKey, f64); 2], [Option<f64>; 4]) {
    let reference: Vec<(Composition, f64)> = comps.iter().copied().zip([0.60, 0.30, 0.094, 0.006]).collect();
    let targets = [
        (CompKey::MilkFat.into(), achieved_value(&reference, CompKey::MilkFat)),
        (CompKey::MSNF.into(), achieved_value(&reference, CompKey::MSNF)),
    ];
    (targets, [None, None, None, Some(0.006)])
}

#[test]
fn balance_holds_locked_composition_fixed() {
    let comps = comps_from_names(LOCK_TEST_ING);
    let (targets, locked) = lock_test_targets(&comps);

    let balanced =
        crate::balancing::balance_compositions(&with_locks(&comps, &locked), &fuse_targets(&targets, &[]), None, None)
            .unwrap();

    // The locked composition keeps its exact fraction; amounts are non-negative and sum to 1.
    assert_eq_flt_test!(balanced[3].1, 0.006);
    let sum: f64 = balanced.iter().map(|(_, amount)| *amount).sum();
    assert_abs_diff_eq!(sum, 1.0, epsilon = TESTS_EPSILON);
    for (_, amount) in &balanced {
        assert_gt!(*amount, 0.0);
    }

    // Targets are met — the locked flavouring's contribution is counted toward them, not ignored.
    for (key, target) in &targets {
        assert_eq_flt_test!(achieved_value(&balanced, *key), *target);
    }
}

#[test]
fn balance_all_none_locks_matches_unlocked() {
    // An all-`None` lock slice locks nothing, so it must reproduce the plain unlocked solve.
    let comps = comps_from_names(LOCK_TEST_ING);
    let (targets, _) = lock_test_targets(&comps);

    let baseline = balance_compositions(&comps, &targets, None, &[]).unwrap();
    let all_none = crate::balancing::balance_compositions(
        &with_locks(&comps, &[None, None, None, None]),
        &fuse_targets(&targets, &[]),
        None,
        None,
    )
    .unwrap();

    assert_eq!(baseline.len(), all_none.len());
    for ((_, baseline_amount), (_, none_amount)) in baseline.iter().zip(&all_none) {
        assert_eq_flt_test!(*none_amount, *baseline_amount);
    }
}

#[test]
fn balance_all_locked_returns_fixed_fractions() {
    // With every composition locked there is nothing to solve; each keeps its fixed fraction.
    let comps = comps_from_names(LOCK_TEST_ING);
    let fractions = [0.5, 0.2, 0.2, 0.1];
    let locked = fractions.map(Some);

    let balanced = crate::balancing::balance_compositions(
        &with_locks(&comps, &locked),
        &fuse_targets(&[(CompKey::MilkFat.into(), 3.0)], &[]),
        None,
        None,
    )
    .unwrap();

    for (index, (_, amount)) in balanced.iter().enumerate() {
        assert_eq_flt_test!(*amount, fractions[index]);
    }
}

#[test]
fn balance_locked_ratio_target_met_with_lock_held() {
    // A ratio target (AbsPAC = TotalPAC : Water) alongside an extensive one, with the flavouring
    // locked: the locked amount holds and both targets are met from the reference witness.
    let comps = comps_from_names(&["Whole Milk", "Whipping Cream", "Sucrose", "Vanilla Extract"]);
    let reference: Vec<(Composition, f64)> = comps.iter().copied().zip([0.55, 0.30, 0.144, 0.006]).collect();
    let targets = [
        (CompKey::TotalSolids.into(), achieved_value(&reference, CompKey::TotalSolids)),
        (RatioKey::AbsPAC.into(), achieved_value(&reference, RatioKey::AbsPAC)),
    ];
    let locked = [None, None, None, Some(0.006)];

    let balanced =
        crate::balancing::balance_compositions(&with_locks(&comps, &locked), &fuse_targets(&targets, &[]), None, None)
            .unwrap();

    assert_eq_flt_test!(balanced[3].1, 0.006);
    for (key, target) in &targets {
        // Ratio reweighting is approximate; a tenth of a percentage point is a comfortable margin.
        assert_true!(balance_rel_error_pp(achieved_value(&balanced, *key), *target) < 0.1,);
    }
}

#[test]
fn balance_locked_fractions_exceeding_mix_is_error() {
    let comps = comps_from_names(&["Whole Milk", "Whipping Cream"]);
    let result = crate::balancing::balance_compositions(
        &with_locks(&comps, &[Some(0.7), Some(0.6)]),
        &fuse_targets(&[(CompKey::MilkFat.into(), 10.0)], &[]),
        None,
        None,
    );
    assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
}

#[test]
fn balance_negative_locked_fraction_is_error() {
    let comps = comps_from_names(&["Whole Milk", "Whipping Cream"]);
    let result = crate::balancing::balance_compositions(
        &with_locks(&comps, &[Some(-0.1), None]),
        &fuse_targets(&[(CompKey::MilkFat.into(), 10.0)], &[]),
        None,
        None,
    );
    assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
}

#[test]
fn validate_locked_fractions_exceeding_mix_reports_error() {
    let comps = comps_from_names(&["Whole Milk", "Whipping Cream"]);
    let report = crate::balancing::validate_balancing_targets(
        &with_locks(&comps, &[Some(0.7), Some(0.6)]),
        &fuse_targets(&[(CompKey::MilkFat.into(), 10.0)], &[]),
        None,
        None,
    );
    assert_true!(report.has_errors());
    assert!(
        report
            .errors()
            .any(|issue| matches!(issue, BalancingIssue::LockedFractionsExceedMix { .. }))
    );
}

#[test]
fn validate_defers_palette_warnings_when_locked() {
    // An out-of-reach MilkFat target warns for a free palette, but palette-derived warnings are
    // deferred once any composition is locked, so none is reported here (errors still surface).
    let comps = comps_from_names(&["Whole Milk", "Whipping Cream"]);
    let targets = [(CompKey::MilkFat.into(), 50.0)];

    let free = validate_balancing_targets(&comps, &targets, &[], None);
    assert_true!(free.warnings().next().is_some(), "expected an unreachable-target warning without locks");

    let locked = crate::balancing::validate_balancing_targets(
        &with_locks(&comps, &[Some(0.1), None]),
        &fuse_targets(&targets, &[]),
        None,
        None,
    );
    assert_true!(locked.warnings().next().is_none(), "palette warnings should be deferred under locks");
    assert_false!(locked.has_errors());
}

#[test]
fn validate_defers_palette_warnings_under_evaporation() {
    // An evaporating mix defers palette-derived warnings: the pre-evaporation palette reaches
    // concentrated targets through the water loss, so its naive reachability would misreport.
    let comps = comps_from_names(&["Whole Milk", "Whipping Cream"]);
    let targets = [(CompKey::MilkFat.into(), 50.0)];

    let free = validate_balancing_targets(&comps, &targets, &[], None);
    assert_true!(free.warnings().next().is_some(), "expected an unreachable-target warning without evaporation");

    let evaporated =
        crate::balancing::validate_balancing_targets(&unlocked(&comps), &fuse_targets(&targets, &[]), None, Some(0.2));
    assert_true!(evaporated.warnings().next().is_none(), "palette warnings should be deferred under evaporation");
    assert_false!(evaporated.has_errors());
}
