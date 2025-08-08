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
} from "../../src/lib/sci-cream/sci-cream";

import dairy from "./dairy.json";
import sweeteners from "./sweeteners.json";
import alcohol from "./alcohol.json";
import chocolates from "./chocolates.json";
import nuts from "./nuts.json";
import fruits from "./fruits.json";
import eggs from "./eggs.json";
import stabilizers from "./stabilizers.json";
import miscellaneous from "./miscellaneous.json";

function testConstructAllIngredientsExpectNoThrow<T>(
  IngClass: any,
  ingredients: T[]
) {
  test(`Construct database seed ingredients: ${IngClass.name}`, () => {
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
