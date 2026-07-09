import { expect, test } from "vitest";

import { get_all_recipe_entries, get_all_recipe_entry_ids } from "../../dist/index";

import { type RecipeEntryJson, allRecipeEntries, recipeEntryId } from "./data.recipes";

// --- TS-side recipe helpers ---

// Snapshots the full list of embedded recipe IDs with a total count in the header. Replaces a
// hand-maintained count constant: a data change shows exactly which recipes moved.

/** Builds the count-headed report of embedded recipe IDs for snapshotting. */
function embeddedRecipeEntriesReport(): string {
  const ids = allRecipeEntries.map(recipeEntryId).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [`total: ${ids.length}`, "", ...ids].join("\n");
}

test("Embedded recipe entries", () => {
  expect(embeddedRecipeEntriesReport()).toMatchSnapshot();
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

test("Ice Cream Science chocolate entry carries 150 g evaporation", () => {
  const chocolate = allRecipeEntries.find(
    (entry) => recipeEntryId(entry) === "Ice Cream Science: Chocolate Ice Cream",
  );
  expect(chocolate).toBeDefined();
  expect(chocolate?.evaporation).toBe(150);
  const preEvapTotal = chocolate!.recipe.reduce((sum, [, amount]) => sum + amount, 0);
  expect(preEvapTotal).toBe(1089);
});

// --- WASM API ---

test("get_all_recipe_entry_ids", () => {
  const ids = get_all_recipe_entry_ids();
  expect(ids.length).toEqual(allRecipeEntries.length);

  const expectedIds = allRecipeEntries.map(recipeEntryId);
  expect(ids.sort()).toEqual(expectedIds.sort());
});

test("get_all_recipe_entries", () => {
  const entries = get_all_recipe_entries() as RecipeEntryJson[];
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
