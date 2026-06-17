import { expect, test } from "vitest";

import {
  Category,
  get_all_spec_entries,
  get_all_independent_ingredient_specs,
  IngredientDatabase,
  OnConflict,
  new_ingredient_database_seeded,
  new_ingredient_database_seeded_from_specs,
  new_ingredient_database_seeded_from_embedded_data,
  get_spec_entry_by_name,
  into_ingredient_from_spec,
} from "../../dist/index";

import { getWasmEnums } from "./util";
import {
  allSpecEntries,
  specEntryName,
  isSpecEntryAlias,
  getIndependentIngredientSpecs,
} from "./data.ingredients";

const SPEC_ENTRY_COUNT = allSpecEntries.length;
const SPEC_ENTRY_INDEPENDENT_COUNT = getIndependentIngredientSpecs().length;

test("new IngredientDatabase", () => {
  const db = new IngredientDatabase();
  expect(db).toBeDefined();
});

test("new_ingredient_database_seeded", () => {
  const db = new_ingredient_database_seeded(
    get_all_independent_ingredient_specs().map((spec) => into_ingredient_from_spec(spec)),
  );

  expect(db).toBeDefined();
  expect(db.get_all_ingredients().length).toBe(SPEC_ENTRY_INDEPENDENT_COUNT);
});

test("new_ingredient_database_seeded_from_specs", () => {
  const db = new_ingredient_database_seeded_from_specs(get_all_spec_entries());
  expect(db).toBeDefined();
  expect(db.get_all_ingredients().length).toBe(SPEC_ENTRY_COUNT);
});

test("new_ingredient_database_seeded_from_embedded_data", () => {
  const db = new_ingredient_database_seeded_from_embedded_data();

  expect(db).toBeDefined();
  expect(db.get_all_ingredients().length).toBe(SPEC_ENTRY_COUNT);
});

test("IngredientDatabase.get_all_ingredients", () => {
  const db = new_ingredient_database_seeded_from_specs(get_all_spec_entries());
  const ingredients = db.get_all_ingredients();

  expect(ingredients.length).toBe(SPEC_ENTRY_COUNT);
  for (const ing of ingredients) {
    const spec = get_spec_entry_by_name(ing.name);
    expect(spec).toBeDefined();
    expect(ing.name).toEqual(specEntryName(spec));

    if (!isSpecEntryAlias(spec)) {
      expect(spec).toHaveProperty("category");
      expect(ing.category).toEqual(Category[spec.category]);
    }
  }
});

test("IngredientDatabase.get_ingredients_by_category", () => {
  const db = new_ingredient_database_seeded_from_specs(get_all_spec_entries());

  for (const category of getWasmEnums(Category)) {
    const ingredients = db.get_ingredients_by_category(category);
    expect(ingredients.length).toBeGreaterThan(0);

    for (const ing of ingredients) {
      expect(ing.category).toBe(category);
    }
  }
});

test("IngredientDatabase.get_ingredient_by_name", () => {
  const db = new_ingredient_database_seeded_from_specs(get_all_spec_entries());

  for (const jsonSpec of allSpecEntries) {
    const ing = db.get_ingredient_by_name(specEntryName(jsonSpec));
    expect(ing).toBeDefined();
    expect(ing.name).toBe(specEntryName(jsonSpec));

    if (!isSpecEntryAlias(jsonSpec)) {
      expect(jsonSpec).toHaveProperty("category");
      expect(ing.category).toBe(Category[jsonSpec.category as keyof typeof Category]);
    }
  }
});

/** Build a minimal user-defined dairy spec entry (the shape the app stores and seeds). */
function makeUserSpec(name: string, fat: number) {
  return { name, category: "Dairy", DairySimpleSpec: { fat } };
}

test("IngredientDatabase.clear empties the database", () => {
  const db = new_ingredient_database_seeded_from_embedded_data();
  expect(db.get_all_ingredients().length).toBeGreaterThan(0);

  db.clear();
  expect(db.get_all_ingredients().length).toBe(0);
});

test("IngredientDatabase.seed_from_embedded_data seeds the baseline", () => {
  const db = new IngredientDatabase();
  expect(db.get_all_ingredients().length).toBe(0);

  db.seed_from_embedded_data(OnConflict.Reject);
  expect(db.get_all_ingredients().length).toBe(SPEC_ENTRY_COUNT);
});

test("IngredientDatabase.seed rejects vs. overwrites duplicates by OnConflict", () => {
  const db = new IngredientDatabase();
  db.seed([into_ingredient_from_spec(makeUserSpec("My Custom Cream", 30))], OnConflict.Reject);
  expect(db.get_all_ingredients().length).toBe(1);

  // A colliding name is rejected, but accepted (replaced in place) when overwriting.
  expect(() =>
    db.seed([into_ingredient_from_spec(makeUserSpec("My Custom Cream", 40))], OnConflict.Reject),
  ).toThrow();
  expect(() =>
    db.seed([into_ingredient_from_spec(makeUserSpec("My Custom Cream", 40))], OnConflict.Overwrite),
  ).not.toThrow();
  expect(db.get_all_ingredients().length).toBe(1);
});

test("IngredientDatabase.seed_from_specs rejects vs. overwrites duplicates by OnConflict", () => {
  const db = new IngredientDatabase();
  const specs = get_all_spec_entries();

  db.seed_from_specs(specs, OnConflict.Reject);
  expect(db.get_all_ingredients().length).toBe(SPEC_ENTRY_COUNT);

  // Re-seeding the same specs collides on every: rejected wholesale, re-applied when overwriting
  expect(() => db.seed_from_specs(specs, OnConflict.Reject)).toThrow();
  expect(() => db.seed_from_specs(specs, OnConflict.Overwrite)).not.toThrow();
  expect(db.get_all_ingredients().length).toBe(SPEC_ENTRY_COUNT);
});
