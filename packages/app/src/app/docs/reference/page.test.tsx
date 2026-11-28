import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import type { DocsNavNode } from "@/lib/docs";

vi.mock("@/lib/docs-nav", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-nav")>()),
  getDocsNav: vi.fn(),
}));

interface IndexProps {
  title: string;
  description?: string;
  nav: DocsNavNode[];
}

vi.mock("@/app/_components/docs-index", () => ({
  DocsIndex: ({ title, description, nav }: IndexProps) => (
    <div data-testid="docs-index" data-title={title} data-description={description}>
      {nav.map((node) => node.slug).join(",")}
    </div>
  ),
}));

const { default: ReferencePage, metadata } = await import("./page");
const { getDocsNav } = await import("@/lib/docs-nav");
const { REFERENCE_FRONTMATTER } = await import("@/lib/docs-reference");

afterEach(() => cleanup());

/** A nav node with no headings, as the index lists it. */
function node(slug: string, title: string, children: DocsNavNode[] = []): DocsNavNode {
  return { slug, title, headings: [], children };
}

describe("metadata", () => {
  it("names the Reference as the docs nav does", () => {
    expect(metadata).toEqual({
      title: REFERENCE_FRONTMATTER.title,
      description: REFERENCE_FRONTMATTER.description,
    });
  });
});

describe("ReferencePage", () => {
  it("indexes the chapters the docs nav nests under the Reference, under its title", async () => {
    vi.mocked(getDocsNav).mockResolvedValue([
      node("overview", "Overview"),
      {
        ...node("reference", "Science Reference", [
          node("reference/sweeteners", "Sweeteners"),
          node("reference/dairy", "Dairy"),
        ]),
        description: "In depth",
      },
    ]);

    render(await ReferencePage());

    const index = screen.getByTestId("docs-index");
    expect(index).toHaveTextContent("reference/sweeteners,reference/dairy");
    expect(index).toHaveAttribute("data-title", "Science Reference");
    expect(index).toHaveAttribute("data-description", "In depth");
  });

  it("throws when the docs manifest leaves the Reference out", async () => {
    vi.mocked(getDocsNav).mockResolvedValue([node("overview", "Overview")]);

    await expect(ReferencePage()).rejects.toThrow('does not list "reference"');
  });
});
