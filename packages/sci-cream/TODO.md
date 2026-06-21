<!-- markdownlint-disable MD041 -->

## Next Release

- [ ] Add code example doc tests to all specs that don't already have them.
- [ ] Add "Louis Francois Stab 2000" ingredient, which has stabilizer and emulsifier components.
- [ ] Add a beginner-friendly overview of the core ice cream science concepts, e.g. FPD curves.
- [ ] Add more ultra-filtered milk products, e.g. `Fairlife Whole Ultra-Filtered Lactose-Free Milk`.
- [ ] Add USDA chocolate ingredients and include them in `compare_specs_*` tests vs simple & lindt.
- [ ] Add TS-side unit tests for the `wasm::Recipe` functionality; it's independent from `Bridge`.

## Up Next

- [ ] Figure out how to track egg and milk proteins for stabilizing properties. If they are included
      in `composition::Stabilizers`, then we may need to differentiate those from stabilizer
      ingredients like gums, gelatin, etc. If they are not included, then that would be inconsistent
      with how `Emulsifiers` is populated, and it would make it harder to calculate `Texture`.
- [ ] Add more independent egg ingredients, including powder, and add `compare_specs_*` snapshots.
- [ ] Modify `EggSpec`, `Dairy*Spec`, etc. to populate `Stabilizers` and `Emulsifiers` with
      appropriate sub-components, e.g. lecithin, egg proteins, whey/casein proteins, etc.
- [ ] Add support for tracking milk casein/whey proteins and egg yolk/white proteins. This may need
      modifications to `Composition`, and the specs need to be modified to allow more specificity.
- [ ] Add unit tests for `to_texture` methods, stabilizer/emulsifier strength values, etc.
- [ ] Implement a feature in the `sci-cream` crate to provide acceptable ranges for key properties
      of a mix, e.g. total solids, MSNF, serving temperature, etc. It should probably support
      category presets for different kinds of frozen desserts, e.g. ice-cream, sherbet, sorbet, etc.
- [ ] Consider adding support for `Composition` to also return `Unit` instead of just `f64`.
- [ ] Add support for `data` to resolve `AliasSpec` and `CompositeSpec` on per-spec requests.
- [ ] Add more reference recipes from Underbelly, Dana, Corvitto, Ice Cream Science, etc.
- [ ] Consider adding `compare_specs_*` tests for simple and label lactose-free dairy products.
- [ ] Add whey and casein concentrate products, e.g. "Whey Powder", "Whey Protein Concentrate 80%",
      "Whey Protein Isolate 90%", "Sodium Caseinate", "Buttermilk Powder", etc.
- [ ] FPD properties cannot be balanced, so add some way to convert them to (PAC-HF)/Water.
- [ ] Add an intensive->extensive translation layer for balancing: solve non-additive targets via
      an additive proxy (`ABV` -> `Alcohol`, later `ServingTemp` -> `AbsNetPAC`). Classify keys
      Intensive/Extensive and error on target/proxy clashes. Interim: `ABV` -> `Alochol`, @todos.
- [ ] Look into implementing a derive macro to automatically define all field-update methods.
- [ ] Remove `Composition` functions for calculating ratios, `get_ratio` already handles that.
- [ ] If all children of a key have a target, we can infer the parent's target and use it in checks.

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
- [ ] Find a source for the 10% lactose concentration limit, can't find it on Underbelly's blog.
- [ ] Look into the solubility curves for lactose, trehalose, etc. to determine a limit.
- [ ] Find a second independent source (OIML, NIST, CRC) to validate `ETHANOL_SOLUTIONS_DENSITY`;
      it is the only empirical content, since ABV is defined as `ABW * density / pure_ethanol`.
- [ ] Consider replacing `serde::Error` in docs with links to types, e.g. [`serde_json::Error`].
- [ ] Consider making `ScaleComponents` private so that it can only be used internally and cannot
      be misused by users; this should not present an extensibility issue with the current design.
- [ ] Consider adding composition traits for calculating POD, PAC, and energy, total (sum), etc.
- [ ] Add more unit tests and example ingredients defined using `FullSpec`; it's WIP at the moment.
- [ ] Look into quantifying stabilizers' different functions, e.g. ice crystal suppression, adding
      viscosity, flavour release, mouthfeel, etc. May be difficult to source strength values.
- [ ] Refine the knowledge base documentation, using more peer-reviewed articles and literature
      sources. At the moment it it mostly citing blogs (Underbelly, etc.) and 1-3 books.
- [ ] Refine the stabilizer strength constants - try to find a recipe that's similar between
      Underbelly, Dana, etc. and compare the recommended concentrations of different stabilizers.
- [ ] Encode (in)dependent specs in different enums; don't implement `ToIngredient` for dependents.
- [ ] Add `resolution` support for validating a spec collection for reference sanity, etc.
- [ ] Add Abs.POD property; looks for literature sources for it, I think I saw it in Goff & Hartel.
- [ ] Consider dropping WASM support for `Recipe`, rely only on `Bridge` and `IngredientDatabase`.
- [ ] Look into `wasm_bindgen_test` and `wasm-pack test --headless --chrome` for testing `JsValue`.
- [ ] Fix `wasm` module code coverage gap, mostly by disabling anything with a `JsValue`.
- [ ] Codegen TypeScript types for serde WASM payloads from Rust (`ts-rs` / `tsify` / `typeshare`)
      instead of hand-mirroring in `ts/balancing.ts` — would let the flattened `BalancingIssue` be
      re-expanded to the rich union maintenance-free. Needs `build:package` wiring `any` override.
- [ ] Revisit a curated `CompKey` hierarchy check for balancing target validation (prototyped then
      dropped as redundant with the `DominanceViolation` check) if palette-independent validation is
      ever wanted, e.g. flagging `Sucrose > TotalSugars` before any ingredients are chosen.
- [ ] When per-key target priority lands, make balancing-issue severity priority-aware by carrying
      the priority on the issue and deriving `severity()` from it (not a stored tag); also split
      advisory severity from the hard solve-gate so a strict-but-unreachable target flags an error.
- [ ] Reject degenerate inputs in `validate_balancing_targets` / `balance_compositions`: empty
      palette or empty targets makes the solve meaningless; flag as an error before solving.
- [ ] Return balancing internals (`row_weights`, `ratio_key_parts`, `estimate_ratio_denominator`,
      `balance_with_reweighting`, `RawSolver`) to private. They were made `pub` only so doc links
      resolve under `cargo doc --document-private-items -D warnings`; de-link or relax rustdoc.
- [ ] Teach balancing-issue deduplication that a minimal part-group claim subsumes the larger sets
      containing it, so a structural full-children violation and a palette minimal-subset issue for
      one overshoot don't both report (`group_claim` in `validate_balancing_targets`).
- [ ] Enable group (multi-key) denominators in `append_palette_ratio_issues` past
      `MAX_DENOMINATOR_GROUP_SIZE = 1` to catch a numerator pinned against a sum of targeted parts;
      bench-gate it, and let the issue variants carry a multi-key denominator.
- [ ] Consider folding the empty-denominator magnitude case (`UnreachableTarget`) into the unified
      `append_palette_ratio_issues` search; it's handled separately by `append_reachability_issues`.
- [ ] Make `append_over_determination_issue` rank-aware instead of a degrees-of-freedom count that
      ignores linear dependence among target rows (currently a heuristic `Severity::Info` notice).
- [ ] Look into running only some TS-side benchmarks in every CI run; after an initial analysis
      there is no need to constantly track those. Still good to run them on a nightly/weekly sanity.
- [ ] Look into possible optimizations using the new `FastComposition`, including on the JS side.
- [ ] Split the coupled `balancing::tests` module, should go into separate `solve` and `validate`.

## Completed

- [x] Add extract ingredients, notably Nielsen-Massey ones, as well as angostura bitters, etc.
- [x] Add the inverse of `compKeyToPropKey`, etc., that is `propKeyToCompKey` for str -> enum.
- [x] Only check error-severity issues in `balance_compositions`; warnings are discarded and costly.
- [x] Add snapshot tests for the balancing issue reports, for various synthetic and real scenarios.
- [x] Add support for a `Low` balancing `Priority`, which is a similar factor below `Normal`.
- [x] Add a list of typical balancing targets that achieve a successful balance, and export it.
- [x] Consider introducing something like a `Flavouring` spec for extracts, e.g. vanilla extract.
- [x] Add top-level `lib.rs` and `README.md` docs and code examples for balancing functionality.
- [x] Add evaporated and condensed milk products from Goff & Hartel, as references for comparison.
- [x] Add balancer functionality to automatically balance recipes and component substitutions.
- [x] Add TypeScript interface for the existing preliminary automatic balancing functionality.
- [x] Implement a ratios system that calculates important ratios from a `Composition`. Maybe it can
      be added to `MixProperties` for ratios like Stabilizers/Water, Emulsifiers/Fat, etc. It also
      needs to support `Ingredient`s, primarily for sweeteners, with ratios like PAC:POD,
      Solids:POD, etc. A crude implementation currently is at `data::tests::sweeteners_by_ratio`.
- [x] Look into adding '-D warnings' to `run-local-test-suite.sh` and `package.json`, to prevent
      warnings slipping through and breaking CI. Unfortunately, this causes a lot of recompilation.
- [x] Reject negative targets in balancing: every balanceable `CompKey` is non-negative, so a target
      `< 0` is unreachable. Added an explicit `NegativeTarget` error-severity `BalancingIssue`
      (sibling to `NonFiniteTarget`), then removed the now-unnecessary `.abs()` in `row_weights` /
      `balance_rel_error_pp` that previously silently floored negative targets, hiding likely bugs.
- [x] Consider whether to add `CompKey` for all polyols and artificial sweeteners.
- [x] Add subset-sum dominance to balancing validation: flag when multiple "part" targets together
      exceed a "whole" that bounds their sum (e.g. `Sucrose 10 + Fructose 10` vs `TotalSugars 15`).
- [x] Add `compare_specs_*` tests for comparable chocolate ingredients, from std and label.
- [x] Make `cocoa_butter` optional in `ChocolateSpec`, use the standard fraction by default.
- [x] Some keys in `COMPARABLE_DAIRY_KEYS` are redundant, e.g. `TotalProteins` == `MilkProteins`.
- [x] Add milk and cream ingredients based on USDA, and investigate protein content discrepancies.
- [x] Add evaporated milk ingredients, e.g. 'Evaporated Milk', 'Fat Free Evaporated Skim Milk', etc.
- [x] Add support for composite specs that include the dependency specs inline, not referenced.
- [x] Add lactose-free support to `DairySimpleSpec`, to allow simple lactose-free ingredient specs.
- [x] Add `data` support for embedded recipes, and add data files for Underbelly, Dana, etc.
- [x] Look into add unit tests for `wasm` code; some of it can be tested if `JsValue` is not used.
- [x] Move all the inline ice cream science documentation to the `docs` section, and reference it
      in the previous inline locations either by programmatically copying docs, or via doc links.
- [x] Separate the different `constants` modules into their own files, as it's getting long.
- [x] Once there are real composite ingredients, add them to the test assets to be verified. Also
      add CompositeSpec examples to the documentation code snippets, in `README.md` and `lib.rs`.
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
