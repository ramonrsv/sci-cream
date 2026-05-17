import type { ResponsiveLayouts } from "react-grid-layout";

import {
  getLocalStorage,
  removeLocalStorage,
  setLocalStorage,
  STORAGE_KEYS,
} from "@/lib/local-storage";

/**
 * Bump to force every user to discard their stored calculator layout on next load. Use this
 * when the default layout has changed in a way that should override user customizations even
 * if the panel set itself is unchanged (e.g. a panel was repositioned or resized in the
 * defaults). Adding or removing a panel does NOT require a bump — the fingerprint check below
 * handles that automatically.
 */
export const LAYOUT_VERSION = 1;

interface StoredLayouts {
  version: number;
  fingerprint: string;
  layouts: ResponsiveLayouts;
}

/**
 * Derive a stable fingerprint of a `ResponsiveLayouts`, capturing the set of breakpoints and
 * the panel keys within each. Changes when a panel is added, removed, or renamed, or when a
 * breakpoint is added/removed — i.e. whenever stored item positions could no longer be
 * meaningfully replayed against the current grid.
 */
export function layoutFingerprint(layouts: ResponsiveLayouts): string {
  const breakpoints = Object.keys(layouts).sort();
  const keysByBp = breakpoints
    .map((bp) =>
      (layouts[bp] ?? [])
        .map((item) => item.i)
        .sort()
        .join(","),
    )
    .join("|");
  return `bp:${breakpoints.join(",")};keys:${keysByBp}`;
}

/**
 * Load the stored calculator layout, or `null` when storage is empty or its version /
 * fingerprint no longer match the current defaults — in which case the caller should fall back
 * to defaults.
 */
export function loadStoredLayouts(defaults: ResponsiveLayouts): ResponsiveLayouts | null {
  const stored = getLocalStorage<StoredLayouts>(STORAGE_KEYS.calculatorLayouts);
  if (!stored) return null;
  if (stored.version !== LAYOUT_VERSION) return null;
  if (stored.fingerprint !== layoutFingerprint(defaults)) return null;
  return stored.layouts;
}

/** Persist the calculator layout, tagged with the current `LAYOUT_VERSION` and fingerprint */
export function saveLayouts(layouts: ResponsiveLayouts): void {
  setLocalStorage<StoredLayouts>(STORAGE_KEYS.calculatorLayouts, {
    version: LAYOUT_VERSION,
    fingerprint: layoutFingerprint(layouts),
    layouts,
  });
}

/** Remove any stored calculator layout, reverting the next load to the hardcoded defaults */
export function clearStoredLayouts(): void {
  removeLocalStorage(STORAGE_KEYS.calculatorLayouts);
}

/**
 * In-window event name used to ask the mounted calculator page to revert to its default layout
 * without a page reload. Dispatched by the Header's "Reset layout" button (which lives outside
 * the calculator's React tree) and consumed by the calculator page via {@link onLayoutReset}.
 */
const LAYOUT_RESET_EVENT = "sci-cream:calculator-layout-reset";

/** Notify any mounted calculator page that the stored layout has been cleared */
export function dispatchLayoutReset(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LAYOUT_RESET_EVENT));
}

/** Subscribe to layout-reset events; returns an unsubscribe function */
export function onLayoutReset(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LAYOUT_RESET_EVENT, handler);
  return () => window.removeEventListener(LAYOUT_RESET_EVENT, handler);
}
