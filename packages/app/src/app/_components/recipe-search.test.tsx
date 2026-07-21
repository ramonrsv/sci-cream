import "@testing-library/jest-dom/vitest";

import { StrictMode } from "react";
import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";

import { type RecipeEntryJson } from "@workspace/sci-cream";
import { makeWasmResources, useSeededWasmResources } from "@/lib/resources/wasm-resources";
import {
  RecipeSearch,
  adaptEmbeddedToGrouped,
  recipeMatchesQuery,
  type GroupedRecipe,
} from "./recipe-search";
import type { SavedRecipeJson } from "@/lib/data";
import {
  getSelectOptionLabelsByLabel,
  getSelectedOptionLabel,
  getSelectedOptionLabelByLabel,
  selectOptionByLabel,
} from "@/__tests__/unit/select";
import { QtyToggle, QTY_TOGGLE_SHORT_LABELS } from "@/app/_elements/selects/qty-toggle-select";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { setQtyToggle } from "@/__tests__/unit/util";

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
    evaporation: 150,
  },
]);

vi.mock("@workspace/sci-cream", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/sci-cream")>();
  return { ...actual, allRecipeEntries: MOCK_EMBEDDED_ENTRIES };
});

vi.mock("@/lib/resources/wasm-resources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/resources/wasm-resources")>();
  return { ...actual, useSeededWasmResources: vi.fn() };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const groupedEmbedded1: GroupedRecipe = {
  id: "Alice: Standard Base",
  name: "Standard Base",
  author: "Alice",
  versions: [
    {
      version: 1,
      recipe: [
        ["Heavy Cream", 500],
        ["Sucrose", 100],
      ],
      createdAt: "",
    },
  ],
};

const groupedEmbedded2: GroupedRecipe = {
  id: "Chocolate Mix",
  name: "Chocolate Mix",
  versions: [
    {
      version: 1,
      recipe: [
        ["Whole Milk", 400],
        ["Cocoa Powder, 17% Fat", 50],
      ],
      createdAt: "",
    },
  ],
};

// ---------------------------------------------------------------------------
// recipeMatchesQuery
// ---------------------------------------------------------------------------

describe("recipeMatchesQuery", () => {
  it("matches name (case-insensitive against the entry side)", () => {
    expect(recipeMatchesQuery(groupedEmbedded1, "standard")).toBe(true);
  });

  it("matches a partial name", () => {
    expect(recipeMatchesQuery(groupedEmbedded2, "choc")).toBe(true);
  });

  it("matches author", () => {
    expect(recipeMatchesQuery(groupedEmbedded1, "alice")).toBe(true);
  });

  it("does not match an author query against an entry with no author field", () => {
    expect(recipeMatchesQuery(groupedEmbedded2, "alice")).toBe(false);
  });

  it("matches an ingredient name across any version", () => {
    expect(recipeMatchesQuery(groupedEmbedded2, "cocoa")).toBe(true);
  });

  it("matches a partial ingredient name", () => {
    expect(recipeMatchesQuery(groupedEmbedded1, "crea")).toBe(true);
  });

  it("returns false when no field matches", () => {
    expect(recipeMatchesQuery(groupedEmbedded1, "zzz-no-match")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// adaptEmbeddedToGrouped
// ---------------------------------------------------------------------------

describe("adaptEmbeddedToGrouped", () => {
  it("carries an embedded entry's evaporation onto its single version", () => {
    const grouped = adaptEmbeddedToGrouped({
      name: "Chocolate Ice Cream",
      recipe: [["Whole Milk", 1000]],
      evaporation: 150,
    } as RecipeEntryJson);
    expect(grouped.versions[0].evaporation).toBe(150);
  });

  it("omits evaporation for an entry without any", () => {
    const grouped = adaptEmbeddedToGrouped({
      name: "Plain",
      recipe: [["Whole Milk", 1000]],
    } as RecipeEntryJson);
    expect("evaporation" in grouped.versions[0]).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RecipeSearch
// ---------------------------------------------------------------------------

describe("RecipeSearch", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
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
      const savedEntry: SavedRecipeJson = {
        id: 42,
        name: "Strawberry Gelato",
        versions: [{ version: 1, recipe: [["Whole Milk", 300]], createdAt: "" }],
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

    it("shows the version's comments when the selected entry has them (embedded)", () => {
      render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.getByText(/A classic base recipe/)).toBeInTheDocument();
    });

    it("does not show a comments paragraph when the version has none", () => {
      render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Chocolate Mix/ }));
      expect(screen.queryByText(/A classic base recipe/)).not.toBeInTheDocument();
    });

    it("surfaces the evaporation readout and the resulting yield for an evaporated recipe", () => {
      const { container } = render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Chocolate Mix/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;

      // Evaporated amount rides in the reserved toolbar band; the yield (450 − 150 = 300 g) shows
      // inline in the table's Total row.
      expect(within(detailPanel).getByTitle(/water evaporated/)).toHaveTextContent("150");
      expect(within(detailPanel).getByTitle(/Yield/)).toHaveTextContent("300");
    });

    it("shows no evaporation readout for a recipe without evaporation", () => {
      const { container } = render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).queryByTitle(/water evaporated/)).not.toBeInTheDocument();
      expect(within(detailPanel).queryByTitle(/Yield/)).not.toBeInTheDocument();
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

    it("calls onLoadRecipe with the selected entry, version, and default slot on click", () => {
      const onLoadRecipe = vi.fn();
      render(<RecipeSearch onLoadRecipe={onLoadRecipe} slots={[0]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
      expect(onLoadRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Standard Base" }),
        expect.objectContaining({ version: 1 }),
        0,
      );
    });
  });

  describe("slot select", () => {
    it("does not show the slot select when only one slot is provided", () => {
      render(<RecipeSearch onLoadRecipe={vi.fn()} slots={[0]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.queryByRole("option", { name: "Ref A" })).not.toBeInTheDocument();
    });

    it("shows the slot select when multiple slots are provided", async () => {
      render(<RecipeSearch onLoadRecipe={vi.fn()} slots={[0, 1, 2]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(await getSelectOptionLabelsByLabel("Target slot")).toContain("Ref A");
    });

    it("calls onLoadRecipe with the slot selected in the picker", async () => {
      const onLoadRecipe = vi.fn();
      render(<RecipeSearch onLoadRecipe={onLoadRecipe} slots={[0, 1, 2]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      await selectOptionByLabel("Target slot", "Ref A");
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
      expect(onLoadRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Standard Base" }),
        expect.objectContaining({ version: 1 }),
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
    const savedEntry: SavedRecipeJson = {
      id: 42,
      name: "Strawberry Gelato",
      versions: [{ version: 1, recipe: [["Whole Milk", 300]], createdAt: "" }],
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

  describe("version selector", () => {
    const multiVersionEntry: SavedRecipeJson = {
      id: 42,
      name: "Iterated Recipe",
      versions: [
        { version: 1, recipe: [["Whole Milk", 100]], createdAt: "2026-05-01T00:00:00.000Z" },
        {
          version: 2,
          recipe: [["Whole Milk", 110]],
          comments: "Bumped milk a bit.",
          label: "milk bump",
          createdAt: "2026-05-10T00:00:00.000Z",
        },
      ],
    };

    it("shows the version selector when more than one version exists", () => {
      render(<RecipeSearch savedRecipes={[multiVersionEntry]} />);
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      expect(screen.getByLabelText("Recipe version")).toBeInTheDocument();
    });

    it("does not show the version selector for a single-version entry", () => {
      const single: SavedRecipeJson = {
        id: 1,
        name: "Single",
        versions: [{ version: 1, recipe: [["Whole Milk", 100]], createdAt: "" }],
      };
      render(<RecipeSearch savedRecipes={[single]} />);
      fireEvent.click(screen.getByRole("button", { name: /Single/ }));
      expect(screen.queryByLabelText("Recipe version")).not.toBeInTheDocument();
    });

    it("defaults to the latest version (last in the list)", () => {
      render(<RecipeSearch savedRecipes={[multiVersionEntry]} />);
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      // The latest version (v2) is selected, shown as the trigger label with the "latest" marker.
      const selectedLabel = getSelectedOptionLabelByLabel("Recipe version");
      expect(selectedLabel).toContain("v2");
      expect(selectedLabel).toContain("latest");
    });

    it("lists versions newest first (reverse chronological)", async () => {
      render(<RecipeSearch savedRecipes={[multiVersionEntry]} />);
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      const labels = await getSelectOptionLabelsByLabel("Recipe version");
      expect(labels[0]).toContain("v2");
      expect(labels[1]).toContain("v1");
    });

    it("loads the selected version when Load is clicked", async () => {
      const onLoadRecipe = vi.fn();
      render(
        <RecipeSearch savedRecipes={[multiVersionEntry]} onLoadRecipe={onLoadRecipe} slots={[0]} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      await selectOptionByLabel("Recipe version", /^v1\b/);
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
      expect(onLoadRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Iterated Recipe" }),
        expect.objectContaining({ version: 1 }),
        0,
      );
    });

    it("shows the version-delete button only when more than one version exists", () => {
      render(
        <RecipeSearch savedRecipes={[multiVersionEntry]} onDeleteSavedRecipeVersion={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      expect(screen.getByLabelText("Delete this version")).toBeInTheDocument();
    });

    it("clamps to the new latest version when the selected version is deleted out from under it", () => {
      const threeVersions: SavedRecipeJson = {
        id: 42,
        name: "Iterated Recipe",
        versions: [
          { version: 1, recipe: [["Whole Milk", 100]], createdAt: "2026-05-01T00:00:00.000Z" },
          { version: 2, recipe: [["Whole Milk", 110]], createdAt: "2026-05-10T00:00:00.000Z" },
          { version: 3, recipe: [["Whole Milk", 120]], createdAt: "2026-05-20T00:00:00.000Z" },
        ],
      };
      const { rerender } = render(<RecipeSearch savedRecipes={[threeVersions]} />);
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      expect(getSelectedOptionLabelByLabel("Recipe version")).toContain("v3");

      // Same recipe id, but v3 (the previously selected, latest version) is now gone — the
      // stored index would otherwise point past the end of the shrunk versions array.
      const versionDeleted: SavedRecipeJson = {
        ...threeVersions,
        versions: threeVersions.versions.slice(0, 2),
      };
      rerender(<RecipeSearch savedRecipes={[versionDeleted]} />);

      const selectedLabel = getSelectedOptionLabelByLabel("Recipe version");
      expect(selectedLabel).toContain("v2");
      expect(selectedLabel).toContain("latest");
    });

    it("resets to the latest version when switching to a different entry", async () => {
      const other: SavedRecipeJson = {
        id: 7,
        name: "Other Recipe",
        versions: [{ version: 1, recipe: [["Whole Milk", 50]], createdAt: "" }],
      };
      render(<RecipeSearch savedRecipes={[multiVersionEntry, other]} />);

      // Select the multi-version entry and pick a non-latest version.
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      await selectOptionByLabel("Recipe version", /^v1\b/);
      expect(getSelectedOptionLabelByLabel("Recipe version")).toContain("v1");

      // Switch away and back; the selection must return to the latest version, not persist v1.
      fireEvent.click(screen.getByRole("button", { name: /Other Recipe/ }));
      fireEvent.click(screen.getByRole("button", { name: /Iterated Recipe/ }));
      const selectedLabel = getSelectedOptionLabelByLabel("Recipe version");
      expect(selectedLabel).toContain("v2");
      expect(selectedLabel).toContain("latest");
    });
  });

  describe("editable comments (per-version)", () => {
    const savedWithVersions: SavedRecipeJson = {
      id: 42,
      name: "Strawberry Gelato",
      versions: [
        {
          version: 1,
          recipe: [["Whole Milk", 300]],
          comments: "Tart but smooth.",
          createdAt: "2026-05-01T00:00:00.000Z",
        },
        {
          version: 2,
          recipe: [["Whole Milk", 310]],
          comments: "After sweetener tweak.",
          createdAt: "2026-05-10T00:00:00.000Z",
        },
      ],
    };

    it("shows the latest version's comments by default", () => {
      render(
        <RecipeSearch
          savedRecipes={[savedWithVersions]}
          onUpdateSavedRecipeVersionComments={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      const textarea = screen.getByLabelText("Recipe comments") as HTMLTextAreaElement;
      expect(textarea.value).toBe("After sweetener tweak.");
    });

    it("re-seeds the textarea when switching versions", async () => {
      render(
        <RecipeSearch
          savedRecipes={[savedWithVersions]}
          onUpdateSavedRecipeVersionComments={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      await selectOptionByLabel("Recipe version", /^v1\b/);
      const textarea = screen.getByLabelText("Recipe comments") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Tart but smooth.");
    });

    it("calls onUpdateSavedRecipeVersionComments with the entry, version, and edited text", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined);
      render(
        <RecipeSearch
          savedRecipes={[savedWithVersions]}
          onUpdateSavedRecipeVersionComments={onUpdate}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Strawberry Gelato/ }));
      fireEvent.change(screen.getByLabelText("Recipe comments"), {
        target: { value: "Now with sprinkles." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save comments" }));
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Strawberry Gelato" }),
        expect.objectContaining({ version: 2 }),
        "Now with sprinkles.",
      );
    });

    it("shows a read-only comments paragraph for a built-in entry", () => {
      render(<RecipeSearch onUpdateSavedRecipeVersionComments={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      expect(screen.queryByLabelText("Recipe comments")).not.toBeInTheDocument();
      expect(screen.getByText(/A classic base recipe/)).toBeInTheDocument();
    });
  });

  describe("Select persistence", () => {
    const SLOT_KEY = `${STORAGE_KEYS.recipeSearchLoadAction}:slot`;
    const QTY_KEY = `${STORAGE_KEYS.recipeSearchPropertiesView}:qty`;

    it("writes the slot leaf key when the target slot changes", async () => {
      render(<RecipeSearch onLoadRecipe={vi.fn()} slots={[0, 1, 2]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      await act(async () => {});

      await selectOptionByLabel("Target slot", "Ref A");
      await act(async () => {});

      expect(localStorage.getItem(SLOT_KEY)).toBe(JSON.stringify(1));
    });

    it("restores the target slot on remount", async () => {
      localStorage.setItem(SLOT_KEY, JSON.stringify(1));
      render(<RecipeSearch onLoadRecipe={vi.fn()} slots={[0, 1, 2]} />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      await act(async () => {});

      expect(getSelectedOptionLabelByLabel("Target slot")).toContain("Ref A");
    });

    it("writes the QtyToggle leaf key when the PropertiesView select changes", async () => {
      const { container } = render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      await act(async () => {});

      await setQtyToggle(container, QtyToggle.Quantity);
      await act(async () => {});

      expect(localStorage.getItem(QTY_KEY)).toBe(JSON.stringify(QtyToggle.Quantity));
    });

    it("restores the QtyToggle value in PropertiesView on remount", async () => {
      localStorage.setItem(QTY_KEY, JSON.stringify(QtyToggle.Quantity));
      const { container } = render(<RecipeSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));
      await act(async () => {});

      expect(getSelectedOptionLabel(container, "#qty-toggle-select")).toBe(
        QTY_TOGGLE_SHORT_LABELS[QtyToggle.Quantity],
      );
    });
  });

  describe("MixProperties WASM lifetime (StrictMode)", () => {
    it("does not crash on re-render after a StrictMode mount cycle", () => {
      // StrictMode's setup → cleanup → setup mount cycle frees the live mixProperties under the old
      // effect-cleanup code; a bare render() runs the effect once, so the other tests never hit it.
      render(
        <StrictMode>
          <RecipeSearch />
        </StrictMode>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Standard Base/ }));

      // Typing re-renders PropertiesView, re-reading recipe.mixProperties; before the fix that hit
      // the freed object and threw "null pointer passed to rust" (the reported crash).
      expect(() =>
        fireEvent.change(screen.getByPlaceholderText("Search by name, author, or ingredient…"), {
          target: { value: "stand" },
        }),
      ).not.toThrow();

      // Properties table re-rendered (its "Property" header is present), proving a live object.
      const detailPanel = document.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("Property")).toBeInTheDocument();
    });
  });
});
