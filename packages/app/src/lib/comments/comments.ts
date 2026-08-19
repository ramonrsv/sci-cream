/**
 * Shapes and pure helpers for public comment threads: the wire types the server actions return,
 * body validation, thread grouping, and relative-time formatting.
 */

/**
 * Longest body accepted, matching `MAX_SHARE_COMMENT_CHARS`. The database repeats the cap as a
 * `check` constraint; this one exists to refuse the write with a message instead of an exception.
 */
export const MAX_COMMENT_BODY_CHARS = 2000;

/** Comments one author may post inside {@link COMMENT_RATE_WINDOW_MINUTES}. */
export const COMMENT_RATE_LIMIT = 5;

/** Width of the rate-limit window, in minutes. */
export const COMMENT_RATE_WINDOW_MINUTES = 10;

/**
 * Who deleted a comment, which decides what its tombstone says.
 * Derived server-side from `deleted_by`: the wire carries that a moderator acted, never which one.
 */
export enum CommentDeletion {
  /** The author withdrew it. */
  Author = "author",
  /** An admin removed it, which is corrective action rather than a withdrawal. */
  Moderator = "moderator",
}

/** What a tombstone renders in place of its body. */
export const COMMENT_DELETION_LABELS: Record<CommentDeletion, string> = {
  [CommentDeletion.Author]: "[deleted]",
  [CommentDeletion.Moderator]: "[removed]",
};

/** A comment as sent to the client. The author's email never leaves the server. */
export interface CommentJson {
  id: number;
  /** Null for a root comment; otherwise the root this one replies to. */
  parentId: number | null;
  /** Compared against the session user to decide which actions to offer; never displayed. */
  authorId: number;
  /** The byline to render; resolved per fetch, so its source can change without a migration. */
  authorDisplayName: string;
  /** Empty for a tombstone, a comment kept only to hold its place in the thread. */
  body: string;
  /** ISO 8601, stringified server-side so the payload stays serializable. */
  createdAt: string;
  /** Present only once edited; its presence is what renders the edited marker. */
  updatedAt?: string;
  /** Present only for a tombstone, naming who deleted it; a row with one renders in place. */
  deletion?: CommentDeletion;
}

/** A root comment together with its replies, oldest first. */
export interface CommentThreadJson {
  root: CommentJson;
  replies: CommentJson[];
}

/**
 * Why a mutating action refused. Every value is something the composer can explain to the user.
 *
 * The string values cross the server-action boundary, so they are the wire format and renaming one
 * is a protocol change; the member names are free to read however they read best.
 */
export enum CommentError {
  Unauthenticated = "unauthenticated",
  Forbidden = "forbidden",
  /** No such comment: a forged id, or one from a page stale enough that the row has been purged. */
  NotFound = "not-found",
  /** The comment is a tombstone, which refuses edits, further deletes, and reports alike. */
  Deleted = "deleted",
  BadSubject = "bad-subject",
  Empty = "empty",
  TooLong = "too-long",
  RateLimited = "rate-limited",
}

/**
 * Result of a mutating comment action.
 *
 * A deliberate departure from `data.ts`, which returns `undefined` and logs. That is fine for
 * private actions whose failures are bugs, but a public composer has to tell the user *why* their
 * comment was refused. Reads keep the `undefined`-on-failure convention.
 */
export type CommentResult<T> = { ok: true; value: T } | { ok: false; error: CommentError };

/** Human-readable text for a {@link CommentError}, shown next to the composer. */
export const COMMENT_ERROR_MESSAGES: Record<CommentError, string> = {
  [CommentError.Unauthenticated]: "Sign in to post a comment.",
  [CommentError.Forbidden]: "You can't do that.",
  [CommentError.NotFound]: "That comment doesn't exist.",
  [CommentError.Deleted]: "That comment was deleted.",
  [CommentError.BadSubject]: "Comments aren't available for this page.",
  [CommentError.Empty]: "Write something first.",
  [CommentError.TooLong]: `Comments are limited to ${MAX_COMMENT_BODY_CHARS} characters.`,
  [CommentError.RateLimited]: `Too many comments — wait a few minutes before posting again.`,
};

/**
 * Validate a body as typed, returning the trimmed text to store or the reason it was refused.
 *
 * Both sides call this: the client to disable its button, the server because that secures nothing.
 */
export function validateCommentBody(body: string): CommentResult<string> {
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, error: CommentError.Empty };
  if (trimmed.length > MAX_COMMENT_BODY_CHARS) return { ok: false, error: CommentError.TooLong };
  return { ok: true, value: trimmed };
}

/** True when `body` would be accepted; the composer's submit button reads this. */
export function isValidCommentBody(body: string): boolean {
  return validateCommentBody(body).ok;
}

/**
 * Group a flat, `created_at`-ascending comment list into roots with their replies.
 *
 * Roots keep the order they arrive in, as do the replies within each. A reply whose parent is
 * missing is dropped, not promoted to a root where it would answer nothing.
 */
export function groupCommentThreads(comments: readonly CommentJson[]): CommentThreadJson[] {
  const threads = new Map<number, CommentThreadJson>();

  for (const comment of comments) {
    if (comment.parentId === null) threads.set(comment.id, { root: comment, replies: [] });
  }
  for (const comment of comments) {
    if (comment.parentId !== null) threads.get(comment.parentId)?.replies.push(comment);
  }

  return Array.from(threads.values());
}

/** Milliseconds per unit, largest first, for {@link formatRelativeTime}. */
const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * An ISO timestamp as text like `3 days ago`, or `just now` under a minute.
 *
 * `now` is a parameter so tests can pin it. Timestamps are stored without a zone but written by
 * `now()` in UTC, so a bare ISO string is parsed as UTC rather than as local time.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  const elapsed = now.getTime() - then.getTime();

  // A clock skew that puts the timestamp slightly ahead reads better as "just now" than "in 3s".
  if (elapsed < 60 * 1000) return "just now";

  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_TIME_UNITS) {
    if (elapsed >= ms) return format.format(-Math.floor(elapsed / ms), unit);
  }
  return "just now";
}
