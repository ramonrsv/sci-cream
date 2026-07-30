#!/usr/bin/env node
/// <reference types="node" />

/**
 * Measure released-artifact sizes and emit results in the `github-action-benchmark@v1`
 * `customSmallerIsBetter` format consumed by the `size_benchmarks` CI job.
 *
 * Expects `pnpm build:package` to have run — reads the wasm-pack output from `wasm/` and the Vite
 * bundle from `dist/`. Writes results to `bench-results/bench_output_sizes.json`.
 *
 * Metrics tracked (raw on-disk bytes and gzip level-9, the over-the-wire proxy):
 *  - WASM binary (`wasm/index_bg.wasm`) — the core shipped artifact.
 *  - npm bundle (`dist/index.js`) — the ESM entry the app imports, with the WASM inlined by Vite.
 *  - wasm-bindgen JS glue (`wasm/index_bg.js` + `wasm/index.js`) — the JS wrapper wasm-pack emits.
 *
 * Also runs `npm pack --dry-run` to record the true shippable npm tarball footprint (packed and
 * unpacked) per the package's `files` field.
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

import {
  BenchmarkResult,
  formatByteSizeBenchmarkResultForUpload,
  writeBenchmarkResultsToFile,
} from "./util";

const PKG_DIR = process.cwd();
const WASM_DIR = path.join(PKG_DIR, "wasm");
const DIST_DIR = path.join(PKG_DIR, "dist");
const OUTPUT_FILENAME = "bench_output_sizes.json";

/** Return the raw byte size of the file at `filePath` */
function rawSize(filePath: string): number {
  return fs.statSync(filePath).size;
}

/** Return the gzipped size in bytes of the file at `filePath`, compressed at level 9 */
function gzipSize(filePath: string): number {
  return zlib.gzipSync(fs.readFileSync(filePath), { level: 9 }).length;
}

/** Sum raw byte sizes across a set of files */
function sumRaw(filePaths: string[]): number {
  return filePaths.reduce((total, fp) => total + rawSize(fp), 0);
}

/** Sum gzipped byte sizes across a set of files */
function sumGzip(filePaths: string[]): number {
  return filePaths.reduce((total, fp) => total + gzipSize(fp), 0);
}

/** Result object from `npm pack --dry-run --json` for a single package */
type NpmPackResult = { size: number; unpackedSize: number };

/** Run `npm pack --dry-run --json` and parse the packed and unpacked tarball sizes */
function npmPackSizes(): NpmPackResult {
  const stdout = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: PKG_DIR,
    encoding: "utf8",
  });
  const parsed = JSON.parse(stdout) as NpmPackResult[];
  return parsed[0];
}

/** Compute every tracked artifact-size metric and write the results JSON for CI to upload */
function main(): void {
  for (const dir of [WASM_DIR, DIST_DIR]) {
    if (!fs.existsSync(dir)) {
      console.error(
        `Error: ${dir} not found — run \`pnpm build:package\` before \`pnpm bench:size\`.`,
      );
      process.exit(1);
    }
  }

  const wasmBinary = path.join(WASM_DIR, "index_bg.wasm");
  const distBundle = path.join(DIST_DIR, "index.js");
  const glueFiles = [path.join(WASM_DIR, "index_bg.js"), path.join(WASM_DIR, "index.js")];

  const metric = (name: string, bytes: number): BenchmarkResult => ({ name, central: bytes });
  const pack = npmPackSizes();

  // All metrics in KB for uniform, fine-grained regression resolution on the dashboard.
  const metrics: BenchmarkResult[] = [
    metric("WASM binary (raw)", rawSize(wasmBinary)),
    metric("WASM binary (gzip)", gzipSize(wasmBinary)),
    metric("npm bundle dist/index.js (raw)", rawSize(distBundle)),
    metric("npm bundle dist/index.js (gzip)", gzipSize(distBundle)),
    metric("wasm-bindgen JS glue (raw)", sumRaw(glueFiles)),
    metric("wasm-bindgen JS glue (gzip)", sumGzip(glueFiles)),
    metric("npm package tarball (packed)", pack.size),
    metric("npm package tarball (unpacked)", pack.unpackedSize),
  ];

  console.log("Artifact size benchmarks:");
  for (const r of metrics)
    console.log(`  ${r.name.padEnd(36)} ${(r.central / 1024).toFixed(2).padStart(9)} KB`);

  writeBenchmarkResultsToFile(
    metrics.map((r) => formatByteSizeBenchmarkResultForUpload(r, "KB")),
    OUTPUT_FILENAME,
  );
}

main();
