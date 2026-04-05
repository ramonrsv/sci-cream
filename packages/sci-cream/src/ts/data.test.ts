import { expect, test } from "vitest";

import {
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  get_all_spec_entries,
  get_spec_entry_by_name,
  get_all_independent_ingredient_specs,
  get_independent_ingredient_spec_by_name,
} from "../../dist/index";

import {
  type IngredientSpecJson,
  type AliasSpecJson,
  type SpecEntryJson,
  allSpecEntries,
  specEntryName,
  getSpecEntryByName,
  isSpecEntryIndependent,
  getIndependentIngredientSpecs,
  isSpecEntryAlias,
  getIndependentIngredientSpecByName,
  getNonAliasIngredientSpecs,
} from "./data";

// Note: WASM functions like `get_all_spec_entries` may serialize missing optional fields as
// `null`, while the JSON source files omit them entirely. Both forms deserialize to equivalent
// `IngredientSpec` objects, so this is not a problem in practice.

// Update these number of the data assets change
const SPEC_ENTRY_COUNT = 114;
const SPEC_ENTRY_NON_ALIAS_COUNT = 104;
const SPEC_ENTRY_INDEPENDENT_COUNT = 100;

// --- TS-side spec helpers ---

test("Spec entry counts", () => {
  expect(allSpecEntries.length).toEqual(SPEC_ENTRY_COUNT);
  expect(allSpecEntries.filter((e) => !isSpecEntryAlias(e)).length).toEqual(
    SPEC_ENTRY_NON_ALIAS_COUNT,
  );
  expect(getIndependentIngredientSpecs().length).toEqual(SPEC_ENTRY_INDEPENDENT_COUNT);
});

test("specEntryName returns name for ingredient/alias specs", () => {
  const ingredient: IngredientSpecJson = { name: "Test Ingredient", category: "dairy" };
  expect(specEntryName(ingredient)).toEqual("Test Ingredient");

  const alias: AliasSpecJson = { alias: "Whole Milk", for: "3.25% Milk" };
  expect(specEntryName(alias)).toEqual("Whole Milk");
});

test("specEntryName throws for invalid spec entry", () => {
  const invalidEntry = { invalid: "entry" } as unknown as SpecEntryJson;
  expect(() => specEntryName(invalidEntry)).toThrowError();
});

test("isSpecEntryAlias returns true for alias specs", () => {
  const alias: AliasSpecJson = { alias: "Whole Milk", for: "3.25% Milk" };
  expect(isSpecEntryAlias(alias)).toBe(true);
});

test("isSpecEntryAlias returns false for non-alias specs", () => {
  const ingredient: IngredientSpecJson = { name: "Test Ingredient", category: "dairy" };
  expect(isSpecEntryAlias(ingredient)).toBe(false);

  const composite: IngredientSpecJson = {
    name: "Composite Ingredient",
    category: "dairy",
    CompositeSpec: { components: ["Part A", "Part B"] },
  };
  expect(isSpecEntryAlias(composite)).toBe(false);
});

test("isSpecEntryIndependent returns true for non-composite ingredient specs", () => {
  const ingredient: IngredientSpecJson = { name: "Test Ingredient", category: "dairy" };
  expect(isSpecEntryIndependent(ingredient)).toBe(true);
});

test("isSpecEntryIndependent returns false for alias and composite specs", () => {
  const alias: AliasSpecJson = { alias: "Whole Milk", for: "3.25% Milk" };
  expect(isSpecEntryIndependent(alias)).toBe(false);

  const composite: IngredientSpecJson = {
    name: "Composite Ingredient",
    category: "dairy",
    CompositeSpec: { components: ["Part A", "Part B"] },
  };
  expect(isSpecEntryIndependent(composite)).toBe(false);
});

test("getNonAliasIngredientSpecs excludes aliases", () => {
  const nonAlias = getNonAliasIngredientSpecs();
  expect(nonAlias.length).toBeGreaterThan(0);
  expect(nonAlias.length).toBeLessThan(allSpecEntries.length);
  expect(nonAlias.every((e) => !isSpecEntryAlias(e))).toBe(true);
  expect(nonAlias.length).toEqual(SPEC_ENTRY_NON_ALIAS_COUNT);
});

test("getNonAliasIngredientSpecs all entries have name and category", () => {
  for (const spec of getNonAliasIngredientSpecs()) {
    expect(spec).toHaveProperty("name");
    expect(spec).toHaveProperty("category");
  }
});

test("getIndependentIngredientSpecs excludes aliases and composites", () => {
  const independent = getIndependentIngredientSpecs();
  expect(independent.length).toBeGreaterThan(0);
  expect(independent.length).toBeLessThan(allSpecEntries.length);
  expect(independent.every(isSpecEntryIndependent)).toBe(true);
  expect(independent.length).toEqual(SPEC_ENTRY_INDEPENDENT_COUNT);
});

test("getIndependentIngredientSpecs all entries have name and category", () => {
  for (const spec of getIndependentIngredientSpecs()) {
    expect(spec).toHaveProperty("name");
    expect(spec).toHaveProperty("category");
  }
});

test("getSpecEntryByName returns the matching entry", () => {
  for (const entry of allSpecEntries) {
    const name = specEntryName(entry);
    const found = getSpecEntryByName(name);
    expect(found).toBeDefined();
    expect(found).toEqual(entry);
  }
});

test("getSpecEntryByName throws for non-existent name", () => {
  expect(() => getSpecEntryByName("non_existent_ingredient")).toThrow();
});

test("getIndependentIngredientSpecByName returns the matching entry", () => {
  for (const entry of getIndependentIngredientSpecs()) {
    const name = specEntryName(entry);
    const found = getIndependentIngredientSpecByName(name);
    expect(found).toBeDefined();
    expect(found).toEqual(entry);
  }
});

test("getIndependentIngredientSpecByName, error cases", () => {
  expect(() => getIndependentIngredientSpecByName("non_existent_ingredient")).toThrow();
  expect(() => getIndependentIngredientSpecByName("Whole Milk")).toThrow(); // Alias entry
});

// --- WASM API ---

test("into_ingredient_from_spec creates Ingredient instances", () => {
  for (const ingSpec of getIndependentIngredientSpecs()) {
    const ingParsed = into_ingredient_from_spec(ingSpec);
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(Object.values(Category)).toContain(ingParsed.category);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});

test("get_all_spec_entries", () => {
  const entries = get_all_spec_entries();
  expect(entries.length).toBeGreaterThan(0);
  expect(entries.length).toBe(allSpecEntries.length);
  expect(entries.length).toBe(SPEC_ENTRY_COUNT);

  // Just check that names match, since the WASM entries may have `null` for empty optional fields
  const entryNames = entries.map((e) => e.name ?? e.alias);
  const expectedNames = allSpecEntries.map((e) => specEntryName(e));
  expect(entryNames.sort()).toEqual(expectedNames.sort());
});

test("get_all_independent_ingredient_specs", () => {
  const independent = get_all_independent_ingredient_specs() as IngredientSpecJson[];
  expect(independent.length).toBeGreaterThan(0);
  expect(independent.length).toBeLessThan(allSpecEntries.length);
  expect(independent.length).toBe(getIndependentIngredientSpecs().length);
  expect(independent.every(isSpecEntryIndependent)).toBe(true);

  // Just check that names match, since the WASM entries may have `null` for empty optional fields
  const independentNames = independent.map((e) => e.name ?? e.alias);
  const expectedNames = getIndependentIngredientSpecs().map((e) => e.name);
  expect(independentNames.sort()).toEqual(expectedNames.sort());
});

test("get_spec_entry_by_name", () => {
  for (const entry of allSpecEntries) {
    const name = specEntryName(entry);
    const spec = get_spec_entry_by_name(name) as IngredientSpecJson | AliasSpecJson;
    if ("name" in entry) {
      expect((spec as IngredientSpecJson).name).toBe(entry.name);
      expect((spec as IngredientSpecJson).category).toBe(entry.category);
    } else {
      expect((spec as AliasSpecJson).alias).toBe(entry.alias);
      expect((spec as AliasSpecJson).for).toBe(entry.for);
    }
  }
});

test("get_spec_entry_by_name, error cases", () => {
  expect(() => get_spec_entry_by_name("Nonexistent Ingredient")).toThrowError();
});

test("get_independent_ingredient_spec_by_name", () => {
  for (const spec of getIndependentIngredientSpecs()) {
    const found = get_independent_ingredient_spec_by_name(spec.name) as IngredientSpecJson;
    expect(found).toBeDefined();
    expect(isSpecEntryIndependent(found)).toBe(true);
    expect(found.name).toBe(spec.name);
    expect(found.category).toBe(spec.category);
  }
});

test("get_independent_ingredient_spec_by_name, error cases", () => {
  expect(() => get_independent_ingredient_spec_by_name("Nonexistent Ingredient")).toThrowError();
  // Alias entries should also be rejected
  expect(() => get_independent_ingredient_spec_by_name("Whole Milk")).toThrowError();
});
