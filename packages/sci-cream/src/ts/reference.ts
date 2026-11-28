// Generated from the crate's rendered docs by `scripts/gen-reference.ts` (`pnpm gen:reference`).
// Its own entry, `./reference`, so the chapters' HTML stays out of the main entry's client bundles.
import chaptersJson from "../../docs/generated/reference/chapters.json";

/** A chapter of the Reference, the crate's `sci_cream::docs` as the app serves it. */
export type ReferenceChapter = {
  /** Its route under {@link REFERENCE_ROOT}, such as `sweeteners/sugars`. */
  slug: string;
  /** Its heading's text. */
  title: string;
  /** One line on what it covers. */
  description: string;
  /** Its HTML, from its heading, as an `h1`, to its footnotes. */
  html: string;
};

/** The route the chapters are served under, `/docs/reference`. */
export const REFERENCE_ROOT: string = chaptersJson.root;

/** The Reference's chapters, in the crate's order. */
export const referenceChapters: readonly ReferenceChapter[] = chaptersJson.chapters;

const CHAPTERS_BY_SLUG = new Map(referenceChapters.map((chapter) => [chapter.slug, chapter]));

/** The chapter served at `slug` under {@link REFERENCE_ROOT}, or `undefined` if there's none. */
export function referenceChapter(slug: string): ReferenceChapter | undefined {
  return CHAPTERS_BY_SLUG.get(slug);
}
