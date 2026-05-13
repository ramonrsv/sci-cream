import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

import { type RecipeEntryJson } from "@workspace/sci-cream";
import { makeWasmResources, useSeededWasmResources } from "@/lib/wasm-resources";
import { RecipeSearch, recipeMatchesQuery } from "./recipe-search";

// ---------------------------------------------------------------------------
// Global stubs
// ---------------------------------------------------------------------------

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/lib/data", () => ({ fetchAllUserIngredientSpecs: vi.fn().mockResolvedValue([]) }));

const MOCK_EMBEDDED_ENTRIES = vi.hoisted((): RecipeEntryJson[] => [
  {
    name: "Standard Base",
    author: "Alice",
    recipe: [
      ["Heavy Cream", 500],
      ["Sucrose", 100],
    ],
    comments: "A classic base recipe.",
  },
  {
    name: "Chocolate Mix",
    recipe: [
      ["Whole Milk", 400],
      ["Cocoa Powder, 17% Fat", 50],
    ],
  },
]);

vi.mock("@workspace/sci-cream", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/sci-cream")>();
  return { ...actual, allRecipeEntries: MOCK_EMBEDDED_ENTRIES };
});

vi.mock("@/lib/wasm-resources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/wasm-resources")>();
  return { ...actual, useSeededWasmResources: vi.fn() };
});

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

// ---------------------------------------------------------------------------
// recipeMatchesQuery
// ---------------------------------------------------------------------------

// Note: `recipeMatchesQuery` is invoked with an already-lowercased query by `filterTaggedEntries`,
// so these direct tests always pass lowercase queries. Source tagging, source filtering, and the
// source+query combination are covered by `entity-search.test.tsx`'s `filterTaggedEntries` tests.

describe("recipeMatchesQuery", () => {
  it("matches name (case-insensitive against the entry side)", () => {
    expect(recipeMatchesQuery(embedded1, "standard")).toBe(true);
  });

  it("matches a partial name", () => {
    expect(recipeMatchesQuery(embedded2, "choc")).toBe(true);
  });

  it("matches author", () => {
    expect(recipeMatchesQuery(embedded1, "alice")).toBe(true);
  });

  it("does not match an author query against an entry with no author field", () => {
    expect(recipeMatchesQuery(embedded2, "alice")).toBe(false);
  });

  it("matches an ingredient name", () => {
    expect(recipeMatchesQuery(embedded2, "cocoa")).toBe(true);
  });

  it("matches a partial ingredient name", () => {
    // matches "Heavy Cream"
    expect(recipeMatchesQuery(embedded1, "crea")).toBe(true);
  });

  it("returns false when no field matches", () => {
    expect(recipeMatchesQuery(embedded1, "zzz-no-match")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RecipeSearch
// ---------------------------------------------------------------------------

describe("RecipeSearch", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupVitestCanvasMock();

    const { Bridge, new_ingredient_database_seeded_from_embedded_data } =
      await import("@workspace/sci-cream");
    const bridge = new Bridge(new_ingredient_database_seeded_from_embedded_data());
    const resources = makeWasmResources(bridge);
    vi.mocked(useSeededWasmResources).mockReturnValue([resources, vi.fn()]);
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  describe("initial render", () => {
    it("renders the #recipe-search container", () => {
      const { container } = render(<RecipeSearch />);
      expect(container.querySelector("#recipe-search")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      render(<RecipeSearch />);
      expect(
        screen.getByPlaceholderText("Search by name, author, or ingredient…"),
      ).toBeInTheDocument();
    });

    it("renders All, Built-in, and Saved source filter buttons", () => {
      render(<RecipeSearch />);
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Built-in" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
    });

    it("shows the empty state prompt when no recipe is selected", () => {
      render(<RecipeSearch />);
      expect(screen.getByText("Select a recipe to see details")).toBeInTheDocument();
    });

    it("renders the embedded recipe names in the list", () => {
      render(<RecipeSearch />);
      expect(screen.getByText("Standard Base")).toBeInTheDocument();
      expect(screen.getByText("Chocolate Mix")).toBeInTheDocument();
    });
  });

  describe("recipe selection", () => {
    it("shows the recipe name as a heading in the detail panel after selecting an entry", () => {
      render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.getByRole("heading", { name: "Standard Base" })).toBeInTheDocument();
    });

    it("shows the 'built-in' badge when an embedded entry is selected", () => {
      const { container } = render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("built-in")).toBeInTheDocument();
    });

    it("shows the 'saved' badge when a saved entry is selected", () => {
      const savedEntry: RecipeEntryJson = {
        name: "Strawberry Gelato",
        recipe: [["Whole Milk", 300]],
      };
      const { container } = render(<RecipeSearch savedRecipes={[savedEntry]} />);
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("saved")).toBeInTheDocument();
    });

    it("shows the author in the detail panel when the selected entry has one", () => {
      const { container } = render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("Alice")).toBeInTheDocument();
    });

    it("does not show an author in the detail panel when the selected entry has none", () => {
      const { container } = render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Chocolate Mix/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).queryByText("Alice")).not.toBeInTheDocument();
    });

    it("shows the comments when the selected entry has a comments field", () => {
      render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.getByText(/A classic base recipe/)).toBeInTheDocument();
    });

    it("does not show a comments paragraph when the selected entry has none", () => {
      render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Chocolate Mix/ }));
      expect(screen.queryByText(/A classic base recipe/)).not.toBeInTheDocument();
    });
  });

  describe("load button", () => {
    it("renders the Load button when onLoadRecipe is provided", () => {
      render(<RecipeSearch onLoadRecipe={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument();
    });

    it("does not render the Load button when onLoadRecipe is not provided", () => {
      render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.queryByRole("button", { name: "Load" })).not.toBeInTheDocument();
    });

    it("calls onLoadRecipe with the selected entry and default slot on click", () => {
      const onLoadRecipe = vi.fn();
      render(<RecipeSearch onLoadRecipe={onLoadRecipe} slots={[0]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
      expect(onLoadRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Standard Base" }),
        0,
      );
    });
  });

  describe("slot select", () => {
    it("does not show the slot select when only one slot is provided", () => {
      render(<RecipeSearch onLoadRecipe={vi.fn()} slots={[0]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      // Slot select is absent; its options ("Recipe", "Ref A", …) should not be in the DOM
      expect(screen.queryByRole("option", { name: "Ref A" })).not.toBeInTheDocument();
    });

    it("shows the slot select when multiple slots are provided", () => {
      render(<RecipeSearch onLoadRecipe={vi.fn()} slots={[0, 1, 2]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.getByRole("option", { name: "Ref A" })).toBeInTheDocument();
    });

    it("calls onLoadRecipe with the slot selected in the combobox", () => {
      const onLoadRecipe = vi.fn();
      render(<RecipeSearch onLoadRecipe={onLoadRecipe} slots={[0, 1, 2]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      // Find the slot <select> via its unique "Recipe" / "Ref A" options
      const slotSelect = screen.getByRole("option", { name: "Recipe" }).closest("select")!;
      fireEvent.change(slotSelect, { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
      expect(onLoadRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Standard Base" }),
        1,
      );
    });
  });

  describe("search input", () => {
    it("hides non-matching recipes when a query is typed", () => {
      render(<RecipeSearch />);
      fireEvent.change(screen.getByPlaceholderText("Search by name, author, or ingredient…"), {
        target: { value: "chocolate" },
      });
      expect(screen.queryByText("Standard Base")).not.toBeInTheDocument();
      expect(screen.getByText("Chocolate Mix")).toBeInTheDocument();
    });

    it("shows 'No recipes found.' when the query matches nothing", () => {
      render(<RecipeSearch />);
      fireEvent.change(screen.getByPlaceholderText("Search by name, author, or ingredient…"), {
        target: { value: "zzz-no-match" },
      });
      expect(screen.getByText("No recipes found.")).toBeInTheDocument();
    });
  });

  describe("delete button", () => {
    const savedEntry: RecipeEntryJson = {
      name: "Strawberry Gelato",
      recipe: [["Whole Milk", 300]],
    };

    it("shows the Delete button on a selected saved entry when onDeleteSavedRecipe is provided", () => {
      render(<RecipeSearch savedRecipes={[savedEntry]} onDeleteSavedRecipe={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      expect(screen.getByLabelText("Delete saved recipe")).toBeInTheDocument();
    });

    it("does not show the Delete button on a built-in entry", () => {
      render(<RecipeSearch onDeleteSavedRecipe={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.queryByLabelText("Delete saved recipe")).not.toBeInTheDocument();
    });

    it("does not show the Delete button when onDeleteSavedRecipe is not provided", () => {
      render(<RecipeSearch savedRecipes={[savedEntry]} />);
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      expect(screen.queryByLabelText("Delete saved recipe")).not.toBeInTheDocument();
    });

    it("calls onDeleteSavedRecipe with the entry when confirm() returns true", () => {
      const onDelete = vi.fn();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      render(<RecipeSearch savedRecipes={[savedEntry]} onDeleteSavedRecipe={onDelete} />);
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      fireEvent.click(screen.getByLabelText("Delete saved recipe"));
      expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: "Strawberry Gelato" }));
    });

    it("does not call onDeleteSavedRecipe when confirm() returns false", () => {
      const onDelete = vi.fn();
      vi.spyOn(window, "confirm").mockReturnValue(false);
      render(<RecipeSearch savedRecipes={[savedEntry]} onDeleteSavedRecipe={onDelete} />);
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      fireEvent.click(screen.getByLabelText("Delete saved recipe"));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe("editable comments", () => {
    const savedWithComments: RecipeEntryJson = {
      name: "Strawberry Gelato",
      recipe: [["Whole Milk", 300]],
      comments: "Tart but smooth.",
    };

    const savedWithoutComments: RecipeEntryJson = {
      name: "Plain Saved",
      recipe: [["Whole Milk", 300]],
    };

    it("shows an editable textarea (pre-filled) for a saved entry when the callback is provided", () => {
      render(
        <RecipeSearch savedRecipes={[savedWithComments]} onUpdateSavedRecipeComments={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      const textarea = screen.getByLabelText("Recipe comments") as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe("Tart but smooth.");
    });

    it("pre-fills the textarea with an empty string when the saved entry has no comments", () => {
      render(
        <RecipeSearch
          savedRecipes={[savedWithoutComments]}
          onUpdateSavedRecipeComments={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Plain Saved/ }));
      const textarea = screen.getByLabelText("Recipe comments") as HTMLTextAreaElement;
      expect(textarea.value).toBe("");
    });

    it("resets the textarea when switching to a different entry", () => {
      const otherSaved: RecipeEntryJson = {
        name: "Other Saved",
        recipe: [["Whole Milk", 200]],
        comments: "Different notes.",
      };
      render(
        <RecipeSearch
          savedRecipes={[savedWithComments, otherSaved]}
          onUpdateSavedRecipeComments={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      expect((screen.getByLabelText("Recipe comments") as HTMLTextAreaElement).value).toBe(
        "Tart but smooth.",
      );
      fireEvent.click(screen.getByRole("button", { name: /Other Saved/ }));
      expect((screen.getByLabelText("Recipe comments") as HTMLTextAreaElement).value).toBe(
        "Different notes.",
      );
    });

    it("calls onUpdateSavedRecipeComments with the entry and the current text on Save", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined);
      render(
        <RecipeSearch savedRecipes={[savedWithComments]} onUpdateSavedRecipeComments={onUpdate} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      fireEvent.change(screen.getByLabelText("Recipe comments"), {
        target: { value: "Now with sprinkles." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save comments" }));
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Strawberry Gelato" }),
        "Now with sprinkles.",
      );
    });

    it("shows a read-only comments paragraph (not a textarea) for a saved entry when the callback is absent", () => {
      render(<RecipeSearch savedRecipes={[savedWithComments]} />);
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      expect(screen.queryByLabelText("Recipe comments")).not.toBeInTheDocument();
      expect(screen.getByText("Tart but smooth.")).toBeInTheDocument();
    });

    it("shows a read-only comments paragraph (not a textarea) for a built-in entry even when the callback is provided", () => {
      render(<RecipeSearch onUpdateSavedRecipeComments={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.queryByLabelText("Recipe comments")).not.toBeInTheDocument();
      expect(screen.getByText(/A classic base recipe/)).toBeInTheDocument();
    });
  });
});
