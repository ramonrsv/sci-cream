"use client";

import { SM_BREAKPOINT_PX } from "@/lib/styles/sizes";
import { useMediaQuery } from "./use-media-query";

/**
 * Whether the viewport is narrower than Tailwind's `sm` breakpoint.
 *
 * Complement of the `sm:` query; drives width-sensitive layout choices (drawer overlay, compact
 * header margin); peek interaction keys on `useCanHover`. SSR/test-safe: `true` (mobile-first).
 */
export function useIsNarrow(): boolean {
  return !useMediaQuery(`(min-width: ${SM_BREAKPOINT_PX}px)`);
}
