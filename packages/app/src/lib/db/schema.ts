import { pgTable, primaryKey, integer, text, pgEnum, json } from "drizzle-orm/pg-core";

import { SchemaCategory } from "./schema-category";
export { SchemaCategory as Category };

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
});

export const categoryEnum = pgEnum("category", SchemaCategory);

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

export type User = typeof usersTable.$inferInsert;
export type Ingredient = typeof ingredientsTable.$inferSelect;
