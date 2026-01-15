import { allIngredients } from "../../src/ts/ingredients";

export function findIngredientSpecByName(name: string) {
  return (
    allIngredients.find((ing) => ing.name === name) ??
    (() => {
      throw new Error(`Ingredient spec not found for name: ${name}`);
    })()
  );
}
