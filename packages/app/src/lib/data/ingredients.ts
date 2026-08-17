"use server";

import { eq, and, sql } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { Ingredient as IngredientDb, ingredientsTable } from "@/lib/database/schema";
import { findUserByEmail } from "@/lib/data/users";
import { FetchCounter } from "@/lib/data/util";

/** Server actions for a user's own ingredient specs. See `./users` on the `userEmail` argument. */

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
