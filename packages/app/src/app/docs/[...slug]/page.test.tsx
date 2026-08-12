import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));

// Only the loaders are stubbed; `slugToId` stays real, so article ids match production
vi.mock("@/lib/markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/markdown")>()),
  getMarkdownPage: vi.fn(),
  getMarkdownComposite: vi.fn(),
  getMarkdownSlugs: vi.fn(),
}));

const { default: DocsSlugPage, generateStaticParams, generateMetadata } = await import("./page");
const { getMarkdownPage, getMarkdownComposite, getMarkdownSlugs } = await import("@/lib/markdown");

// ---------------------------------------------------------------------------
// generateStaticParams
// ---------------------------------------------------------------------------

describe("generateStaticParams", () => {
  it("returns a param object for each slug, split into path segments", async () => {
    vi.mocked(getMarkdownSlugs).mockReturnValue(["intro", "other-resources/science"]);
    expect(await generateStaticParams()).toEqual([
      { slug: ["intro"] },
      { slug: ["other-resources", "science"] },
    ]);
    expect(getMarkdownSlugs).toHaveBeenCalledWith("docs");
  });
});

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

describe("generateMetadata", () => {
  it("returns title and description from frontmatter", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "intro",
      frontmatter: { title: "Introduction", description: "Get started here." },
    });
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: ["intro"] }) });
    expect(metadata).toEqual({ title: "Introduction", description: "Get started here." });
  });

  it("joins nested segments back into a slug", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "other-resources/science",
      frontmatter: { title: "Science" },
    });
    await generateMetadata({ params: Promise.resolve({ slug: ["other-resources", "science"] }) });
    expect(getMarkdownPage).toHaveBeenCalledWith("docs", "other-resources/science");
  });

  it("returns an empty object when getMarkdownPage throws", async () => {
    vi.mocked(getMarkdownPage).mockRejectedValue(new Error("not found"));
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: ["missing"] }) });
    expect(metadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// DocsSlugPage
// ---------------------------------------------------------------------------

describe("DocsSlugPage", () => {
  afterEach(() => cleanup());

  it("renders the page's HTML content", async () => {
    vi.mocked(getMarkdownComposite).mockResolvedValue([
      {
        slug: "intro",
        frontmatter: { title: "Introduction" },
        contentHtml: "<p>Welcome to the docs.</p>",
      },
    ]);
    render(await DocsSlugPage({ params: Promise.resolve({ slug: ["intro"] }) }));
    expect(screen.getByText("Welcome to the docs.")).toBeInTheDocument();
  });

  it("renders the pages the page lists, after it and in order", async () => {
    const slugs = ["other-resources", "other-resources/science", "other-resources/recipes"];
    vi.mocked(getMarkdownComposite).mockResolvedValue(
      slugs.map((slug) => ({
        slug,
        frontmatter: { title: slug },
        contentHtml: `<h2>${slug} body</h2>`,
      })),
    );
    const { container } = render(
      await DocsSlugPage({ params: Promise.resolve({ slug: ["other-resources"] }) }),
    );
    // Article ids are slash-free, so they can be targeted as fragments
    expect([...container.querySelectorAll("article")].map((a) => a.id)).toEqual([
      "other-resources",
      "other-resources-science",
      "other-resources-recipes",
    ]);
    expect(getMarkdownComposite).toHaveBeenCalledWith("docs", "other-resources");
  });

  it("joins nested segments back into a slug", async () => {
    vi.mocked(getMarkdownComposite).mockResolvedValue([
      {
        slug: "other-resources/science",
        frontmatter: { title: "Science" },
        contentHtml: "<p>S</p>",
      },
    ]);
    render(
      await DocsSlugPage({ params: Promise.resolve({ slug: ["other-resources", "science"] }) }),
    );
    expect(getMarkdownComposite).toHaveBeenCalledWith("docs", "other-resources/science");
  });

  it("calls notFound when the page does not exist", async () => {
    vi.mocked(getMarkdownComposite).mockRejectedValue(new Error("not found"));
    await expect(DocsSlugPage({ params: Promise.resolve({ slug: ["missing"] }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockNotFound).toHaveBeenCalled();
  });
});
