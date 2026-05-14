"use server";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, sql } from "drizzle-orm";
import type { RecipeEntryJson } from "@workspace/sci-cream";

import { getDatabaseUrl } from "./database/util";
import {
  UserSelect,
  UserInsert,
  usersTable,
  Ingredient as IngredientDb,
  ingredientsTable,
  recipesTable,
  RecipeSelect,
} from "./database/schema";
import * as schema from "./database/schema";

/** Drizzle database client used by all server actions in this module */
const db = drizzle(getDatabaseUrl(), { schema });

/** The database row type used to transfer ingredient data to the client */
export type IngredientTransfer = IngredientDb;

/**
 * Utility class that tracks the number of database fetch calls, used for logging and debugging.
 *
 * @todo Remove or replace with a proper observability solution before production.
 */
class FetchCounter {
  private static count = 0;

  /** Return the current call index and increment the counter */
  static async get() {
    return this.count++;
  }
}

/** Look up a user by email address; returns `undefined` if no matching user exists */
export async function findUserByEmail(email: string): Promise<UserSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] findUserByEmail`);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    console.warn(`findUserByEmail: user not found`);
    return undefined;
  }

  return user;
}

/** Insert a new user; throws if a user with the same email already exists */
export async function insertUser(user: UserInsert): Promise<UserInsert> {
  console.log(`[${await FetchCounter.get()}] insertUser`);

  const existing = await findUserByEmail(user.email);
  if (existing) throw new Error("User with this email already exists");

  const [inserted] = await db.insert(usersTable).values(user).returning();
  return inserted;
}

/**
 * Fetch a single ingredient spec by name for the given user
 *
 * Returns `undefined` if either the user is not found or the ingredient is not found for that user.
 */
export async function fetchUserIngredientSpecByName(
  userEmail: string,
  ingredientName: string,
): Promise<IngredientTransfer | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchUserIngredientSpecByName("${ingredientName}")`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`fetchUserIngredientSpecByName: user not found`);
    return undefined;
  }

  const ingredient = (
    await db
      .select()
      .from(ingredientsTable)
      .where(and(eq(ingredientsTable.name, ingredientName), eq(ingredientsTable.user, user.id)))
  )[0];

  if (!ingredient) {
    console.warn(
      `fetchUserIngredientSpecByName: ingredient "${ingredientName}" not found for userId=${user.id} `,
    );
    return undefined;
  }

  return ingredient;
}

/** Fetch all ingredient specs belonging to the given user; `undefined` if the user is not found */
export async function fetchAllUserIngredientSpecs(
  userEmail: string,
): Promise<IngredientTransfer[] | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchAllUserIngredientSpecs`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`fetchAllUserIngredientSpecs: user not found`);
    return undefined;
  }

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, user.id))
    .orderBy(sql`${ingredientsTable.name} COLLATE "C" ASC`);

  console.log(
    `fetchAllUserIngredientSpecs: found ${ingredients.length} ingredients for userId=${user.id}`,
  );
  return ingredients;
}

/** Fetch all saved recipes belonging to the given user; `undefined` if the user is not found. */
export async function fetchAllUserSavedRecipes(
  userEmail: string,
): Promise<RecipeEntryJson[] | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchAllUserSavedRecipes`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`fetchAllUserSavedRecipes: user not found`);
    return undefined;
  }

  const recipes = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.user, user.id))
    .orderBy(sql`${recipesTable.name} COLLATE "C" ASC`);

  console.log(`fetchAllUserSavedRecipes: found ${recipes.length} recipes for userId=${user.id}`);

  return recipes.map((r) => ({
    name: r.name,
    recipe: r.recipe as [string, number][],
    ...(r.comments != null && { comments: r.comments }),
  }));
}

/**
 * Insert or update a saved recipe for the given user, keyed by `(user, name)`.
 *
 * Returns the resulting row, or `undefined` if the user is not found.
 */
export async function upsertUserRecipe(
  userEmail: string,
  name: string,
  recipe: [string, number][],
): Promise<RecipeSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] upsertUserRecipe("${name}")`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`upsertUserRecipe: user not found`);
    return undefined;
  }

  const [row] = await db
    .insert(recipesTable)
    .values({ name, user: user.id, recipe })
    .onConflictDoUpdate({ target: [recipesTable.name, recipesTable.user], set: { recipe } })
    .returning();

  return row;
}

/**
 * Update the comments field of a saved recipe for the given user, keyed by `(user, name)`.
 *
 * An empty-string `comments` clears the field (stored as `null`). Returns the updated row, or
 * `undefined` if the user was not found or no matching row existed.
 */
export async function updateUserRecipeComments(
  userEmail: string,
  name: string,
  comments: string,
): Promise<RecipeSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] updateUserRecipeComments("${name}")`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`updateUserRecipeComments: user not found`);
    return undefined;
  }

  const [row] = await db
    .update(recipesTable)
    .set({ comments: comments === "" ? null : comments })
    .where(and(eq(recipesTable.user, user.id), eq(recipesTable.name, name)))
    .returning();

  return row;
}

/**
 * Delete a saved recipe for the given user, keyed by `(user, name)`.
 *
 * Returns the deleted row, or `undefined` if the user was not found or no matching row existed.
 */
export async function deleteUserRecipe(
  userEmail: string,
  name: string,
): Promise<RecipeSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] deleteUserRecipe("${name}")`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`deleteUserRecipe: user not found`);
    return undefined;
  }

  const [row] = await db
    .delete(recipesTable)
    .where(and(eq(recipesTable.user, user.id), eq(recipesTable.name, name)))
    .returning();

  return row;
}
