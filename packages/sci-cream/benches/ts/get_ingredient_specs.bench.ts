import Benchmark from "benchmark";

import {
  allSpecEntries,
  getSpecEntryByName,
  get_spec_entry_by_name,
  specEntryName,
} from "../../dist/index";

const LAST_IDX = allSpecEntries.length - 1;

const suite = new Benchmark.Suite("Get Ingredient Specs");

suite
  .add("allIngredientSpecs.find, first", () => {
    allSpecEntries.find((spec) => specEntryName(spec) === specEntryName(allSpecEntries[0]));
  })
  .add("allIngredientSpecs.find, last", () => {
    allSpecEntries.find((spec) => specEntryName(spec) === specEntryName(allSpecEntries[LAST_IDX]));
  })
  .add("getIngredientSpecByName, first", () => {
    getSpecEntryByName(specEntryName(allSpecEntries[0]));
  })
  .add("getIngredientSpecByName, last", () => {
    getSpecEntryByName(specEntryName(allSpecEntries[LAST_IDX]));
  })
  .add("get_ingredient_spec_by_name, first", () => {
    get_spec_entry_by_name(specEntryName(allSpecEntries[0]));
  })
  .add("get_ingredient_spec_by_name, last", () => {
    get_spec_entry_by_name(specEntryName(allSpecEntries[LAST_IDX]));
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
