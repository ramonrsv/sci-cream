import Benchmark from "benchmark";

import { IngredientJson, into_ingredient_from_spec, RecipeLine, Recipe } from "../../dist/index.js";
import { findIngredientSpecByName } from "./util.js";

const specLines = [
  { name: "Whole Milk", quantity: 245 },
  { name: "Whipping Cream", quantity: 215 },
  { name: "Cocoa Powder, 17% Fat", quantity: 28 },
  { name: "Skimmed Milk Powder", quantity: 21 },
  { name: "Egg Yolk", quantity: 18 },
  { name: "Dextrose", quantity: 45 },
  { name: "Fructose", quantity: 32 },
  { name: "Salt", quantity: 0.5 },
  { name: "Rich Ice Cream SB", quantity: 1.25 },
  { name: "Vanilla Extract", quantity: 6 },
].map(({ name, quantity }) => ({ spec: findIngredientSpecByName(name), quantity }));

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
  .add("makeRecipeLines", () => {
    makeRecipeLines(specLines).forEach((line) => line.free());
  })
  .add("cloneRecipeLines", () => {
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

const makeVsCloneSuite = new Benchmark.Suite("Make vs Clone Recipe WASM Bridge");

makeVsCloneSuite
  .add("makeRecipeLines", () => {
    makeRecipeLines(specLines).forEach((line) => line.free());
  })
  .add("cloneRecipeLines", () => {
    cloneRecipeLines(recipeLines).forEach((line) => line.free());
  })
  .add("makeRecipeFromMadeLines", () => {
    makeRecipeFromMadeLines(specLines).free();
  })
  .add("makeRecipeFromClonedLines", () => {
    makeRecipeFromClonedLines(recipeLines).free();
  })
  .add("makeRecipeFromMadeLines.calculate_composition", () => {
    let recipe = makeRecipeFromMadeLines(specLines);
    recipe.calculate_composition().free();
    recipe.free();
  })
  .add("makeRecipeFromClonedLines.calculate_composition", () => {
    let recipe = makeRecipeFromClonedLines(recipeLines);
    recipe.calculate_composition().free();
    recipe.free();
  })
  .add("recipe.calculate_composition", () => {
    recipe.calculate_composition().free();
  })
  .add("makeRecipeFromMadeLines.calculate_mix_properties", () => {
    let recipe = makeRecipeFromMadeLines(specLines);
    recipe.calculate_mix_properties().free();
    recipe.free();
  })
  .add("makeRecipeFromClonedLines.calculate_mix_properties", () => {
    let recipe = makeRecipeFromClonedLines(recipeLines);
    recipe.calculate_mix_properties().free();
    recipe.free();
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
