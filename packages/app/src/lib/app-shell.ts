/**
 * Identifiers the app shell publishes for code that must reach it without importing it.
 *
 * A hook, the e2e helpers, and the bench read them; importing `navbar.tsx` or `web-vitals.tsx`
 * would pull Next's client runtime into a Playwright loader, so this module imports nothing.
 */

/**
 * Id of the app shell's scrolling content area, mounted by `navbar.tsx`.
 *
 * The shell is `h-screen`, so this element scrolls rather than the window. Anything measuring or
 * observing the reading area has to resolve against it. `globals.css` selects it by name too.
 */
export const APP_CONTENT_ID = "app-content";

/**
 * User Timing mark name set once the root client tree has hydrated, by `web-vitals.tsx`.
 *
 * Its `startTime` (ms from navigation start) approximates the hydration window — the App Router has
 * no hydration-timing API (that was Pages-Router only), so the web-vitals bench reads this mark
 * instead. Approximate: streaming/RSC hydration is per-segment, not one global instant.
 */
export const HYDRATION_MARK = "app-hydrated";
