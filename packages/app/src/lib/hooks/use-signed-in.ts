"use client";

import { useSession } from "next-auth/react";

/**
 * Whether a session is established, as opposed to absent or still loading.
 *
 * The client-side question worth asking now that no action takes a user identifier: it gates the
 * controls that only a signed-in user can work (save, star, delete), while the server decides for
 * itself via {@link requireUser()}. Callers needing the session itself — a user id, a display name,
 * or `loading` told apart from `unauthenticated` — should use {@link useSession} directly.
 */
export function useSignedIn(): boolean {
  return useSession().status === "authenticated";
}
