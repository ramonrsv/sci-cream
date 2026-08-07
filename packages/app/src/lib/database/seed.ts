import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

import { getDatabaseUrl } from "@/lib/database/util";
import { createUserBatch, findUserByEmail, setUserBatchFavourite } from "@/lib/data";
import {
  UserInsert,
  usersTable,
  ingredientsTable,
  SchemaCategory,
  recipesTable,
  recipeVersionsTable,
  batchesTable,
} from "@/lib/database/schema";
import { verifyDefined } from "@/lib/util";
import * as schema from "@/lib/database/schema";

import {
  IngredientSpecJson,
  getNonAliasIngredientSpecs,
  RecipeEntryJson,
  allRecipeEntries,
} from "@workspace/sci-cream";

import {
  TEST_USER_A,
  TEST_USER_B,
  USER_DEFINED_FRUCTOSE_SPEC,
  TEST_USER_B_RECIPES,
  TEST_USER_B_BATCHES,
  type SeedBatchAsset,
  type SeedRecipeAsset,
} from "@/lib/database/assets";

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
 * Replace the user's ingredient specs with the given list.
 *
 * All of the user's existing ingredients are deleted first, so the seeded set is deterministic.
 */
async function seedUserIngredients(userEmail: string, ingredientSpecs: IngredientSpecJson[]) {
  const user = await findUserByEmail(userEmail);
  verifyDefined(user, `User with email ${userEmail} not found, cannot seed ingredients`);

  console.log("==========");
  console.log("Seeding user ingredients for user:", user);

  await db.delete(ingredientsTable).where(eq(ingredientsTable.user, user.id));

  for (const spec of ingredientSpecs) {
    const ingredient: typeof ingredientsTable.$inferInsert = {
      name: spec.name,
      user: user.id,
      category: spec.category as (typeof SchemaCategory)[keyof typeof SchemaCategory],
      spec: JSON.stringify(spec),
    };

    console.log("Inserting ingredient:", ingredient.name);
    await db.insert(ingredientsTable).values(ingredient);
  }

  console.log(`Seeded ${ingredientSpecs.length} ingredients for user `, user);
}

/**
 * Adapt embedded recipe entries to the seed asset shape — one identity per entry with a single
 * version capturing the entry's `recipe` (and `comments`, when present).
 */
function adaptEmbeddedToSeedAssets(entries: RecipeEntryJson[]): SeedRecipeAsset[] {
  return entries.map((entry) => {
    const comments = entry.comments as string | undefined;
    return {
      name: entry.name,
      versions: [{ recipe: entry.recipe, ...(comments != null && { comments }) }],
    };
  });
}

/**
 * Replace the user's recipes with the given list.
 *
 * All of the user's existing recipes are deleted first (cascading to their versions), so the seeded
 * set is deterministic regardless of earlier runs. Each entry's versions are inserted in order.
 */
async function seedUserRecipes(userEmail: string, recipes: SeedRecipeAsset[]) {
  const user = await findUserByEmail(userEmail);
  verifyDefined(user, `User with email ${userEmail} not found, cannot seed recipes`);

  console.log("==========");
  console.log("Seeding recipes for user:", user);

  await db.delete(recipesTable).where(eq(recipesTable.user, user.id));

  for (const entry of recipes) {
    console.log(`Adding recipe "${entry.name}" with ${entry.versions.length} version(s)`);

    const [recipeRow] = await db
      .insert(recipesTable)
      .values({ name: entry.name, user: user.id, favourite: entry.favourite ?? false })
      .returning();

    for (let i = 0; i < entry.versions.length; i++) {
      const v = entry.versions[i];
      await db
        .insert(recipeVersionsTable)
        .values({
          recipeId: recipeRow.id,
          version: i + 1,
          recipe: JSON.stringify(v.recipe),
          comments: v.comments ?? null,
          label: v.label ?? null,
          evaporation: v.evaporation ?? null,
          rating: v.rating ?? null,
        });
    }
  }

  console.log("---");
  console.log(`Seeded ${recipes.length} recipes for user `, user);
}

/**
 * Replace the user's saved batches with the given list.
 *
 * All of the user's existing batches are deleted first (cascading to their recipes), so the seeded
 * set is deterministic. Batches are created in array order, so the last entry sorts to the top.
 */
async function seedUserBatches(userEmail: string, batches: SeedBatchAsset[]) {
  const user = await findUserByEmail(userEmail);
  verifyDefined(user, `User with email ${userEmail} not found, cannot seed batches`);

  console.log("==========");
  console.log("Seeding batches for user:", user);

  await db.delete(batchesTable).where(eq(batchesTable.user, user.id));

  for (const { favourite, ...input } of batches) {
    const created = await createUserBatch(userEmail, input);
    // Two calls, not one: `BatchInput` omits `favourite` so a whole-batch save can't clear a star.
    if (favourite && created) await setUserBatchFavourite(userEmail, created.id, true);
    console.log(`Added batch "${input.title ?? "(untitled)"}"`);
  }

  console.log(`Seeded ${batches.length} batches for user `, user);
}

/** Entry point: seed test users and their ingredient libraries */
async function main() {
  await seedUsers([TEST_USER_A, TEST_USER_B]);

  // Seed only non-alias ingredient specs, since aliases are not supported in the database.
  // Both of A's sets go in one call, as seeding replaces the user's ingredients wholesale.
  await seedUserIngredients(TEST_USER_A.email, [
    ...getNonAliasIngredientSpecs(),
    USER_DEFINED_FRUCTOSE_SPEC,
  ]);
  await seedUserIngredients(TEST_USER_B.email, [USER_DEFINED_FRUCTOSE_SPEC]);

  await seedUserRecipes(TEST_USER_A.email, adaptEmbeddedToSeedAssets(allRecipeEntries));
  await seedUserRecipes(TEST_USER_B.email, TEST_USER_B_RECIPES);

  await seedUserBatches(TEST_USER_B.email, TEST_USER_B_BATCHES);
}

main();
