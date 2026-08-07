/**
 * How well something turned out: a domain-neutral three-point verdict, reusable by anything worth
 * judging, though recipe versions are its only holder today. No WASM or server deps, so the
 * `"use server"` data layer and the client can both import it.
 *
 * Stored as a nullable `rating` enum column, null being unrated. Extending the scale takes an
 * `ALTER TYPE … ADD VALUE`, unusable until its transaction commits, so adding a value and
 * backfilling would be two migrations.
 */

/** A recorded verdict. Absent (null/undefined) means unrated. */
export enum Rating {
  Bad = "Bad",
  Good = "Good",
  Great = "Great",
}

/** Every rating, worst first. Both the display order and the ranking `ratingRank` reads. */
export const RATINGS: readonly Rating[] = [Rating.Bad, Rating.Good, Rating.Great];

/** Position on the scale; named values do not order themselves, so compares come through here. */
export function ratingRank(rating: Rating): number {
  return RATINGS.indexOf(rating);
}

/** Marker for contexts that render text only, such as a native `<option>`. */
export const RATING_GLYPHS: Record<Rating, string> = {
  [Rating.Bad]: "👎",
  [Rating.Good]: "👍",
  [Rating.Great]: "👍👍",
};

/** Human-readable name, used for tooltips and accessible labels. */
export const RATING_LABELS: Record<Rating, string> = {
  [Rating.Bad]: "Thumbs down",
  [Rating.Good]: "Thumbs up",
  [Rating.Great]: "Two thumbs up",
};

/** True for a value that is exactly one of the ratings; guards the server-action boundary. */
export function isRating(value: unknown): value is Rating {
  return (RATINGS as readonly unknown[]).includes(value);
}
