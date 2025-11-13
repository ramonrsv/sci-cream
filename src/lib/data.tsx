'use server';

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { usersTable, User, ingredientsTable, Ingredient as IngredientDb } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";

const db = drizzle(process.env.DATABASE_URL!, { schema });

export type IngredientTransfer = IngredientDb;

const app: User = {
  name: process.env.APP_USER_NAME!,
  email: process.env.APP_USER_EMAIL!,
};

async function getAppUserId() {
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.email, app.email));

  return foundUser.id;
}

export async function fetchAvailableIngredientNames() {
  const appUserId = await getAppUserId();

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, appUserId));

  return ingredients.map(ing => ing.name);
}

async function fetchIngredient(appUserId: number, name: string): Promise<IngredientTransfer | undefined> {
  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(and(eq(ingredientsTable.name, name), eq(ingredientsTable.user, appUserId)));

  return (ingredients.length === 0 || ingredients[0] === undefined) ? undefined : ingredients[0];
}

export async function fetchRecipeIngredients(names: string[]): Promise<(IngredientTransfer | undefined)[]> {
  const appUserId = await getAppUserId();

  return Promise.all(names.map(async name => {
    return name ? await fetchIngredient(appUserId, name) : undefined;
  }));
}