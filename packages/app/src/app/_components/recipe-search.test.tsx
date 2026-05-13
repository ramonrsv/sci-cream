import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

import { type RecipeEntryJson } from "@workspace/sci-cream";
import { makeWasmResources, useSeededWasmResources } from "@/lib/wasm-resources";
import { RecipeSearch, RecipeSource, filterRecipeEntries } from "./recipe-search";

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
