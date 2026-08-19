import { describe, it, expect } from "vitest";

import {
  COMMENT_ERROR_MESSAGES,
  CommentDeletion,
  CommentError,
  MAX_COMMENT_BODY_CHARS,
  formatRelativeTime,
  groupCommentThreads,
  isValidCommentBody,
  validateCommentBody,
  type CommentJson,
} from "@/lib/comments/comments";

/** Build a comment with only the fields a test cares about. */
function makeComment(id: number, parentId: number | null = null): CommentJson {
  return {
    id,
    parentId,
    authorId: 1,
    authorDisplayName: "Tester",
    body: `body ${id}`,
    createdAt: "2026-08-01T12:00:00.000Z",
  };
}

describe("validateCommentBody", () => {
  it("accepts ordinary text and returns it unchanged", () => {
    expect(validateCommentBody("Looks great!")).toEqual({ ok: true, value: "Looks great!" });
  });

  it("trims surrounding whitespace from the stored value", () => {
    expect(validateCommentBody("  padded  ")).toEqual({ ok: true, value: "padded" });
  });

  it("rejects an empty body", () => {
    expect(validateCommentBody("")).toEqual({ ok: false, error: CommentError.Empty });
  });

  it("rejects a whitespace-only body", () => {
    expect(validateCommentBody("   \n\t ")).toEqual({ ok: false, error: CommentError.Empty });
  });

  it("accepts a body of exactly the maximum length", () => {
    const body = "x".repeat(MAX_COMMENT_BODY_CHARS);
    expect(validateCommentBody(body)).toEqual({ ok: true, value: body });
  });

  it("rejects a body one character over the maximum", () => {
    expect(validateCommentBody("x".repeat(MAX_COMMENT_BODY_CHARS + 1))).toEqual({
      ok: false,
      error: CommentError.TooLong,
    });
  });

  it("measures length after trimming, so padding does not push a body over", () => {
    const body = `  ${"x".repeat(MAX_COMMENT_BODY_CHARS)}  `;
    expect(validateCommentBody(body).ok).toBe(true);
  });
});

describe("isValidCommentBody", () => {
  it.each<[string, string, boolean]>([
    ["accepts ordinary text", "hello", true],
    ["rejects an empty body", "", false],
    ["rejects a whitespace-only body", "  ", false],
    ["rejects an over-long body", "x".repeat(MAX_COMMENT_BODY_CHARS + 1), false],
  ])("%s", (_label, body, expected) => {
    expect(isValidCommentBody(body)).toBe(expected);
  });
});

describe("CommentError", () => {
  // The member names are free to change; these strings are not, being what a server action puts
  // on the wire. Written out rather than derived, so a rename has to be made deliberately here.
  it("keeps its wire values", () => {
    expect({ ...CommentError }).toEqual({
      Unauthenticated: "unauthenticated",
      Forbidden: "forbidden",
      NotFound: "not-found",
      Deleted: "deleted",
      BadSubject: "bad-subject",
      Empty: "empty",
      TooLong: "too-long",
      RateLimited: "rate-limited",
    });
  });
});

describe("COMMENT_ERROR_MESSAGES", () => {
  it("names the character cap in the too-long message", () => {
    expect(COMMENT_ERROR_MESSAGES[CommentError.TooLong]).toContain(String(MAX_COMMENT_BODY_CHARS));
  });

  it("carries a message for every error, so none can surface unexplained", () => {
    for (const error of Object.values(CommentError)) {
      expect(COMMENT_ERROR_MESSAGES[error]).toBeTruthy();
    }
  });
});

describe("groupCommentThreads", () => {
  it("returns an empty array for no comments", () => {
    expect(groupCommentThreads([])).toEqual([]);
  });

  it("returns roots with empty reply lists when there are no replies", () => {
    const threads = groupCommentThreads([makeComment(1), makeComment(2)]);
    expect(threads).toHaveLength(2);
    expect(threads.map((t) => t.root.id)).toEqual([1, 2]);
    expect(threads.every((t) => t.replies.length === 0)).toBe(true);
  });

  it("attaches each reply to its root", () => {
    const threads = groupCommentThreads([
      makeComment(1),
      makeComment(2),
      makeComment(3, 1),
      makeComment(4, 2),
      makeComment(5, 1),
    ]);
    expect(threads).toHaveLength(2);
    expect(threads[0].replies.map((r) => r.id)).toEqual([3, 5]);
    expect(threads[1].replies.map((r) => r.id)).toEqual([4]);
  });

  it("preserves the incoming order of roots and of replies within a root", () => {
    const threads = groupCommentThreads([
      makeComment(9),
      makeComment(4),
      makeComment(7, 9),
      makeComment(2, 9),
    ]);
    expect(threads.map((t) => t.root.id)).toEqual([9, 4]);
    expect(threads[0].replies.map((r) => r.id)).toEqual([7, 2]);
  });

  it("attaches replies to a root that arrives after them", () => {
    const threads = groupCommentThreads([makeComment(2, 1), makeComment(1)]);
    expect(threads).toHaveLength(1);
    expect(threads[0].replies.map((r) => r.id)).toEqual([2]);
  });

  it("drops a reply whose root is missing rather than promoting it", () => {
    const threads = groupCommentThreads([makeComment(1), makeComment(5, 99)]);
    expect(threads).toHaveLength(1);
    expect(threads[0].root.id).toBe(1);
    expect(threads[0].replies).toEqual([]);
  });

  it("keeps a tombstoned root so its replies survive", () => {
    const tombstone = { ...makeComment(1), body: "", deletion: CommentDeletion.Author };
    const threads = groupCommentThreads([tombstone, makeComment(2, 1)]);
    expect(threads[0].root.deletion).toBe(CommentDeletion.Author);
    expect(threads[0].replies.map((r) => r.id)).toEqual([2]);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it.each([
    ["2026-08-16T11:59:30.000Z", "just now"],
    ["2026-08-16T11:55:00.000Z", "5 minutes ago"],
    ["2026-08-16T09:00:00.000Z", "3 hours ago"],
    ["2026-08-14T12:00:00.000Z", "2 days ago"],
    ["2026-06-16T12:00:00.000Z", "2 months ago"],
    ["2024-08-16T12:00:00.000Z", "2 years ago"],
  ])("formats %s as %s", (iso, expected) => {
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });

  it("reads a zoneless timestamp as UTC, matching how Postgres wrote it", () => {
    expect(formatRelativeTime("2026-08-16T09:00:00.000", now)).toBe("3 hours ago");
  });

  it("says 'just now' for a timestamp slightly ahead of the clock", () => {
    expect(formatRelativeTime("2026-08-16T12:00:30.000Z", now)).toBe("just now");
  });
});
