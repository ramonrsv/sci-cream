"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  COMMENT_RATE_LIMIT,
  COMMENT_RATE_WINDOW_MINUTES,
  CommentDeletion,
  CommentError,
  validateCommentBody,
  type CommentJson,
  type CommentResult,
} from "@/lib/comments/comments";
import { isCommentSubject, type CommentSubject } from "@/lib/comments/subject";
import { requireAdmin, requireUser } from "@/lib/data/session";
import { db } from "@/lib/database/client";
import {
  commentReportsTable,
  commentsTable,
  usersTable,
  type CommentSelect,
} from "@/lib/database/schema";
import { getMarkdownSlugs } from "@/lib/markdown";
import { log as baseLog } from "@/lib/log";

/**
 * Server actions for public comment threads.
 *
 * Identity comes from `requireUser()`; no action here takes a user identifier from the caller.
 * Subjects are validated against the content tree on every call, since the `comment_subject_type`
 * enum constrains a subject's type but never its key.
 */

const log = baseLog.child({ mod: "data/comments" });

/** One open report joined to the comment it is about, for the moderation queue. */
export type OpenReportJson = {
  commentId: number;
  reporterId: number;
  reporterDisplayName: string;
  reason?: string;
  /** ISO 8601, stringified server-side so the payload stays serializable. */
  createdAt: string;
  /** The reported comment, or `undefined` if it has since been hard-deleted. */
  comment?: CommentJson & { subjectType: string; subjectKey: string };
};

/** Convert a `comments` row to its wire shape. The author's email is never part of it. */
function toCommentJson(row: CommentSelect, authorDisplayName: string): CommentJson {
  return {
    id: row.id,
    parentId: row.parentId,
    authorId: row.author,
    authorDisplayName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    ...(row.updatedAt != null && { updatedAt: row.updatedAt.toISOString() }),
    // Anyone but the author is an admin, deletion being open to no one else.
    ...(row.deletedAt != null && {
      deletion: row.deletedBy === row.author ? CommentDeletion.Author : CommentDeletion.Moderator,
    }),
  };
}

/**
 * True when `subject` names a page that actually exists.
 *
 * The enum constrains the type but not the key, so without this a client could open a thread on
 * any key. A forged type fails twice: `isCommentSubject` rejects it, `getMarkdownSlugs` throws.
 *
 * Alone in reading `content/` at runtime; every other caller runs at build. Output tracing ships
 * the directory with the routes reaching here — were it to miss, every subject would read unknown.
 */
function isKnownSubject(subject: unknown): subject is CommentSubject {
  if (!isCommentSubject(subject)) return false;
  try {
    return getMarkdownSlugs(subject.type).includes(subject.key);
  } catch {
    return false;
  }
}

/**
 * The root comment a reply may attach to, or `undefined` if `parentId` is not one.
 *
 * Three conditions in one place: the parent exists, it is itself a root (which is what caps
 * threading at one level), and it belongs to the same subject — without the last, a reply could be
 * smuggled onto a thread on another page by passing that page's parent id.
 */
async function findRootComment(
  parentId: number,
  subject: CommentSubject,
): Promise<CommentSelect | undefined> {
  const [row] = await db
    .select()
    .from(commentsTable)
    .where(
      and(
        eq(commentsTable.id, parentId),
        isNull(commentsTable.parentId),
        eq(commentsTable.subjectType, subject.type),
        eq(commentsTable.subjectKey, subject.key),
      ),
    );
  return row;
}

/** How many replies hang off a root, tombstoned ones included. */
async function countReplies(rootId: number): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(commentsTable)
    .where(eq(commentsTable.parentId, rootId));
  return Number(count);
}

/** True when the author has already used up their allowance inside the rate-limit window. */
async function isRateLimited(userId: number): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(commentsTable)
    .where(
      and(
        eq(commentsTable.author, userId),
        sql`${commentsTable.createdAt} > now() - make_interval(mins => ${COMMENT_RATE_WINDOW_MINUTES})`,
      ),
    );
  return Number(count) >= COMMENT_RATE_LIMIT;
}

/**
 * Every comment on a subject, oldest first, roots and replies together.
 *
 * Public: no session required, and none consulted. Returns `undefined` for an unknown subject,
 * following the read convention in the sibling modules. Tombstones come back with an empty body
 * and a `deletion` — their text was blanked at deletion, so there is nothing to withhold.
 */
export async function fetchComments(subject: CommentSubject): Promise<CommentJson[] | undefined> {
  if (!isKnownSubject(subject)) {
    log.warn({ action: "fetchComments" }, "unknown subject");
    return undefined;
  }

  const rows = await db
    .select({ comment: commentsTable, authorDisplayName: usersTable.name })
    .from(commentsTable)
    .innerJoin(usersTable, eq(usersTable.id, commentsTable.author))
    .where(
      and(eq(commentsTable.subjectType, subject.type), eq(commentsTable.subjectKey, subject.key)),
    )
    .orderBy(asc(commentsTable.createdAt), asc(commentsTable.id));

  return rows.map(({ comment, authorDisplayName }) => toCommentJson(comment, authorDisplayName));
}

/**
 * Post a comment, or a reply when `parentId` is given.
 *
 * The author is the signed-in user; there is no parameter for it. Subject, body, rate limit, then
 * parent — so a malformed request is named as such rather than masked by the throttle.
 */
export async function postComment(
  subject: CommentSubject,
  body: string,
  parentId?: number,
): Promise<CommentResult<CommentJson>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: CommentError.Unauthenticated };

  if (!isKnownSubject(subject)) return { ok: false, error: CommentError.BadSubject };

  const validated = validateCommentBody(body);
  if (!validated.ok) return validated;

  if (await isRateLimited(user.id)) return { ok: false, error: CommentError.RateLimited };

  if (parentId !== undefined && !(await findRootComment(parentId, subject))) {
    return { ok: false, error: CommentError.NotFound };
  }

  const [row] = await db
    .insert(commentsTable)
    .values({
      subjectType: subject.type,
      subjectKey: subject.key,
      author: user.id,
      parentId: parentId ?? null,
      body: validated.value,
    })
    .returning();

  return { ok: true, value: toCommentJson(row, user.name) };
}

/** Edit one's own comment. Admins have no special power here — moderation deletes, never edits. */
export async function editComment(id: number, body: string): Promise<CommentResult<CommentJson>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: CommentError.Unauthenticated };

  const validated = validateCommentBody(body);
  if (!validated.ok) return validated;

  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!existing) return { ok: false, error: CommentError.NotFound };
  if (existing.deletedAt != null) return { ok: false, error: CommentError.Deleted };
  if (existing.author !== user.id) return { ok: false, error: CommentError.Forbidden };

  const [row] = await db
    .update(commentsTable)
    .set({ body: validated.value, updatedAt: sql`now()` })
    .where(eq(commentsTable.id, id))
    .returning();

  return { ok: true, value: toCommentJson(row, user.name) };
}

/**
 * Delete a comment, as its author or as an admin.
 *
 * Only a root with no replies is removed outright. Anything holding a place in a thread — a root
 * with replies, or any reply — is tombstoned: the body is blanked in the same statement, so the
 * text leaves the database while the position that keeps the surrounding sequence readable stays.
 *
 * Final either way: a tombstone refuses a second delete as it refuses an edit, so `deletedAt`
 * records when the text went rather than when someone last pressed the button. `deletedBy` records
 * who took it, which is what lets an admin's removal read differently from a withdrawal.
 *
 * A moderator's removal closes the open reports on the comment in the same transaction: acting on
 * one is what those reports asked for, and the queue would otherwise keep listing a blanked row.
 * A hard delete needs no such step — the cascade takes the reports with the row.
 */
export async function deleteComment(id: number): Promise<CommentResult<{ tombstoned: boolean }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: CommentError.Unauthenticated };

  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!existing) return { ok: false, error: CommentError.NotFound };
  if (existing.deletedAt != null) return { ok: false, error: CommentError.Deleted };
  if (existing.author !== user.id && !user.isAdmin)
    return { ok: false, error: CommentError.Forbidden };

  if (existing.parentId !== null || (await countReplies(id)) > 0) {
    await db.transaction(async (tx) => {
      await tx
        .update(commentsTable)
        .set({ body: "", deletedAt: sql`now()`, deletedBy: user.id })
        .where(eq(commentsTable.id, id));

      if (existing.author === user.id) return;
      await tx
        .update(commentReportsTable)
        .set({ resolvedAt: sql`now()` })
        .where(and(eq(commentReportsTable.commentId, id), isNull(commentReportsTable.resolvedAt)));
    });
    return { ok: true, value: { tombstoned: true } };
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, id));
  return { ok: true, value: { tombstoned: false } };
}

/**
 * Remove a comment outright, its replies included. Admin only.
 *
 * The counterpart to `deleteComment`, whose tombstones are deliberately permanent: once anyone has
 * replied, no participant can clear the thread. Deleting the row lets the self-referencing cascade
 * take the replies, and the reports filed against any of them, along with it.
 */
export async function purgeComment(id: number): Promise<CommentResult<{ purged: number }>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: CommentError.Forbidden };

  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!existing) return { ok: false, error: CommentError.NotFound };

  // Counted first: `RETURNING` reports the row named, never the ones the cascade takes.
  // Only a root can have replies, threading being capped at one level, so a reply skips the query.
  const replies = existing.parentId === null ? await countReplies(id) : 0;
  await db.delete(commentsTable).where(eq(commentsTable.id, id));

  return { ok: true, value: { purged: 1 + replies } };
}

/**
 * Report a comment for review. Reporting the same comment twice is a no-op rather than an error —
 * the composite primary key makes one-report-per-user-per-comment a property of the key. A
 * tombstone is refused: its text is already gone, so there is nothing left to moderate.
 */
export async function reportComment(
  commentId: number,
  reason?: string,
): Promise<CommentResult<null>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: CommentError.Unauthenticated };

  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!existing) return { ok: false, error: CommentError.NotFound };
  if (existing.deletedAt != null) return { ok: false, error: CommentError.Deleted };

  const trimmed = reason?.trim();
  await db
    .insert(commentReportsTable)
    .values({ commentId, reporter: user.id, reason: trimmed || null })
    .onConflictDoNothing();

  return { ok: true, value: null };
}

/**
 * Every unresolved report, oldest first, joined to its reporter and the comment it is about.
 *
 * Admin only; `undefined` for anyone else, who cannot tell an empty queue from a forbidden one.
 */
export async function fetchOpenReports(): Promise<OpenReportJson[] | undefined> {
  const admin = await requireAdmin();
  if (!admin) {
    log.warn({ action: "fetchOpenReports" }, "not an admin");
    return undefined;
  }

  // The query joins `users` twice — once for the reporter, once for the comment's author.
  const authors = alias(usersTable, "authors");

  const rows = await db
    .select({
      report: commentReportsTable,
      reporterDisplayName: usersTable.name,
      comment: commentsTable,
      authorDisplayName: authors.name,
    })
    .from(commentReportsTable)
    .innerJoin(usersTable, eq(usersTable.id, commentReportsTable.reporter))
    .leftJoin(commentsTable, eq(commentsTable.id, commentReportsTable.commentId))
    .leftJoin(authors, eq(authors.id, commentsTable.author))
    .where(isNull(commentReportsTable.resolvedAt))
    .orderBy(asc(commentReportsTable.createdAt));

  return rows.map(({ report, reporterDisplayName, comment, authorDisplayName }) => ({
    commentId: report.commentId,
    reporterId: report.reporter,
    reporterDisplayName,
    ...(report.reason != null && { reason: report.reason }),
    createdAt: report.createdAt.toISOString(),
    ...(comment != null && {
      comment: {
        ...toCommentJson(comment, authorDisplayName ?? "unknown"),
        subjectType: comment.subjectType,
        subjectKey: comment.subjectKey,
      },
    }),
  }));
}

/** Close one report, leaving the comment itself alone. Admin only. */
export async function resolveReport(
  commentId: number,
  reporter: number,
): Promise<CommentResult<null>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: CommentError.Forbidden };

  const [row] = await db
    .update(commentReportsTable)
    .set({ resolvedAt: sql`now()` })
    .where(
      and(eq(commentReportsTable.commentId, commentId), eq(commentReportsTable.reporter, reporter)),
    )
    .returning();

  return row ? { ok: true, value: null } : { ok: false, error: CommentError.NotFound };
}
