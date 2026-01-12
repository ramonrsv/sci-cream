- [ ] In `RecipeContext.ingredientCache` we cache `IngredientTransfer` and convert to `Ingredient`
      every time via `into_ingredient_from_spec_js`, instead of caching the `Ingredient` itself.
      This is trivial to change, but I'm purposely leaving it like this until some benchmarking
      capabilities are implemented, since this change is a good candidate to study the effect it has
      on performance.
- [ ] Once supported, benchmark the performance impact of pre-fetching all ingredient specs on
      mount, compared to individually fetching specs when requested.
- [ ] Add left columns to `IngredientCompositionGrid` to show the ingredient names and quantities,
      so that it can be positioned anywhere and does not have to be besides `RecipeGrid`.
- [ ] In `IngredientCompositionGrid` and `MixPropertiesGrid`, make it so that, if there is a
      horizontal scroll, the left-most column (containing the ingredient names or the property
      headers, respectively) does not scroll with the rest of the content.
- [ ] Add support for `MixPropertiesGrid` to show deltas between the main recipe and the references.
- [ ] Consider adding support for `IngredientCompositionGrid` to show the compositions of
      references. It would be simple to just add a selector, but unsure if it should support
      displaying deltas.
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
- [ ] Save recipes in local storage so that they are not lost when the page is refreshed.
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
- [ ] Looking to making reusable GitHub Workflows for common setup to simplify the CI workflows.
- [ ] Figure out how to handle and track [allulose](https://en.wikipedia.org/wiki/Psicose), which
      does not fit into any of the existing sugar, polyols, artificial, or fiber categories.
