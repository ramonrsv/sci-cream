<!-- markdownlint-disable MD024 -- intended design of keepachangelog.com -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-header -->

## [Unreleased] - ReleaseDate

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

[Unreleased]: https://github.com/ramonrsv/sci-cream/compare/app-v0.0.2...HEAD
[0.0.2]: https://github.com/ramonrsv/sci-cream/compare/app-v0.0.1...app-v0.0.2
[0.0.1]: https://github.com/ramonrsv/sci-cream/releases/tag/app-v0.0.1
