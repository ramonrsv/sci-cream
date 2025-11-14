import dairyJson from "../../../../../data/ingredients/dairy.json";
import sweetenersJson from "../../../../../data/ingredients/sweeteners.json";
import alcoholJson from "../../../../../data/ingredients/alcohol.json";
import chocolatesJson from "../../../../../data/ingredients/chocolates.json";
import nutsJson from "../../../../../data/ingredients/nuts.json";
import fruitsJson from "../../../../../data/ingredients/fruits.json";
import eggsJson from "../../../../../data/ingredients/eggs.json";
import stabilizersJson from "../../../../../data/ingredients/stabilizers.json";
import miscellaneousJson from "../../../../../data/ingredients/miscellaneous.json";

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
} from "../deprecated/sci-cream";

function mapTo<T>(jsonList: T[], IngClass: any) {
  return jsonList.map((json) => new IngClass(json));
}

export const dairy = mapTo(dairyJson, Dairy);
export const sweeteners = mapTo(sweetenersJson, Sweetener);
export const alcohol = mapTo(alcoholJson, Alcohol);
export const chocolates = mapTo(chocolatesJson, Chocolate);
export const nuts = mapTo(nutsJson, Nut);
export const fruits = mapTo(fruitsJson, Fruit);
export const eggs = mapTo(eggsJson, Egg);
export const stabilizers = mapTo(stabilizersJson, Stabilizer);
export const miscellaneous = mapTo(miscellaneousJson, Miscellaneous);

export const allIngredients = [
  dairy,
  sweeteners,
  alcohol,
  chocolates,
  nuts,
  fruits,
  eggs,
  stabilizers,
  miscellaneous,
];
