<!-- markdownlint-disable MD041 -->

## Next Release

- [ ] Add support for `MixPropertiesGrid` to show deltas between the main recipe and the references.
- [ ] Add `height` prop to `MixPropertiesGrid` so that it can adapt the number of properties shown.
- [ ] Add support for comments in blog posts, maybe also in documentation posts.
- [ ] Add a 'User Guide' navbar item to contain documentation about how to use the app.
- [ ] Add a home page with a quick intro and overview, pointing to user guide, docs, etc.
- [ ] Figure out how to show `sci-cream`'s beginner-friendly overview to new users of the app.
- [ ] Fix issue where version lists in `RecipeSearch` do not visually update when one is deleted.
- [ ] Add visual tests for the save-recipe and save-as-new-version interfaces, inc. color changes.
- [ ] In `/ingredients`, the composition table does not have a bottom border; shows when scroll.
- [ ] There is a weird horizontal line in `/ingredient-search-detail-panel-visual-linux.png`
- [ ] Fix typo in welcome blog post, "you will **find** areas where it goes well beyond...".
- [ ] Look into single `props` argument or spread out arguments for Next.js components.
- [ ] When a recipe is deleted, the UI does not update, it still showed the deleted recipe.
- [ ] Add end-to-end tests for balancing functionality; check surfacing of balancing errors?
- [ ] Recipe validation errors/warnings do not show unless a recipe has some non-zero qty value.
- [ ] `FpdKey`s don't support balancing, so they should not have a target, but should be watchable.

## Up Next

- [ ] Review the sign-in classes in `globals.css`, used in `/signin/page.tsx` and `/signup/page.tsx`
- [ ] Add make-recipe link, to click off ingredients that have been measured out for one or more
      recipes. Each recipe should be letter and color coded.
- [ ] Add scoopability and FPD properties component with visuals.
- [ ] Add Nutrition Facts Table component.
- [ ] In `MixPropertiesGrid`, make it so that, if there is a horizontal scroll, the left-most column
      (property headers) does not scroll with the rest of the content.
- [ ] There are some `react-grid-layout` layout shifts on page refresh; it's worse on mobile.
- [ ] Add tests to verify `/recipes` & `/ingredients`' handling of slow fetches of user content.
- [ ] Consider adding e2e benches for `/recipes` & `/ingredients`, inc. web vitals, first-load, etc.
- [ ] Add richer syntax highlighting of JSON ingredient specs in `/ingredients` details panel.
- [ ] Add automatic links to specs, docs, etc. in `/ingredients`, based on the loaded spec.
- [ ] Add support for showing recipe diffs between versions of a recipe in `/recipes`.
- [ ] Add some visual feedback for when a recipe matches targets within a given precision.
- [ ] On mobile, change ingredients comp table height to fit, with max, and move comments below it.
- [ ] Double check the calculator mobile layouts, `FpdGraphPanel` looks too tall on Pixel 8 Pro.
- [ ] Add support for `RecipeEditor` to display fewer lines than the internal fixed number of lines,
      and to dynamically adjust the number based on the panel size, only showing a scrollbar if the
      any filled lines would be hidden. This may cause issues with `CompositionBreakdown`, which
      currently relies on a fixed number of rows, and won't be easy to make vertically scrollable.
- [ ] Look into how layouts make tables too narrow or too wide, and consider setting maximum table
      widths so that they don't look too wide on some layouts; may look bad in narrow scrollable?
- [ ] The delete recipe version button moves around with the version name length, which is jarring.
- [ ] Add visual regression tests for dark mode; not everything, just routes & some key elements.
- [ ] Add support for automatically flipping direction of `PropertiesChart` based on layout.
- [ ] Add support for row highlighting on hover to all table components, e.g. `PropertiesTable`.
- [ ] `WatcherCard` needs to display a color based on position with an acceptable property range,
      and based on proximity to the balancing target. Figure out how to handle overlapping concerns.
- [ ] Add support for displaying balancing targets in `PropertiesBarChart`; move up to context?
- [ ] Add some checkmark-style visual feedback if a balance operation meets target within tolerance.
- [ ] `WatcherCard`, and eventually `PropertiesView`, show deltas between reference and current, and
      to balancing targets. These could be absolute (qty or %), or a relative %; how to handle this?

## Backlog

- [ ] Implement scroll restoration, so that pages return to the last point when navigating back.
- [ ] Look into usability on vertical mobile screens; the shrinking sidebar may not be enough.
- [ ] Make navbar width adjustments more maintainable in `navbar.tsx`. At the moment there are a
      bunch of widths and margins that need to be adjusted, with various runtime conditions.
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
- [ ] Investigate alternatives to custom impl for bundle size benchmarks, e.g. npm `bundlewatch`.
- [ ] Add a "Tools" navbar item with tools like sweeteners lookup, ingredient replacement, etc.
- [ ] Add recipe share functionality. Should be a link that anyone can open, and that can be
      embedded into other websites. How to handle user-defined ingredients?
- [ ] Add functionality for user-defined ingredients. This may be tricky with recipe share links.
- [ ] Add support for sharing of user-defined ingredients, similarly to sharing of recipes.
- [ ] Add a visual warning indicator for user-defined ingredients that shadow built-in ones.
- [ ] Look into setting up and how to do database migrations for the production database.
- [ ] Find a proper fix for the placeholder `POSTGRES_URL` in the `bundle_benchmark` workflow.
- [ ] Refine performance benchmarks; some of them may not be measuring what they claim to measure.
- [ ] Figure out how to do visual regression tests of animations, e.g. navbar expand/collapse.
- [ ] Look for opportunities to optimize bundle size, particularly in `/ingredients` and `/recipes`.
- [ ] Add an app "tour" to show users the main components of the app, where to go for docs, etc.
- [ ] Add feature to show different ranges around serving temp in `FpdGraph`, like a 'zoom'.
- [ ] Explore options for a UI system to communicate errors/notification; popups, text bar?
- [ ] Explore undo/redo system - necessary now that automatic balancing has been enabled.
- [ ] Explore adding support for a total mix amount input/slider and balancing target.
- [ ] Add support for user configurations, e.g. to control units, beta features, dev features, etc.
- [ ] Look into possible optimizations for the many `PropKey` accesses; `getMixProperty` is slow.
- [ ] Investigate why updating pnpm dependencies in 275a906 degraded the performance of `is*Key`.
      275a906: Update /sci-cream & /app pnpm deps to latest

## Completed

- [x] In `/recipes`, there is a fetch for user ingredients every time a recipe is selected.
- [x] When a user is logged in and has user-defined there are "ingredient name not unique" errors.
      This should be handled gracefully, overriding and showing a warning that it shadows built-in.
- [x] Add support for every instance of `KeySelect` to independently store custom keys in local.
- [x] `/calculator` layout persistence reset when navigating from `/recipes`; not when reloading.
- [x] Add visual regression tests for the priority toggle in watchers cards, in all priority states.
- [x] Add a visual regression test for the custom filter settings button and checkbox menu.
- [x] Remove the '"comments": "..."' placeholder in `/ingredients`, just remove the field.
- [x] Closing a `WatcherCard` when on `Auto` doesn't do anything; this needs a fix.
- [x] Add a button to set all currently selected watcher targets from a reference recipe.
- [x] Add a `Balance` button to `WatchersPanel`, with some indicator that is a beta feature.
- [x] Add `Watchers` component where users can select what properties to watch. It should probably
      support displaying deltas between the main and reference recipes, and target min-max ranges.
- [x] Fix the `WatcherCard` diff calculation, it should be main's delta compared to references.
- [x] When a ref property is zero, `WatcherCard` shows A/B with nothing next to it, needs fix.
- [x] Add support for recipe versions, with appropriate UI support and grouping in `RecipeSearch`.
- [x] Add functionality to store component layout so that it is remembered across page reloads. The
      store should start seeded with a default for each resolution, and store any user modification.
- [x] Check how vertical spacing looks like on 1080p/2160p screens; look into dynamic vertical?
- [x] Add recipe save functionality, with support for editable comments/notes.
- [x] Pasting the strawberry sorbet recipe, fixing 'Strawberry [Brix 9]' to remove ' [Brix 9]', then
      pasting a different recipe causes a 'null pointer passed to rust' error; still unclear why.
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
