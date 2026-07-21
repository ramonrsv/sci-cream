"use client";

import { useEffect, useRef } from "react";

import {
  IngredientDatabase,
  new_ingredient_database_seeded_from_embedded_data,
  Bridge as WasmBridge,
} from "@workspace/sci-cream";

// `useSeededWasmResources` is defined in session-resources (it reads the shared resources from
// `SessionResourcesProvider`); re-exported here so it sits alongside the other resource helpers.
export { useSeededWasmResources } from "@/lib/resources/session-resources";

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

/** A wasm-bindgen object that owns a native pointer freed via `.free()` */
interface Freeable {
  free(): void;
}

/**
 * Deterministically free a wasm-bindgen object once a new instance supersedes it, never freeing the
 * instance currently being rendered.
 *
 * Freeing such objects in an effect *cleanup* is unsafe under React Strict Mode: its
 * setup → cleanup → setup mount cycle runs the cleanup without recomputing the `useMemo` that
 * produced the object, so it frees the live value that render still reads — surfacing as a
 * "null pointer passed to rust" crash on the next re-render. Instead this frees only the previous
 * value once a different one replaces it; the final instance is reclaimed by wasm-bindgen's
 * `FinalizationRegistry` when the component unmounts.
 *
 * `value` is compared by reference, so it must be stable across renders (typically from `useMemo`).
 */
export function useFreeOnReplace(value: Freeable | null | undefined): void {
  const prev = useRef<Freeable | null | undefined>(undefined);

  useEffect(() => {
    const previous = prev.current;
    prev.current = value;
    if (previous && previous !== value) {
      try {
        previous.free();
      } catch {
        // Already freed elsewhere (e.g. a concurrent update); the double-free is a no-op for us.
      }
    }
  }, [value]);
}
