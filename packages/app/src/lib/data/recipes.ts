"use server";

import { eq, and, sql } from "drizzle-orm";

import type { LightRecipe } from "@workspace/sci-cream";

import { db } from "@/lib/database/client";
import { isRating, type Rating } from "@/lib/rating";
import { hasVersionNames, isValidVersionName, nextVersionName } from "@/lib/recipe/version";
import { verifyDefined } from "@/lib/util";
import { recipesTable, recipeVersionsTable, RecipeSelect } from "@/lib/database/schema";
import { requireUser } from "@/lib/data/session";
import { log as baseLog } from "@/lib/log";

/** Server actions for saved recipes and their versions. Identity comes from `requireUser()`. */

const log = baseLog.child({ mod: "data/recipes" });

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

/** Fetch all of the signed-in user's saved recipes; `undefined` if there is no signed-in user. */
export async function fetchAllUserSavedRecipes(): Promise<SavedRecipeJson[] | undefined> {
  log.debug({ action: "fetchAllUserSavedRecipes" }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "fetchAllUserSavedRecipes" }, "no signed-in user");
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
  log.debug(
    { action: "fetchAllUserSavedRecipes", count: result.length, userId: user.id },
    "fetched",
  );
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
    log.warn({ action: "insertNextVersion", versionName }, "version name already exists");
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
 * Create a new saved recipe for the signed-in user, seeded with a single first version.
 *
 * Returns `undefined` if there is no signed-in user; throws if a recipe with `name` already exists
 * for them (the caller should disambiguate via {@link createUserRecipeVersion} instead).
 */
export async function createUserRecipe(
  name: string,
  recipe: LightRecipe,
  meta: RecipeVersionMeta = {},
): Promise<{ recipeId: number; version: SavedRecipeVersionJson } | undefined> {
  log.debug({ action: "createUserRecipe", recipeName: name }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "createUserRecipe" }, "no signed-in user");
    return undefined;
  }

  if (!isValidVersionMeta(meta)) {
    log.warn({ action: "createUserRecipe" }, "invalid version metadata");
    return undefined;
  }

  const [recipeRow] = await db.insert(recipesTable).values({ name, user: user.id }).returning();
  const version = await insertNextVersion(recipeRow.id, recipe, meta);

  // A fresh recipe has no prior versions, so the name pre-check can never fire; undefined is a bug
  verifyDefined(version, "createUserRecipe: insertNextVersion returned undefined for a new recipe");

  return { recipeId: recipeRow.id, version };
}

/**
 * Append a new version to a recipe the signed-in user owns, computing `version = max + 1`.
 * Returns `undefined` if there is no signed-in user or the recipe does not belong to them.
 */
export async function createUserRecipeVersion(
  recipeId: number,
  recipe: LightRecipe,
  meta: RecipeVersionMeta = {},
): Promise<SavedRecipeVersionJson | undefined> {
  log.debug({ action: "createUserRecipeVersion", recipeId }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "createUserRecipeVersion" }, "no signed-in user");
    return undefined;
  }

  if (!isValidVersionMeta(meta)) {
    log.warn({ action: "createUserRecipeVersion" }, "invalid version metadata");
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    log.warn(
      { action: "createUserRecipeVersion", recipeId, userId: user.id },
      "recipe not owned by user",
    );
    return undefined;
  }

  return insertNextVersion(recipeId, recipe, meta);
}

/**
 * Partially update an existing version of a recipe the signed-in user owns.
 *
 * Pass `null` in `meta` to clear the corresponding field; omit a key to leave it unchanged. Returns
 * `undefined` if there's no signed-in user, the recipe isn't theirs, or no matching version exists.
 */
export async function updateUserRecipeVersion(
  recipeId: number,
  version: number,
  updates: { recipe?: LightRecipe } & RecipeVersionMeta,
): Promise<SavedRecipeVersionJson | undefined> {
  log.debug({ action: "updateUserRecipeVersion", recipeId, version }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "updateUserRecipeVersion" }, "no signed-in user");
    return undefined;
  }

  if (!isValidVersionMeta(updates)) {
    log.warn({ action: "updateUserRecipeVersion" }, "invalid version metadata");
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    log.warn(
      { action: "updateUserRecipeVersion", recipeId, userId: user.id },
      "recipe not owned by user",
    );
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
 * Rename a recipe the signed-in user owns. Returns the renamed row, or `undefined` if there is no
 * signed-in user or the recipe is not theirs. Throws on `(user, name)` collision with another.
 */
export async function renameUserRecipe(
  recipeId: number,
  newName: string,
): Promise<RecipeSelect | undefined> {
  log.debug({ action: "renameUserRecipe", recipeId, newName }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "renameUserRecipe" }, "no signed-in user");
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    log.warn({ action: "renameUserRecipe", recipeId, userId: user.id }, "recipe not owned by user");
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
 * Set or clear the star on a recipe the signed-in user owns.
 * Returns the updated row, or `undefined` if there is no signed-in user or they don't own it.
 */
export async function setUserRecipeFavourite(
  recipeId: number,
  favourite: boolean,
): Promise<RecipeSelect | undefined> {
  log.debug({ action: "setUserRecipeFavourite", recipeId, favourite }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "setUserRecipeFavourite" }, "no signed-in user");
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    log.warn(
      { action: "setUserRecipeFavourite", recipeId, userId: user.id },
      "recipe not owned by user",
    );
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
 * Delete a saved recipe and all of its versions for the signed-in user.
 * Returns the deleted row, or `undefined` if nobody is signed in or no matching row existed.
 */
export async function deleteUserRecipe(recipeId: number): Promise<RecipeSelect | undefined> {
  log.debug({ action: "deleteUserRecipe", recipeId }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "deleteUserRecipe" }, "no signed-in user");
    return undefined;
  }

  const [row] = await db
    .delete(recipesTable)
    .where(and(eq(recipesTable.id, recipeId), eq(recipesTable.user, user.id)))
    .returning();

  return row;
}

/**
 * Delete a single version of a recipe the signed-in user owns. Refuses to delete the last remaining
 * version of a recipe to avoid orphaned `recipes` rows — call {@link deleteUserRecipe} for that.
 *
 * Returns the deleted version row, or `undefined` if nobody is signed in, the recipe is not theirs,
 * no matching version exists, or it is the last remaining version.
 */
export async function deleteUserRecipeVersion(
  recipeId: number,
  version: number,
): Promise<SavedRecipeVersionJson | undefined> {
  log.debug({ action: "deleteUserRecipeVersion", recipeId, version }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "deleteUserRecipeVersion" }, "no signed-in user");
    return undefined;
  }

  const owned = await findUserRecipe(user.id, recipeId);
  if (!owned) {
    log.warn(
      { action: "deleteUserRecipeVersion", recipeId, userId: user.id },
      "recipe not owned by user",
    );
    return undefined;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(recipeVersionsTable)
    .where(eq(recipeVersionsTable.recipeId, recipeId));

  if (Number(count) <= 1) {
    log.warn(
      { action: "deleteUserRecipeVersion" },
      "refusing to delete the last remaining version",
    );
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
