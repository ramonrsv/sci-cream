"use server";

import { eq, and, sql } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { Ingredient as IngredientDb, ingredientsTable } from "@/lib/database/schema";
import { findUserByEmail } from "@/lib/data/users";
import { log as baseLog } from "@/lib/log";

/** Server actions for a user's own ingredient specs. See `./users` on the `userEmail` argument. */

const log = baseLog.child({ mod: "data/ingredients" });

/** The database row type used to transfer ingredient data to the client */
export type IngredientTransfer = IngredientDb;

/**
 * Fetch a single ingredient spec by name for the given user
 *
 * Returns `undefined` if either the user is not found or the ingredient is not found for that user.
 */
export async function fetchUserIngredientSpecByName(
  userEmail: string,
  ingredientName: string,
): Promise<IngredientTransfer | undefined> {
  log.debug({ action: "fetchUserIngredientSpecByName", ingredientName }, "start");

  const user = await findUserByEmail(userEmail);
  if (!user) {
    log.warn({ action: "fetchUserIngredientSpecByName" }, "user not found");
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

/** Fetch all ingredient specs belonging to the given user; `undefined` if the user is not found */
export async function fetchAllUserIngredientSpecs(
  userEmail: string,
): Promise<IngredientTransfer[] | undefined> {
  log.debug({ action: "fetchAllUserIngredientSpecs" }, "start");

  const user = await findUserByEmail(userEmail);
  if (!user) {
    log.warn({ action: "fetchAllUserIngredientSpecs" }, "user not found");
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
