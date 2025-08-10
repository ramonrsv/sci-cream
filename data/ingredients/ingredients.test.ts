import { expect, test } from "vitest";

import {
  Category,
  Dairy,
  Sweetener,
  Alcohol,
  Chocolate,
  Nut,
  Fruit,
  Egg,
  Stabilizer,
  Miscellaneous,
} from "@/../src/lib/sci-cream/sci-cream";

import {
  dairy,
  sweeteners,
  alcohol,
  chocolates,
  nuts,
  fruits,
  eggs,
  stabilizers,
  miscellaneous,
} from "./ingredients";

function testConstructedAndCategory(IngClass: any, category: Category, ingredients: any[]) {
  test(`Constructed and categories of seed ingredients: ${IngClass.name}, ${category}`, () => {
    for (const ing of ingredients) {
      expect(ing instanceof IngClass).toBe(true);
      expect(ing.category()).toBe(category);
    }
  });
}

testConstructedAndCategory(Dairy, Category.DAIRY, dairy);
testConstructedAndCategory(Sweetener, Category.SWEETENER, sweeteners);
testConstructedAndCategory(Alcohol, Category.ALCOHOL, alcohol);
testConstructedAndCategory(Chocolate, Category.CHOCOLATE, chocolates);
testConstructedAndCategory(Nut, Category.NUT, nuts);
testConstructedAndCategory(Fruit, Category.FRUIT, fruits);
testConstructedAndCategory(Egg, Category.EGG, eggs);
testConstructedAndCategory(Stabilizer, Category.STABILIZER, stabilizers);
testConstructedAndCategory(Miscellaneous, Category.MISCELLANEOUS, miscellaneous);
