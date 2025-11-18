/// Ingredient categories
// @todo I don't know what's going on with this, the typescript generated enum has tons of issues,
// including Drizzle ORM's pgEnum: see https://github.com/drizzle-team/drizzle-orm/discussions/1914
// For now, just re-create it here as a normal string enum, which seems to work fine.
export enum Category {
  Dairy = "Dairy",
  Sweetener = "Sweetener",
  Alcohol = "Alcohol",
  Chocolate = "Chocolate",
  Nut = "Nut",
  Fruit = "Fruit",
  Egg = "Egg",
  Stabilizer = "Stabilizer",
  Miscellaneous = "Miscellaneous",
}
