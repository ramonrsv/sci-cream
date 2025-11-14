import dairyJson from "./dairy.json";
import sweetenersJson from "./sweeteners.json";
import alcoholJson from "./alcohol.json";
import chocolatesJson from "./chocolates.json";
import nutsJson from "./nuts.json";
import fruitsJson from "./fruits.json";
import eggsJson from "./eggs.json";
import stabilizersJson from "./stabilizers.json";
import miscellaneousJson from "./miscellaneous.json";

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
} from "@/lib/deprecated/sci-cream";

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
