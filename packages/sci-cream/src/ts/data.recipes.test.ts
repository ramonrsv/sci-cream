import { expect, test } from "vitest";

import { get_all_recipe_entries, get_all_recipe_entry_ids } from "../../dist/index";

import { type RecipeEntryJson, allRecipeEntries, recipeEntryId } from "./data.recipes";

// Update this count if the data assets change
const RECIPE_ENTRY_COUNT = 3;

// --- TS-side recipe helpers ---

test("Recipe entry count", () => {
  expect(allRecipeEntries.length).toEqual(RECIPE_ENTRY_COUNT);
});

test("allRecipeEntries entries have name and recipe fields", () => {
  for (const entry of allRecipeEntries) {
    expect(entry).toHaveProperty("name");
    expect(entry).toHaveProperty("recipe");
    expect(Array.isArray(entry.recipe)).toBe(true);
  }
});

test("allRecipeEntries recipe rows are [string, number] pairs", () => {
  for (const entry of allRecipeEntries) {
    for (const row of entry.recipe) {
      expect(row).toHaveLength(2);
      expect(typeof row[0]).toBe("string");
      expect(typeof row[1]).toBe("number");
    }
  }
});

test("recipeEntryId returns 'Author: Name' when author is present", () => {
  const entry: RecipeEntryJson = { name: "Standard Base", author: "Underbelly", recipe: [] };
  expect(recipeEntryId(entry)).toEqual("Underbelly: Standard Base");
});

test("recipeEntryId returns just name when author is absent", () => {
  const entry: RecipeEntryJson = { name: "My Recipe", recipe: [] };
  expect(recipeEntryId(entry)).toEqual("My Recipe");
});

// --- WASM API ---

test("get_all_recipe_entry_ids", () => {
  const ids = get_all_recipe_entry_ids();
  expect(ids.length).toEqual(RECIPE_ENTRY_COUNT);
  expect(ids.length).toEqual(allRecipeEntries.length);

  const expectedIds = allRecipeEntries.map(recipeEntryId);
  expect(ids.sort()).toEqual(expectedIds.sort());
});

test("get_all_recipe_entries", () => {
  const entries = get_all_recipe_entries() as RecipeEntryJson[];
  expect(entries.length).toEqual(RECIPE_ENTRY_COUNT);
  expect(entries.length).toEqual(allRecipeEntries.length);

  const entryNames = entries.map((e) => e.name);
  const expectedNames = allRecipeEntries.map((e) => e.name);
  expect(entryNames.sort()).toEqual(expectedNames.sort());
});

test("get_all_recipe_entries recipe rows are [string, number] pairs", () => {
  const entries = get_all_recipe_entries() as RecipeEntryJson[];
  for (const entry of entries) {
    expect(Array.isArray(entry.recipe)).toBe(true);
    for (const row of entry.recipe) {
      expect(row).toHaveLength(2);
      expect(typeof row[0]).toBe("string");
      expect(typeof row[1]).toBe("number");
    }
  }
});
