"use client";

import { Star } from "lucide-react";

import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Star toggle for an owned recipe or batch. Filled when starred, outlined and dimmed when not, so
 * the state survives colorblindness and print rather than relying on color alone.
 */
export function FavouriteToggle({
  favourite,
  onChange,
  label = "favourite",
  iconSize = DETAIL_PANEL_ACTION_ICON_SIZE,
}: {
  favourite: boolean;
  onChange: (next: boolean) => void | Promise<void>;
  /** Noun used in the title, e.g. "recipe" gives "Remove recipe from favourites". */
  label?: string;
  iconSize?: number;
}) {
  const title = favourite ? `Remove ${label} from favourites` : `Add ${label} to favourites`;

  return (
    <button
      type="button"
      onClick={() => void onChange(!favourite)}
      aria-pressed={favourite}
      title={title}
      aria-label={title}
      className={`action-button px-2 py-0.5 text-sm ${favourite ? "" : "opacity-60"}`}
      data-testid="favourite-toggle"
    >
      <Star size={iconSize} {...(favourite && { fill: "currentColor" })} />
    </button>
  );
}
