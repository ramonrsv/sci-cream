import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { WatchersPanel } from "@/app/_components/watchers-panel";

import { CompKey, FpdKey, compToPropKey, fpdToPropKey } from "@workspace/sci-cream";

import { makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const MSNF = compToPropKey(CompKey.MSNF);
const SERVING_TEMP = fpdToPropKey(FpdKey.ServingTemp);

describe("WatchersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Panel Chrome ---------------------------------------------------------------------------

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<WatchersPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#watchers-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<WatchersPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<WatchersPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });

    it("should render the underlying watchers view", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<WatchersPanel recipes={recipeCtx.recipes} />);
      // At least the MSNF card from the default selection should be visible
      expect(screen.getByTestId(`watcher-card-${String(MSNF)}`)).toBeInTheDocument();
      expect(screen.getByTestId(`watcher-card-${String(SERVING_TEMP)}`)).toBeInTheDocument();
    });
  });

  // ---- Slot Filtering -------------------------------------------------------------------------

  describe("Slot Filtering", () => {
    it("should show no ref rows when all references are empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<WatchersPanel recipes={recipeCtx.recipes} />);
      expect(
        screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref B`),
      ).not.toBeInTheDocument();
    });

    it("should show only non-empty reference rows", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      render(<WatchersPanel recipes={recipeCtx.recipes} />);
      expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref B`)).toBeInTheDocument();
      expect(
        screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`),
      ).not.toBeInTheDocument();
    });

    it("should show both reference rows when both are populated", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA, RecipeID.RefB]);
      render(<WatchersPanel recipes={recipeCtx.recipes} />);
      expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).toBeInTheDocument();
      expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref B`)).toBeInTheDocument();
    });
  });
});
