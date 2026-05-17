import { describe, it, expect, beforeEach, vi } from "vitest";
import type { LayoutItem, ResponsiveLayouts } from "react-grid-layout";

import { STORAGE_KEYS } from "@/lib/local-storage";
import {
  LAYOUT_VERSION,
  clearStoredLayouts,
  dispatchLayoutReset,
  layoutFingerprint,
  loadStoredLayouts,
  onLayoutReset,
  saveLayouts,
} from "@/lib/calculator-layout";

/** Build a `LayoutItem` with sensible defaults; only `i` is required */
function item(i: string, overrides: Partial<LayoutItem> = {}): LayoutItem {
  return { i, x: 0, y: 0, w: 4, h: 4, ...overrides } as LayoutItem;
}

/** Build a `ResponsiveLayouts` with three breakpoints and a fixed panel set */
function makeDefaults(): ResponsiveLayouts {
  return {
    lg: [item("recipe"), item("watchers", { x: 4 }), item("composition", { x: 8 })],
    md: [item("recipe"), item("watchers", { x: 4 }), item("composition", { x: 8 })],
    sm: [item("recipe"), item("watchers", { y: 4 }), item("composition", { y: 8 })],
  };
}

// ---------------------------------------------------------------------------
// layoutFingerprint
// ---------------------------------------------------------------------------

describe("layoutFingerprint", () => {
  it("is stable across calls for the same layouts", () => {
    const a = makeDefaults();
    const b = makeDefaults();
    expect(layoutFingerprint(a)).toBe(layoutFingerprint(b));
  });

  it("is invariant to panel order within a breakpoint", () => {
    const a = makeDefaults();
    const b: ResponsiveLayouts = { lg: [a.lg![2]!, a.lg![0]!, a.lg![1]!], md: a.md, sm: a.sm };
    expect(layoutFingerprint(a)).toBe(layoutFingerprint(b));
  });

  it("is invariant to breakpoint key order", () => {
    const a = makeDefaults();
    const b: ResponsiveLayouts = { sm: a.sm, lg: a.lg, md: a.md };
    expect(layoutFingerprint(a)).toBe(layoutFingerprint(b));
  });

  it("is invariant to x/y/w/h changes when panel keys are unchanged", () => {
    const a = makeDefaults();
    const b = makeDefaults();
    b.lg = b.lg!.map((it) => ({ ...it, x: it.x + 100, w: it.w + 5 }) as LayoutItem);
    expect(layoutFingerprint(a)).toBe(layoutFingerprint(b));
  });

  it("changes when a panel is added", () => {
    const a = makeDefaults();
    const b = makeDefaults();
    b.lg = [...b.lg!, item("new-panel", { x: 12 })];
    expect(layoutFingerprint(a)).not.toBe(layoutFingerprint(b));
  });

  it("changes when a panel is removed", () => {
    const a = makeDefaults();
    const b = makeDefaults();
    b.lg = b.lg!.slice(0, -1);
    expect(layoutFingerprint(a)).not.toBe(layoutFingerprint(b));
  });

  it("changes when a panel is renamed", () => {
    const a = makeDefaults();
    const b = makeDefaults();
    b.lg = b.lg!.map((it) => (it.i === "recipe" ? ({ ...it, i: "renamed" } as LayoutItem) : it));
    expect(layoutFingerprint(a)).not.toBe(layoutFingerprint(b));
  });

  it("changes when a breakpoint is added", () => {
    const a = makeDefaults();
    const b: ResponsiveLayouts = { ...a, xl: a.lg };
    expect(layoutFingerprint(a)).not.toBe(layoutFingerprint(b));
  });

  it("changes when a breakpoint is removed", () => {
    const a = makeDefaults();
    const b: ResponsiveLayouts = { lg: a.lg, md: a.md };
    expect(layoutFingerprint(a)).not.toBe(layoutFingerprint(b));
  });
});

// ---------------------------------------------------------------------------
// saveLayouts / loadStoredLayouts / clearStoredLayouts
// ---------------------------------------------------------------------------

describe("saveLayouts + loadStoredLayouts round-trip", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when storage is empty", () => {
    expect(loadStoredLayouts(makeDefaults())).toBeNull();
  });

  it("returns the saved layouts when version and fingerprint match", () => {
    const defaults = makeDefaults();
    const customized = makeDefaults();
    customized.lg = customized.lg!.map((it) => ({ ...it, x: it.x + 1 }) as LayoutItem);

    saveLayouts(customized);
    const loaded = loadStoredLayouts(defaults);
    expect(loaded).toEqual(customized);
  });

  it("returns null when the stored fingerprint no longer matches defaults", () => {
    const customized = makeDefaults();
    saveLayouts(customized);

    // Simulate adding a new panel to the defaults — the fingerprint should diverge.
    const newDefaults = makeDefaults();
    newDefaults.lg = [...newDefaults.lg!, item("brand-new")];

    expect(loadStoredLayouts(newDefaults)).toBeNull();
  });

  it("returns null when the stored version doesn't match LAYOUT_VERSION", () => {
    const defaults = makeDefaults();
    // Hand-write a payload tagged with a different version
    localStorage.setItem(
      STORAGE_KEYS.calculatorLayouts,
      JSON.stringify({
        version: LAYOUT_VERSION + 1,
        fingerprint: layoutFingerprint(defaults),
        layouts: defaults,
      }),
    );
    expect(loadStoredLayouts(defaults)).toBeNull();
  });

  it("returns null when the stored payload is malformed", () => {
    localStorage.setItem(STORAGE_KEYS.calculatorLayouts, "not-json{{{");
    expect(loadStoredLayouts(makeDefaults())).toBeNull();
  });

  it("writes the current LAYOUT_VERSION and fingerprint alongside the layouts", () => {
    const defaults = makeDefaults();
    saveLayouts(defaults);
    const raw = localStorage.getItem(STORAGE_KEYS.calculatorLayouts);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(LAYOUT_VERSION);
    expect(parsed.fingerprint).toBe(layoutFingerprint(defaults));
    expect(parsed.layouts).toEqual(defaults);
  });
});

describe("clearStoredLayouts", () => {
  beforeEach(() => localStorage.clear());

  it("removes any stored layouts so the next load returns null", () => {
    saveLayouts(makeDefaults());
    expect(localStorage.getItem(STORAGE_KEYS.calculatorLayouts)).not.toBeNull();

    clearStoredLayouts();
    expect(localStorage.getItem(STORAGE_KEYS.calculatorLayouts)).toBeNull();
    expect(loadStoredLayouts(makeDefaults())).toBeNull();
  });

  it("is a no-op when no layout is stored", () => {
    expect(() => clearStoredLayouts()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// dispatchLayoutReset / onLayoutReset
// ---------------------------------------------------------------------------

describe("dispatchLayoutReset + onLayoutReset", () => {
  it("invokes subscribed handlers when a reset is dispatched", () => {
    const handler = vi.fn();
    const unsubscribe = onLayoutReset(handler);

    dispatchLayoutReset();
    dispatchLayoutReset();

    expect(handler).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("stops invoking the handler after unsubscribe", () => {
    const handler = vi.fn();
    const unsubscribe = onLayoutReset(handler);
    unsubscribe();

    dispatchLayoutReset();

    expect(handler).not.toHaveBeenCalled();
  });
});
