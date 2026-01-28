import Benchmark from "benchmark";

import {
  getIngredientSpecByName,
  new_ingredient_database_seeded_from_specs,
  Bridge,
} from "../../dist/index.js";

import {
  LIGHT_RECIPE,
  makeRecipeLines,
  cloneRecipeLines,
  makeRecipeFromMadeLines,
  makeRecipeFromClonedLines,
} from "./util.ts";

const specLines = LIGHT_RECIPE.map(([name, quantity]) => ({
  spec: getIngredientSpecByName(name as string)!,
  quantity: quantity as number,
}));

const recipeLines = makeRecipeLines(specLines);
const recipe = makeRecipeFromMadeLines(specLines);
const bridge = new Bridge(
  new_ingredient_database_seeded_from_specs(specLines.map((line) => line.spec)),
);

// These benchmark suite shows that creating new RecipeLine instances from scratch is generally
// faster (up to ~10x) than cloning existing ones, likely due to the overhead of more JS <-> WASM
// crossings in the cloning process. Furthermore, using an existing Recipe instance is significantly
// faster (up to ~10x) than creating a new one from RecipeLines, as expected.

// The new Bridge calls are generally much closer in performance to using an existing Recipe,
// with about ~2x overhead, which is quite reasonable given the flexibility this provides.

const suite = new Benchmark.Suite(
  "Recipe WASM Bridge: make/clone RecipeLines, Recipe, and Bridge calls",
);

suite
  .add("cloneRecipeLines", () => {
    cloneRecipeLines(recipeLines).forEach((line) => line.free());
  })
  .add("makeRecipeLines", () => {
    makeRecipeLines(specLines).forEach((line) => line.free());
  })
  .add("makeRecipeFromClonedLines", () => {
    makeRecipeFromClonedLines(recipeLines).free();
  })
  .add("makeRecipeFromMadeLines", () => {
    makeRecipeFromMadeLines(specLines).free();
  })
  .add("makeRecipeFromClonedLines.calculate_composition", () => {
    let recipe = makeRecipeFromClonedLines(recipeLines);
    recipe.calculate_composition().free();
    recipe.free();
  })
  .add("makeRecipeFromMadeLines.calculate_composition", () => {
    let recipe = makeRecipeFromMadeLines(specLines);
    recipe.calculate_composition().free();
    recipe.free();
  })
  .add("bridge.calculate_recipe_composition", () => {
    bridge.calculate_recipe_composition(LIGHT_RECIPE).free();
  })
  .add("recipe.calculate_composition", () => {
    recipe.calculate_composition().free();
  })
  .add("makeRecipeFromClonedLines.calculate_mix_properties", () => {
    let recipe = makeRecipeFromClonedLines(recipeLines);
    recipe.calculate_mix_properties().free();
    recipe.free();
  })
  .add("makeRecipeFromMadeLines.calculate_mix_properties", () => {
    let recipe = makeRecipeFromMadeLines(specLines);
    recipe.calculate_mix_properties().free();
    recipe.free();
  })
  .add("bridge.calculate_recipe_mix_properties", () => {
    bridge.calculate_recipe_mix_properties(LIGHT_RECIPE).free();
  })
  .add("recipe.calculate_mix_properties", () => {
    recipe.calculate_mix_properties().free();
  })
  .on("cycle", (event: Benchmark.Event) => {
    console.log(String(event.target));
  })
  .on("complete", function (this: Benchmark.Suite) {
    console.log(`Fastest is '${this.filter("fastest").map("name")}'`);
  });

export default new Promise<void>((resolve) => {
  suite.on("complete", () => resolve());
  suite.run({ async: false });
});
