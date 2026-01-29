import Benchmark from "benchmark";

import {
  CompKey,
  Composition,
  getPropKeys,
  MixProperties,
  getMixProperty,
  getWasmEnums,
  makeCompValueMap,
  makeMixPropValueMap,
} from "../../dist/index";

const composition = new Composition();
const compValueMap = makeCompValueMap(composition);

const mixProperties = new MixProperties();
const mixPropValueMap = makeMixPropValueMap(mixProperties);

const suite = new Benchmark.Suite("Composition and MixProperties Key Accesses");

suite
  .add("composition.get", () => {
    getWasmEnums(CompKey).forEach((key) => composition.get(key));
  })
  .add("compValueMap.get", () => {
    getWasmEnums(CompKey).forEach((key) => compValueMap.get(key));
  })
  .add("getMixProperty", () => {
    getPropKeys().forEach((key) => getMixProperty(mixProperties, key));
  })
  .add("mixPropValueMap.get", () => {
    getPropKeys().forEach((key) => mixPropValueMap.get(key));
  })
  .add("makeCompValueMap", () => {
    makeCompValueMap(composition);
  })
  .add("makeMixPropValueMap", () => {
    makeMixPropValueMap(mixProperties);
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
