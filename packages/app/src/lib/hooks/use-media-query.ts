"use client";

import { useEffect, useState } from "react";

/**
 * Whether the given CSS media `query` currently matches.
 *
 * SSR/test-safe: starts `false`, resolves on mount, then tracks `matchMedia` (false if unavailable,
 * e.g. SSR, stub-less jsdom). Callers layer meaning on top (e.g. `useIsNarrow`, `useCanHover`).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches); // eslint-disable-line react-hooks/set-state-in-effect
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
