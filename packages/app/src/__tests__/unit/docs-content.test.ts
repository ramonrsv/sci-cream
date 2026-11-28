import { describe, it, expect } from "vitest";

import { buildDocsNav, readDocsNavOrder } from "@/lib/docs-nav";
import type { DocsNavNode } from "@/lib/docs";
import { getReferenceDocsSlugs, REFERENCE_SLUG } from "@/lib/docs-reference";
import { getMarkdownSlugs } from "@/lib/markdown";

// ---------------------------------------------------------------------------
// Docs navigation manifest
//
// Reads the real `content/docs` files: the manifest alone records which pages exist and in what
// order, so an unlisted page is invisible and a listed page that was deleted breaks the build. The
// Reference's chapters come from the crate's package, under the one entry the manifest gives them.
// ---------------------------------------------------------------------------

/** Every slug in the tree, in document order. */
function treeSlugs(nodes: DocsNavNode[]): string[] {
  return nodes.flatMap((node) => [node.slug, ...treeSlugs(node.children)]);
}

describe("docs navigation manifest", () => {
  it("lists exactly the pages in content/docs, and the Reference", () => {
    expect([...readDocsNavOrder()].sort()).toEqual(
      [...getMarkdownSlugs("docs"), REFERENCE_SLUG].sort(),
    );
  });

  it("builds a tree holding every page exactly once", async () => {
    const slugs = treeSlugs(await buildDocsNav());
    const pages = [...getMarkdownSlugs("docs"), REFERENCE_SLUG, ...getReferenceDocsSlugs()];

    expect([...slugs].sort()).toEqual(pages.sort());
  });

  it("nests the pages that live in a subdirectory", async () => {
    const nav = await buildDocsNav();

    const nested = nav.find((node) => node.slug !== REFERENCE_SLUG && node.children.length > 0);
    expect(nested).toBeDefined();
    for (const child of nested!.children) {
      expect(child.slug.startsWith(`${nested!.slug}/`)).toBe(true);
    }
  });

  it("nests the Reference's chapters under it, in the crate's order", async () => {
    const reference = (await buildDocsNav()).find((node) => node.slug === REFERENCE_SLUG);

    expect(treeSlugs(reference?.children ?? [])).toEqual(getReferenceDocsSlugs());
  });
});
