import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useCanHover } from "./use-can-hover";

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

describe("useCanHover", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("is true when the primary pointer can hover", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useCanHover());
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith("(hover: hover)");
  });

  it("is false when the primary pointer cannot hover", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useCanHover());
    expect(result.current).toBe(false);
  });

  it("defaults to false (assume touch) when matchMedia is unavailable", () => {
    const { result } = renderHook(() => useCanHover());
    expect(result.current).toBe(false);
  });
});
