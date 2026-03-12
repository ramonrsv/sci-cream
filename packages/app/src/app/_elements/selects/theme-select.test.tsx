import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";

import { Theme, ThemeSelect, isDarkMode, getInitialTheme } from "./theme-select";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

// headlessui v2 uses ResizeObserver internally; mock it for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

// ---------------------------------------------------------------------------
// getInitialTheme()
// ---------------------------------------------------------------------------

describe("getInitialTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    // Default (no localStorage entry) resolves via System -> needs matchMedia
    mockMatchMedia(false);
  });

  it("defaults to Theme.Light when no localStorage entry and system prefers light", () => {
    expect(getInitialTheme()).toBe(Theme.Light);
  });

  it("defaults to Theme.Dark when no localStorage entry and system prefers dark", () => {
    mockMatchMedia(true);
    expect(getInitialTheme()).toBe(Theme.Dark);
  });

  it("returns Theme.Light when localStorage theme is Light", () => {
    localStorage.setItem("theme", "Light");
    expect(getInitialTheme()).toBe(Theme.Light);
  });

  it("returns Theme.Dark when localStorage theme is Dark", () => {
    localStorage.setItem("theme", "Dark");
    expect(getInitialTheme()).toBe(Theme.Dark);
  });

  it("returns Theme.Light when localStorage is System and system prefers light", () => {
    localStorage.setItem("theme", "System");
    mockMatchMedia(false);
    expect(getInitialTheme()).toBe(Theme.Light);
  });

  it("returns Theme.Dark when localStorage is System and system prefers dark", () => {
    localStorage.setItem("theme", "System");
    mockMatchMedia(true);
    expect(getInitialTheme()).toBe(Theme.Dark);
  });
});

// ---------------------------------------------------------------------------
// ThemeSelect component
// ---------------------------------------------------------------------------

describe("ThemeSelect", () => {
  let currentTheme: Theme;

  function TestWrapper({ initialTheme = Theme.Light }: { initialTheme?: Theme }) {
    const [theme, setTheme] = useState<Theme>(initialTheme);
    useEffect(() => {
      currentTheme = theme;
    }, [theme]);
    return <ThemeSelect themeState={[theme, setTheme]} />;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockMatchMedia(false);
  });

  afterEach(async () => {
    cleanup();
    document.documentElement.classList.remove("dark");
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("renders a button after mounting", () => {
    render(<TestWrapper />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("applies the initial theme to the document on mount", () => {
    render(<TestWrapper initialTheme={Theme.Dark} />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(currentTheme).toBe(Theme.Dark);
  });

  it("shows all three theme options after clicking the button", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
    });
  });

  it("selecting Dark adds the dark class to documentElement and saves to localStorage", async () => {
    const user = userEvent.setup();
    render(<TestWrapper initialTheme={Theme.Light} />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("Dark")).toBeInTheDocument());
    await user.click(screen.getByText("Dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("Dark");
    expect(currentTheme).toBe(Theme.Dark);
  });

  it("selecting Light removes the dark class and saves to localStorage", async () => {
    document.documentElement.classList.add("dark");
    const user = userEvent.setup();
    render(<TestWrapper initialTheme={Theme.Dark} />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("Light")).toBeInTheDocument());
    await user.click(screen.getByText("Light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("Light");
    expect(currentTheme).toBe(Theme.Light);
  });

  it("selecting System with a dark media preference applies the dark theme", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    render(<TestWrapper initialTheme={Theme.Light} />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("System")).toBeInTheDocument());
    await user.click(screen.getByText("System"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("System");
    expect(currentTheme).toBe(Theme.Dark);
  });

  it("selecting System with a light media preference removes the dark theme", async () => {
    document.documentElement.classList.add("dark");
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<TestWrapper initialTheme={Theme.Dark} />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("System")).toBeInTheDocument());
    await user.click(screen.getByText("System"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("System");
    expect(currentTheme).toBe(Theme.Light);
  });
});
