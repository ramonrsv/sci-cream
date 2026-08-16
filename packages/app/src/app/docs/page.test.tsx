import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import type { DocsNavNode } from "@/lib/docs-nav";

vi.mock("@/lib/docs-nav", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-nav")>()),
  getDocsNav: vi.fn(),
}));

vi.mock("@/app/_components/docs-index", () => ({
  DocsIndex: ({ nav }: { nav: DocsNavNode[] }) => (
    <div data-testid="docs-index">{nav.map((node) => node.slug).join(",")}</div>
  ),
}));

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
  it("renders the index from the nav tree", async () => {
    vi.mocked(getDocsNav).mockResolvedValue([
      { slug: "background", title: "Background", headings: [], children: [] },
      { slug: "overview", title: "Overview", headings: [], children: [] },
    ]);

    render(await DocsPage());

    expect(screen.getByTestId("docs-index")).toHaveTextContent("background,overview");
  });
});
