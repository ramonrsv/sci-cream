- In `RecipeContext.ingredientCache` we cache `IngredientTransfer` and convert to `Ingredient` every
  time via `into_ingredient_from_spec_js`, instead of caching the `Ingredient` itself. This is
  trivial to change, but I'm purposely leaving it like this until some benchmarking capabilities are
  implemented, since this change is a good candidate to study the effect it has on performance.
- It's probably much faster to fetch all the ingredient specs at once and cache them. Preliminary
  tests shown it to not be trivial to implement, though - had issues synchronizing fetches when
  pasting a recipe. Once benchmark support is there, try to implement this and see the impact.
