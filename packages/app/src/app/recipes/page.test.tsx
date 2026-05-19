import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

import { MAX_RECIPES } from "@/lib/styles/sizes";
import {
  RecipeSearch,
  type GroupedRecipe,
  type RecipeSearchProps,
} from "@/app/_components/recipe-search";
import { useSession } from "next-auth/react";
import {
  deleteUserRecipe,
  deleteUserRecipeVersion,
  fetchAllUserSavedRecipes,
  updateUserRecipeVersion,
  type SavedRecipeVersionJson,
} from "@/lib/data";

import RecipesPage from "./page";
import { STORAGE_KEYS } from "@/lib/local-storage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: vi.fn(() => ({ push: mockPush })) }));
vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));
vi.mock("@/lib/data", () => ({
  fetchAllUserSavedRecipes: vi.fn().mockResolvedValue(undefined),
  deleteUserRecipe: vi.fn().mockResolvedValue(undefined),
  deleteUserRecipeVersion: vi.fn().mockResolvedValue(undefined),
  updateUserRecipeVersion: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/_components/recipe-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/_components/recipe-search")>();
  return { ...actual, RecipeSearch: vi.fn(() => null) };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the props passed to the most recent RecipeSearch render */
function capturedProps(): RecipeSearchProps {
  return vi.mocked(RecipeSearch).mock.calls.at(-1)![0];
}

const version: SavedRecipeVersionJson = {
  version: 1,
  recipe: [
    ["Heavy Cream", 500],
    ["Sucrose", 100],
  ],
  createdAt: "2026-05-17T00:00:00.000Z",
};

const entry: GroupedRecipe = {
  id: "saved-42",
  recipeId: 42,
  name: "Standard Base",
  author: "Underbelly",
  versions: [version],
};

// ---------------------------------------------------------------------------
// RecipesPage
// ---------------------------------------------------------------------------

describe("RecipesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // mockReturnValue overrides persist across tests; reset to the unauthenticated default
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
  });

  afterEach(cleanup);

  it("renders a RecipeSearch component", () => {
    render(<RecipesPage />);
    expect(RecipeSearch).toHaveBeenCalledTimes(1);
  });

  it("passes all slot indices (0..MAX_RECIPES-1) to RecipeSearch", () => {
    render(<RecipesPage />);
    expect(capturedProps().slots).toEqual(Array.from({ length: MAX_RECIPES }, (_, i) => i));
  });

  describe("onDeleteSavedRecipe wiring", () => {
    it("does not pass an onDeleteSavedRecipe when the user is not signed in", () => {
      render(<RecipesPage />);
      expect(capturedProps().onDeleteSavedRecipe).toBeUndefined();
    });

    it("passes an onDeleteSavedRecipe when the user is signed in", () => {
      vi.mocked(useSession).mockReturnValueOnce({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      render(<RecipesPage />);
      expect(capturedProps().onDeleteSavedRecipe).toBeDefined();
    });

    it("invoking onDeleteSavedRecipe calls deleteUserRecipe with the recipe id, then refetches", async () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([]);

      render(<RecipesPage />);
      await capturedProps().onDeleteSavedRecipe!(entry);

      expect(deleteUserRecipe).toHaveBeenCalledWith("a@b.c", 42);
      await waitFor(() => {
        // mount + post-delete = 2 calls
        expect(fetchAllUserSavedRecipes).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("onDeleteSavedRecipeVersion wiring", () => {
    it("invoking onDeleteSavedRecipeVersion calls deleteUserRecipeVersion with id+version", async () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([]);

      render(<RecipesPage />);
      await capturedProps().onDeleteSavedRecipeVersion!(entry, version);

      expect(deleteUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 42, 1);
    });
  });

  describe("onUpdateSavedRecipeVersionComments wiring", () => {
    it("does not pass an onUpdateSavedRecipeVersionComments when the user is not signed in", () => {
      render(<RecipesPage />);
      expect(capturedProps().onUpdateSavedRecipeVersionComments).toBeUndefined();
    });

    it("passes an onUpdateSavedRecipeVersionComments when the user is signed in", () => {
      vi.mocked(useSession).mockReturnValueOnce({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      render(<RecipesPage />);
      expect(capturedProps().onUpdateSavedRecipeVersionComments).toBeDefined();
    });

    it("invoking onUpdateSavedRecipeVersionComments calls updateUserRecipeVersion with the comments", async () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([]);

      render(<RecipesPage />);
      await capturedProps().onUpdateSavedRecipeVersionComments!(entry, version, "Tasty.");

      expect(updateUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 42, 1, { comments: "Tasty." });
      await waitFor(() => {
        expect(fetchAllUserSavedRecipes).toHaveBeenCalledTimes(2);
      });
    });

    it("passes null for empty-string comments so the field is cleared in the DB", async () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([]);

      render(<RecipesPage />);
      await capturedProps().onUpdateSavedRecipeVersionComments!(entry, version, "");

      expect(updateUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 42, 1, { comments: null });
    });
  });

  describe("handleLoadRecipe", () => {
    it("writes the recipe to the target slot in localStorage with recipeId + versionNumber", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, version, 1);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.recipeStores)!);
      expect(stored[1].serializedRows).toBe("Heavy Cream\t500\nSucrose\t100");
      expect(stored[1].savedRef).toEqual({ recipeId: 42, versionNumber: 1 });
    });

    it("uses the entry name as the stored recipe name", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, version, 0);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.recipeStores)!);
      expect(stored[0].name).toBe("Standard Base");
    });

    it("omits recipeId/versionNumber for embedded entries", () => {
      const embedded: GroupedRecipe = {
        id: "Embedded",
        name: "Embedded",
        versions: [{ version: 1, recipe: [["Whole Milk", 100]], createdAt: "" }],
      };
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(embedded, embedded.versions[0], 0);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.recipeStores)!);
      expect(stored[0].savedRef).toBeUndefined();
    });

    it("does not modify other slots", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, version, 1);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.recipeStores)!);
      expect(stored[0].serializedRows).toBe("");
      expect(stored[2].serializedRows).toBe("");
    });

    it("navigates to /calculator with the correct slot query param", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, version, 2);
      expect(mockPush).toHaveBeenCalledWith("/calculator?slot=2");
    });

    it("serializes each recipe row as name<tab>quantity", () => {
      const multiRowVersion: SavedRecipeVersionJson = {
        version: 1,
        recipe: [
          ["Whole Milk", 700],
          ["Skimmed Milk Powder", 80],
          ["Sucrose", 120],
        ],
        createdAt: "",
      };
      const multiRowEntry: GroupedRecipe = {
        id: "Test",
        name: "Test",
        versions: [multiRowVersion],
      };

      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(multiRowEntry, multiRowVersion, 0);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.recipeStores)!);
      expect(stored[0].serializedRows).toBe(
        "Whole Milk\t700\nSkimmed Milk Powder\t80\nSucrose\t120",
      );
    });
  });
});
