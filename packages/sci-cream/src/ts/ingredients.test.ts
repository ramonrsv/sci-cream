import { expect, test } from "vitest";

import { into_ingredient_from_spec, Category, Ingredient, Composition } from "../../dist/index";

import { allIngredients } from "./ingredients";

test("into_ingredient_from_spec creates Ingredient instances", () => {
  for (const ingSpec of allIngredients) {
    const ingParsed = into_ingredient_from_spec(ingSpec);
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(Object.values(Category)).toContain(ingParsed.category);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});
