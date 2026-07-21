import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { IngredientSearch, type IngredientSearchProps } from "@/app/_components/ingredient-search";
import { useSessionResources, type SessionResources } from "@/lib/resources/session";
import type { IngredientTransfer } from "@/lib/data";
import type { WasmResourcesState } from "@/lib/resources/wasm";

import IngredientsPage from "./page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/app/_components/ingredient-search", () => ({ IngredientSearch: vi.fn(() => null) }));
vi.mock("@/lib/resources/session", () => ({ useSessionResources: vi.fn() }));

/** Drive the page's source of ingredient specs via the (mocked) session-resources context. */
function mockUserIngredientSpecs(userIngredientSpecs: IngredientTransfer[]) {
  vi.mocked(useSessionResources).mockReturnValue({
    wasmResourcesState: [] as unknown as WasmResourcesState,
    savedRecipes: [],
    userIngredientSpecs,
    refreshUserRecipes: vi.fn().mockResolvedValue(undefined),
    refreshUserIngredients: vi.fn().mockResolvedValue(undefined),
  } satisfies SessionResources);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the props passed to the most recent IngredientSearch render */
function capturedProps(): IngredientSearchProps {
  return vi.mocked(IngredientSearch).mock.calls.at(-1)![0];
}

// ---------------------------------------------------------------------------
// IngredientsPage
// ---------------------------------------------------------------------------

describe("IngredientsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserIngredientSpecs([]);
  });

  afterEach(cleanup);

  it("renders an IngredientSearch component", () => {
    render(<IngredientsPage />);
    expect(IngredientSearch).toHaveBeenCalled();
  });

  it("starts with an empty savedSpecs array", () => {
    render(<IngredientsPage />);
    expect(capturedProps().savedSpecs).toEqual([]);
  });

  describe("saved-specs adapter", () => {
    it("passes through specs whose `spec` field is already an object", () => {
      mockUserIngredientSpecs([
        {
          name: "Fructose",
          user: 1,
          category: "Sweetener",
          spec: { name: "Fructose", category: "Sweetener", SweetenerSpec: { sweetness: 1.7 } },
        },
      ] as unknown as IngredientTransfer[]);

      render(<IngredientsPage />);
      expect(capturedProps().savedSpecs).toHaveLength(1);
      expect(capturedProps().savedSpecs![0].name).toBe("Fructose");
    });

    it("parses specs whose `spec` field is a JSON-encoded string", () => {
      mockUserIngredientSpecs([
        {
          name: "Fructose",
          user: 1,
          category: "Sweetener",
          spec: JSON.stringify({
            name: "Fructose",
            category: "Sweetener",
            SweetenerSpec: { sweetness: 1.7 },
          }),
        },
      ] as unknown as IngredientTransfer[]);

      render(<IngredientsPage />);
      expect(capturedProps().savedSpecs).toHaveLength(1);
      const spec = capturedProps().savedSpecs![0];
      expect(spec.name).toBe("Fructose");
      expect(spec.category).toBe("Sweetener");
    });

    it("filters out rows with malformed `spec` fields", () => {
      mockUserIngredientSpecs([
        { name: "Good", user: 1, category: "Sweetener", spec: { name: "Good", category: "X" } },
        { name: "BadString", user: 1, category: null, spec: "not valid json" },
        { name: "BadNull", user: 1, category: null, spec: null },
        { name: "MissingFields", user: 1, category: null, spec: { foo: 1 } },
      ] as unknown as IngredientTransfer[]);

      render(<IngredientsPage />);
      expect(capturedProps().savedSpecs).toHaveLength(1);
      expect(capturedProps().savedSpecs![0].name).toBe("Good");
    });
  });
});
