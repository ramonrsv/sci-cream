#!/usr/bin/env node
/// <reference types="node" />

console.log("Starting TypeScript benchmarks for @workspace/sci-cream\n");

(async () => {
  for (const bench of [
    "ingredients.bench.ts",
    "into_ingredient_from_spec.ts",
    "recipe-wasm-bridge.bench.ts",
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
