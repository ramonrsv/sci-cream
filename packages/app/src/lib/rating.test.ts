import { describe, it, expect } from "vitest";

import {
  isRating,
  monoRatingGlyph,
  ratingRank,
  RATING_GLYPHS,
  RATING_LABELS,
  RATINGS,
  Rating,
  TEXT_PRESENTATION_SELECTOR,
} from "./rating";

describe("Rating", () => {
  it("stores each rating as its own name, so the value reads as itself in the database", () => {
    expect(Rating.Bad).toBe("Bad");
    expect(Rating.Good).toBe("Good");
    expect(Rating.Great).toBe("Great");
  });

  it("lists every rating worst first", () => {
    expect(RATINGS).toEqual([Rating.Bad, Rating.Good, Rating.Great]);
  });

  it("ranks worst to best, since the named values do not order themselves", () => {
    expect(ratingRank(Rating.Bad)).toBeLessThan(ratingRank(Rating.Good));
    expect(ratingRank(Rating.Good)).toBeLessThan(ratingRank(Rating.Great));
  });

  it("has a distinct glyph and label for every rating", () => {
    const glyphs = RATINGS.map((r) => RATING_GLYPHS[r]);
    const labels = RATINGS.map((r) => RATING_LABELS[r]);
    expect(new Set(glyphs).size).toBe(RATINGS.length);
    expect(new Set(labels).size).toBe(RATINGS.length);
    expect(glyphs.every((g) => g.length > 0)).toBe(true);
  });
});

describe("monoRatingGlyph", () => {
  // Composed from the primitives rather than calling the helper, so this pins what it must produce.
  it.each(RATINGS)("appends the text presentation selector to %s", (rating) => {
    expect(monoRatingGlyph(rating)).toBe(RATING_GLYPHS[rating] + TEXT_PRESENTATION_SELECTOR);
  });

  it("selects text rather than emoji presentation, which is the opposite request", () => {
    expect(TEXT_PRESENTATION_SELECTOR).toBe("\uFE0E");
    expect(monoRatingGlyph(Rating.Great)).not.toContain("\uFE0F");
  });

  it("leaves the glyph itself untouched, so the colour form remains the fallback", () => {
    expect(monoRatingGlyph(Rating.Great).startsWith(RATING_GLYPHS[Rating.Great])).toBe(true);
  });
});

describe("isRating", () => {
  it.each(RATINGS)("accepts the rating %s", (rating) => {
    expect(isRating(rating)).toBe(true);
  });

  // Case matters: the database enum is declared with these exact spellings.
  it.each(["good", "GREAT", "Excellent", "Bad ", ""])("rejects the off-scale name %p", (value) => {
    expect(isRating(value)).toBe(false);
  });

  it.each([null, undefined, 0, 1, 2, -1, {}, []])("rejects the non-name %p", (value) => {
    expect(isRating(value)).toBe(false);
  });
});
