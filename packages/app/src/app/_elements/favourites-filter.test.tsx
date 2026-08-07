import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, renderHook, act } from "@testing-library/react";

import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { FavouritesFilter, useFavouritesFilterState } from "./favourites-filter";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// useFavouritesFilterState
// ---------------------------------------------------------------------------

describe("useFavouritesFilterState", () => {
  const KEY = "test-search";

  beforeEach(() => localStorage.clear());

  it("defaults to off, so the list starts unfiltered", () => {
    const { result } = renderHook(() => useFavouritesFilterState(undefined));
    expect(result.current[0]).toBe(false);
  });

  it("persists the selection under the `favourites` leaf key", () => {
    const { result, unmount } = renderHook(() => useFavouritesFilterState(KEY));
    act(() => result.current[1](true));
    unmount();

    const { result: reloaded } = renderHook(() => useFavouritesFilterState(KEY));
    expect(reloaded.current[0]).toBe(true);
  });

  it("falls back to off when the stored value is not a boolean", () => {
    localStorage.setItem(`${KEY}:favourites`, JSON.stringify("yes"));
    const { result } = renderHook(() => useFavouritesFilterState(KEY));
    expect(result.current[0]).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FavouritesFilter
// ---------------------------------------------------------------------------

describe("FavouritesFilter", () => {
  /** Render with a controlled tuple, so the setter can be asserted on directly. */
  function renderFilter(favouritesOnly: boolean) {
    const setFavouritesOnly = vi.fn();
    render(<FavouritesFilter favouritesFilterState={[favouritesOnly, setFavouritesOnly]} />);
    return { setFavouritesOnly, button: screen.getByTestId("favourites-filter") };
  }

  it("reports its state, so the toggle is not conveyed by styling alone", () => {
    const { button } = renderFilter(false);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("reports being pressed while filtering", () => {
    const { button } = renderFilter(true);
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles on the next click, whichever way it is currently set", () => {
    const { setFavouritesOnly, button } = renderFilter(false);
    fireEvent.click(button);

    // The setter takes an updater, so apply it to see what the click would have stored.
    const updater = setFavouritesOnly.mock.calls[0][0] as (prev: boolean) => boolean;
    expect(updater(false)).toBe(true);
    expect(updater(true)).toBe(false);
  });

  it("says whether it is filtering now, not just what clicking would do", () => {
    expect(renderFilter(false).button).toHaveAttribute("title", "Show favourites only");
    cleanup();
    expect(renderFilter(true).button).toHaveAttribute("title", "Showing favourites only");
  });

  it("keeps one accessible name across both states, so it reads as one control", () => {
    expect(renderFilter(false).button).toHaveAttribute("aria-label", "Show favourites only");
    cleanup();
    expect(renderFilter(true).button).toHaveAttribute("aria-label", "Show favourites only");
  });

  it("marks the on state with a border and the off state by dimming, not by color", () => {
    expect(renderFilter(true).button.className).toContain("border-brd");
    cleanup();
    expect(renderFilter(false).button.className).toContain("opacity-60");
  });

  it("fills the star only while filtering", () => {
    expect(renderFilter(true).button.querySelector("svg")).toHaveAttribute("fill", "currentColor");
    cleanup();
    expect(renderFilter(false).button.querySelector("svg")).toHaveAttribute("fill", "none");
  });

  it("sizes the star for a detail-panel toolbar by default", () => {
    const { button } = renderFilter(false);
    expect(button.querySelector("svg")).toHaveAttribute(
      "width",
      String(DETAIL_PANEL_ACTION_ICON_SIZE),
    );
  });

  it("takes a caller's icon size, for toolbars built to a different scale", () => {
    render(<FavouritesFilter favouritesFilterState={[false, vi.fn()]} iconSize={20} />);
    expect(screen.getByTestId("favourites-filter").querySelector("svg")).toHaveAttribute(
      "width",
      "20",
    );
  });
});
