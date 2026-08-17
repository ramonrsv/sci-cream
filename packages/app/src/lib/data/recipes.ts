"use server";

import { eq, and, sql } from "drizzle-orm";

import type { LightRecipe } from "@workspace/sci-cream";

import { db } from "@/lib/database/client";
import { isRating, type Rating } from "@/lib/rating";
import { hasVersionNames, isValidVersionName, nextVersionName } from "@/lib/recipe/version";
import { verifyDefined } from "@/lib/util";
import { recipesTable, recipeVersionsTable, RecipeSelect } from "@/lib/database/schema";
import { findUserByEmail } from "@/lib/data/users";
import { FetchCounter } from "@/lib/data/util";

/** Server actions for saved recipes and their versions. See `./users`, `userEmail` argument. */

/** One snapshot of a saved recipe; the `recipe` is the same `[name, qty]` payload as embedded */
export type SavedRecipeVersionJson = {
  version: number;
  recipe: LightRecipe;
  comments?: string;
  label?: string;
  /** Opt-in display name (e.g. `3.1`, `4.2-b`); absent when the version shows its integer */
  versionName?: string;
  /** Grams of water evaporated during preparation; absent when none was recorded */
  evaporation?: number;
  /** How this version turned out; absent when unrated */
  rating?: Rating;
  /** ISO 8601 timestamp; created server-side and surfaced as a string for client serialization */
  createdAt: string;
};

/** A saved recipe with all of its versions, sorted ascending by version number */
export type SavedRecipeJson = {
  id: number;
  name: string;
  /** Starred by its owner; absent rather than `false`, as with the other optional fields here */
  favourite?: boolean;
  versions: SavedRecipeVersionJson[];
};

/** Optional metadata captured per snapshot when creating or amending a version */
export type RecipeVersionMeta = {
  comments?: string | null;
  label?: string | null;
  versionName?: string | null;
  evaporation?: number | null;
  rating?: Rating | null;
};

/** Convert a `recipe_versions` row (or a join row with the same fields) to its JSON wire shape */
function toSavedRecipeVersionJson(row: {
  version: number;
  recipe: unknown;
  comments: string | null;
  label: string | null;
  versionName: string | null;
  evaporation: number | null;
  rating: Rating | null;
  createdAt: Date;
}): SavedRecipeVersionJson {
  return {
    version: row.version,
    recipe: row.recipe as LightRecipe,
    ...(row.comments != null && { comments: row.comments }),
    ...(row.label != null && { label: row.label }),
    ...(row.versionName != null && { versionName: row.versionName }),
    ...(row.evaporation != null && { evaporation: row.evaporation }),
    ...(row.rating != null && { rating: row.rating }),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * True when every field `meta` carries is well-formed: a valid version name and a rating on the
 * scale. The database enforces both too; checking here returns `undefined` instead of throwing.
 */
function isValidVersionMeta(meta: RecipeVersionMeta): boolean {
  if (meta.versionName != null && !isValidVersionName(meta.versionName)) return false;
  return meta.rating == null || isRating(meta.rating);
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
      favourite: recipesTable.favourite,
      version: recipeVersionsTable.version,
      recipe: recipeVersionsTable.recipe,
      comments: recipeVersionsTable.comments,
      label: recipeVersionsTable.label,
      versionName: recipeVersionsTable.versionName,
      evaporation: recipeVersionsTable.evaporation,
      rating: recipeVersionsTable.rating,
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
      grouped = {
        id: row.id,
        name: row.name,
        ...(row.favourite && { favourite: true }),
        versions: [],
      };
      byId.set(row.id, grouped);
    }
    grouped.versions.push(toSavedRecipeVersionJson(row));
  }

  const result = Array.from(byId.values());
  console.log(`fetchAllUserSavedRecipes: found ${result.length} recipes for userId=${user.id}`);
  return result;
}

/**
 * Internal: insert a new version row for the given recipe with `version = max(version) + 1`.
 *
 * `version` is an internal key; the displayed `versionName` follows the opt-in rule: an explicit
 * `meta.versionName` (trimmed) wins, otherwise a name is auto-materialized only once the recipe has
 * opted in (`nextVersionName`), else it stays null. Returns `undefined` on a unique-name collision.
 */
async function insertNextVersion(
  recipeId: number,
  recipe: LightRecipe,
  meta: RecipeVersionMeta = {},
): Promise<SavedRecipeVersionJson | undefined> {
  const rows = await db
    .select({ version: recipeVersionsTable.version, versionName: recipeVersionsTable.versionName })
    .from(recipeVersionsTable)
    .where(eq(recipeVersionsTable.recipeId, recipeId));

  const nextVersion = Math.max(0, ...rows.map((r) => r.version)) + 1;

  const versionName =
    meta.versionName !== undefined
      ? (meta.versionName?.trim() ?? null)
      : hasVersionNames(rows)
        ? nextVersionName(rows)
        : null;

  if (versionName != null && rows.some((r) => r.versionName === versionName)) {
    console.warn(`insertNextVersion: version name "${versionName}" already exists`);
    return undefined;
  }

  const [inserted] = await db
    .insert(recipeVersionsTable)
    .values({
      recipeId,
      version: nextVersion,
      recipe,
      comments: meta.comments ?? null,
      label: meta.label ?? null,
      versionName,
      evaporation: meta.evaporation ?? null,
      rating: meta.rating ?? null,
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

  if (!isValidVersionMeta(meta)) {
    console.warn(`createUserRecipe: invalid version metadata`);
    return undefined;
  }

  const [recipeRow] = await db.insert(recipesTable).values({ name, user: user.id }).returning();
  const version = await insertNextVersion(recipeRow.id, recipe, meta);

  // A fresh recipe has no prior versions, so the name pre-check can never fire; undefined is a bug
  verifyDefined(version, "createUserRecipe: insertNextVersion returned undefined for a new recipe");

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

  if (!isValidVersionMeta(meta)) {
    console.warn(`createUserRecipeVersion: invalid version metadata`);
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

  if (!isValidVersionMeta(updates)) {
    console.warn(`updateUserRecipeVersion: invalid version metadata`);
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
  if (updates.versionName !== undefined)
    setClause.versionName = updates.versionName?.trim() ?? null;
  if (updates.evaporation !== undefined) setClause.evaporation = updates.evaporation;
  if (updates.rating !== undefined) setClause.rating = updates.rating;

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
 * Set or clear the star on a user-owned recipe.
 *
 * Returns the updated row, or `undefined` if the user is not found or they don't own the recipe.
 */
export async function setUserRecipeFavourite(
  userEmail: string,
  recipeId: number,
  favourite: boolean,
): Promise<RecipeSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] setUserRecipeFavourite(${recipeId}, ${favourite})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`setUserRecipeFavourite: user not found`);
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    console.warn(`setUserRecipeFavourite: recipeId=${recipeId} not owned by userId=${user.id}`);
    return undefined;
  }

  const [row] = await db
    .update(recipesTable)
    .set({ favourite })
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
