import Benchmark from "benchmark";

import {
  composition_value_as_quantity,
  composition_value_as_percentage,
  compositionValueAsQuantity,
  compositionValueAsPercentage,
  CompKey,
  getWasmEnums,
} from "../../dist/index";

const suite = new Benchmark.Suite("Composition Value as Quantity and Percentage");

suite
  .add("composition_value_as_quantity", () => {
    getWasmEnums(CompKey).forEach(() => composition_value_as_quantity(50, 200));
  })
  .add("compositionValueAsQuantity", () => {
    getWasmEnums(CompKey).forEach(() => compositionValueAsQuantity(50, 200));
  })
  .add("composition_value_as_percentage", () => {
    getWasmEnums(CompKey).forEach(() => composition_value_as_percentage(50, 200, 500));
  })
  .add("compositionValueAsPercentage", () => {
    getWasmEnums(CompKey).forEach(() => compositionValueAsPercentage(50, 200, 500));
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
