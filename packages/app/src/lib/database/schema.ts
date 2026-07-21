import { sql } from "drizzle-orm";
import {
  pgTable,
  primaryKey,
  unique,
  uniqueIndex,
  integer,
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
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipesTable.id, { onDelete: "cascade" }),
    version: integer().notNull(),
    recipe: json().notNull(),
    comments: text(),
    label: text(),
    versionName: text("version_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("recipe_versions_recipe_version_uq").on(table.recipeId, table.version),
    uniqueIndex("recipe_versions_recipe_version_name_uq")
      .on(table.recipeId, table.versionName)
      .where(sql`${table.versionName} IS NOT NULL`),
  ],
);

export type RecipeVersionInsert = typeof recipeVersionsTable.$inferInsert;
export type RecipeVersionSelect = typeof recipeVersionsTable.$inferSelect;
