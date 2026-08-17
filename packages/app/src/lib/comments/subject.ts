/**
 * What a comment thread hangs off. Two parts, because only one is a closed set: the *type* is a
 * vocabulary the app defines, while the *key* is open text the type gives meaning to — a markdown
 * slug today, an ingredient name or an `"Author: Name"` recipe composite later.
 *
 * The source of truth for the type half: `schema.ts` builds the `comment_subject_type` enum from
 * {@link COMMENT_SUBJECT_TYPES}, as `categoryEnum` comes from the crate's `SchemaCategory`, so the
 * TS union and the database type cannot drift.
 */

/** Every kind of thing a comment thread can hang off. Order is the Postgres enum's own order. */
export const COMMENT_SUBJECT_TYPES = ["blog", "docs"] as const;

/** One of {@link COMMENT_SUBJECT_TYPES}; the `subject_type` column narrows to exactly this. */
export type CommentSubjectType = (typeof COMMENT_SUBJECT_TYPES)[number];

/** The thing a thread hangs off: a closed `type` plus the open `key` that type gives meaning to. */
export interface CommentSubject {
  type: CommentSubjectType;
  key: string;
}

/** Type guard for a value off the wire; a forged type fails validation, not the insert. */
export function isCommentSubjectType(value: unknown): value is CommentSubjectType {
  return typeof value === "string" && (COMMENT_SUBJECT_TYPES as readonly string[]).includes(value);
}

/** Type guard for a whole subject, shape included; neither half can be assumed to be a string. */
export function isCommentSubject(value: unknown): value is CommentSubject {
  if (typeof value !== "object" || value === null) return false;
  const { type, key } = value as Partial<CommentSubject>;
  return isCommentSubjectType(type) && typeof key === "string" && key.length > 0;
}

/**
 * The page a subject is rendered on, used for the signed-out composer's `callbackUrl`.
 *
 * Both current sections mount their thread at `/{type}/{key}`; a later type whose route does not
 * follow that shape gets a branch here rather than at each call site.
 */
export function commentSubjectPath(subject: CommentSubject): string {
  return `/${subject.type}/${subject.key}`;
}
