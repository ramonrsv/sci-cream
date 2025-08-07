import { expect, test } from "vitest";

import {
  Dairy,
  Sweetener,
  Alcohol,
  Chocolate,
  Nut,
  Fruit,
  Egg,
  Stabilizer,
  Miscellaneous,
} from "./sci-cream";

import dairy from "../../../data/ingredients/dairy.json";
import sweeteners from "../../../data/ingredients/sweeteners.json";
import alcohol from "../../../data/ingredients/alcohol.json";
import chocolates from "../../../data/ingredients/chocolates.json";
import nuts from "../../../data/ingredients/nuts.json";
import fruits from "../../../data/ingredients/fruits.json";
import eggs from "../../../data/ingredients/eggs.json";
import stabilizers from "../../../data/ingredients/stabilizers.json";
import miscellaneous from "../../../data/ingredients/miscellaneous.json";

function testConstructAllIngredientsExpectNoThrow<T>(
  IngClass: any,
  ingredients: T[]
) {
  test(`Construct all ${IngClass.name} database seed ingredients`, () => {
    for (const ing of ingredients) {
      expect(() => new IngClass(ing)).not.toThrow();
    }
  });
}

testConstructAllIngredientsExpectNoThrow(Dairy, dairy);
testConstructAllIngredientsExpectNoThrow(Sweetener, sweeteners);
testConstructAllIngredientsExpectNoThrow(Alcohol, alcohol);
testConstructAllIngredientsExpectNoThrow(Chocolate, chocolates);
testConstructAllIngredientsExpectNoThrow(Nut, nuts);
testConstructAllIngredientsExpectNoThrow(Fruit, fruits);
testConstructAllIngredientsExpectNoThrow(Egg, eggs);
testConstructAllIngredientsExpectNoThrow(Stabilizer, stabilizers);
//testConstructAllIngredientsExpectNoThrow(Miscellaneous, miscellaneous);
