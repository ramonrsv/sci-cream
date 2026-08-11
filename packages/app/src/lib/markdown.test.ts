import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import fs from "fs";

import {
  getMarkdownSlugs,
  sortMarkdownPages,
  filterOutDrafts,
  getMarkdownSummaries,
  getMarkdownPage,
  getListedPages,
  getMarkdownComposite,
  type MarkdownPage,
} from "./markdown";

const existsSyncSpy = vi.spyOn(fs, "existsSync");
const readdirSyncSpy = vi.spyOn(fs, "readdirSync") as unknown as MockInstance<() => string[]>;
const readFileSyncSpy = vi.spyOn(fs, "readFileSync");

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getMarkdownSlugs
// ---------------------------------------------------------------------------

describe("getMarkdownSlugs", () => {
  it("throws when the directory does not exist", () => {
    existsSyncSpy.mockReturnValue(false);
    expect(() => getMarkdownSlugs("blog")).toThrow('Content section not found: "blog"');
  });

  it("returns slugs for all .md files in the directory", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["foo.md", "bar.md"]);
    expect(getMarkdownSlugs("blog")).toEqual(["foo", "bar"]);
  });

  it("ignores non-.md files", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["post.md", "image.png", "draft.txt"]);
    expect(getMarkdownSlugs("blog")).toEqual(["post"]);
  });

  it("returns an empty array when directory exists but has no .md files", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["README.txt"]);
    expect(getMarkdownSlugs("blog")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// sortMarkdownPages
// ---------------------------------------------------------------------------

describe("sortMarkdownPages", () => {
  it("sorts pages by date descending", () => {
    const pages: MarkdownPage[] = [
      { slug: "older", frontmatter: { title: "A", date: "2025-06-01" } },
      { slug: "newest", frontmatter: { title: "B", date: "2026-01-10" } },
      { slug: "middle", frontmatter: { title: "C", date: "2025-12-01" } },
    ];
    const sorted = sortMarkdownPages([...pages]);
    expect(sorted.map((p) => p.slug)).toEqual(["newest", "middle", "older"]);
  });

  it("pages without a date are sorted last and stably among themselves", () => {
    const pages: MarkdownPage[] = [
      { slug: "no-meta-1", frontmatter: { title: "Z" } },
      { slug: "dated", frontmatter: { title: "A", date: "2025-01-01" } },
      { slug: "no-meta-2", frontmatter: { title: "Y" } },
    ];
    const sorted = sortMarkdownPages([...pages]);
    expect(sorted.map((p) => p.slug)).toEqual(["dated", "no-meta-1", "no-meta-2"]);
  });

  it("returns an empty array when given an empty array", () => {
    expect(sortMarkdownPages([])).toEqual([]);
  });

  it("returns a single item unchanged", () => {
    const page: MarkdownPage = { slug: "only", frontmatter: { title: "Only" } };
    expect(sortMarkdownPages([page])).toEqual([page]);
  });
});

// ---------------------------------------------------------------------------
// filterOutDrafts
// ---------------------------------------------------------------------------

describe("filterOutDrafts", () => {
  it("removes pages with draft: true", () => {
    const pages: MarkdownPage[] = [
      { slug: "published", frontmatter: { title: "Published" } },
      { slug: "draft", frontmatter: { title: "Draft", draft: true } },
    ];
    expect(filterOutDrafts(pages).map((p) => p.slug)).toEqual(["published"]);
  });

  it("keeps pages with draft: false", () => {
    const pages: MarkdownPage[] = [{ slug: "a", frontmatter: { title: "A", draft: false } }];
    expect(filterOutDrafts(pages)).toHaveLength(1);
  });

  it("keeps pages with no draft field", () => {
    const pages: MarkdownPage[] = [{ slug: "a", frontmatter: { title: "A" } }];
    expect(filterOutDrafts(pages)).toHaveLength(1);
  });

  it("returns an empty array when all pages are drafts", () => {
    const pages: MarkdownPage[] = [
      { slug: "a", frontmatter: { title: "A", draft: true } },
      { slug: "b", frontmatter: { title: "B", draft: true } },
    ];
    expect(filterOutDrafts(pages)).toEqual([]);
  });

  it("returns an empty array when given an empty array", () => {
    expect(filterOutDrafts([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMarkdownSummaries
// ---------------------------------------------------------------------------

describe("getMarkdownSummaries", () => {
  it("excludes pages with draft: true", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["post.md", "wip.md"]);
    readFileSyncSpy.mockImplementation((filePath: unknown) => {
      if (String(filePath).includes("wip")) {
        return "---\ntitle: WIP\ndraft: true\n---\nNot ready";
      }
      return "---\ntitle: Published\n---\nReady";
    });

    const summaries = getMarkdownSummaries("blog");
    expect(summaries).toHaveLength(1);
    expect(summaries[0].slug).toBe("post");
  });

  it("returns summaries sorted by date, newest first", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["older.md", "newer.md"]);
    readFileSyncSpy.mockImplementation((filePath: unknown) => {
      if (String(filePath).includes("newer")) {
        return '---\ntitle: Newer\ndate: "2026-02-01"\n---\nContent B';
      }
      return '---\ntitle: Older\ndate: "2026-01-01"\n---\nContent A';
    });

    const summaries = getMarkdownSummaries("blog");
    expect(summaries.map((s) => s.frontmatter.title)).toEqual(["Newer", "Older"]);
  });

  it("throws when the directory does not exist", () => {
    existsSyncSpy.mockReturnValue(false);
    expect(() => getMarkdownSummaries("missing")).toThrow('Content section not found: "missing"');
  });

  it("parses frontmatter correctly and omits contentHtml", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["post.md"]);
    readFileSyncSpy.mockReturnValue(
      '---\ntitle: My Post\ndate: "2026-01-10"\ndescription: Hello\n---\nBody text',
    );

    const [summary] = getMarkdownSummaries("blog");
    expect(summary.slug).toBe("post");
    expect(summary.frontmatter.title).toBe("My Post");
    expect(summary.frontmatter.date).toBe("2026-01-10");
    expect(summary.frontmatter.description).toBe("Hello");
    expect(summary.contentHtml).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getMarkdownPage
// ---------------------------------------------------------------------------

describe("getMarkdownPage", () => {
  it("parses frontmatter and returns the slug", async () => {
    readFileSyncSpy.mockReturnValue(
      '---\ntitle: Welcome\ndate: "2026-01-10"\n---\n# Welcome\n\nHello world.',
    );

    const page = await getMarkdownPage("blog", "welcome");
    expect(page.slug).toBe("welcome");
    expect(page.frontmatter.title).toBe("Welcome");
    expect(page.frontmatter.date).toBe("2026-01-10");
  });

  it("converts markdown body to HTML", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n# Heading\n\nA paragraph.");

    const page = await getMarkdownPage("blog", "test");
    expect(page.contentHtml).toContain("<h1 id=");
    expect(page.contentHtml).toContain("Heading");
    expect(page.contentHtml).toContain("<p>");
    expect(page.contentHtml).toContain("A paragraph.");
  });

  it("returns an empty contentHtml string for files with no body", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Empty\n---\n");

    const page = await getMarkdownPage("blog", "empty");
    expect(page.contentHtml).toBe("");
  });

  it("handles files with no frontmatter", async () => {
    readFileSyncSpy.mockReturnValue("Just plain markdown, no frontmatter.");

    const page = await getMarkdownPage("blog", "no-frontmatter");
    expect(page.slug).toBe("no-frontmatter");
    expect(page.contentHtml).toContain("Just plain markdown");
  });

  it("adds id attributes to headings", async () => {
    readFileSyncSpy.mockReturnValue(
      "---\ntitle: Test\n---\n## My Section Title\n\n### Sub Section",
    );

    const page = await getMarkdownPage("blog", "test");
    expect(page.contentHtml).toContain('<h2 id="my-section-title">');
    expect(page.contentHtml).toContain('<h3 id="sub-section">');
  });

  it("leaves headings and links untouched when given no render options", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n# Title\n\n[Other](/docs/other)");

    const page = await getMarkdownPage("docs", "test");
    expect(page.contentHtml).toContain('<h1 id="title">');
    expect(page.contentHtml).toContain('href="/docs/other"');
  });

  it("demotes headings by the requested number of levels", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n# Title\n\n## Section");

    const page = await getMarkdownPage("docs", "test", { demoteHeadings: 1 });
    expect(page.contentHtml).toContain('<h2 id="title">');
    expect(page.contentHtml).toContain('<h3 id="section">');
  });

  it("clamps demoted headings at h6", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n##### Deep\n\n###### Deeper");

    const page = await getMarkdownPage("docs", "test", { demoteHeadings: 3 });
    expect(page.contentHtml).toContain('<h6 id="deep">');
    expect(page.contentHtml).toContain('<h6 id="deeper">');
  });

  it("prefixes heading ids, keeping anchors unique across concatenated pages", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n## Underbelly");

    const page = await getMarkdownPage("docs", "recipes", { idPrefix: "recipes" });
    expect(page.contentHtml).toContain('<h2 id="recipes-underbelly">');
  });

  it("rewrites links to listed slugs into anchors, leaving every other link alone", async () => {
    readFileSyncSpy.mockReturnValue(
      "---\ntitle: Test\n---\n[Recipes](/docs/recipes) [Science](/docs/science) " +
        "[Blog](/blog/post) [Deep](/docs/recipes#underbelly) " +
        "[Ext](https://example.com/docs/recipes)",
    );

    const page = await getMarkdownPage("docs", "test", { anchorSlugs: ["recipes"] });
    expect(page.contentHtml).toContain('href="#recipes"');
    // Not listed, so it keeps pointing at its own route rather than dangling as an anchor
    expect(page.contentHtml).toContain('href="/docs/science"');
    // Only bare `/docs/{slug}` links are rewritten; everything else is left alone
    expect(page.contentHtml).toContain('href="/blog/post"');
    expect(page.contentHtml).toContain('href="/docs/recipes#underbelly"');
    expect(page.contentHtml).toContain('href="https://example.com/docs/recipes"');
  });

  it("leaves same-section links alone when no slugs are listed", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n[Recipes](/docs/recipes)");

    const page = await getMarkdownPage("docs", "test");
    expect(page.contentHtml).toContain('href="/docs/recipes"');
  });
});

// ---------------------------------------------------------------------------
// getListedPages
// ---------------------------------------------------------------------------

describe("getListedPages", () => {
  it("returns the slugs listed in frontmatter, in order", () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: ToC\npages: [charlie, alpha]\n---\nBody");

    expect(getListedPages("docs", "table-of-content")).toEqual(["charlie", "alpha"]);
  });

  it("returns an empty array when the page lists none", () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Plain\n---\nBody");

    expect(getListedPages("docs", "plain")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMarkdownComposite
// ---------------------------------------------------------------------------

describe("getMarkdownComposite", () => {
  /** Serve each slug its own file, so composites can be assembled from the mocked fs. */
  function mockSection(files: Record<string, string>) {
    readFileSyncSpy.mockImplementation((filePath: unknown) => {
      const slug = String(filePath).replace(/^.*\//, "").replace(/\.md$/, "");
      return files[slug] ?? `---\ntitle: ${slug}\n---\n# ${slug}`;
    });
  }

  it("returns the page first, then the pages it lists, in order", async () => {
    mockSection({ index: "---\ntitle: Index\npages: [beta, alpha]\n---\n# Index" });

    const pages = await getMarkdownComposite("docs", "index");
    expect(pages.map((p) => p.slug)).toEqual(["index", "beta", "alpha"]);
  });

  it("returns just the page when it lists none", async () => {
    mockSection({ solo: "---\ntitle: Solo\n---\n# Solo" });

    const pages = await getMarkdownComposite("docs", "solo");
    expect(pages.map((p) => p.slug)).toEqual(["solo"]);
  });

  it("demotes listed pages a level and prefixes their ids, not the first page", async () => {
    mockSection({
      index: "---\ntitle: Index\npages: [alpha]\n---\n# Index",
      alpha: "---\ntitle: Alpha\n---\n# Alpha\n\n## Section",
    });

    const [index, alpha] = await getMarkdownComposite("docs", "index");
    expect(index.contentHtml).toContain('<h1 id="index">');
    expect(alpha.contentHtml).toContain('<h2 id="alpha-alpha">');
    expect(alpha.contentHtml).toContain('<h3 id="alpha-section">');
  });

  it("turns links to listed pages into anchors, in every page of the composite", async () => {
    mockSection({
      index: "---\ntitle: Index\npages: [alpha]\n---\n[A](/docs/alpha) [B](/docs/beta)",
      alpha: "---\ntitle: Alpha\n---\n[A](/docs/alpha) [B](/docs/beta)",
    });

    const [index, alpha] = await getMarkdownComposite("docs", "index");
    for (const page of [index, alpha]) {
      expect(page.contentHtml).toContain('href="#alpha"');
      // `beta` is not part of this composite, so its link still points at its own route
      expect(page.contentHtml).toContain('href="/docs/beta"');
    }
  });

  it("expands one level: a listed page's own list belongs to its own route", async () => {
    mockSection({
      index: "---\ntitle: Index\npages: [alpha]\n---\n# Index",
      alpha: "---\ntitle: Alpha\npages: [beta]\n---\n# Alpha",
    });

    const pages = await getMarkdownComposite("docs", "index");
    expect(pages.map((p) => p.slug)).toEqual(["index", "alpha"]);
  });
});
