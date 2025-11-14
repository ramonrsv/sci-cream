'use server';

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { usersTable, User, ingredientsTable, Ingredient as IngredientDb } from "./db/schema";
import * as schema from "./db/schema";
import { sleep_ms } from "./util";

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

const appUserId = await getAppUserId();

class FetchCounter {
  private static count = 0;

  static async get() {
    // @todo Simulate network latency for testing purposes
    await sleep_ms(500);
    return this.count++;
  }
}

export async function fetchValidIngredientNames() {
  console.log(`[${await FetchCounter.get()}] fetchValidIngredientNames`);

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, appUserId));

  return ingredients.map(ing => ing.name);
}

export async function fetchIngredient(name: string): Promise<IngredientTransfer | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchIngredient("${name}")`);

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(and(eq(ingredientsTable.name, name), eq(ingredientsTable.user, appUserId)));

  return (ingredients.length === 0 || ingredients[0] === undefined) ? undefined : ingredients[0];
}
