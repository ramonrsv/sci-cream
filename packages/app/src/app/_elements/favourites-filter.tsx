"use client";

import { Star } from "lucide-react";

import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";
import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Persisted `[value, setter]` tuple for a favourites-only filter; a stored non-boolean falls back
 * to off. Leaf key `${persistKey}:favourites`; an undefined `persistKey` behaves as `useState`.
 */
export function useFavouritesFilterState(
  persistKey: string | undefined,
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  return usePersistedState(leafKey(persistKey, "favourites"), false, {
    isValid: (v) => typeof v === "boolean",
  });
}

/**
 * Toolbar toggle narrowing a list to starred entries; the caller pairs it with its own predicate.
 * Distinct from {@link FavouriteToggle}, which stars one entity rather than filtering many.
 */
export function FavouritesFilter({
  favouritesFilterState,
  iconSize = DETAIL_PANEL_ACTION_ICON_SIZE,
}: {
  favouritesFilterState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  iconSize?: number;
}) {
  const [favouritesOnly, setFavouritesOnly] = favouritesFilterState;

  return (
    <button
      type="button"
      onClick={() => setFavouritesOnly((v) => !v)}
      aria-pressed={favouritesOnly}
      title={favouritesOnly ? "Showing favourites only" : "Show favourites only"}
      aria-label="Show favourites only"
      className={`action-button flex items-center px-2 py-0.5 text-sm ${
        favouritesOnly ? "border-brd" : "opacity-60"
      }`}
      data-testid="favourites-filter"
    >
      <Star size={iconSize} {...(favouritesOnly && { fill: "currentColor" })} />
    </button>
  );
}
