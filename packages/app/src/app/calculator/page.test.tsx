import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

import CalculatorPage from "./page";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

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

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
vi.stubGlobal("matchMedia", matchMediaMock);

vi.mock("@/lib/data", () => ({
  fetchValidIngredientNames: vi.fn(() => Promise.resolve(["2% Milk", "Sucrose", "Whipping Cream"])),
  fetchIngredientSpec: vi.fn(() => Promise.resolve(undefined)),
  fetchAllIngredientSpecs: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/app/navbar", () => ({ useNavbarContext: () => ({ theme: "Light" }) }));

// ---------------------------------------------------------------------------
// Calculator Page
// ---------------------------------------------------------------------------

describe("Calculator Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("should render one RecipeGrid component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#recipe-grid").length).toBe(1);
  });

  it("should render one MixPropertiesGrid component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#mix-properties-grid").length).toBe(1);
  });

  it("should render one IngredientCompositionGrid component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#ing-composition-grid").length).toBe(1);
  });

  it("should pre-fetch all ingredient specs (including names) on mount", async () => {
    const { fetchAllIngredientSpecs } = await import("../../lib/data");
    render(<CalculatorPage />);

    await waitFor(() => {
      expect(fetchAllIngredientSpecs).toHaveBeenCalled();
    });
  });

  it("should initialize recipes with empty ingredient rows", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("input").length).toBeGreaterThan(0);
  });
});
