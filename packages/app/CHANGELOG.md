<!-- markdownlint-disable MD024 -- intended design of keepachangelog.com -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-header -->

## [Unreleased] - ReleaseDate

### Added

- Water evaporation throughout the calculator, modeling cooking water loss as grams of lost water:
  - `Evap (g)` input in the `RecipeEditor` toolbar, with post-evaporation yield in the Total row.
  - De-evaporate button, rewriting the recipe to an equivalent one that needs no evaporation.
  - Yield and evaporation readouts in the read-only `RecipeTable` and the recipe-search panels.
  - Evaporation persists to `localStorage`, feeds balancing/validation, and clears with the slot.
  - Errors (e.g. evaporation above the mix's water) flag the input and surface the message inline.
- Ingredient lock toggles (per-row and lock-all) in the recipe editor, held fixed while balancing.
- Balancing targets for `ABV` and the FPD keys (`FPD`, `ServingTemp`, `HardnessAt14C`) in Watchers.
- `Color` toggle (Auto/Range/Target/Worst) driving `WatcherCard` status rails and chart bar colors.
- Watcher target delta tinted by proximity, graded from green (within 5%) to red (past 15%).
- `Norm` toggle on the properties chart: Full Spread (default), Target/Value centered, Fill Range.
- Persist the All/Built-in/Saved source filter of `/ingredients` and `/recipes` across mounts.
- Balancing benchmarks to App CI: target validation, balance, auto-balance, and rapid-update settle.

### Changed

- Overhaul how the properties chart scales, replacing ad-hoc per-key scaling with normalization:
  - Each property self-normalizes over its range, value, references, and target onto a 0-100 track.
  - Labels drop the "/ 2" and "* 10" suffixes; the value axis is a fixed, unlabeled 0-100 track.
  - Tooltip gains a `Target` line colored to match the main recipe; the legend moves to the top.
- Rework which recipe edits stop or trigger auto-balancing while `Auto` is on:
  - Only manual quantity edits and paste stop it; name, ingredient, evaporation, and clear do not.
  - Adding, removing, or renaming an ingredient re-balances, as does an evaporation change.
- Default the `Custom` selection to the typical balancing keys; drop `HardnessAt14C` from `Auto`.
- Paste replaces only the ingredient rows, keeping the slot's name, evaporation, and baseline.
- Flatten the `RecipeEditor` toolbar into one row, matching the Properties and Composition views.
- List recipe versions newest-first in the recipe version dropdown in `/recipes` details panel.

### Fixed

- Charts keeping the old palette after a theme change, until something else forced a re-render.
- Recipes with zero or unset ingredient quantities not being balanceable or target-validated.
- Orphan quantities (rows with no valid ingredient) counting toward the mix total; now outlined red.

## [0.0.4] - 2026-07-05

### Added

- Delta toggle (Off/Absolute/Relative) adding a main-vs-reference delta column to `PropertiesTable`.
- Balancing target ticks in the properties bar chart, matching the `WatcherCard` target marker.
- Global `Group-by` navbar toggle that groups tables and key-filter popups by roll-up hierarchy.
- Persist toolbar select state (quantity, key filter, selected recipe) to `localStorage`.
- Sticky table headers and pinned Ingredient/Qty columns that hold position while a panel scrolls.
- Significantly expanded set of `Watchers` balancing functionality and convenient usability tools:
  - Watchers `Auto` toggle that continuously re-balances the recipe as targets or the total change.
  - `Total (g)` input in the Watchers toolbar to size the balanced recipe to a target batch weight.
  - Watcher target tools: toolbar clear-all, per-card clear, `Set from current (M)` into targets.
  - Toggles to hide/show the range meter, target input, and reference values in `WatcherCard`s.
  - `Low` balancing priority level, below `Normal`, selectable per property in `WatcherCard`s.
  - `Information` severity tier for balancing issues, shown in watcher cards and the issues popup.
  - `DeltaToggle` in Watchers, with a relative mode shown as a percentage of the target.
- Web Vitals benchmark to App CI, recording the standard web vitals and timing marks over time.
- Static media and font size metrics to the bundle-size benchmark (fonts gated, media track-only).

### Changed

- Auto-rotate the properties bar chart between vertical and horizontal by container aspect ratio.
- Make every calculator panel resizable on both axes and drop the fixed panel heights.
- Unify the `Auto` property selection across the chart and watchers, showing more keys by default.
- Rename the `Non-Zero` key filter to `Active`, which is simpler and a better semantic fit.
- Unify all toolbar `Select` controls behind one shared component with consistent styling.
- Significant visual overhaul of all the panels, adopting a more flat and stylish modern style:
  - Redesign the `PropertiesChart`: single bar, acceptable-range band, references as tick markers.
  - Redesign `WatcherCard` around a horizontal range-meter with status, target, and reference ticks.
  - Restyle `FpdGraph` to match the redesigned bar chart and watcher cards; keep curves unchanged.
  - Restyle calculator table headers and total rows (borderless headers, recessed bold totals band).
- Switch popups to Headless UI `Popover`; they now stay in view and dismiss on outside-click/`Esc`.
- Hide the target input and delta for non-balanceable (FPD) properties in Watchers.
- Align Watcher targets/deltas to the displayed precision (input step, seeded targets, delta sign).
- Reduce the step used when writing a balanced recipe's grams, so properties track targets closely.
- Share one WASM bridge and user-saved recipes/ingredients across routes, fetched once per session.
- Add warmup runs and outlier-robust stats (trimmed mean/median) to the e2e benchmark harness.
- Self-host the Geist fonts and use ∆ (U+2206) so the delta glyph renders consistently everywhere.

### Fixed

- Recipe search showing a deleted entry after a refresh, and a stale version-selector index.
- Recipe search flicker (default toolbar labels and rows for a frame) when switching entries.
- WASM use-after-free crash in the search detail panels under React Strict Mode in `pnpm dev`.
- Calculator layout occasionally reverting to defaults during hydration on client-side navigation.
- Watchers/Properties toolbar controls overflowing off-screen and clipping the Balance button.
- Spurious balancing feasibility warnings caused by targets rounded to display precision.
- Truncate long recipe ingredient names in `RecipeTable` so they no longer break the layout.
- Fix typo, add missing "find" word in the welcome blog post, in `blog/2026-04-27-welcome.md`.
- ESLint crash from `eslint-plugin-react` calling a removed `getFilename()` API under ESLint 10.

## [0.0.3] - 2026-06-10

### Added

- `WatchersPanel` of compact `WatcherCard`s, with current/ref values, ranges, targets, deltas, etc.
- Large mobile (Pixel 8 Pro) viewports to visual regression tests, to catch issues at those sizes.
- Full-content visual regression snapshots, with `captureFullContent` to capture scrollable content.
- Visual regression tests for `ThemeSelect`, `RecipeSelect`, `KeyFilterSelect`, & `QtyToggleSelect`.
- Bundle size benchmarks to App CI, tracking several per-route gzipped JS bundle sizes, in KB.
- Save the user's `react-grid-layout` customizations to `localStorage`; persists across reloads.
- Support for saved recipe versions, modifiable in `RecipeEditor` and `RecipeSearch` details panel.
- Recipe balancing functionality in `WatchersPanel`, setting the balanced recipe in `RecipeEditor`.
  - Balancing targets and priorities can be set for properties in their respective  `WatcherCard`s.
  - Balancing targets can be filled from reference recipe per-property or bulk from the toolbar.
  - Surface balancing validation errors and warnings in cards and as a popup in the panel toolbar.

### Changed

- Make `RecipeEditorPanel` horizontally resizable in the `/calculator` react-grid-layout.
- Remove the redacted '"comments": "..."' from JSON spec in `/ingredients` details panel.
- Expand panel visual tests across recipe subsets and restrict allowed pixel diff for layout tests.
- Consolidate benchmark utilities into shared module at `__benches__/util.ts` for bundle and e2e.
- Use `verify/verifyDefined` for precondition checks; now takes `unknown` and `asserts condition`.
- Refactor `EntitySearch` into shell and atoms, used by `Ingredient/RecipeSearch` independently.

### Fixed

- CI sort mismatch in `fetchAll*`, by using COLLATE "C" so Postgres and `Array.sort()` match.
- Prevent a race in the e2e fill path by adding a hydration stability check before paste/fill.
- Make the recipe paste/fill and wall-clock-sensitive e2e tests more resilient to slowdowns.
- Add stable scrollbar gutter to `app-content`; prevents unstable `react-grid-layout` breakpoints.
- Stabilize the `react-chartjs-2` charts by passing unique dataset `id`s via `datasetIdKey`.
- Work around drizzle-kit unique constraint bug, reorder constraint to match table definition order.

## [0.0.2] - 2026-05-14

### Added

- `Navbar` component with a `Header` and `Sidebar` which appear merged as one L-shaped sidebar.
- Collapsible `Sidebar` with navigation items including `/calculator`, `/recipes`, etc.
- User account support with OAuth and email/password credentials; creates database user by email.
- `RecipeSearch` to search embedded/user-saved recipes; displays recipe, mix properties, comments.
  - Includes support for loading recipes into `RecipeEditor` and navigating via `?slot=*` params.
  - Includes support for deleting saved recipes, adding and editing comments on saved recipes.
- `IngredientSearch` to search embedded/user-defined ingredients; displays JSON spec, composition.
- Database and `data.ts` support for user-saved recipes, including upserting, deleting, etc.
- `RecipeEditor` support for recipe names, saving recipes to DB, selecting via `?slot=*` params.
- `/blog` and `/docs` routes with static content generated from markdown in `packages/app/content`.
- Draft welcome blog post, as well links to other resources for recipes and science knowledge.
- `eslint-plugin-jsdoc` and configured it to require jsdoc for most items, e.g. methods, etc.
- Missing jsdoc for all items to satisfy the new ESLint warnings raised by `eslint-plugin-jsdoc`.
- GitHub release badge links to all `README.md`; replacement support in `scripts/release.sh`.
- `scripts/run-local-test-suite.sh` to run test suite similar to CI, but faster than using `act`.
- Better support for mobile layouts, with responsive stacking layouts, shrinking margins, etc.
- `CLAUDE.md` for the project as a whole, detailing structure, components, workflows, etc.

### Changed

- Theme toggle is now in collapsible part of `Header` and is a selector dropdown, not a toggle.
- `/recipes` and `/ingredients` pages now show `RecipeSearch` and `IngredientSearch`, not stubs.
- Use `next-themes` to handle Light/Dark themes, which solves storage and theme flashing issues.
- Overhaul project directory structure, `.tsx` up to `src/app/_components` and `src/app/_elements`.
- Rename, re-design, and refactor components into 3 reusable layers: table -> view -> panel|search.
- Use embedded ingredients in `WasmBridge`, seeding user-defined ones at load if logged in.
- Rework `data.ts` to only support per-user requests; built-in are now seeded from embedded.
- Overhaul layout visual regression tests, with more tests, new viewports, portrait/landscape, etc.
- Move the calculator page, the current home page, to `/calculator` and add redirect from `/`.

### Fixed

- 'null pointer passed to rust' bug when pasting new valid ingredients on top of previous valid.
- Issue where expanding the sidebar caused the items to flash; improve expand/collapse animation.

## [0.0.1] - 2026-03-10

### Added

- Next.js web ice cream calculator app consuming the `sci-cream` Rust/WASM library.
- `RecipeGrid` for editing a main recipe and up to 2 references, with 20 ingredient slots each.
- Ingredient name input search with database-backed autocomplete and validation.
- `IngredientCompositionGrid` displaying per-ingredient composition breakdown (see `QtyToggle`).
- `MixPropertiesGrid` showing composition and FPD properties of the main and reference recipes.
- `MixPropertiesChart` bar chart showing key mix properties of all recipes, with acceptable ranges.
- `FpdGraph` displaying FPD curves ('hardness' and 'frozen water') for main and reference recipes.
- `KeyFilter` selector with `Auto`, `All`, `NonZero`, and `Custom` filters for comp./property keys.
- `Custom` composition/property key filter configuration with checkboxes, including 'All Properties'
- `QtyToggle` selector with `Composition`, `Qty (g)`, and `Qty (%)` display modes for values.
- Recipe copy-to-clipboard, paste-to-clipboard, and clear functionalities via action buttons.
- Support for reference recipes (Ref A/B) for side-by-side comparison, supported by components.
- Periodic (every ~2s) recipe persistence to local storage, for main and reference recipes.
- Client-side ingredient definition cache, pre-fetching of all ingredient specs on page load.
- Draggable and resizable grid layout via `react-grid-layout`, responsive to various viewports.
- Light and Dark color themes with Tailwind CSS, including toggle and theme-aware components.
- PostgreSQL ingredient database with Drizzle ORM and `seed-db` script, seeding from `sci-cream`.
- Server actions for fetching ingredient specs and names (`"use server"`) from the database.
- Usage of WASM bridge from `sci-cream` library for ergonomic and performant JS <-> Rust/WASM.
- Integration of `WebVitals` monitoring, and Vercel `Analytics` and `SpeedInsights`.
- Unit tests, with Vitest and React Testing Library, for all components and UI elements.
- End-to-end Playwright checks for Web Vitals, local storage, and recipe paste/fill, resources, etc.
- Visual regression tests, using Playwright end-to-end, for layout and components at various states.
- Unit benchmarks using Benchmark.js, for low-level utilities, e.g. `prop_key_as_med_str`, etc.
- End-to-end Playwright benchmarks with for UI responsiveness and memory usage, detecting leaks.
- ESLint linting with `eslint` and Prettier formatting with `prettier-plugin-tailwindcss`.
- `scripts/release.sh` AI-generated script to mimic subset of `cargo-release` for `packages/app`.

<!-- next-url -->

[Unreleased]: https://github.com/ramonrsv/sci-cream/compare/app-v0.0.4...HEAD
[0.0.4]: https://github.com/ramonrsv/sci-cream/compare/app-v0.0.3...app-v0.0.4
[0.0.3]: https://github.com/ramonrsv/sci-cream/compare/app-v0.0.2...app-v0.0.3
[0.0.2]: https://github.com/ramonrsv/sci-cream/compare/app-v0.0.1...app-v0.0.2
[0.0.1]: https://github.com/ramonrsv/sci-cream/releases/tag/app-v0.0.1
