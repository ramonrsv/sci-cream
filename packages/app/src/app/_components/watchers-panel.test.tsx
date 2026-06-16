import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { WatchersPanel } from "@/app/_components/watchers-panel";
import { STORAGE_KEYS } from "@/lib/local-storage";

import { CompKey, FpdKey, compToPropKey, fpdToPropKey } from "@workspace/sci-cream";

import { makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";

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

  // ---- Balance Wiring -------------------------------------------------------------------------

  describe("Balance Wiring", () => {
    it("hides the Balance button when wiring props are omitted", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<WatchersPanel recipes={recipeCtx.recipes} />);
      expect(screen.queryByTestId("watchers-balance-button")).not.toBeInTheDocument();
    });

    it("forwards wasmBridge and onApplyBalancedMain so the Balance button renders", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(
        <WatchersPanel
          recipes={recipeCtx.recipes}
          wasmBridge={WASM_BRIDGE}
          onApplyBalancedMain={vi.fn()}
        />,
      );
      expect(screen.getByTestId("watchers-balance-button")).toBeInTheDocument();
    });

    it("invokes the parent-supplied onApplyBalancedMain when Balance is clicked", () => {
      localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const onApply = vi.fn();
      render(
        <WatchersPanel
          recipes={recipeCtx.recipes}
          wasmBridge={WASM_BRIDGE}
          onApplyBalancedMain={onApply}
        />,
      );
      fireEvent.click(screen.getByTestId("watchers-balance-button"));
      expect(onApply).toHaveBeenCalledTimes(1);
    });
  });
});
