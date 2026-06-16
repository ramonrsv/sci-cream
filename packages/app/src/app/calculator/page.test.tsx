import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import CalculatorPage from "./page";

import { TEST_USER_A } from "@/lib/database/assets";
import { getSelectedOptionLabel } from "@/__tests__/unit/select";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

const matchMediaMock = vi
  .fn()
  .mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

vi.stubGlobal("matchMedia", matchMediaMock);

vi.mock("@workspace/sci-cream", async () => {
  const actual =
    await vi.importActual<typeof import("@workspace/sci-cream")>("@workspace/sci-cream");

  return {
    ...actual,
    new_ingredient_database_seeded_from_embedded_data: vi.fn(() =>
      actual.new_ingredient_database_seeded_from_embedded_data(),
    ),
  };
});

vi.mock("@/lib/data", () => ({
  fetchUserIngredientSpecByName: vi.fn(() => Promise.resolve(undefined)),
  fetchAllUserIngredientSpecs: vi.fn(() => Promise.resolve([])),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));

const mockUseSearchParams = vi.hoisted(() => vi.fn().mockReturnValue(new URLSearchParams()));
vi.mock("next/navigation", () => ({ useSearchParams: mockUseSearchParams }));

vi.mock("@/app/navbar", () => ({ useNavbarContext: () => ({ theme: "Light" }) }));

// ---------------------------------------------------------------------------
// Calculator Page
// ---------------------------------------------------------------------------

describe("Calculator Page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupVitestCanvasMock();

    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      update: vi.fn(),
      data: null,
      status: "unauthenticated",
    });
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("should render one RecipeEditorPanel component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#recipe-editor-panel").length).toBe(1);
  });

  it("should render one PropertiesPanel component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#properties-panel").length).toBe(1);
  });

  it("should render one CompositionBreakdownPanel component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#composition-breakdown-panel").length).toBe(1);
  });

  it("should pre-seed WasmBridge with all embedded ingredient specs on mount", async () => {
    const { new_ingredient_database_seeded_from_embedded_data } =
      await import("@workspace/sci-cream");

    render(<CalculatorPage />);

    await waitFor(() => {
      expect(new_ingredient_database_seeded_from_embedded_data).toHaveBeenCalled();
    });
  });

  it("if logged in, should pre-fetch all user ingredient specs on mount", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: TEST_USER_A.email }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { fetchAllUserIngredientSpecs } = await import("@/lib/data");
    render(<CalculatorPage />);

    await waitFor(() => {
      expect(fetchAllUserIngredientSpecs).toHaveBeenCalledWith(TEST_USER_A.email);
    });
  });

  it("if not logged in, should not pre-fetch any user ingredient specs on mount", async () => {
    const { fetchAllUserIngredientSpecs } = await import("@/lib/data");
    render(<CalculatorPage />);

    await waitFor(() => {
      expect(fetchAllUserIngredientSpecs).not.toHaveBeenCalled();
    });
  });

  it("should initialize recipes with empty ingredient rows", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("input").length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Slot query param
  // ---------------------------------------------------------------------------

  describe("slot query param", () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams());
    });

    const recipeLabel = (container: HTMLElement) =>
      getSelectedOptionLabel(container, "#recipe-selection");

    it("defaults to slot 0 when no slot param is given", () => {
      const { container } = render(<CalculatorPage />);
      expect(recipeLabel(container)).toBe("Recipe");
    });

    it.each([
      [0, "Recipe"],
      [1, "Ref A"],
      [2, "Ref B"],
    ])("selects slot %i when valid ?slot=%i", (slot, label) => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams(`slot=${slot}`));

      const { container } = render(<CalculatorPage />);
      expect(recipeLabel(container)).toBe(label);
    });

    it.each([-1, 3, 99, "abc"])("defaults to slot 0 for invalid slot %s", (slot) => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams(`slot=${slot}`));

      const { container } = render(<CalculatorPage />);
      expect(recipeLabel(container)).toBe("Recipe");
    });
  });
});
