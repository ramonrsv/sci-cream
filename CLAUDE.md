# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Overview

Monorepo with two packages managed by `pnpm` (JS) and `cargo` (Rust):

- **`packages/sci-cream`** — `sci-cream` Rust crate for mathematical analysis of ice cream mixes.
  Compiles to native (`rlib`) and to WebAssembly via `wasm-pack`, the latter published as the
  `@workspace/sci-cream` npm package with TypeScript bindings.
- **`packages/app`** — Next.js 16 app (`@workspace/sci-cream-app`) that consumes the WASM package to
  power a drag-and-drop ice cream calculator UI.

The crate's WASM build is a hard prerequisite for the app — `pnpm build` runs `build:package` then
`build:app`. Always rebuild WASM after changes to Rust code that crosses the WASM boundary.

## Commands

### Workspace root

```bash
pnpm install             # Install all JS dependencies
pnpm build               # Build crate (WASM) then app
pnpm test                # Run all tests across both packages
pnpm lint                # Lint everything (cargo clippy + ESLint)
pnpm dev                 # Start Next.js dev server (Turbopack)
```

### `sci-cream` crate (`packages/sci-cream`)

Most scripts have `:rust` and `:js` variants; the unqualified form runs both in sequence.

```bash
pnpm build:package       # Build WASM + TS bindings (required before the app)
pnpm build:wasm          # WASM only (toggles crate-type; see below)
pnpm build:rust          # Native cargo build, --all-features --all-targets
pnpm test                # cargo test (Rust) then vitest run (TS)
pnpm test:rust           # cargo test --all-features
pnpm test:js             # vitest run
pnpm lint                # cargo clippy then ESLint (zero warnings on both)
pnpm lint:rust           # cargo clippy --all-features --all-targets
pnpm lint:js             # eslint src --max-warnings=0
pnpm fmt:check           # cargo fmt --check then prettier --check
pnpm coverage            # cargo-llvm-cov (Rust) + vitest --coverage (JS)
pnpm bench               # cargo criterion + benches/ts/run-all.ts
pnpm doc                 # cargo doc --all-features

# Cargo directly (only when pnpm can't express it):
cargo test --all-features <test_name>        # Run a single Rust test
```

### App (`packages/app`)

```bash
pnpm dev:turbopack       # Default; pnpm dev aliases here
pnpm dev:webpack         # Fallback if Turbopack issues arise
pnpm test:unit           # Vitest run
pnpm test:e2e            # Playwright e2e (all browsers)
pnpm test:e2e:chromium   # Playwright chromium only (faster iteration)
pnpm test:visual         # Visual regression tests
pnpm test:visual:update  # Update visual snapshots
pnpm lint                # ESLint, --max-warnings=0
pnpm seed-db             # drizzle-kit push + run src/lib/database/seed.ts
```

The app requires a running PostgreSQL and `.env` with `POSTGRES_URL`, `AUTH_SECRET`, GitHub + Google
OAuth credentials. See `DEVELOPMENT.md` for full DB and OAuth setup.

### Local CI

`act` runs the GitHub Actions workflows locally from the repo root. CI uses non-default ports (not
5432 for Postgres, not 3000 for web) to avoid conflicts with local services. If conflicts arise,
either stop the local service, change the local port, or edit `job.<id>.services.postgres.ports` in
the workflow. See `DEVELOPMENT.md` § "Running CI workflows locally".

## Architecture

### Critical build quirk: dynamic crate-type switching

`wasm-pack` does not support a `--crate-type` flag, so `scripts/set-crate-type.sh` mutates
`packages/sci-cream/Cargo.toml`'s `[lib] crate-type` between `rlib` (native) and `cdylib` (WASM)
during the build. `pnpm build:wasm` flips to `cdylib`, runs `wasm-pack build`, then reverts to
`rlib`.

**Never commit `Cargo.toml` with `crate-type = ["cdylib"]`.** If a build is interrupted, run
`./packages/sci-cream/scripts/set-crate-type.sh ./packages/sci-cream/Cargo.toml rlib` (or `pnpm
--filter sci-cream set-crate-type:rlib`) before committing.

Tracking issue: <https://github.com/drager/wasm-pack/issues/1297>.

### Rust crate (`packages/sci-cream/src/`)

Core data flow: Specs → Composition → Ingredient → Recipe → MixProperties.

- **`specs/`** — User-friendly ingredient definitions (e.g. `DairySimpleSpec { fat: 2.0 }`),
  deserializable from JSON, converted to `Composition` via the `ToComposition` trait. `AliasSpec`
  and `CompositeSpec` are "dependent" specs that reference other ingredients and require an
  `IngredientGetter` (implemented by `IngredientDatabase`) and `ResolveComposition` to resolve.
- **`composition/`** — Detailed breakdown (`SolidsBreakdown`, `Fats`, `Carbohydrates`, `Sugars`,
  micronutrients, etc.). Values are grams per 100g of total mix unless documented otherwise; POD and
  PAC are sucrose-equivalent values, energy is kcal/100g, AbsPAC is a ratio. `CompKey` is the enum
  used to read fields by key.
- **`ingredient.rs`** / **`database.rs`** — `Ingredient` wraps name + category + `Composition`.
  `IngredientDatabase` is an in-memory store seeded from specs or embedded data
  (`new_seeded_from_embedded_data`).
- **`recipe.rs`** — `Recipe` is `(Ingredient, grams)` pairs and exposes `calculate_composition()` /
  `calculate_mix_properties()`.
- **`properties.rs`** — `MixProperties` = composition + `FPD` (freezing point depression), including
  `Curves` (frozen-water and hardness vs. temperature) and serving temperature. Read via
  `MixProperties::get(PropKey)` where `PropKey` unions `CompKey` and `FpdKey`.
- **`constants/`** — Research-derived constants for composition standards, FPD/PAC/POD, density,
  etc. `PAC_TO_FPD_TABLE` (raw data) and `PAC_TO_FPD_POLY_COEFFS` (derived) feed `fpd.rs`.
- **`wasm/`** — `wasm-bindgen` newtype wrappers exposing a deliberately narrow API.
  **`wasm::Bridge`** is the primary JS-facing interface: it owns an `IngredientDatabase` and
  provides `calculate_recipe_mix_properties(light_recipe)` to minimize expensive JS↔WASM boundary
  crossings. Prefer adding methods to `Bridge` over exposing more individual types.

#### Crate features

- `data` (default) — embeds the JSON files in `data/ingredients/*.json` at compile time via
  `include_str!` in `data.rs`. Adds `serde_json` dep.
- `database` (default) — `IngredientDatabase` and seeding APIs.
- `wasm` — `wasm-bindgen` + `serde-wasm-bindgen`; needed for the npm package.
- `diesel` — optional Postgres ORM support for `IngredientSpec`. Requires `libpq-dev`.

WASM-only code is gated with `#[cfg(feature = "wasm")]` / `#[cfg_attr(feature = "wasm",
wasm_bindgen)]`. The same crate must compile cleanly for native and WASM targets.

#### Adding ingredient definitions

JSON files in `packages/sci-cream/data/ingredients/<category>.json` are the source of truth for
embedded data. After editing, rebuild WASM (`pnpm build:package`) and re-run `pnpm seed-db` in the
app to refresh the database copy.

### TypeScript package (`packages/sci-cream/src/ts/`)

Thin wrappers around the generated WASM bindings; built output lands in `packages/sci-cream/wasm/`
and `dist/`. Notable helpers:

- **`util.ts`** — utilities for `wasm-bindgen`-generated TS enums: `getTsEnumNumbers()`,
  `getTsEnumStrings()`, `tsEnumToStr()`, `getWasmEnums()`. Used throughout the app to render
  enum-keyed dropdowns and tables.
- **`optimizations.ts`** — performance helpers for hot paths.
- **`prop-key.ts`** — `compToPropKey` / `fpdToPropKey` / `getMixProperty` for unified property
  access by key.
- **`schema-category.js`** — separately exported (`@workspace/sci-cream/schema-category`) so the
  app's Drizzle schema can use the `SchemaCategory` enum without pulling in WASM.

### Next.js app (`packages/app/src/`)

- **`app/calculator/page.tsx`** — main page; root path redirects here. Renders a responsive
  drag-and-drop grid (`react-grid-layout`) of five components: `RecipeGrid`, `MixPropertiesGrid`,
  `IngredientCompositionGrid`, `MixPropertiesChart`, `FpdGraph`.
- **`app/_components/`** — calculator UI components. They consume `recipes` from a `RecipeContext`
  and call into the WASM bridge to compute and render results. The context caches ingredient
  transfer objects (not full `Ingredient`s) by name to avoid redundant fetches.
- **`lib/sci-cream/sci-cream.ts`** — small helpers around `@workspace/sci-cream` types
  (`isCompKeyQuantity`, `isPropKeyQuantity`, `getAcceptablePropertyRange`).
- **`lib/database/`** — Drizzle ORM schema (`schema.ts`) + seed (`seed.ts`). Two tables: `users` and
  `ingredients` (user-defined specs stored as JSON). The `categoryEnum` is sourced from the
  Rust-defined `SchemaCategory` via `@workspace/sci-cream/schema-category`.
- **`lib/data.ts`** — `"use server"` actions for ingredient lookups; converts stored JSON to Rust
  types via `into_ingredient_from_spec_js()`.
- **`lib/auth.ts`** — NextAuth v5 (beta) with GitHub + Google OAuth providers.
- **`app/blog/`**, **`app/docs/`** — markdown-rendered content.

When working on UI components, prefer routing recipe → mix-property calculations through
`WasmBridge` rather than constructing `Recipe` / `RecipeLine` from JS — the bridge is the
performance-tuned path and is what production code uses.

## Linting strictness

The Rust crate uses a very strict configuration: `clippy::all`, `clippy::pedantic`,
`clippy::nursery`, and `clippy::cargo` are all `warn`, plus selected `clippy::restrictions`
(`unwrap_used`, `dbg_macro`, `print_stdout`, `todo`, `unimplemented`). All public items must have
docs (`missing_docs = "warn"`, `rustdoc::all = "warn"`). `unsafe_code` is `warn`. Aim for zero
warnings; use of `#[allow(...)]` should be rare and justified.

ESLint on both packages runs with `--max-warnings=0`. Prettier checks `src/` and `src/ts/`.
