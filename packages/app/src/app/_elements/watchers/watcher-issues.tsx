"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, X } from "lucide-react";

import { BalancingIssueView, IssueSeverity } from "@workspace/sci-cream";

import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Per-key issue summary attached to a `WatcherCard`: its severity and the message(s) to show. When
 * a key collects several issues, error severity wins over warning.
 */
export interface KeyIssue {
  severity: IssueSeverity;
  titles: string[];
}

/** Fixed popover width in px; mirrors the `w-72` class so we can right-align it to the chip. */
const POPUP_WIDTH = 288;

/** Pluralize `noun` by `count` (naive +"s"); e.g. `1 error`, `2 errors`. */
function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Compact `"1 error, 2 warnings"`-style summary of the counts, omitting any zero. */
function summarize(errorCount: number, warningCount: number): string {
  const parts: string[] = [];
  if (errorCount > 0) parts.push(plural(errorCount, "error"));
  if (warningCount > 0) parts.push(plural(warningCount, "warning"));
  return parts.join(", ");
}

/**
 * Toolbar chip summarizing balancing validation results, with a click-to-open detail popover.
 *
 * The chip lives in the watchers toolbar — always-present chrome — so surfacing issues never shifts
 * the card grid. It shows per-severity counts (red errors, amber warnings); clicking it opens a
 * capped, scrollable list of messages rendered through a portal (`.popup`), so the detail overlays
 * the grid rather than displacing it. Errors are listed first (red), then warnings (amber). The
 * wording, severity, and affected keys all come from the crate via `validate_recipe_targets`, so
 * this is purely presentational. `extraError` (a raw runtime balance-failure string) is shown as an
 * extra error line so all problems share one place.
 *
 * The caller is responsible for only mounting this when there is something to show.
 */
export function WatcherIssues({
  issues,
  extraError,
  className = "",
}: {
  issues: BalancingIssueView[];
  extraError?: string;
  className?: string;
}) {
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const errorCount = errors.length + (extraError ? 1 : 0);
  const warningCount = warnings.length;

  const [popupOpen, setPopupOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | undefined>(undefined);

  // Anchor the popover below the chip, right-aligned to it, when it opens (clamped to the viewport).
  useEffect(() => {
    if (popupOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const left = Math.max(8, rect.right + window.scrollX - POPUP_WIDTH);
      setPopupPos({ top: rect.bottom + window.scrollY + 4, left });
    }
  }, [popupOpen]);

  // While open, dismiss on Escape or a pointer press outside both the chip and the popover.
  useEffect(() => {
    if (popupOpen) {
      const onPointerDown = (e: PointerEvent) => {
        const target = e.target as Node;
        if (!anchorRef.current?.contains(target) && !popupRef.current?.contains(target)) {
          setPopupOpen(false);
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setPopupOpen(false);
      };

      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("keydown", onKeyDown);
      };
    }
  }, [popupOpen]);

  const iconSize = COMPONENT_ACTION_ICON_SIZE - 6;

  return (
    <div className={`flex items-center ${className}`} data-testid="watcher-issues">
      <button
        ref={anchorRef}
        type="button"
        className="action-button flex items-center gap-1 px-1 py-0.5 text-sm"
        onClick={() => setPopupOpen((o) => !o)}
        aria-expanded={popupOpen}
        aria-haspopup="dialog"
        aria-label={`Balancing issues: ${summarize(errorCount, warningCount)}`}
        title={summarize(errorCount, warningCount)}
        data-testid="watcher-issues-toggle"
      >
        {errorCount > 0 && (
          <span className="issue-text-error flex items-center gap-0.5 font-semibold">
            <AlertCircle size={iconSize} />
            {errorCount}
          </span>
        )}
        {warningCount > 0 && (
          <span className="issue-text-warning flex items-center gap-0.5 font-semibold">
            <AlertTriangle size={iconSize} />
            {warningCount}
          </span>
        )}
      </button>

      {popupOpen &&
        popupPos &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Balancing issues"
            className="popup absolute z-50 flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1 text-xs"
            style={{
              top: `${popupPos.top}px`,
              left: `${popupPos.left}px`,
              width: `${POPUP_WIDTH}px`,
            }}
            data-testid="watcher-issues-popup"
          >
            <div className="flex items-center justify-between px-0.5 pb-0.5 font-semibold">
              <span>{summarize(errorCount, warningCount)}</span>
              <button
                type="button"
                className="action-button -mr-0.5 px-0.5 py-0"
                onClick={() => setPopupOpen(false)}
                title="Close"
                aria-label="Close balancing issues"
              >
                <X size={13} />
              </button>
            </div>
            <ul className="flex flex-col gap-0.5" data-testid="watcher-issues-list">
              {extraError && (
                <li
                  className="msg-error px-1.5 py-0.5"
                  data-testid="watcher-issue"
                  data-severity="error"
                >
                  {extraError}
                </li>
              )}
              {errors.map((issue) => (
                <li
                  key={issue.message}
                  className="msg-error px-1.5 py-0.5"
                  data-testid="watcher-issue"
                  data-severity="error"
                >
                  {issue.message}
                </li>
              ))}
              {warnings.map((issue) => (
                <li
                  key={issue.message}
                  className="msg-warning px-1.5 py-0.5"
                  data-testid="watcher-issue"
                  data-severity="warning"
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
