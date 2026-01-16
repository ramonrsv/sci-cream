import Benchmark from "benchmark";

import {
  IngredientJson,
  getIngredientSpecByName,
  into_ingredient_from_spec,
  RecipeLine,
  Recipe,
  make_seeded_ingredient_database_from_specs,
  Bridge,
} from "../../dist/index.js";

const lightRecipe = [
  ["Whole Milk", 245],
  ["Whipping Cream", 215],
  ["Cocoa Powder, 17% Fat", 28],
  ["Skimmed Milk Powder", 21],
  ["Egg Yolk", 18],
  ["Dextrose", 45],
  ["Fructose", 32],
  ["Salt", 0.5],
  ["Rich Ice Cream SB", 1.25],
  ["Vanilla Extract", 6],
];

const specLines = lightRecipe.map(([name, quantity]) => ({
  spec: getIngredientSpecByName(name as string)!,
  quantity: quantity as number,
}));

type SpecLine = { spec: IngredientJson; quantity: number };

function makeRecipeLines(specLines: SpecLine[]): RecipeLine[] {
  return specLines.map(
    (specLine) => new RecipeLine(into_ingredient_from_spec(specLine.spec), specLine.quantity),
  );
}

function cloneRecipeLines(recipeLines: RecipeLine[]): RecipeLine[] {
  return recipeLines.map(
    (recipeLine) => new RecipeLine(recipeLine.ingredient.clone(), recipeLine.amount),
  );
}

function makeRecipeFromMadeLines(specLines: SpecLine[]): Recipe {
  return new Recipe("Chocolate Ice Cream", makeRecipeLines(specLines));
}

function makeRecipeFromClonedLines(recipeLines: RecipeLine[]): Recipe {
  return new Recipe("Chocolate Ice Cream", cloneRecipeLines(recipeLines));
}

const recipeLines = makeRecipeLines(specLines);
const recipe = makeRecipeFromMadeLines(specLines);
const bridge = new Bridge(
  make_seeded_ingredient_database_from_specs(specLines.map((line) => line.spec)),
);

// Benchmark suite to investigate the relative performance of different ways of creating Recipe and
// RecipeLine instances to bridge between TS and WASM, as well as the performance of calling
// the WASM methods on Recipe. This reflects the possible ways the API could be used in practice.

// A _VERY IMPORTANT_ finding from these benchmarks is that creating many WASM objects without
// freeing them can lead to significant performance degradation, hypothesized to be due to
// accumulation in WASM's linear memory. As such, it's very important for users of this library
// to carefully manage the usage patterns to minimize object creation, or to ensure timely freeing.
// @todo This is a significant usability concern that should be addressed in the library design.

const freeVsNoFree = new Benchmark.Suite("Free vs No-Free Recipe WASM Bridge");

freeVsNoFree
  .add("makeRecipeLines, free", () => {
    makeRecipeLines(specLines).forEach((line) => line.free());
  })
  .add("cloneRecipeLines, free", () => {
    cloneRecipeLines(recipeLines).forEach((line) => line.free());
  })
  .add("makeRecipeLines, no free", () => {
    makeRecipeLines(specLines);
  })
  .add("cloneRecipeLines, no free", () => {
    cloneRecipeLines(recipeLines);
  })
  .on("cycle", (event: Benchmark.Event) => {
    console.log(String(event.target));
  })
  .on("complete", function (this: Benchmark.Suite) {
    console.log(`Fastest is '${this.filter("fastest").map("name")}'`);
  });

// These benchmark suite shows that creating new RecipeLine instances from scratch is generally
// faster (up to ~10x) than cloning existing ones, likely due to the overhead of more JS <-> WASM
// crossings in the cloning process. Furthermore, using an existing Recipe instance is significantly
// faster (up to ~10x) than creating a new one from RecipeLines, as expected.

// The new Bridge calls are generally much closer in performance to using an existing Recipe,
// with about ~2x overhead, which is quite reasonable given the flexibility this provides.

const makeVsCloneSuite = new Benchmark.Suite(
  "Recipe WASM Bridge: make/clone RecipeLines, Recipe, and Bridge calls",
);

makeVsCloneSuite
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
    bridge.calculate_recipe_composition(lightRecipe).free();
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
    bridge.calculate_recipe_mix_properties(lightRecipe).free();
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
  makeVsCloneSuite.on("complete", () => resolve());
  makeVsCloneSuite.run({ async: false });

  // Run the free vs no-free suite after to avoid interference.
  freeVsNoFree.on("complete", () => resolve());
  freeVsNoFree.run({ async: false });
});
