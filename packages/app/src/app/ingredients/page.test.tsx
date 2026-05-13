import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

import { useSession } from "next-auth/react";
import { fetchAllUserIngredientSpecs } from "@/lib/data";
import { IngredientSearch, type IngredientSearchProps } from "@/app/_components/ingredient-search";

import IngredientsPage from "./page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));
vi.mock("@/lib/data", () => ({
  fetchAllUserIngredientSpecs: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/_components/ingredient-search", () => ({ IngredientSearch: vi.fn(() => null) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the props passed to the most recent IngredientSearch render */
function capturedProps(): IngredientSearchProps {
  return vi.mocked(IngredientSearch).mock.calls.at(-1)![0];
}

/** Mock a saved-session for the next render */
function mockSignedIn(email = "a@b.c") {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { email }, expires: "" },
    status: "authenticated",
    update: vi.fn(),
  });
}

// ---------------------------------------------------------------------------
// IngredientsPage
// ---------------------------------------------------------------------------

describe("IngredientsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
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

  it("does not fetch user specs when the user is not signed in", () => {
    render(<IngredientsPage />);
    expect(fetchAllUserIngredientSpecs).not.toHaveBeenCalled();
  });

  it("fetches user specs when the user is signed in", async () => {
    mockSignedIn();
    render(<IngredientsPage />);
    await waitFor(() => {
      expect(fetchAllUserIngredientSpecs).toHaveBeenCalledWith("a@b.c");
    });
  });

  describe("saved-specs adapter", () => {
    it("passes through specs whose `spec` field is already an object", async () => {
      mockSignedIn();
      vi.mocked(fetchAllUserIngredientSpecs).mockResolvedValue([
        {
          name: "Fructose",
          user: 1,
          category: "Sweetener",
          spec: { name: "Fructose", category: "Sweetener", SweetenerSpec: { sweetness: 1.7 } },
        },
      ]);

      render(<IngredientsPage />);
      await waitFor(() => {
        expect(capturedProps().savedSpecs).toHaveLength(1);
      });
      expect(capturedProps().savedSpecs![0].name).toBe("Fructose");
    });

    it("parses specs whose `spec` field is a JSON-encoded string", async () => {
      mockSignedIn();
      vi.mocked(fetchAllUserIngredientSpecs).mockResolvedValue([
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
      ]);

      render(<IngredientsPage />);
      await waitFor(() => {
        expect(capturedProps().savedSpecs).toHaveLength(1);
      });
      const spec = capturedProps().savedSpecs![0];
      expect(spec.name).toBe("Fructose");
      expect(spec.category).toBe("Sweetener");
    });

    it("filters out rows with malformed `spec` fields", async () => {
      mockSignedIn();
      vi.mocked(fetchAllUserIngredientSpecs).mockResolvedValue([
        { name: "Good", user: 1, category: "Sweetener", spec: { name: "Good", category: "X" } },
        { name: "BadString", user: 1, category: null, spec: "not valid json" },
        { name: "BadNull", user: 1, category: null, spec: null },
        { name: "MissingFields", user: 1, category: null, spec: { foo: 1 } },
      ]);

      render(<IngredientsPage />);
      await waitFor(() => {
        expect(capturedProps().savedSpecs).toHaveLength(1);
      });
      expect(capturedProps().savedSpecs![0].name).toBe("Good");
    });
  });
});
