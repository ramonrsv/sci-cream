# Sci-Cream Copilot Instructions

## Project Overview

Sci-Cream is a monorepo for ice cream mix analysis: a Rust library compiled to WebAssembly + a Next.js web calculator. The core domain calculates ice cream composition breakdowns, freezing point depression (FPD), and mix properties from recipe ingredients.

## Architecture

### Two-Package Structure (pnpm workspace)

- **`packages/sci-cream`**: Rust crate with dual build targets
  - Native Rust library (`rlib`) with optional `diesel` feature for database types
  - WebAssembly module (`cdylib`) exposing functions to TypeScript via `wasm-bindgen`
  - TypeScript wrapper at `src/ts/index.ts` re-exports WASM + utilities
- **`packages/app`**: Next.js 16 app consuming `@workspace/sci-cream`
  - React Server Components (`"use server"`) in [lib/data.ts](packages/app/src/lib/data.ts) for database queries
  - Drizzle ORM with PostgreSQL for ingredient storage
  - Client-side components handle WASM calculations

### Critical Build Quirk: Dynamic Crate Type Switching

`wasm-pack` doesn't support `--crate-type` flags, so [scripts/set-crate-type.sh](packages/sci-cream/scripts/set-crate-type.sh) toggles `Cargo.toml` between `rlib` and `cdylib`:

```bash
# In packages/sci-cream
pnpm build:wasm  # Auto-switches to cdylib, runs wasm-pack, reverts to rlib
pnpm build:rust  # Uses rlib for native builds
```

**Never manually edit `crate-type` in Cargo.toml** - the scripts manage it. This is a workaround until wasm-pack supports `--crate-type` (see [issue #1297](https://github.com/drager/wasm-pack/issues/1297)).

## Key Domain Concepts

### Ice Cream Calculations

- **Composition**: Multi-level breakdown of mix components represented by `CompKey` enum
  - Top-level: `SolidsBreakdown` (fats, sweeteners, SNFS) per ingredient source (milk, egg, cocoa, nut, other)
  - All values: grams per 100g of total mix (not percentage of solids)
  - Example: 50g milk (2% fat) + 50g water → `milk.fats == 1` (1g fat per 100g mix)
- **FPD (Freezing Point Depression)**: Texture metric calculated from PAC (Potere Anti-Congelante). See [docs/freezing-point-depression.md](packages/sci-cream/docs/freezing-point-depression.md)
- **Recipe**: Array of `CompositionLine` (ingredient composition + amount), aggregated via [calculate_mix_composition](packages/sci-cream/src/recipe.rs#L27-L43)
- **Mix Properties**: Combined view of composition percentages + FPD curves

### Data Flow: Rust → WASM → React

1. Rust functions (e.g., [calculate_mix_properties_js](packages/sci-cream/src/recipe.rs#L138)) annotated with `#[wasm_bindgen]`
2. `pnpm build:wasm` generates [wasm/index.js](packages/sci-cream/wasm/index.js) with TypeScript bindings
3. [src/ts/index.ts](packages/sci-cream/src/ts/index.ts) re-exports: `export * from "../../wasm/index"`
4. React imports via workspace alias: `import { ... } from "@workspace/sci-cream"`
5. Client components call Rust via WASM transparently (no serialization needed for most types)

## Development Workflows

### Running the App

```bash
# From workspace root
pnpm dev  # Proxies to packages/app, uses Turbopack by default

# From packages/app
pnpm dev:turbopack  # Default, faster HMR
pnpm dev:webpack    # Fallback if Turbopack issues arise
```

### Testing Strategy

Both packages use Vitest but with distinct test approaches:

```bash
# Run from workspace root or package directories
pnpm test           # Runs all tests (Rust + JS for both packages)
pnpm test:rust      # Cargo tests in packages/sci-cream
pnpm test:js        # Vitest for TS wrappers/React components
pnpm coverage       # Includes cargo-llvm-cov for Rust coverage
```

**Test Patterns:**

- **Rust tests**: Colocated in [src/tests/](packages/sci-cream/src/tests/) subdirectories
  - Use `all_asserts`, `more-asserts`, `pretty_assertions` for enhanced assertions
  - Example: `assert_abs_diff_eq!` for floating-point comparisons
- **JS tests**: Files ending `.test.ts/tsx`, **must build WASM first** (automated in package scripts)
- **App tests**: `@testing-library/react` with `jsdom` environment
  - Canvas mocking configured in [vitest.config.mjs](packages/app/vitest.config.mjs) via `vitest-canvas-mock`

### Database Operations

```bash
# From packages/app
pnpm seed-db  # Pushes schema with drizzle-kit, then runs src/lib/db/seed.ts
```

**Drizzle ORM Setup:**

The app uses Drizzle ORM with PostgreSQL for type-safe database access:

- **Schema**: [src/lib/db/schema.ts](packages/app/src/lib/db/schema.ts) defines tables with `drizzle-orm/pg-core`
  - `usersTable` - Auto-incrementing ID, unique email constraint
  - `ingredientsTable` - Composite primary key `(name, user)`, foreign key to users
  - `categoryEnum` - PostgreSQL enum from Rust `SchemaCategory` type
  - Type inference: `typeof usersTable.$inferInsert` and `$inferSelect` for type safety
- **Config**: [drizzle.config.ts](packages/app/drizzle.config.ts) points to schema file and PostgreSQL connection
- **Client**: Initialized in [lib/data.ts](packages/app/src/lib/data.ts) via `drizzle(process.env.DATABASE_URL!, { schema })`

**Query Patterns:**

- Use `eq()`, `and()` from `drizzle-orm` for type-safe filters:
  ```typescript
  await db
    .select()
    .from(ingredientsTable)
    .where(and(eq(ingredientsTable.name, name), eq(ingredientsTable.user, userId)));
  ```
- Upsert pattern in [seed.ts](packages/app/src/lib/db/seed.ts): check if exists, delete, then insert
- `onConflictDoNothing()` for idempotent inserts (e.g., user seeding)

**Schema Patterns:**

- Ingredient specs stored as JSON in `ingredientsTable.spec` column (parsed from Rust `IngredientJson` type)
- Server actions in [lib/data.ts](packages/app/src/lib/data.ts) fetch specs, convert to Rust types via `into_ingredient_from_spec_js()`
- `FetchCounter` class simulates 500ms latency for testing—**remove in production**

## Code Patterns & Conventions

### Rust Feature Flags

Use `#[cfg(feature = "wasm")]` to conditionally compile WASM-specific code. Both `wasm` and `diesel` features are optional:

```rust
#[cfg(feature = "wasm")]
pub mod wasm;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub struct Composition { /* ... */ }
```

**Why this matters:** The same crate serves both native Rust consumers and WASM targets. Feature gates prevent bloat and compilation errors.

### TypeScript Enum Utilities

Rust enums are exported as TypeScript enums. Helper functions in [src/ts/util.ts](packages/sci-cream/src/ts/util.ts) handle conversions:

- `getTsEnumNumbers()`, `getTsEnumStrings()` - Extract enum values
- `tsEnumToStr()` - Convert enum key to display string

Example usage in React components for dropdown rendering.

### React Context Pattern for Recipes

[page.tsx](packages/app/src/app/page.tsx) maintains a single `RecipeContext` with:

- `ingredientCache: Map<string, IngredientTransfer>` - Caches specs to avoid redundant fetches
  - **Intentionally caches transfer objects, not full Ingredients** (see [TODO.md](TODO.md) for benchmarking rationale)
- `recipes: Recipe[]` - Array of up to `MAX_RECIPES` (3), each with `RECIPE_TOTAL_ROWS` (20) ingredient slots
- Components receive `[ctx, setCtx]` state tuple to coordinate updates

### Grid Layout Constants

[page.tsx](packages/app/src/app/page.tsx) defines precise height/width constants for `react-grid-layout`:

```typescript
const REACT_GRID_COMPONENT_HEIGHT = 11; // Grid units
const REACT_GRID_ROW_HEIGHT = 35.6; // Pixels per grid unit
export const STD_COMPONENT_H_PX = 592; // Standard component height in pixels
```

**⚠️ Critical:** These values are interdependent and tuned for exact pixel alignment. Modify with extreme care and test multiple screen sizes. There's a known quirk where `REACT_GRID_COMPONENT_HEIGHT * REACT_GRID_ROW_HEIGHT != STD_COMPONENT_H_PX`, but it works reliably in practice.

### Server Actions & Async Patterns

Functions in [lib/data.ts](packages/app/src/lib/data.ts) marked `"use server"` run server-side:

- `fetchIngredientSpec()` - Queries PostgreSQL, returns `IngredientTransfer`
- `fetchAllIngredientSpecs()` - Pre-fetches all specs for caching
- `FetchCounter` class simulates network latency (500ms) for testing—**remove in production**

## Common Tasks

### Adding a New Composition Component

1. Add enum variant to `CompKey` in [src/composition.rs](packages/sci-cream/src/composition.rs)
2. Update `Composition` struct with field
3. Implement getters/setters with `#[wasm_bindgen]` methods
4. Add display logic in [src/display.rs](packages/sci-cream/src/display.rs)
5. Rebuild WASM: `pnpm build:wasm` (from packages/sci-cream)
6. Update TypeScript imports if needed

### Modifying FPD Calculations

FPD curves use polynomial coefficients in [src/constants.rs](packages/sci-cream/src/constants.rs):

- `PAC_TO_FPD_TABLE` - Source data table used by `get_fpd_from_pac_interpolation()`
- `PAC_TO_FPD_POLY_COEFFS` - Polynomial coefficients generated from the table, used by `get_fpd_from_pac_polynomial()` for faster calculations
- Functions in [src/fpd.rs](packages/sci-cream/src/fpd.rs) compute curves based on `Composition`

### Adding Ingredients to Database

JSON files in [data/ingredients/\*.json](packages/sci-cream/data/ingredients/) define ingredient specs by category. After modifications:

```bash
cd packages/app
pnpm seed-db  # Pushes schema + runs seed script

# Alternative: manual steps
npx drizzle-kit push
pnpm tsx ./src/lib/db/seed.ts
```

### Debugging WASM Issues

If WASM bindings break after Rust changes:

1. Rebuild WASM: `cd packages/sci-cream && pnpm build:wasm`
2. Check TypeScript errors: `cd packages/app && pnpm lint`
3. Verify crate-type reverted to `rlib` in Cargo.toml
4. Clear Next.js cache: `cd packages/app && rm -rf .next`

## Linting & Formatting

```bash
pnpm lint       # ESLint for TS, cargo clippy for Rust
pnpm prettier   # Check TS formatting
```

Rust uses comprehensive lints in [Cargo.toml](packages/sci-cream/Cargo.toml) under `[lints.rust]`:

- Many allowed-by-default lints are set to `warn`
- Groups: `future_incompatible`, `rust_2024_compatibility`, `unused`
- Specific lints: `unreachable_pub`, `unsafe_code`, `unused_results`, etc.

## Build System Notes

### WASM Build Process

1. `set-crate-type.sh` changes `Cargo.toml` to `cdylib`
2. `wasm-pack build` compiles Rust to WASM
3. TypeScript bindings generated in `wasm/` directory
4. Script reverts `Cargo.toml` to `rlib`
5. `vite build` bundles TypeScript wrapper

### Workspace Dependencies

- Root `pnpm-workspace.yaml` defines package boundaries
- `@workspace/sci-cream` alias enables `packages/app` to import from `packages/sci-cream`
- Both packages have independent `node_modules` but share root `pnpm-lock.yaml`

### Next.js Configuration

[next.config.ts](packages/app/next.config.ts) may include WASM-specific webpack config. Check for `experiments: { asyncWebAssembly: true }` if encountering WASM loading issues.
