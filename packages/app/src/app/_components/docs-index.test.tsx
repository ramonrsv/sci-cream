import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import type { DocsNavNode } from "@/lib/docs-nav";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { DocsIndex } = await import("./docs-index");

afterEach(() => cleanup());

/** A nav node carrying the fields the index renders. */
function node(
  slug: string,
  title: string,
  description?: string,
  children: DocsNavNode[] = [],
): DocsNavNode {
  return { slug, title, description, headings: [], children };
}

describe("DocsIndex", () => {
  it("links every page at its own route", () => {
    render(
      <DocsIndex
        nav={[
          node("background", "Background"),
          node("other-resources", "Other Resources", undefined, [
            node("other-resources/science", "Science"),
          ]),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Background" })).toHaveAttribute(
      "href",
      "/docs/background",
    );
    expect(screen.getByRole("link", { name: "Science" })).toHaveAttribute(
      "href",
      "/docs/other-resources/science",
    );
  });

  // The blurbs come from frontmatter, so the index cannot drift from the pages it lists
  it("shows each page's description", () => {
    render(<DocsIndex nav={[node("background", "Background", "Where it began")]} />);

    expect(screen.getByText("Where it began")).toBeInTheDocument();
  });

  it("omits the description when a page has none", () => {
    const { container } = render(<DocsIndex nav={[node("background", "Background")]} />);

    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("nests a child page inside its parent's entry", () => {
    render(
      <DocsIndex
        nav={[
          node("other-resources", "Other Resources", undefined, [
            node("other-resources/science", "Science"),
          ]),
        ]}
      />,
    );

    const parent = screen.getByRole("link", { name: "Other Resources" }).closest("li")!;
    expect(within(parent).getByRole("link", { name: "Science" })).toBeInTheDocument();
  });

  it("renders a single heading, the page's own", () => {
    const { container } = render(<DocsIndex nav={[node("background", "Background")]} />);

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Documentation");
  });
});
