import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";

import { buildDocsNav, readDocsNavOrder } from "./docs-nav";

const readFileSyncSpy = vi.spyOn(fs, "readFileSync");

beforeEach(() => {
  vi.resetAllMocks();
});

/**
 * Serve the manifest and each page's markdown from the mocked filesystem.
 *
 * `pages` maps a slug to its file contents; a slug the manifest lists but `pages` omits throws,
 * standing in for a manifest entry with no file behind it.
 */
function mockDocs(order: string[], pages: Record<string, string>) {
  readFileSyncSpy.mockImplementation((filePath: unknown) => {
    const file = String(filePath);
    if (file.endsWith("_nav.json")) return JSON.stringify(order);

    const slug = file.replace(/^.*\/docs\//, "").replace(/\.md$/, "");
    const contents = pages[slug];
    if (contents === undefined) throw new Error(`ENOENT: ${slug}`);
    return contents;
  });
}

/** Frontmatter-only page body, for cases that only care about structure. */
function page(title: string, description = "") {
  return `---\ntitle: ${title}\ndescription: ${description}\n---\n# ${title}`;
}

// ---------------------------------------------------------------------------
// readDocsNavOrder
// ---------------------------------------------------------------------------

describe("readDocsNavOrder", () => {
  it("returns the manifest's slugs, in order", () => {
    mockDocs(["charlie", "alpha"], {});

    expect(readDocsNavOrder()).toEqual(["charlie", "alpha"]);
  });
});

// ---------------------------------------------------------------------------
// buildDocsNav
// ---------------------------------------------------------------------------

describe("buildDocsNav", () => {
  it("returns top-level pages in manifest order", async () => {
    mockDocs(["charlie", "alpha"], { charlie: page("Charlie"), alpha: page("Alpha") });

    const nav = await buildDocsNav();
    expect(nav.map((node) => node.slug)).toEqual(["charlie", "alpha"]);
    expect(nav.map((node) => node.title)).toEqual(["Charlie", "Alpha"]);
  });

  it("nests a page under the parent its slug path names", async () => {
    mockDocs(["hub", "hub/science", "hub/recipes"], {
      hub: page("Hub"),
      "hub/science": page("Science"),
      "hub/recipes": page("Recipes"),
    });

    const nav = await buildDocsNav();
    expect(nav.map((node) => node.slug)).toEqual(["hub"]);
    expect(nav[0].children.map((node) => node.slug)).toEqual(["hub/science", "hub/recipes"]);
  });

  it("nests a child listed before its parent", async () => {
    mockDocs(["hub/science", "hub"], { hub: page("Hub"), "hub/science": page("Science") });

    const nav = await buildDocsNav();
    expect(nav.map((node) => node.slug)).toEqual(["hub"]);
    expect(nav[0].children.map((node) => node.slug)).toEqual(["hub/science"]);
  });

  // A directory of pages need not have a page of its own
  it("keeps a page at the root when the manifest lists no parent for it", async () => {
    mockDocs(["orphan/child"], { "orphan/child": page("Child") });

    const nav = await buildDocsNav();
    expect(nav.map((node) => node.slug)).toEqual(["orphan/child"]);
  });

  it("carries each page's title, description, and headings", async () => {
    mockDocs(["overview"], {
      overview: "---\ntitle: Overview\ndescription: What this is\n---\n# Overview\n\n## Crate",
    });

    const [node] = await buildDocsNav();
    expect(node.title).toBe("Overview");
    expect(node.description).toBe("What this is");
    expect(node.headings).toEqual([
      { id: "overview", text: "Overview", level: 1 },
      { id: "crate", text: "Crate", level: 2 },
    ]);
  });

  it("propagates the read error when a listed page does not exist", async () => {
    mockDocs(["missing"], {});

    await expect(buildDocsNav()).rejects.toThrow("ENOENT: missing");
  });
});
