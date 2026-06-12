#!/usr/bin/env node
/// <reference types="node" />

console.log("Starting TypeScript benchmarks for @workspace/sci-cream\n");

(async () => {
  for (const bench of [
    "comp-value-as.bench.ts",
    "get_ingredient_specs.bench.ts",
    "get_ingredients.bench.ts",
    "has_ingredient.bench.ts",
    "into_ingredient_from_spec.bench.ts",
    "is-key-type.bench.ts",
    "key-accesses.bench.ts",
    "key-as-str.bench.ts",
    "recipe-wasm-bridge.bench.ts",

    // Disable for now to avoid spurious CI failures; this benchmark was part of an investigation
    // into specific issues with WASM .free() calls, but is not valuable as an ongoing benchmark.
    //
    // Run last to avoid interference from WASM memory accumulation
    // "free-vs-no-free-wasm.bench.ts",
  ]) {
    try {
      console.log(`Running ${bench} benchmarks...`);
      console.log("=".repeat(60));
      await import(`./${bench}`);
      console.log();
    } catch (error) {
      console.error("Error running benchmarks:", error);
      process.exit(1);
    }
  }
})();
