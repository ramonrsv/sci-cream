<!-- markdownlint-disable MD024 -- intended design of keepachangelog.com -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-header -->

## [Unreleased] - ReleaseDate

### Added

- Preliminary automatic recipe balancing functionality, using `nalgebra` and `nnls` modules.
- `AliasSpec` and `CompositeSpec`, which allow defining ingredients specs based on existing specs.
- `data` and `database` modules support for dependent `AliasSpec` and `CompositeSpec` specs.
- Top-level documentation and code examples for `Alias/CompositeSpec` in `README.md` and `lib.rs`.
- Thorough unit tests for all `composition` structs, raising module code coverage to nearly 100%.
- Unit tests for all other modules, e.g. `wasm::Bridge`, `ingredients`, `MixProps`, `util`, etc.
- Unit tests for error paths in `specs` module, verifying user-facing input error condition paths.
- `Validate` trait implementations for all `composition` structs, used in `specs` for resolution.
- Overhaul of `Micro`, `Stabilizers`, and `Emulsifiers` composition, specs, and documentation.
  - `Stabilizer` and `Emulsifier` ingredient categories, along with `Stabilizer/EmulsifierSpec`.
  - `composition::Stabilizers` and `::Emulsifiers` with detailed stabilizer/emulsifier breakdown.
  - `composition::Texture` with texture estimations from all sources, e.g. stabilizers, MSNF, etc.
  - `data/ingredients/stabilizers.json` and `/emulsifiers.json` with new ingredients, blends, etc.
  - Strength estimation concept and associated constants for all stabilizer and emulsifier fields.
- `IngredientDatabase::has_ingredient` and expose it and `::seed_*` methods via `wasm::Bridge`.
- `eslint-plugin-jsdoc` and configured it to require jsdoc for most items, e.g. methods, etc.
- Missing jsdoc for all items to satisfy the new ESLint warnings raised by `eslint-plugin-jsdoc`.
- GitHub release badge links to all `README.md`; also add `doc` script to `package.json`.
- WASM Bridge `has_ingredient` JavaScript benchmarks, alongside similar find-ingredient benchmarks.
- Unit tests to keep explicit count of defined ingredient specs; currently has 104 non-alias specs.
- `scripts/run-local-test-suite.sh` to run test suite similar to CI, but faster than using `act`.
- Documentation code examples for `AlcoholSpec` and `SweetenerSpec`.
- More dairy ingredients, including 5%, 10%, and 18% Cream.

### Changed

- Philosophy for WASM interoperability, now providing only minimally required subset of interface.
- WASM `Bridge` JS benchmarks to seed all embedded specs, as this is more like real use cases.
- Rename `validate` module `assert_*` functions to `verify_*`, to indicate the differing behavior.
- Rename `DairySpec` -> `DairySimpleSpec`, `DairyFromNutritionSpec` -> `DairyLabelSpec`.
- Make `DairyLabelSpec::is_lactose_free` optional; omission in JSON specs implies `false`.
- Move inline science knowledge in `Sugars`, `Fibers`, `Polyols`, etc. to markdown under `/docs`.
- Use official `rustlang/cargo` JSON schema for `Cargo.toml`; fixes various VSCode warnings.

### Fixed

- Division-by-100 bug in `ArtificialSweeteners::energy`; don't need to `/100` for energy value.
- `release.toml` bug with extra `\n` in `CHANGELOG.md` after `[U*released]` section.
- Broken `IngredientSpec` doc link, 'alcohol-by-volume' typo, JSON format in `README.md`, etc.
- `markdownlint` warnings on all markdown files, mainly `/docs`; disable false positive warnings.

### Removed

- Stabilizer/emulsifier sub-components from `MicroSpec`; it now only supports `MicroSpec::Salt`.
- All uses of `.unwrap()` in documentation code examples, using `fn main() -> Result<(), ...>`.
- `Micro` category, since `Stabilizer/Emulsifier` were introduced; "Salt" is now `Miscellaneous`.

## [0.0.3] - 2026-03-03

### Added

- Comprehensive library overview documentation with code examples, in `lib.rs` and `README.md`.
- `Recipe::from_const_recipe` and standard recipe assets that match those used in the App.

### Changed

- Enabled 'nursery' clippy lint group as "warn" and fixed all new reported warnings.
- `release.toml` now also searches for and replaces the package version in `package.json`.

### Fixed

- Removed erroneous additional space in `[U*released]:  https://...` in `release.toml`.

## [0.0.2] - 2026-02-26

### Added

- `crates.io` and `docs.rs` documentation badges and links to `README.md`.
- Instructions to `DEVELOPMENT.md`, about how to do a release using `cargo-release`.

### Fixed

- `release.toml` and `CHANGELOG.md` to accommodate extra `\n` after `next-url` added by TOML format.

### Changed

- Ice cream science documentation link in `README.md` to point to `docs.rs` instead of `github.com`.

## [0.0.1] - 2026-02-26

### Added

- `Ingredient` type representing an ingredient definition with name, category, and composition.
- `Category` classification with `Dairy`, `Sweetener`, `Fruit`, `Chocolate`, `Nut`, `Egg`, etc.
- Comprehensive ingredient/mix composition system (`composition` mod), with top-level `Composition`.
- Comprehensive ingredient specification system (`specs` mod) with category-specific specifications.
- Comprehensive and researched collection of `constants` for POD, PAC, energy, composition, etc.
- Ingredient definition database `data/ingredients` with 88 ingredients across various categories.
- Ice cream science documentation and bibliography system `docs`, also used in inline documentation.
- Freezing Point Depression (FPD) calculations via interpolation and polynomial from Goff & Hartel.
- FPD curves (frozen water, hardness) calculations via Goff & Hartel and modified G & H & Corvitto.
- Key-based value access from complex structs via `CompKey`, `FpdKey`, and `PropKey` wrapping both.
- `MixProperties` struct with `Composition`, `FPD`, `total_amount`, and other mix properties.
- `Recipe` representing a recipe as a list of (ingredient, amount), with `calculate_mix_properties`.
- Display utilities for converting composition/mix-property key-value pair to human-readable format.
- Input validation framework via `Validate` trait and assertion utilities, used in `specs` module.
- Comprehensive error types `crate::error::Error` via `thiserror`, covering the entire crate.
- `data` feature that embeds the ingredient database at compile-time, making it easily accessible.
- `database` features with in-memory `IngredientDatabase` with seeding from specs, embedded, etc.
- `wasm` feature with WebAssembly support and TypeScript bindings via `wasm-bindgen`.
- WASM `Bridge` struct to minimize JS <-> WASM bridging overhead for recipe calculations.
- TypeScript utilities, optimizations, ingredient database as JSON, wrapper for `PropKey`, etc.

<!-- next-url -->

[Unreleased]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.3...HEAD
[0.0.3]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.2...sci-cream-v0.0.3
[0.0.2]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.1...sci-cream-v0.0.2
[0.0.1]: https://github.com/ramonrsv/sci-cream/releases/tag/sci-cream-v0.0.1
