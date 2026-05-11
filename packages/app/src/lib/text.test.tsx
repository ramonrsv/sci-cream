import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { autoLink } from "./text";

/** Helper component to test autoLink's output as React nodes */
function Wrapper({ text }: { text: string }) {
  return <span>{autoLink(text)}</span>;
}

describe("autoLink", () => {
  afterEach(cleanup);

  it("returns plain text unchanged when no URLs are present", () => {
    const { container } = render(<Wrapper text="hello world" />);
    expect(container.textContent).toBe("hello world");
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("handles empty string", () => {
    const { container } = render(<Wrapper text="" />);
    expect(container.textContent).toBe("");
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("wraps a bare URL in an anchor tag", () => {
    const { container } = render(<Wrapper text="https://example.com" />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://example.com");
    expect(links[0]).toHaveTextContent("https://example.com");
  });

  it("wraps a URL with path, query, and fragment", () => {
    const { container } = render(<Wrapper text="https://example.com/path?q=1#anchor" />);
    const link = container.querySelector("a")!;
    expect(link).toHaveAttribute("href", "https://example.com/path?q=1#anchor");
    expect(link).toHaveTextContent("https://example.com/path?q=1#anchor");
  });

  it("opens links in a new tab with noopener noreferrer", () => {
    const { container } = render(<Wrapper text="https://example.com" />);
    const link = container.querySelector("a")!;
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("preserves surrounding text around a URL", () => {
    const { container } = render(<Wrapper text="See https://example.com for details" />);
    expect(container.textContent).toBe("See https://example.com for details");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("handles multiple URLs in the same string", () => {
    const { container } = render(<Wrapper text="Visit https://a.com and https://b.com" />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://a.com");
    expect(links[1]).toHaveAttribute("href", "https://b.com");
    expect(container.textContent).toBe("Visit https://a.com and https://b.com");
  });
});
