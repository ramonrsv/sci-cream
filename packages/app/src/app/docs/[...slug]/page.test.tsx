import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));

vi.mock("@/lib/markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/markdown")>()),
  getMarkdownPage: vi.fn(),
  getMarkdownSlugs: vi.fn(),
}));

// The thread is a client island that reaches for the session and the database; these tests cover
// the page's markdown rendering, so it is stubbed down to the subject it was handed.
vi.mock("@/app/_components/comment-thread", () => ({
  CommentThread: ({ subject }: { subject: { type: string; key: string } }) => (
    <div data-testid="comment-thread" data-subject={`${subject.type}/${subject.key}`} />
  ),
}));

const { default: DocsSlugPage, generateStaticParams, generateMetadata } = await import("./page");
const { getMarkdownPage, getMarkdownSlugs } = await import("@/lib/markdown");

afterEach(() => cleanup());

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
  it("renders the page's HTML content, and only that page", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "other-resources",
      frontmatter: { title: "Other Resources" },
      contentHtml: "<p>Welcome to the docs.</p>",
    });

    const { container } = render(
      await DocsSlugPage({ params: Promise.resolve({ slug: ["other-resources"] }) }),
    );
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(screen.getByText("Welcome to the docs.")).toBeInTheDocument();
    expect(getMarkdownPage).toHaveBeenCalledWith("docs", "other-resources");
  });

  it("joins nested segments back into a slug", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "other-resources/science",
      frontmatter: { title: "Science" },
      contentHtml: "<p>S</p>",
    });
    render(
      await DocsSlugPage({ params: Promise.resolve({ slug: ["other-resources", "science"] }) }),
    );
    expect(getMarkdownPage).toHaveBeenCalledWith("docs", "other-resources/science");
  });

  it("mounts the comment thread keyed on the route's own joined slug", async () => {
    vi.mocked(getMarkdownPage).mockResolvedValue({
      slug: "other-resources/science",
      frontmatter: { title: "Science" },
      contentHtml: "<p>S</p>",
    });
    render(
      await DocsSlugPage({ params: Promise.resolve({ slug: ["other-resources", "science"] }) }),
    );
    expect(screen.getByTestId("comment-thread")).toHaveAttribute(
      "data-subject",
      "docs/other-resources/science",
    );
  });

  it("calls notFound when the page does not exist", async () => {
    vi.mocked(getMarkdownPage).mockRejectedValue(new Error("not found"));
    await expect(DocsSlugPage({ params: Promise.resolve({ slug: ["missing"] }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockNotFound).toHaveBeenCalled();
  });
});
