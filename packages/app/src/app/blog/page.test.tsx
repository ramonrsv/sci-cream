import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/lib/markdown", () => ({ getMarkdownSummaries: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { default: BlogPage } = await import("./page");
const { getMarkdownSummaries } = await import("@/lib/markdown");

// ---------------------------------------------------------------------------
// BlogPage
// ---------------------------------------------------------------------------

describe("BlogPage", () => {
  afterEach(() => cleanup());

  it('renders the "Blog" heading', () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([]);
    render(<BlogPage />);
    expect(screen.getByRole("heading", { name: "Blog" })).toBeInTheDocument();
  });

  it("renders a link for each post", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([
      { slug: "first-post", frontmatter: { title: "First Post" } },
      { slug: "second-post", frontmatter: { title: "Second Post" } },
    ]);
    render(<BlogPage />);
    expect(screen.getByRole("link", { name: "First Post" })).toHaveAttribute(
      "href",
      "/blog/first-post",
    );
    expect(screen.getByRole("link", { name: "Second Post" })).toHaveAttribute(
      "href",
      "/blog/second-post",
    );
  });

  it("renders the date when present", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([
      { slug: "dated", frontmatter: { title: "Dated Post", date: "2026-01-15" } },
    ]);
    render(<BlogPage />);
    expect(screen.queryByRole("time")).toBeInTheDocument();
    expect(screen.getByText("2026-01-15")).toBeInTheDocument();
  });

  it("renders the description when present", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([
      {
        slug: "with-desc",
        frontmatter: { title: "With Description", description: "A short summary." },
      },
    ]);
    render(<BlogPage />);
    expect(screen.getByText("A short summary.")).toBeInTheDocument();
  });

  it("omits the date element when the date is absent", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([
      { slug: "no-date", frontmatter: { title: "No Date" } },
    ]);
    render(<BlogPage />);
    expect(screen.queryByRole("time")).not.toBeInTheDocument();
  });

  it("renders nothing in the list when there are no posts", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([]);
    render(<BlogPage />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
