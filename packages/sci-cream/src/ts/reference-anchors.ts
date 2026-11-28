// Generated from the crate's rendered docs by `scripts/gen-reference.ts` (`pnpm gen:reference`).
// Small enough for the main entry, unlike `./reference`'s chapters, so client code can link in.
import anchorsJson from "../../docs/generated/reference/anchors.json";

/** The URL of every anchor the Reference's chapters define, by id. */
const ANCHOR_URLS = new Map<string, string>(Object.entries(anchorsJson));

/**
 * The URL of anchor `id` in the Reference, such as `/docs/reference/sweeteners#pod`, or a chapter's
 * route for its own heading's id; `undefined` if no chapter defines it.
 */
export function referenceAnchorUrl(id: string): string | undefined {
  return ANCHOR_URLS.get(id);
}
