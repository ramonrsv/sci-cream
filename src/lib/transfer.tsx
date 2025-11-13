import { IngredientTransfer } from "@/lib/data";

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

export function constructIngredientFromTransfer(ingredient: IngredientTransfer): Ingredient {
  switch (ingredient.category) {
    case Category.DAIRY:
      return new Dairy(ingredient.value as any);
    case Category.SWEETENER:
      return new Sweetener(ingredient.value as any);
    case Category.ALCOHOL:
      return new Alcohol(ingredient.value as any);
    case Category.CHOCOLATE:
      return new Chocolate(ingredient.value as any);
    case Category.NUT:
      return new Nut(ingredient.value as any);
    case Category.FRUIT:
      return new Fruit(ingredient.value as any);
    case Category.EGG:
      return new Egg(ingredient.value as any);
    case Category.STABILIZER:
      return new Stabilizer(ingredient.value as any);
    case Category.MISCELLANEOUS:
      return new Miscellaneous(ingredient.value as any);
    default:
      throw new Error(`Unknown ingredient category: ${ingredient.category}`);
  }
}