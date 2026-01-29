#!/usr/bin/env node
/// <reference types="node" />

console.log("Starting TypeScript benchmarks for packages/app\n");

(async () => {
  for (const bench of ["key-as-str.bench.ts"]) {
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
