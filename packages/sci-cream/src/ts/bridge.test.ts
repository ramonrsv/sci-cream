import { expect, test } from "vitest";

import {
  Composition,
  MixProperties,
  get_all_spec_entries,
  new_ingredient_database_seeded_from_specs,
  Bridge,
  CompKey,
  isCompKey,
  compToPropKey,
  IngredientDatabase,
  OnConflict,
} from "../../dist/index";

import { getMixProperty, propToCompKey, propToRatioKey } from "./prop-key";
import { Priority, BalancingReport, BalanceTargets, BalancePriorities } from "./balancing";
import { LightRecipe } from "./light-recipe";

const lightRecipe: LightRecipe = [
  ["Whole Milk", 245],
  ["Whipping Cream", 215],
  ["Cocoa Powder, 17% Fat", 28],
  ["Skimmed Milk Powder", 21],
  ["Egg Yolk", 18],
  ["Dextrose", 45],
  ["Fructose", 32],
  ["Salt", 0.5],
  ["Stabilizer Blend", 1.25],
  ["Vanilla Extract", 6],
];

/** Creates a new ingredient database pre-seeded with all built-in ingredient specs. */
function make_seeded_db() {
  return new_ingredient_database_seeded_from_specs(get_all_spec_entries());
}

test("new Bridge", () => {
  const bridge = new Bridge(make_seeded_db());
  expect(bridge).toBeDefined();
  expect(bridge).toBeInstanceOf(Bridge);
  expect(bridge.get_all_ingredients().length).toEqual(get_all_spec_entries().length);
});

test("Bridge.seed_from_specs", () => {
  const bridge = new Bridge(new IngredientDatabase());
  expect(bridge.has_ingredient("Whole Milk")).toBe(false);

  bridge.seed_from_specs(get_all_spec_entries(), OnConflict.Reject);
  expect(bridge.has_ingredient("Whole Milk")).toBe(true);
  expect(bridge.get_ingredient_by_name("Whole Milk")).toBeDefined();

  const comp = bridge.calculate_recipe_composition(lightRecipe);
  expect(comp).toBeDefined();
  expect(comp.get(CompKey.MilkFat)).toBeCloseTo(13.6367, 4);
});

/** Build a minimal user-defined dairy spec entry (the shape the app stores and seeds). */
function makeUserSpec(name: string, fat: number) {
  return { name, category: "Dairy", DairySimpleSpec: { fat } };
}

test("Bridge.clear empties the database", () => {
  const bridge = new Bridge(make_seeded_db());
  expect(bridge.get_all_ingredients().length).toBeGreaterThan(0);

  bridge.clear();
  expect(bridge.get_all_ingredients().length).toBe(0);
  expect(bridge.has_ingredient("Whole Milk")).toBe(false);
});

test("Bridge.seed_from_embedded_data seeds the baseline", () => {
  const bridge = new Bridge(new IngredientDatabase());
  expect(bridge.get_all_ingredients().length).toBe(0);

  bridge.seed_from_embedded_data(OnConflict.Reject);
  expect(bridge.get_all_ingredients().length).toBe(get_all_spec_entries().length);
});

test("Bridge.seed_from_specs rejects vs. overwrites duplicates by OnConflict", () => {
  const bridge = new Bridge(new IngredientDatabase());
  bridge.seed_from_specs([makeUserSpec("My Custom Cream", 30)], OnConflict.Reject);
  expect(bridge.get_all_ingredients().length).toBe(1);

  // A colliding name is rejected, but accepted (replaced in place) when overwriting.
  expect(() =>
    bridge.seed_from_specs([makeUserSpec("My Custom Cream", 40)], OnConflict.Reject),
  ).toThrow();
  expect(() =>
    bridge.seed_from_specs([makeUserSpec("My Custom Cream", 40)], OnConflict.Overwrite),
  ).not.toThrow();
  expect(bridge.get_all_ingredients().length).toBe(1);
});

test("Bridge reseed dance overlays user specs and drops stale ones", () => {
  const bridge = new Bridge(make_seeded_db());
  const embeddedLen = bridge.get_all_ingredients().length;
  const embeddedName = bridge.get_all_ingredient_names()[0];

  // The app's reseed: reset to the embedded baseline, then overlay user specs overwriting conflicts
  const reseed = (specs: ReturnType<typeof makeUserSpec>[]) => {
    bridge.clear();
    bridge.seed_from_embedded_data(OnConflict.Reject);
    bridge.seed_from_specs(specs, OnConflict.Overwrite);
  };

  reseed([makeUserSpec("My Custom Cream", 30)]);
  expect(bridge.get_all_ingredients().length).toBe(embeddedLen + 1);
  expect(bridge.has_ingredient("My Custom Cream")).toBe(true);

  reseed([makeUserSpec("Another Custom", 12)]);
  expect(bridge.get_all_ingredients().length).toBe(embeddedLen + 1);
  expect(bridge.has_ingredient("My Custom Cream")).toBe(false);
  expect(bridge.has_ingredient("Another Custom")).toBe(true);

  reseed([makeUserSpec(embeddedName, 50)]);
  expect(bridge.get_all_ingredients().length).toBe(embeddedLen);
  expect(bridge.has_ingredient(embeddedName)).toBe(true);
});

test("Bridge.calculate_recipe_composition", () => {
  const bridge = new Bridge(make_seeded_db());
  const composition = bridge.calculate_recipe_composition(lightRecipe);
  expect(composition).toBeDefined();
  expect(composition).toBeInstanceOf(Composition);
  expect(composition.get(CompKey.MilkFat)).toBeCloseTo(13.6367, 4);
});

test("Bridge.calculate_recipe_mix_properties", () => {
  const bridge = new Bridge(make_seeded_db());
  const mix_properties = bridge.calculate_recipe_mix_properties(lightRecipe);
  expect(mix_properties).toBeDefined();
  expect(mix_properties).toBeInstanceOf(MixProperties);
  expect(getMixProperty(mix_properties, compToPropKey(CompKey.MilkFat))).toBeCloseTo(13.6367, 4);
});

test("Bridge.balance_recipe", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
    [compToPropKey(CompKey.TotalSugars), 17],
    [compToPropKey(CompKey.TotalSolids), 41],
  ];

  const priorities: BalancePriorities = [];

  const balanced = bridge.balance_recipe(lightRecipe, targets, priorities) as LightRecipe;

  expect(balanced).toBeDefined();
  expect(balanced.length).toEqual(lightRecipe.length);

  for (let i = 0; i < lightRecipe.length; i++) {
    expect(balanced[i][0]).toEqual(lightRecipe[i][0]);
    expect(balanced[i][1]).toBeGreaterThanOrEqual(0);
  }

  const originalTotal = lightRecipe.reduce((sum, line) => sum + line[1], 0);
  const balancedTotal = balanced.reduce((sum, line) => sum + line[1], 0);
  expect(balancedTotal).toBeCloseTo(originalTotal, 4);

  const comp = bridge.calculate_recipe_composition(balanced);

  for (const [key, value] of targets) {
    const balanceValue = isCompKey(key)
      ? comp.get(propToCompKey(key))
      : comp.get_ratio(propToRatioKey(key));

    expect(balanceValue).toBeCloseTo(value, 2);
  }
});

test("Bridge.balance_recipe applies priorities", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: BalanceTargets = [
    [compToPropKey(CompKey.Energy), 200],
    [compToPropKey(CompKey.MilkFat), 12],
    [compToPropKey(CompKey.MSNF), 8],
    [compToPropKey(CompKey.POD), 0.5],
  ];

  const priorities: BalancePriorities = [[compToPropKey(CompKey.POD), Priority.Critical]];
  const emptyPriorities: BalancePriorities = [];

  const defaultBalanced = bridge.balance_recipe(
    lightRecipe,
    targets,
    emptyPriorities,
  ) as LightRecipe;

  const prioritizedBalanced = bridge.balance_recipe(
    lightRecipe,
    targets,
    priorities,
  ) as LightRecipe;

  const defaultComp = bridge.calculate_recipe_composition(defaultBalanced);
  const prioritizedComp = bridge.calculate_recipe_composition(prioritizedBalanced);

  const defaultError = Math.abs(defaultComp.get(CompKey.POD) - 0.5);
  const prioritizedError = Math.abs(prioritizedComp.get(CompKey.POD) - 0.5);

  expect(prioritizedError).toBeLessThan(defaultError);
});

test("Bridge.balance_recipe throws on unknown ingredient", () => {
  const bridge = new Bridge(make_seeded_db());
  const badRecipe: LightRecipe = [["Nonexistent Ingredient", 100]];
  const targets: BalanceTargets = [[compToPropKey(CompKey.MilkFat), 10]];

  expect(() => bridge.balance_recipe(badRecipe, targets, [])).toThrow();
});

test("Bridge.validate_recipe_targets returns empty report for valid targets", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
    [compToPropKey(CompKey.TotalSugars), 17],
  ];

  const report = bridge.validate_recipe_targets(lightRecipe, targets, []) as BalancingReport;

  expect(report).toBeDefined();
  expect(report.issues).toEqual([]);
});

test("Bridge.validate_recipe_targets reports NegativeTarget error", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: BalanceTargets = [[compToPropKey(CompKey.MilkFat), -5]];

  const report = bridge.validate_recipe_targets(lightRecipe, targets, []) as BalancingReport;

  expect(report).toBeDefined();
  expect(report.issues.filter((i) => i.severity === "error").length).toBeGreaterThan(0);
  expect(report.issues[0].severity).toBe("error");
  expect(report.issues[0].message).toContain("-5");
});

test("Bridge.validate_recipe_targets reports PriorityWithoutTarget warning", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: BalanceTargets = [[compToPropKey(CompKey.MilkFat), 14]];
  const priorities: BalancePriorities = [[compToPropKey(CompKey.MSNF), Priority.High]];

  const report = bridge.validate_recipe_targets(
    lightRecipe,
    targets,
    priorities,
  ) as BalancingReport;

  expect(report).toBeDefined();
  expect(report.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  expect(report.issues.filter((i) => i.severity === "warning").length).toBeGreaterThan(0);
  expect(report.issues[0].severity).toBe("warning");
  expect(report.issues[0].keys).toContain(compToPropKey(CompKey.MSNF));
});

test("Bridge.validate_recipe_targets throws on unknown ingredient", () => {
  const bridge = new Bridge(make_seeded_db());
  const badRecipe: LightRecipe = [["Nonexistent Ingredient", 100]];
  const targets: BalanceTargets = [[compToPropKey(CompKey.MilkFat), 14]];

  expect(() => bridge.validate_recipe_targets(badRecipe, targets, [])).toThrow();
});
