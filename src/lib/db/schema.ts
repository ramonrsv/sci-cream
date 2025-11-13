import { pgTable, primaryKey, integer, text, pgEnum, json } from "drizzle-orm/pg-core";

import { Category } from "@/lib/sci-cream/sci-cream";

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
    value: json(),
  },
  (table) => [primaryKey({ columns: [table.name, table.user] })]
);
