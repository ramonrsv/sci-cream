import { expect, test } from "vitest";

import {
  getIndependentIngredientSpecByName,
  into_ingredient_from_spec,
  Recipe,
  RecipeLine,
  CompKey,
  FpdKey,
  compToPropKey,
  fpdToPropKey,
  getMixProperty,
} from "../../dist/index";

const RECIPE = [
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

test("example, without using WasmBridge", () => {
  // Aliases and composites not supported without WasmBridge
  const NEW_RECIPE = RECIPE;
  NEW_RECIPE[0][0] = "3.25% Milk";
  NEW_RECIPE[1][0] = "35% Cream";
  NEW_RECIPE[8][0] = "Locust Bean Gum";

  const recipeLines = NEW_RECIPE.map(
    ([name, quantity]) =>
      new RecipeLine(
        into_ingredient_from_spec(getIndependentIngredientSpecByName(name as string)!),
        quantity as number,
      ),
  );

  const recipe = new Recipe("Chocolate Ice Cream", recipeLines);
  const mix_properties = recipe.calculate_mix_properties();

  const comp = mix_properties.composition;
  expect(comp.get(CompKey.Energy)).toBeCloseTo(228.865);
  expect(comp.get(CompKey.MilkFat)).toBeCloseTo(13.602);
  expect(comp.get(CompKey.Lactose)).toBeCloseTo(4.836);
  // ...

  const fpd = mix_properties.fpd;
  expect(fpd.get(FpdKey.FPD)).toBeCloseTo(-3.604);
  expect(fpd.get(FpdKey.ServingTemp)).toBeCloseTo(-13.371);
  expect(fpd.get(FpdKey.HardnessAt14C)).toBeCloseTo(76.268);

  // Via prop keys:
  expect(getMixProperty(mix_properties, compToPropKey(CompKey.Energy))).toBeCloseTo(228.865);
  expect(getMixProperty(mix_properties, fpdToPropKey(FpdKey.FPD))).toBeCloseTo(-3.604);
});

import {
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "../../dist/index";

test("example, using WasmBridge", () => {
  const bridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
  const mix_properties = bridge.calculate_recipe_mix_properties(RECIPE);

  expect(mix_properties.composition.get(CompKey.Energy)).toBeCloseTo(228.865);
  // ...
  expect(mix_properties.fpd.get(FpdKey.FPD)).toBeCloseTo(-3.604);
  // ...

  // Via prop keys:
  expect(getMixProperty(mix_properties, compToPropKey(CompKey.Energy))).toBeCloseTo(228.865);
  expect(getMixProperty(mix_properties, fpdToPropKey(FpdKey.FPD))).toBeCloseTo(-3.604);
});
