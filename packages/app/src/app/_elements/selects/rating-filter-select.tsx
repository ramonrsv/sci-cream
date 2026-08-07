"use client";

import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";
import { RATING_GLYPHS, ratingRank, Rating } from "@/lib/rating";

import { Select, type SelectOption } from "@/app/_elements/selects/select";

/** Which recipes a rating filter admits, by the ratings their versions carry. */
export enum RatingFilter {
  /// Every recipe, rated or not.
  Any = "Any",
  /// Rated either way — the ones a verdict has been formed on.
  Rated = "Rated",
  /// Good or better.
  GoodOrBetter = "GoodOrBetter",
  /// Great only.
  Great = "Great",
  /// Bad only, for finding what to fix or drop.
  Bad = "Bad",
}

/**
 * Short label for each {@link RatingFilter}, shown in the search toolbar. Glyphs come from the
 * shared map so every control names a rating alike; the word stays, as `Any` and `Rated` lack one.
 */
export const RATING_FILTER_SHORT_LABELS: Record<RatingFilter, string> = {
  [RatingFilter.Any]: "Any",
  [RatingFilter.Rated]: "Rated",
  [RatingFilter.GoodOrBetter]: `${RATING_GLYPHS[Rating.Good]} Good+`,
  [RatingFilter.Great]: `${RATING_GLYPHS[Rating.Great]} Great`,
  [RatingFilter.Bad]: `${RATING_GLYPHS[Rating.Bad]} Bad`,
};

/** True when a single rating satisfies `filter`; `undefined` is unrated. */
export function ratingMatchesFilter(rating: Rating | undefined, filter: RatingFilter) {
  switch (filter) {
    case RatingFilter.Any:
      return true;
    case RatingFilter.Rated:
      return rating !== undefined;
    case RatingFilter.GoodOrBetter:
      return rating !== undefined && ratingRank(rating) >= ratingRank(Rating.Good);
    case RatingFilter.Great:
      return rating === Rating.Great;
    case RatingFilter.Bad:
      return rating === Rating.Bad;
  }
}

/**
 * Persisted `[value, setter]` tuple for a {@link RatingFilter}; values outside the enum fall back
 * to `Any`. Leaf key `${persistKey}:rating`; an undefined `persistKey` behaves as plain `useState`.
 */
export function useRatingFilterState(
  persistKey: string | undefined,
): [RatingFilter, React.Dispatch<React.SetStateAction<RatingFilter>>] {
  return usePersistedState<RatingFilter>(leafKey(persistKey, "rating"), RatingFilter.Any, {
    isValid: (v) => Object.values(RatingFilter).includes(v),
  });
}

/** Select element for narrowing a recipe list to the ratings its versions carry. */
export function RatingFilterSelect({
  ratingFilterState,
}: {
  ratingFilterState: [RatingFilter, React.Dispatch<React.SetStateAction<RatingFilter>>];
}) {
  const [ratingFilter, setRatingFilter] = ratingFilterState;

  const options: SelectOption<RatingFilter>[] = Object.values(RatingFilter).map((filter) => ({
    value: filter,
    label: RATING_FILTER_SHORT_LABELS[filter],
  }));

  return (
    <div id="rating-filter-select">
      <Select
        value={ratingFilter}
        onChange={setRatingFilter}
        options={options}
        ariaLabel="Filter by rating"
      />
    </div>
  );
}
