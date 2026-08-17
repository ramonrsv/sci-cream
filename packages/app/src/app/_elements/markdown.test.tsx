import "@testing-library/jest-dom/vitest";

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";

import { Markdown, MarkdownField } from "@/app/_elements/markdown";

describe("MarkdownField tab persistence", () => {
  const KEY = "test-field";

  /** Renders the field and lets the mount effect that restores the stored tab run. */
  const renderField = async (persistKey?: string) => {
    const view = render(<MarkdownField value="body" onChange={() => {}} persistKey={persistKey} />);
    await act(async () => {});
    return view;
  };

  const clickTab = async (name: "Write" | "Preview") => {
    fireEvent.click(screen.getByRole("tab", { name }));
    await act(async () => {});
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("defaults to the Write tab", async () => {
    await renderField(KEY);
    expect(screen.getByRole("tab", { name: "Write" })).toHaveAttribute("aria-selected", "true");
  });

  it("persists the selected tab under <persistKey>:tab", async () => {
    await renderField(KEY);
    await clickTab("Preview");
    expect(localStorage.getItem(`${KEY}:tab`)).toBe(JSON.stringify("preview"));
  });

  it("restores a stored tab on mount", async () => {
    localStorage.setItem(`${KEY}:tab`, JSON.stringify("preview"));
    await renderField(KEY);
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("Comments")).not.toBeInTheDocument();
  });

  it("falls back to Write when the stored tab is not a valid tab name", async () => {
    localStorage.setItem(`${KEY}:tab`, JSON.stringify("bogus"));
    await renderField(KEY);
    expect(screen.getByRole("tab", { name: "Write" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps each persistKey's tab independent", async () => {
    await renderField(KEY);
    await clickTab("Preview");
    cleanup();

    await renderField("other-field");
    expect(screen.getByRole("tab", { name: "Write" })).toHaveAttribute("aria-selected", "true");
    expect(localStorage.getItem(`${KEY}:tab`)).toBe(JSON.stringify("preview"));
  });

  it("does not touch storage when persistKey is undefined", async () => {
    await renderField();
    await clickTab("Preview");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    expect(localStorage.length).toBe(0);
  });
});

describe("Markdown links", () => {
  afterEach(() => cleanup());

  it("marks an external link as untrusted user content and opens it in a new tab", () => {
    render(<Markdown text="[out](https://example.com/page)" />);

    const link = screen.getByRole("link", { name: "out" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer ugc nofollow");
  });

  it("leaves an internal link alone, so in-app navigation is unaffected", () => {
    render(<Markdown text="[docs](/docs/overview)" />);

    const link = screen.getByRole("link", { name: "docs" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});
