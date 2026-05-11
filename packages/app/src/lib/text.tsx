import { type ReactNode } from "react";

/** Splits `text` on URLs and wraps each URL in an `<a>` tag; plain segments are returned as-is. */
export function autoLink(text: string): ReactNode[] {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline dark:text-blue-400"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}
