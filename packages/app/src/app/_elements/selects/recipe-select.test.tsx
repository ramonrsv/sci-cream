import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { useState, useEffect } from "react";

import { type Recipe } from "@/app/_components/recipe";
import { RecipeSelect } from "./recipe-select";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

function makeRecipe(index: number, name: string): Recipe {
  return { index, name } as Recipe;
}

const ALL_RECIPES: Recipe[] = [
  makeRecipe(0, "Recipe"),
  makeRecipe(1, "Ref A"),
  makeRecipe(2, "Ref B"),
];

// ---------------------------------------------------------------------------
// RecipeSelect component
// ---------------------------------------------------------------------------

describe("RecipeSelect", () => {
  let currentRecipeIdx: number;

  function TestWrapper({
    allRecipes = ALL_RECIPES,
    enabledRecipeIndices = [0, 1, 2],
    initialIdx = 0,
  }: {
    allRecipes?: Recipe[];
    enabledRecipeIndices?: number[];
    initialIdx?: number;
  }) {
    const [idx, setIdx] = useState<number>(initialIdx);

    useEffect(() => {
      currentRecipeIdx = idx;
    }, [idx]);

    return (
      <RecipeSelect
        allRecipes={allRecipes}
        enabledRecipeIndices={enabledRecipeIndices}
        currentRecipeIdxState={[idx, setIdx]}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("renders a select inside #recipe-selection", () => {
    const { container } = render(<TestWrapper />);
    const wrapper = container.querySelector("#recipe-selection");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper!.querySelector("select")).toBeInTheDocument();
  });

  it("shows recipe names as option text for enabled recipes", () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 1, 2]} />);
    const select = container.querySelector("#recipe-selection select") as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((o) => o.text);
    expect(optionTexts).toEqual(["Recipe", "Ref A", "Ref B"]);
  });

  it("renders only enabled recipe options, not all recipes", () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 2]} />);
    const select = container.querySelector("#recipe-selection select") as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((o) => o.text);
    expect(optionTexts).toEqual(["Recipe", "Ref B"]);
    expect(optionTexts).not.toContain("Ref A");
  });

  it("reflects the initial recipe index as the selected value", () => {
    const { container } = render(<TestWrapper initialIdx={1} />);
    const select = container.querySelector("#recipe-selection select") as HTMLSelectElement;
    expect(select.value).toBe("1");
  });

  it("uses the recipe index as the option value", () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 2]} />);
    const select = container.querySelector("#recipe-selection select") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(["0", "2"]);
  });

  it("updates state when the user changes the selection", () => {
    const { container } = render(<TestWrapper />);
    const select = container.querySelector("#recipe-selection select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "1" } });
    expect(select.value).toBe("1");
    expect(currentRecipeIdx).toBe(1);
  });

  it("cycles through all enabled recipes and updates state correctly", () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 1, 2]} />);
    const select = container.querySelector("#recipe-selection select") as HTMLSelectElement;

    for (const idx of [0, 1, 2]) {
      fireEvent.change(select, { target: { value: String(idx) } });
      expect(select.value).toBe(String(idx));
      expect(currentRecipeIdx).toBe(idx);
    }
  });

  it("renders no options when enabledRecipeIndices is empty", () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[]} />);
    const select = container.querySelector("#recipe-selection select") as HTMLSelectElement;
    expect(select.options).toHaveLength(0);
  });
});
