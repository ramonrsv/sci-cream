/** All `localStorage` keys used by the app */
export const STORAGE_KEYS = {
  recipeStores: "recipe-stores",
  sidebarCollapsed: "sidebar-collapsed",
  watcherSelectedProps: "watcher-selected-props",
  watcherTargets: "watcher-targets",
  watcherPriorities: "watcher-priorities",
  calculatorLayouts: "calculator-layouts",
  groupBy: "group-by",
} as const;

/** Read and deserialize a value from `localStorage`; returns `null` when absent or malformed */
export function getLocalStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Serialize and write a value to `localStorage` */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/** Remove a key from `localStorage`; no-op when running on the server */
export function removeLocalStorage(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}
