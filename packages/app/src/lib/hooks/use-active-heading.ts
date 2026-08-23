"use client";

import { useEffect } from "react";

import { APP_CONTENT_ID } from "@/lib/app-shell";
import { useResetOnChange } from "@/lib/hooks/use-reset-on-change";

/**
 * Observed band: the top fifth of the reading area.
 *
 * Cropping the bottom is what makes the result "the heading being read" rather than "a heading on
 * screen": uncropped, the next heading would go active as soon as it appears at the bottom.
 */
const ACTIVE_BAND = "0px 0px -80% 0px";

/** Separator joining `scope` and `ids` into one dependency; `\n` occurs in neither. */
const KEY_SEP = "\n";

/**
 * Track which of `ids` is the heading currently being read, in document order.
 *
 * Observed against the app's scrolling content area, not the viewport: the shell is `h-screen`, so
 * the window never scrolls and a viewport root would never fire.
 *
 * `scope` names the page the ids belong to; the observer and the result both key on it. Two pages
 * can list identical headings — `other-resources/{science,recipes}` do — so ids alone would leave
 * the observer watching the previous page's detached nodes, and the result stuck on a heading the
 * new page never had.
 *
 * `undefined` until a heading is seen, and wherever `IntersectionObserver` is absent (SSR, jsdom).
 */
export function useActiveHeading(ids: string[], scope: string): string | undefined {
  const key = [scope, ...ids].join(KEY_SEP);
  const [active, setActive] = useResetOnChange<string | undefined>(key, undefined);

  useEffect(() => {
    const root = document.getElementById(APP_CONTENT_ID);
    if (!root || typeof IntersectionObserver === "undefined") return;

    // From `key`: using `ids` here makes it a dep the linter demands, re-observing every render.
    const order = key.split(KEY_SEP).slice(1);
    const headings = order
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    const inBand = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        const first = order.find((id) => inBand.has(id));
        // Between two far-apart headings the band holds none; hold the last rather than blink off.
        if (first !== undefined) setActive(first);
      },
      { root, rootMargin: ACTIVE_BAND, threshold: 0 },
    );

    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
    // `setActive` is a `useState` setter, stable across renders; listed to satisfy the linter
  }, [key, setActive]);

  return active;
}
