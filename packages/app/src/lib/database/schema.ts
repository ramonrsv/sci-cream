import { pgTable, primaryKey, integer, text, pgEnum, json, timestamp } from "drizzle-orm/pg-core";

import { SchemaCategory } from "@workspace/sci-cream/schema-category";
export { SchemaCategory };

/** Drizzle ORM table definition for registered users. */
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export type UserInsert = typeof usersTable.$inferInsert;
export type UserSelect = typeof usersTable.$inferSelect;
export type Ingredient = typeof ingredientsTable.$inferSelect;
