import Benchmark from "benchmark";

import {
  CompKey,
  comp_key_as_med_str,
  compKeyAsMedStr,
  getPropKeys,
  prop_key_as_med_str,
  propKeyAsMedStr,
  getWasmEnums,
} from "@workspace/sci-cream";

const suite = new Benchmark.Suite("CompKey and PropKey to String");

suite
  .add("comp_key_as_med_str", () => {
    getWasmEnums(CompKey).forEach((key) => comp_key_as_med_str(key));
  })
  .add("compKeyAsMedStr", () => {
    getWasmEnums(CompKey).forEach((key) => compKeyAsMedStr(key));
  })
  .add("prop_key_as_med_str", () => {
    getPropKeys().forEach((key) => prop_key_as_med_str(key));
  })
  .add("propKeyAsMedStr", () => {
    getPropKeys().forEach((key) => propKeyAsMedStr(key));
  })
  .on("cycle", (event: Benchmark.Event) => {
    console.log(String(event.target));
  })
  .on("complete", function (this: Benchmark.Suite) {
    console.log(`Fastest is '${this.filter("fastest").map("name")}'`);
  });

// @todo Investigate why this is necessary here, but not in sci-cream
// eslint-disable-next-line import/no-anonymous-default-export
export default new Promise<void>((resolve) => {
  suite.on("complete", () => resolve());
  suite.run({ async: false });
});
