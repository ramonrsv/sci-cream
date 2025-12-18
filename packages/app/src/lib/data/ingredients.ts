import dairyJson from "../../../../../data/ingredients/dairy.json";
import sweetenersJson from "../../../../../data/ingredients/sweeteners.json";
import fruitsJson from "../../../../../data/ingredients/fruits.json";

function flattenLists(jsonLists: any[][]): any[] {
  return jsonLists.reduce((acc, list) => acc.concat(list), []);
}

export const allIngredients = flattenLists([dairyJson, sweetenersJson, fruitsJson]);
