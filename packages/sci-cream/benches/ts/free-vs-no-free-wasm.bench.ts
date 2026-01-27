import Benchmark from "benchmark";

import { getIngredientSpecByName } from "../../dist/index.js";

import { LIGHT_RECIPE, makeRecipeLines, cloneRecipeLines } from "./util.js";

const specLines = LIGHT_RECIPE.map(([name, quantity]) => ({
  spec: getIngredientSpecByName(name as string)!,
  quantity: quantity as number,
}));

const recipeLines = makeRecipeLines(specLines);

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

export default new Promise<void>((resolve) => {
  freeVsNoFree.on("complete", () => resolve());
  freeVsNoFree.run({ async: false });
});
