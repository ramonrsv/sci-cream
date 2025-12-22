/// Ingredient categories, a local duplicate of { Category } from "@workspace/sci-cream"
//
// @todo I don't know what's going on with this, the typescript generated enum has tons of issues,
// including Drizzle ORM's pgEnum: see https://github.com/drizzle-team/drizzle-orm/discussions/1914
// For now, just re-create it here as a normal string enum, which seems to work fine.
//     - Actually, the following seems to work, but we still have the other @todo issue below:
//         `getTsEnumStringKeys(Category) as [string, ...string[]]` in `db/schema.ts`,
//
// @todo We also need to put this in a separate file from `deprecated/sci-cream.ts` because it needs
// to be imported into the DB schema in `db/schema.ts`, and importing it from `sci-cream.ts` will
// include `import { ... } from "@workspace/sci-cream";` which causes an error when seeding the DB:
//     `Top-level await is currently not supported with the "cjs" output format`
//     See: https://github.com/drizzle-team/drizzle-orm/issues/1982
export enum SchemaCategory {
  Dairy = "Dairy",
  Sweetener = "Sweetener",
  Alcohol = "Alcohol",
  Chocolate = "Chocolate",
  Nut = "Nut",
  Fruit = "Fruit",
  Egg = "Egg",
  EmulsifierStabilizer = "EmulsifierStabilizer",
  Miscellaneous = "Miscellaneous",
}
