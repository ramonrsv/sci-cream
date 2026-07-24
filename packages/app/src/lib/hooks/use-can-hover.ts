"use client";

import { useMediaQuery } from "./use-media-query";

/**
 * Whether the primary pointer can hover (a mouse/trackpad rather than touch).
 *
 * Drives peek interaction: hover-peek + logo when `true`, else tap-peek + hamburger + dismiss on
 * navigate/tap-outside. Width-independent (a landscape phone is wide but touch). Default `false`.
 */
export function useCanHover(): boolean {
  return useMediaQuery("(hover: hover)");
}
