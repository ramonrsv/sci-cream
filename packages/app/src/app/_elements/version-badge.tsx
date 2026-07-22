/**
 * Chip naming a saved recipe's version, sitting beside the recipe name rather than inside it.
 *
 * Shared, so a version reads the same in the recipe editor and the make-recipe builder.
 */
export function VersionBadge({ version, title }: { version: string | number; title?: string }) {
  return (
    <span
      className="text-secondary shrink-0 rounded-md border border-current/20 px-1 text-xs"
      title={title}
      data-testid={`version-badge-v${String(version)}`}
    >
      v{version}
    </span>
  );
}
