- [x] In `RecipeContext.ingredientCache` we cache `IngredientTransfer` and convert to `Ingredient`
      every time via `into_ingredient_from_spec_js`, instead of caching the `Ingredient` itself.
      This is trivial to change, but I'm purposely leaving it like this until some benchmarking
      capabilities are implemented, since this change is a good candidate to study the effect it has
      on performance.
- [x] Once supported, benchmark the performance impact of pre-fetching all ingredient specs on
      mount, compared to individually fetching specs when requested.
- [ ] Add left columns to `IngredientCompositionGrid` to show the ingredient names and quantities,
      so that it can be positioned anywhere and does not have to be besides `RecipeGrid`.
- [ ] In `IngredientCompositionGrid` and `MixPropertiesGrid`, make it so that, if there is a
      horizontal scroll, the left-most column (containing the ingredient names or the property
      headers, respectively) does not scroll with the rest of the content.
- [ ] Add support for `MixPropertiesGrid` to show deltas between the main recipe and the references.
- [ ] Consider whether to add support to `IngredientCompositionGrid` to show deltas between recipes.
- [x] Add support for for `IngredientCompositionGrid` to show the compositions of reference recipes.
- [x] Figure out how to handle calculating FPDs for recipes where (PACtot - HF) would be negative.
      Currently this throws an error. This is unlikely to happen with real recipes, but it can
      happen when adding ingredients to a recipe one-by-one, before all ingredients have been added.
- [ ] When there are too many properties to show in `MixPropertiesChart`, it kind of silently crops
      the properties being displayed. Look into a way to either indicate the cropping, or add
      support for a horizontal scrollbar.
- [x] Add `PAC::msnf_ws_salts` and handle it independently from `::salt`, as the Goff & Hartel
      method calculates the FPD for MSNF/WS separately via a constant factor, not via PAC values.
- [x] Some combinations of "Fructose" and "Salt", e.g. 10g and 0.54g, respectively, cause an error.
      Investigate what is going on here, I suspect it applies to other combinations of ingredients.
- [ ] Investigate why Underbelly's and Dana's chocolate recipes show as being very hard using the
      Corvitto method. Are they actually very hard? May need a better method than Corvitto's.
- [x] Save recipes in local storage so that they are not lost when the page is refreshed.
- [ ] Semver permitted upgrades of `react-grid-layout` (`2.1.0 -> 2.2.2`) and `react-resizable`
      (`3.0.5 -> 3.1.0`) are producing an error (below). For now, remove the caret `^` in
      package.json to force the specific known working versions, but need further investigation.
      `Error occurred prerendering page "/" ... TypeError: b.props.children is not iterable`
- [x] Investigate adding logs or throwing exceptions in WASM functions, to make it errors at the
      Next.js app easier to debug - at the moment it just says the WASM function is unreachable.
- [ ] Once available, use `FullSpec` for "Baileys Irish Cream", as it has a more complex composition
      than can be expressed with `AlcoholSpec`, including other carbohydrates, milk solids, etc.
- [ ] Looking into using `use crate::composition::CompKey::*` to avoid having to prefix `CompKey::`
      whenever accessing values, e.g. `comp.get(MilkFats)` vs `comp.get(CompKey::MilkFats)`.
- [x] Add support for proteins and energy in `FruitSpec`, `ChocolateSpec`, `NutSpec`, and `EggSpec`.
- [ ] Add code example doc tests to all specs that don't already have them.
- [ ] Use new [pnpm/action-setup](https://github.com/pnpm/action-setup) `cache: true` option once
      it's released. See: <https://github.com/pnpm/action-setup/issues/201>
- [x] Looking to making reusable GitHub Workflows for common setup to simplify the CI workflows.
- [ ] Figure out how to handle and track [allulose](https://en.wikipedia.org/wiki/Psicose), which
      does not fit into any of the existing sugar, polyols, artificial, or fiber categories.
- [ ] Add `PropKey::TotalAmount` and figure out how to handle it on the JavasScript side.
- [x] Figure out how to re-design `Recipe` and `RecipeContext` to avoid having to copy WASM objects
      every time we need to compute the properties of a recipe. This should probably be done after
      benchmark support is available, so that performance impact can guide the design.
- [ ] Design and implement a system to calculate important ratios for `Sweeteners`, e.g. PAC:POD,
      Solids:POD, etc. A crude implementation currently is at `data::tests::sweeteners_by_ratio`.
- [x] When making changes to either the main recipe or reference recipes, the FPD graph for the
      reference recipes jumps around. Only the reference ones, the main one only moves as modified.
- [x] When making a lot of fast changes to a recipe, e.g. by repeatedly clicking the quantity arrow
      very quickly, the UI can become a bit unresponsive for a few seconds. This much easier to
      reproduce if a log is added to `updateRecipe` in `recipe.tsx`.
- [x] Investigate the stability issues when making many rapid ingredient quantity updates.
- [ ] Investigate possible performance impact of `composition.get` and `mix_properties.get` calls
      in `IngredientCompositionGrid` and `MixPropertiesGrid`; there may be a lot of them, which
      could be slow given that they are JS <-> WASM calls. Perhaps doing a single call to get a full
      map once and then doing `.get` calls on the JS side may be more performant.
- [ ] There are various calls to `comp_key_as_med_str` and `prop_key_as_med_str` that are also
      JS <-> WASM. These might also benefit from doing a single WASM -> JS call to get a map, then
      subsequent lookups during component render are done within the JS side.
- [ ] Add functionality to store component layout so that it is remembered across page reloads. The
      store should start seeded with a default for each resolution, and store any user modification.
