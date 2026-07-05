/**
 * All `localStorage` keys used by the app.
 *
 * Per-view persistence uses a root key plus a colon-separated suffix, e.g.
 * `${root}:qty`, `${root}:filter`, `${root}:selected`, `${root}:recipeIdx`.
 * Roots are listed below; the full leaf keys are derived inside the colocated
 * hooks (`useQtyToggleState`, `useKeyFilterState`, `useRecipeIdxState`).
 */
export const STORAGE_KEYS = {
  recipeStores: "recipe-stores",
  sidebarCollapsed: "sidebar-collapsed",
  calculatorLayouts: "calculator-layouts",
  groupBy: "group-by",
  // Watcher state — targets, priorities, total, show toggles, etc.; keys via useKeyFilterState
  watcherTargets: "watcher-targets",
  watcherPriorities: "watcher-priorities",
  watcherTotal: "watcher-total",
  watcherShowRange: "watcher-show-range",
  watcherShowTarget: "watcher-show-target",
  watcherShowRefs: "watcher-show-refs",
  // Per-view persistence roots (leaf keys: ${root}:qty | :filter | :selected | :recipeIdx)
  propertiesPanelView: "properties-panel-view",
  compositionBreakdownPanelView: "composition-breakdown-panel-view",
  propertiesChartPanelView: "properties-chart-panel-view",
  watchersPanelView: "watchers-panel-view",
  recipeEditorPanel: "recipe-editor-panel",
  recipeSearchLoadAction: "recipe-search-load-action",
  recipeSearchPropertiesView: "recipe-search-properties-view",
  ingredientSearchCompositionView: "ingredient-search-composition-view",
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
