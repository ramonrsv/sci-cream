"use client";

import { createContext, useContext } from "react";

import type { IngredientTransfer, SavedRecipeJson } from "@/lib/data";
import { makeWasmResourcesFromEmbeddedData, type WasmResourcesState } from "@/lib/wasm-resources";

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
export const SessionResourcesContext = createContext<SessionResources>({
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
