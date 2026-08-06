"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";

/**
 * Read-only markdown renderer for comments and notes. Supports GFM (tables, task lists, footnotes,
 * autolinks) via `remark-gfm`. Raw HTML is not rendered (react-markdown's safe default), so user
 * text can't inject markup. External links open in a new tab; internal ones stay in place.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert text-secondary max-w-none leading-relaxed ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const external = /^https?:\/\//.test(href ?? "");
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="text-blue-500 hover:underline dark:text-blue-400"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** Which face of a {@link MarkdownField} is shown */
type MarkdownTab = "write" | "preview";

const isMarkdownTab = (value: MarkdownTab) => value === "write" || value === "preview";

/**
 * Controlled markdown editor: a textarea with a Write/Preview tab pair. The parent owns the value;
 * this widget only toggles which face is shown. The textarea keeps the "Comments" accessible label
 * so existing callers and tests address it the same way.
 *
 * Each render site passes its own `persistKey` so its tab choice is remembered independently of
 * every other field; with `persistKey` undefined the tab is plain state and nothing is stored.
 */
export function MarkdownField({
  value,
  onChange,
  ariaLabel = "Comments",
  placeholder = "Add comments…",
  textareaClassName = "min-h-20",
  textareaTestId,
  persistKey,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  /** Extra classes merged onto the textarea/preview box; callers use this to tune height. */
  textareaClassName?: string;
  /** `data-testid` for the textarea, so existing callers keep their test hooks. */
  textareaTestId?: string;
  /** Persistence root for this instance's tab; leaf key is `${persistKey}:tab`. */
  persistKey?: string;
}) {
  const [tab, setTab] = usePersistedState<MarkdownTab>(leafKey(persistKey, "tab"), "write", {
    isValid: isMarkdownTab,
  });

  const tabClass = (t: MarkdownTab) =>
    `rounded px-2 py-0.5 ${tab === t ? "bg-surface text-primary font-medium" : "text-secondary hover:text-primary"}`;

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 text-xs" role="tablist" aria-label="Comment editor mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "write"}
          onClick={() => setTab("write")}
          className={tabClass("write")}
        >
          Write
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          onClick={() => setTab("preview")}
          className={tabClass("preview")}
        >
          Preview
        </button>
      </div>
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          data-testid={textareaTestId}
          className={`markdown-field text-primary text-sm leading-relaxed ${textareaClassName}`}
        />
      ) : (
        <div className={`markdown-field overflow-auto ${textareaClassName}`}>
          {value.trim() ? (
            <Markdown text={value} />
          ) : (
            <p className="text-secondary text-sm italic">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
