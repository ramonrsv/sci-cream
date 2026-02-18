"use server";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { getDatabaseUrl } from "./db/util";
import { usersTable, User, ingredientsTable, Ingredient as IngredientDb } from "./db/schema";
import * as schema from "./db/schema";

const db = drizzle(getDatabaseUrl(), { schema });

export type IngredientTransfer = IngredientDb;

const app: User = { name: process.env.APP_USER_NAME!, email: process.env.APP_USER_EMAIL! };

async function getAppUserId() {
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.email, app.email));
  return foundUser.id;
}

const appUserId = await getAppUserId();

class FetchCounter {
  private static count = 0;

  static async get() {
    return this.count++;
  }
}

export async function fetchValidIngredientNames() {
  console.log(`[${await FetchCounter.get()}] fetchValidIngredientNames`);

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, appUserId));

  return ingredients.map((ing) => ing.name);
}

export async function fetchIngredientSpec(name: string): Promise<IngredientTransfer | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchIngredientSpec("${name}")`);

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(and(eq(ingredientsTable.name, name), eq(ingredientsTable.user, appUserId)));

  return ingredients.length === 0 || ingredients[0] === undefined ? undefined : ingredients[0];
}

export async function fetchAllIngredientSpecs(): Promise<IngredientTransfer[] | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchAllIngredientSpecs()`);

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, appUserId));

  console.log(`Fetched ${ingredients.length} ingredients`);
  return ingredients;
}
