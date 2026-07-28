/**
 * Save-state dot shared by the recipe and batch editors. It shows only once the item is bound to a
 * saved record: gray in sync, amber with unsaved edits. Unbound, it is an invisible placeholder.
 */
export function SaveStatusDot({
  bound,
  dirty,
  className,
  testId,
}: {
  bound: boolean;
  dirty: boolean;
  className?: string;
  testId?: string;
}) {
  const label = dirty ? "Unsaved changes" : "Saved";
  const colorClass = !bound ? "invisible" : dirty ? "text-amber-500" : "text-secondary";
  return (
    <span
      className={`leading-none ${colorClass}${className ? ` ${className}` : ""}`}
      data-testid={testId}
      {...(bound ? { "aria-label": label, title: label } : { "aria-hidden": true })}
    >
      •
    </span>
  );
}
