import "@testing-library/jest-dom/vitest";

import { StrictMode } from "react";
import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

import type { IngredientSpecJson, SpecEntryJson } from "@workspace/sci-cream";
import { makeWasmResources, useSeededWasmResources } from "@/lib/wasm-resources";
import { IngredientSearch, ingredientMatchesQuery } from "./ingredient-search";

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

const MOCK_EMBEDDED_ENTRIES = vi.hoisted((): SpecEntryJson[] => [
  { name: "1% Milk", category: "Dairy", DairySimpleSpec: { fat: 1 } },
  { name: "3.25% Milk", category: "Dairy", DairySimpleSpec: { fat: 3.25 } },
  { name: "Sucrose", category: "Sweetener" },
  {
    name: "Sealtest 3.25% Milk",
    category: "Dairy",
    DairyLabelSpec: { fat: 3.25 },
    comments: "Nutrition facts: https://example.com/sealtest",
  },
  { alias: "Whole Milk", for: "3.25% Milk" },
]);

vi.mock("@workspace/sci-cream", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/sci-cream")>();
  return { ...actual, allSpecEntries: MOCK_EMBEDDED_ENTRIES };
});

vi.mock("@/lib/wasm-resources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/wasm-resources")>();
  return { ...actual, useSeededWasmResources: vi.fn() };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const savedFructose: IngredientSpecJson = {
  name: "Fructose",
  category: "Sweetener",
  SweetenerSpec: { sweetness: 1.7 },
};

// ---------------------------------------------------------------------------
// ingredientMatchesQuery
// ---------------------------------------------------------------------------

describe("ingredientMatchesQuery", () => {
  it("matches an IngredientSpec by name, case-insensitively", () => {
    const entry: SpecEntryJson = { name: "Sucrose", category: "Sweetener" };
    expect(ingredientMatchesQuery(entry, "sucr")).toBe(true);
    expect(ingredientMatchesQuery(entry, "SUCROSE")).toBe(false); // q is already lowercased
  });

  it("matches an IngredientSpec by category", () => {
    const entry: SpecEntryJson = { name: "Heavy Cream", category: "Dairy" };
    expect(ingredientMatchesQuery(entry, "dairy")).toBe(true);
  });

  it("matches an AliasSpec by its alias name", () => {
    const entry: SpecEntryJson = { alias: "Whole Milk", for: "3.25% Milk" };
    expect(ingredientMatchesQuery(entry, "whole")).toBe(true);
  });

  it("matches an AliasSpec by its target name", () => {
    const entry: SpecEntryJson = { alias: "Whole Milk", for: "3.25% Milk" };
    expect(ingredientMatchesQuery(entry, "3.25")).toBe(true);
  });

  it("does not match an AliasSpec by category (aliases have no category field)", () => {
    const entry: SpecEntryJson = { alias: "Whole Milk", for: "3.25% Milk" };
    expect(ingredientMatchesQuery(entry, "dairy")).toBe(false);
  });

  it("returns false when no field matches", () => {
    const entry: SpecEntryJson = { name: "Sucrose", category: "Sweetener" };
    expect(ingredientMatchesQuery(entry, "zzz-nope")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IngredientSearch
// ---------------------------------------------------------------------------

describe("IngredientSearch", () => {
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
    it("renders the #ingredient-search container", () => {
      const { container } = render(<IngredientSearch />);
      expect(container.querySelector("#ingredient-search")).toBeInTheDocument();
    });

    it("renders the search input with the ingredient placeholder", () => {
      render(<IngredientSearch />);
      expect(screen.getByPlaceholderText("Search by name or category…")).toBeInTheDocument();
    });

    it("renders All, Built-in, and Saved source filter buttons", () => {
      render(<IngredientSearch />);
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Built-in" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
    });

    it("shows the empty-state prompt when no ingredient is selected", () => {
      render(<IngredientSearch />);
      expect(screen.getByText("Select an ingredient to see details")).toBeInTheDocument();
    });

    it("renders embedded ingredient and alias names in the list", () => {
      render(<IngredientSearch />);
      expect(screen.getByText("1% Milk")).toBeInTheDocument();
      expect(screen.getByText("Sucrose")).toBeInTheDocument();
      expect(screen.getByText("Whole Milk")).toBeInTheDocument();
    });

    it("renders a saved ingredient name when provided", () => {
      render(<IngredientSearch savedSpecs={[savedFructose]} />);
      expect(screen.getByText("Fructose")).toBeInTheDocument();
    });
  });

  describe("list subtitles", () => {
    it("shows the category as the subtitle for an IngredientSpec", () => {
      render(<IngredientSearch />);
      const item = screen.getByText("Sucrose").closest("button")!;
      expect(within(item).getByText("Sweetener")).toBeInTheDocument();
    });

    it("shows the target's category and an 'Alias' badge as the subtitle for an AliasSpec", () => {
      render(<IngredientSearch />);
      const item = screen.getByText("Whole Milk").closest("button")!;
      // "Whole Milk" aliases "3.25% Milk", whose category is "Dairy"
      expect(within(item).getByText("Dairy")).toBeInTheDocument();
      expect(within(item).getByText("Alias")).toBeInTheDocument();
    });

    it("does not show an 'Alias' badge in the subtitle for a non-alias IngredientSpec", () => {
      render(<IngredientSearch />);
      const item = screen.getByText("Sucrose").closest("button")!;
      expect(within(item).queryByText("Alias")).not.toBeInTheDocument();
    });
  });

  describe("detail panel — IngredientSpec", () => {
    it("shows the ingredient name as a heading after selecting an entry", () => {
      render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sucrose/ }));
      expect(screen.getByRole("heading", { name: "Sucrose" })).toBeInTheDocument();
    });

    it("shows the 'built-in' badge for an embedded entry", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sucrose/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("built-in")).toBeInTheDocument();
    });

    it("shows the 'saved' badge for a saved entry", () => {
      const { container } = render(<IngredientSearch savedSpecs={[savedFructose]} />);
      fireEvent.click(screen.getByRole("button", { name: /Fructose/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("saved")).toBeInTheDocument();
    });

    it("shows the category meta-tag in the detail header", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sucrose/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      // "Sweetener" should appear in the header (it also appears in the subtitle on the list,
      // but the detail panel scope ensures we're checking the right one)
      expect(within(detailPanel).getByText("Sweetener")).toBeInTheDocument();
    });

    it("pretty-prints the JSON spec in a <pre> block (without _source)", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /1% Milk/ }));
      const pre = container.querySelector(".search-detail-panel pre") as HTMLElement;
      expect(pre).toBeInTheDocument();
      expect(pre.textContent).toContain('"name": "1% Milk"');
      expect(pre.textContent).toContain('"DairySimpleSpec"');
      expect(pre.textContent).not.toContain("_source");
    });

    it("renders the CompositionView alongside the JSON spec", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /1% Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      // CompositionView contains the KeyFilterSelect
      expect(detailPanel.querySelector("#key-filter-select")).toBeInTheDocument();
    });
  });

  describe("comments rendering", () => {
    it("does not render the comments field inside the JSON pre block", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sealtest 3.25% Milk/ }));
      const pre = container.querySelector(".search-detail-panel pre") as HTMLElement;
      expect(pre.textContent).not.toContain('"comments"');
      expect(pre.textContent).not.toContain("https://example.com/sealtest");
    });

    it("renders the raw comments text as a paragraph below the body", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sealtest 3.25% Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText(/Nutrition facts:/)).toBeInTheDocument();
    });

    it("autoLinks URLs in the comments paragraph", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sealtest 3.25% Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      const link = within(detailPanel).getByRole("link", { name: "https://example.com/sealtest" });
      expect(link).toHaveAttribute("href", "https://example.com/sealtest");
    });

    it("does not render a comments paragraph for entries with no comments field", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /1% Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      // The pre block keeps no `comments` key at all when the source entry has none
      const pre = detailPanel.querySelector("pre") as HTMLElement;
      expect(pre.textContent).not.toContain('"comments"');
    });

    it("does not render an editable comments textarea (read-only)", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sealtest 3.25% Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("detail panel — AliasSpec", () => {
    it("shows the alias name as the heading", () => {
      render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Whole Milk/ }));
      expect(screen.getByRole("heading", { name: "Whole Milk" })).toBeInTheDocument();
    });

    it("shows an 'Alias' badge in the detail header", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Whole Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("Alias")).toBeInTheDocument();
    });

    it("resolves and shows the target's category meta-tag in the header", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Whole Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).getByText("Dairy")).toBeInTheDocument();
    });

    it("does not show the literal 'alias for X' text in the detail header", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Whole Milk/ }));
      const detailPanel = container.querySelector(".search-detail-panel") as HTMLElement;
      expect(within(detailPanel).queryByText(/alias for/i)).not.toBeInTheDocument();
    });

    it("pretty-prints the alias JSON ({ alias, for }) without _source", () => {
      const { container } = render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Whole Milk/ }));
      const pre = container.querySelector(".search-detail-panel pre") as HTMLElement;
      expect(pre.textContent).toContain('"alias": "Whole Milk"');
      expect(pre.textContent).toContain('"for": "3.25% Milk"');
      expect(pre.textContent).not.toContain("_source");
    });
  });

  describe("read-only by design", () => {
    it("does not render a Load button (no onLoad prop)", () => {
      render(<IngredientSearch />);
      fireEvent.click(screen.getByRole("button", { name: /Sucrose/ }));
      expect(screen.queryByRole("button", { name: "Load" })).not.toBeInTheDocument();
    });

    it("does not render a Delete button (no onDelete prop)", () => {
      render(<IngredientSearch savedSpecs={[savedFructose]} />);
      fireEvent.click(screen.getByRole("button", { name: /Fructose/ }));
      expect(screen.queryByLabelText(/Delete/i)).not.toBeInTheDocument();
    });

    it("does not render a comments textarea (no onUpdateComments prop)", () => {
      render(<IngredientSearch savedSpecs={[savedFructose]} />);
      fireEvent.click(screen.getByRole("button", { name: /Fructose/ }));
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("narrows the list by name", () => {
      render(<IngredientSearch />);
      fireEvent.change(screen.getByPlaceholderText("Search by name or category…"), {
        target: { value: "sucrose" },
      });
      expect(screen.getByText("Sucrose")).toBeInTheDocument();
      expect(screen.queryByText("1% Milk")).not.toBeInTheDocument();
    });

    it("narrows the list by category", () => {
      render(<IngredientSearch />);
      fireEvent.change(screen.getByPlaceholderText("Search by name or category…"), {
        target: { value: "sweetener" },
      });
      expect(screen.getByText("Sucrose")).toBeInTheDocument();
      expect(screen.queryByText("1% Milk")).not.toBeInTheDocument();
    });

    it("shows the empty-results message when no entries match", () => {
      render(<IngredientSearch />);
      fireEvent.change(screen.getByPlaceholderText("Search by name or category…"), {
        target: { value: "zzz-nope" },
      });
      expect(screen.getByText("No ingredients found.")).toBeInTheDocument();
    });
  });

  describe("Ingredient WASM lifetime (StrictMode)", () => {
    it("does not crash on re-render after a StrictMode mount cycle", () => {
      // StrictMode's setup → cleanup → setup mount cycle frees the live Ingredient under the old
      // effect-cleanup code; a bare render() runs the effect once, so the other tests never hit it.
      render(
        <StrictMode>
          <IngredientSearch />
        </StrictMode>,
      );
      fireEvent.click(screen.getByRole("button", { name: /1% Milk/ }));

      // Typing re-renders the detail body, re-reading `ingredient.composition`; before the fix that
      // hit the freed object and threw "null pointer passed to rust".
      expect(() =>
        fireEvent.change(screen.getByPlaceholderText("Search by name or category…"), {
          target: { value: "1% Mil" },
        }),
      ).not.toThrow();

      // Composition table re-rendered, proving the read hit a live object.
      const detailPanel = document.querySelector(".search-detail-panel") as HTMLElement;
      expect(detailPanel.querySelector("#key-filter-select")).toBeInTheDocument();
    });
  });
});
