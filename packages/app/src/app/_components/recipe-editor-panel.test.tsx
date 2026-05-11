import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import {
  makeEmptyRecipeContext,
  makeRecipeResources,
  type RecipeContext,
  type RecipeResources,
  RecipeContextState,
  RecipeResourcesState,
} from "@/lib/recipe";
import { RecipeEditorPanel } from "./recipe-editor-panel";

import {
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("RecipeEditorPanel", () => {
  let recipeContext: RecipeContext;
  let recipeResources: RecipeResources;

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();

    recipeContext = makeEmptyRecipeContext();
    recipeResources = makeRecipeResources(
      new WasmBridge(new_ingredient_database_seeded_from_embedded_data()),
    );
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  const makePanelProps = () => ({
    recipeCtxState: [recipeContext, vi.fn()] as RecipeContextState,
    recipeResourcesState: [recipeResources, vi.fn()] as RecipeResourcesState,
  });

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const { container } = render(<RecipeEditorPanel props={makePanelProps()} />);
      expect(container.querySelector("#recipe-editor-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const { container } = render(<RecipeEditorPanel props={makePanelProps()} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const { container } = render(<RecipeEditorPanel props={makePanelProps()} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });
  });
});
