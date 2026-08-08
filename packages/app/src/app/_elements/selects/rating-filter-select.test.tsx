import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";

import {
  getSelectControl,
  getSelectControlByLabel,
  getSelectedOptionLabel,
} from "@/__tests__/unit/select";
import { monoRatingGlyph, Rating, RATING_GLYPHS, RATINGS } from "@/lib/rating";
import {
  RatingFilter,
  RatingFilterSelect,
  RATING_FILTER_SHORT_LABELS,
  ratingMatchesFilter,
  useRatingFilterState,
} from "./rating-filter-select";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// RATING_FILTER_SHORT_LABELS
// ---------------------------------------------------------------------------

describe("RATING_FILTER_SHORT_LABELS", () => {
  // Composed rather than written out: the monochrome selector is invisible in a string literal.
  it.each([
    [RatingFilter.Any, "Any"],
    [RatingFilter.Rated, "Rated"],
    [RatingFilter.GoodOrBetter, `${monoRatingGlyph(Rating.Good)} Good+`],
    [RatingFilter.Great, `${monoRatingGlyph(Rating.Great)} Great`],
    [RatingFilter.Bad, `${monoRatingGlyph(Rating.Bad)} Bad`],
  ])("maps %s to its short label", (filter, label) => {
    expect(RATING_FILTER_SHORT_LABELS[filter]).toBe(label);
  });

  it("asks for the monochrome glyph on every label that carries one", () => {
    for (const rating of RATINGS) {
      const label = Object.values(RATING_FILTER_SHORT_LABELS).find((l) =>
        l.startsWith(RATING_GLYPHS[rating]),
      );
      expect(label).toContain(monoRatingGlyph(rating));
    }
  });
});

// ---------------------------------------------------------------------------
// ratingMatchesFilter
// ---------------------------------------------------------------------------

describe("ratingMatchesFilter", () => {
  const RATINGS = [undefined, Rating.Bad, Rating.Good, Rating.Great];

  it("admits everything under Any, including unrated", () => {
    expect(RATINGS.map((r) => ratingMatchesFilter(r, RatingFilter.Any))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it("admits any rating under Rated, but not the unrated", () => {
    expect(RATINGS.map((r) => ratingMatchesFilter(r, RatingFilter.Rated))).toEqual([
      false,
      true,
      true,
      true,
    ]);
  });

  // Bad is a rating too, so admitting whatever is merely rated would wrongly include it here.
  it("admits Good and above under GoodOrBetter", () => {
    expect(RATINGS.map((r) => ratingMatchesFilter(r, RatingFilter.GoodOrBetter))).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it("admits Great alone under Great", () => {
    expect(RATINGS.map((r) => ratingMatchesFilter(r, RatingFilter.Great))).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("admits Bad alone under Bad", () => {
    expect(RATINGS.map((r) => ratingMatchesFilter(r, RatingFilter.Bad))).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });
});

// ---------------------------------------------------------------------------
// useRatingFilterState hook
// ---------------------------------------------------------------------------

describe("useRatingFilterState", () => {
  const KEY = "test-search";

  beforeEach(() => localStorage.clear());

  it("defaults to Any, so the list starts unfiltered", () => {
    const { result } = renderHook(() => useRatingFilterState(undefined));
    expect(result.current[0]).toBe(RatingFilter.Any);
  });

  it("persists the selection under the `rating` leaf key", () => {
    const { result, unmount } = renderHook(() => useRatingFilterState(KEY));
    act(() => result.current[1](RatingFilter.Great));
    unmount();

    const { result: reloaded } = renderHook(() => useRatingFilterState(KEY));
    expect(reloaded.current[0]).toBe(RatingFilter.Great);
  });

  it("falls back to Any when the stored value is no longer a filter", () => {
    localStorage.setItem(`${KEY}:rating`, JSON.stringify("Excellent"));
    const { result } = renderHook(() => useRatingFilterState(KEY));
    expect(result.current[0]).toBe(RatingFilter.Any);
  });
});

// ---------------------------------------------------------------------------
// RatingFilterSelect
// ---------------------------------------------------------------------------

describe("RatingFilterSelect", () => {
  it("renders a select inside its wrapper id", () => {
    const { container } = render(
      <RatingFilterSelect ratingFilterState={[RatingFilter.Any, vi.fn()]} />,
    );
    expect(getSelectControl(container, "#rating-filter-select")).toBeInTheDocument();
  });

  it("names the control and echoes the current filter in its tooltip", () => {
    const { container } = render(
      <RatingFilterSelect ratingFilterState={[RatingFilter.Great, vi.fn()]} />,
    );
    expect(getSelectControlByLabel("Filter by rating")).toBe(
      getSelectControl(container, "#rating-filter-select"),
    );
    expect(container.querySelector("#rating-filter-select [title]")).toHaveAttribute(
      "title",
      `Filter by rating (${RATING_FILTER_SHORT_LABELS[RatingFilter.Great]})`,
    );
  });

  it("shows the current filter's short label", () => {
    const { container } = render(
      <RatingFilterSelect ratingFilterState={[RatingFilter.GoodOrBetter, vi.fn()]} />,
    );
    expect(getSelectedOptionLabel(container, "#rating-filter-select")).toBe(
      RATING_FILTER_SHORT_LABELS[RatingFilter.GoodOrBetter],
    );
  });
});
