/**
 * Shape of the docs section, as both the server and the browser see it.
 *
 * Deliberately free of `fs`, so client components can import it. Reading content from disk lives
 * in `docs-nav.ts`, which a client component must not pull in.
 */

import type { MarkdownHeading } from "@/lib/markdown";

/** Content section the docs are served from. */
export const DOCS_SECTION = "docs";

/** One entry in the docs table of contents: a page and the pages nested under it. */
export interface DocsNavNode {
  /** Content slug, e.g. `other-resources/science`; every page is served at `/docs/{slug}`. */
  slug: string;
  /** Frontmatter `title`, the entry's label. */
  title: string;
  /** Frontmatter `description`, the index page's blurb for this entry. */
  description?: string;
  /** The page's own headings, in document order; the caller picks which levels to list. */
  headings: MarkdownHeading[];
  /** Pages nested under this one; see `buildDocsNav`. */
  children: DocsNavNode[];
}

/** Route a docs slug is served at. */
export function docsHref(slug: string): string {
  return `/${DOCS_SECTION}/${slug}`;
}
