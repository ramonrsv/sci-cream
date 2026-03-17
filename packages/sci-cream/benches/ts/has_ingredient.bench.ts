import Benchmark from "benchmark";

import {
  allIngredientSpecs,
  new_ingredient_database_seeded_from_specs,
  Bridge,
} from "../../dist/index";

const LAST_IDX = allIngredientSpecs.length - 1;

const validIngNamesList = allIngredientSpecs.map((spec) => spec.name);
const validIngNamesSet = new Set<string>(allIngredientSpecs.map((spec) => spec.name));
const bridge = new Bridge(new_ingredient_database_seeded_from_specs(allIngredientSpecs));

const suite = new Benchmark.Suite("Check if ingredient exists by name");

suite
  .add("validIngNamesList.includes, first", () => {
    validIngNamesList.includes(allIngredientSpecs[0].name);
  })
  .add("validIngNamesList.includes, last", () => {
    validIngNamesList.includes(allIngredientSpecs[LAST_IDX].name);
  })
  .add("validIngNamesSet.has, first", () => {
    validIngNamesSet.has(allIngredientSpecs[0].name);
  })
  .add("validIngNamesSet.has, last", () => {
    validIngNamesSet.has(allIngredientSpecs[LAST_IDX].name);
  })
  .add("Bridge.has_ingredient, first", () => {
    bridge.has_ingredient(allIngredientSpecs[0].name);
  })
  .add("Bridge.has_ingredient, last", () => {
    bridge.has_ingredient(allIngredientSpecs[LAST_IDX].name);
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
