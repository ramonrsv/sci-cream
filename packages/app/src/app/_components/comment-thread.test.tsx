import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";

import { CommentThread } from "@/app/_components/comment-thread";
import { CommentError, type CommentJson } from "@/lib/comments/comments";
import type { CommentSubject } from "@/lib/comments/subject";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ useSession: mockUseSession }));

vi.mock("@/lib/data/comments", () => ({
  fetchComments: vi.fn(),
  postComment: vi.fn(),
  editComment: vi.fn(),
  deleteComment: vi.fn(),
  reportComment: vi.fn(),
}));

const { fetchComments, postComment, editComment, deleteComment, reportComment } =
  await import("@/lib/data/comments");

const SUBJECT: CommentSubject = { type: "blog", key: "2026-04-27-welcome" };

/** The signed-in user in most tests; `AUTHOR_ID` matches the comments they own. */
const AUTHOR_ID = 1;
const OTHER_ID = 2;

/** A comment with the fields a test cares about overridden. */
function makeComment(overrides: Partial<CommentJson> = {}): CommentJson {
  return {
    id: 1,
    parentId: null,
    authorId: AUTHOR_ID,
    authorDisplayName: "Tester A",
    body: "First!",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    deleted: false,
    ...overrides,
  };
}

/** Report the session as signed in (as `AUTHOR_ID` unless told otherwise), or as signed out. */
function setSession(signedIn: boolean, id = AUTHOR_ID) {
  mockUseSession.mockReturnValue(
    signedIn
      ? { data: { user: { id: String(id), email: "a@sci-cream.ca" } }, status: "authenticated" }
      : { data: null, status: "unauthenticated" },
  );
}

/** Render the thread and wait for its mount-time fetch to settle. */
async function renderThread() {
  render(<CommentThread subject={SUBJECT} />);
  await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
}

/** Type `text` into whichever composer is currently open. */
function typeIntoComposer(text: string) {
  fireEvent.change(screen.getByTestId("comment-input"), { target: { value: text } });
}

beforeEach(() => {
  vi.clearAllMocks();
  setSession(true);
  vi.mocked(fetchComments).mockResolvedValue([]);
  vi.mocked(postComment).mockResolvedValue({ ok: true, value: makeComment() });
  vi.mocked(editComment).mockResolvedValue({ ok: true, value: makeComment() });
  vi.mocked(deleteComment).mockResolvedValue({ ok: true, value: { tombstoned: false } });
  vi.mocked(reportComment).mockResolvedValue({ ok: true, value: null });
});

afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// Loading and rendering
// ---------------------------------------------------------------------------

describe("CommentThread rendering", () => {
  it("fetches the thread for its subject on mount", async () => {
    await renderThread();
    expect(fetchComments).toHaveBeenCalledWith(SUBJECT);
  });

  it("shows an empty-thread message when there are no comments", async () => {
    await renderThread();
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });

  it("shows the comment count in the heading", async () => {
    vi.mocked(fetchComments).mockResolvedValue([makeComment(), makeComment({ id: 2 })]);
    await renderThread();
    expect(screen.getByRole("heading", { name: "Comments (2)" })).toBeInTheDocument();
  });

  it("renders replies nested under their root", async () => {
    vi.mocked(fetchComments).mockResolvedValue([
      makeComment({ id: 1, body: "root" }),
      makeComment({ id: 2, parentId: 1, body: "reply", authorId: OTHER_ID }),
    ]);
    await renderThread();

    expect(screen.getByTestId("comment-1")).toBeInTheDocument();
    expect(within(screen.getByTestId("comment-2")).getByText("reply")).toBeInTheDocument();
  });

  it("reports an unavailable thread when the fetch returns undefined", async () => {
    vi.mocked(fetchComments).mockResolvedValue(undefined);
    await renderThread();

    expect(screen.getByText("Comments aren't available for this page.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a comment" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Signed-out
// ---------------------------------------------------------------------------

describe("CommentThread signed out", () => {
  beforeEach(() => setSession(false));

  it("still renders the thread", async () => {
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ body: "public words" })]);
    await renderThread();
    expect(screen.getByText("public words")).toBeInTheDocument();
  });

  it("links to sign-in with the page as the callback instead of a composer", async () => {
    await renderThread();

    expect(screen.queryByRole("button", { name: "Add a comment" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/signin?callbackUrl=%2Fblog%2F2026-04-27-welcome",
    );
  });

  it("offers no per-comment actions", async () => {
    vi.mocked(fetchComments).mockResolvedValue([makeComment()]);
    await renderThread();

    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Posting
// ---------------------------------------------------------------------------

describe("CommentThread posting", () => {
  it("posts the drafted body and re-fetches the thread", async () => {
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Add a comment" }));
    typeIntoComposer("Hello there");
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(postComment).toHaveBeenCalledWith(SUBJECT, "Hello there", undefined),
    );
    await waitFor(() => expect(fetchComments).toHaveBeenCalledTimes(2));
  });

  it("keeps the Post button disabled until the draft is valid", async () => {
    await renderThread();
    fireEvent.click(screen.getByRole("button", { name: "Add a comment" }));

    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    typeIntoComposer("   ");
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    typeIntoComposer("real text");
    expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
  });

  it("closes the composer after a successful post", async () => {
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Add a comment" }));
    typeIntoComposer("Hello there");
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(screen.queryByTestId("comment-input")).not.toBeInTheDocument());
  });

  it("shows the server's reason and keeps the draft when the post is refused", async () => {
    vi.mocked(postComment).mockResolvedValue({ ok: false, error: CommentError.RateLimited });
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Add a comment" }));
    typeIntoComposer("Hello there");
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Too many comments/);
    expect(screen.getByTestId("comment-input")).toHaveValue("Hello there");
  });

  it("discards the draft on Cancel", async () => {
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Add a comment" }));
    typeIntoComposer("never mind");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("comment-input")).not.toBeInTheDocument();
    expect(postComment).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Replying
// ---------------------------------------------------------------------------

describe("CommentThread replying", () => {
  beforeEach(() => {
    vi.mocked(fetchComments).mockResolvedValue([
      makeComment({ id: 1, body: "root", authorId: OTHER_ID }),
      makeComment({ id: 2, parentId: 1, body: "reply", authorId: OTHER_ID }),
    ]);
  });

  it("posts a reply against its root", async () => {
    await renderThread();

    fireEvent.click(within(screen.getByTestId("comment-1")).getByRole("button", { name: "Reply" }));
    typeIntoComposer("me too");
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(postComment).toHaveBeenCalledWith(SUBJECT, "me too", 1));
  });

  it("offers no Reply on a reply, keeping threading one level deep", async () => {
    await renderThread();

    const reply = within(screen.getByTestId("comment-2"));
    expect(reply.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Per-comment actions
// ---------------------------------------------------------------------------

describe("CommentThread per-comment actions", () => {
  it("offers Edit and Delete on one's own comment, but not Report", async () => {
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ authorId: AUTHOR_ID })]);
    await renderThread();

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });

  it("offers Report on someone else's comment, but not Edit or Delete", async () => {
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ authorId: OTHER_ID })]);
    await renderThread();

    expect(screen.getByRole("button", { name: "Report" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("seeds the edit composer with the existing body and saves the change", async () => {
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 5, body: "before" })]);
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("comment-input")).toHaveValue("before");

    typeIntoComposer("after");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(editComment).toHaveBeenCalledWith(5, "after"));
  });

  it("deletes after the confirmation is accepted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 5 })]);
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteComment).toHaveBeenCalledWith(5));
  });

  it("does not delete when the confirmation is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 5 })]);
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteComment).not.toHaveBeenCalled();
  });

  it("reports after the confirmation is accepted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 5, authorId: OTHER_ID })]);
    await renderThread();

    fireEvent.click(screen.getByRole("button", { name: "Report" }));
    await waitFor(() => expect(reportComment).toHaveBeenCalledWith(5));
  });

  it("offers no actions on a tombstoned root", async () => {
    vi.mocked(fetchComments).mockResolvedValue([
      makeComment({ id: 1, body: "", deleted: true, authorId: OTHER_ID }),
      makeComment({ id: 2, parentId: 1, body: "reply", authorId: OTHER_ID }),
    ]);
    await renderThread();

    const root = within(screen.getByTestId("comment-1"));
    expect(root.getByText("[deleted]")).toBeInTheDocument();
    expect(root.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(root.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });
});
