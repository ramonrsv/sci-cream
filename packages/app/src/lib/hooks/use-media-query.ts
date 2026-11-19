"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the given CSS media `query` currently matches.
 *
 * SSR/test-safe: `false` while hydrating, then tracks `matchMedia` (false if unavailable, e.g.
 * SSR, stub-less jsdom). Callers layer meaning on top (e.g. `useIsNarrow`, `useCanHover`).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
