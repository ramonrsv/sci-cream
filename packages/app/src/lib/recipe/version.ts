/**
 * Opt-in semver-like version names for saved recipes.
 *
 * A recipe's `version` integer stays the internal per-recipe sequence (identity, sort, lookup key).
 * Opting in adds a free-form `versionName` (`3.1`, `3-a`, `4.2-b`) that gets displayed instead;
 * recipes that never opt in leave it null and keep showing the integer, so the default is unchanged.
 *
 * No WASM or server dependencies, so both the `"use server"` data layer and client can import it.
 */

/** Minimal shape shared by DB rows and wire JSON for version-name resolution. */
export type VersionNameSource = { version: number; versionName?: string | null };

/** Loose grammar: `major[.minor][-suffix]`, e.g. `3`, `3.1`, `3-a`, `4.2-b`, `10.24`. */
export const VERSION_NAME_PATTERN = /^\d+(\.\d+)?(-[0-9a-z]+)?$/i;

/** True when `name` matches {@link VERSION_NAME_PATTERN} after trimming. */
export function isValidVersionName(name: string): boolean {
  return VERSION_NAME_PATTERN.test(name.trim());
}

/** Returns an error message when `name` is not a valid version name, or `undefined` when it is. */
export function validateVersionName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed === "") return "Enter a version";
  if (!VERSION_NAME_PATTERN.test(trimmed)) return "Use a format like 3, 3.1, or 4.2-b";
  return undefined;
}

/** The displayed version: the name when opted in, else the internal integer. No `v` prefix. */
export function displayVersionName(v: VersionNameSource): string {
  return v.versionName ?? String(v.version);
}

/** True when any version carries a name — i.e. the recipe has opted into named versions. */
export function hasVersionNames(versions: readonly VersionNameSource[]): boolean {
  return versions.some((v) => v.versionName != null);
}

/** The leading integer ("major") of a displayed version, or 0 when unparseable. */
function majorOf(v: VersionNameSource): number {
  const match = /^(\d+)/.exec(displayVersionName(v));
  return match ? Number(match[1]) : 0;
}

/**
 * The next default version name: one past the highest displayed major. Yields `"1"` for an empty
 * list, mirroring the integer sequence's `COALESCE(MAX(version), 0) + 1`.
 */
export function nextVersionName(versions: readonly VersionNameSource[]): string {
  return String(Math.max(0, ...versions.map(majorOf)) + 1);
}
