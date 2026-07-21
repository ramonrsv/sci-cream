import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";

import { getDatabaseUrl } from "@/lib/database/util";
import { findUserByEmail } from "@/lib/data";
import {
  UserInsert,
  usersTable,
  ingredientsTable,
  SchemaCategory,
  recipesTable,
  recipeVersionsTable,
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
 * Upsert a list of ingredient spec entries for the given user.
 *
 * Each entry is deleted if it already exists, then re-inserted, so the spec is always current.
 */
async function seedUserIngredients(userEmail: string, ingredientSpecs: IngredientSpecJson[]) {
  const user = await findUserByEmail(userEmail);
  verifyDefined(user, `User with email ${userEmail} not found, cannot seed ingredients`);

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
 * Upsert a list of recipe entries for the given user.
 *
 * Each entry is deleted (cascading to its versions) if it already exists, then re-inserted with
 * all of its versions in order, so the seeded state is always current.
 */
async function seedUserRecipes(userEmail: string, recipes: SeedRecipeAsset[]) {
  const user = await findUserByEmail(userEmail);
  verifyDefined(user, `User with email ${userEmail} not found, cannot seed recipes`);

  console.log("==========");
  console.log("Seeding recipes for user:", user);

  for (const entry of recipes) {
    console.log("---");
    console.log(`Adding recipe "${entry.name}" with ${entry.versions.length} version(s)`);

    const [existing] = await db
      .select()
      .from(recipesTable)
      .where(and(eq(recipesTable.name, entry.name), eq(recipesTable.user, user.id)));

    if (existing != undefined) {
      console.log("Found existing recipe, deleting (cascades to versions)");
      await db
        .delete(recipesTable)
        .where(and(eq(recipesTable.name, entry.name), eq(recipesTable.user, user.id)));
    }

    const [recipeRow] = await db
      .insert(recipesTable)
      .values({ name: entry.name, user: user.id })
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
        });
    }
  }

  console.log("---");
  console.log(`Seeded ${recipes.length} recipes for user `, user);
}

/** Entry point: seed test users and their ingredient libraries */
async function main() {
  await seedUsers([TEST_USER_A, TEST_USER_B]);

  // Seed only non-alias ingredient specs, since aliases are not supported in the database
  await seedUserIngredients(TEST_USER_A.email, getNonAliasIngredientSpecs());

  await seedUserIngredients(TEST_USER_A.email, [USER_DEFINED_FRUCTOSE_SPEC]);
  await seedUserIngredients(TEST_USER_B.email, [USER_DEFINED_FRUCTOSE_SPEC]);

  await seedUserRecipes(TEST_USER_A.email, adaptEmbeddedToSeedAssets(allRecipeEntries));
  await seedUserRecipes(TEST_USER_B.email, TEST_USER_B_RECIPES);
}

main();
