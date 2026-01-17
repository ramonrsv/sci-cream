import Benchmark from "benchmark";

import {
  allIngredientSpecs,
  getIngredientSpecByName,
  get_ingredient_spec_by_name,
  into_ingredient_from_spec,
  make_seeded_ingredient_database_from_specs,
} from "../../dist/index";

const LAST_IDX = allIngredientSpecs.length - 1;

const map = new Map<string, (typeof allIngredientSpecs)[0]>(
  allIngredientSpecs.map((spec) => [spec.name, spec]),
);

const db = make_seeded_ingredient_database_from_specs(allIngredientSpecs);

const suite = new Benchmark.Suite("Get Ingredient Instances");

suite
  .add("into_ingredient_from_spec(getIngredientSpecByName, first)", () => {
    into_ingredient_from_spec(getIngredientSpecByName(allIngredientSpecs[0].name)!).free();
  })
  .add("into_ingredient_from_spec(getIngredientSpecByName, last)", () => {
    into_ingredient_from_spec(getIngredientSpecByName(allIngredientSpecs[LAST_IDX].name)!).free();
  })
  .add("into_ingredient_from_spec(get_ingredient_spec_by_name, first)", () => {
    into_ingredient_from_spec(get_ingredient_spec_by_name(allIngredientSpecs[0].name)!).free();
  })
  .add("into_ingredient_from_spec(get_ingredient_spec_by_name, last)", () => {
    into_ingredient_from_spec(
      get_ingredient_spec_by_name(allIngredientSpecs[LAST_IDX].name)!,
    ).free();
  })
  .add("into_ingredient_from_spec(map lookup, first)", () => {
    into_ingredient_from_spec(map.get(allIngredientSpecs[0].name)!).free();
  })
  .add("into_ingredient_from_spec(map lookup, last)", () => {
    into_ingredient_from_spec(map.get(allIngredientSpecs[LAST_IDX].name)!).free();
  })
  .add("IngredientDatabase.get_ingredient_by_name, first", () => {
    db.get_ingredient_by_name(allIngredientSpecs[0].name).free();
  })
  .add("IngredientDatabase.get_ingredient_by_name, last", () => {
    db.get_ingredient_by_name(allIngredientSpecs[LAST_IDX].name).free();
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
