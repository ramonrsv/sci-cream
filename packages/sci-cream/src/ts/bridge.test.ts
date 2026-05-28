import { expect, test } from "vitest";

import {
  Composition,
  MixProperties,
  get_all_spec_entries,
  new_ingredient_database_seeded_from_specs,
  Bridge,
  CompKey,
  compToPropKey,
  IngredientDatabase,
} from "../../dist/index";

import { getMixProperty } from "./prop-key";

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
  expect(comp.get(CompKey.MilkFat)).toBeCloseTo(13.6024, 4);
});

test("Bridge.calculate_recipe_composition", () => {
  const bridge = new Bridge(make_seeded_db());
  const composition = bridge.calculate_recipe_composition(lightRecipe);
  expect(composition).toBeDefined();
  expect(composition).toBeInstanceOf(Composition);
  expect(composition.get(CompKey.MilkFat)).toBeCloseTo(13.6024, 4);
});

test("Bridge.calculate_recipe_mix_properties", () => {
  const bridge = new Bridge(make_seeded_db());
  const mix_properties = bridge.calculate_recipe_mix_properties(lightRecipe);
  expect(mix_properties).toBeDefined();
  expect(mix_properties).toBeInstanceOf(MixProperties);
  expect(getMixProperty(mix_properties, compToPropKey(CompKey.MilkFat))).toBeCloseTo(13.6024, 4);
});

test("Bridge.balance_recipe", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: [CompKey, number][] = [
    [CompKey.MilkFat, 14],
    [CompKey.MSNF, 10],
    [CompKey.TotalSugars, 17],
    [CompKey.TotalSolids, 41],
  ];

  // Serde deserializes `CompKey` via its variant name, not its numeric TS enum value
  const serializedTargets = targets.map(([key, value]) => [CompKey[key], value]);

  const balanced = bridge.balance_recipe(lightRecipe, serializedTargets) as [string, number][];

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
    expect(comp.get(key)).toBeCloseTo(value, 2);
  }
});

test("Bridge.balance_recipe throws on unknown ingredient", () => {
  const bridge = new Bridge(make_seeded_db());
  const badRecipe = [["Nonexistent Ingredient", 100]];
  const targets = [[CompKey[CompKey.MilkFat], 10]];

  expect(() => bridge.balance_recipe(badRecipe, targets)).toThrow();
});
