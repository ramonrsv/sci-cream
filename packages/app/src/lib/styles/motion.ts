/**
 * Whether reduced motion is requested via the `prefers-reduced-motion: reduce` media query.
 *
 * Read synchronously (SSR-safe) rather than through a hook so a Chart.js chart can disable its
 * canvas animation on its very first client render. Canvas (`requestAnimationFrame`) animations
 * are invisible to Playwright's screenshot animation-freezing, so they must be disabled at the
 * source to keep visual snapshots deterministic. The Playwright `visual` project sets
 * `reducedMotion: "reduce"`.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
