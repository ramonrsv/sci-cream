import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import CalculatorPage from "./page";

import { recipeIdxKey } from "@/app/_elements/selects/recipe-select";
import { RetainedStateContext } from "@/lib/hooks/use-retained-state";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { renderWithRetainedState } from "@/__tests__/unit/retained-state";
import { getSelectedOptionLabel, selectOption } from "@/__tests__/unit/select";

import { CompKey, compToPropKey } from "@workspace/sci-cream";

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

vi.mock("@/lib/data/ingredients", () => ({
  fetchUserIngredientSpecByName: vi.fn(() => Promise.resolve(undefined)),
  fetchAllUserIngredientSpecs: vi.fn(() => Promise.resolve([])),
}));

// `tables/recipe` is in this tree and imports the saved-recipe actions. Stubbing them draws the
// boundary Next.js would around a `"use server"` module; the runner otherwise loads NextAuth.
vi.mock("@/lib/data/recipes", () => ({
  createUserRecipe: vi.fn(),
  createUserRecipeVersion: vi.fn(),
  renameUserRecipe: vi.fn(),
  updateUserRecipeVersion: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/app/navbar", () => ({ useNavbarContext: () => ({ theme: "Light" }) }));

// ---------------------------------------------------------------------------
// Calculator Page
// ---------------------------------------------------------------------------

describe("Calculator Page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
    localStorage.clear();

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

  // The WASM bridge seeding and user-spec pre-fetch now live in SessionResourcesProvider (shared
  // once per session), so those behaviors are covered in session-resources.test.tsx, not here.

  it("should initialize recipes with empty ingredient rows", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("input").length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Recipe slot
  // ---------------------------------------------------------------------------

  describe("recipe slot", () => {
    const EDITOR_SELECT = "#recipe-editor-panel #recipe-selection";
    const recipeLabel = (container: HTMLElement) =>
      getSelectedOptionLabel(container, EDITOR_SELECT);

    it("defaults to slot 0 when none has been set for the editor", () => {
      const { container } = render(<CalculatorPage />);
      expect(recipeLabel(container)).toBe("Recipe");
    });

    // What `useOpenCalculator` leaves in the retained store when a recipe is loaded into a slot
    it.each([
      [0, "Recipe"],
      [1, "Ref A"],
      [2, "Ref B"],
    ])("opens on slot %i when it was set for the editor beforehand", (slot, label) => {
      const store = new Map<string, unknown>([
        [recipeIdxKey(STORAGE_KEYS.recipeEditorPanel)!, slot],
      ]);

      const { container } = render(
        <RetainedStateContext value={store}>
          <CalculatorPage />
        </RetainedStateContext>,
      );

      expect(recipeLabel(container)).toBe(label);
    });

    it("keeps the slot the user selected when the page is left and returned to", async () => {
      const { container, leaveAndReturn } = renderWithRetainedState(<CalculatorPage />);
      await selectOption(container, EDITOR_SELECT, "Ref A");

      leaveAndReturn();

      expect(recipeLabel(container)).toBe("Ref A");
    });

    it("opens on the main recipe again after a reload", async () => {
      const first = renderWithRetainedState(<CalculatorPage />);
      await selectOption(first.container, EDITOR_SELECT, "Ref A");
      first.unmount();

      const second = renderWithRetainedState(<CalculatorPage />);

      expect(recipeLabel(second.container)).toBe("Recipe");
    });

    it("is held in memory only, never in localStorage", async () => {
      const { container } = renderWithRetainedState(<CalculatorPage />);
      await selectOption(container, EDITOR_SELECT, "Ref A");

      expect(Object.keys(localStorage).some((key) => key.endsWith(":recipeIdx"))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Balancing targets threading
  // ---------------------------------------------------------------------------

  describe("balancing targets", () => {
    // TotalSolids is unconditionally shown, so its watcher card exists even for empty recipes.
    const TOTAL_SOLIDS = compToPropKey(CompKey.TotalSolids);
    const targetInput = () =>
      screen.getByTestId(`watcher-card-${String(TOTAL_SOLIDS)}-target`) as HTMLInputElement;

    it("hydrates stored targets into the watchers panel", async () => {
      localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [TOTAL_SOLIDS]: 30 }));
      render(<CalculatorPage />);
      await act(async () => {});
      expect(targetInput().value).toBe("30");
    });

    it("persists watcher target edits to localStorage", async () => {
      render(<CalculatorPage />);
      fireEvent.change(targetInput(), { target: { value: "12" } });
      await act(async () => {});
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherTargets) ?? "{}");
      expect(stored[TOTAL_SOLIDS]).toBe(12);
    });
  });
});
