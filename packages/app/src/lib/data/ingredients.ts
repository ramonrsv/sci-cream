"use server";

import { eq, and, sql } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { Ingredient as IngredientDb, ingredientsTable } from "@/lib/database/schema";
import { requireUser } from "@/lib/data/session";
import { DataError, ok, type Result } from "@/lib/result";
import { log as baseLog } from "@/lib/log";

/** Server actions for a user's own ingredient specs. Identity comes from `requireUser()`. */

const log = baseLog.child({ mod: "data/ingredients" });

/**
 * Log a refusal and return it, so a guard is one line where it stands.
 *
 * Every refusal is logged, the unauthenticated one included: the UI gates each action behind
 * `signedIn`, so reaching one anonymously means the gate failed or the endpoint was called direct.
 */
function refuse(
  action: string,
  error: DataError,
  ctx: Record<string, unknown> = {},
): { ok: false; error: DataError } {
  log.warn({ action, error, ...ctx }, "refused");
  return { ok: false, error };
}

/** The database row type used to transfer ingredient data to the client */
export type IngredientTransfer = IngredientDb;

/** Fetch one of the signed-in user's ingredient specs by name. */
export async function fetchUserIngredientSpecByName(
  ingredientName: string,
): Promise<Result<IngredientTransfer>> {
  log.debug({ action: "fetchUserIngredientSpecByName", ingredientName }, "start");

  const user = await requireUser();
  if (!user) return refuse("fetchUserIngredientSpecByName", DataError.Unauthenticated);

  const ingredient = (
    await db
      .select()
      .from(ingredientsTable)
      .where(and(eq(ingredientsTable.name, ingredientName), eq(ingredientsTable.user, user.id)))
  )[0];

  // Already scoped to this user, so a miss gives nothing away that they could not already see.
  if (!ingredient) {
    return refuse("fetchUserIngredientSpecByName", DataError.NotFound, {
      ingredientName,
      userId: user.id,
    });
  }

  return ok(ingredient);
}

/** Fetch all of the signed-in user's ingredient specs; an empty list is a success, not refusal. */
export async function fetchAllUserIngredientSpecs(): Promise<Result<IngredientTransfer[]>> {
  log.debug({ action: "fetchAllUserIngredientSpecs" }, "start");

  const user = await requireUser();
  if (!user) return refuse("fetchAllUserIngredientSpecs", DataError.Unauthenticated);

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, user.id))
    .orderBy(sql`${ingredientsTable.name} COLLATE "C" ASC`);

  log.debug(
    { action: "fetchAllUserIngredientSpecs", count: ingredients.length, userId: user.id },
    "fetched",
  );
  return ok(ingredients);
}
