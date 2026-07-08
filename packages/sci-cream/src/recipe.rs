//! Recipe related logic, including the main [`Recipe`] struct and related types.

use serde::{Deserialize, Serialize};

#[cfg(feature = "database")]
use crate::{database::IngredientDatabase, resolution::IngredientGetter};

use crate::{
    balancing::{BalanceKey, Priority, balance_compositions},
    composition::Composition,
    error::{Error, Result},
    fpd::FPD,
    ingredient::Ingredient,
    properties::MixProperties,
};

/// A simple `(String, f64)` tuple representing an ingredient name and its amount, in grams.
///
/// This is used for easier interoperability with external data sources, such as JSON and databases,
/// and notably for WASM interoperability. It cannot be used for calculations directly, since it
/// does not contain a full [`Ingredient`] struct. See [`RecipeLine`] for the full struct.
pub type LightRecipeLine = (String, f64);

/// A recipe represented as a list of ingredient names and corresponding amounts, in grams.
///
/// This is used for easier interoperability with external data sources, such as JSON and databases,
/// and notably for WASM interoperability. It cannot be used for calculations directly, since it
/// does not contain full [`Ingredient`] objects. See [`Recipe`] for the full struct.
pub type LightRecipe = [LightRecipeLine];

/// An owned version of [`LightRecipe`] for use in Rust code, since [`LightRecipeLine`] is a slice.
pub type OwnedLightRecipe = Vec<LightRecipeLine>;

/// A simple `[(&str, f64)]` list of ingredient names and amounts, in grams, representing a recipe.
///
/// This is used mostly for tests, doc tests, and examples, as it can be const constructed.
pub type ConstRecipe = [(&'static str, f64)];

/// A single line in a recipe, representing an ingredient and its amount.
///
/// This struct contains the full [`Ingredient`] object, so it can be used directly in calculations.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecipeLine {
    /// The ingredient used in this line of the recipe.
    pub ingredient: Ingredient,
    /// The amount of the ingredient used in this line of the recipe, in grams.
    pub amount: f64,
}

impl RecipeLine {
    /// Creates a new [`RecipeLine`] with the given ingredient and amount.
    #[must_use]
    pub const fn new(ingredient: Ingredient, amount: f64) -> Self {
        Self { ingredient, amount }
    }
}

/// How a locked recipe line is pinned during [`Recipe::balance`].
///
/// A lock fixes a recipe line rather than solving for it, while its composition still counts toward
/// the balancing targets. The variant chooses what stays constant when the mix total changes.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum Lock {
    /// Hold the line at this fraction of the resulting mix. Grams scale with the total, so the
    /// line's concentration is preserved across a change of total amount.
    Fraction(f64),
    /// Hold the line at this absolute amount, in grams; its concentration then varies with the
    /// total. Divided by the mix total to get the fraction the solver holds.
    Amount(f64),
}

/// Resolves per-line [`Lock`]s into fixed fractions of the mix, aligned to `line_count` lines:
/// `Some(fraction)` for a locked line, `None` for a free one. A [`Lock::Amount`] is divided by
/// `total_amount`; a [`Lock::Fraction`] is used as-is.
///
/// # Errors
///
/// Returns [`Error::InvalidBalancingTargets`] if a lock names an out-of-range or duplicated line
/// index, or gives a [`Lock::Amount`] for a zero-total mix.
pub(crate) fn resolve_line_locks(
    line_count: usize,
    total_amount: f64,
    locked: &[(usize, Lock)],
) -> Result<Vec<Option<f64>>> {
    let mut fractions = vec![None; line_count];
    for &(index, lock) in locked {
        let slot = fractions.get_mut(index).ok_or_else(|| {
            Error::InvalidBalancingTargets(format!(
                "lock references line {index}, but the recipe has {line_count} lines"
            ))
        })?;
        if slot.is_some() {
            return Err(Error::InvalidBalancingTargets(format!("duplicate lock for line {index}")));
        }
        let fraction = match lock {
            Lock::Fraction(fraction) => fraction,
            Lock::Amount(amount) => {
                if total_amount == 0.0 {
                    return Err(Error::InvalidBalancingTargets(format!(
                        "cannot lock line {index} to an absolute amount in a zero-total mix"
                    )));
                }
                amount / total_amount
            }
        };
        *slot = Some(fraction);
    }
    Ok(fractions)
}

/// A complete recipe, consisting of an optional name and a list of [`RecipeLine`]s.
///
/// This struct contains the full [`Ingredient`] objects in its lines, so it can be used directly in
/// calculations, which are exposed as methods on the struct. See [`LightRecipe`] for a simpler
/// struct used for interoperability with external data sources.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Recipe {
    /// An optional name for the recipe.
    pub name: Option<String>,
    /// The lines of the recipe, each representing an ingredient and its amount.
    pub lines: Vec<RecipeLine>,
}

impl Recipe {
    /// Creates a new [`Recipe`] with the optional given name and list of [`RecipeLine`]s.
    #[must_use]
    pub const fn new(name: Option<String>, lines: Vec<RecipeLine>) -> Self {
        Self { name, lines }
    }

    /// Create a new [`Recipe`] from a [`LightRecipe`] and an [`IngredientDatabase`].
    ///
    /// This function looks up each ingredient name in the [`LightRecipe`] in the provided
    /// [`IngredientDatabase`], to convert simple the name-and-amount pairs in the [`LightRecipe`]
    /// into full [`Ingredient`] objects that can be used for calculations.
    ///
    /// This function requires the `database` feature flag, since it relies on an
    /// [`IngredientDatabase`] for ingredient lookups.
    ///
    /// # Errors
    ///
    /// This function will return an [`Error::IngredientNotFound`] if any ingredient name in the
    /// [`LightRecipe`] is not found in the provided [`IngredientDatabase`].
    #[cfg(feature = "database")]
    pub fn from_light_recipe(
        name: Option<String>,
        light_recipe: &LightRecipe,
        db: &IngredientDatabase,
    ) -> Result<Self> {
        let mut lines = Vec::with_capacity(light_recipe.len());

        for (name, amount) in light_recipe {
            lines.push(RecipeLine {
                ingredient: db.get_ingredient_by_name(name)?,
                amount: *amount,
            });
        }

        Ok(Self { name, lines })
    }

    /// Create a new [`Recipe`] from a [`ConstRecipe`] and an [`IngredientDatabase`].
    ///
    /// This function looks up each ingredient name in the [`ConstRecipe`] in the provided
    /// [`IngredientDatabase`], to convert simple the name-and-amount pairs in the [`ConstRecipe`]
    /// into full [`Ingredient`] objects that can be used for calculations.
    ///
    /// This function requires the `database` feature flag, since it relies on an
    /// [`IngredientDatabase`] for ingredient lookups.
    ///
    /// # Errors
    ///
    /// This function will return an [`Error::IngredientNotFound`] if any ingredient name in the
    /// [`ConstRecipe`] is not found in the provided [`IngredientDatabase`].
    #[cfg(feature = "database")]
    pub fn from_const_recipe(
        name: Option<String>,
        const_recipe: &ConstRecipe,
        db: &IngredientDatabase,
    ) -> Result<Self> {
        Self::from_light_recipe(
            name,
            &const_recipe
                .iter()
                .map(|(name, amount)| (name.to_string(), *amount))
                .collect::<OwnedLightRecipe>(),
            db,
        )
    }

    /// Calculate the composition of the recipe as the combination of the compositions of its
    /// ingredients, weighted by their amounts.
    ///
    /// # Errors
    ///
    /// Forwards any errors from [`Composition::from_combination`] if the recipe is not valid, e.g.
    /// if any ingredient has a negative amount.
    pub fn calculate_composition(&self) -> Result<Composition> {
        Composition::from_combination(
            &self
                .lines
                .iter()
                .map(|line| (line.ingredient.composition, line.amount))
                .collect::<Vec<_>>(),
        )
    }

    /// Calculate the mix properties of the recipe, including total amount, composition, and FPD.
    ///
    /// # Errors
    ///
    /// Forwards any errors from [`FPD::compute_from_composition`] if FPD calculation fails.
    pub fn calculate_mix_properties(&self) -> Result<MixProperties> {
        let total_amount: f64 = self.lines.iter().map(|line| line.amount).sum();
        let composition = self.calculate_composition()?;
        let fpd = FPD::compute_from_composition(composition)?;

        Ok(MixProperties {
            total_amount,
            composition,
            fpd,
        })
    }

    /// Balance the recipe to meet the given target composition values
    ///
    /// The relative proportions of the ingredients in the recipe are adjusted to meet the target
    /// composition values as closely as possible. Balancing is done via [`balance_compositions`];
    /// see its documentation for more details.
    ///
    /// `priorities` raises the relative importance of specific target keys (keys not listed default
    /// to [`Priority::Normal`], so an empty slice balances all targets equally);
    ///
    /// `total_amount` sets the total amount, in grams, of the balanced recipe; if `None`, the
    /// recipe's current total amount is used, keeping it constant.
    ///
    /// `locked` pins chosen lines by index: `(i, lock)` fixes line `i` per its [`Lock`] (its
    /// composition still counts toward the targets) while the rest balance around it. An empty
    /// slice locks nothing. See `resolve_line_locks` for how a [`Lock`] maps to a mix fraction.
    ///
    /// # Errors
    ///
    /// Forwards any [`balance_compositions`] errors, and returns [`Error::InvalidBalancingTargets`]
    /// for an out-of-range or duplicated lock index, a zero-total [`Lock::Amount`], or locked
    /// fractions that exceed the whole mix.
    pub fn balance(
        self,
        targets: &[(BalanceKey, f64)],
        priorities: &[(BalanceKey, Priority)],
        total_amount: Option<f64>,
        locked: &[(usize, Lock)],
    ) -> Result<Self> {
        let total_amount = total_amount.unwrap_or_else(|| self.lines.iter().map(|line| line.amount).sum());
        let lock_fractions = resolve_line_locks(self.lines.len(), total_amount, locked)?;

        let comps: Vec<(Composition, Option<f64>)> = self
            .lines
            .iter()
            .zip(&lock_fractions)
            .map(|(line, &lock)| (line.ingredient.composition, lock))
            .collect();

        let balanced = balance_compositions(&comps, targets, None, priorities)?;

        Ok(Self {
            name: self.name,
            lines: self
                .lines
                .into_iter()
                .zip(balanced.into_iter().map(|(_, fraction)| fraction))
                .map(|(line, fraction)| RecipeLine {
                    ingredient: line.ingredient,
                    amount: total_amount * fraction,
                })
                .collect(),
        })
    }
}

impl From<Recipe> for OwnedLightRecipe {
    fn from(recipe: Recipe) -> Self {
        recipe
            .lines
            .into_iter()
            .map(|line| (line.ingredient.name, line.amount))
            .collect()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use crate::tests::assets::{EMBEDDED_DB, MAIN_RECIPE_LIGHT};

    use super::*;
    use crate::{
        balancing::balance_compositions,
        composition::{CompKey, RatioKey},
        constants::COMPOSITION_EPSILON,
        error::Error,
        fpd::FpdKey,
    };

    #[test]
    fn recipe_from_light_recipe() {
        let light_recipe = MAIN_RECIPE_LIGHT.clone();

        let recipe = Recipe::from_light_recipe(None, &light_recipe, &EMBEDDED_DB).unwrap();

        assert_eq!(recipe.lines.len(), light_recipe.len());

        for (line, (name, amount)) in recipe.lines.iter().zip(light_recipe.iter()) {
            assert_eq!(line.ingredient.name, *name);
            assert_eq!(line.amount, *amount);
        }
    }

    #[test]
    fn recipe_calculate_composition() {
        let recipe = Recipe::from_const_recipe(None, &[("2% Milk", 50.0), ("Sucrose", 50.0)], &EMBEDDED_DB).unwrap();

        let mix_comp = recipe.calculate_composition().unwrap();

        assert_eq_flt_test!(mix_comp.get(CompKey::Lactose), 4.8069 / 2.0);
        assert_eq!(mix_comp.get(CompKey::Sucrose), 50.0);
        assert_eq!(mix_comp.get(CompKey::TotalSugars), (4.8069 / 2.0) + 50.0);

        assert_eq!(mix_comp.get(CompKey::TotalSolids), (10.82 / 2.0) + 50.0);
        assert_eq!(mix_comp.get(CompKey::Water), 100.0 - mix_comp.get(CompKey::TotalSolids));

        assert_eq!(mix_comp.get(CompKey::MilkFat), 1.0);
        assert_eq!(mix_comp.get(CompKey::MSNF), 8.82 / 2.0);
        assert_abs_diff_eq!(mix_comp.get(CompKey::MilkSNFS), 4.0131 / 2.0, epsilon = COMPOSITION_EPSILON);
        assert_eq!(mix_comp.get(CompKey::MilkSolids), 10.82 / 2.0);

        assert_eq!(mix_comp.get(CompKey::TotalSolids) - mix_comp.get(CompKey::MilkSolids), 50.0);
    }

    #[test]
    fn recipe_calculate_mix_properties_with_hf() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();

        let mix_properties = recipe.calculate_mix_properties().unwrap();

        assert_eq!(mix_properties.total_amount, 611.75);
        assert_eq_flt_test!(mix_properties.get(CompKey::HF.into()), 7.5384);

        assert_eq_flt_test!(mix_properties.get(CompKey::MilkFat.into()), 13.6367);
        assert_eq_flt_test!(mix_properties.get(CompKey::TotalPAC.into()), 33.4463);
        assert_eq_flt_test!(mix_properties.get(RatioKey::AbsPAC.into()), 56.7484);
        assert_eq_flt_test!(mix_properties.get(FpdKey::FPD.into()), -3.6124);
        assert_eq_flt_test!(mix_properties.get(FpdKey::ServingTemp.into()), -13.4021);
        assert_eq_flt_test!(mix_properties.get(FpdKey::HardnessAt14C.into()), 76.2061);
    }

    #[test]
    fn floating_point_edge_case_zero_water_near_epsilon() {
        let recipe = Recipe::from_const_recipe(None, &[("Fructose", 10.0), ("Salt", 0.54)], &EMBEDDED_DB).unwrap();
        let mix_properties = recipe.calculate_mix_properties().unwrap();

        assert_abs_diff_eq!(mix_properties.get(CompKey::Water.into()), 0.0, epsilon = COMPOSITION_EPSILON);
        assert_true!(mix_properties.get(FpdKey::FPD.into()).is_nan());
        assert_true!(mix_properties.get(FpdKey::ServingTemp.into()).is_nan());
        assert_true!(mix_properties.get(FpdKey::HardnessAt14C.into()).is_nan());
        assert_true!(mix_properties.fpd.curves.frozen_water[0].temp.is_nan());
        assert_true!(mix_properties.fpd.curves.hardness[0].temp.is_nan());
    }

    #[test]
    fn recipe_balance_forwards_inputs_to_balance_compositions() {
        let recipe = Recipe::from_light_recipe(Some("Main Recipe".into()), &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();

        let total_amount: f64 = recipe.lines.iter().map(|line| line.amount).sum();
        // Nothing locked, matching the `recipe.balance(.., &[])` call below.
        let compositions: Vec<_> = recipe
            .lines
            .iter()
            .map(|line| (line.ingredient.composition, None::<f64>))
            .collect();
        let names: Vec<_> = recipe.lines.iter().map(|line| line.ingredient.name.clone()).collect();

        // Disparate targets with a priority on the conflicting key, so dropping or reordering any
        // input would change the solution and make the comparison below fail.
        let targets = [
            (CompKey::Energy.into(), 200.0),
            (CompKey::MilkFat.into(), 12.0),
            (CompKey::MSNF.into(), 8.0),
            (CompKey::POD.into(), 0.5),
        ];
        let priorities = [(CompKey::POD.into(), Priority::Critical)];

        let balanced = recipe.balance(&targets, &priorities, None, &[]).unwrap();
        let expected = balance_compositions(&compositions, &targets, None, &priorities).unwrap();

        assert_eq!(balanced.name, Some("Main Recipe".into()));
        assert_eq!(balanced.lines.len(), expected.len());

        for ((line, name), (_, fraction)) in balanced.lines.iter().zip(names.iter()).zip(expected.iter()) {
            assert_eq!(line.ingredient.name, *name);
            assert_eq_flt_test!(line.amount, total_amount * *fraction);
        }
    }

    #[test]
    fn recipe_balance_explicit_total_amount() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();

        let original_total: f64 = recipe.lines.iter().map(|line| line.amount).sum();
        let target_total = 1000.0;
        assert_ne!(target_total, original_total);

        let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MSNF.into(), 11.0)];
        let default_balanced = recipe.clone().balance(&targets, &[], None, &[]).unwrap();
        let scaled_balanced = recipe.balance(&targets, &[], Some(target_total), &[]).unwrap();

        let scaled_total: f64 = scaled_balanced.lines.iter().map(|line| line.amount).sum();
        assert_eq_flt_test!(scaled_total, target_total);

        for line in &scaled_balanced.lines {
            assert_true!(line.amount >= 0.0);
        }

        let comp = scaled_balanced.calculate_composition().unwrap();
        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 16.0);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 11.0);

        let scale = target_total / original_total;
        for (scaled, default) in scaled_balanced.lines.iter().zip(default_balanced.lines.iter()) {
            assert_eq!(scaled.ingredient.name, default.ingredient.name);
            assert_eq_flt_test!(scaled.amount, default.amount * scale);
        }
    }

    #[test]
    fn recipe_balance_preserves_none_name() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();

        let balanced = recipe
            .balance(&[(CompKey::MilkFat.into(), 12.0), (CompKey::MSNF.into(), 10.0)], &[], None, &[])
            .unwrap();

        assert_eq!(balanced.name, None);
    }

    #[test]
    fn recipe_balance_holds_locked_line_amount() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let total: f64 = recipe.lines.iter().map(|line| line.amount).sum();

        // Lock the Vanilla Extract line: its amount must survive balancing untouched.
        let vanilla_idx = recipe
            .lines
            .iter()
            .position(|line| line.ingredient.name == "Vanilla Extract")
            .unwrap();
        let vanilla_amount = recipe.lines[vanilla_idx].amount;
        let locked = [(vanilla_idx, Lock::Amount(vanilla_amount))];

        let targets = [(CompKey::MilkFat.into(), 13.0), (CompKey::MSNF.into(), 10.0)];
        let balanced = recipe.balance(&targets, &[], None, &locked).unwrap();

        // The locked line keeps its grams, and `None` keeps the overall total constant.
        assert_eq_flt_test!(balanced.lines[vanilla_idx].amount, vanilla_amount);
        let balanced_total: f64 = balanced.lines.iter().map(|line| line.amount).sum();
        assert_eq_flt_test!(balanced_total, total);
    }

    #[test]
    fn recipe_balance_locked_zero_amount_pins_line_out() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let total: f64 = recipe.lines.iter().map(|line| line.amount).sum();

        // A zero-amount lock pins the ingredient out: held at 0g while the rest rebalance.
        let fructose_idx = recipe
            .lines
            .iter()
            .position(|line| line.ingredient.name == "Fructose")
            .unwrap();
        let targets = [(CompKey::MilkFat.into(), 13.0), (CompKey::MSNF.into(), 10.0)];
        let balanced = recipe
            .balance(&targets, &[], None, &[(fructose_idx, Lock::Amount(0.0))])
            .unwrap();

        // The pinned line stays at 0g, and the freed mass is absorbed by the rest (total constant).
        assert_eq_flt_test!(balanced.lines[fructose_idx].amount, 0.0);
        let balanced_total: f64 = balanced.lines.iter().map(|line| line.amount).sum();
        assert_eq_flt_test!(balanced_total, total);
    }

    #[test]
    fn recipe_balance_locked_line_exceeding_total_errors() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let vanilla_idx = recipe
            .lines
            .iter()
            .position(|line| line.ingredient.name == "Vanilla Extract")
            .unwrap();
        let vanilla_amount = recipe.lines[vanilla_idx].amount;

        // A total below the locked line's amount makes its fixed fraction exceed the whole mix.
        let locked = [(vanilla_idx, Lock::Amount(vanilla_amount))];
        let result = recipe.balance(&[(CompKey::MilkFat.into(), 12.0)], &[], Some(1.0), &locked);
        assert!(matches!(result, Err(Error::InvalidBalancingTargets(_))));
    }

    #[test]
    fn recipe_balance_locked_fraction_scales_with_total() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let vanilla_idx = recipe
            .lines
            .iter()
            .position(|line| line.ingredient.name == "Vanilla Extract")
            .unwrap();

        // A `Fraction` lock preserves concentration: at 1% of an explicit 2000g total the locked
        // line comes out at 20g, regardless of its original amount.
        let targets = [(CompKey::MilkFat.into(), 12.0)];
        let balanced = recipe
            .balance(&targets, &[], Some(2000.0), &[(vanilla_idx, Lock::Fraction(0.01))])
            .unwrap();
        assert_eq_flt_test!(balanced.lines[vanilla_idx].amount, 20.0);
    }

    #[test]
    fn recipe_into_owned_light_recipe() {
        let const_recipe: &ConstRecipe = &[("Whole Milk", 245.0), ("Sucrose", 50.0), ("Egg Yolk", 18.0)];
        let recipe = Recipe::from_const_recipe(Some("Test".into()), const_recipe, &EMBEDDED_DB).unwrap();

        let light: OwnedLightRecipe = recipe.into();

        assert_eq!(light.len(), const_recipe.len());
        for (i, (name, amount)) in light.iter().enumerate() {
            assert_eq!(name, const_recipe[i].0);
            assert_eq!(*amount, const_recipe[i].1);
        }
    }
}
