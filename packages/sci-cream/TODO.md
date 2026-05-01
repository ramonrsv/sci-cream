<!-- markdownlint-disable MD041 -->

## Next Release

- [ ] Add code example doc tests to all specs that don't already have them.

- [ ] Add "Louis Francois Stab 2000" ingredient, which has stabilizer and emulsifier components.

- [ ] Add a beginner-friendly overview of the core ice cream science concepts, e.g. FPD curves.
- [ ] Consider whether to add `CompKey` for all polyols and artificial sweeteners.
- [ ] Consider introducing something like a `Flavouring` spec for extracts, e.g. vanilla extract.
- [ ] Add extract ingredients, notably Nielsen-Massey ones, as well as angostura bitters, etc.
- [ ] Add lactose-free support to `DairySimpleSpec`, to allow simple lactose-free ingredient specs.
- [ ] Add evaporated milk ingredients, e.g. 'Evaporated Milk', 'Fat Free Evaporated Skim Milk', etc.
- [ ] Once there are real composite ingredients, add them to the test assets to be verified. Also
      add CompositeSpec examples to the documentation code snippets, in `README.md` and `lib.rs`.
- [ ] Separate the different `constants` modules into their own files, as it's getting long.
- [ ] Figure out how to track egg and milk proteins for stabilizing properties. If they are included
      in `composition::Stabilizers`, then we may need to differentiate those from stabilizer
      ingredients like gums, gelatin, etc. If they are not included, then that would be inconsistent
      with how `Emulsifiers` is populated, and it would make it harder to calculate `Texture`.
- [ ] Modify `EggSpec`, `Dairy*Spec`, etc. to populate `Stabilizers` and `Emulsifiers` with
      appropriate sub-components, e.g. lecithin, egg proteins, whey/casein proteins, etc.
- [ ] Refine the stabilizer strength constants - try to find a recipe that's similar between
      Underbelly, Dana, etc. and compare the recommended concentrations of different stabilizers.
- [ ] Add support for tracking milk casein/whey proteins and egg yolk/white proteins. This may need
      modifications to `Composition`, and the specs need to be modified to allow more specificity.
- [ ] Add unit tests for `to_texture` methods, stabilizer/emulsifier strength values, etc.
- [ ] Move all the inline ice cream science documentation to the `docs` section, and reference it
      in the previous inline locations either by programmatically copying docs, or via doc links.
- [ ] Add a `build.rs` script to automatically merge all markdowns and create a table-of-content.

## Up Next

- [ ] Implement a feature in the `sci-cream` crate to provide acceptable ranges for key properties
      of a mix, e.g. total solids, MSNF, serving temperature, etc. It should probably support
      category presets for different kinds of frozen desserts, e.g. ice-cream, sherbet, sorbet, etc.
- [ ] Add balancer functionality to automatically balance recipes and component substitutions.
- [ ] Consider adding support for `Composition` to also return `Unit` instead of just `f64`.
- [ ] Add support for `data` to resolve `AliasSpec` and `CompositeSpec` on per-spec requests.
- [ ] Encode (in)dependent specs in different enums; don't implement `ToIngredient` for dependents.
- [ ] Add `resolution` support for validating a spec collection for reference sanity, etc.

## Backlog

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
- [ ] Add more unit tests and example ingredients defined using `FullSpec`; it's WIP at the moment.
- [ ] Look into quantifying stabilizers' different functions, e.g. ice crystal suppression, adding
      viscosity, flavour release, mouthfeel, etc. May be difficult to source strength values.
- [ ] Refine the knowledge base documentation, using more peer-reviewed articles and literature
      sources. At the moment it it mostly citing blogs (Underbelly, etc.) and 1-3 books.

## Completed

- [x] Split literature and ingredient definition bibliography; the latter clutters the docs.
- [x] Add gum stabilizer ingredients and Underbelly blends with reference links and explicit ratios.
- [x] Add functionality for `Stabilizers` and `Emulsifiers` to generate their own solids breakdown
      and `Texture`. This would help maintain DRY in specs that have stabilizers and/or emulsifiers.
- [x] Rework `specs::Micro` to pull out stabilizers and emulsifiers into their own category(s).
      Should they be separate `Stabilizer` and `Emulsifier`, or something like `Texturant` that
      includes both? I prefer the latter, which accommodates blends like "Louis Francois Stab 2000",
      but users might find it confusing in.
- [x] Add support for ingredient name aliases so that generic names, e.g. 'Chocolate Powder', can be
      explicitly linked to more specific or branded names, e.g. 'Chocolate Powder, 17% at'.
- [x] Add support for composite ingredient specs, i.e. allowing ingredients to be specified as a
      weighted combination of other ingredients, by name. Converting these into `Ingredient`s would
      need access to the full list of ingredients, there may be circular dependency issues, etc.
- [x] Rename `DairySpec` and `DairyFromNutritionSpec`to something shorter and clearer.
- [x] Implement `Validate` for `composition` (and `specs`?) and add unit tests to verify.
- [x] Remove uses of `.unwrap()` in documentation code examples, see the `# fn main() ...` trick.
- [x] Rename `assert_*` family of functions in `crate::validate` to `verify_*`, to differentiate.
- [x] Add more tests to `sci-cream` crate and increase code coverage.
- [x] Document all TypeScript items, look for a `missing_docs` equivalent lint.
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
