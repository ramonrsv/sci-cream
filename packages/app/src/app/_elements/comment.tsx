"use client";

import { Markdown } from "@/app/_elements/markdown";
import { formatRelativeTime, type CommentJson } from "@/lib/comments/comments";

/** Which actions to offer on a comment; the thread decides, this element only renders. */
export interface CommentActions {
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

/**
 * One comment: author, relative timestamp, an edited marker, the rendered body, and whichever
 * actions the thread passed. Purely presentational — every decision about who may do what is made
 * upstream (and again on the server, which is what actually enforces it).
 *
 * A tombstone renders `[deleted]` and offers no actions: its body was blanked in the database when
 * it was deleted, and it is kept only to hold its place in the thread.
 */
export function CommentItem({
  comment,
  actions = {},
  children,
}: {
  comment: CommentJson;
  actions?: CommentActions;
  /** Slot under the comment for the thread's reply or edit composer. */
  children?: React.ReactNode;
}) {
  const { onReply, onEdit, onDelete, onReport } = comment.deleted ? {} : actions;
  const hasActions = onReply ?? onEdit ?? onDelete ?? onReport;

  return (
    <div className="comment-card" data-testid={`comment-${comment.id}`}>
      <div className="comment-meta">
        <span className="text-txt-prim font-medium">{comment.authorDisplayName}</span>
        <time dateTime={comment.createdAt}>{formatRelativeTime(comment.createdAt)}</time>
        {comment.updatedAt !== undefined && <span title={comment.updatedAt}>(edited)</span>}
      </div>

      {comment.deleted ? (
        <p className="text-secondary text-sm italic">[deleted]</p>
      ) : (
        <Markdown text={comment.body} />
      )}

      {hasActions && (
        <div className="mt-1 flex gap-2 text-xs">
          {onReply && (
            <button type="button" onClick={onReply} className="comment-action">
              Reply
            </button>
          )}
          {onEdit && (
            <button type="button" onClick={onEdit} className="comment-action">
              Edit
            </button>
          )}
          {onReport && (
            <button type="button" onClick={onReport} className="comment-action">
              Report
            </button>
          )}
          {/* Destructive last, per the toolbar convention. */}
          {onDelete && (
            <button type="button" onClick={onDelete} className="comment-action">
              Delete
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
