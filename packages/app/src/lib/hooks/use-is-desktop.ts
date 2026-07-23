"use client";

import { useEffect, useState } from "react";

/** Min viewport width (px) treated as desktop; matches Tailwind's `sm` breakpoint. */
const DESKTOP_MIN_WIDTH = 640;

/**
 * Whether the viewport is at least the `sm` breakpoint (desktop).
 *
 * SSR/test-safe: starts `false` and resolves on mount, then tracks the `matchMedia` query. Used to
 * branch sidebar behavior (hover-drawer vs tap-drawer), while widths stay CSS-driven via `sm:`.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    setIsDesktop(query.matches); // eslint-disable-line react-hooks/set-state-in-effect
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
