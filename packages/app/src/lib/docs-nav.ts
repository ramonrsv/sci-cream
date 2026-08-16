import fs from "fs";
import path from "path";
import { cache } from "react";

import { CONTENT_ROOT, getMarkdownPage, type MarkdownHeading } from "@/lib/markdown";

/** Content section the docs navigation is built from. */
const DOCS_SECTION = "docs";

/** Manifest naming every docs page, in table-of-contents order; `_` sorts it above them. */
const NAV_MANIFEST = "_nav.json";

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
  /** Pages nested under this one; see {@link buildDocsNav}. */
  children: DocsNavNode[];
}

/** Route a docs slug is served at. */
export function docsHref(slug: string): string {
  return `/${DOCS_SECTION}/${slug}`;
}

/** Slugs the manifest lists, in order. */
export function readDocsNavOrder(): string[] {
  const manifest = path.join(CONTENT_ROOT, DOCS_SECTION, NAV_MANIFEST);
  return JSON.parse(fs.readFileSync(manifest, "utf8")) as string[];
}

/** Parent slug of `slug`, or `undefined` when it has no path prefix to nest under. */
function parentSlug(slug: string): string | undefined {
  const cut = slug.lastIndexOf("/");
  return cut === -1 ? undefined : slug.slice(0, cut);
}

/**
 * Build the docs table of contents from the manifest.
 *
 * Nesting comes from the slug path: `other-resources/science` sits under `other-resources`. A page
 * whose parent is unlisted stays at the root, and a child may be listed before its parent.
 */
export async function buildDocsNav(): Promise<DocsNavNode[]> {
  const order = readDocsNavOrder();
  const pages = await Promise.all(order.map((slug) => getMarkdownPage(DOCS_SECTION, slug)));

  const nodes: DocsNavNode[] = pages.map(({ slug, frontmatter, headings }) => ({
    slug,
    title: frontmatter.title,
    description: frontmatter.description,
    headings: headings ?? [],
    children: [],
  }));

  const bySlug = new Map(nodes.map((node) => [node.slug, node]));
  const roots: DocsNavNode[] = [];
  for (const node of nodes) {
    const parent = bySlug.get(parentSlug(node.slug) ?? "");
    (parent ?? { children: roots }).children.push(node);
  }

  return roots;
}

/** The docs table of contents, built once per request however many routes read it. */
export const getDocsNav = cache(buildDocsNav);
