import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import Home from "./page";

vi.mock("../lib/data", () => ({
  fetchValidIngredientNames: vi.fn(() => Promise.resolve(["2% Milk", "Sucrose", "Whipping Cream"])),
  fetchIngredientSpec: vi.fn(() => Promise.resolve(null)),
}));

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the main heading", () => {
    render(<Home />);
    expect(screen.getByText("Ice Cream Recipe Calculator")).toBeInTheDocument();
  });

  it("should render two RecipeGrid components", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("#recipe-grid").length).toBe(2);
  });

  it("should render two MixPropertiesGrid components", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("#mix-properties-grid").length).toBe(2);
  });

  it("should render two IngredientCompositionGrid components", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("#ingredient-composition-grid").length).toBe(2);
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
