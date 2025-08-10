import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { usersTable, ingredientsTable } from "./schema";
import * as schema from "./schema";

import { Ingredient, Dairy } from "@/lib/sci-cream/sci-cream";

import { allIngredients } from "@/../data/ingredients/ingredients";

type User = typeof usersTable.$inferInsert;

const db = drizzle(process.env.DATABASE_URL!, { schema });

const app: User = {
  name: process.env.APP_USER_NAME!,
  email: process.env.APP_USER_EMAIL!,
};

const ramon: User = {
  name: "Ramon Sibello",
  email: "ramon@sibello.ca",
};

async function seedUsers() {
  console.log("==========");
  console.log("Seeding users");

  for (const user of [app, ramon]) {
    await db.insert(usersTable).values(user).onConflictDoNothing({ target: usersTable.email });
  }

  const users = await db.select().from(usersTable);
  console.log("Getting all users from the database:", users);
}

async function seedUserIngredients(user: User, ingredients: Ingredient[]) {
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.email, user.email));

  console.log("==========");
  console.log("Seeding user ingredients for user:", foundUser);

  for (const ing of ingredients) {
    const ingredient: typeof ingredientsTable.$inferInsert = {
      name: ing.name,
      user: foundUser.id,
      category: ing.category(),
      value: JSON.stringify(ing.getConstructorArgs()),
    };

    console.log("---");
    console.log("Adding ingredient:", ingredient);

    const [existing] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(eq(ingredientsTable.name, ingredient.name), eq(ingredientsTable.user, ingredient.user))
      );

    if (existing != undefined) {
      console.log("Found existing ingredient, deleting");

      await db
        .delete(ingredientsTable)
        .where(
          and(
            eq(ingredientsTable.name, ingredient.name),
            eq(ingredientsTable.user, ingredient.user)
          )
        );
    }

    console.log("Inserting ingredient");
    await db.insert(ingredientsTable).values(ingredient);
  }
}

async function main() {
  await seedUsers();

  for (const ingredients of allIngredients) {
    await seedUserIngredients(app, ingredients);
  }

  await seedUserIngredients(ramon, [new Dairy({ name: "2% Milk", milkFat: 4 })]);
}

main();
