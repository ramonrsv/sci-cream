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

/**
 * The highest rating present, skipping unrated entries; `undefined` when none carries one. Reads
 * off `RATINGS` being worst-first, so the last one that appears is the best.
 */
export function bestRating(ratings: Iterable<Rating | null | undefined>): Rating | undefined {
  const present = new Set(ratings);
  return RATINGS.findLast((rating) => present.has(rating));
}

/**
 * Marker for text-only contexts such as a native `<option>`. One character each, since a doubled
 * glyph leaves a gap no CSS reaches there, and each has a lucide twin so icon and text agree.
 */
export const RATING_GLYPHS: Record<Rating, string> = {
  [Rating.Bad]: "👎",
  [Rating.Good]: "👍",
  [Rating.Great]: "🏆",
};

/** U+FE0E, asking for a glyph's monochrome text form; ignored where no font supplies one. */
export const TEXT_PRESENTATION_SELECTOR = "\uFE0E";

/** The rating's glyph asked for in its monochrome text form, to sit with adjacent text. */
export function monoRatingGlyph(rating: Rating): string {
  return RATING_GLYPHS[rating] + TEXT_PRESENTATION_SELECTOR;
}

/** Human-readable name for tooltips and accessible labels. Names the verdict, not the mark. */
export const RATING_LABELS: Record<Rating, string> = {
  [Rating.Bad]: "Bad",
  [Rating.Good]: "Good",
  [Rating.Great]: "Great",
};

/** True for a value that is exactly one of the ratings; guards the server-action boundary. */
export function isRating(value: unknown): value is Rating {
  return (RATINGS as readonly unknown[]).includes(value);
}
