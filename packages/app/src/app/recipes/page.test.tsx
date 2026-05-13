import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

import { type RecipeEntryJson, recipeEntryId } from "@workspace/sci-cream";
import { MAX_RECIPES } from "@/lib/styles/sizes";
import { RecipeSearch, type RecipeSearchProps } from "@/app/_components/recipe-search";
import { useSession } from "next-auth/react";
import { deleteUserRecipe, fetchAllUserSavedRecipes, updateUserRecipeComments } from "@/lib/data";

import RecipesPage from "./page";

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
  updateUserRecipeComments: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/_components/recipe-search", () => ({ RecipeSearch: vi.fn(() => null) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the props passed to the most recent RecipeSearch render */
function capturedProps(): RecipeSearchProps {
  return vi.mocked(RecipeSearch).mock.calls.at(-1)![0];
}

const entry: RecipeEntryJson = {
  name: "Standard Base",
  author: "Underbelly",
  recipe: [
    ["Heavy Cream", 500],
    ["Sucrose", 100],
  ],
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

    it("invoking onDeleteSavedRecipe calls deleteUserRecipe then refetches the saved list", async () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([]);

      render(<RecipesPage />);
      await capturedProps().onDeleteSavedRecipe!(entry);

      expect(deleteUserRecipe).toHaveBeenCalledWith("a@b.c", entry.name);
      await waitFor(() => {
        // The page should refetch the saved list after a delete (mount + post-delete = 2 calls)
        expect(fetchAllUserSavedRecipes).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("onUpdateSavedRecipeComments wiring", () => {
    it("does not pass an onUpdateSavedRecipeComments when the user is not signed in", () => {
      render(<RecipesPage />);
      expect(capturedProps().onUpdateSavedRecipeComments).toBeUndefined();
    });

    it("passes an onUpdateSavedRecipeComments when the user is signed in", () => {
      vi.mocked(useSession).mockReturnValueOnce({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      render(<RecipesPage />);
      expect(capturedProps().onUpdateSavedRecipeComments).toBeDefined();
    });

    it("invoking onUpdateSavedRecipeComments calls updateUserRecipeComments then refetches", async () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
      vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([]);

      render(<RecipesPage />);
      await capturedProps().onUpdateSavedRecipeComments!(entry, "Tasty.");

      expect(updateUserRecipeComments).toHaveBeenCalledWith("a@b.c", entry.name, "Tasty.");
      await waitFor(() => {
        expect(fetchAllUserSavedRecipes).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("handleLoadRecipe", () => {
    it("writes the recipe to the target slot in localStorage", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, 1);

      const stored = JSON.parse(localStorage.getItem("recipe-stores")!);
      expect(stored[1].serializedRows).toBe("Heavy Cream\t500\nSucrose\t100");
    });

    it("uses recipeEntryId as the stored recipe name", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, 0);

      const stored = JSON.parse(localStorage.getItem("recipe-stores")!);
      expect(stored[0].name).toBe(recipeEntryId(entry));
    });

    it("does not modify other slots", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, 1);

      const stored = JSON.parse(localStorage.getItem("recipe-stores")!);
      expect(stored[0].serializedRows).toBe("");
      expect(stored[2].serializedRows).toBe("");
    });

    it("navigates to /calculator with the correct slot query param", () => {
      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(entry, 2);
      expect(mockPush).toHaveBeenCalledWith("/calculator?slot=2");
    });

    it("serializes each recipe row as name<tab>quantity", () => {
      const multiRowEntry: RecipeEntryJson = {
        name: "Test",
        recipe: [
          ["Whole Milk", 700],
          ["Skimmed Milk Powder", 80],
          ["Sucrose", 120],
        ],
      };

      render(<RecipesPage />);
      capturedProps().onLoadRecipe!(multiRowEntry, 0);

      const stored = JSON.parse(localStorage.getItem("recipe-stores")!);
      expect(stored[0].serializedRows).toBe(
        "Whole Milk\t700\nSkimmed Milk Powder\t80\nSucrose\t120",
      );
    });
  });
});
