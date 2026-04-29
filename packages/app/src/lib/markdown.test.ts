import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import fs from "fs";

import {
  getMarkdownSlugs,
  sortMarkdownPages,
  filterOutDrafts,
  getMarkdownSummaries,
  getMarkdownPage,
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
  it("sorts pages with order before pages without order", () => {
    const pages: MarkdownPage[] = [
      { slug: "no-order", frontmatter: { title: "B", date: "2026-01-01" } },
      { slug: "has-order", frontmatter: { title: "A", order: 1 } },
    ];
    const sorted = sortMarkdownPages([...pages]);
    expect(sorted[0].slug).toBe("has-order");
    expect(sorted[1].slug).toBe("no-order");
  });

  it("sorts pages with order ascending by order value", () => {
    const pages: MarkdownPage[] = [
      { slug: "third", frontmatter: { title: "C", order: 3 } },
      { slug: "first", frontmatter: { title: "A", order: 1 } },
      { slug: "second", frontmatter: { title: "B", order: 2 } },
    ];
    const sorted = sortMarkdownPages([...pages]);
    expect(sorted.map((p) => p.slug)).toEqual(["first", "second", "third"]);
  });

  it("sorts pages without order by date descending", () => {
    const pages: MarkdownPage[] = [
      { slug: "older", frontmatter: { title: "A", date: "2025-06-01" } },
      { slug: "newest", frontmatter: { title: "B", date: "2026-01-10" } },
      { slug: "middle", frontmatter: { title: "C", date: "2025-12-01" } },
    ];
    const sorted = sortMarkdownPages([...pages]);
    expect(sorted.map((p) => p.slug)).toEqual(["newest", "middle", "older"]);
  });

  it("pages without order or date are sorted last and stably among themselves", () => {
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

  it("returns summaries sorted by order", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["beta.md", "alpha.md"]);
    readFileSyncSpy.mockImplementation((filePath: unknown) => {
      if (String(filePath).includes("beta")) {
        return "---\ntitle: Beta\norder: 2\n---\nContent B";
      }
      return "---\ntitle: Alpha\norder: 1\n---\nContent A";
    });

    const summaries = getMarkdownSummaries("docs");
    expect(summaries.map((s) => s.frontmatter.title)).toEqual(["Alpha", "Beta"]);
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
});
