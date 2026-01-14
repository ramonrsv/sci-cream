import Benchmark from "benchmark";

import { allIngredients } from "../../src/ts/ingredients";
import { into_ingredient_from_spec } from "../../dist/index.js";

function findIngredientByName(name: string) {
  return (
    allIngredients.find((ing) => ing.name === name) ??
    (() => {
      throw new Error(`Ingredient spec not found for name: ${name}`);
    })()
  );
}

const suite = new Benchmark.Suite("into_ingredient_from_spec");

const ingredientSpecs = [
  "Dark Rum",
  "Baileys Irish Cream",
  "70% Dark Chocolate",
  "Cocoa Powder, 10% Fat",
  "Whole Milk",
  "Whey Isolate",
].map((name) => findIngredientByName(name));

const darkRumSpec = findIngredientByName("Dark Rum");
const wheyIsolateSpec = findIngredientByName("Whey Isolate");

suite
  .add("into_ingredient_from_spec, single (Dark Rum)", () => {
    into_ingredient_from_spec(darkRumSpec);
  })
  .add("into_ingredient_from_spec, single (Whey Isolate)", () => {
    into_ingredient_from_spec(wheyIsolateSpec);
  })
  .add("into_ingredient_from_spec, multiple", () => {
    ingredientSpecs.forEach((spec) => into_ingredient_from_spec(spec));
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
