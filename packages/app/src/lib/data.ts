"use server";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, sql } from "drizzle-orm";

import type { LightRecipe } from "@workspace/sci-cream";

import { getDatabaseUrl } from "./database/util";
import {
  UserSelect,
  UserInsert,
  usersTable,
  Ingredient as IngredientDb,
  ingredientsTable,
  recipesTable,
  recipeVersionsTable,
  RecipeSelect,
} from "./database/schema";
import * as schema from "./database/schema";

/** Drizzle database client used by all server actions in this module */
const db = drizzle(getDatabaseUrl(), { schema });

/** The database row type used to transfer ingredient data to the client */
export type IngredientTransfer = IngredientDb;

/** One snapshot of a saved recipe; the `recipe` is the same `[name, qty]` payload as embedded */
export type SavedRecipeVersionJson = {
  version: number;
  recipe: LightRecipe;
  comments?: string;
  label?: string;
  /** ISO 8601 timestamp; created server-side and surfaced as a string for client serialization */
  createdAt: string;
};

/** A saved recipe with all of its versions, sorted ascending by version number */
export type SavedRecipeJson = { id: number; name: string; versions: SavedRecipeVersionJson[] };

/** Optional metadata captured per snapshot when creating or amending a version */
export type RecipeVersionMeta = { comments?: string | null; label?: string | null };

/** Convert a `recipe_versions` row (or a join row with the same fields) to its JSON wire shape */
function toSavedRecipeVersionJson(row: {
  version: number;
  recipe: unknown;
  comments: string | null;
  label: string | null;
  createdAt: Date;
}): SavedRecipeVersionJson {
  return {
    version: row.version,
    recipe: row.recipe as LightRecipe,
    ...(row.comments != null && { comments: row.comments }),
    ...(row.label != null && { label: row.label }),
    createdAt: row.createdAt.toISOString(),
  };
}

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

/**
 * Verify the given recipe belongs to the given user; returns the recipe row or `undefined`.
 *
 * Centralizes the ownership check that every version-mutating action must perform before touching
 * `recipe_versions` rows; this prevents one user from reading or modifying another's recipes by
 * guessing `recipeId` values.
 */
async function findUserRecipe(userId: number, recipeId: number): Promise<RecipeSelect | undefined> {
  const [row] = await db
    .select()
    .from(recipesTable)
    .where(and(eq(recipesTable.id, recipeId), eq(recipesTable.user, userId)));
  return row;
}

/** Fetch all saved recipes belonging to the given user; `undefined` if the user is not found. */
export async function fetchAllUserSavedRecipes(
  userEmail: string,
): Promise<SavedRecipeJson[] | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchAllUserSavedRecipes`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`fetchAllUserSavedRecipes: user not found`);
    return undefined;
  }

  const rows = await db
    .select({
      id: recipesTable.id,
      name: recipesTable.name,
      version: recipeVersionsTable.version,
      recipe: recipeVersionsTable.recipe,
      comments: recipeVersionsTable.comments,
      label: recipeVersionsTable.label,
      createdAt: recipeVersionsTable.createdAt,
    })
    .from(recipesTable)
    .innerJoin(recipeVersionsTable, eq(recipeVersionsTable.recipeId, recipesTable.id))
    .where(eq(recipesTable.user, user.id))
    .orderBy(sql`${recipesTable.name} COLLATE "C" ASC`, sql`${recipeVersionsTable.version} ASC`);

  // Group by recipe id, preserving the alphabetical order produced by the query
  const byId = new Map<number, SavedRecipeJson>();
  for (const row of rows) {
    let grouped = byId.get(row.id);
    if (!grouped) {
      grouped = { id: row.id, name: row.name, versions: [] };
      byId.set(row.id, grouped);
    }
    grouped.versions.push(toSavedRecipeVersionJson(row));
  }

  const result = Array.from(byId.values());
  console.log(`fetchAllUserSavedRecipes: found ${result.length} recipes for userId=${user.id}`);
  return result;
}

/** Internal: insert a new version row for the given recipe with `version = max(version) + 1` */
async function insertNextVersion(
  recipeId: number,
  recipe: LightRecipe,
  meta: RecipeVersionMeta = {},
): Promise<SavedRecipeVersionJson> {
  // Compute next version number from existing rows; defaults to 1 when none exist yet
  const [{ next }] = await db
    .select({ next: sql<number>`COALESCE(MAX(${recipeVersionsTable.version}), 0) + 1` })
    .from(recipeVersionsTable)
    .where(eq(recipeVersionsTable.recipeId, recipeId));

  const nextVersion = Number(next);

  const [inserted] = await db
    .insert(recipeVersionsTable)
    .values({
      recipeId,
      version: nextVersion,
      recipe,
      comments: meta.comments ?? null,
      label: meta.label ?? null,
    })
    .returning();

  return toSavedRecipeVersionJson(inserted);
}

/**
 * Create a new saved recipe for the given user, seeded with a single first version.
 *
 * Returns `undefined` if the user is not found; throws if a recipe with `name` already exists for
 * this user (the caller should disambiguate via {@link createUserRecipeVersion} instead).
 */
export async function createUserRecipe(
  userEmail: string,
  name: string,
  recipe: LightRecipe,
  meta: RecipeVersionMeta = {},
): Promise<{ recipeId: number; version: SavedRecipeVersionJson } | undefined> {
  console.log(`[${await FetchCounter.get()}] createUserRecipe("${name}")`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`createUserRecipe: user not found`);
    return undefined;
  }

  const [recipeRow] = await db.insert(recipesTable).values({ name, user: user.id }).returning();

  const version = await insertNextVersion(recipeRow.id, recipe, meta);
  return { recipeId: recipeRow.id, version };
}

/**
 * Append a new version to an existing recipe owned by the user, computing `version = max + 1`.
 *
 * Returns `undefined` if the user is not found or the recipe does not belong to the user.
 */
export async function createUserRecipeVersion(
  userEmail: string,
  recipeId: number,
  recipe: LightRecipe,
  meta: RecipeVersionMeta = {},
): Promise<SavedRecipeVersionJson | undefined> {
  console.log(`[${await FetchCounter.get()}] createUserRecipeVersion(${recipeId})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`createUserRecipeVersion: user not found`);
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    console.warn(`createUserRecipeVersion: recipeId=${recipeId} not owned by userId=${user.id}`);
    return undefined;
  }

  return insertNextVersion(recipeId, recipe, meta);
}

/**
 * Partially update an existing version of a user-owned recipe. Pass `null` in `meta` to clear the
 * corresponding field; omit a key to leave it unchanged. Returns `undefined` if the user is not
 * found, the recipe is not owned by them, or no matching version exists.
 */
export async function updateUserRecipeVersion(
  userEmail: string,
  recipeId: number,
  version: number,
  updates: { recipe?: LightRecipe } & RecipeVersionMeta,
): Promise<SavedRecipeVersionJson | undefined> {
  console.log(`[${await FetchCounter.get()}] updateUserRecipeVersion(${recipeId}, v${version})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`updateUserRecipeVersion: user not found`);
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    console.warn(`updateUserRecipeVersion: recipeId=${recipeId} not owned by userId=${user.id}`);
    return undefined;
  }

  const setClause: Partial<typeof recipeVersionsTable.$inferInsert> = {};
  if (updates.recipe !== undefined) setClause.recipe = updates.recipe;
  if (updates.comments !== undefined) setClause.comments = updates.comments;
  if (updates.label !== undefined) setClause.label = updates.label;

  const where = and(
    eq(recipeVersionsTable.recipeId, recipeId),
    eq(recipeVersionsTable.version, version),
  );

  // No-op (empty `updates`): fetch and return the existing row so callers get a consistent shape
  const [row] =
    Object.keys(setClause).length === 0
      ? await db.select().from(recipeVersionsTable).where(where)
      : await db.update(recipeVersionsTable).set(setClause).where(where).returning();

  return row ? toSavedRecipeVersionJson(row) : undefined;
}

/**
 * Rename a user-owned recipe. Returns the renamed row, or `undefined` if the user is not found or
 * the recipe is not owned by them. Throws on `(user, name)` collision with another recipe.
 */
export async function renameUserRecipe(
  userEmail: string,
  recipeId: number,
  newName: string,
): Promise<RecipeSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] renameUserRecipe(${recipeId}, "${newName}")`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`renameUserRecipe: user not found`);
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    console.warn(`renameUserRecipe: recipeId=${recipeId} not owned by userId=${user.id}`);
    return undefined;
  }

  const [row] = await db
    .update(recipesTable)
    .set({ name: newName })
    .where(and(eq(recipesTable.id, recipeId), eq(recipesTable.user, user.id)))
    .returning();

  return row;
}

/**
 * Delete a saved recipe and all of its versions for the given user.
 *
 * Returns the deleted row, or `undefined` if the user was not found or no matching row existed.
 */
export async function deleteUserRecipe(
  userEmail: string,
  recipeId: number,
): Promise<RecipeSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] deleteUserRecipe(${recipeId})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`deleteUserRecipe: user not found`);
    return undefined;
  }

  const [row] = await db
    .delete(recipesTable)
    .where(and(eq(recipesTable.id, recipeId), eq(recipesTable.user, user.id)))
    .returning();

  return row;
}

/**
 * Delete a single version of a user-owned recipe. Refuses to delete the last remaining version of
 * a recipe to avoid orphaned `recipes` rows — call {@link deleteUserRecipe} for that case.
 *
 * Returns the deleted version row, or `undefined` if the user was not found, the recipe is not
 * owned by them, no matching version exists, or it is the last remaining version.
 */
export async function deleteUserRecipeVersion(
  userEmail: string,
  recipeId: number,
  version: number,
): Promise<SavedRecipeVersionJson | undefined> {
  console.log(`[${await FetchCounter.get()}] deleteUserRecipeVersion(${recipeId}, v${version})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`deleteUserRecipeVersion: user not found`);
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    console.warn(`deleteUserRecipeVersion: recipeId=${recipeId} not owned by userId=${user.id}`);
    return undefined;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(recipeVersionsTable)
    .where(eq(recipeVersionsTable.recipeId, recipeId));

  if (Number(count) <= 1) {
    console.warn(`deleteUserRecipeVersion: refusing to delete the last remaining version`);
    return undefined;
  }

  const [row] = await db
    .delete(recipeVersionsTable)
    .where(
      and(eq(recipeVersionsTable.recipeId, recipeId), eq(recipeVersionsTable.version, version)),
    )
    .returning();

  return row ? toSavedRecipeVersionJson(row) : undefined;
}
