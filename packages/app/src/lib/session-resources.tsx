"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { OnConflict } from "@workspace/sci-cream";

import {
  fetchAllUserIngredientSpecs,
  fetchAllUserSavedRecipes,
  type IngredientTransfer,
  type SavedRecipeJson,
} from "@/lib/data";
import {
  makeWasmResources,
  makeWasmResourcesFromEmbeddedData,
  type WasmResourcesState,
} from "@/lib/wasm-resources";

/**
 * Session-scoped resources shared across every route.
 *
 * The provider mounts once for the lifetime of the client session (it lives in the root layout,
 * above the router outlet, so it survives `<Link>` navigations) and holds the single WASM bridge
 * plus the user's saved recipes and ingredient specs. This eliminates the per-navigation bridge
 * rebuilds and redundant DB round-trips that arise when each route fetches and seeds on its own.
 */
export interface SessionResources {
  /** The one shared {@link WasmResourcesState}; read via {@link useSeededWasmResources}. */
  wasmResourcesState: WasmResourcesState;
  /** The user's saved ingredient specs, fetched once per session and refreshed after mutations. */
  userIngredientSpecs: IngredientTransfer[];
  /** The user's saved recipes, fetched once per session and refreshed after mutations. */
  savedRecipes: SavedRecipeJson[];
  /** Re-fetch and reseed the user's ingredient specs (call after an ingredient mutation). */
  refreshUserIngredients: () => Promise<void>;
  /** Re-fetch the user's saved recipes into the shared cache (call after a recipe mutation). */
  refreshUserRecipes: () => Promise<void>;
}

/**
 * Lazily-created fallback bridge for components rendered outside a {@link SessionResourcesProvider}
 * (chiefly unit tests). Created on first access so the real app — which always supplies a provider
 * that overrides the context value — never builds this throwaway bridge.
 */
let fallbackWasmResourcesState: WasmResourcesState | undefined;

/** Returns the lazily-initialized module-level fallback {@link WasmResourcesState}. */
function getFallbackWasmResourcesState(): WasmResourcesState {
  fallbackWasmResourcesState ??= [makeWasmResourcesFromEmbeddedData(), () => {}];
  return fallbackWasmResourcesState;
}

/** Context carrying the session-scoped shared resources; see {@link SessionResources}. */
const SessionResourcesContext = createContext<SessionResources>({
  get wasmResourcesState() {
    return getFallbackWasmResourcesState();
  },
  userIngredientSpecs: [],
  savedRecipes: [],
  refreshUserIngredients: () => Promise.resolve(),
  refreshUserRecipes: () => Promise.resolve(),
});

/** Reads the session-scoped shared resources from any child of {@link SessionResourcesProvider}. */
export function useSessionResources(): SessionResources {
  return useContext(SessionResourcesContext);
}

/**
 * Reads the shared {@link WasmResourcesState} tuple from {@link SessionResourcesProvider}.
 *
 * A focused accessor for consumers that need only the WASM bridge (and its `updateIdx`): the
 * bridge is the single session-scoped instance, seeded from embedded data plus the user's specs.
 */
export function useSeededWasmResources(): WasmResourcesState {
  return useSessionResources().wasmResourcesState;
}

/**
 * Provides the session-scoped {@link SessionResources}: the single WASM bridge (seeded from
 * embedded data, then reseeded with the user's specs) and the user's recipe/ingredient caches.
 *
 * Both caches are fetched once when the session email becomes available and refreshed explicitly
 * via {@link SessionResources.refreshUserRecipes} / {@link SessionResources.refreshUserIngredients}
 * after mutations. The bridge object identity is stable across reseeds — only `updateIdx` and the
 * `WasmResources` wrapper change — so it is never `.free()`d here.
 */
export function SessionResourcesProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const email = session?.user?.email;

  const wasmResourcesState = useState(makeWasmResourcesFromEmbeddedData);
  const [resources, setResources] = wasmResourcesState;

  // The bridge identity never changes (reseeds mutate it in place), so capturing it once is safe
  // and keeps it out of the refresh callback's deps, avoiding a re-fetch loop on updateIdx bumps.
  const bridgeRef = useRef(resources.wasmBridge);

  const [userIngredientSpecs, setUserIngredientSpecs] = useState<IngredientTransfer[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeJson[]>([]);

  const refreshUserIngredients = useCallback(async () => {
    if (!email) return;

    const rows = (await fetchAllUserIngredientSpecs(email)) ?? [];
    setUserIngredientSpecs(rows);

    // Reset to the embedded baseline, then overlay the user's specs overwriting any collisions.
    const bridge = bridgeRef.current;
    bridge.clear();
    bridge.seed_from_embedded_data(OnConflict.Reject);
    bridge.seed_from_specs(
      rows.map((row) => row.spec),
      OnConflict.Overwrite,
    );

    setResources((prev) => makeWasmResources(prev.wasmBridge, prev.updateIdx + 1));
  }, [email, setResources]);

  const refreshUserRecipes = useCallback(async () => {
    if (!email) return;

    const recipes = await fetchAllUserSavedRecipes(email);
    setSavedRecipes(recipes ?? []);
  }, [email]);

  // Fetch once per session, keyed on email so a flickering `useSession` can't re-fire the effect.
  // Ingredients go first: the bridge depends on them, and server actions run serially.
  const loadedForEmailRef = useRef<string | undefined>(undefined);

  // The refresh callbacks set state only after awaiting their fetch, not synchronously here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!email || loadedForEmailRef.current === email) return;
    loadedForEmailRef.current = email;
    void refreshUserIngredients();
    void refreshUserRecipes();
  }, [email, refreshUserIngredients, refreshUserRecipes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const value: SessionResources = {
    wasmResourcesState,
    savedRecipes,
    userIngredientSpecs,
    refreshUserRecipes,
    refreshUserIngredients,
  };

  return <SessionResourcesContext value={value}>{children}</SessionResourcesContext>;
}
