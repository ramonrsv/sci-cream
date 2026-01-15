import { expect, test } from "vitest";

import { into_ingredient_from_spec, Category, Ingredient, Composition } from "../../dist/index";

import { allIngredients, findIngredientSpecByName } from "./ingredients";

test("into_ingredient_from_spec creates Ingredient instances", () => {
  for (const ingSpec of allIngredients) {
    const ingParsed = into_ingredient_from_spec(ingSpec);
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(Object.values(Category)).toContain(ingParsed.category);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});

test("findIngredientSpecByName utility works", () => {
  for (const specJson of allIngredients) {
    const foundSpec = findIngredientSpecByName(specJson.name);
    expect(foundSpec).toBeDefined();
    expect(foundSpec).toEqual(specJson);
  }
});
