//! Recipe related logic, including the main [`Recipe`] struct and related types.

use serde::{Deserialize, Serialize};

#[cfg(feature = "database")]
use crate::{database::IngredientDatabase, resolution::IngredientGetter};

use crate::{
    balancing::{BalanceKey, Priority, balance_compositions, composition_balance_targets, get_all_balanceable_keys},
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
    /// Grams of water evaporated from the recipe during preparation (e.g. cooking).
    ///
    /// The [`lines`](Self::lines) are pre-evaporation amounts; the final mix is their sum minus
    /// this (default `0`). See [`Composition::evaporate`] for how it concentrates the composition.
    #[serde(default)]
    pub evaporation: f64,
}

impl Recipe {
    /// Creates a new [`Recipe`] with the optional given name and list of [`RecipeLine`]s, and no
    /// evaporation. Use [`with_evaporation`](Self::with_evaporation) to set an evaporation amount.
    #[must_use]
    pub const fn new(name: Option<String>, lines: Vec<RecipeLine>) -> Self {
        Self {
            name,
            lines,
            evaporation: 0.0,
        }
    }

    /// Sets the recipe's [`evaporation`](Self::evaporation) amount, in grams, consuming `self`.
    #[must_use]
    pub const fn with_evaporation(mut self, grams: f64) -> Self {
        self.evaporation = grams;
        self
    }

    /// The total mass of the recipe's ingredient [`lines`](Self::lines), in grams — the total `T`
    /// pre-evaporation. The final mix mass is this minus [`evaporation`](Self::evaporation).
    #[must_use]
    pub fn line_total(&self) -> f64 {
        self.lines.iter().map(|line| line.amount).sum()
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

        Ok(Self {
            name,
            lines,
            evaporation: 0.0,
        })
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

    /// The [`evaporation`](Self::evaporation) as a fraction `E/T` of the pre-evaporation total `T`,
    /// the gram-free form the balancing solver and [`Composition::evaporate`] (as `× 100`) consume,
    /// or `None` when the recipe has no evaporation, so callers reduce to their plain path.
    ///
    /// # Errors
    ///
    /// Returns [`Error::InvalidEvaporation`] when evaporation is non-zero but `total` is zero.
    fn evaporation_fraction(&self, total: f64) -> Result<Option<f64>> {
        if self.evaporation == 0.0 {
            return Ok(None);
        }
        if total == 0.0 {
            return Err(Error::InvalidEvaporation(format!(
                "cannot evaporate {} g from a zero-total recipe",
                self.evaporation
            )));
        }
        Ok(Some(self.evaporation / total))
    }

    /// Calculate the composition of the recipe as the combination of the compositions of its
    /// ingredients, weighted by their amounts.
    ///
    /// When [`evaporation`](Self::evaporation) is non-zero, the combined composition is
    /// concentrated via [`Composition::evaporate`] to reflect the water lost during preparation, so
    /// the returned composition is that of the final (post-evaporation) mix.
    ///
    /// # Errors
    ///
    /// Forwards any errors from [`Composition::from_combination`] if the recipe is invalid (e.g. a
    /// negative amount). Returns an [`Error::InvalidEvaporation`] if evaporation is non-zero but
    /// the line total is zero, or exceeds the available water (see [`Composition::evaporate`]).
    pub fn calculate_composition(&self) -> Result<Composition> {
        let composition = Composition::from_combination(
            &self
                .lines
                .iter()
                .map(|line| (line.ingredient.composition, line.amount))
                .collect::<Vec<_>>(),
        )?;

        let Some(evap_fraction) = self.evaporation_fraction(self.line_total())? else {
            return Ok(composition);
        };
        composition.evaporate(evap_fraction * 100.0)
    }

    /// Calculate the mix properties of the recipe, including total amount, composition, and FPD.
    ///
    /// The reported `total_amount` is the final mix mass — the line total minus
    /// [`evaporation`](Self::evaporation) — and the composition and FPD are those of the
    /// post-evaporation mix (see [`calculate_composition`](Self::calculate_composition)).
    ///
    /// # Errors
    ///
    /// Forwards any errors from [`calculate_composition`](Self::calculate_composition) if
    /// evaporation fails, and [`FPD::compute_from_composition`] if FPD calculation fails.
    pub fn calculate_mix_properties(&self) -> Result<MixProperties> {
        let post_evap_total = self.line_total() - self.evaporation;

        let composition = self.calculate_composition()?;
        let fpd = FPD::compute_from_composition(composition)?;

        Ok(MixProperties {
            total_amount: post_evap_total,
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
    /// When the recipe has [`evaporation`](Self::evaporation), the targets describe the final,
    /// post-evaporation mix, so balancing solves in that space. `total_amount` (and the current
    /// line sum it defaults to) stays the pre-evaporation ingredient total: the balanced recipe's
    /// line amounts sum back to it, and it keeps the same evaporation amount.
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
        let total_amount = total_amount.unwrap_or_else(|| self.line_total());
        let post_evap_total = total_amount - self.evaporation;
        let evap_fraction = self.evaporation_fraction(total_amount)?;

        // User locks are expressed against the pre-evaporation total `T`; the solver works in the
        // post-evap mix, so scale each resolved pre-evap fraction by `T / (T − E) = 1 / (1 − E/T)`.
        // With no evaporation this is `1`, reducing to the plain path.
        let pre_evap_scale = 1.0 / (1.0 - evap_fraction.unwrap_or(0.0));

        let lock_fractions: Vec<Option<f64>> = resolve_line_locks(self.lines.len(), total_amount, locked)?
            .into_iter()
            .map(|fraction| fraction.map(|f| f * pre_evap_scale))
            .collect();

        let comps: Vec<(Composition, Option<f64>)> = self
            .lines
            .iter()
            .zip(&lock_fractions)
            .map(|(line, &lock)| (line.ingredient.composition, lock))
            .collect();

        let balanced = balance_compositions(&comps, targets, None, priorities, evap_fraction)?;

        Ok(Self {
            name: self.name,
            lines: self
                .lines
                .into_iter()
                .zip(balanced.into_iter().map(|(_, fraction)| fraction))
                .map(|(line, fraction)| RecipeLine {
                    ingredient: line.ingredient,
                    amount: post_evap_total * fraction,
                })
                .collect(),
            evaporation: self.evaporation,
        })
    }

    /// Produce an equivalent recipe with no evaporation: the same final (post-evaporation) mix,
    /// reformulated so the ingredient amounts are the final amounts and no water is removed.
    ///
    /// Useful for preparations that do not evaporate (e.g. sous vide): the returned recipe's lines
    /// are re-balanced to hit the post-evaporation composition of `self` while summing to the final
    /// mass `T − E`, with [`evaporation`](Self::evaporation) cleared to `0`. The balance is
    /// overdetermined (all balanceable keys are targeted), but non-negative least squares recovers
    /// the exact reformulation when one exists and the best non-negative fit otherwise.
    ///
    /// # Errors
    ///
    /// Returns [`Error::InvalidEvaporation`] if the recipe has no evaporation (`==0`), and forwards
    /// any error from [`calculate_composition`](Self::calculate_composition) or the balance.
    pub fn deevaporate(self) -> Result<Self> {
        if self.evaporation <= 0.0 {
            return Err(Error::InvalidEvaporation(format!(
                "cannot de-evaporate a recipe with no evaporation (evaporation = {})",
                self.evaporation
            )));
        }

        let post_evap_composition = self.calculate_composition()?;

        // @todo All balanceable keys are targeted, up-weighting the ratios' constituents; an
        // extensive-only or curated set may fit degenerate cases better. Revisit with tests.
        let keys = get_all_balanceable_keys();

        // A ratio key with a zero denominator (e.g. `EmulsifiersPerFat` on a fat-free mix) reads as
        // `NaN` — undefined for this mix, so not a target the solver can accept; drop non-finites.
        let targets: Vec<(BalanceKey, f64)> = composition_balance_targets(&post_evap_composition, &keys)
            .into_iter()
            .filter(|(_, value)| value.is_finite())
            .collect();

        let total_amount: f64 = self.line_total();
        let post_evap_total = total_amount - self.evaporation;

        Self {
            name: self.name,
            lines: self.lines,
            evaporation: 0.0,
        }
        .balance(&targets, &[], Some(post_evap_total), &[])
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
    use strum::IntoEnumIterator;

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

        let total_amount: f64 = recipe.line_total();
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
        let expected = balance_compositions(&compositions, &targets, None, &priorities, None).unwrap();

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

        let original_total: f64 = recipe.line_total();
        let target_total = 1000.0;
        assert_ne!(target_total, original_total);

        let targets = [(CompKey::MilkFat.into(), 16.0), (CompKey::MSNF.into(), 11.0)];
        let default_balanced = recipe.clone().balance(&targets, &[], None, &[]).unwrap();
        let scaled_balanced = recipe.balance(&targets, &[], Some(target_total), &[]).unwrap();

        let scaled_total: f64 = scaled_balanced.line_total();
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
        let total: f64 = recipe.line_total();

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
        let balanced_total: f64 = balanced.line_total();
        assert_eq_flt_test!(balanced_total, total);
    }

    #[test]
    fn recipe_balance_locked_zero_amount_pins_line_out() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let total: f64 = recipe.line_total();

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
        let balanced_total: f64 = balanced.line_total();
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
    fn recipe_evaporated_composition_matches_manual_evaporate() {
        let base = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let total: f64 = base.line_total();
        let recipe = base.clone().with_evaporation(50.0);

        let manual = base
            .calculate_composition()
            .unwrap()
            .evaporate(50.0 / total * 100.0)
            .unwrap();

        assert_abs_diff_eq!(recipe.calculate_composition().unwrap(), manual, epsilon = COMPOSITION_EPSILON);
    }

    #[test]
    fn recipe_mix_properties_total_amount_is_post_evaporation() {
        let base = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let total: f64 = base.line_total();
        let recipe = base.with_evaporation(50.0);

        assert_eq_flt_test!(recipe.calculate_mix_properties().unwrap().total_amount, total - 50.0);
    }

    #[test]
    fn recipe_zero_evaporation_matches_no_evaporation() {
        let base = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let with_zero = base.clone().with_evaporation(0.0);

        assert_abs_diff_eq!(
            with_zero.calculate_composition().unwrap(),
            base.calculate_composition().unwrap(),
            epsilon = COMPOSITION_EPSILON
        );
    }

    #[test]
    fn recipe_balance_with_evaporation_hits_post_evaporation_targets() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB)
            .unwrap()
            .with_evaporation(80.0);

        // Targets from the recipe's own post-evap composition, including a `Water` comp target
        // and the water-denominated `AbsPAC` ratio — cases naive target-scaling gets wrong.
        let post = recipe.calculate_composition().unwrap();
        let targets = [
            (CompKey::MilkFat.into(), post.get(CompKey::MilkFat)),
            (CompKey::MSNF.into(), post.get(CompKey::MSNF)),
            (CompKey::Water.into(), post.get(CompKey::Water)),
            (RatioKey::AbsPAC.into(), post.get_ratio(RatioKey::AbsPAC)),
        ];

        let balanced_post = recipe
            .balance(&targets, &[], None, &[])
            .unwrap()
            .calculate_composition()
            .unwrap();

        assert_eq_flt_test!(balanced_post.get(CompKey::MilkFat), post.get(CompKey::MilkFat));
        assert_eq_flt_test!(balanced_post.get(CompKey::Water), post.get(CompKey::Water));
        assert_eq_flt_test!(balanced_post.get_ratio(RatioKey::AbsPAC), post.get_ratio(RatioKey::AbsPAC));
    }

    #[test]
    fn recipe_balance_lock_amount_under_evaporation_holds_grams() {
        let base = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        let total: f64 = base.line_total();
        let recipe = base.with_evaporation(80.0);

        let vanilla_idx = recipe
            .lines
            .iter()
            .position(|line| line.ingredient.name == "Vanilla Extract")
            .unwrap();
        let vanilla_amount = recipe.lines[vanilla_idx].amount;

        let targets = [(CompKey::MilkFat.into(), 12.0), (CompKey::MSNF.into(), 9.0)];
        let balanced = recipe
            .balance(&targets, &[], None, &[(vanilla_idx, Lock::Amount(vanilla_amount))])
            .unwrap();

        // A `Lock::Amount` holds the line's pre-evaporation grams, and the pre-evap line total
        // (`T`) is preserved, even though the solver worked in post-evaporation space.
        assert_eq_flt_test!(balanced.lines[vanilla_idx].amount, vanilla_amount);
        let balanced_total: f64 = balanced.line_total();
        assert_eq_flt_test!(balanced_total, total);
    }

    #[test]
    fn recipe_deevaporate_reproduces_post_evaporation_composition() {
        // Adding 100g of water and evaporating it back concentrates to the plain milk + sucrose
        // mix, so an exact de-evaporation exists: the same lines with the water dropped to ~0g.
        let recipe = Recipe::from_const_recipe(
            None,
            &[("Whole Milk", 200.0), ("Sucrose", 50.0), ("Water", 100.0)],
            &EMBEDDED_DB,
        )
        .unwrap()
        .with_evaporation(100.0);

        let post = recipe.calculate_composition().unwrap();
        let deevaporated = recipe.deevaporate().unwrap();

        assert_eq_flt_test!(deevaporated.evaporation, 0.0);
        let total: f64 = deevaporated.line_total();
        assert_eq_flt_test!(total, 250.0);

        let deevap_comp = deevaporated.calculate_composition().unwrap();
        for key in CompKey::iter() {
            assert_eq_flt_test!(deevap_comp.get(key), post.get(key));
        }
    }

    #[test]
    fn recipe_deevaporate_without_evaporation_is_error() {
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB).unwrap();
        assert!(matches!(recipe.deevaporate(), Err(Error::InvalidEvaporation(_))));
    }

    #[test]
    fn recipe_balance_zero_total_with_evaporation_is_error() {
        // An explicit zero total (or an all-zero recipe) cannot lose water; should error out.
        let recipe = Recipe::from_light_recipe(None, &MAIN_RECIPE_LIGHT, &EMBEDDED_DB)
            .unwrap()
            .with_evaporation(50.0);
        let result = recipe.balance(&[(CompKey::MilkFat.into(), 12.0)], &[], Some(0.0), &[]);
        assert!(matches!(result, Err(Error::InvalidEvaporation(_))));
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
