"use client";

import { useEffect, useRef, useState } from "react";

/** Copy-to-clipboard button with a transient "Copied" confirmation. */
export function CopyButton({
  text,
  label,
  testId,
}: {
  text: string;
  label: string;
  testId: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="action-button shrink-0 px-2 py-0.5 text-sm"
      data-testid={testId}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

/** A labelled readonly text field with a copy button, used for links and embed snippets. */
export function CopyableField({
  label,
  value,
  copyLabel,
  testId,
}: {
  label: string;
  value: string;
  copyLabel: string;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-secondary text-xs font-medium tracking-wide uppercase">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          readOnly
          value={value}
          onFocus={(e) => e.target.select()}
          aria-label={label}
          className="boxed-input comp-val my-0 min-w-0 flex-1 px-1 py-0.5 text-xs"
          data-testid={testId}
        />
        <CopyButton text={value} label={copyLabel} testId={`${testId}-copy`} />
      </div>
    </div>
  );
}
