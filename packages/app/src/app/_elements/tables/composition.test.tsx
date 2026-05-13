import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { CompositionTable, CompositionView } from "@/app/_elements/tables/composition";
import { getCompKeys } from "@/app/_elements/tables/composition-breakdown";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { formatCompositionValue } from "@/lib/comp-value-format";

import { CompKey, Composition, comp_key_as_med_str } from "@workspace/sci-cream";

import { WASM_BRIDGE } from "@/__tests__/util";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

/** Returns the composition of a known embedded ingredient (Whole Milk via alias) */
function getWholeMilkComposition(): Composition {
  return WASM_BRIDGE.get_ingredient_by_name("Whole Milk").composition;
}

const SAMPLE_COMP_KEYS: CompKey[] = [
  CompKey.MilkFat,
  CompKey.TotalFats,
  CompKey.MSNF,
  CompKey.TotalSolids,
  CompKey.Water,
  CompKey.TotalSugars,
];

// ---------------------------------------------------------------------------
// CompositionTable (bare)
// ---------------------------------------------------------------------------

describe("CompositionTable", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Structure", () => {
    it("should render a <table> element", () => {
      const { container } = render(
        <CompositionTable composition={new Composition()} compKeys={SAMPLE_COMP_KEYS} />,
      );
      expect(container.querySelector("table")).toBeInTheDocument();
    });

    it('should show "Property" as the first column header', () => {
      render(<CompositionTable composition={new Composition()} compKeys={SAMPLE_COMP_KEYS} />);
      expect(screen.getByText("Property")).toBeInTheDocument();
    });

    it("should show a single value column header", () => {
      const { container } = render(
        <CompositionTable composition={new Composition()} compKeys={SAMPLE_COMP_KEYS} />,
      );
      expect(container.querySelectorAll("thead th")).toHaveLength(2);
    });
  });

  describe("Rows", () => {
    it("should render exactly one row per provided compKey", () => {
      const { container } = render(
        <CompositionTable composition={new Composition()} compKeys={SAMPLE_COMP_KEYS} />,
      );
      expect(container.querySelectorAll("tbody tr")).toHaveLength(SAMPLE_COMP_KEYS.length);
    });

    it("should display the comp_key_as_med_str label for each compKey", () => {
      render(<CompositionTable composition={new Composition()} compKeys={SAMPLE_COMP_KEYS} />);
      for (const compKey of SAMPLE_COMP_KEYS) {
        expect(screen.getByText(comp_key_as_med_str(compKey))).toBeInTheDocument();
      }
    });
  });

  describe("Cell Values", () => {
    it("should display non-empty formatted values for a non-empty composition", () => {
      const composition = getWholeMilkComposition();
      const { container } = render(
        <CompositionTable composition={composition} compKeys={SAMPLE_COMP_KEYS} />,
      );
      const valueCells = container.querySelectorAll("td.comp-val");
      const nonEmpty = Array.from(valueCells).filter(
        (cell) => cell.textContent!.trim() !== "" && cell.textContent!.trim() !== "-",
      );
      expect(nonEmpty.length).toBeGreaterThan(0);
    });

    it("should format each value with formatCompositionValue (g/100g)", () => {
      const composition = getWholeMilkComposition();
      render(<CompositionTable composition={composition} compKeys={SAMPLE_COMP_KEYS} />);

      const totalFats = CompKey.TotalFats;
      const expected = formatCompositionValue(composition.get(totalFats)).trim();
      const row = screen.getByText(comp_key_as_med_str(totalFats)).closest("tr")!;
      const cell = row.querySelector("td.comp-val");
      expect(cell?.textContent?.trim()).toBe(expected);
    });

    it("should render zero composition values as empty cells", () => {
      const composition = new Composition();
      render(<CompositionTable composition={composition} compKeys={SAMPLE_COMP_KEYS} />);

      // Default-constructed Composition has Water = 100 and all other quantity values = 0; expect
      // the zero ones to render as empty strings, and the non-zero ones to be formatted.
      SAMPLE_COMP_KEYS.forEach((compKey) => {
        const v = composition.get(compKey);
        const row = screen.getByText(comp_key_as_med_str(compKey)).closest("tr")!;
        const cell = row.querySelector("td.comp-val");
        expect(cell?.textContent?.trim()).toBe(v === 0 ? "" : formatCompositionValue(v).trim());
      });
    });
  });
});

// ---------------------------------------------------------------------------
// CompositionView (toolbar + bare)
// ---------------------------------------------------------------------------

describe("CompositionView", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Toolbar Rendering", () => {
    it("should render KeyFilterSelect", () => {
      const { container } = render(<CompositionView composition={new Composition()} />);
      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });

    it("should NOT render QtyToggleSelect (single ingredient has no recipe context)", () => {
      const { container } = render(<CompositionView composition={new Composition()} />);
      expect(container.querySelector("#qty-toggle-select")).not.toBeInTheDocument();
    });

    it("should render the underlying table", () => {
      const { container } = render(<CompositionView composition={new Composition()} />);
      expect(container.querySelector("table")).toBeInTheDocument();
    });

    it("should render the toolbarPrefix inside the toolbar row", () => {
      const { container } = render(
        <CompositionView
          composition={new Composition()}
          toolbarPrefix={<span data-testid="prefix" />}
        />,
      );
      expect(container.querySelector('[data-testid="prefix"]')).toBeInTheDocument();
    });
  });

  describe("Rows", () => {
    it("should display comp key labels using comp_key_as_med_str", () => {
      render(<CompositionView composition={new Composition()} />);
      const waterLabel = comp_key_as_med_str(CompKey.Water);
      expect(screen.getByText(waterLabel)).toBeInTheDocument();
    });
  });

  describe("KeyFilter Integration", () => {
    it("should default to KeyFilter.NonZero", () => {
      const { container } = render(<CompositionView composition={new Composition()} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      expect(select.value).toBe(KeyFilter.NonZero);
    });

    it("should show all comp keys when filter is set to All", () => {
      const { container } = render(<CompositionView composition={new Composition()} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: KeyFilter.All } });
      expect(container.querySelectorAll("tbody tr")).toHaveLength(getCompKeys().length);
    });

    it("should show fewer rows than All when some keys are zero", () => {
      const composition = getWholeMilkComposition();
      const { container } = render(<CompositionView composition={composition} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;

      fireEvent.change(select, { target: { value: KeyFilter.All } });
      const allRowCount = container.querySelectorAll("tbody tr").length;

      fireEvent.change(select, { target: { value: KeyFilter.NonZero } });
      const nonZeroRowCount = container.querySelectorAll("tbody tr").length;

      expect(nonZeroRowCount).toBeGreaterThan(0);
      expect(nonZeroRowCount).toBeLessThan(allRowCount);
    });
  });
});
