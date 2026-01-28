import { expect, test } from "vitest";

import {
  Composition,
  MixProperties,
  get_all_ingredient_specs,
  new_ingredient_database_seeded_from_specs,
  Bridge,
  CompKey,
  compToPropKey,
} from "../../dist/index";

import { getMixProperty } from "./prop_key";

const lightRecipe = [
  ["Whole Milk", 245],
  ["Whipping Cream", 215],
  ["Cocoa Powder, 17% Fat", 28],
  ["Skimmed Milk Powder", 21],
  ["Egg Yolk", 18],
  ["Dextrose", 45],
  ["Fructose", 32],
  ["Salt", 0.5],
  ["Rich Ice Cream SB", 1.25],
  ["Vanilla Extract", 6],
];

function make_seeded_db() {
  return new_ingredient_database_seeded_from_specs(get_all_ingredient_specs());
}

test("new Bridge", () => {
  const bridge = new Bridge(make_seeded_db());
  expect(bridge).toBeDefined();
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
