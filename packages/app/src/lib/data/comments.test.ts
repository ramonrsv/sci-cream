import { expect, test, describe, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { and, eq, gt, sql } from "drizzle-orm";

/**
 * Integration tests for the comment actions, against a real Postgres.
 *
 * Identity is the whole point of this module, so `@/lib/auth` is mocked rather than the actions:
 * every test drives the real query path and only swaps who is signed in. `auth()` is the sole way
 * identity enters the module, so a test that signs nobody in is exercising exactly what an
 * unauthenticated request would hit.
 *
 * Rows created here are cleaned up by id watermark in `afterEach`, which also resets the rate-limit
 * window — the limit counts rows, so deleting them un-throttles the author.
 */

/** Who `auth()` reports as signed in; `undefined` is an anonymous request. */
const session = vi.hoisted(() => ({ email: undefined as string | undefined }));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => (session.email ? { user: { email: session.email } } : null)),
}));

const {
  fetchComments,
  postComment,
  editComment,
  deleteComment,
  purgeComment,
  reportComment,
  fetchOpenReports,
  resolveReport,
} = await import("@/lib/data/comments");

const { COMMENT_RATE_LIMIT, MAX_COMMENT_BODY_CHARS, CommentError } =
  await import("@/lib/comments/comments");
const { commentReportsTable, commentsTable, usersTable } = await import("@/lib/database/schema");
const { db } = await import("@/lib/database/client");
const { TEST_USER_A, TEST_USER_B } = await import("@/lib/database/assets");

type CommentSubject = import("@/lib/comments/subject").CommentSubject;

/** Docs pages with no seeded comments, so a thread here holds only what a test put in it. */
const SUBJECT: CommentSubject = { type: "docs", key: "overview" };
const OTHER_SUBJECT: CommentSubject = { type: "docs", key: "science" };

/** Sign in as the given test user for the rest of the test; no argument signs out. */
function signInAs(email?: string) {
  session.email = email;
}

/** The id of the newest comment, or 0 when the table is empty. */
async function maxCommentId(): Promise<number> {
  const [{ max }] = await db
    .select({ max: sql<number | null>`MAX(${commentsTable.id})` })
    .from(commentsTable);
  return Number(max ?? 0);
}

/** Look up a test user's id by email. */
async function userId(email: string): Promise<number> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) throw new Error(`Test user ${email} not found — run \`pnpm seed-db\``);
  return user.id;
}

/**
 * Insert a comment directly, bypassing the action.
 *
 * Fixtures go in this way so they neither consume the author's rate-limit allowance nor depend on
 * the very action under test.
 */
async function insertComment(
  subject: CommentSubject,
  authorEmail: string,
  body: string,
  parentId?: number,
): Promise<number> {
  const [row] = await db
    .insert(commentsTable)
    .values({
      subjectType: subject.type,
      subjectKey: subject.key,
      author: await userId(authorEmail),
      parentId: parentId ?? null,
      body,
    })
    .returning();
  return row.id;
}

/** Read one comment row straight from the database, bypassing the actions. */
async function readComment(id: number) {
  const [row] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  return row;
}

let watermark = 0;

beforeAll(async () => {
  // Every test user must exist; the actions resolve the session email against `users`.
  await userId(TEST_USER_A.email);
  await userId(TEST_USER_B.email);

  // Set the admin flags here rather than relying on the seed. The `db_migration` CI job runs this
  // file against a fixture dumped one migration back, which predates `is_admin` and the seeded
  // comments — so nothing in this file may assume either exists. This matches what the seed sets.
  await db
    .update(usersTable)
    .set({ isAdmin: false })
    .where(eq(usersTable.email, TEST_USER_B.email));
  await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.email, TEST_USER_A.email));
});

beforeEach(async () => {
  watermark = await maxCommentId();
  signInAs(undefined);
});

afterEach(async () => {
  // Ids are identity-generated and monotonic, so everything above the watermark is this test's.
  // Deleting a root cascades to its replies and to any reports filed against it.
  await db.delete(commentsTable).where(gt(commentsTable.id, watermark));
  signInAs(undefined);
});

// ---------------------------------------------------------------------------
// fetchComments
// ---------------------------------------------------------------------------

describe("fetchComments", () => {
  test("returns a thread to an anonymous reader", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "public root");
    await insertComment(SUBJECT, TEST_USER_B.email, "public reply", root);

    const comments = await fetchComments(SUBJECT);

    expect(comments!.map((c) => c.body)).toEqual(["public root", "public reply"]);
    expect(comments!.some((c) => c.parentId !== null)).toBe(true);
  });

  test("never includes the author's email", async () => {
    await insertComment(SUBJECT, TEST_USER_A.email, "hello");

    const comments = await fetchComments(SUBJECT);
    expect(JSON.stringify(comments)).not.toContain(TEST_USER_A.email);
    expect(comments![0].authorDisplayName).toBe(TEST_USER_A.name);
  });

  test("returns comments oldest first, roots and replies together", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "first");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "second", root);

    const comments = await fetchComments(SUBJECT);
    expect(comments!.map((c) => c.id)).toEqual([root, reply]);
    expect(comments![1].parentId).toBe(root);
  });

  test("returns only the requested subject's comments", async () => {
    await insertComment(SUBJECT, TEST_USER_A.email, "on overview");
    await insertComment(OTHER_SUBJECT, TEST_USER_A.email, "on science");

    const comments = await fetchComments(SUBJECT);
    expect(comments!.map((c) => c.body)).toEqual(["on overview"]);
  });

  test("returns a tombstoned root with an empty body and the deleted flag", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "to be deleted");
    await insertComment(SUBJECT, TEST_USER_B.email, "keeps it alive", root);

    signInAs(TEST_USER_A.email);
    await deleteComment(root);

    const comments = await fetchComments(SUBJECT);
    const tombstone = comments!.find((c) => c.id === root);
    expect(tombstone).toMatchObject({ body: "", deleted: true });
  });

  test.each([
    ["an unknown key", { type: "docs", key: "no-such-page" }],
    ["a forged type", { type: "recipe", key: "overview" }],
    ["a path traversal attempt", { type: "docs", key: "../../etc/passwd" }],
    ["an empty key", { type: "docs", key: "" }],
  ])("returns undefined for %s", async (_label, subject) => {
    expect(await fetchComments(subject as CommentSubject)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// postComment
// ---------------------------------------------------------------------------

describe("postComment", () => {
  test("stores a comment authored by the signed-in user", async () => {
    signInAs(TEST_USER_A.email);

    const result = await postComment(SUBJECT, "A fresh comment");
    expect(result.ok).toBe(true);

    const stored = await readComment(result.ok ? result.value.id : 0);
    expect(stored.author).toBe(await userId(TEST_USER_A.email));
    expect(stored.body).toBe("A fresh comment");
    expect(stored.parentId).toBeNull();
    expect(stored.updatedAt).toBeNull();
  });

  test("trims the body before storing it", async () => {
    signInAs(TEST_USER_A.email);

    const result = await postComment(SUBJECT, "   padded   ");
    expect(result.ok && result.value.body).toBe("padded");
  });

  test("rejects an anonymous post", async () => {
    expect(await postComment(SUBJECT, "sneaky")).toEqual({
      ok: false,
      error: CommentError.Unauthenticated,
    });
  });

  test("rejects an empty body", async () => {
    signInAs(TEST_USER_A.email);
    expect(await postComment(SUBJECT, "   ")).toEqual({ ok: false, error: CommentError.Empty });
  });

  test("rejects a body over the character cap", async () => {
    signInAs(TEST_USER_A.email);
    const result = await postComment(SUBJECT, "x".repeat(MAX_COMMENT_BODY_CHARS + 1));
    expect(result).toEqual({ ok: false, error: CommentError.TooLong });
  });

  test.each([
    ["an unknown key", { type: "docs", key: "no-such-page" }],
    ["a forged type", { type: "recipe", key: "overview" }],
  ])("rejects %s", async (_label, subject) => {
    signInAs(TEST_USER_A.email);
    expect(await postComment(subject as CommentSubject, "hi")).toEqual({
      ok: false,
      error: CommentError.BadSubject,
    });
  });

  test("stores a reply against its root", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    signInAs(TEST_USER_B.email);

    const result = await postComment(SUBJECT, "a reply", root);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.parentId).toBe(root);
  });

  test("rejects a reply to a reply, capping threading at one level", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);

    signInAs(TEST_USER_A.email);
    expect(await postComment(SUBJECT, "reply to a reply", reply)).toEqual({
      ok: false,
      error: CommentError.NotFound,
    });
  });

  test("rejects a reply whose parent belongs to another subject", async () => {
    const elsewhere = await insertComment(OTHER_SUBJECT, TEST_USER_A.email, "on science");

    signInAs(TEST_USER_B.email);
    expect(await postComment(SUBJECT, "smuggled", elsewhere)).toEqual({
      ok: false,
      error: CommentError.NotFound,
    });
  });

  test("rejects a reply to a comment that does not exist", async () => {
    signInAs(TEST_USER_A.email);
    expect(await postComment(SUBJECT, "orphan", 2_000_000_000)).toEqual({
      ok: false,
      error: CommentError.NotFound,
    });
  });

  test("refuses the post that would exceed the rate limit", async () => {
    signInAs(TEST_USER_B.email);

    for (let i = 0; i < COMMENT_RATE_LIMIT; i++) {
      expect((await postComment(SUBJECT, `comment ${i}`)).ok).toBe(true);
    }
    expect(await postComment(SUBJECT, "one too many")).toEqual({
      ok: false,
      error: CommentError.RateLimited,
    });
  });

  test("rate-limits per author, not globally", async () => {
    signInAs(TEST_USER_B.email);
    for (let i = 0; i < COMMENT_RATE_LIMIT; i++) await postComment(SUBJECT, `comment ${i}`);

    signInAs(TEST_USER_A.email);
    expect((await postComment(SUBJECT, "unaffected")).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// editComment
// ---------------------------------------------------------------------------

describe("editComment", () => {
  test("rewrites the body and stamps updated_at", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "before");
    signInAs(TEST_USER_A.email);

    const result = await editComment(id, "after");
    expect(result.ok && result.value.body).toBe("after");
    expect(result.ok && result.value.updatedAt).toBeDefined();

    const stored = await readComment(id);
    expect(stored.body).toBe("after");
    expect(stored.updatedAt).not.toBeNull();
  });

  test("rejects an anonymous edit", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "before");
    expect(await editComment(id, "after")).toEqual({
      ok: false,
      error: CommentError.Unauthenticated,
    });
    expect((await readComment(id)).body).toBe("before");
  });

  test("refuses to let one user edit another's comment", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "A's words");
    signInAs(TEST_USER_B.email);

    expect(await editComment(id, "B's words")).toEqual({
      ok: false,
      error: CommentError.Forbidden,
    });
    expect((await readComment(id)).body).toBe("A's words");
  });

  test("refuses an admin editing someone else's comment", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "B's words");
    signInAs(TEST_USER_A.email);

    expect(await editComment(id, "rewritten")).toEqual({
      ok: false,
      error: CommentError.Forbidden,
    });
  });

  test("rejects an edit that empties the body", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "before");
    signInAs(TEST_USER_A.email);

    expect(await editComment(id, "  ")).toEqual({ ok: false, error: CommentError.Empty });
    expect((await readComment(id)).body).toBe("before");
  });

  test("rejects an edit over the character cap", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "before");
    signInAs(TEST_USER_A.email);

    expect(await editComment(id, "x".repeat(MAX_COMMENT_BODY_CHARS + 1))).toEqual({
      ok: false,
      error: CommentError.TooLong,
    });
  });

  test("rejects an edit to a tombstoned comment", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);

    signInAs(TEST_USER_A.email);
    await deleteComment(root);

    expect(await editComment(root, "back from the dead")).toEqual({
      ok: false,
      error: CommentError.Deleted,
    });
  });

  test("rejects an edit to a comment that does not exist", async () => {
    signInAs(TEST_USER_A.email);
    expect(await editComment(2_000_000_000, "hello")).toEqual({
      ok: false,
      error: CommentError.NotFound,
    });
  });
});

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------

describe("deleteComment", () => {
  test("hard-deletes a root with no replies", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "alone");
    signInAs(TEST_USER_A.email);

    expect(await deleteComment(id)).toEqual({ ok: true, value: { tombstoned: false } });
    expect(await readComment(id)).toBeUndefined();
  });

  test("tombstones a root with replies and blanks its body", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "the original text");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "a reply", root);
    signInAs(TEST_USER_A.email);

    expect(await deleteComment(root)).toEqual({ ok: true, value: { tombstoned: true } });

    const stored = await readComment(root);
    expect(stored.body).toBe("");
    expect(stored.deletedAt).not.toBeNull();
    expect(await readComment(reply)).toBeDefined();
  });

  test("tombstones a reply and blanks its body, leaving its root alone", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "the original text", root);
    signInAs(TEST_USER_B.email);

    expect(await deleteComment(reply)).toEqual({ ok: true, value: { tombstoned: true } });

    const stored = await readComment(reply);
    expect(stored.body).toBe("");
    expect(stored.deletedAt).not.toBeNull();
    expect((await readComment(root)).body).toBe("root");
  });

  test("tombstones a reply even when it is the only one, keeping the sequence intact", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const first = await insertComment(SUBJECT, TEST_USER_B.email, "first", root);
    await insertComment(SUBJECT, TEST_USER_A.email, "second", root);
    signInAs(TEST_USER_B.email);

    await deleteComment(first);

    // The middle of a thread reads correctly only if the removed reply still occupies its slot.
    const comments = await fetchComments(SUBJECT);
    expect(comments!.map((c) => c.body)).toEqual(["root", "", "second"]);
    expect(comments!.map((c) => c.deleted)).toEqual([false, true, false]);
  });

  test("keeps a root tombstoned while a tombstoned reply still hangs off it", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);
    signInAs(TEST_USER_B.email);
    await deleteComment(reply);

    // The reply survives as a tombstone, so the root is still holding a thread together.
    signInAs(TEST_USER_A.email);
    expect(await deleteComment(root)).toEqual({ ok: true, value: { tombstoned: true } });
    expect(await readComment(root)).toBeDefined();
    expect(await readComment(reply)).toBeDefined();
  });

  test("rejects an anonymous delete", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "safe");
    expect(await deleteComment(id)).toEqual({ ok: false, error: CommentError.Unauthenticated });
    expect(await readComment(id)).toBeDefined();
  });

  test("refuses to let one user delete another's comment", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "A's words");
    signInAs(TEST_USER_B.email);

    expect(await deleteComment(id)).toEqual({ ok: false, error: CommentError.Forbidden });
    expect(await readComment(id)).toBeDefined();
  });

  test("lets an admin delete anyone's comment", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "B's words");
    signInAs(TEST_USER_A.email);

    expect(await deleteComment(id)).toEqual({ ok: true, value: { tombstoned: false } });
    expect(await readComment(id)).toBeUndefined();
  });

  test("rejects a delete of a comment that does not exist", async () => {
    signInAs(TEST_USER_A.email);
    expect(await deleteComment(2_000_000_000)).toEqual({ ok: false, error: CommentError.NotFound });
  });

  test("refuses a second delete and leaves the original timestamp alone", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);
    signInAs(TEST_USER_A.email);
    await deleteComment(root);
    const firstStamp = (await readComment(root)).deletedAt;

    expect(await deleteComment(root)).toEqual({ ok: false, error: CommentError.Deleted });
    expect((await readComment(root)).deletedAt).toEqual(firstStamp);
  });

  test("refuses an admin a second delete too, deletion being final for everyone", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_B.email, "root");
    await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);
    signInAs(TEST_USER_B.email);
    await deleteComment(root);

    signInAs(TEST_USER_A.email);
    expect(await deleteComment(root)).toEqual({ ok: false, error: CommentError.Deleted });
  });

  // No action reaches this: a root with replies always tombstones. Pinned at the schema level
  // because it is what a hard purge would rely on, and what `afterEach` cleans up through.
  test("removing a root row takes its replies with it, through the self-referencing cascade", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);

    await db.delete(commentsTable).where(eq(commentsTable.id, root));
    expect(await readComment(reply)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// purgeComment
// ---------------------------------------------------------------------------

describe("purgeComment", () => {
  test("rejects an anonymous purge", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "safe");
    expect(await purgeComment(id)).toEqual({ ok: false, error: CommentError.Forbidden });
    expect(await readComment(id)).toBeDefined();
  });

  test("rejects a purge by a signed-in non-admin, even of their own comment", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "B's words");
    signInAs(TEST_USER_B.email);

    expect(await purgeComment(id)).toEqual({ ok: false, error: CommentError.Forbidden });
    expect(await readComment(id)).toBeDefined();
  });

  test("removes a root and its replies, reporting the total", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const first = await insertComment(SUBJECT, TEST_USER_B.email, "first", root);
    const second = await insertComment(SUBJECT, TEST_USER_B.email, "second", root);
    signInAs(TEST_USER_A.email);

    expect(await purgeComment(root)).toEqual({ ok: true, value: { purged: 3 } });
    expect(await readComment(root)).toBeUndefined();
    expect(await readComment(first)).toBeUndefined();
    expect(await readComment(second)).toBeUndefined();
  });

  test("clears a thread that tombstones alone could never remove", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);

    // Both participants delete their own; the thread survives as two tombstones and is now beyond
    // their reach, `deleteComment` being final. This is the case purging exists for.
    signInAs(TEST_USER_B.email);
    await deleteComment(reply);
    signInAs(TEST_USER_A.email);
    await deleteComment(root);
    expect(await deleteComment(root)).toEqual({ ok: false, error: CommentError.Deleted });

    expect(await purgeComment(root)).toEqual({ ok: true, value: { purged: 2 } });
    expect(await fetchComments(SUBJECT)).toEqual([]);
  });

  test("removes a reply on its own, leaving the rest of the thread standing", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "root");
    const reply = await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);
    signInAs(TEST_USER_A.email);

    expect(await purgeComment(reply)).toEqual({ ok: true, value: { purged: 1 } });
    expect(await readComment(reply)).toBeUndefined();
    expect((await readComment(root)).body).toBe("root");
  });

  test("takes the reports filed against a purged comment with it", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "reported text");
    signInAs(TEST_USER_A.email);
    await reportComment(id, "needs a look");
    expect((await fetchOpenReports())!.some((r) => r.commentId === id)).toBe(true);

    await purgeComment(id);
    expect((await fetchOpenReports())!.some((r) => r.commentId === id)).toBe(false);
  });

  test("rejects a purge of a comment that does not exist", async () => {
    signInAs(TEST_USER_A.email);
    expect(await purgeComment(2_000_000_000)).toEqual({ ok: false, error: CommentError.NotFound });
  });
});

// ---------------------------------------------------------------------------
// reportComment
// ---------------------------------------------------------------------------

describe("reportComment", () => {
  /** Reports filed against one comment, newest state included. */
  async function reportsFor(commentId: number) {
    return db
      .select()
      .from(commentReportsTable)
      .where(eq(commentReportsTable.commentId, commentId));
  }

  test("records a report with its reason", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "questionable");
    signInAs(TEST_USER_B.email);

    expect(await reportComment(id, "spam")).toEqual({ ok: true, value: null });

    const [report] = await reportsFor(id);
    expect(report.reporter).toBe(await userId(TEST_USER_B.email));
    expect(report.reason).toBe("spam");
    expect(report.resolvedAt).toBeNull();
  });

  test("stores a null reason when none is given", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "questionable");
    signInAs(TEST_USER_B.email);
    await reportComment(id);

    expect((await reportsFor(id))[0].reason).toBeNull();
  });

  test("stores a null reason for a whitespace-only one", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "questionable");
    signInAs(TEST_USER_B.email);
    await reportComment(id, "   ");

    expect((await reportsFor(id))[0].reason).toBeNull();
  });

  test("dedupes a repeat report from the same user", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "questionable");
    signInAs(TEST_USER_B.email);

    await reportComment(id, "first");
    expect(await reportComment(id, "second")).toEqual({ ok: true, value: null });

    const reports = await reportsFor(id);
    expect(reports).toHaveLength(1);
    expect(reports[0].reason).toBe("first");
  });

  test("keeps reports from different users separate", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "questionable");

    signInAs(TEST_USER_B.email);
    await reportComment(id, "from B");
    signInAs(TEST_USER_A.email);
    await reportComment(id, "from A");

    expect(await reportsFor(id)).toHaveLength(2);
  });

  test("rejects an anonymous report", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "questionable");
    expect(await reportComment(id)).toEqual({ ok: false, error: CommentError.Unauthenticated });
    expect(await reportsFor(id)).toHaveLength(0);
  });

  test("rejects a report against a comment that does not exist", async () => {
    signInAs(TEST_USER_B.email);
    expect(await reportComment(2_000_000_000)).toEqual({ ok: false, error: CommentError.NotFound });
  });

  test("rejects a report against a tombstone, whose text is already gone", async () => {
    const root = await insertComment(SUBJECT, TEST_USER_A.email, "questionable");
    await insertComment(SUBJECT, TEST_USER_B.email, "reply", root);
    signInAs(TEST_USER_A.email);
    await deleteComment(root);

    signInAs(TEST_USER_B.email);
    expect(await reportComment(root, "spam")).toEqual({ ok: false, error: CommentError.Deleted });
    expect(await reportsFor(root)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// fetchOpenReports / resolveReport
// ---------------------------------------------------------------------------

describe("fetchOpenReports", () => {
  test("returns undefined for an anonymous reader", async () => {
    expect(await fetchOpenReports()).toBeUndefined();
  });

  test("returns undefined for a signed-in non-admin", async () => {
    signInAs(TEST_USER_B.email);
    expect(await fetchOpenReports()).toBeUndefined();
  });

  test("returns the open report with its reporter and reported comment", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "reported text");
    signInAs(TEST_USER_A.email);
    await reportComment(id, "needs a look");

    const reports = await fetchOpenReports();
    const found = reports!.find((r) => r.commentId === id);

    expect(found).toBeDefined();
    expect(found!.reporterDisplayName).toBe(TEST_USER_A.name);
    expect(found!.reason).toBe("needs a look");
    expect(found!.comment).toMatchObject({
      body: "reported text",
      authorDisplayName: TEST_USER_B.name,
      subjectType: SUBJECT.type,
      subjectKey: SUBJECT.key,
    });
  });

  test("never includes an email", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "reported text");
    signInAs(TEST_USER_A.email);
    await reportComment(id);

    const reports = await fetchOpenReports();
    expect(JSON.stringify(reports)).not.toContain(TEST_USER_B.email);
  });

  test("omits a resolved report", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "reported text");
    signInAs(TEST_USER_A.email);
    await reportComment(id);
    await resolveReport(id, await userId(TEST_USER_A.email));

    const reports = await fetchOpenReports();
    expect(reports!.some((r) => r.commentId === id)).toBe(false);
  });
});

describe("resolveReport", () => {
  test("stamps resolved_at without touching the comment", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "reported text");
    signInAs(TEST_USER_B.email);
    await reportComment(id);

    const reporter = await userId(TEST_USER_B.email);
    signInAs(TEST_USER_A.email);
    expect(await resolveReport(id, reporter)).toEqual({ ok: true, value: null });

    const [report] = await db
      .select()
      .from(commentReportsTable)
      .where(
        and(eq(commentReportsTable.commentId, id), eq(commentReportsTable.reporter, reporter)),
      );
    expect(report.resolvedAt).not.toBeNull();
    expect((await readComment(id)).body).toBe("reported text");
  });

  test("rejects an anonymous resolve", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_B.email, "reported text");
    signInAs(TEST_USER_B.email);
    await reportComment(id);
    const reporter = await userId(TEST_USER_B.email);

    signInAs(undefined);
    expect(await resolveReport(id, reporter)).toEqual({ ok: false, error: CommentError.Forbidden });
  });

  test("rejects a resolve by a non-admin", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "reported text");
    signInAs(TEST_USER_B.email);
    await reportComment(id);

    expect(await resolveReport(id, await userId(TEST_USER_B.email))).toEqual({
      ok: false,
      error: CommentError.Forbidden,
    });
  });

  test("reports not-found for a report that does not exist", async () => {
    signInAs(TEST_USER_A.email);
    expect(await resolveReport(2_000_000_000, 1)).toEqual({
      ok: false,
      error: CommentError.NotFound,
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: no mutating action trusts the client for identity
// ---------------------------------------------------------------------------

describe("unauthenticated requests", () => {
  test("every mutating action refuses without a session", async () => {
    const id = await insertComment(SUBJECT, TEST_USER_A.email, "untouched");

    const results = await Promise.all([
      postComment(SUBJECT, "nope"),
      editComment(id, "nope"),
      deleteComment(id),
      purgeComment(id),
      reportComment(id),
      resolveReport(id, 1),
    ]);

    expect(results.every((r) => !r.ok)).toBe(true);
    expect((await readComment(id)).body).toBe("untouched");
  });

  test("a session for an email with no user row is not a session", async () => {
    signInAs("nobody@sci-cream.ca");
    expect(await postComment(SUBJECT, "ghost")).toEqual({
      ok: false,
      error: CommentError.Unauthenticated,
    });
  });
});
