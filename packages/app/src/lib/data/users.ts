import { eq } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { UserSelect, UserInsert, usersTable } from "@/lib/database/schema";
import { log as baseLog } from "@/lib/log";

/**
 * Lookups for user records, keyed by email.
 *
 * Not a `"use server"` module, and deliberately so: an email here is a lookup key for the layer
 * that runs before a session exists — credentials sign-in, OAuth account linking, signup — not a
 * caller naming itself. Exported as endpoints they would hand any browser a password hash and a
 * way to create users, so they stay internal, as `./session`'s helpers do.
 *
 * Actions that act on behalf of the signed-in user take no identifier at all; they call
 * `requireUser()` from `./session`.
 */

const log = baseLog.child({ mod: "data/users" });

/** Look up a user by email address; returns `undefined` if no matching user exists */
export async function findUserByEmail(email: string): Promise<UserSelect | undefined> {
  log.debug({ action: "findUserByEmail" }, "start");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    log.warn({ action: "findUserByEmail" }, "user not found");
    return undefined;
  }

  return user;
}

/** Insert a new user; throws if a user with the same email already exists */
export async function insertUser(user: UserInsert): Promise<UserInsert> {
  log.debug({ action: "insertUser" }, "start");

  const existing = await findUserByEmail(user.email);
  if (existing) throw new Error("User with this email already exists");

  const [inserted] = await db.insert(usersTable).values(user).returning();
  return inserted;
}
