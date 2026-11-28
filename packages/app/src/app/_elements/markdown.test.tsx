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

  it("opens a link into the hosted rustdoc in a new tab, as it lies outside the app", () => {
    render(
      <Markdown text="[`Sugars`](/rustdoc/sci_cream/composition/sugars/struct.Sugars.html)" />,
    );

    expect(screen.getByRole("link", { name: "Sugars" })).toHaveAttribute("target", "_blank");
  });

  it("leaves an internal link alone, so in-app navigation is unaffected", () => {
    render(<Markdown text="[docs](/docs/overview)" />);

    const link = screen.getByRole("link", { name: "docs" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  // The Reference is the app's own, unlike the hosted rustdoc that notes linked to before it
  it("opens a link into the Reference in place, anchor and all", () => {
    render(<Markdown text="[POD](/docs/reference/sweeteners#pod)" />);

    const link = screen.getByRole("link", { name: "POD" });
    expect(link).toHaveAttribute("href", "/docs/reference/sweeteners#pod");
    expect(link).not.toHaveAttribute("target");
  });
});

describe("Markdown footnotes", () => {
  const TEXT = "Sweet[^1].\n\n[^1]: Sugar.";

  afterEach(() => cleanup());

  it("links a footnote back to its citation", () => {
    render(<Markdown text={TEXT} />);

    const back = screen.getByRole("link", { name: "Back to reference 1" });
    expect(back).toHaveAttribute("href", `#${screen.getByRole("link", { name: "1" }).id}`);
  });

  it("describes a citation by the footnotes' heading", () => {
    render(<Markdown text={TEXT} />);

    expect(screen.getByRole("link", { name: "1" })).toHaveAccessibleDescription("Footnotes");
  });
});
