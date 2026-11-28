import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import type { DocsNavNode } from "@/lib/docs";

vi.mock("@/lib/docs-nav", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-nav")>()),
  getDocsNav: vi.fn(),
}));

// Lists every slug it was handed, nested ones included, so the pages left out are observable
vi.mock("@/app/_components/docs-index", () => {
  const slugs = (nodes: DocsNavNode[]): string[] =>
    nodes.flatMap((node) => [node.slug, ...slugs(node.children)]);
  return {
    DocsIndex: ({ title, nav }: { title: string; nav: DocsNavNode[] }) => (
      <div data-testid="docs-index" data-title={title}>
        {slugs(nav).join(",")}
      </div>
    ),
  };
});

const { default: DocsPage, metadata } = await import("./page");
const { getDocsNav } = await import("@/lib/docs-nav");

afterEach(() => cleanup());

describe("metadata", () => {
  it("names the section, there being no markdown frontmatter to take it from", () => {
    expect(metadata.title).toBe("Documentation");
    expect(metadata.description).toBeDefined();
  });
});

describe("DocsPage", () => {
  it("renders the index from the nav tree, under the metadata's title", async () => {
    vi.mocked(getDocsNav).mockResolvedValue([
      { slug: "background", title: "Background", headings: [], children: [] },
      { slug: "overview", title: "Overview", headings: [], children: [] },
    ]);

    render(await DocsPage());

    expect(screen.getByTestId("docs-index")).toHaveTextContent("background,overview");
    expect(screen.getByTestId("docs-index")).toHaveAttribute("data-title", "Documentation");
  });

  // As the sidebar lists them outside any branch, a branch's pages being found from its own page
  it("lists only the top-level pages, leaving the shared nav tree intact", async () => {
    const nav: DocsNavNode[] = [
      { slug: "overview", title: "Overview", headings: [], children: [] },
      {
        slug: "other-resources",
        title: "Other Resources",
        headings: [],
        children: [
          { slug: "other-resources/science", title: "Science", headings: [], children: [] },
        ],
      },
    ];
    vi.mocked(getDocsNav).mockResolvedValue(nav);

    render(await DocsPage());

    expect(screen.getByTestId("docs-index")).toHaveTextContent(/^overview,other-resources$/);
    // The layout's sidebar reads the same cached tree
    expect(nav[1].children.map((node) => node.slug)).toEqual(["other-resources/science"]);
  });
});
