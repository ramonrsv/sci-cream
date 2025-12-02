import { pgTable, primaryKey, integer, text, pgEnum, json } from "drizzle-orm/pg-core";

import { Category } from "../deprecated/category";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
});

export const categoryEnum = pgEnum("category", Category);

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
  (table) => [primaryKey({ columns: [table.name, table.user] })]
);

export type User = typeof usersTable.$inferInsert;
export type Ingredient = typeof ingredientsTable.$inferSelect;
