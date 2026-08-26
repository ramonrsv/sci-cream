"use server";

import { eq, and, sql } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { Ingredient as IngredientDb, ingredientsTable } from "@/lib/database/schema";
import { requireUser } from "@/lib/data/session";
import { log as baseLog } from "@/lib/log";

/** Server actions for a user's own ingredient specs. Identity comes from `requireUser()`. */

const log = baseLog.child({ mod: "data/ingredients" });

/** The database row type used to transfer ingredient data to the client */
export type IngredientTransfer = IngredientDb;

/**
 * Fetch one of the signed-in user's ingredient specs by name.
 * Returns `undefined` if there is no signed-in user or they have no ingredient by that name.
 */
export async function fetchUserIngredientSpecByName(
  ingredientName: string,
): Promise<IngredientTransfer | undefined> {
  log.debug({ action: "fetchUserIngredientSpecByName", ingredientName }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "fetchUserIngredientSpecByName" }, "no signed-in user");
    return undefined;
  }

  const ingredient = (
    await db
      .select()
      .from(ingredientsTable)
      .where(and(eq(ingredientsTable.name, ingredientName), eq(ingredientsTable.user, user.id)))
  )[0];

  if (!ingredient) {
    log.warn(
      { action: "fetchUserIngredientSpecByName", ingredientName, userId: user.id },
      "ingredient not found",
    );
    return undefined;
  }

  return ingredient;
}

/** Fetch all of the signed-in user's ingredient specs; `undefined` if there is no signed-in user */
export async function fetchAllUserIngredientSpecs(): Promise<IngredientTransfer[] | undefined> {
  log.debug({ action: "fetchAllUserIngredientSpecs" }, "start");

  const user = await requireUser();
  if (!user) {
    log.warn({ action: "fetchAllUserIngredientSpecs" }, "no signed-in user");
    return undefined;
  }

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, user.id))
    .orderBy(sql`${ingredientsTable.name} COLLATE "C" ASC`);

  log.debug(
    { action: "fetchAllUserIngredientSpecs", count: ingredients.length, userId: user.id },
    "fetched",
  );
  return ingredients;
}
