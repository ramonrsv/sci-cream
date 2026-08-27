import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/database/client";
import { usersTable, type UserSelect } from "@/lib/database/schema";

/**
 * Session-derived identity for server actions.
 *
 * Actions that call these take no user identifier from the caller: a server action is an HTTP
 * endpoint, so any argument naming a user is a claim the client makes about itself. `auth()` reads
 * the signed session instead, which the client cannot forge.
 *
 * Not a `"use server"` module — these are helpers for actions, not endpoints in their own right.
 */

/** The signed-in user's row, or `undefined` when there is no session or no matching user. */
export async function requireUser(): Promise<UserSelect | undefined> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return undefined;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return user;
}

/** The signed-in user's row when they are an admin; `undefined` otherwise. */
export async function requireAdmin(): Promise<UserSelect | undefined> {
  const user = await requireUser();
  return user?.isAdmin ? user : undefined;
}
