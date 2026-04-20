import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));

vi.mock("@/lib/markdown", () => ({ getMarkdownPage: vi.fn(), getMarkdownSlugs: vi.fn() }));

const { default: DocsSlugPage, generateStaticParams, generateMetadata } = await import("./page");
const { getMarkdownPage, getMarkdownSlugs } = await import("@/lib/markdown");

// ---------------------------------------------------------------------------
// generateStaticParams
// ---------------------------------------------------------------------------

describe("generateStaticParams", () => {
  it("returns a param object for each slug", async () => {
    vi.mocked(getMarkdownSlugs).mockReturnValue(["intro", "advanced"]);
    expect(await generateStaticParams()).toEqual([{ slug: "intro" }, { slug: "advanced" }]);
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
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "intro" }) });
    expect(metadata).toEqual({ title: "Introduction", description: "Get started here." });
  });

  it("returns an empty object when getMarkdownPage throws", async () => {
    vi.mocked(getMarkdownPage).mockRejectedValue(new Error("not found"));
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "missing" }) });
    expect(metadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// DocsSlugPage
// ---------------------------------------------------------------------------

describe("DocsSlugPage", () => {
  afterEach(() => cleanup());

  it("renders the page's HTML content", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "intro",
      frontmatter: { title: "Introduction" },
      contentHtml: "<p>Welcome to the docs.</p>",
    });
    render(await DocsSlugPage({ params: Promise.resolve({ slug: "intro" }) }));
    expect(screen.getByText("Welcome to the docs.")).toBeInTheDocument();
  });

  it("calls notFound when getMarkdownPage throws", async () => {
    vi.mocked(getMarkdownPage).mockRejectedValue(new Error("not found"));
    await expect(DocsSlugPage({ params: Promise.resolve({ slug: "missing" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockNotFound).toHaveBeenCalled();
  });
});
