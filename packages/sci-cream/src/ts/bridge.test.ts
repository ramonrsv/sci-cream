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
} from "../../dist/index";

import { getMixProperty, PropKey, propToCompKey, propToRatioKey } from "./prop-key";
import {
  Priority,
  BalancingReport,
  NegativeTargetError,
  PriorityWithoutTargetWarning,
  getBalancingErrors,
  getBalancingWarnings,
} from "./balancing";

const lightRecipe = [
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

  bridge.seed_from_specs(get_all_spec_entries());
  expect(bridge.has_ingredient("Whole Milk")).toBe(true);
  expect(bridge.get_ingredient_by_name("Whole Milk")).toBeDefined();

  const comp = bridge.calculate_recipe_composition(lightRecipe);
  expect(comp).toBeDefined();
  expect(comp.get(CompKey.MilkFat)).toBeCloseTo(13.6367, 4);
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

  const targets: [PropKey, number][] = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
    [compToPropKey(CompKey.TotalSugars), 17],
    [compToPropKey(CompKey.TotalSolids), 41],
  ];

  const priorities: [PropKey, Priority][] = [];

  const balanced = bridge.balance_recipe(lightRecipe, targets, priorities) as [string, number][];

  expect(balanced).toBeDefined();
  expect(balanced.length).toEqual(lightRecipe.length);

  for (let i = 0; i < lightRecipe.length; i++) {
    expect(balanced[i][0]).toEqual(lightRecipe[i][0]);
    expect(balanced[i][1]).toBeGreaterThanOrEqual(0);
  }

  const originalTotal = lightRecipe.reduce((sum, line) => sum + (line[1] as number), 0);
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

  const targets: [PropKey, number][] = [
    [compToPropKey(CompKey.Energy), 200],
    [compToPropKey(CompKey.MilkFat), 12],
    [compToPropKey(CompKey.MSNF), 8],
    [compToPropKey(CompKey.POD), 0.5],
  ];

  const priorities: [PropKey, Priority][] = [[compToPropKey(CompKey.POD), Priority.Critical]];
  const emptyPriorities: [PropKey, Priority][] = [];

  const defaultBalanced = bridge.balance_recipe(lightRecipe, targets, emptyPriorities) as [
    string,
    number,
  ][];

  const prioritizedBalanced = bridge.balance_recipe(lightRecipe, targets, priorities) as [
    string,
    number,
  ][];

  const defaultComp = bridge.calculate_recipe_composition(defaultBalanced);
  const prioritizedComp = bridge.calculate_recipe_composition(prioritizedBalanced);

  const defaultError = Math.abs(defaultComp.get(CompKey.POD) - 0.5);
  const prioritizedError = Math.abs(prioritizedComp.get(CompKey.POD) - 0.5);

  expect(prioritizedError).toBeLessThan(defaultError);
});

test("Bridge.balance_recipe throws on unknown ingredient", () => {
  const bridge = new Bridge(make_seeded_db());
  const badRecipe = [["Nonexistent Ingredient", 100]];
  const targets = [[compToPropKey(CompKey.MilkFat), 10]];

  expect(() => bridge.balance_recipe(badRecipe, targets, [])).toThrow();
});

test("Bridge.validate_recipe_targets returns empty report for valid targets", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: [PropKey, number][] = [
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
  const targets: [PropKey, number][] = [[compToPropKey(CompKey.MilkFat), -5]];

  const report = bridge.validate_recipe_targets(lightRecipe, targets, []) as BalancingReport;

  expect(report).toBeDefined();
  expect(getBalancingErrors(report).length).toBeGreaterThan(0);
  expect(report.issues[0]).toHaveProperty("NegativeTarget");
  expect((report.issues[0] as NegativeTargetError).NegativeTarget.value).toBe(-5);
});

test("Bridge.validate_recipe_targets reports PriorityWithoutTarget warning", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: [PropKey, number][] = [[compToPropKey(CompKey.MilkFat), 14]];
  const priorities: [PropKey, Priority][] = [[compToPropKey(CompKey.MSNF), Priority.High]];

  const report = bridge.validate_recipe_targets(
    lightRecipe,
    targets,
    priorities,
  ) as BalancingReport;

  expect(report).toBeDefined();
  expect(getBalancingErrors(report)).toHaveLength(0);
  expect(getBalancingWarnings(report).length).toBeGreaterThan(0);
  expect(report.issues[0]).toHaveProperty("PriorityWithoutTarget");
  expect((report.issues[0] as PriorityWithoutTargetWarning).PriorityWithoutTarget.key).toBe(
    compToPropKey(CompKey.MSNF),
  );
});

test("Bridge.validate_recipe_targets throws on unknown ingredient", () => {
  const bridge = new Bridge(make_seeded_db());
  const badRecipe = [["Nonexistent Ingredient", 100]];
  const targets: [PropKey, number][] = [[compToPropKey(CompKey.MilkFat), 14]];

  expect(() => bridge.validate_recipe_targets(badRecipe, targets, [])).toThrow();
});
