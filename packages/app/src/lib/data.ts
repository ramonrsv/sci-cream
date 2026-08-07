"use server";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, sql } from "drizzle-orm";

import type { LightRecipe } from "@workspace/sci-cream";

import type { BatchRecipeVersion } from "@/lib/batch/batch";
import { getDatabaseUrl } from "@/lib/database/util";
import { isRating, type Rating } from "@/lib/rating";
import { hasVersionNames, isValidVersionName, nextVersionName } from "@/lib/recipe/version";
import { verifyDefined } from "@/lib/util";
import {
  UserSelect,
  UserInsert,
  usersTable,
  Ingredient as IngredientDb,
  ingredientsTable,
  recipesTable,
  recipeVersionsTable,
  RecipeSelect,
  batchesTable,
  batchRecipesTable,
  BatchSelect,
} from "@/lib/database/schema";
import * as schema from "@/lib/database/schema";

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

/**
 * One recipe within a saved batch; `rows` are the `[name, grams]` amounts exactly as weighed
 *
 * This is virtually a clone of {@link BatchRecipe}, with minor differences for database
 * compatibility e.g. `color` is a string (the display name) rather than a `CategoryColor`.
 */
export type SavedBatchRecipeJson = {
  name: string;
  rows: LightRecipe;
  /** The saved version this recipe came from, and its snapshotted display hints, if any. */
  version?: BatchRecipeVersion;
  /** Container color as its display name (e.g. `"Blue"`); absent when the recipe carries no pick */
  color?: string;
};

/** A saved batch with its recipes in weighing order */
export type SavedBatchJson = {
  id: number;
  title?: string;
  date: string;
  notes?: string;
  favourite?: boolean;
  recipes: SavedBatchRecipeJson[];
  /** ISO 8601 timestamps, surfaced as strings for client serialization */
  createdAt: string;
  updatedAt: string;
};

/**
 * Client-supplied batch contents to create or replace; identity and timestamps are excluded.
 *
 * So is `favourite`: {@link updateUserBatch} replaces a batch wholesale, so a star carried here
 * would be cleared by any save made from a pre-star copy. See {@link setUserBatchFavourite}.
 */
export type BatchInput = {
  title?: string;
  date: string;
  notes?: string;
  recipes: SavedBatchRecipeJson[];
};

/** Build the `batch_recipes` insert rows for a batch, numbering positions from the array order */
function toBatchRecipeInserts(batchId: number, recipes: readonly SavedBatchRecipeJson[]) {
  return recipes.map((recipe, position) => ({
    batchId,
    position,
    name: recipe.name,
    rows: recipe.rows,
    color: recipe.color ?? null,
    recipeId: recipe.version?.ref?.recipeId ?? null,
    versionNumber: recipe.version?.ref?.versionNumber ?? null,
    versionName: recipe.version?.name ?? null,
    hasSiblings: recipe.version?.hasSiblings ?? null,
  }));
}

/** Reassemble one row's flat version columns into the nested {@link BatchRecipeVersion} shape. */
function toBatchRecipeVersion(row: {
  recipeId: number | null;
  versionNumber: number | null;
  versionName: string | null;
  hasSiblings: boolean | null;
}): BatchRecipeVersion | undefined {
  if (row.recipeId == null && row.versionName == null) return undefined;
  return {
    ...(row.recipeId != null &&
      row.versionNumber != null && {
        ref: { recipeId: row.recipeId, versionNumber: row.versionNumber },
      }),
    ...(row.versionName != null && { name: row.versionName }),
    ...(row.hasSiblings != null && { hasSiblings: row.hasSiblings }),
  };
}

/** Convert a joined `batches` + `batch_recipes` result into the grouped {@link SavedBatchJson} */
function toSavedBatchJson(
  batch: BatchSelect,
  recipeRows: {
    position: number;
    name: string;
    rows: unknown;
    color: string | null;
    recipeId: number | null;
    versionNumber: number | null;
    versionName: string | null;
    hasSiblings: boolean | null;
  }[],
): SavedBatchJson {
  return {
    id: batch.id,
    ...(batch.title != null && { title: batch.title }),
    date: batch.date,
    ...(batch.notes != null && { notes: batch.notes }),
    ...(batch.favourite && { favourite: true }),
    recipes: recipeRows
      .sort((a, b) => a.position - b.position)
      .map((row) => {
        const version = toBatchRecipeVersion(row);
        return {
          name: row.name,
          rows: row.rows as LightRecipe,
          ...(row.color != null && { color: row.color }),
          ...(version && { version }),
        };
      }),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

/**
 * Verify the given batch belongs to the given user; returns the batch row or `undefined`.
 *
 * Centralizes the ownership check every batch-mutating action performs, preventing one user from
 * reading or modifying another's batches by guessing `batchId` values.
 */
async function findUserBatch(userId: number, batchId: number): Promise<BatchSelect | undefined> {
  const [row] = await db
    .select()
    .from(batchesTable)
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.user, userId)));
  return row;
}

/** Fetch all saved batches belonging to the given user, newest first; `undefined` if not found. */
export async function fetchAllUserBatches(
  userEmail: string,
): Promise<SavedBatchJson[] | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchAllUserBatches`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`fetchAllUserBatches: user not found`);
    return undefined;
  }

  const rows = await db
    .select({
      id: batchesTable.id,
      title: batchesTable.title,
      date: batchesTable.date,
      notes: batchesTable.notes,
      favourite: batchesTable.favourite,
      user: batchesTable.user,
      createdAt: batchesTable.createdAt,
      updatedAt: batchesTable.updatedAt,
      position: batchRecipesTable.position,
      name: batchRecipesTable.name,
      recipe: batchRecipesTable.rows,
      color: batchRecipesTable.color,
      recipeId: batchRecipesTable.recipeId,
      versionNumber: batchRecipesTable.versionNumber,
      versionName: batchRecipesTable.versionName,
      hasSiblings: batchRecipesTable.hasSiblings,
    })
    .from(batchesTable)
    .leftJoin(batchRecipesTable, eq(batchRecipesTable.batchId, batchesTable.id))
    .where(eq(batchesTable.user, user.id))
    .orderBy(sql`${batchesTable.createdAt} DESC`, sql`${batchRecipesTable.position} ASC`);

  // Group the flat join into one entry per batch, preserving the newest-first order of the query.
  const byId = new Map<
    number,
    { batch: BatchSelect; recipes: Parameters<typeof toSavedBatchJson>[1] }
  >();

  for (const row of rows) {
    let grouped = byId.get(row.id);
    if (!grouped) {
      grouped = {
        batch: {
          id: row.id,
          user: row.user,
          title: row.title,
          date: row.date,
          notes: row.notes,
          favourite: row.favourite,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        recipes: [],
      };
      byId.set(row.id, grouped);
    }

    // A `leftJoin` yields one all-null recipe row for a batch with no recipes; skip it.
    if (row.position !== null && row.name !== null) {
      grouped.recipes.push({
        position: row.position,
        name: row.name,
        rows: row.recipe,
        color: row.color,
        recipeId: row.recipeId,
        versionNumber: row.versionNumber,
        versionName: row.versionName,
        hasSiblings: row.hasSiblings,
      });
    }
  }

  const result = Array.from(byId.values()).map(({ batch, recipes }) =>
    toSavedBatchJson(batch, recipes),
  );
  console.log(`fetchAllUserBatches: found ${result.length} batches for userId=${user.id}`);
  return result;
}

/** Create a new batch for the given user; returns the stored batch, or `undefined` if not found. */
export async function createUserBatch(
  userEmail: string,
  input: BatchInput,
): Promise<SavedBatchJson | undefined> {
  console.log(`[${await FetchCounter.get()}] createUserBatch`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`createUserBatch: user not found`);
    return undefined;
  }

  return db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(batchesTable)
      .values({
        user: user.id,
        title: input.title ?? null,
        date: input.date,
        notes: input.notes ?? null,
      })
      .returning();

    const recipeRows =
      input.recipes.length === 0
        ? []
        : await tx
            .insert(batchRecipesTable)
            .values(toBatchRecipeInserts(batch.id, input.recipes))
            .returning();

    return toSavedBatchJson(batch, recipeRows);
  });
}

/**
 * Replace the contents of a user-owned batch in place, re-numbering recipe positions from the new
 * order. Returns the updated batch, or `undefined` if the user is not found or the batch is not
 * theirs. The recipe rows are deleted and re-inserted, so any checkoff progress keyed on weighing
 * content survives only when that content is unchanged — by design.
 */
export async function updateUserBatch(
  userEmail: string,
  batchId: number,
  input: BatchInput,
): Promise<SavedBatchJson | undefined> {
  console.log(`[${await FetchCounter.get()}] updateUserBatch(${batchId})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`updateUserBatch: user not found`);
    return undefined;
  }

  const owned = await findUserBatch(user.id, batchId);
  if (!owned) {
    console.warn(`updateUserBatch: batchId=${batchId} not owned by userId=${user.id}`);
    return undefined;
  }

  return db.transaction(async (tx) => {
    const [batch] = await tx
      .update(batchesTable)
      .set({
        title: input.title ?? null,
        date: input.date,
        notes: input.notes ?? null,
        updatedAt: sql`now()`,
      })
      .where(eq(batchesTable.id, batchId))
      .returning();

    await tx.delete(batchRecipesTable).where(eq(batchRecipesTable.batchId, batchId));

    const recipeRows =
      input.recipes.length === 0
        ? []
        : await tx
            .insert(batchRecipesTable)
            .values(toBatchRecipeInserts(batchId, input.recipes))
            .returning();

    return toSavedBatchJson(batch, recipeRows);
  });
}

/**
 * Set or clear the star on a user-owned batch. Returns the updated row, or `undefined` if the user
 * is not found or the batch is not owned by them. Kept out of {@link updateUserBatch}, which
 * replaces a batch wholesale and would let a stale editor copy clear the star.
 */
export async function setUserBatchFavourite(
  userEmail: string,
  batchId: number,
  favourite: boolean,
): Promise<BatchSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] setUserBatchFavourite(${batchId}, ${favourite})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`setUserBatchFavourite: user not found`);
    return undefined;
  }

  const owned = await findUserBatch(user.id, batchId);
  if (!owned) {
    console.warn(`setUserBatchFavourite: batchId=${batchId} not owned by userId=${user.id}`);
    return undefined;
  }

  const [row] = await db
    .update(batchesTable)
    .set({ favourite })
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.user, user.id)))
    .returning();

  return row;
}

/**
 * Delete a user-owned batch and all of its recipes (cascade). Returns the deleted batch row, or
 * `undefined` if the user was not found or no matching batch existed.
 */
export async function deleteUserBatch(
  userEmail: string,
  batchId: number,
): Promise<BatchSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] deleteUserBatch(${batchId})`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`deleteUserBatch: user not found`);
    return undefined;
  }

  const [row] = await db
    .delete(batchesTable)
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.user, user.id)))
    .returning();

  return row;
}
