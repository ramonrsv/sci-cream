import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DocsNavNode } from "@/lib/docs";

let mockPathname = "/docs";

vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { DocsToc } = await import("./docs-toc");

/** Two roots, one with a child page, and headings spanning a listed and an unlisted level. */
function sampleNav(): DocsNavNode[] {
  return [
    {
      slug: "overview",
      title: "Overview",
      headings: [
        { id: "crate", text: "Crate", level: 2 },
        { id: "internals", text: "Internals", level: 4 },
      ],
      children: [],
    },
    {
      slug: "other-resources",
      title: "Other Resources",
      headings: [{ id: "sources", text: "Sources", level: 2 }],
      children: [
        {
          slug: "other-resources/science",
          title: "Science",
          headings: [{ id: "underbelly", text: "Underbelly", level: 2 }],
          children: [],
        },
      ],
    },
  ];
}

beforeEach(() => {
  mockPathname = "/docs";
});

afterEach(() => cleanup());

describe("DocsToc", () => {
  it("links every page in the tree, nested pages included", () => {
    render(<DocsToc nav={sampleNav()} />);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/docs/overview",
    );
    expect(screen.getByRole("link", { name: "Other Resources" })).toHaveAttribute(
      "href",
      "/docs/other-resources",
    );
    expect(screen.getByRole("link", { name: "Science" })).toHaveAttribute(
      "href",
      "/docs/other-resources/science",
    );
  });

  it("names the nav, there being a second nav in the app shell", () => {
    render(<DocsToc nav={sampleNav()} />);

    expect(screen.getByRole("navigation", { name: "Documentation" })).toBeInTheDocument();
  });

  it("marks only the page being read", () => {
    mockPathname = "/docs/overview";
    render(<DocsToc nav={sampleNav()} />);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Other Resources" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("matches the route exactly, so a parent is not marked by its child", () => {
    mockPathname = "/docs/other-resources/science";
    render(<DocsToc nav={sampleNav()} />);

    expect(screen.getByRole("link", { name: "Science" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Other Resources" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks nothing on the generated index, which has no page of its own", () => {
    render(<DocsToc nav={sampleNav()} />);

    expect(document.querySelector("[aria-current]")).toBeNull();
  });

  it("lists headings under the page being read only", () => {
    mockPathname = "/docs/overview";
    render(<DocsToc nav={sampleNav()} />);

    expect(screen.getByRole("link", { name: "Crate" })).toHaveAttribute("href", "#crate");
    expect(screen.queryByRole("link", { name: "Sources" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Underbelly" })).toBeNull();
  });

  it("lists h2 and h3 headings, leaving deeper ones out", () => {
    mockPathname = "/docs/overview";
    render(<DocsToc nav={sampleNav()} />);

    expect(screen.getByRole("link", { name: "Crate" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Internals" })).toBeNull();
  });

  it("nests a child page under its parent's entry", () => {
    render(<DocsToc nav={sampleNav()} />);

    const parent = screen.getByRole("link", { name: "Other Resources" }).closest("li");
    expect(parent).not.toBeNull();
    expect(within(parent!).getByRole("link", { name: "Science" })).toBeInTheDocument();
  });

  it("starts the mobile list collapsed and expands it on toggle", async () => {
    const user = userEvent.setup();
    render(<DocsToc nav={sampleNav()} />);

    const toggle = screen.getByRole("button", { name: /contents/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "docs-toc-list");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses the mobile list once a page is picked", async () => {
    const user = userEvent.setup();
    render(<DocsToc nav={sampleNav()} />);

    const toggle = screen.getByRole("button", { name: /contents/i });
    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "Overview" }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses the mobile list once a heading is picked", async () => {
    mockPathname = "/docs/overview";
    const user = userEvent.setup();
    render(<DocsToc nav={sampleNav()} />);

    const toggle = screen.getByRole("button", { name: /contents/i });
    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "Crate" }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
