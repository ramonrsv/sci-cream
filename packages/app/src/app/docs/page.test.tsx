import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/lib/markdown", () => ({ getMarkdownSummaries: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { default: DocsPage } = await import("./page");
const { getMarkdownSummaries } = await import("@/lib/markdown");

// ---------------------------------------------------------------------------
// DocsPage
// ---------------------------------------------------------------------------

describe("DocsPage", () => {
  afterEach(() => cleanup());

  it('renders the "Documentation" heading', () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([]);
    render(<DocsPage />);
    expect(screen.getByRole("heading", { name: "Documentation" })).toBeInTheDocument();
  });

  it("renders a link for each doc page", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([
      { slug: "getting-started", frontmatter: { title: "Getting Started" } },
      { slug: "advanced", frontmatter: { title: "Advanced Usage" } },
    ]);
    render(<DocsPage />);
    expect(screen.getByRole("link", { name: "Getting Started" })).toHaveAttribute(
      "href",
      "/docs/getting-started",
    );
    expect(screen.getByRole("link", { name: "Advanced Usage" })).toHaveAttribute(
      "href",
      "/docs/advanced",
    );
  });

  it("renders the description when present", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([
      {
        slug: "with-desc",
        frontmatter: { title: "With Description", description: "Describes the topic." },
      },
    ]);
    render(<DocsPage />);
    expect(screen.getByText("Describes the topic.")).toBeInTheDocument();
  });

  it("omits the description element when description is absent", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([
      { slug: "no-desc", frontmatter: { title: "No Description" } },
    ]);
    render(<DocsPage />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("renders nothing in the list when there are no doc pages", () => {
    vi.mocked(getMarkdownSummaries).mockReturnValue([]);
    render(<DocsPage />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
