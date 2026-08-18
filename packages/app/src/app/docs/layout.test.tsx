import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import type { DocsNavNode } from "@/lib/docs";

vi.mock("@/lib/docs-nav", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-nav")>()),
  getDocsNav: vi.fn(),
}));

vi.mock("@/app/_components/docs-toc", () => ({
  DocsToc: ({ nav }: { nav: DocsNavNode[] }) => (
    <div data-testid="docs-toc">{nav.map((node) => node.slug).join(",")}</div>
  ),
}));

const { default: DocsLayout } = await import("./layout");
const { getDocsNav } = await import("@/lib/docs-nav");

afterEach(() => cleanup());

describe("DocsLayout", () => {
  it("renders the page beside a table of contents built from the nav tree", async () => {
    vi.mocked(getDocsNav).mockResolvedValue([
      { slug: "background", title: "Background", headings: [], children: [] },
      { slug: "overview", title: "Overview", headings: [], children: [] },
    ]);

    render(await DocsLayout({ children: <p>page body</p> }));

    expect(screen.getByTestId("docs-toc")).toHaveTextContent("background,overview");
    expect(screen.getByText("page body")).toBeInTheDocument();
  });
});
