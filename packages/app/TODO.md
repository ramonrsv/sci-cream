# Next Release

- [ ] Pasting the strawberry sorbet recipe, fixing 'Strawberry [Brix 9]' to remove ' [Brix 9]', then
      pasting a different recipe causes a 'null pointer passed to rust' error; still unclear why.
- [ ] Add recipe save functionality. Recipes should support versions and notes.
- [ ] Add recipe share functionality. Should be a link that anyone can open, and that can be
      embedded into other websites. How to handle user-defined ingredients?
- [ ] Add support for `MixPropertiesGrid` to show deltas between the main recipe and the references.
- [ ] Add `height` prop to `MixPropertiesGrid` so that it can adapt the number of properties shown.

# Up Next

- [ ] Review the sign-in classes in `globals.css`, used in `/signin/page.tsx` and `/signup/page.tsx`
- [ ] Add `Watchers` component where users can select what properties to watch. It should probably
      support displaying deltas between the main and reference recipes, and target min-max ranges.
- [ ] Add make-recipe link, to click off ingredients that have been measured out for one or more
      recipes. Each recipe should be letter and color coded.
- [ ] Add scoopability and FPD properties component with visuals.
- [ ] Add Nutrition Facts Table component.
- [ ] Check how vertical spacing looks like on 1080p/2160p screens; look into dynamic vertical?
- [ ] Add functionality to store component layout so that it is remembered across page reloads. The
      store should start seeded with a default for each resolution, and store any user modification.
- [ ] Figure out how to show `sci-cream`'s beginner-friendly overview to new users of the app.
- [ ] Add a visual regression test for the custom filter settings button and checkbox menu.
- [ ] Figure out how to do visual regression tests of animations, e.g. navbar expand/collapse.
- [ ] In `MixPropertiesGrid`, make it so that, if there is a horizontal scroll, the left-most column
      (property headers) does not scroll with the rest of the content.
- [ ] Look into setting up and how to do database migrations for the production database.
- [ ] There are some `react-grid-layout` layout shifts on page refresh; it's worse on mobile.
- [ ] Add functionality for user-defined ingredients. This may be tricky with recipe share links.
- [ ] Add support for sharing of user-defined ingredients, similarly to sharing of recipes.

# Backlog

- [ ] Add an app "tour" to show users the main components of the app, where to go for docs, etc.
- [ ] Add a 'User Guide' navbar item to contain documentation about how to use the app.
- [ ] Look into implementing a JS-side ingredient cache so that `Ingredient` WASM objects are only
      created once, then any lookups return JS light clones, which should reduce `.free()` issues.
- [ ] There are many jarring flashes on first page load (some layout changes, a flash of
      invalid-ingredient-name red before loading, etc.), so consider adding a loading screen to
      allow all those things to settle before displaying the main page (see how Monarch does it).
- [ ] Look into Next.js's system for displaying component placeholders to avoid layout changes.
- [ ] Add test to check that `MixPropertiesGrid` has no vertical scroll with default layout/filters.
- [ ] When there are too many properties to show in `MixPropertiesChart`, it kind of silently crops
      the properties being displayed. Look into a way to either indicate the cropping, or add
      support for a horizontal scrollbar as an indicator of when `MixPropertiesChart` overflows.
- [ ] Use new [pnpm/action-setup](https://github.com/pnpm/action-setup) `cache: true` option once
      it's released. See: <https://github.com/pnpm/action-setup/issues/201>
- [ ] There are various calls to `comp_key_as_med_str` and `prop_key_as_med_str` that are also
      JS <-> WASM. These might also benefit from doing a single WASM -> JS call to get a map, then
      subsequent lookups during component render are done within the JS side.
- [ ] Investigate possible performance impact of `composition.get` and `mix_properties.get` calls
      in `IngredientCompositionGrid` and `MixPropertiesGrid`; there may be a lot of them, which
      could be slow given that they are JS <-> WASM calls. Perhaps doing a single call to get a full
      map once and then doing `.get` calls on the JS side may be more performant.
- [ ] Properly solve the `sslmode=no-verify` issue with `POSTGRES_URL`, see `db/util/getDatabaseUrl`
- [ ] Investigate web workers and Progressive Web Apps (PWA) and their applicability to this app.
- [ ] Add support for ingredient inventory and cost functionality; maybe affects balancing?
- [ ] Consider whether to add support to `IngredientCompositionGrid` to show deltas between recipes.
- [ ] Investigate methods for performance analysis, including Chrome DevTools Protocol (CDP),
      playwright-performance, etc. Look into generating flamegraphs.
- [ ] Add and/or verify support for C/C++ interoperability with FFI; look into `cxx` crate.
- [ ] Look into `SharedArrayBuffer` to improve JS <-> WASM interoperability performance.

# Completed

- [x] Add a navbar item with general ice cream science knowledge, likely referencing `sci-cream`.
- [x] Add a navbar item for a blog-style thing where I can include information from personal
      experience, which would not be appropriate for `sci-cream`. Look into using markdown.
- [x] Document all items in `app`, look for a `missing_docs` equivalent lint.
- [x] In Dark mode, there is a quick flash of white when opening select dropdowns.
- [x] When in Dark mode, if the page is refreshed, it momentarily flashes a Light theme before the
      Dark theme is applied. This can be solved with a blocking script in `layout.tsx` manually
      reading the theme from storage and applying it, but I would rather not do that, looks messy.
      There is also a flash of white when going to the sign-in page when in Dark mode.
- [x] Once user-defined ingredients are supported, use embedded data for the main ingredients set.
- [x] Once embedded data is used for the main ingredient set, re-work `data.ts` to only support
      requesting user-defined ingredients for a user, and implement unit tests for this.
- [x] Add Account and login functionality.
- [x] When expanding the navbar there is a quick flicker of the items; not there when collapsing.
- [x] On a 1440p screen there is vertical scrolling when chrome is showing a bookmarks bar.
- [x] Add tests for all components and utilities in `packages/app`.
- [x] Look into a utility for doing app releases, possibly a simple script to replicate `cargo-rel`.
- [x] Exclude `__tests__` from code coverage reports.
- [x] Add `CHANGELOG.md` for first release, with '# Added' items of all current features.
- [x] Once `0.0.1` is released, look into hosting the app live.
- [x] Integrate Vercel Web Analytics `@vercel/analytics` and Speed Insights `@vercel/speed-insights`
- [x] Use error bars in `MixPropertiesChart` to show typical valid ranges for some properties.
- [x] Add snapshot tests to visually verify that there are no layout changes across viewports.
- [x] The color gradient in `FpdGraph` is only working with `dev:webpack`, not turbopack or build.
- [x] Semver permitted upgrades of `react-grid-layout` (`2.1.0 -> 2.2.2`) and `react-resizable`
      (`3.0.5 -> 3.1.0`) are producing an error (below). For now, remove the caret `^` in
      package.json to force the specific known working versions, but need further investigation.
      `Error occurred prerendering page "/" ... TypeError: b.props.children is not iterable`
- [x] In `IngredientCompositionGrid` make it so that, if there is a horizontal scroll, the left-most
      column (ingredient names and quantities) does not scroll with the rest of the content.
- [x] In `RecipeContext.ingredientCache` we cache `IngredientTransfer` and convert to `Ingredient`
      every time via `into_ingredient_from_spec_js`, instead of caching the `Ingredient` itself.
      This is trivial to change, but I'm purposely leaving it like this until some benchmarking
      capabilities are implemented, since this change is a good candidate to study the effect it has
      on performance.
- [x] Once supported, benchmark the performance impact of pre-fetching all ingredient specs on
      mount, compared to individually fetching specs when requested.
- [x] Add left columns to `IngredientCompositionGrid` to show the ingredient names and quantities,
      so that it can be positioned anywhere and does not have to be besides `RecipeGrid`.
- [x] Add support for for `IngredientCompositionGrid` to show the compositions of reference recipes.
- [x] Save recipes in local storage so that they are not lost when the page is refreshed.
- [x] Looking to making reusable GitHub Workflows for common setup to simplify the CI workflows.
- [x] Figure out how to re-design `Recipe` and `RecipeContext` to avoid having to copy WASM objects
      every time we need to compute the properties of a recipe. This should probably be done after
      benchmark support is available, so that performance impact can guide the design.
- [x] When making changes to either the main recipe or reference recipes, the FPD graph for the
      reference recipes jumps around. Only the reference ones, the main one only moves as modified.
- [x] When making a lot of fast changes to a recipe, e.g. by repeatedly clicking the quantity arrow
      very quickly, the UI can become a bit unresponsive for a few seconds. This much easier to
      reproduce if a log is added to `updateRecipe` in `recipe.tsx`.
- [x] Investigate the stability issues when making many rapid ingredient quantity updates.
- [x] The horizontal scroll bar detection in `MixPropertiesGrid` does not always get refreshed with
      all interactions that can affect it, e.g. when resizing the react-grid-layout component.
- [x] Add `draggableHandle` to all the react-grid-layout components so that they only activate a
      drag when intended, otherwise every action activates a drag, which can cause annoying
      accidental drags, and also has problems with the red background showing all the time.
- [x] Use icons instead of text for the Copy/Paste/... buttons, to save space and make it prettier.
