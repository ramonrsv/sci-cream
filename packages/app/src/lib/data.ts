"use server";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { getDatabaseUrl, TEST_USER_A } from "./database/util";
import {
  UserSelect,
  UserInsert,
  usersTable,
  Ingredient as IngredientDb,
  ingredientsTable,
} from "./database/schema";
import * as schema from "./database/schema";

const db = drizzle(getDatabaseUrl(), { schema });

export type IngredientTransfer = IngredientDb;

class FetchCounter {
  private static count = 0;

  static async get() {
    return this.count++;
  }
}

export async function findUserByEmail(email: string): Promise<UserSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] findUserByEmail("${email}")`);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return user;
}

export async function insertUser(user: UserInsert): Promise<UserInsert> {
  console.log(`[${await FetchCounter.get()}] insertUser(${JSON.stringify(user)})`);

  const existing = await findUserByEmail(user.email);
  if (existing) throw new Error("User with this email already exists");

  const [inserted] = await db.insert(usersTable).values(user).returning();
  return inserted;
}

export async function fetchValidIngredientNames(): Promise<string[]> {
  console.log(`[${await FetchCounter.get()}] fetchValidIngredientNames`);

  const testUserId = (await findUserByEmail(TEST_USER_A.email))!.id;

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, testUserId));

  return ingredients.map((ing) => ing.name);
}

export async function fetchIngredientSpec(name: string): Promise<IngredientTransfer | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchIngredientSpec("${name}")`);

  const testUserId = (await findUserByEmail(TEST_USER_A.email))!.id;

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(and(eq(ingredientsTable.name, name), eq(ingredientsTable.user, testUserId)));

  return ingredients.length === 0 || ingredients[0] === undefined ? undefined : ingredients[0];
}

export async function fetchAllIngredientSpecs(): Promise<IngredientTransfer[] | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchAllIngredientSpecs()`);

  const testUserId = (await findUserByEmail(TEST_USER_A.email))!.id;

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, testUserId));

  console.log(`Fetched ${ingredients.length} ingredients`);
  return ingredients;
}
