/**
 * User Timing mark name set once the root client tree has hydrated
 *
 * Its `startTime` (ms from navigation start) approximates the hydration window — the App Router has
 * no hydration-timing API (that was Pages-Router only), so the web-vitals bench reads this mark
 * instead. Approximate: streaming/RSC hydration is per-segment, not one global instant.
 *
 * Lives in its own module (not `web-vitals.tsx`, which imports `next/web-vitals`) so the Playwright
 * bench can import the value without pulling Next's client runtime into its loader.
 */
export const HYDRATION_MARK = "app-hydrated";
