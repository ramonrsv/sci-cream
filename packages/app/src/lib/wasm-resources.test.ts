import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { makeEmptyWasmResources, useFreeOnReplace } from "./wasm-resources";
import {
  OnConflict,
  Bridge as WasmBridge,
  allSpecEntries,
  specEntryName,
} from "@workspace/sci-cream";

describe("WasmResources", () => {
  // ---- makeEmptyWasmResources -----------------------------------------------------------------

  describe("makeEmptyWasmResources", () => {
    it("should initialize with empty wasmBridge", () => {
      const resources = makeEmptyWasmResources();
      expect(resources.wasmBridge).toBeInstanceOf(WasmBridge);
      expect(resources.wasmBridge.get_all_ingredients()).toHaveLength(0);
      expect(resources.updateIdx).toBe(0);
      expect(resources.hasIngredient("Whole Milk")).toBe(false);
    });
  });

  // ---- WasmResources.hasIngredient ------------------------------------------------------------

  describe("WasmResources.hasIngredient", () => {
    it("should return false for any ingredient when wasmBridge is empty", () => {
      const resources = makeEmptyWasmResources();
      expect(resources.hasIngredient("3.25% Milk")).toBe(false);
      expect(resources.hasIngredient("Whole Milk")).toBe(false);
      expect(resources.hasIngredient("Sucrose")).toBe(false);
    });

    it("should return true for ingredients present in wasmBridge", () => {
      const resources = makeEmptyWasmResources();
      resources.wasmBridge.seed_from_specs(
        [
          allSpecEntries.find((spec) => specEntryName(spec) === "3.25% Milk"),
          allSpecEntries.find((spec) => specEntryName(spec) === "Whole Milk"),
          allSpecEntries.find((spec) => specEntryName(spec) === "Sucrose"),
        ],
        OnConflict.Reject,
      );
      expect(resources.hasIngredient("3.25% Milk")).toBe(true);
      expect(resources.hasIngredient("Whole Milk")).toBe(true);
      expect(resources.hasIngredient("Sucrose")).toBe(true);
    });
  });

  // ---- useFreeOnReplace -----------------------------------------------------------------------

  describe("useFreeOnReplace", () => {
    type FakeFreeable = { free: ReturnType<typeof vi.fn<() => void>> };
    const makeFreeable = (): FakeFreeable => ({ free: vi.fn<() => void>() });
    const renderWith = (initial: FakeFreeable | null) =>
      renderHook(({ v }: { v: FakeFreeable | null }) => useFreeOnReplace(v), {
        initialProps: { v: initial },
      });

    it("does not free the current value on mount or same-value re-renders", () => {
      const a = makeFreeable();
      const { rerender } = renderWith(a);
      rerender({ v: a });
      expect(a.free).not.toHaveBeenCalled();
    });

    it("frees the previous value once a different one replaces it, never the new one", () => {
      const a = makeFreeable();
      const b = makeFreeable();
      const { rerender } = renderWith(a);
      rerender({ v: b });
      expect(a.free).toHaveBeenCalledTimes(1);
      expect(b.free).not.toHaveBeenCalled();
    });

    it("does not free the final value on unmount (left to the FinalizationRegistry)", () => {
      const a = makeFreeable();
      const { unmount } = renderWith(a);
      unmount();
      expect(a.free).not.toHaveBeenCalled();
    });

    it("frees the outgoing value when replaced by null", () => {
      const a = makeFreeable();
      const { rerender } = renderWith(a);
      expect(() => rerender({ v: null })).not.toThrow();
      expect(a.free).toHaveBeenCalledTimes(1);
    });

    it("swallows a double-free error thrown by the previous value's free()", () => {
      const a: FakeFreeable = {
        free: vi.fn<() => void>(() => {
          throw new Error("null pointer passed to rust");
        }),
      };
      const b = makeFreeable();
      const { rerender } = renderWith(a);
      expect(() => rerender({ v: b })).not.toThrow();
      expect(a.free).toHaveBeenCalledTimes(1);
    });
  });
});
