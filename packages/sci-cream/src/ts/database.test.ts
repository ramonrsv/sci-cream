import { expect, test } from "vitest";

import {
  Category,
  get_all_ingredient_specs,
  IngredientDatabase,
  make_seeded_ingredient_database,
  make_seeded_ingredient_database_from_specs,
  make_seeded_ingredient_database_from_embedded_data,
  get_ingredient_specs_by_category,
  get_ingredient_spec_by_name,
  into_ingredient_from_spec,
} from "../../dist/index";

import { allIngredientSpecs } from "./ingredients";
import { getWasmEnums } from "./util";

test("new IngredientDatabase", () => {
  const db = new IngredientDatabase();
  expect(db).toBeDefined();
});

test("make_seeded_ingredient_database", () => {
  const db = make_seeded_ingredient_database(
    get_all_ingredient_specs().map((spec) => into_ingredient_from_spec(spec)),
  );

  expect(db).toBeDefined();
  expect(db.get_all_ingredients().length).toBe(allIngredientSpecs.length);
});

test("make_seeded_ingredient_database_from_specs", () => {
  const db = make_seeded_ingredient_database_from_specs(get_all_ingredient_specs());

  expect(db).toBeDefined();
  expect(db.get_all_ingredients().length).toBe(allIngredientSpecs.length);
});

test("make_seeded_ingredient_database_from_embedded_data", () => {
  const db = make_seeded_ingredient_database_from_embedded_data();

  expect(db).toBeDefined();
  expect(db.get_all_ingredients().length).toBe(allIngredientSpecs.length);
});

test("IngredientDatabase.get_all_ingredients", () => {
  const db = make_seeded_ingredient_database_from_specs(get_all_ingredient_specs());
  const ingredients = db.get_all_ingredients();

  expect(ingredients.length).toBe(allIngredientSpecs.length);
  for (const ing of ingredients) {
    const spec = get_ingredient_spec_by_name(ing.name);
    expect(spec).toBeDefined();
    expect(ing.name).toEqual(spec.name);
    expect(ing.category).toEqual(Category[spec.category]);
  }
});

test("IngredientDatabase.get_ingredients_by_category", () => {
  const db = make_seeded_ingredient_database_from_specs(get_all_ingredient_specs());

  for (const category of getWasmEnums(Category)) {
    const ingredients = db.get_ingredients_by_category(category);
    const specs = get_ingredient_specs_by_category(category);

    expect(ingredients.length).toBe(specs.length);

    for (const ing of ingredients) {
      expect(ing.category).toBe(category);
    }
  }
});

test("IngredientDatabase.get_ingredient_by_name", () => {
  const db = make_seeded_ingredient_database_from_specs(get_all_ingredient_specs());

  for (const jsonSpec of allIngredientSpecs) {
    const ing = db.get_ingredient_by_name(jsonSpec.name);
    expect(ing).toBeDefined();
    expect(ing.name).toBe(jsonSpec.name);
    expect(ing.category).toBe(Category[jsonSpec.category as keyof typeof Category]);
  }
});
