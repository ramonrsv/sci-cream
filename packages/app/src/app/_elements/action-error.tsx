"use client";

/**
 * The message from a refused action, rendered where the control that failed is
 *
 * Without it a failed delete looks exactly like one that worked. Renders nothing when there is
 * none. Takes the error and its table, not the text: an error value is itself a string, so a
 * `message` prop would accept an unresolved one and render `forbidden` at the reader.
 */
export function ActionError<E extends string>({
  error,
  messages,
}: {
  error?: E;
  messages: Record<E, string>;
}) {
  if (error === undefined) return null;

  return (
    <p className="text-sm text-red-500" role="alert">
      {messages[error]}
    </p>
  );
}
