import { describe, it, expect } from "vitest";

import { buildDocsNav, readDocsNavOrder, type DocsNavNode } from "@/lib/docs-nav";
import { getMarkdownSlugs } from "@/lib/markdown";

// ---------------------------------------------------------------------------
// Docs navigation manifest
//
// Reads the real `content/docs` files: the manifest is the only record of which pages exist and in
// what order, so a page added without listing it is invisible, and a listed page that was deleted
// breaks the build.
// ---------------------------------------------------------------------------

/** Every slug in the tree, in document order. */
function treeSlugs(nodes: DocsNavNode[]): string[] {
  return nodes.flatMap((node) => [node.slug, ...treeSlugs(node.children)]);
}

describe("docs navigation manifest", () => {
  it("lists exactly the pages in content/docs", () => {
    expect([...readDocsNavOrder()].sort()).toEqual([...getMarkdownSlugs("docs")].sort());
  });

  it("builds a tree holding every page exactly once", async () => {
    const slugs = treeSlugs(await buildDocsNav());

    expect([...slugs].sort()).toEqual([...getMarkdownSlugs("docs")].sort());
  });

  it("nests the pages that live in a subdirectory", async () => {
    const nav = await buildDocsNav();

    const nested = nav.find((node) => node.children.length > 0);
    expect(nested).toBeDefined();
    for (const child of nested!.children) {
      expect(child.slug.startsWith(`${nested!.slug}/`)).toBe(true);
    }
  });
});
