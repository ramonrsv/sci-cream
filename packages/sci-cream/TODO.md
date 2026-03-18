# Next Release

- [ ] Document all TypeScript items, look for a `missing_docs` equivalent lint.
- [ ] Add more tests to `sci-cream` crate and increase code coverage.
- [ ] Add code example doc tests to all specs that don't already have them.
- [ ] Rework `specs::Micro` to pull out stabilizers and emulsifiers into their own category(s).
      Should they be separate `Stabilizer` and `Emulsifier`, or something like `Texturant` that
      includes both? I prefer the latter, which accommodates blends like "Louis Francois Stab 2000",
      but users might find it confusing in.
- [ ] Add gum stabilizer ingredients and Underbelly blends with reference links and explicit ratios.
- [ ] Remove uses of `.unwrap()` in documentation code examples, see the `# fn main() ...` trick.
- [ ] Add a beginner-friendly overview of the core ice cream science concepts, e.g. FPD curves.
- [ ] Consider whether to add `CompKey` for all polyols and artificial sweeteners.
- [ ] Rename `assert_*` family of functions in `crate::validate` to `verify_*`, to differentiate.
- [ ] Split literature and ingredient definition bibliography; the latter clutters the docs.
- [ ] Consider introducing something like a `Flavouring` spec for extracts, e.g. vanilla extract.
- [ ] Add extract ingredients, notably Nielsen-Massey ones, as well as angostura bitters, etc.

# Up Next

- [ ] Implement a feature in the `sci-cream` crate to provide acceptable ranges for key properties
      of a mix, e.g. total solids, MSNF, serving temperature, etc. It should probably support
      category presets for different kinds of frozen desserts, e.g. ice-cream, sherbet, sorbet, etc.
- [ ] Add balancer functionality to automatically balance recipes and component substitutions.

# Backlog

- [ ] Look into doing `npm` releases of the `sci-cream` package.
- [ ] Look into including ingredient spec definitions in the docs, so that reference links work.
- [ ] Investigate why Underbelly's and Dana's chocolate recipes show as being very hard using the
      Corvitto method. Are they actually very hard? May need a better method than Corvitto's.
- [ ] Once available, use `FullSpec` for "Baileys Irish Cream", as it has a more complex composition
      than can be expressed with `AlcoholSpec`, including other carbohydrates, milk solids, etc.
- [ ] Figure out how to handle and track [allulose](https://en.wikipedia.org/wiki/Psicose), which
      does not fit into any of the existing sugar, polyols, artificial, or fiber categories.
- [ ] Add `PropKey::TotalAmount` and figure out how to handle it on the JavasScript side.
- [ ] Design and implement a system to calculate important ratios for `Sweeteners`, e.g. PAC:POD,
      Solids:POD, etc. A crude implementation currently is at `data::tests::sweeteners_by_ratio`.
- [ ] Find a source for the 10% lactose concentration limit, can't find it on Underbelly's blog.
- [ ] Look into the solubility curves for lactose, trehalose, etc. to determine a limit.
- [ ] Consider replacing `serde::Error` in docs with links to types, e.g. [`serde_json::Error`].
- [ ] Consider making `ScaleComponents` private so that it can only be used internally and cannot
      be misused by users; this should not present an extensibility issue with the current design.
- [ ] Consider adding composition traits for calculating POD, PAC, and energy, total (sum), etc.

# Completed

- [x] Looking into using `use crate::composition::CompKey::*` to avoid having to prefix `CompKey::`
      whenever accessing values, e.g. `comp.get(MilkFats)` vs `comp.get(CompKey::MilkFats)`.
- [x] Add comprehensive library overview in `lib.rs` crate docs and in `README.md`.
- [x] Investigate why `cargo release changes` is not working for the `sci-cream` crate.
- [x] Enable the `nursery` clippy lint group and opt-out of any problematic ones.
- [x] Add `CHANGELOG.md` and `release.toml` for releases with `cargo-release` crate.
- [x] Add `README.md` with library description, badge links, etc.
- [x] Document all items in `sci-cream` crate and enable `missing_docs` lint everywhere.
- [x] Review the energy constants for polyols, they don't agree with Spillane, 2006, p. 157.
- [x] Figure out how to handle calculating FPDs for recipes where (PACtot - HF) would be negative.
      Currently this throws an error. This is unlikely to happen with real recipes, but it can
      happen when adding ingredients to a recipe one-by-one, before all ingredients have been added.
- [x] Add `PAC::msnf_ws_salts` and handle it independently from `::salt`, as the Goff & Hartel
      method calculates the FPD for MSNF/WS separately via a constant factor, not via PAC values.
- [x] Some combinations of "Fructose" and "Salt", e.g. 10g and 0.54g, respectively, cause an error.
      Investigate what is going on here, I suspect it applies to other combinations of ingredients.
- [x] Investigate adding logs or throwing exceptions in WASM functions, to make it errors at the
      Next.js app easier to debug - at the moment it just says the WASM function is unreachable.
- [x] Add support for proteins and energy in `FruitSpec`, `ChocolateSpec`, `NutSpec`, and `EggSpec`.
- [x] Looking to making reusable GitHub Workflows for common setup to simplify the CI workflows.
