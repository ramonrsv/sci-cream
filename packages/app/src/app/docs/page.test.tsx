import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Only the loaders are stubbed; `slugToId` stays real, so article ids match production
vi.mock("@/lib/markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/markdown")>()),
  getMarkdownPage: vi.fn(),
  getMarkdownComposite: vi.fn(),
}));

const { default: DocsPage, generateMetadata } = await import("./page");
const { getMarkdownPage, getMarkdownComposite } = await import("@/lib/markdown");

/** Build a composite of stub pages, so ordering is observable in the rendered output. */
function mockComposite(...slugs: string[]) {
  vi.mocked(getMarkdownComposite).mockResolvedValue(
    slugs.map((slug) => ({
      slug,
      frontmatter: { title: slug },
      contentHtml: `<h2>${slug} body</h2>`,
    })),
  );
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

describe("generateMetadata", () => {
  it("returns title and description from the table of contents' frontmatter", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "table-of-content",
      frontmatter: { title: "Docs", description: "Index of the documentation." },
    });
    const metadata = await generateMetadata();
    expect(metadata).toEqual({ title: "Docs", description: "Index of the documentation." });
    expect(getMarkdownPage).toHaveBeenCalledWith("docs", "table-of-content");
  });
});

// ---------------------------------------------------------------------------
// DocsPage
// ---------------------------------------------------------------------------

describe("DocsPage", () => {
  afterEach(() => cleanup());

  it("renders the table of contents composite, one article per page, in order", async () => {
    mockComposite("table-of-content", "getting-started", "recipes");

    const { container } = render(await DocsPage());
    const articles = container.querySelectorAll("article");
    expect([...articles].map((a) => a.id)).toEqual([
      "table-of-content",
      "getting-started",
      "recipes",
    ]);
    expect(screen.getByText("recipes body")).toBeInTheDocument();
    expect(getMarkdownComposite).toHaveBeenCalledWith("docs", "table-of-content");
  });

  it("renders a single article when the table of contents lists no pages", async () => {
    mockComposite("table-of-content");

    const { container } = render(await DocsPage());
    expect(container.querySelectorAll("article")).toHaveLength(1);
  });

  it("propagates the error when the table of contents is missing", async () => {
    vi.mocked(getMarkdownComposite).mockRejectedValue(new Error("ENOENT"));
    await expect(DocsPage()).rejects.toThrow("ENOENT");
  });
});
