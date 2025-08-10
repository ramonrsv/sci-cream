import { expect, test } from "vitest";

import {
  Category,
  Ingredient,
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

function testConstructedAndCategory<T extends Ingredient>(
  ctor: new (...args: any) => T,
  category: Category,
  ingredients: any[]
) {
  test(`Constructed and categories of seed ingredients: ${ctor.name}`, () => {
    for (const ing of ingredients) {
      expect(ctor.name).toBe(category);
      expect(ing instanceof Ingredient).toBe(true);
      expect(ing instanceof ctor).toBe(true);
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
