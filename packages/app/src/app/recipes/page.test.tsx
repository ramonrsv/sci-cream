import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { type RecipeEntryJson, recipeEntryId } from "@workspace/sci-cream";
import { MAX_RECIPES } from "@/lib/styles/sizes";
import { RecipeSearch, type RecipeSearchProps } from "@/app/_components/recipe-search";

import RecipesPage from "./page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: vi.fn(() => ({ push: mockPush })) }));
vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));
vi.mock("@/lib/data", () => ({ fetchAllUserSavedRecipes: vi.fn().mockResolvedValue(undefined) }));
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
