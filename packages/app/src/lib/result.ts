/**
 * What a server action returns, and the failures any of them can hit.
 *
 * Reads and mutations alike, so there is one shape to read and one way to refuse. A read's empty
 * result is a success carrying an empty value; only a refusal is `ok: false`, and every refusal
 * names a reason. {@link DataError} covers what every action shares — a domain adds an enum of its
 * own for what only it can refuse, as {@link CommentError} and {@link RecipeError} do.
 */

/** Failures any action can hit, whatever it acts on. */
export enum DataError {
  /** No signed-in user. The UI gates on `signedIn`, so this is a bug or a direct call. */
  Unauthenticated = "unauthenticated",
  /** Not the caller's row — or no such row, undistinguished, so a guessed id learns nothing. */
  Forbidden = "forbidden",
  /** No such row, where its absence gives nothing away: a version of a recipe already owned. */
  NotFound = "not-found",
  /** The arguments are malformed. The client validates too; this is the backstop, not the check. */
  Invalid = "invalid",
}

/**
 * An action's value, or the reason it refused.
 *
 * `E` names the domain's own failures; omit it when only a {@link DataError} applies. The string
 * values cross the server-action boundary, so renaming one is a protocol change.
 */
export type Result<T, E = never> = { ok: true; value: T } | { ok: false; error: DataError | E };

/** Wrap a value as a success, the counterpart to each module's `refuse`. */
export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

/** Rebuild a success around a new value, passing a refusal through untouched. */
export function mapOk<T, U, E>(result: Result<T, E>, f: (value: T) => U): Result<U, E> {
  return result.ok ? ok(f(result.value)) : result;
}

/** Human-readable text for a {@link DataError}; a domain may override any of these with its own. */
export const DATA_ERROR_MESSAGES: Record<DataError, string> = {
  [DataError.Unauthenticated]: "Sign in to continue.",
  [DataError.Forbidden]: "You can't do that.",
  [DataError.NotFound]: "That no longer exists.",
  [DataError.Invalid]: "That isn't valid.",
};
