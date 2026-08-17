"use server";

import { eq, and, sql } from "drizzle-orm";

import type { LightRecipe } from "@workspace/sci-cream";

import type { BatchRecipeVersion } from "@/lib/batch/batch";
import { db } from "@/lib/database/client";
import { batchesTable, batchRecipesTable, BatchSelect } from "@/lib/database/schema";
import { findUserByEmail } from "@/lib/data/users";
import { FetchCounter } from "@/lib/data/util";

/** Server actions for saved batches and their recipes. See `./users`, `userEmail` argument. */

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
