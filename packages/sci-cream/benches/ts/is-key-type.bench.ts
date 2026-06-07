import Benchmark from "benchmark";

import { getPropKeys, isCompKey, isFpdKey, isRatioKey } from "../../dist/index";

const allPropKeys = getPropKeys();
const compKeys = allPropKeys.filter((k) => isCompKey(k));
const ratioKeys = allPropKeys.filter((k) => isRatioKey(k));
const fpdKeys = allPropKeys.filter((k) => isFpdKey(k));

const suite = new Benchmark.Suite("isCompKey / isRatioKey / isFpdKey");

suite
  .add("isCompKey (all PropKeys)", () => {
    allPropKeys.forEach((key) => isCompKey(key));
  })
  .add("isRatioKey (all PropKeys)", () => {
    allPropKeys.forEach((key) => isRatioKey(key));
  })
  .add("isFpdKey (all PropKeys)", () => {
    allPropKeys.forEach((key) => isFpdKey(key));
  })
  .add("isCompKey (CompKey-only inputs)", () => {
    compKeys.forEach((key) => isCompKey(key));
  })
  .add("isRatioKey (RatioKey-only inputs)", () => {
    ratioKeys.forEach((key) => isRatioKey(key));
  })
  .add("isFpdKey (FpdKey-only inputs)", () => {
    fpdKeys.forEach((key) => isFpdKey(key));
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
