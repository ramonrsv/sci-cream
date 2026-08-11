import { describe, it, expect } from "vitest";

import { getListedPages, getMarkdownSlugs, TABLE_OF_CONTENT_SLUG } from "@/lib/markdown";

// ---------------------------------------------------------------------------
// Docs table of contents
//
// Reads the real `content/docs` files: a page is only reachable from `/docs` if the table of
// contents lists it, or a page the table of contents reaches lists it.
// ---------------------------------------------------------------------------

/** Slugs reachable from `slug` by following frontmatter `pages` lists, including `slug` itself. */
function reachableSlugs(slug: string, seen = new Set<string>()): Set<string> {
  if (seen.has(slug)) return seen;
  seen.add(slug);
  for (const listed of getListedPages("docs", slug)) reachableSlugs(listed, seen);
  return seen;
}

describe("docs table of contents", () => {
  it("reaches every page in content/docs, and lists only pages that exist", () => {
    const reachable = [...reachableSlugs(TABLE_OF_CONTENT_SLUG)];

    expect(reachable.sort()).toEqual([...getMarkdownSlugs("docs")].sort());
  });
});
