import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import type { DocsNavNode } from "@/lib/docs";

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

/** The index of `nav` under the docs landing page's title, for cases about its entries. */
function renderIndex(nav: DocsNavNode[]) {
  return render(<DocsIndex title="Documentation" nav={nav} />);
}

describe("DocsIndex", () => {
  it("links every page at its own route", () => {
    renderIndex([
      node("background", "Background"),
      node("other-resources", "Other Resources", undefined, [
        node("other-resources/science", "Science"),
      ]),
    ]);

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
    renderIndex([node("background", "Background", "Where it began")]);

    expect(screen.getByText("Where it began")).toBeInTheDocument();
  });

  it("omits the description when a page has none", () => {
    const { container } = renderIndex([node("background", "Background")]);

    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("nests a child page inside its parent's entry", () => {
    renderIndex([
      node("other-resources", "Other Resources", undefined, [
        node("other-resources/science", "Science"),
      ]),
    ]);

    const parent = screen.getByRole("link", { name: "Other Resources" }).closest("li")!;
    expect(within(parent).getByRole("link", { name: "Science" })).toBeInTheDocument();
  });

  // The Reference's chapters nest two deep under it in the docs index
  it("nests a grandchild inside its parent's entry, in turn inside its own parent's", () => {
    renderIndex([
      node("reference", "Science Reference", undefined, [
        node("reference/sweeteners", "Sweeteners", undefined, [
          node("reference/sweeteners/sugars", "Sugars"),
        ]),
      ]),
    ]);

    const parent = screen.getByRole("link", { name: "Sweeteners" }).closest("li")!;
    const grandparent = screen.getByRole("link", { name: "Science Reference" }).closest("li")!;
    expect(within(parent).getByRole("link", { name: "Sugars" })).toBeInTheDocument();
    expect(grandparent.contains(parent)).toBe(true);
  });

  it("renders a single heading, the title it was given", () => {
    const { container } = render(
      <DocsIndex title="Science Reference" nav={[node("reference/dairy", "Dairy")]} />,
    );

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Science Reference");
  });

  it("leads with the description it was given, before the first entry", () => {
    render(
      <DocsIndex
        title="Science Reference"
        description="In-depth ice cream science."
        nav={[node("reference/dairy", "Dairy", "Milk fat and MSNF.")]}
      />,
    );

    const lead = screen.getByText("In-depth ice cream science.");
    const entry = screen.getByText("Milk fat and MSNF.");
    expect(lead.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lead.closest("li")).toBeNull();
  });
});
