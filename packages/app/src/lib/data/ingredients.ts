import dairyJson from "../../../../../data/ingredients/deprecated/dairy.json";
import sweetenersJson from "../../../../../data/ingredients/deprecated/sweeteners.json";
import alcoholJson from "../../../../../data/ingredients/deprecated/alcohol.json";
import chocolatesJson from "../../../../../data/ingredients/deprecated/chocolates.json";
import nutsJson from "../../../../../data/ingredients/deprecated/nuts.json";
import fruitsJson from "../../../../../data/ingredients/deprecated/fruits.json";
import eggsJson from "../../../../../data/ingredients/deprecated/eggs.json";
import stabilizersJson from "../../../../../data/ingredients/deprecated/stabilizers.json";
import miscellaneousJson from "../../../../../data/ingredients/deprecated/miscellaneous.json";

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
