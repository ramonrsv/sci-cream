import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { usersTable, ingredientsTable, SchemaCategory } from "./schema";
import * as schema from "./schema";

import { IngredientJson, allIngredientSpecs } from "@workspace/sci-cream";

type User = typeof usersTable.$inferInsert;

const db = drizzle(process.env.DATABASE_URL!, { schema });

const appUser: User = { name: process.env.APP_USER_NAME!, email: process.env.APP_USER_EMAIL! };

const testUser: User = { name: process.env.TEST_USER_NAME!, email: process.env.TEST_USER_EMAIL! };

async function seedUsers() {
  console.log("==========");
  console.log("Seeding users");

  for (const user of [appUser, testUser]) {
    await db.insert(usersTable).values(user).onConflictDoNothing({ target: usersTable.email });
  }

  const users = await db.select().from(usersTable);
  console.log("Getting all users from the database:", users);
}

async function seedUserIngredients(user: User, ingredientSpecs: IngredientJson[]) {
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.email, user.email));

  console.log("==========");
  console.log("Seeding user ingredients for user:", foundUser);

  for (const spec of ingredientSpecs) {
    const ingredient: typeof ingredientsTable.$inferInsert = {
      name: spec.name,
      user: foundUser.id,
      category: spec.category as (typeof SchemaCategory)[keyof typeof SchemaCategory],
      spec: JSON.stringify(spec),
    };

    console.log("---");
    console.log("Adding ingredient:", ingredient);

    const [existing] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(eq(ingredientsTable.name, ingredient.name), eq(ingredientsTable.user, ingredient.user)),
      );

    if (existing != undefined) {
      console.log("Found existing ingredient, deleting");

      await db
        .delete(ingredientsTable)
        .where(
          and(
            eq(ingredientsTable.name, ingredient.name),
            eq(ingredientsTable.user, ingredient.user),
          ),
        );
    }

    console.log("Inserting ingredient");
    await db.insert(ingredientsTable).values(ingredient);
  }

  console.log("---");
  console.log(`Seeded ${ingredientSpecs.length} ingredients for user `, foundUser);
}

async function main() {
  await seedUsers();

  await seedUserIngredients(appUser, allIngredientSpecs);
  await seedUserIngredients(testUser, [
    { name: "2% Milk", category: "Dairy", DairySpec: { fat: 4 } },
  ]);
}

main();
