import Benchmark from "benchmark";

import {
  allIngredients,
  getIngredientSpecByName,
  get_ingredient_spec_by_name,
} from "../../dist/index";

const suite = new Benchmark.Suite("Ingredient Operations");

suite
  .add("allIngredients.find, first", () => {
    allIngredients.find((ing) => ing.name === allIngredients[0].name);
  })
  .add("allIngredients.find, last", () => {
    allIngredients.find((ing) => ing.name === allIngredients[allIngredients.length - 1].name);
  })
  .add("getIngredientSpecByName, first", () => {
    getIngredientSpecByName(allIngredients[0].name);
  })
  .add("getIngredientSpecByName, last", () => {
    getIngredientSpecByName(allIngredients[allIngredients.length - 1].name);
  })
  .add("get_ingredient_spec_by_name, first", () => {
    get_ingredient_spec_by_name(allIngredients[0].name);
  })
  .add("get_ingredient_spec_by_name, last", () => {
    get_ingredient_spec_by_name(allIngredients[allIngredients.length - 1].name);
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
