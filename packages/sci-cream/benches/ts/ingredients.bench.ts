import Benchmark from "benchmark";

import { allIngredients } from "../../src/ts/ingredients";

const suite = new Benchmark.Suite("Ingredient Operations");

suite
  .add("Find by name, first", () => {
    allIngredients.find((ingredient) => ingredient.name === allIngredients[0].name);
  })
  .add("Find by name, last", () => {
    allIngredients.find(
      (ingredient) => ingredient.name === allIngredients[allIngredients.length - 1].name,
    );
  })
  .add("Map to names", () => {
    allIngredients.map((ingredient) => ingredient.name);
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
