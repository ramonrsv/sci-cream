import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useState, useEffect } from "react";

import { type Recipe } from "@/lib/recipe/recipe";
import { renderWithRetainedState } from "@/__tests__/unit/retained-state";
import {
  getSelectControl,
  getSelectControlByLabel,
  getSelectedOptionLabel,
  getSelectOptionLabels,
  selectOption,
} from "@/__tests__/unit/select";

import { RecipeSelect, recipeIdxKey, useRecipeIdxState } from "./recipe-select";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

/** Creates a mock empty `Recipe` object with the given index and id */
function makeRecipe(index: number, id: string): Recipe {
  return { index, id } as Recipe;
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

  /**
   * Wrapper component around a `RecipeSelect` that owns recipe index state, which is a prop to
   * `RecipeSelect`, and exposes it for assertions via `useEffect` and closure variables.
   */
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

  it("renders a select control inside #recipe-selection", () => {
    const { container } = render(<TestWrapper />);
    expect(container.querySelector("#recipe-selection")).toBeInTheDocument();
    expect(getSelectControl(container, "#recipe-selection")).toBeInTheDocument();
  });

  it("names the control and echoes the current recipe in its tooltip", () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 1, 2]} initialIdx={1} />);
    expect(getSelectControlByLabel("Recipe slot")).toBe(
      getSelectControl(container, "#recipe-selection"),
    );
    expect(container.querySelector("#recipe-selection [title]")).toHaveAttribute(
      "title",
      "Recipe slot (Ref A)",
    );
  });

  it("shows recipe names as options for enabled recipes", async () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 1, 2]} />);
    expect(await getSelectOptionLabels(container, "#recipe-selection")).toEqual([
      "Recipe",
      "Ref A",
      "Ref B",
    ]);
  });

  it("renders only enabled recipe options, not all recipes", async () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 2]} />);
    const labels = await getSelectOptionLabels(container, "#recipe-selection");
    expect(labels).toEqual(["Recipe", "Ref B"]);
    expect(labels).not.toContain("Ref A");
  });

  it("reflects the initial recipe index in the selected label", () => {
    const { container } = render(<TestWrapper initialIdx={1} />);
    expect(getSelectedOptionLabel(container, "#recipe-selection")).toBe("Ref A");
  });

  it("maps recipe indices to the corresponding option labels", async () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 2]} />);
    const labels = await getSelectOptionLabels(container, "#recipe-selection");
    expect(labels).toEqual(["Recipe", "Ref B"]);
  });

  it("updates state when the user changes the selection", async () => {
    const { container } = render(<TestWrapper />);
    await selectOption(container, "#recipe-selection", "Ref A");
    expect(currentRecipeIdx).toBe(1);
  });

  it("cycles through all enabled recipes and updates state correctly", async () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[0, 1, 2]} />);

    for (const [idx, label] of [
      [0, "Recipe"],
      [1, "Ref A"],
      [2, "Ref B"],
    ] as const) {
      await selectOption(container, "#recipe-selection", label);
      expect(currentRecipeIdx).toBe(idx);
    }
  });

  it("renders no options when enabledRecipeIndices is empty", async () => {
    const { container } = render(<TestWrapper enabledRecipeIndices={[]} />);
    expect(await getSelectOptionLabels(container, "#recipe-selection")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// recipeIdxKey
// ---------------------------------------------------------------------------

describe("recipeIdxKey", () => {
  it("derives the leaf key from the view's root", () => {
    expect(recipeIdxKey("view")).toBe("view:recipeIdx");
  });

  it("is undefined without a root, which opts out of retention", () => {
    expect(recipeIdxKey(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// useRecipeIdxState
// ---------------------------------------------------------------------------

describe("useRecipeIdxState", () => {
  const ROOT = "test-view";
  const SELECTOR = "#recipe-selection";

  /** A `RecipeSelect` driven by `useRecipeIdxState`, as the calculator's views are */
  function Probe({
    persistKey,
    defaultValue,
  }: {
    persistKey: string | undefined;
    defaultValue?: number;
  }) {
    const state = useRecipeIdxState(persistKey, defaultValue);
    return (
      <RecipeSelect
        allRecipes={ALL_RECIPES}
        enabledRecipeIndices={[0, 1, 2]}
        currentRecipeIdxState={state}
      />
    );
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("starts on the main recipe", () => {
    const { container } = render(<Probe persistKey={ROOT} />);
    expect(getSelectedOptionLabel(container, SELECTOR)).toBe("Recipe");
  });

  it("starts on the given default", () => {
    const { container } = render(<Probe persistKey={ROOT} defaultValue={2} />);
    expect(getSelectedOptionLabel(container, SELECTOR)).toBe("Ref B");
  });

  it("keeps the selected slot when the view is left and returned to", async () => {
    const { container, leaveAndReturn } = renderWithRetainedState(<Probe persistKey={ROOT} />);
    await selectOption(container, SELECTOR, "Ref A");

    leaveAndReturn();

    expect(getSelectedOptionLabel(container, SELECTOR)).toBe("Ref A");
  });

  it("starts on the default again after a reload", async () => {
    const first = renderWithRetainedState(<Probe persistKey={ROOT} />);
    await selectOption(first.container, SELECTOR, "Ref A");
    first.unmount();

    const second = renderWithRetainedState(<Probe persistKey={ROOT} />);

    expect(getSelectedOptionLabel(second.container, SELECTOR)).toBe("Recipe");
  });

  it("is held in memory only, never in localStorage", async () => {
    const { container } = renderWithRetainedState(<Probe persistKey={ROOT} />);
    await selectOption(container, SELECTOR, "Ref A");

    expect(localStorage).toHaveLength(0);
  });

  it("ignores a slot left in localStorage", () => {
    localStorage.setItem(`${ROOT}:recipeIdx`, JSON.stringify(2));

    const { container } = render(<Probe persistKey={ROOT} />);

    expect(getSelectedOptionLabel(container, SELECTOR)).toBe("Recipe");
  });

  it("retains nothing without a persistKey", async () => {
    const { container, leaveAndReturn } = renderWithRetainedState(<Probe persistKey={undefined} />);
    await selectOption(container, SELECTOR, "Ref A");

    leaveAndReturn();

    expect(getSelectedOptionLabel(container, SELECTOR)).toBe("Recipe");
  });
});
