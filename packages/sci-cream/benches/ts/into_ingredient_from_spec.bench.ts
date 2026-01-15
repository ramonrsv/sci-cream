import Benchmark from "benchmark";

import { getIngredientSpecByName, into_ingredient_from_spec } from "../../dist/index";

const suite = new Benchmark.Suite("into_ingredient_from_spec");

const ingredientSpecs = [
  "Dark Rum",
  "Baileys Irish Cream",
  "70% Dark Chocolate",
  "Cocoa Powder, 10% Fat",
  "Whole Milk",
  "Whey Isolate",
].map((name) => getIngredientSpecByName(name));

const darkRumSpec = getIngredientSpecByName("Dark Rum");
const wheyIsolateSpec = getIngredientSpecByName("Whey Isolate");

suite
  .add("into_ingredient_from_spec, single (Dark Rum)", () => {
    into_ingredient_from_spec(darkRumSpec).free();
  })
  .add("into_ingredient_from_spec, single (Whey Isolate)", () => {
    into_ingredient_from_spec(wheyIsolateSpec).free();
  })
  .add("into_ingredient_from_spec, multiple", () => {
    ingredientSpecs.forEach((spec) => into_ingredient_from_spec(spec).free());
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
