import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

import { CompositionBreakdownPanel } from "@/app/_components/composition-breakdown-panel";

import { QtyToggle, QTY_TOGGLE_SHORT_LABELS } from "@/app/_elements/selects/qty-toggle-select";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { makeMockRecipeContext, setQtyToggle, setKeyFilterSelect } from "@/__tests__/unit/util";
import { getSelectedOptionLabel } from "@/__tests__/unit/select";

describe("CompositionBreakdownPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Select persistence -----------------------------------------------------------------

  describe("Select persistence", () => {
    const QTY_KEY = `${STORAGE_KEYS.compositionBreakdownPanelView}:qty`;
    const FILTER_KEY = `${STORAGE_KEYS.compositionBreakdownPanelView}:filter`;

    it("writes the QtyToggle leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      await setQtyToggle(container, QtyToggle.Percentage);
      await act(async () => {});

      expect(localStorage.getItem(QTY_KEY)).toBe(JSON.stringify(QtyToggle.Percentage));
    });

    it("restores the QtyToggle value on remount", async () => {
      localStorage.setItem(QTY_KEY, JSON.stringify(QtyToggle.Percentage));
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      expect(localStorage.getItem(QTY_KEY)).toBe(JSON.stringify(QtyToggle.Percentage));
      expect(getSelectedOptionLabel(container, "#qty-toggle-select")).toBe(
        QTY_TOGGLE_SHORT_LABELS[QtyToggle.Percentage],
      );
    });

    it("writes the KeyFilter leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      await setKeyFilterSelect(container, KeyFilter.Active);
      await act(async () => {});

      expect(localStorage.getItem(FILTER_KEY)).toBe(JSON.stringify(KeyFilter.Active));
    });

    it("restores the KeyFilter value on remount", async () => {
      localStorage.setItem(FILTER_KEY, JSON.stringify(KeyFilter.Active));
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Active);
    });
  });

  // ---- Panel Chrome -----------------------------------------------------------------------

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#composition-breakdown-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });

    it("should render the underlying view", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#composition-breakdown-recipe-table")).toBeInTheDocument();
      expect(container.querySelector("#composition-breakdown-table")).toBeInTheDocument();
    });
  });
});
