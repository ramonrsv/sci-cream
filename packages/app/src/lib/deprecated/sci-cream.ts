import { FlatHeader } from "@workspace/sci-cream";
import { getWasmEnums } from "../util";

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

// @todo For some reason `getWasmEnums(FlatHeader)` seems to still trip up the code analysis,
// so for now implement this helper function which seems to be well understood by the analyzer.
export function getFlatHeaders(): FlatHeader[] {
  return getWasmEnums(FlatHeader).map((e) => e as unknown as FlatHeader);
}
