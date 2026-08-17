"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { CommentItem } from "@/app/_elements/comment";
import { MarkdownField } from "@/app/_elements/markdown";
import {
  COMMENT_ERROR_MESSAGES,
  groupCommentThreads,
  isValidCommentBody,
  type CommentError,
  type CommentJson,
  type CommentResult,
} from "@/lib/comments/comments";
import {
  deleteComment,
  editComment,
  fetchComments,
  postComment,
  reportComment,
} from "@/lib/data/comments";
import { commentSubjectPath, type CommentSubject } from "@/lib/comments/subject";

/** Which composer, if any, is open: the top-level one, a reply to a root, or an edit. */
type Composer =
  | { kind: "root" }
  | { kind: "reply"; parentId: number }
  | { kind: "edit"; id: number };

/** True when `a` and `b` address the same composer. */
function sameComposer(a: Composer | undefined, b: Composer): boolean {
  if (a?.kind !== b.kind) return false;
  if (a.kind === "reply" && b.kind === "reply") return a.parentId === b.parentId;
  if (a.kind === "edit" && b.kind === "edit") return a.id === b.id;
  return true;
}

/**
 * The comment thread for one subject.
 *
 * A client island, which the composer's `useSession()` required anyway: it keeps both `[slug]`
 * routes statically generated, at the cost of comments being absent from the initial HTML.
 *
 * Mutate then re-fetch rather than edit locally, as `SessionResourcesProvider` does.
 */
export function CommentThread({ subject }: { subject: CommentSubject }) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";
  const currentUserId = session?.user?.id === undefined ? undefined : Number(session.user.id);

  const [comments, setComments] = useState<CommentJson[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState<Composer | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<CommentError | undefined>(undefined);
  const [pending, setPending] = useState(false);

  // The one memoized callback here: the mount effect depends on it, and a fresh identity each
  // render would re-fire the effect, whose own setState would spin that into a fetch loop.
  const refresh = useCallback(async () => {
    const rows = await fetchComments(subject);
    setComments(rows);
    setLoading(false);
  }, [subject]);

  // The refresh callback sets state only after awaiting its fetch, not synchronously here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Close whatever composer is open and clear its draft and error. */
  const closeComposer = () => {
    setComposer(undefined);
    setDraft("");
    setError(undefined);
  };

  /** Open a composer, seeded with `initial` (the existing body, when editing). */
  const openComposer = (next: Composer, initial = "") => {
    setComposer((prev) => (sameComposer(prev, next) ? undefined : next));
    setDraft(initial);
    setError(undefined);
  };

  /** Run a mutating action, surfacing its error or re-fetching the thread on success. */
  const run = async (action: () => Promise<CommentResult<unknown>>, onSuccess?: () => void) => {
    setPending(true);
    const result = await action();
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSuccess?.();
    await refresh();
  };

  const submitComposer = async () => {
    if (composer === undefined) return;
    await run(
      () =>
        composer.kind === "edit"
          ? editComment(composer.id, draft)
          : postComment(subject, draft, composer.kind === "reply" ? composer.parentId : undefined),
      closeComposer,
    );
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    await run(() => deleteComment(id), closeComposer);
  };

  const handleReport = async (id: number) => {
    if (!window.confirm("Report this comment for review?")) return;
    await run(() => reportComment(id));
  };

  /** The actions offered on one comment, given who is signed in. */
  const actionsFor = (comment: CommentJson, isRoot: boolean) => {
    if (!signedIn) return {};
    const mine = comment.authorId === currentUserId;
    return {
      ...(isRoot && { onReply: () => openComposer({ kind: "reply", parentId: comment.id }) }),
      ...(mine && {
        onEdit: () => openComposer({ kind: "edit", id: comment.id }, comment.body),
        onDelete: () => void handleDelete(comment.id),
      }),
      ...(!mine && { onReport: () => void handleReport(comment.id) }),
    };
  };

  /** The composer, rendered wherever it is currently open. */
  const renderComposer = (where: Composer) => {
    if (composer === undefined || !sameComposer(composer, where)) return undefined;
    const editing = composer.kind === "edit";
    return (
      <div className="mt-2 flex flex-col gap-2">
        <MarkdownField
          value={draft}
          onChange={setDraft}
          ariaLabel={editing ? "Edit comment" : "Comment"}
          placeholder={editing ? "Edit your comment…" : "Add a comment…"}
          textareaTestId="comment-input"
        />
        {error !== undefined && (
          <p className="text-sm text-red-500" role="alert">
            {COMMENT_ERROR_MESSAGES[error]}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void submitComposer()}
            disabled={pending || !isValidCommentBody(draft)}
            className="btn-primary px-3 py-1"
          >
            {editing ? "Save" : "Post"}
          </button>
          <button type="button" onClick={closeComposer} className="action-button px-3 py-1">
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const threads = groupCommentThreads(comments ?? []);

  return (
    // No width of its own: both mounts sit in a centred `max-w-5xl` container, and `mx-auto` here
    // would shrink-wrap the section inside the docs page's flex column instead of stretching it.
    <section className="comments" aria-label="Comments">
      <h2 className="text-txt-prim mb-3 text-lg font-semibold">
        Comments{comments !== undefined && ` (${comments.length})`}
      </h2>

      {loading ? (
        <p className="text-secondary text-sm">Loading comments…</p>
      ) : comments === undefined ? (
        <p className="text-secondary text-sm">Comments aren&apos;t available for this page.</p>
      ) : (
        <>
          {threads.length === 0 && <p className="text-secondary text-sm">No comments yet.</p>}
          {threads.map(({ root, replies }) => (
            <div key={root.id} className="mb-3">
              <CommentItem comment={root} actions={actionsFor(root, true)}>
                {renderComposer({ kind: "edit", id: root.id })}
                {renderComposer({ kind: "reply", parentId: root.id })}
              </CommentItem>
              {replies.length > 0 && (
                <div className="comment-replies">
                  {replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} actions={actionsFor(reply, false)}>
                      {renderComposer({ kind: "edit", id: reply.id })}
                    </CommentItem>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {comments !== undefined &&
        (signedIn ? (
          composer?.kind === "root" ? (
            renderComposer({ kind: "root" })
          ) : (
            <button
              type="button"
              onClick={() => openComposer({ kind: "root" })}
              className="action-button px-3 py-1 text-sm"
            >
              Add a comment
            </button>
          )
        ) : (
          status === "unauthenticated" && (
            <p className="text-secondary text-sm">
              <Link
                href={`/signin?callbackUrl=${encodeURIComponent(commentSubjectPath(subject))}`}
                className="text-blue-500 hover:underline dark:text-blue-400"
              >
                Sign in
              </Link>{" "}
              to join the discussion.
            </p>
          )
        ))}
    </section>
  );
}
