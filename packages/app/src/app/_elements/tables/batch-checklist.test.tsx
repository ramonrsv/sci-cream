import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import type { Batch } from "@/lib/batch";
import { BatchChecklist } from "@/app/_elements/tables/batch-checklist";
import { CATEGORY_COLORS, CategoryColor } from "@/lib/styles/colors";

afterEach(cleanup);

/** Two recipes sharing "Sucrose", so a merged row and a recipe-specific cell both appear. */
const BATCH: Batch = {
  date: "2026-07-18",
  recipes: [
    { name: "Strawberry Sorbet", rows: [["Sucrose", 100]] },
    { name: "Vanilla Base", rows: [["Whole Milk", 500.0]] },
  ],
};

/** Render with nothing checked off, since these tests only read the unmodified layout. */
function renderChecklist(batch: Batch) {
  render(<BatchChecklist batch={batch} checked={new Set()} onToggle={() => undefined} />);
}

/** The visible text of every column header, in order. */
function columnHeaders(): string[] {
  return screen.getAllByRole("columnheader").map((th) => th.textContent ?? "");
}

describe("BatchChecklist container colors", () => {
  /** The badge and cell chips belonging to the `index`-th recipe. */
  function chipsForRecipe(index: number): HTMLElement[] {
    return [
      screen.getByTestId(`recipe-badge-${String(index)}`),
      screen.getByTestId(`checklist-cell-${String(index)}-Sucrose`),
    ];
  }

  it("paints an unpicked recipe with the hue its position earns", () => {
    renderChecklist({
      ...BATCH,
      recipes: [{ name: "Strawberry Sorbet", rows: [["Sucrose", 100]] }, BATCH.recipes[1]!],
    });

    for (const chip of chipsForRecipe(0)) {
      expect(chip).toHaveStyle({ "--cat": `var(${CATEGORY_COLORS[0]!})` });
      expect(chip).not.toHaveClass("cat-solid");
    }
  });

  it("paints a picked color instead, on the badge and its cells alike", () => {
    renderChecklist({
      ...BATCH,
      recipes: [{ ...BATCH.recipes[0]!, color: CategoryColor.Purple }, BATCH.recipes[1]!],
    });

    for (const chip of chipsForRecipe(0)) {
      expect(chip).toHaveStyle({ "--cat": `var(${CategoryColor.Purple})` });
    }
  });

  // A tint of white or black is indistinguishable from the surface, so these fill solid and carry
  // their own ink — the one case where the chip cannot inherit the page's text color.
  // The ink token is spelled out rather than rebuilt from the color the way the component does:
  // an expectation that follows the code would hold even for a token that does not exist.
  it.each([
    ["White", "var(--color-cat-white-ink)"],
    ["Black", "var(--color-cat-black-ink)"],
  ] as const)("fills %s solid, with its own ink", (name, ink) => {
    const color = CategoryColor[name];
    renderChecklist({ ...BATCH, recipes: [{ ...BATCH.recipes[0]!, color }, BATCH.recipes[1]!] });

    for (const chip of chipsForRecipe(0)) {
      expect(chip).toHaveClass("cat-solid");
      expect(chip.style.getPropertyValue("--cat-ink")).toBe(ink);
    }
  });

  it("leaves the hues without ink, so they keep inheriting the page's text color", () => {
    renderChecklist(BATCH);

    for (const chip of chipsForRecipe(0)) {
      expect(chip.style.getPropertyValue("--cat-ink")).toBe("");
    }
  });
});

describe("BatchChecklist units", () => {
  it("names the unit once in the header, so the cells can stay bare numbers", () => {
    renderChecklist(BATCH);

    // The badges carry recipe identity, leaving the total column as the only place for the unit.
    expect(columnHeaders()).toEqual(["Ingredient", "Total (g)", "A", "B"]);
    expect(screen.getByTestId("checklist-total-Sucrose")).toHaveTextContent(/^100$/);
    expect(screen.getByTestId("checklist-cell-0-Sucrose")).toHaveTextContent(/^100$/);
  });

  it("puts the unit in the recipe column when a lone recipe leaves no total column", () => {
    renderChecklist({ ...BATCH, recipes: [BATCH.recipes[0]!] });

    expect(columnHeaders()).toEqual(["Ingredient", "g"]);
    expect(screen.queryByTestId("checklist-total-Sucrose")).not.toBeInTheDocument();
  });

  it("names each cell with its unit, the only unit a screen reader reaches", () => {
    renderChecklist(BATCH);

    // A checkbox is named by itself, never by its column header, so the grams must be in the name.
    expect(screen.getByRole("checkbox", { name: "Sucrose, recipe A: 100 g" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Whole Milk, recipe B: 500 g" }),
    ).toBeInTheDocument();
  });
});
