import Benchmark from "benchmark";

import {
  allSpecEntries,
  specEntryName,
  new_ingredient_database_seeded_from_specs,
  Bridge,
} from "../../dist/index";

const LAST_IDX = allSpecEntries.length - 1;

const validIngNamesList = allSpecEntries.map((spec) => specEntryName(spec));
const validIngNamesSet = new Set<string>(allSpecEntries.map((spec) => specEntryName(spec)));
const bridge = new Bridge(new_ingredient_database_seeded_from_specs(allSpecEntries));

const suite = new Benchmark.Suite("Check if ingredient exists by name");

suite
  .add("validIngNamesList.includes, first", () => {
    validIngNamesList.includes(specEntryName(allSpecEntries[0]));
  })
  .add("validIngNamesList.includes, last", () => {
    validIngNamesList.includes(specEntryName(allSpecEntries[LAST_IDX]));
  })
  .add("validIngNamesSet.has, first", () => {
    validIngNamesSet.has(specEntryName(allSpecEntries[0]));
  })
  .add("validIngNamesSet.has, last", () => {
    validIngNamesSet.has(specEntryName(allSpecEntries[LAST_IDX]));
  })
  .add("Bridge.has_ingredient, first", () => {
    bridge.has_ingredient(specEntryName(allSpecEntries[0]));
  })
  .add("Bridge.has_ingredient, last", () => {
    bridge.has_ingredient(specEntryName(allSpecEntries[LAST_IDX]));
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
