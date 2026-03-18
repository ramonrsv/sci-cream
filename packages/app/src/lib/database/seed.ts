import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";

import { getDatabaseUrl } from "@/lib/database/util";
import { findUserByEmail } from "@/lib/data";
import { UserInsert, usersTable, ingredientsTable, SchemaCategory } from "@/lib/database/schema";
import * as schema from "./schema";

import { IngredientJson, allIngredientSpecs } from "@workspace/sci-cream";

import { TEST_USER_A, TEST_USER_B, USER_DEFINED_FRUCTOSE_SPEC } from "@/lib/database/util";

/** Shape of a test-user asset constant (email, password, name) */
type UserAsset = typeof TEST_USER_A;

/** Drizzle database client used throughout the seed script */
const db = drizzle(getDatabaseUrl(), { schema });

/** Insert test users into the database, skipping any that already exist */
async function seedUsers(users: UserAsset[]) {
  console.log("==========");
  console.log("Seeding users");

  for (const user of users) {
    const passwordHash = await hash(user.password, 12);
    await db
      .insert(usersTable)
      .values({ ...user, passwordHash } as UserInsert)
      .onConflictDoNothing({ target: usersTable.email });
  }

  const usersInDb = await db.select().from(usersTable);
  console.log("Users in the database:", usersInDb);
}

/**
 * Upsert a list of ingredient specs for the given user.
 *
 * Each ingredient is deleted if it already exists, then re-inserted, so the spec is always current.
 */
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

/** Entry point: seed test users and their ingredient libraries */
async function main() {
  await seedUsers([TEST_USER_A, TEST_USER_B]);

  await seedUserIngredients(TEST_USER_A.email, allIngredientSpecs);
  await seedUserIngredients(TEST_USER_A.email, [USER_DEFINED_FRUCTOSE_SPEC]);
  await seedUserIngredients(TEST_USER_B.email, [USER_DEFINED_FRUCTOSE_SPEC]);
}

main();
