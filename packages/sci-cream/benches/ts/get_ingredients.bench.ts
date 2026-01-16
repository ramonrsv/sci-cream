import Benchmark from "benchmark";

import {
  allIngredientSpecs,
  getIngredientSpecByName,
  get_ingredient_spec_by_name,
  into_ingredient_from_spec,
  make_seeded_ingredient_database_from_specs,
} from "../../dist/index";

const db = make_seeded_ingredient_database_from_specs(allIngredientSpecs);

const suite = new Benchmark.Suite("Ingredient Operations");

suite
  .add("into_ingredient_from_spec(allIngredientSpecs.find, first)", () => {
    into_ingredient_from_spec(
      allIngredientSpecs.find((ing) => ing.name === allIngredientSpecs[0].name)!,
    ).free();
  })
  .add("into_ingredient_from_spec(allIngredientSpecs.find, last)", () => {
    into_ingredient_from_spec(
      allIngredientSpecs.find(
        (ing) => ing.name === allIngredientSpecs[allIngredientSpecs.length - 1].name,
      )!,
    ).free();
  })
  .add("into_ingredient_from_spec(getIngredientSpecByName, first)", () => {
    into_ingredient_from_spec(getIngredientSpecByName(allIngredientSpecs[0].name)!).free();
  })
  .add("into_ingredient_from_spec(getIngredientSpecByName, last)", () => {
    into_ingredient_from_spec(
      getIngredientSpecByName(allIngredientSpecs[allIngredientSpecs.length - 1].name)!,
    ).free();
  })
  .add("into_ingredient_from_spec(get_ingredient_spec_by_name, first)", () => {
    into_ingredient_from_spec(get_ingredient_spec_by_name(allIngredientSpecs[0].name)!).free();
  })
  .add("into_ingredient_from_spec(get_ingredient_spec_by_name, last)", () => {
    into_ingredient_from_spec(
      get_ingredient_spec_by_name(allIngredientSpecs[allIngredientSpecs.length - 1].name)!,
    ).free();
  })
  .add("IngredientDatabase.get_ingredient_by_name, first", () => {
    db.get_ingredient_by_name(allIngredientSpecs[0].name).free();
  })
  .add("IngredientDatabase.get_ingredient_by_name, last", () => {
    db.get_ingredient_by_name(allIngredientSpecs[allIngredientSpecs.length - 1].name).free();
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
