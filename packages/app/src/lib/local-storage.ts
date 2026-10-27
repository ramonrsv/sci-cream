// Touching `window.localStorage` at all throws a `SecurityError` when storage is denied — e.g.
// the `/share/embed` route inside a sandboxed third-party iframe, or browsers configured to block
// site data. Treat that as "no storage": reads return `null`, writes and removals are no-ops.

/** Read and deserialize a value from `localStorage`; returns `null` when absent or malformed */
export function getLocalStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Serialize and write a value to `localStorage` */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage denied; do nothing
  }
}

/** Remove a key from `localStorage`; no-op when running on the server */
export function removeLocalStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage denied; do nothing
  }
}
