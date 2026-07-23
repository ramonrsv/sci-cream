import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useIsDesktop } from "./use-is-desktop";

/** A controllable `MediaQueryList` mock that tracks `change` listeners and can emit to them. */
function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: "",
    onchange: null,
    addEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return {
    listeners,
    emit(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe("useIsDesktop", () => {
  afterEach(() => {
    // jsdom has no matchMedia; drop the stub so each test starts from the real default.
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("is true when the viewport matches the desktop query", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it("is false when the viewport does not match the desktop query", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it("updates when the media query emits a change", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);

    act(() => media.emit(true));
    expect(result.current).toBe(true);

    act(() => media.emit(false));
    expect(result.current).toBe(false);
  });

  it("stays false when matchMedia is unavailable", () => {
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it("removes its change listener on unmount", () => {
    const media = mockMatchMedia(true);
    const { unmount } = renderHook(() => useIsDesktop());
    expect(media.listeners.size).toBe(1);

    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
