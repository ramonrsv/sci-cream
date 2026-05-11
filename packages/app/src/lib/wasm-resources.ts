"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

import { fetchAllUserIngredientSpecs } from "@/lib/data";
import {
  IngredientDatabase,
  new_ingredient_database_seeded_from_embedded_data,
  Bridge as WasmBridge,
} from "@workspace/sci-cream";

/** Shared WASM resources: the bridge used for ingredient lookups and mix-property calculations */
export interface WasmResources {
  updateIdx: number;
  wasmBridge: WasmBridge;
  hasIngredient(name: string): boolean;
}

/** `useState` tuple for `WasmResources`, passed between components that read/update resources */
export type WasmResourcesState = [
  WasmResources,
  React.Dispatch<React.SetStateAction<WasmResources>>,
];

/** Wrap a `WasmBridge` in a `WasmResources` object, creating a `hasIngredient` helper object */
export function makeWasmResources(wasmBridge: WasmBridge, updateIdx: number = 0): WasmResources {
  return {
    updateIdx,
    wasmBridge,
    hasIngredient: (name: string) => wasmBridge.has_ingredient(name),
  };
}

/** Create a `WasmResources` backed by an empty (unseeded) ingredient database */
export function makeEmptyWasmResources(): WasmResources {
  return makeWasmResources(new WasmBridge(new IngredientDatabase()));
}

/** Create a `WasmResources` backed by the embedded (bundled) ingredient database */
export function makeWasmResourcesFromEmbeddedData(): WasmResources {
  return makeWasmResources(new WasmBridge(new_ingredient_database_seeded_from_embedded_data()));
}

/**
 * Creates a {@link WasmResources} backed by the embedded ingredient database, then seeds it
 * with any user-defined specs once a session is available.
 *
 * Returns the state tuple so callers can pass it directly to components that accept
 * {@link WasmResourcesState}, and so that downstream components re-render after seeding via the
 * incremented `updateIdx`.
 */
export function useSeededWasmResources(): WasmResourcesState {
  const { data: session } = useSession();
  const resourcesState = useState(makeWasmResourcesFromEmbeddedData);
  const [resources, setResources] = resourcesState;

  useEffect(() => {
    if (session?.user?.email) {
      fetchAllUserIngredientSpecs(session.user.email).then((userSpecs) => {
        resources.wasmBridge.seed_from_specs((userSpecs ?? []).map((s) => s.spec));
        setResources((prev) => ({ ...prev, updateIdx: prev.updateIdx + 1 }));
      });
    }
  }, [session?.user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  return resourcesState;
}
