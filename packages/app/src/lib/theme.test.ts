import "@testing-library/jest-dom/vitest";

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { ThemeProvider } from "next-themes";

import {
  Theme,
  resolvedNextThemeToAppTheme,
  appThemeToNextTheme,
  useTheme,
  isDarkMode,
} from "@/lib/theme";

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi
      .fn()
      .mockImplementation((query: string) => ({
        matches: prefersDark && query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
  });
}

// ---------------------------------------------------------------------------
// resolvedNextThemeToAppTheme()
// ---------------------------------------------------------------------------

describe("resolvedNextThemeToAppTheme", () => {
  it('maps "light"/"dark" to Theme.Light/Dark', () => {
    expect(resolvedNextThemeToAppTheme("light")).toBe(Theme.Light);
    expect(resolvedNextThemeToAppTheme("dark")).toBe(Theme.Dark);
  });

  it("maps undefined to Theme.Light (default)", () => {
    expect(resolvedNextThemeToAppTheme(undefined)).toBe(Theme.Light);
  });

  it("throws on an unexpected theme string", () => {
    expect(() => resolvedNextThemeToAppTheme("sepia")).toThrow(
      "Unexpected resolved theme from next-themes: sepia",
    );
  });
});

// ---------------------------------------------------------------------------
// appThemeToNextTheme()
// ---------------------------------------------------------------------------

describe("appThemeToNextTheme", () => {
  it('maps Theme.Light/Dark to "light"/"dark"', () => {
    expect(appThemeToNextTheme(Theme.Light)).toBe("light");
    expect(appThemeToNextTheme(Theme.Dark)).toBe("dark");
  });

  it("throws on an unexpected app theme", () => {
    expect(() => appThemeToNextTheme("invalid" as Theme)).toThrow("Unexpected app theme: invalid");
  });
});

// ---------------------------------------------------------------------------
// useTheme()
// ---------------------------------------------------------------------------

describe("useTheme", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(ThemeProvider, { attribute: "class" }, children);

  beforeEach(() => {
    mockMatchMedia(false);
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("returns Theme.Light when the resolved theme is light", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe(Theme.Light);
  });

  it("returns Theme.Dark when the system preference is dark", async () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe(Theme.Dark);
  });
});

// ---------------------------------------------------------------------------
// isDarkMode()
// ---------------------------------------------------------------------------

describe("isDarkMode", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("returns false when the dark class is not present", () => {
    expect(isDarkMode()).toBe(false);
  });

  it("returns true when the dark class is present", () => {
    document.documentElement.classList.add("dark");
    expect(isDarkMode()).toBe(true);
  });
});
