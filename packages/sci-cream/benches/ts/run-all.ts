#!/usr/bin/env node
/// <reference types="node" />

console.log("Starting TypeScript benchmarks for @workspace/sci-cream\n");

(async () => {
  for (const bench of [
    "get_ingredient_specs.bench.ts",
    "get_ingredients.bench.ts",
    "into_ingredient_from_spec.bench.ts",
    "recipe-wasm-bridge.bench.ts",
    "key-accesses.bench.ts",
    "key-as-str.bench.ts",
    // Run last to avoid interference from WASM memory accumulation
    "free-vs-no-free-wasm.bench.ts",
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
