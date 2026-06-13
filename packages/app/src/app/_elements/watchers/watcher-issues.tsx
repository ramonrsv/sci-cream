"use client";

import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

import { BalancingIssueView, IssueSeverity } from "@workspace/sci-cream";

import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";

/**
 * Per-key issue summary attached to a `WatcherCard`: its severity and the message(s) to show. When
 * a key collects several issues, error severity wins over warning.
 */
export interface KeyIssue {
  severity: IssueSeverity;
  titles: string[];
}

/** Pluralize `noun` by `count` (naive +"s"); e.g. `1 error`, `2 errors`. */
function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Compact `"1 error, 2 warnings, 1 note"`-style summary of the counts, omitting any zero. */
function summarize(errorCount: number, warningCount: number, infoCount: number): string {
  const parts: string[] = [];
  if (errorCount > 0) parts.push(plural(errorCount, "error"));
  if (warningCount > 0) parts.push(plural(warningCount, "warning"));
  if (infoCount > 0) parts.push(plural(infoCount, "note"));
  return parts.join(", ");
}

/**
 * Toolbar chip summarizing balancing validation results, with a click-to-open detail popover.
 *
 * The chip lives in the watchers toolbar — always-present chrome — so surfacing issues never shifts
 * the card grid. It shows per-severity counts (red errors, amber warnings, blue notes); clicking it
 * opens a capped, scrollable list of messages rendered through a portal (`.popup`), so the detail
 * overlays the grid rather than displacing it. Errors are listed first (red), then warnings (amber),
 * then information notes (blue). The wording, severity, and affected keys all come from the crate via
 * `validate_recipe_targets`, so this is purely presentational. `extraError` (a raw runtime
 * balance-failure string) is shown as an extra error line so all problems share one place.
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
  const infos = issues.filter((issue) => issue.severity === "information");
  const errorCount = errors.length + (extraError ? 1 : 0);
  const warningCount = warnings.length;
  const infoCount = infos.length;

  const iconSize = COMPONENT_ACTION_ICON_SIZE - 6;

  return (
    <div className={`flex items-center ${className}`} data-testid="watcher-issues">
      <Popover className="flex items-center">
        <PopoverButton
          type="button"
          className="action-button flex items-center gap-1 px-1 py-0.5 text-sm"
          aria-label={`Balancing issues: ${summarize(errorCount, warningCount, infoCount)}`}
          title={summarize(errorCount, warningCount, infoCount)}
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
          {infoCount > 0 && (
            <span className="issue-text-information flex items-center gap-0.5 font-semibold">
              <Info size={iconSize} />
              {infoCount}
            </span>
          )}
        </PopoverButton>

        <PopupPanel
          anchor={{ to: "bottom end", gap: 4, padding: 8 }}
          role="dialog"
          aria-label="Balancing issues"
          className="flex max-h-64 w-72 flex-col gap-0.5 overflow-y-auto p-1 text-xs"
          data-testid="watcher-issues-popup"
        >
          {({ close }) => (
            <>
              <div className="flex items-center justify-between px-0.5 pb-0.5 font-semibold">
                <span>{summarize(errorCount, warningCount, infoCount)}</span>
                <button
                  type="button"
                  className="action-button -mr-0.5 px-0.5 py-0"
                  onClick={() => close()}
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
                {infos.map((issue) => (
                  <li
                    key={issue.message}
                    className="msg-information px-1.5 py-0.5"
                    data-testid="watcher-issue"
                    data-severity="information"
                  >
                    {issue.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </PopupPanel>
      </Popover>
    </div>
  );
}
