"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Markdown } from "@/app/_elements/markdown";
import { formatRelativeTime } from "@/lib/comments/comments";
import { deleteComment, fetchOpenReports, purgeComment, resolveReport } from "@/lib/data/comments";
import type { OpenReportJson } from "@/lib/data/comments";

/**
 * The open-report queue rendered at `/admin/reports`: who reported what, why, the reported body,
 * and the three ways to close it out — resolve the report, delete the comment, or purge it.
 *
 * Delete and purge are not degrees of the same thing. Delete is what the author could have done,
 * leaving a tombstone where the comment sat if anything replied to it; purge takes the row, its
 * replies, and every report filed against them, and is the only way a thread ever fully goes.
 *
 * Admin-ness is not decided here. The page 404s for non-admins before this mounts, and every
 * action re-checks the session server-side; this component would simply get an empty list.
 */
export function ReportQueue() {
  const [reports, setReports] = useState<OpenReportJson[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // The one memoized callback here: the mount effect depends on it, and a fresh identity each
  // render would re-fire the effect, whose own setState would spin that into a fetch loop.
  const refresh = useCallback(async () => {
    setReports(await fetchOpenReports());
    setLoading(false);
  }, []);

  // The refresh callback sets state only after awaiting its fetch, not synchronously here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleResolve = async (report: OpenReportJson) => {
    await resolveReport(report.commentId, report.reporterId);
    await refresh();
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    await deleteComment(commentId);
    await refresh();
  };

  const handlePurge = async (commentId: number) => {
    const warning =
      "Purge this comment? Its replies and every report filed against them go too. " +
      "This cannot be undone.";
    if (!window.confirm(warning)) return;
    await purgeComment(commentId);
    await refresh();
  };

  if (loading) return <p className="text-secondary text-sm">Loading reports…</p>;
  if (reports === undefined) return <p className="text-secondary text-sm">Reports unavailable.</p>;
  if (reports.length === 0) return <p className="text-secondary text-sm">No open reports.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li
          key={`${report.commentId}:${report.reporterId}`}
          className="comment-card"
          data-testid={`report-${report.commentId}-${report.reporterId}`}
        >
          <div className="comment-meta">
            <span className="text-txt-prim font-medium">{report.reporterDisplayName}</span>
            <span>reported</span>
            <time dateTime={report.createdAt}>{formatRelativeTime(report.createdAt)}</time>
          </div>

          {report.reason !== undefined && (
            <p className="text-secondary mt-1 text-sm">Reason: {report.reason}</p>
          )}

          {report.comment === undefined ? (
            <p className="text-secondary mt-2 text-sm italic">
              The reported comment has already been deleted.
            </p>
          ) : (
            <div className="comment-replies mt-2">
              <div className="comment-meta">
                <span className="text-txt-prim font-medium">
                  {report.comment.authorDisplayName}
                </span>
                <Link
                  href={`/${report.comment.subjectType}/${report.comment.subjectKey}`}
                  className="text-blue-500 hover:underline dark:text-blue-400"
                >
                  {report.comment.subjectType}/{report.comment.subjectKey}
                </Link>
              </div>
              {report.comment.deleted ? (
                <p className="text-secondary text-sm italic">[deleted]</p>
              ) : (
                <Markdown text={report.comment.body} />
              )}
            </div>
          )}

          {/* Destructive last, per the toolbar convention. */}
          <div className="mt-2 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => void handleResolve(report)}
              className="comment-action"
            >
              Resolve
            </button>
            {report.comment !== undefined && !report.comment.deleted && (
              <button
                type="button"
                onClick={() => void handleDelete(report.commentId)}
                className="comment-action"
              >
                Delete comment
              </button>
            )}
            {/* Offered on a tombstone too — clearing those is the whole reason purging exists. */}
            {report.comment !== undefined && (
              <button
                type="button"
                onClick={() => void handlePurge(report.commentId)}
                className="comment-action"
              >
                Purge comment
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
