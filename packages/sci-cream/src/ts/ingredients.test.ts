import { expect, test } from "vitest";

import { into_ingredient_from_spec_js, Category, Ingredient, Composition } from "../../dist/index";

import { allIngredients } from "./ingredients";

test("into_ingredient_from_spec_js creates Ingredient instances", () => {
  for (const ingSpec of allIngredients) {
    const ingParsed = into_ingredient_from_spec_js(ingSpec);
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(Object.values(Category)).toContain(ingParsed.category);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});
