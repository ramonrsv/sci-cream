import dairyJson from "../../data/ingredients/dairy.json";
import sweetenersJson from "../../data/ingredients/sweeteners.json";
import fruitsJson from "../../data/ingredients/fruits.json";
import chocolatesJson from "../../data/ingredients/chocolates.json";
import eggsJson from "../../data/ingredients/eggs.json";
import emulsifiersStabilizersJson from "../../data/ingredients/emulsifiers_stabilizers.json";

export interface IngredientJson {
  name: string;
  category: string;
  [key: string]: unknown;
}

function flattenLists(jsonLists: IngredientJson[][]): IngredientJson[] {
  return jsonLists.reduce((acc, list) => acc.concat(list), []);
}

export const allIngredients = flattenLists([
  dairyJson,
  sweetenersJson,
  fruitsJson,
  chocolatesJson,
  eggsJson,
  emulsifiersStabilizersJson,
]);
