import dairyJson from "../../data/ingredients/dairy.json";
import sweetenersJson from "../../data/ingredients/sweeteners.json";
import fruitsJson from "../../data/ingredients/fruits.json";
import chocolatesJson from "../../data/ingredients/chocolates.json";
import nutsJson from "../../data/ingredients/nuts.json";
import eggsJson from "../../data/ingredients/eggs.json";
import alcoholJson from "../../data/ingredients/alcohol.json";
import microsJson from "../../data/ingredients/micros.json";
import miscellaneousJson from "../../data/ingredients/miscellaneous.json";

export interface IngredientJson {
  name: string;
  category: string;
  [key: string]: unknown;
}

/** Merges multiple ingredient spec lists into a single flat array. */
function flattenLists(jsonLists: IngredientJson[][]): IngredientJson[] {
  return jsonLists.reduce((acc, list) => acc.concat(list), []);
}

/** All built-in ingredient specs aggregated from every ingredient category JSON file. */
export const allIngredientSpecs = flattenLists([
  dairyJson,
  sweetenersJson,
  fruitsJson,
  chocolatesJson,
  nutsJson,
  eggsJson,
  alcoholJson,
  microsJson,
  miscellaneousJson,
]);

/** Returns the ingredient spec matching the given name, or throws if not found. */
export function getIngredientSpecByName(name: string) {
  return (
    allIngredientSpecs.find((ing) => ing.name === name) ??
    (() => {
      throw new Error(`Ingredient spec not found for name: ${name}`);
    })()
  );
}
