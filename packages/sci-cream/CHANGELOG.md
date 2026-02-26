# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-header -->

## [Unreleased] - ReleaseDate

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

[Unreleased]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.1...HEAD
[0.0.1]: https://github.com/ramonrsv/sci-cream/releases/tag/sci-cream-v0.0.1
