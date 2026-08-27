"use server";

import { eq, and, sql } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { Ingredient as IngredientDb, ingredientsTable } from "@/lib/database/schema";
import { makeAction } from "@/lib/data/support/action";
import { requireUser } from "@/lib/data/support/session";
import { DataError, ok, type Result } from "@/lib/result";
import { log } from "@/lib/log";

/** Server actions for a user's own ingredient specs. Identity comes from `requireUser()`. */

const action = makeAction(log.child({ mod: "data/ingredients" }));

/** The database row type used to transfer ingredient data to the client */
export type IngredientTransfer = IngredientDb;

/** Fetch one of the signed-in user's ingredient specs by name. */
export async function fetchUserIngredientSpecByName(
  ingredientName: string,
): Promise<Result<IngredientTransfer>> {
  const act = action("fetchUserIngredientSpecByName", { ingredientName });

  const user = await requireUser();
  if (!user) return act.refuse(DataError.Unauthenticated);

  const ingredient = (
    await db
      .select()
      .from(ingredientsTable)
      .where(and(eq(ingredientsTable.name, ingredientName), eq(ingredientsTable.user, user.id)))
  )[0];

  // Already scoped to this user, so a miss gives nothing away that they could not already see.
  if (!ingredient) {
    return act.refuse(DataError.NotFound, { ingredientName, userId: user.id });
  }

  return ok(ingredient);
}

/** Fetch all of the signed-in user's ingredient specs; an empty list is a success, not refusal. */
export async function fetchAllUserIngredientSpecs(): Promise<Result<IngredientTransfer[]>> {
  const act = action("fetchAllUserIngredientSpecs");

  const user = await requireUser();
  if (!user) return act.refuse(DataError.Unauthenticated);

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, user.id))
    .orderBy(sql`${ingredientsTable.name} COLLATE "C" ASC`);

  act.debug({ count: ingredients.length, userId: user.id }, "fetched");
  return ok(ingredients);
}
