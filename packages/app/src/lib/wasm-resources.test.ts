import { describe, it, expect } from "vitest";

import { makeEmptyWasmResources } from "./wasm-resources";
import { Bridge as WasmBridge, allSpecEntries, specEntryName } from "@workspace/sci-cream";

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
      resources.wasmBridge.seed_from_specs([
        allSpecEntries.find((spec) => specEntryName(spec) === "3.25% Milk"),
        allSpecEntries.find((spec) => specEntryName(spec) === "Whole Milk"),
        allSpecEntries.find((spec) => specEntryName(spec) === "Sucrose"),
      ]);
      expect(resources.hasIngredient("3.25% Milk")).toBe(true);
      expect(resources.hasIngredient("Whole Milk")).toBe(true);
      expect(resources.hasIngredient("Sucrose")).toBe(true);
    });
  });
});
