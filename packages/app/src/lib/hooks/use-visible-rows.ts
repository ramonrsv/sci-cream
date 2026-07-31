"use client";

import { type RefObject } from "react";

import { useElementSize } from "@/lib/hooks/use-element-size";
import { TABLE_BODY_ROW_H_PX } from "@/lib/styles/sizes";

/** Inputs to {@link visibleRowCount}; heights are in px, `paneHeight` is `null` until measured. */
export interface VisibleRowCountArgs {
  paneHeight: number | null;
  headHeight: number;
  rowHeight: number;
  /** Upper bound on rows, i.e. how many the data model actually holds */
  totalRows: number;
  /** Rows that must be rendered whatever the pane height, so no filled row is unreachable */
  minRows: number;
}

/**
 * Number of body rows a fixed-slot table should render to fill its scroll pane.
 *
 * Rows that fit are preferred, so a table always reaches the bottom of its pane; `minRows` wins
 * when the content needs more room than that, which is the only case that leaves the pane
 * scrollable. Before the pane is measured (`paneHeight === null` on the server and in jsdom, where
 * {@link useElementSize} has no `ResizeObserver`) the full `totalRows` is rendered.
 */
export function visibleRowCount({
  paneHeight,
  headHeight,
  rowHeight,
  totalRows,
  minRows,
}: VisibleRowCountArgs): number {
  if (paneHeight === null) return totalRows;

  const fitRows = Math.floor((paneHeight - headHeight) / rowHeight);
  return Math.min(Math.max(fitRows, minRows, 1), totalRows);
}

/**
 * Size a fixed-slot table's body to its scroll pane, re-deriving the row count as the pane resizes.
 *
 * Attach the returned `paneRef` to the scrolling container; its content-box height excludes
 * scrollbars, so a horizontal one shrinks the row count on its own. `minRows` is the content
 * floor: typically `lastFilledRowIndex` plus one, plus a blank row for tables edited in place.
 *
 * `headHeight` is the caller's own sticky `<thead>`: {@link TABLE_COL_HEADER_H_PX} alone, or plus
 * {@link TABLE_BODY_ROW_H_PX} for a table that pins a totals row under its column headers.
 */
export function useVisibleRows({
  totalRows,
  minRows,
  headHeight,
  rowHeight = TABLE_BODY_ROW_H_PX,
}: {
  totalRows: number;
  minRows: number;
  headHeight: number;
  /** Defaults to {@link TABLE_BODY_ROW_H_PX}, the `h-6.25` every table's body rows use today */
  rowHeight?: number;
}): { paneRef: RefObject<HTMLDivElement | null>; visibleRows: number } {
  const { ref: paneRef, size } = useElementSize<HTMLDivElement>();

  return {
    paneRef,
    visibleRows: visibleRowCount({
      paneHeight: size?.height ?? null,
      headHeight,
      rowHeight,
      totalRows,
      minRows,
    }),
  };
}
