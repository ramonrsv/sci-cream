import { expect, test } from "vitest";

import {
  Category,
  get_all_ingredient_specs,
  get_ingredient_specs_by_category,
  get_ingredient_spec_by_name,
} from "../../dist/index";

import { allIngredientSpecs } from "./ingredients";
import { getWasmEnums } from "./util";

// Note that the values returned by `get_all_ingredient_specs` and associated functions are not
// exactly equal to those in `allIngredientSpecs` because missing fields in the original JSON files
// are serialized as `"field": null` in Rust when serializing `IngredientSpec` to JsValues. Either
// version deserializes to the same `IngredientSpec` object, so this is not a problem in practice.

test("get_all_ingredient_specs", () => {
  const allSpecs = get_all_ingredient_specs();
  expect(allSpecs.length).toBeGreaterThanOrEqual(88);
  expect(allSpecs.length).toBe(allIngredientSpecs.length);
});

test("get_ingredient_specs_by_category", () => {
  for (const category of getWasmEnums(Category)) {
    const specs = get_ingredient_specs_by_category(category);
    expect(specs.length).toBeGreaterThan(0);

    for (const spec of specs) {
      expect(spec.category).toBe(Category[category]);
    }
  }
});

test("get_ingredient_spec_by_name", () => {
  for (const jsonSpec of allIngredientSpecs) {
    const spec = get_ingredient_spec_by_name(jsonSpec.name);
    expect(spec).toBeDefined();
    expect(spec.name).toBe(jsonSpec.name);
    expect(spec.category).toBe(jsonSpec.category);
  }
});

test("get_ingredient_spec_by_name, error cases", () => {
  expect(() => get_ingredient_spec_by_name("Nonexistent Ingredient")).toThrowError();
});
