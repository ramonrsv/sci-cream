<!-- markdownlint-disable MD024 -- intended design of keepachangelog.com -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-header -->

## [Unreleased] - ReleaseDate

### Added

- `DairySheetSpec::salt`, an `AddedSalt` of `Grams` or `FromSodium` (mg), counted as salt, not MSNF.
- `molar_mass::SODIUM`, for converting an `AddedSalt::FromSodium` to grams of salt.
- `FullSpec::energy`, overriding the energy it calculates, e.g. USDA's 884 kcal for oils, not 900.
- New ingredients, now 387 specs and 69 aliases, up from 361 and 64:
  - Chocolate: generic 30/35/40% milk and white, Cadbury Dairy Milk, Valrhona and Belcolade whites.
  - Dairy defaults: unsalted and salted butter, butter oil (ghee, clarified butter), and AMF.
  - Dairy references: Goff & Hartel and USDA butters and butter oils, and Goff & Hartel's AMF.
  - Oils: canola (rapeseed), coconut, olive, soybean, and sunflower, from USDA SR Legacy.
  - Nuts: roasted hazelnut, and the Nutella, Lindt, and Nocciolata spreads, fit to their labels.
- `CocoaPowderSpec::cocoa_butter` docs on using a sheet's fat as is, even when on dry matter.

### Changed

- Adopt the cocoa terminology of standards and spec sheets, where "cocoa solids" is the total:
  - `CompKey::CocoaSolids` now names the total, formerly `CacaoSolids`; check every existing use.
  - `CompKey::CocoaSNF` names the non-fat part, formerly `CocoaSolids`, displayed "Cocoa SNF".
  - The chocolate and cocoa powder specs' `cacao_solids` is `cocoa_solids`, JSON key included.
  - `estimate_chocolate_snf_split_from_protein_by_cacao_solids` is now `_by_cocoa_solids`.
  - The seven `STD_*_IN_COCOA_SOLIDS` fractions of the non-fat part are `STD_*_IN_COCOA_SNF`.
  - `STD_COCOA_BUTTER_IN_CACAO_SOLIDS` is `STD_COCOA_BUTTER_IN_COCOA_SOLIDS`.
  - `hf::COCOA_SOLIDS` is `hf::COCOA_SNF`, as Corvitto's 1.8 is the non-fat part's.
  - Modules `constants::composition::cacao` and `specs::chocolate` are renamed `cocoa`.
  - The guide's chocolate chapter is now "Cocoa", at `docs#cocoa`, citing Codex, Canada, and the EU.
- Milk and white `ChocolateLabelSpec`s scale a rounding overfill into 100 g, rather than reject it.
- 'Palm Oil' is a USDA `FullSpec` of `OtherFats`, not `NutFat`: HF 140 to 0, energy 900 to 884.
- 'Vegetable Oil' is a `FullSpec` of USDA's FNDDS oil blend, at 13.4% saturated fat, up from none.
- Crate and README examples use 'Cocoa Powder, 22/24% Fat', the common pastry grade, not the 17%.

### Fixed

- `FullSpec` accepted negative values and fat subsets over the total; it now validates them.
- Broken `data/ingredients/generated` link in `README.md`.

### Removed

- 'Cocoa Powder, 15% Fat', '20% Fat', and '24% Fat', leaving 10%, 13%, 17%, 22%, and the grades.

## [0.0.8] - 2026-11-22

### Added

- Significant expansion of chocolate and cocoa modeling, from spec sheets and nutrition labels:
  - `CocoaPowderSpec`, split from `ChocolateSpec`, adding `water` and `dutch_processed` fields.
  - `ChocolateSpec::milk_solids`, composed as dairy milk solids, with lactose, casein, and whey.
  - `ChocolateLabelSpec`, from a per-serving label by `ChocolateKind`, with any `DeclaredSolids`.
  - Rejects figures past the serving, unmet solids minima, sweetened cocoa, mismatched protein.
  - Public `derive_*_chocolate_solids`, `estimate_chocolate_*`, and `resolve_chocolate_fats`.
- Dairy modeling from spec sheets, and of concentrates and isolates by their protein grade:
  - `DairySheetSpec`, for sheets and databases that list water, with `Sugars`, `casein`, and `ash`.
  - Concentrates set by protein grade, along lines like `lactose_in_snf` and `minerals_in_snf`.
  - `SolidsSource::Caseinate`, and sourced isolate anchors for milk, whey, and casein solids.
- `SolidsBreakdown::minerals` (ash), read via the new `CompKey::MilkMinerals` and `TotalMinerals`.
- `GumArabic`, `MonoAndDiglycerides`, `DistilledMonoglycerides`, and `Polysorbate80` `CompKey`s.
- `EmulsifierSpec::other_solids`, for a product's non-emulsifier part, e.g. lecithin carrier oil.
- `sci_cream::asserts` float assertions, `assert_eq_flt!` and `assert_eq_{8,6,4}dp!`.
- `constants::tolerances`, with each assertion's tolerance, e.g. `EPSILON_6DP`.
- `constants::units`, with exact NIST US customary measures and the rounded ones labels use.
- Many new ingredients, now 361 specs and 64 aliases, up from 220 and 40:
  - Dairy defaults: 3.6% and 4% Milk, 6% Cream, whey powder, MPC/MPI, WPC/WPI, MCC/MCI, caseinate.
  - Dairy references: USDA milk powders and whey, USDEC sheets, Lactantia, Neilson, Fairlife labels.
  - Chocolate: 50/55% dark, Callebaut, Mona Lisa, Valrhona, Corvitto, Lindt, Green & Black's, USDA.
  - Cocoa powder: 10/12, 20/22, and 22/24 fat grades, USDA alkalized, Callebaut, Valrhona, Purest.
  - Sweeteners: maltodextrin and glucose syrup DE ranges, glucose powder 37 DE, HFCS 55 and 90.
  - Emulsifiers: lecithin grades, gum arabic, mono- and diglycerides, DMG, GMS, polysorbate 80.
  - Stabilizers: generic LBG-GG-LC and CMC-GG-LC blends, Louis Francois blends, carrageenan.
  - Others: pistachios, cocoa butter, palm and vegetable oils, bananas, basil, nutmeg, vanilla pod.
- Corvitto and Dana Cree reference recipes, and seven more Ice Cream Science recipes.
- `docs::ingredients` and `docs::recipes` rustdoc pages, rendering the embedded data and sources.
- Docs on dairy crude protein, Dutch processing, glucose syrups, and strength values' as-is basis.
- Reconciliation tests of embedded entries against measured USDA proximates and literature data.
- Size benchmarks for the WASM binary, npm bundle, wasm-bindgen glue, and tarball, raw and gzip.

### Changed

- Author built-in data in `data/**/*.md`, embedding generated comment-free JSON, shrinking WASM.
- TS data `comments` are markdown, with `[^N]` definitions inlined and crate links to docs.rs.
- Dairy model sourced and extended, shifting the composition of most dairy ingredients:
  - `STD_MINERALS_IN_MSNF` sourced at 8%, leaving `STD_PROTEIN_IN_MSNF` 37.5%, from 10.5% and 35%.
  - Whey solids sourced on sweet whey, at 13% protein and 8.5% minerals, from 12% and 11.5%.
  - Minerals modeled first, apart from other solids, capped at what sugars and protein leave.
  - `DairyLabelSpec` reads sugars as measured, and estimates SNF per solids source in closed form.
  - Rename `SolidsSource::Casein` to `MicellarCasein`, whose protein must be at least milk's.
- Move dairy constants into `constants::composition::dairy::{milk,whey,casein}` submodules.
- Move `specs::SolidsSource` to `constants::composition::dairy::SolidsSource`.
- USDA dairy entries are `DairySheetSpec`s, mostly from Foundation and SR Legacy records.
- Replace `ChocolateSpec::cocoa_butter` with `fat`, a `ChocolateFat` of `total_fat` or `split_fats`.
- Embedded cocoa powders are `CocoaPowderSpec`s, modeling 3% water by default, not bone dry.
- Lindt EXCELLENCE, Baker's, Ghirardelli, and Hershey's entries are now `ChocolateLabelSpec`s.
- Refit cacao constants on USDA listings, with ash and carbohydrates split natural/dutched.
- Rename `hf::CACAO_BUTTER` to `hf::COCOA_BUTTER`.
- Drop the `_OF_CHOCOLATE_NON_POWDER` suffix from `STD_COCOA_BUTTER_IN_CACAO_SOLIDS`.
- Rename 'HFCS 42' to 'High Fructose Corn Syrup 42', kept as an alias, now with maltose, 77% solids.
- Rename 'Soy Lecithin' to 'Soy Lecithin Powder', now at 95% lecithin and 5% fat.
- Point the 'Ice Cream Stabilizer Blend' alias at the general purpose blend, not easy-to-find.
- Mass-fraction balancing targets must be in [0, 100], per the new `CompKey::target_domain`.
- Remove `FpdKey::FPD` from `get_typical_balancing_keys`, as it competes with `ServingTemp`.
- Split `ethanol_solution_density` into `ethanol_solution_density_by_abw` and `_by_abv`.
- Move `constants::COMPOSITION_EPSILON` into `constants::tolerances`.
- Derived composition constants are literals, with doctests checking their stated relations.
- Bibliography in APA style, linking titles; ingredient references are renumbered from 500.
- Upgrade Cargo and pnpm dependencies, incl. `nnls` 0.5 and `ndarray` 0.17; except `getrandom`.

### Fixed

- `EmulsifierSpec` modeled gum arabic, glycerides, and polysorbate 80 as water, not solids.
- `DairyLabelSpec`'s 2% water floor ignored sucrose, so sweetened powders could fall below it.
- A zero serving size or molar mass gave NaN or infinite PAC; now `CompositionNotAboveZero`.
- Broken link to the automatic recipe balancing section in the crate docs.

### Removed

- `assert_eq_float!`, replaced by the `sci_cream::asserts` macros with stated tolerances.
- `STD_WATER_CONTENT_IN_CACAO_PRODUCTS`, replaced by `STD_WATER_IN_{COCOA_POWDER,CHOCOLATE}`.
- `STD_MINERALS_IN_CASEIN`, replaced by the micellar casein and caseinate constants.
- 'Casein', 'Whey Isolate', and 'Eggless Ice Cream Stabilizer Blend' aliases to named products.
- Redundant `homepage` and `readme` in `Cargo.toml`; crates.io showed duplicate links.

## [0.0.7] - 2026-07-16

### Added

- Water evaporation as a `Recipe.evaporation` attribute, with `evaporate`/`deevaporate` support.
- `Flavouring` ingredient category, with a new `data/ingredients/flavourings.json` and ingredients.
- Many new ingredients: vanilla extracts, bitters, essential oils, chocolate & cocoa, creams, milks.
- USDA chocolate reference ingredients, along with `compare_specs` tests to compare against model.
- Underbelly cocoa/booze and Ice Cream Science reference recipes, under new `data/recipes/*`.
- `DairySimpleSpec::sucrose` field, for dairy with added sugar such as 'sweetened condensed milk'.
- `EggSpec::egg_source` (`WholeEgg`/`EggWhite`/`EggYolk`) split, plus 12 USDA and reference specs.
- Tracking of per-source protein subtypes: `MilkProteins`, `EggProteins`, and `SimpleProteins`.
- New `Casein`, `Whey`, `WhiteProteins`, `YolkProteins`, `MilkSugars`, and `EggProteins` `CompKey`s.
- New `CompKey::NetPAC` (`TotalPAC - HF`, may go negative) and `RatioKey::AbsNetPAC` keys.
- `CompKey` part/whole hierarchy module, with separate structural and display hierarchies.
- `getStructuralHierarchy`, `getDisplayHierarchy`, and `groupEnabledKeys` TypeScript helpers.
- `FastComposition` and a `CompositionValues` trait, for ~240x faster repeat `CompKey` reads.
- Mix density via `mixture_density`, plus a `dairy_density` model and `dairy_ml_to_g` conversion.
- Concentration-dependent model for ABV/ABW conversions derived from an ethanol-density table.
- FPD curve-point API `compute_fpd_curve_point` and its inverse `compute_pac_from_fpd_curve_point`.
- `interpolate_pairs` and `fast_interpolate_pairs` lookup-table interpolation utilities.
- Embedded-data integrity test, with `SpecEntry::from_json_value` for field-level parse errors.
- TS helpers `isBalanceableKey`, PropKey predicates, `get_ratio_key_parts`, `LightRecipe` aliases.
- Further significant expansion of automatic recipe balancing functionality and usability:
  - Direct targeting of ABV and the FPD keys, translated to `Alcohol`/`AbsPAC`/`AbsNetPAC` proxies.
  - Ingredient locking via `Lock` of `Fraction` (of mix) or `Amount` (grams), incl. locked-at-zero.
  - `Priority::Low` (weight 0.2), completing the Low/Normal/High/Critical balancing priorities.
  - `get_typical_balancing_keys` (curated subset) and `get_all_native_balancing_keys` (native set).
  - Structural feasibility checks and a `Severity::Info` advisory tier (`OverDetermined`).
  - `total_amount` on `Bridge::balance_recipe`, to set the balanced recipe's total mass.
- `field_update_methods!` macro used to programmatically generate struct field-update methods.
- Balancing issue reports snapshot tests, verifying the quality and usability of issue reports.
- Benchmarks, for `Dairy*Spec::to_comp*`, `compute_fpd_curves`, `validate_balancing_targets`, etc.

### Changed

- `CacaoSolids`, `NutSolids`, `EggSolids`, and their SNF keys now include intrinsic sugar content.
- `Alcohol::from_abv`/`to_abv` use concentration-dependent conversions instead of a flat ratio.
- `DairyLabelSpec` converts mL servings to grams via a fixed point on the modeled dairy density.
- Replace per-fat dairy density consts with a `FRESH_DAIRY_DENSITIES` table and quadratic fit.
- Unify the seeding API onto an `OnConflict` policy, adding `seed_from_embedded_data` and `clear`.
- Fold balancing `targets`/`priorities` into one `(BalanceKey, f64, Option<Priority>)` list.
- Unify feasibility checks on a `ratio_band` primitive; emit all issues, dedup, `OutOfDomainTarget`.
- Add an optional relative tolerance to `validate_balancing_targets` for app-rounded targets.
- Increase balancing group-size thresholds; move `MAX_NUM_GROUP_*` into `constants::balancing`.
- Rename `get_balanceable_keys` -> `get_all_balanceable_keys`, alongside the new key subsets.
- Reconcile the Nielsen-Massey flavourings with their labels; add `constants::density::oils`.
- Change the 'Bourbon Whiskey' ingredient from 40% to 43% ABV, which is more common in products.
- Upgrade Cargo and pnpm dependencies to latest compatible versions; except `ndarray`, `getrandom`.
- Skip warnings-severity balancing target validation in `balance_compositions`, check errors only.

### Fixed

- The 'Fresh Spearmint' alias resolved to peppermint; point it at 'USDA Fresh Spearmint'.
- A grams-labeled dairy fat was passed to the mL-to-g conversion as a fat percentage.

### Removed

- `EggSpec::lecithin` field; lecithin is now derived from the yolk-solids fraction and constant.
- The flat `ABV_TO_ABW_RATIO` constant, replaced by the new concentration-dependent conversions.

## [0.0.6] - 2026-06-10

### Added

- Support for reference recipe `data`, similar to ingredients; include standard Underbelly recipes.
- `DairySimpleSpec::lactose_free` field and "Lactose-Free" ingredients to `ingredients/dairy.json`.
- More dairy ingredients, including evaporated milks, branded milk and protein powders, etc.
- `DairyLabelSpec::sucrose` field, to define dairy with added sugar, e.g. sweetened condensed milk.
- Cross-source ingredient composition comparison tests, including snapshots with the `insta` crate.
- USDA reference dairy ingredients, used to validate other dairy ingredients in snapshot tests.
- `DairySimpleSpec::protein` and `solids_source` fields, allowing definitions from Goff & Hartel.
- `CompKey`s for all polyols, artificial sweeteners, stabilizers, emulsifiers, fibers, etc.
- `CompKey`s for `SaturatedFat` and `TransFat`, now internally estimated on most ingredient specs.
- `KeyAsString::as_short_str` and `as_long_str`, along with implementations and TS-side helpers.
- `isCompKey/isRatioKey/isFpdKey` benchmarks and a `Set` optimization that showed great improvement.
- `wasm::Bridge::get_all_ingredient_names`, which obviates the need for JS consumers to `.free()`.
- Support for inline specs in `CompositeSpec`, in addition to named refs, resolved with no lookup.
- Optional `DairyLabelSpec::carbohydrates` field, for some labels where it is greater than `sugars`.
- Name aliases for dairy ingredients with common names, e.g. "Half and Half", "Table Cream", etc.
- Significant expansion of automatic recipe balancing quality, customization, WASM support, etc.:
  - Relative-error weighting of each row by `1 / target`, so the solver minimizes relative error.
  - Balancing quality reports for best-effort disparate targets, including snapshots with `insta`.
  - Support for `RatioKey`s as balancing targets, encoded as homogeneous `num - (R/100)*den` rows.
  - Support for per-target priorities, Normal/High/Critical translates to row weights 1/5/25.
  - Balancing target validation, reporting errors/warnings, e.g. negative and unaffectable targets.
  - `Recipe` and `wasm::Bridge` support for balancing, including priorities, target validation, etc.
  - TS-side benchmarks for `Recipe.balance` and `Bridge.balance_recipe`, similar to the Rust ones.

### Changed

- Make `ChocolateSpec::cocoa_butter` field optional; use standard composition values if unspecified.
- Make `DairyLabelSpec::saturated_fat` and `trans_fat` optional, use standard composition values.
- Estimate MSNF in `DairyLabelSpec` as `(dairy_sugars + protein) / (1 - minerals_fraction)`.
- Replace hand-maintained embedded-data counts with name-list snapshots using the `insta` crate.
- Slightly modify simple milk powder ingredients to match Goff & Hartel and reference bulk products.
- Unify naming of aggregate `CompKey`s, now all have a `Total` suffix, e.g. `Fiber` -> `TotalFiber`.
- Extract ratio keys from `CompKey` and into new `RatioKey` for ratio-specific support and handling.
- Enable codecov for `wasm` modules, now showing a legitimate coverage gap that should be filled.
- Add `RUST(DOC)FLAGS="-D warnings"` to `scripts/run-local-test-suite.sh`, to catch issues locally.
- Use `#[serde(untagged)]` in `PropKey` and `BalanceKey`, to allow a flat list of keys in WASM API.
- Add `#[serde(skip_ser*_if = "Option::is_none")]` to all optional spec fields; matches definitions.
- Simplify `nalgebra` least-squares impl; don't need to solve `(A^t * A) * (A^t * Y)` with SVD.

### Fixed

- Incorrect footnote indices in `.md` and `.rs` docs, e.g. EU source should be \[^10\], not \[^9\].

### Removed

- Dairy ingredient definitions where sugars was taken as the average of label sugars/carbohydrates.

## [0.0.4] - 2026-05-06

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

[Unreleased]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.8...HEAD
[0.0.8]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.7...sci-cream-v0.0.8
[0.0.7]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.6...sci-cream-v0.0.7
[0.0.6]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.4...sci-cream-v0.0.6
[0.0.4]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.3...sci-cream-v0.0.4
[0.0.3]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.2...sci-cream-v0.0.3
[0.0.2]: https://github.com/ramonrsv/sci-cream/compare/sci-cream-v0.0.1...sci-cream-v0.0.2
[0.0.1]: https://github.com/ramonrsv/sci-cream/releases/tag/sci-cream-v0.0.1
