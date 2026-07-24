import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useIsNarrow } from "./use-is-narrow";

/** Stub `matchMedia` so every query resolves to `matches`. */
function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi
      .fn()
      .mockReturnValue({
        matches,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
  });
}

describe("useIsNarrow", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("is the complement of the `sm` min-width query", () => {
    stubMatchMedia(true); // viewport is at least `sm`
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(false);
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 640px)");
  });

  it("is true when the viewport is below `sm`", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(true);
  });

  it("defaults to true (narrow) when matchMedia is unavailable", () => {
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(true);
  });
});
