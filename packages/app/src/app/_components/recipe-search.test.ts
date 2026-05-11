import { describe, it, expect, vi } from "vitest";

import { filterRecipeEntries, RecipeSource } from "./recipe-search";
import { type RecipeEntryJson } from "@workspace/sci-cream";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/lib/data", () => ({ fetchAllUserIngredientSpecs: vi.fn().mockResolvedValue([]) }));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const embedded1: RecipeEntryJson = {
  name: "Standard Base",
  author: "Alice",
  recipe: [
    ["Heavy Cream", 500],
    ["Sucrose", 100],
  ],
};

const embedded2: RecipeEntryJson = {
  name: "Chocolate Mix",
  recipe: [
    ["Whole Milk", 400],
    ["Cocoa Powder, 17% Fat", 50],
  ],
};

const saved1: RecipeEntryJson = {
  name: "Strawberry Gelato",
  author: "Bob",
  recipe: [
    ["Whole Milk", 300],
    ["Strawberry", 200],
  ],
};

// ---------------------------------------------------------------------------
// filterRecipeEntries
// ---------------------------------------------------------------------------

describe("filterRecipeEntries", () => {
  describe("source tagging", () => {
    it("tags embedded entries with RecipeSource.Embedded", () => {
      const [entry] = filterRecipeEntries([embedded1], [], RecipeSource.All, "");
      expect(entry._source).toBe(RecipeSource.Embedded);
    });

    it("tags saved entries with RecipeSource.Saved", () => {
      const [entry] = filterRecipeEntries([], [saved1], RecipeSource.All, "");
      expect(entry._source).toBe(RecipeSource.Saved);
    });

    it("preserves all other fields when tagging", () => {
      const [entry] = filterRecipeEntries([embedded1], [], RecipeSource.All, "");
      expect(entry.name).toBe(embedded1.name);
      expect(entry.author).toBe(embedded1.author);
      expect(entry.recipe).toEqual(embedded1.recipe);
    });
  });

  describe("source filter", () => {
    it("returns all entries when source is All", () => {
      expect(
        filterRecipeEntries([embedded1, embedded2], [saved1], RecipeSource.All, ""),
      ).toHaveLength(3);
    });

    it("returns only embedded entries when source is Embedded", () => {
      const result = filterRecipeEntries(
        [embedded1, embedded2],
        [saved1],
        RecipeSource.Embedded,
        "",
      );
      expect(result).toHaveLength(2);
      expect(result.every((e) => e._source === RecipeSource.Embedded)).toBe(true);
    });

    it("returns only saved entries when source is Saved", () => {
      const result = filterRecipeEntries([embedded1, embedded2], [saved1], RecipeSource.Saved, "");
      expect(result).toHaveLength(1);
      expect(result[0]._source).toBe(RecipeSource.Saved);
    });

    it("returns empty array when no entries exist for the selected source", () => {
      expect(filterRecipeEntries([], [], RecipeSource.Embedded, "")).toHaveLength(0);
    });
  });

  describe("text query", () => {
    it("returns all entries for an empty query", () => {
      expect(
        filterRecipeEntries([embedded1, embedded2], [saved1], RecipeSource.All, ""),
      ).toHaveLength(3);
    });

    it("returns all entries for a whitespace-only query", () => {
      expect(
        filterRecipeEntries([embedded1, embedded2], [saved1], RecipeSource.All, "   "),
      ).toHaveLength(3);
    });

    it("filters by name, case-insensitively", () => {
      const result = filterRecipeEntries(
        [embedded1, embedded2],
        [saved1],
        RecipeSource.All,
        "STANDARD",
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Standard Base");
    });

    it("filters by partial name", () => {
      const result = filterRecipeEntries([embedded1, embedded2], [], RecipeSource.All, "choc");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Chocolate Mix");
    });

    it("filters by author, case-insensitively", () => {
      const result = filterRecipeEntries(
        [embedded1, embedded2],
        [saved1],
        RecipeSource.All,
        "alice",
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Standard Base");
    });

    it("does not match a query against a missing author", () => {
      // embedded2 has no author; query "alice" should not match it via author
      const result = filterRecipeEntries([embedded2], [], RecipeSource.All, "alice");
      expect(result).toHaveLength(0);
    });

    it("filters by ingredient name, case-insensitively", () => {
      const result = filterRecipeEntries([embedded1, embedded2], [], RecipeSource.All, "COCOA");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Chocolate Mix");
    });

    it("filters by partial ingredient name", () => {
      // matches "Heavy Cream"
      const result = filterRecipeEntries([embedded1], [], RecipeSource.All, "crea");
      expect(result).toHaveLength(1);
    });

    it("matches a query that appears in multiple entries", () => {
      // "Whole Milk" appears in both embedded2 and saved1
      const result = filterRecipeEntries(
        [embedded1, embedded2],
        [saved1],
        RecipeSource.All,
        "milk",
      );
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no entries match", () => {
      const result = filterRecipeEntries(
        [embedded1, embedded2],
        [saved1],
        RecipeSource.All,
        "zzz-no-match",
      );
      expect(result).toHaveLength(0);
    });
  });

  describe("source filter combined with text query", () => {
    it("restricts text search to the selected source", () => {
      // "milk" matches both embedded2 and saved1, but source is Saved
      const result = filterRecipeEntries(
        [embedded1, embedded2],
        [saved1],
        RecipeSource.Saved,
        "milk",
      );
      expect(result).toHaveLength(1);
      expect(result[0]._source).toBe(RecipeSource.Saved);
    });

    it("returns empty when the source filter eliminates all query matches", () => {
      // "standard" matches embedded1 but source is Saved
      const result = filterRecipeEntries([embedded1], [saved1], RecipeSource.Saved, "standard");
      expect(result).toHaveLength(0);
    });
  });
});
