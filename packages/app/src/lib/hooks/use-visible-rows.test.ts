import { describe, expect, it } from "vitest";

import { visibleRowCount } from "@/lib/hooks/use-visible-rows";
import { RECIPE_TOTAL_ROWS, TABLE_BODY_ROW_H_PX, TABLE_COL_HEADER_H_PX } from "@/lib/styles/sizes";

/** Head height of a recipe-style table: column headers plus the pinned totals row. */
const HEAD_H_PX = TABLE_COL_HEADER_H_PX + TABLE_BODY_ROW_H_PX;

/** Pane height (px) that exactly fits `rows` body rows beneath the sticky head. */
function paneFitting(rows: number): number {
  return HEAD_H_PX + rows * TABLE_BODY_ROW_H_PX;
}

/** `visibleRowCount` with the production table metrics, so only pane height and `minRows` vary. */
function countFor(paneHeight: number | null, minRows: number): number {
  return visibleRowCount({
    paneHeight,
    headHeight: HEAD_H_PX,
    rowHeight: TABLE_BODY_ROW_H_PX,
    totalRows: RECIPE_TOTAL_ROWS,
    minRows,
  });
}

describe("visibleRowCount", () => {
  it("should render every slot before the pane has been measured", () => {
    expect(countFor(null, 1)).toBe(RECIPE_TOTAL_ROWS);
    expect(countFor(null, 12)).toBe(RECIPE_TOTAL_ROWS);
  });

  it("should fill the pane when more rows fit than the content needs", () => {
    expect(countFor(paneFitting(12), 3)).toBe(12);
  });

  it("should render exactly the rows that fit at an exact-fit height", () => {
    expect(countFor(paneFitting(7), 1)).toBe(7);
  });

  it("should not count a partially visible row", () => {
    expect(countFor(paneFitting(7) + TABLE_BODY_ROW_H_PX - 1, 1)).toBe(7);
  });

  it("should cap at the total slots however tall the pane is", () => {
    expect(countFor(paneFitting(RECIPE_TOTAL_ROWS + 5), 1)).toBe(RECIPE_TOTAL_ROWS);
  });

  it("should keep the content floor when fewer rows fit, leaving the pane scrollable", () => {
    // 4 rows fit, but 12 must stay reachable — the caller's pane scrolls.
    expect(countFor(paneFitting(4), 12)).toBe(12);
  });

  it("should cap the content floor at the total slots", () => {
    expect(countFor(paneFitting(4), RECIPE_TOTAL_ROWS + 3)).toBe(RECIPE_TOTAL_ROWS);
  });

  it("should render one row when the pane is shorter than its own header", () => {
    expect(countFor(HEAD_H_PX - 10, 1)).toBe(1);
    expect(countFor(0, 1)).toBe(1);
  });

  it("should fit more rows in the same pane for a table whose head has no totals row", () => {
    // A properties-style head is one column-header row, so it frees a body row's worth of space.
    const pane = paneFitting(8);
    expect(countFor(pane, 1)).toBe(8);
    expect(
      visibleRowCount({
        paneHeight: pane,
        headHeight: TABLE_COL_HEADER_H_PX,
        rowHeight: TABLE_BODY_ROW_H_PX,
        totalRows: RECIPE_TOTAL_ROWS,
        minRows: 1,
      }),
    ).toBe(9);
  });
});
