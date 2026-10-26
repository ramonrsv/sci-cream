"use client";

import { useState } from "react";

import { RetainedStateContext } from "@/lib/hooks/use-retained-state";

/**
 * Provider for {@link useRetainedState}: owns the in-memory store, so retained values live as long
 * as the root layout — kept across client-side navigation, dropped on a reload.
 *
 * The store belongs to the instance, never the module, so nothing's shared between server requests.
 */
export function RetainedStateProvider({ children }: { children: React.ReactNode }) {
  const [retained] = useState(() => new Map<string, unknown>());

  return <RetainedStateContext value={retained}>{children}</RetainedStateContext>;
}
