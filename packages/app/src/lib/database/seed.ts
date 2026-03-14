import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";

import { getDatabaseUrl, TEST_USER_A, TEST_USER_B } from "@/lib/database/util";
import { findUserByEmail } from "@/lib/data";
import { usersTable, ingredientsTable, SchemaCategory } from "@/lib/database/schema";
import * as schema from "./schema";

import { IngredientJson, allIngredientSpecs } from "@workspace/sci-cream";

const db = drizzle(getDatabaseUrl(), { schema });

async function seedUsers() {
  console.log("==========");
  console.log("Seeding users");

  for (const user of [TEST_USER_A, TEST_USER_B]) {
    const passwordHash = await hash("password123", 12);
    await db
      .insert(usersTable)
      .values({ ...user, passwordHash })
      .onConflictDoNothing({ target: usersTable.email });
  }

  const users = await db.select().from(usersTable);
  console.log("Getting all users from the database:", users);
}

async function seedUserIngredients(userEmail: string, ingredientSpecs: IngredientJson[]) {
  const user = await findUserByEmail(userEmail);
  if (!user) throw new Error(`User with email ${userEmail} not found, cannot seed ingredients`);

  console.log("==========");
  console.log("Seeding user ingredients for user:", user);

  for (const spec of ingredientSpecs) {
    const ingredient: typeof ingredientsTable.$inferInsert = {
      name: spec.name,
      user: user.id,
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
  console.log(`Seeded ${ingredientSpecs.length} ingredients for user `, user);
}

async function main() {
  await seedUsers();

  await seedUserIngredients(TEST_USER_A.email, allIngredientSpecs);
  await seedUserIngredients(TEST_USER_B.email, [
    { name: "2% Milk", category: "Dairy", DairySpec: { fat: 4 } },
  ]);
}

main();
