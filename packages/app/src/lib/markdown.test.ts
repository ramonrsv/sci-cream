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

  it("returns nested files as slash-separated slugs, skipping the directories", () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue([
      "other-resources.md",
      "other-resources",
      "other-resources/science.md",
    ]);
    expect(getMarkdownSlugs("docs")).toEqual(["other-resources", "other-resources/science"]);
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

  it("leaves links untouched, every page being served on its own route", async () => {
    readFileSyncSpy.mockReturnValue(
      "---\ntitle: Test\n---\n# Title\n\n[Other](/docs/other) " +
        "[Deep](/docs/other-resources/science#underbelly) [Blog](/blog/post) " +
        "[Ext](https://example.com/docs/recipes)",
    );

    const page = await getMarkdownPage("docs", "test");
    expect(page.contentHtml).toContain('<h1 id="title">');
    expect(page.contentHtml).toContain('href="/docs/other"');
    expect(page.contentHtml).toContain('href="/docs/other-resources/science#underbelly"');
    expect(page.contentHtml).toContain('href="/blog/post"');
    expect(page.contentHtml).toContain('href="https://example.com/docs/recipes"');
  });

  it("appends a permalink to every heading", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n## My Section\n\n### Sub Section");

    const page = await getMarkdownPage("docs", "test");
    expect(page.contentHtml).toContain('<a class="heading-permalink"');
    expect(page.contentHtml).toContain('href="#my-section"');
    expect(page.contentHtml).toContain('href="#sub-section"');
  });

  it("rejects a slug that escapes the content root", async () => {
    await expect(getMarkdownPage("docs", "../../../etc/passwd")).rejects.toThrow(
      "escapes the content root",
    );
    expect(readFileSyncSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getMarkdownPage: collected headings
// ---------------------------------------------------------------------------

describe("getMarkdownPage headings", () => {
  it("collects every heading level, in document order", async () => {
    readFileSyncSpy.mockReturnValue(
      "---\ntitle: Test\n---\n# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six",
    );

    const page = await getMarkdownPage("docs", "test");
    expect(page.headings).toEqual([
      { id: "one", text: "One", level: 1 },
      { id: "two", text: "Two", level: 2 },
      { id: "three", text: "Three", level: 3 },
      { id: "four", text: "Four", level: 4 },
      { id: "five", text: "Five", level: 5 },
      { id: "six", text: "Six", level: 6 },
    ]);
  });

  it("flattens inline markup in the heading text", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n## `sci-cream` **crate**");

    const page = await getMarkdownPage("docs", "test");
    expect(page.headings).toEqual([{ id: "sci-cream-crate", text: "sci-cream crate", level: 2 }]);
  });

  it("returns an empty array for a body with no headings", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\nJust a paragraph.");

    const page = await getMarkdownPage("docs", "test");
    expect(page.headings).toEqual([]);
  });

  // Pins the collector's pipeline slot from both sides: the ids must be the rendered ones, and the
  // permalink `#` must not have been appended yet when the text is read.
  it("collects the ids the HTML carries, without the permalink marker in the text", async () => {
    readFileSyncSpy.mockReturnValue("---\ntitle: Test\n---\n## My Section");

    const page = await getMarkdownPage("docs", "test");
    // Ids match the rendered attributes, so collection runs after `rehype-slug`
    expect(page.contentHtml).toContain('<h2 id="my-section">');
    expect(page.headings).toEqual([{ id: "my-section", text: "My Section", level: 2 }]);
    // The permalink is in the HTML, but its `#` never reached the text: collection ran first
    expect(page.contentHtml).toContain('<a class="heading-permalink"');
    expect(page.headings?.every((heading) => !heading.text.includes("#"))).toBe(true);
  });
});
