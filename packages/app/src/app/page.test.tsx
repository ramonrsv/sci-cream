import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

import Home from "./page";

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

vi.mock("../lib/data", () => ({
  fetchValidIngredientNames: vi.fn(() => Promise.resolve(["2% Milk", "Sucrose", "Whipping Cream"])),
  fetchIngredientSpec: vi.fn(() => Promise.resolve(undefined)),
  fetchAllIngredientSpecs: vi.fn(() => Promise.resolve([])),
}));

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("should render the main heading", () => {
    render(<Home />);
    expect(screen.getByText("Ice Cream Recipe Calculator")).toBeInTheDocument();
  });

  it("should render two RecipeGrid components", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("#recipe-grid").length).toBe(2);
  });

  it("should render one MixPropertiesGrid components", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("#mix-properties-grid").length).toBe(1);
  });

  it("should render one IngredientCompositionGrid components", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("#ing-composition-grid").length).toBe(1);
  });

  it("should have proper page layout structure", () => {
    const { container } = render(<Home />);

    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("min-h-screen");
  });

  it("should fetch valid ingredient names on mount", async () => {
    const { fetchValidIngredientNames } = await import("../lib/data");
    render(<Home />);

    await waitFor(() => {
      expect(fetchValidIngredientNames).toHaveBeenCalled();
    });
  });

  it("should initialize recipes with empty ingredient rows", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("input").length).toBeGreaterThan(0);
  });
});
