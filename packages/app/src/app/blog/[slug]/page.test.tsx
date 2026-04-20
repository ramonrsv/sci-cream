import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));

vi.mock("@/lib/markdown", () => ({ getMarkdownPage: vi.fn(), getMarkdownSlugs: vi.fn() }));

const { default: BlogSlugPage, generateStaticParams, generateMetadata } = await import("./page");
const { getMarkdownPage, getMarkdownSlugs } = await import("@/lib/markdown");

// ---------------------------------------------------------------------------
// generateStaticParams
// ---------------------------------------------------------------------------

describe("generateStaticParams", () => {
  it("returns a param object for each slug", async () => {
    vi.mocked(getMarkdownSlugs).mockReturnValue(["post-a", "post-b"]);
    expect(await generateStaticParams()).toEqual([{ slug: "post-a" }, { slug: "post-b" }]);
    expect(getMarkdownSlugs).toHaveBeenCalledWith("blog");
  });
});

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

describe("generateMetadata", () => {
  it("returns title and description from frontmatter", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "my-post",
      frontmatter: { title: "My Post", description: "A great post" },
    });
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "my-post" }) });
    expect(metadata).toEqual({ title: "My Post", description: "A great post" });
  });

  it("returns an empty object when getMarkdownPage throws", async () => {
    vi.mocked(getMarkdownPage).mockRejectedValue(new Error("not found"));
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "missing" }) });
    expect(metadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// BlogSlugPage
// ---------------------------------------------------------------------------

describe("BlogSlugPage", () => {
  afterEach(() => cleanup());

  it("renders the post's HTML content", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "hello",
      frontmatter: { title: "Hello" },
      contentHtml: "<p>Hello world</p>",
    });
    render(await BlogSlugPage({ params: Promise.resolve({ slug: "hello" }) }));
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders the date when present in frontmatter", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "dated",
      frontmatter: { title: "Dated", date: "2026-03-10" },
      contentHtml: "<p>Content</p>",
    });
    render(await BlogSlugPage({ params: Promise.resolve({ slug: "dated" }) }));
    expect(screen.getByText("2026-03-10")).toBeInTheDocument();
  });

  it("omits the date element when date is absent from frontmatter", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "no-date",
      frontmatter: { title: "No Date" },
      contentHtml: "<p>Content</p>",
    });
    render(await BlogSlugPage({ params: Promise.resolve({ slug: "no-date" }) }));
    expect(screen.queryByRole("time")).not.toBeInTheDocument();
  });

  it("calls notFound when getMarkdownPage throws", async () => {
    vi.mocked(getMarkdownPage).mockRejectedValue(new Error("not found"));
    await expect(BlogSlugPage({ params: Promise.resolve({ slug: "missing" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockNotFound).toHaveBeenCalled();
  });
});
