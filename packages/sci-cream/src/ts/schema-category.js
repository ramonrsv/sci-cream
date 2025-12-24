// This is a plain javascript clone of the { Category } typescript enum from "@workspace/sci-cream"
//
// 'npx drizzle-kit push' produces an error (below) when trying to import the typescript enum from
// "@workspace/sci-cream", and it also doesn't seem to properly pick up exported '.ts' files, so we
// create this clone in a plain javascript file for the sole purpose of using it in the DB schema.
// To import need to use: `import { SchemaCategory } from "@workspace/sci-cream/schema-category";
//
// Error when importing the enum from "@workspace/sci-cream":
//     `ERROR: Top-level await is currently not supported with the "cjs" output format`
//     See: https://github.com/drizzle-team/drizzle-orm/issues/1982
//
// @todo To use the proper { Category } enum with Drizzle ORM's pgEnum, need to use the following:
//    `getTsEnumStringKeys(Category) as [string, ...string[]]` in `db/schema.ts`,
//    See https://github.com/drizzle-team/drizzle-orm/discussions/1914
export const SchemaCategory = Object.freeze({
  Dairy: "Dairy",
  Sweetener: "Sweetener",
  Alcohol: "Alcohol",
  Chocolate: "Chocolate",
  Nut: "Nut",
  Fruit: "Fruit",
  Egg: "Egg",
  EmulsifierStabilizer: "EmulsifierStabilizer",
  Miscellaneous: "Miscellaneous",
});
