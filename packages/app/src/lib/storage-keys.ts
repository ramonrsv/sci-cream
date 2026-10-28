/**
 * All keys of state that outlives a component: in `localStorage` (`usePersistedState`), or in
 * memory across client-side navigation but not a reload (`useRetainedState`).
 *
 * Per-view state uses a root key plus a colon-separated suffix, e.g. `${root}:qty`,
 * `${root}:filter`, `${root}:recipeIdx`, and one root can hold leaves in both stores. Roots are
 * listed below, with their retained leaves marked; {@link leafKey} derives the full leaf keys
 * inside the colocated hooks (`useQtyToggleState`, `useKeyFilterState`, `useRecipeIdxState`).
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

  // ---- Search roots: ${root}:source; retained :query | :entry -----------------------------------
  recipeSearch: "recipe-search", // Also :favourites | :rating; retained :slot | :version
  ingredientSearch: "ingredient-search",

  // ---- Make-recipe ------------------------------------------------------------------------------
  // The owner's working batch; also the batch list's root: ${root}:favourites, retained :query
  makeRecipeBatch: "make-recipe-batch",
  // Per-batch checkoff state: ${root}:h<hash> per batch, plus ${root}:index, the MRU for eviction
  makeRecipeChecklist: "make-recipe-checklist",
  // The owner's container colors, in the order recipes take them (see `batch-colors.ts`)
  makeRecipeColors: "make-recipe-colors",
} as const;

/**
 * Derives the leaf key `${root}:${suffix}`, or `undefined` without a root, which makes
 * `usePersistedState` and `useRetainedState` behave as plain `useState`.
 *
 * @example leafKey("properties-panel-view", "qty") // → "properties-panel-view:qty"
 */
export function leafKey(root: string | undefined, suffix: string): string | undefined {
  return root !== undefined ? `${root}:${suffix}` : undefined;
}
