import { sql } from "drizzle-orm";
import {
  pgTable,
  primaryKey,
  unique,
  uniqueIndex,
  check,
  foreignKey,
  boolean,
  integer,
  real,
  text,
  pgEnum,
  json,
  timestamp,
} from "drizzle-orm/pg-core";

import { SchemaCategory } from "@workspace/sci-cream/schema-category";
export { SchemaCategory };

// NOTE: drizzle-kit has a known bug (https://github.com/drizzle-team/drizzle-orm/issues/3274) where
// composite unique constraint columns are introspected in column-position order. If the schema
// definition order differs, every push issues a spurious DROP + ADD CONSTRAINT — and prompts about
// truncation once the table has rows. Workaround: define composite unique constraints with columns
// in table-definition order.

/** Drizzle ORM table definition for registered users. */
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserInsert = typeof usersTable.$inferInsert;
export type UserSelect = typeof usersTable.$inferSelect;

/** PostgreSQL enum type for ingredient categories, derived from the Rust `SchemaCategory` enum. */
export const categoryEnum = pgEnum("category", SchemaCategory);

/** Drizzle ORM table definition for ingredients, keyed by name and user. */
export const ingredientsTable = pgTable(
  "ingredients",
  {
    name: text().notNull(),
    user: integer()
      .notNull()
      .references(() => usersTable.id),
    category: categoryEnum(),
    spec: json(),
  },
  (table) => [primaryKey({ columns: [table.name, table.user] })],
);

export type Ingredient = typeof ingredientsTable.$inferSelect;

/**
 * Drizzle ORM table definition for the identity of a user's saved recipe.
 *
 * One row per `(user, name)` pair; the actual recipe contents and per-snapshot metadata live in
 * {@link recipeVersionsTable} so each recipe can carry multiple versions over time.
 */
export const recipesTable = pgTable(
  "recipes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    user: integer()
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("recipes_user_name_uq").on(table.name, table.user)],
);

export type RecipeInsert = typeof recipesTable.$inferInsert;
export type RecipeSelect = typeof recipesTable.$inferSelect;

/**
 * Drizzle ORM table definition for snapshots of a recipe.
 *
 * One row per `(recipe_id, version)` pair; `version` is a monotonically-increasing internal key
 * assigned by the server action that creates the snapshot. When a user opts into named versions,
 * `versionName` (e.g. `3.1`, `4.2-b`) holds the displayed value, unique per recipe. Comments and an
 * optional short `label` are scoped to the individual version, not the recipe identity.
 */
export const recipeVersionsTable = pgTable(
  "recipe_versions",
  {
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipesTable.id, { onDelete: "cascade" }),
    version: integer().notNull(),
    recipe: json().notNull(),
    comments: text(),
    label: text(),
    versionName: text("version_name"),
    /** Grams of water evaporated during preparation; null when no evaporation was recorded */
    evaporation: real(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.version] }),
    uniqueIndex("recipe_versions_recipe_version_name_uq")
      .on(table.recipeId, table.versionName)
      .where(sql`${table.versionName} IS NOT NULL`),
  ],
);

export type RecipeVersionInsert = typeof recipeVersionsTable.$inferInsert;
export type RecipeVersionSelect = typeof recipeVersionsTable.$inferSelect;

/**
 * Drizzle ORM table definition for the identity of a user's saved batch: one weighing session over
 * one or more recipes, made on a calendar day. Weighted recipes live in {@link batchRecipesTable}.
 */
export const batchesTable = pgTable("batches", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user: integer()
    .notNull()
    .references(() => usersTable.id),
  title: text(),
  // Calendar day the batch was made, `YYYY-MM-DD` local — text, so it never shifts timezone.
  date: text().notNull(),
  notes: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BatchInsert = typeof batchesTable.$inferInsert;
export type BatchSelect = typeof batchesTable.$inferSelect;

/**
 * Drizzle ORM table definition for one recipe within a saved batch.
 *
 * `rows` holds the `[name, grams]` amounts exactly as weighed and is authoritative — `recipeId` /
 * `versionNumber` are provenance only and are never consulted for amounts. They form a composite
 * foreign key to {@link recipeVersionsTable} with `onDelete: "set null"`, so deleting a source
 * recipe (which cascades to its versions) nulls *both* provenance columns together rather than
 * corrupting the batch — and the `check` that keeps them set-or-clear together stays satisfied.
 *
 * `versionName` / `hasSiblings` are a snapshot of the version's display hints taken when the batch
 * was saved — deliberately *not* part of that foreign key, so they survive even once the source
 * version is deleted and `recipeId/versionNumber` are nulled out from under them.
 */
export const batchRecipesTable = pgTable(
  "batch_recipes",
  {
    batchId: integer("batch_id")
      .notNull()
      .references(() => batchesTable.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    name: text().notNull(),
    rows: json().notNull(),
    // Container color as its display name (e.g. `"Blue"`); null when the recipe carries no pick.
    color: text(),
    recipeId: integer("recipe_id"),
    versionNumber: integer("version_number"),
    versionName: text("version_name"),
    hasSiblings: boolean("has_siblings"),
  },
  (table) => [
    primaryKey({ columns: [table.batchId, table.position] }),
    foreignKey({
      name: "batch_recipes_version_fk",
      columns: [table.recipeId, table.versionNumber],
      foreignColumns: [recipeVersionsTable.recipeId, recipeVersionsTable.version],
    }).onDelete("set null"),
    check(
      "batch_recipes_ref_both_or_neither",
      sql`(${table.recipeId} IS NULL) = (${table.versionNumber} IS NULL)`,
    ),
  ],
);

export type BatchRecipeInsert = typeof batchRecipesTable.$inferInsert;
export type BatchRecipeSelect = typeof batchRecipesTable.$inferSelect;
