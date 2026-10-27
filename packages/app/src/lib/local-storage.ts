/**
 * All keys of state that outlives a component: in `localStorage` (`usePersistedState`), or in
 * memory across client-side navigation but not a reload (`useRetainedState`).
 *
 * Per-view state uses a root key plus a colon-separated suffix, e.g. `${root}:qty`,
 * `${root}:filter`, `${root}:recipeIdx`, and one root can hold leaves in both stores. Roots are
 * listed below, with their retained leaves marked; the full leaf keys are derived inside the
 * colocated hooks (`useQtyToggleState`, `useKeyFilterState`, `useRecipeIdxState`).
 */
export const STORAGE_KEYS = {
  recipeStores: "recipe-stores",
  sidebarPinned: "sidebar-pinned",
  calculatorLayouts: "calculator-layouts",
  groupBy: "group-by",

  // ---- Watchers: targets, priorities, total, show toggles; keys via useKeyFilterState -----------
  watcherTargets: "watcher-targets",
  watcherPriorities: "watcher-priorities",
  watcherTotal: "watcher-total",
  watcherShowRange: "watcher-show-range",
  watcherShowTarget: "watcher-show-target",
  watcherShowRefs: "watcher-show-refs",

  // ---- Per-view roots: ${root}:qty | :filter | :selected; retained :recipeIdx | :slot -----------
  propertiesPanelView: "properties-panel-view",
  compositionBreakdownPanelView: "composition-breakdown-panel-view",
  propertiesChartPanelView: "properties-chart-panel-view",
  watchersPanelView: "watchers-panel-view",
  recipeEditorPanel: "recipe-editor-panel",
  recipeSearchPropertiesView: "recipe-search-properties-view",
  recipeSharePropertiesView: "share-properties-view",
  recipeShareLoadAction: "share-load-action",
  ingredientSearchCompositionView: "ingredient-search-composition-view",

  // ---- Markdown-field roots, one per render site: ${root}:tab -----------------------------------
  recipeSearchComments: "recipe-search-comments",
  makeRecipeNotes: "make-recipe-notes",

  // ---- Search roots: ${root}:source | :favourites | :rating; retained :query | :slot ------------
  recipeSearch: "recipe-search",
  ingredientSearch: "ingredient-search",

  // ---- Make-recipe ------------------------------------------------------------------------------
  // The owner's working batch; also the batch list's root: ${root}:favourites, retained :query
  makeRecipeBatch: "make-recipe-batch",
  // Per-batch checkoff state: ${root}:h<hash> per batch, plus ${root}:index, the MRU for eviction
  makeRecipeChecklist: "make-recipe-checklist",
  // The owner's container colors, in the order recipes take them (see `batch-colors.ts`)
  makeRecipeColors: "make-recipe-colors",
} as const;

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
