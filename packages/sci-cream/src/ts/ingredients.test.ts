import { expect, test } from "vitest";

import { into_ingredient_from_spec, Category, Ingredient, Composition } from "../../dist/index";

import { allIngredientSpecs, getIngredientSpecByName } from "./ingredients";

test("into_ingredient_from_spec creates Ingredient instances", () => {
  for (const ingSpec of allIngredientSpecs) {
    const ingParsed = into_ingredient_from_spec(ingSpec);
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(Object.values(Category)).toContain(ingParsed.category);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});

test("getIngredientSpecByName utility works", () => {
  for (const specJson of allIngredientSpecs) {
    const foundSpec = getIngredientSpecByName(specJson.name);
    expect(foundSpec).toBeDefined();
    expect(foundSpec).toEqual(specJson);
  }
});
