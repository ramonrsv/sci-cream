"use client";

import { ThumbsDown, ThumbsUp, Trophy } from "lucide-react";

import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";
import { RATING_LABELS, RATINGS, Rating } from "@/lib/rating";
import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";

/** Icon for each rating, the twin of the glyph that rating wears in text-only contexts. */
const RATING_ICONS: Record<Rating, typeof ThumbsUp> = {
  [Rating.Bad]: ThumbsDown,
  [Rating.Good]: ThumbsUp,
  [Rating.Great]: Trophy,
};

/** Draws one rating, filled when it is the one in force. */
export function RatingIcon({
  rating,
  size,
  filled = false,
}: {
  rating: Rating;
  size: number;
  filled?: boolean;
}) {
  const Icon = RATING_ICONS[rating];
  return <Icon size={size} {...(filled && { fill: "currentColor" })} />;
}

/**
 * How a saved recipe version turned out. One button wearing the current rating, since its toolbar
 * is tight; the three choices open in a popup, where choosing the active one clears it.
 */
export function RatingToggle({
  rating,
  onChange,
  iconSize = DETAIL_PANEL_ACTION_ICON_SIZE,
}: {
  rating?: Rating;
  onChange: (next: Rating | null) => void | Promise<void>;
  iconSize?: number;
}) {
  const triggerTitle =
    rating === undefined ? "Rate this version" : `${RATING_LABELS[rating]} (click to change)`;

  return (
    <Popover className="flex" data-rating={rating ?? "none"} data-testid="rating-toggle">
      <PopoverButton
        className={`action-button flex items-center px-2 py-0.5 ${
          rating === undefined ? "opacity-60" : ""
        }`}
        title={triggerTitle}
        aria-label={triggerTitle}
        data-testid="rating-trigger"
      >
        {/* Unrated wears a hollow thumbs-up: an invitation to rate, not a rating of its own. */}
        {rating === undefined ? (
          <ThumbsUp size={iconSize} />
        ) : (
          <RatingIcon rating={rating} size={iconSize} filled />
        )}
      </PopoverButton>
      <PopupPanel className="p-1">
        {({ close }) => (
          <div className="flex items-center gap-1" role="group" aria-label="Version rating">
            {RATINGS.map((value) => {
              const active = rating === value;
              const title = active
                ? `${RATING_LABELS[value]} (click to clear)`
                : RATING_LABELS[value];
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    void onChange(active ? null : value);
                    close();
                  }}
                  aria-pressed={active}
                  title={title}
                  aria-label={RATING_LABELS[value]}
                  className={`action-button flex items-center px-1 py-0.5 ${
                    active ? "" : "opacity-60"
                  }`}
                  data-testid={`rating-${value.toLowerCase()}`}
                >
                  <RatingIcon rating={value} size={iconSize} filled={active} />
                </button>
              );
            })}
          </div>
        )}
      </PopupPanel>
    </Popover>
  );
}
