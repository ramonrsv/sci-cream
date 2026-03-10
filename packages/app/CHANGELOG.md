# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-header -->

## [Unreleased] - ReleaseDate

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

[Unreleased]: https://github.com/ramonrsv/sci-cream/compare/app-v0.0.1...HEAD
[0.0.1]: https://github.com/ramonrsv/sci-cream/releases/tag/app-v0.0.0
