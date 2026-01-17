import Benchmark from "benchmark";

import {
  allIngredientSpecs,
  getIngredientSpecByName,
  get_ingredient_spec_by_name,
} from "../../dist/index";

const LAST_IDX = allIngredientSpecs.length - 1;

const suite = new Benchmark.Suite("Get Ingredient Specs");

suite
  .add("allIngredientSpecs.find, first", () => {
    allIngredientSpecs.find((ing) => ing.name === allIngredientSpecs[0].name);
  })
  .add("allIngredientSpecs.find, last", () => {
    allIngredientSpecs.find((ing) => ing.name === allIngredientSpecs[LAST_IDX].name);
  })
  .add("getIngredientSpecByName, first", () => {
    getIngredientSpecByName(allIngredientSpecs[0].name);
  })
  .add("getIngredientSpecByName, last", () => {
    getIngredientSpecByName(allIngredientSpecs[LAST_IDX].name);
  })
  .add("get_ingredient_spec_by_name, first", () => {
    get_ingredient_spec_by_name(allIngredientSpecs[0].name);
  })
  .add("get_ingredient_spec_by_name, last", () => {
    get_ingredient_spec_by_name(allIngredientSpecs[LAST_IDX].name);
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
