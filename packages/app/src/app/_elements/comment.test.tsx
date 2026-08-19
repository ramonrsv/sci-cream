import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { CommentItem } from "@/app/_elements/comment";
import { CommentDeletion, type CommentJson } from "@/lib/comments/comments";

/** A comment with the fields a test cares about overridden. */
function makeComment(overrides: Partial<CommentJson> = {}): CommentJson {
  return {
    id: 1,
    parentId: null,
    authorId: 7,
    authorDisplayName: "Tester A",
    body: "A **bold** remark",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("CommentItem", () => {
  it("renders the author, a relative timestamp, and the markdown body", () => {
    render(<CommentItem comment={makeComment()} />);

    expect(screen.getByText("Tester A")).toBeInTheDocument();
    expect(screen.getByText("3 hours ago")).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("omits the edited marker for an unedited comment", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.queryByText("(edited)")).not.toBeInTheDocument();
  });

  it("shows the edited marker once updatedAt is present", () => {
    render(<CommentItem comment={makeComment({ updatedAt: new Date().toISOString() })} />);
    expect(screen.getByText("(edited)")).toBeInTheDocument();
  });

  it("renders no action row when no actions are passed", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders only the actions it is given", () => {
    render(<CommentItem comment={makeComment()} actions={{ onReply: vi.fn() }} />);

    expect(screen.getByRole("button", { name: "Reply" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("orders the actions with the destructive one last", () => {
    render(
      <CommentItem
        comment={makeComment()}
        actions={{ onReply: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onReport: vi.fn() }}
      />,
    );

    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["Reply", "Edit", "Report", "Delete"]);
  });

  it.each([
    ["Reply", "onReply"],
    ["Edit", "onEdit"],
    ["Report", "onReport"],
    ["Delete", "onDelete"],
  ] as const)("invokes %s's handler when clicked", (label, handler) => {
    const spy = vi.fn();
    render(<CommentItem comment={makeComment()} actions={{ [handler]: spy }} />);

    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(spy).toHaveBeenCalledOnce();
  });

  it("renders [deleted] instead of the body where the author withdrew it", () => {
    render(<CommentItem comment={makeComment({ body: "", deletion: CommentDeletion.Author })} />);
    expect(screen.getByText("[deleted]")).toBeInTheDocument();
  });

  it("renders [removed] instead, where a moderator took it down", () => {
    render(
      <CommentItem comment={makeComment({ body: "", deletion: CommentDeletion.Moderator })} />,
    );
    expect(screen.getByText("[removed]")).toBeInTheDocument();
    expect(screen.queryByText("[deleted]")).not.toBeInTheDocument();
  });

  it("offers no actions on a tombstone, whatever it is passed", () => {
    render(
      <CommentItem
        comment={makeComment({ body: "", deletion: CommentDeletion.Author })}
        actions={{ onReply: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onReport: vi.fn() }}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("still shows the author and timestamp on a tombstone", () => {
    render(<CommentItem comment={makeComment({ body: "", deletion: CommentDeletion.Author })} />);
    expect(screen.getByText("Tester A")).toBeInTheDocument();
    expect(screen.getByText("3 hours ago")).toBeInTheDocument();
  });

  it("renders children under the comment, for the thread's composer", () => {
    render(
      <CommentItem comment={makeComment()}>
        <div data-testid="composer" />
      </CommentItem>,
    );
    expect(screen.getByTestId("composer")).toBeInTheDocument();
  });

  it("tags the card with the comment id, so the thread can address it", () => {
    render(<CommentItem comment={makeComment({ id: 42 })} />);
    expect(screen.getByTestId("comment-42")).toBeInTheDocument();
  });
});
