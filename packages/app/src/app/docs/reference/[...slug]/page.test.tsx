import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));

vi.mock("@/lib/docs-reference", () => ({
  getReferencePage: vi.fn(),
  getReferenceChapterSlugs: vi.fn(),
}));

// The thread is a client island that reaches for the session and the database; these tests cover
// the chapter's rendering, so it is stubbed down to the subject it was handed.
vi.mock("@/app/_components/comment-thread", () => ({
  CommentThread: ({ subject }: { subject: { type: string; key: string } }) => (
    <div data-testid="comment-thread" data-subject={`${subject.type}/${subject.key}`} />
  ),
}));

const {
  default: ReferenceChapterPage,
  generateStaticParams,
  generateMetadata,
} = await import("./page");
const { getReferencePage, getReferenceChapterSlugs } = await import("@/lib/docs-reference");

afterEach(() => cleanup());

/** The Sugars chapter, as `getReferencePage` renders it: under its docs slug. */
const SUGARS = {
  slug: "reference/sweeteners/sugars",
  frontmatter: { title: "Sugars", description: "Mono- and disaccharides." },
  contentHtml: '<h1 id="sugars">Sugars</h1><p>Sweet.</p>',
  headings: [{ id: "sugars", text: "Sugars", level: 1 }],
};

/** The route's params for the Sugars chapter. */
const sugarsParams = () => ({ params: Promise.resolve({ slug: ["sweeteners", "sugars"] }) });

// ---------------------------------------------------------------------------
// generateStaticParams
// ---------------------------------------------------------------------------

describe("generateStaticParams", () => {
  it("returns a param object for each chapter, split into path segments", async () => {
    vi.mocked(getReferenceChapterSlugs).mockReturnValue(["sweeteners", "sweeteners/sugars"]);
    expect(await generateStaticParams()).toEqual([
      { slug: ["sweeteners"] },
      { slug: ["sweeteners", "sugars"] },
    ]);
  });
});

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

describe("generateMetadata", () => {
  it("returns the chapter's title and description, joining nested segments back", async () => {
    vi.mocked(getReferencePage).mockResolvedValue(SUGARS);
    const metadata = await generateMetadata(sugarsParams());
    expect(metadata).toEqual({ title: "Sugars", description: "Mono- and disaccharides." });
    expect(getReferencePage).toHaveBeenCalledWith("sweeteners/sugars");
  });

  it("returns an empty object for a slug no chapter has", async () => {
    vi.mocked(getReferencePage).mockResolvedValue(undefined);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: ["missing"] }) });
    expect(metadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// ReferenceChapterPage
// ---------------------------------------------------------------------------

describe("ReferenceChapterPage", () => {
  it("renders the chapter's HTML, and only that chapter", async () => {
    vi.mocked(getReferencePage).mockResolvedValue(SUGARS);

    const { container } = render(await ReferenceChapterPage(sugarsParams()));
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(screen.getByText("Sweet.")).toBeInTheDocument();
    expect(getReferencePage).toHaveBeenCalledWith("sweeteners/sugars");
  });

  // Keyed on the docs slug, so the thread's sign-in link returns to the chapter's own route
  it("mounts the comment thread keyed on the chapter's docs slug", async () => {
    vi.mocked(getReferencePage).mockResolvedValue(SUGARS);

    render(await ReferenceChapterPage(sugarsParams()));
    expect(screen.getByTestId("comment-thread")).toHaveAttribute(
      "data-subject",
      "docs/reference/sweeteners/sugars",
    );
  });

  it("calls notFound for a slug no chapter has", async () => {
    vi.mocked(getReferencePage).mockResolvedValue(undefined);
    await expect(
      ReferenceChapterPage({ params: Promise.resolve({ slug: ["missing"] }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
