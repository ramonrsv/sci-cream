#!/usr/bin/env node
/// <reference types="node" />

/**
 * Measure post-build bundle sizes and emit results in the `github-action-benchmark@v1`
 * `customSmallerIsBetter` format consumed by the `bundle_benchmarks` CI job.
 *
 * Expects `pnpm build` (i.e. `next build`) to have run — reads from `packages/app/.next/`. Writes
 * results to `packages/app/bench-results/bench_output_bundle.json`. The numbers measure the default
 * (Turbopack) production build; `pnpm build:analyze` forces Webpack - next/bundle-analyzer doesn't
 * support Turbopack - to provide a treemap, but may report slightly different chunk sizes.
 *
 * Metrics tracked (JS/CSS gzip-compressed at level 9; fonts measured raw — see below):
 *  - Shared framework JS: chunks loaded on every route (`rootMainFiles` + `polyfillFiles`).
 *  - `<route>` route-only JS: chunks referenced by that route's client modules, excluding shared.
 *  - `<route>` first-load JS: shared + route-only — what a user downloads on first visit.
 *  - Total static JS / CSS: walks every file under `.next/static/chunks/`. A lazy chunk added via
 *    `next/dynamic` shows up here but not in any route's first-load number — that delta is the
 *    payoff for code-splitting heavy deps (markdown, syntax highlighting, etc.).
 *  - Total fonts (raw): font files under `.next/static/media/`. On the preload critical path and
 *    low-noise, so gated alongside the JS/CSS metrics. Measured raw — woff2 is already compressed.
 *
 * Also emits a separate `bench_output_media.json` with one raw-byte metric for everything under
 * `.next/static/media/` (fonts, statically-imported images, icons). Its own file lets the CI step
 * report it track-only — a legitimate new image import grows it without gating the build.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

import {
  BenchmarkResult,
  formatByteSizeBenchmarkResultForUpload,
  writeBenchmarkResultsToFile,
} from "@/__benches__/util";

const APP_DIR = process.cwd();
const NEXT_DIR = path.join(APP_DIR, ".next");
const STATIC_CHUNKS_DIR = path.join(NEXT_DIR, "static", "chunks");
const STATIC_MEDIA_DIR = path.join(NEXT_DIR, "static", "media");
const OUTPUT_FILENAME = "bench_output_bundle.json";
const MEDIA_OUTPUT_FILENAME = "bench_output_media.json";

/** Font file extensions emitted under `.next/static/media`, for the gated fonts-only metric */
const FONT_EXTS = [".woff2", ".woff", ".ttf", ".otf", ".eot"];

/**
 * Routes whose per-route first-load JS we surface as individual metrics. Curated rather than
 * auto-discovered to keep the dashboard focused; add routes here as they grow important.
 */
const TRACKED_ROUTES: { route: string; label: string }[] = [
  { route: "calculator", label: "/calculator" },
  { route: "ingredients", label: "/ingredients" },
  { route: "recipes", label: "/recipes" },
  { route: "blog/[slug]", label: "/blog/[slug]" },
  { route: "docs/[slug]", label: "/docs/[slug]" },
];

/** Return the gzipped size in bytes of the file at `filePath`, compressed at level 9 */
function gzipSize(filePath: string): number {
  return zlib.gzipSync(fs.readFileSync(filePath), { level: 9 }).length;
}

/** Normalize chunk paths from either form (`static/...` or `/_next/static/...`) to manifest form */
function normalize(chunkPath: string): string {
  return chunkPath.startsWith("/_next/") ? chunkPath.slice("/_next/".length) : chunkPath;
}

/** Resolve a manifest-relative chunk path to an absolute filesystem path under `.next/` */
function chunkFsPath(chunkPath: string): string {
  return path.join(NEXT_DIR, normalize(chunkPath));
}

/** Sum gzipped bytes across a set of chunk paths; warns and skips any that aren't on disk */
function sumGzip(chunkPaths: Iterable<string>): number {
  let total = 0;
  for (const chunk of chunkPaths) {
    const fp = chunkFsPath(chunk);
    if (!fs.existsSync(fp)) {
      console.warn(`  ⚠ referenced chunk missing on disk: ${chunk}`);
      continue;
    }
    total += gzipSize(fp);
  }
  return total;
}

/** Read the global build manifest and return chunks shared across every route */
function readSharedChunks(): Set<string> {
  const p = path.join(NEXT_DIR, "build-manifest.json");
  const json = JSON.parse(fs.readFileSync(p, "utf8")) as {
    rootMainFiles?: string[];
    polyfillFiles?: string[];
  };
  return new Set<string>([...(json.rootMainFiles ?? []), ...(json.polyfillFiles ?? [])]);
}

/** Extract `/_next/static/chunks/...` references from a route's client-reference manifest */
function readRouteChunks(route: string): Set<string> {
  const p = path.join(NEXT_DIR, "server", "app", route, "page_client-reference-manifest.js");
  if (!fs.existsSync(p)) return new Set();
  const text = fs.readFileSync(p, "utf8");
  const matches = text.match(/\/_next\/static\/chunks\/[A-Za-z0-9_/.-]+\.(?:js|css)/g) ?? [];
  return new Set(matches.map(normalize));
}

/** Recursively walk `dir`, summing gzipped sizes of any file whose name ends with one of `exts` */
function walkSumGzip(dir: string, exts: string[]): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) total += walkSumGzip(fp, exts);
    else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) total += gzipSize(fp);
  }
  return total;
}

/** Recursively walk `dir`, summing raw bytes of files, filtered to `exts` when provided */
function walkSumRaw(dir: string, exts?: string[]): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) total += walkSumRaw(fp, exts);
    else if (entry.isFile() && (!exts || exts.some((e) => entry.name.endsWith(e))))
      total += fs.statSync(fp).size;
  }
  return total;
}

/** Compute every tracked bundle-size metric and write the results JSON for CI to upload */
function main(): void {
  if (!fs.existsSync(NEXT_DIR)) {
    console.error(
      `Error: ${NEXT_DIR} not found — run \`pnpm build\` before \`pnpm bench:bundle\`.`,
    );
    process.exit(1);
  }

  const sharedChunks = readSharedChunks();
  const sharedGz = sumGzip(sharedChunks);

  // Pack a byte-valued metric into a `BenchmarkResult`. File sizes are deterministic, so there's
  // no min/max/spread — only `name` and `central` (the gzipped byte count).
  const metric = (name: string, bytes: number) => ({ name, central: bytes });

  const results: BenchmarkResult[] = [metric("Shared framework JS (gzip)", sharedGz)];

  for (const { route, label } of TRACKED_ROUTES) {
    const routeChunks = readRouteChunks(route);
    if (routeChunks.size === 0) {
      console.warn(`  ⚠ no client-reference manifest for route ${route}, skipping`);
      continue;
    }
    const routeOnly = new Set<string>();
    for (const c of routeChunks) if (!sharedChunks.has(c)) routeOnly.add(c);

    const routeOnlyGz = sumGzip(routeOnly);
    results.push(metric(`${label} route-only JS (gzip)`, routeOnlyGz));
    results.push(metric(`${label} first-load JS (gzip)`, sharedGz + routeOnlyGz));
  }

  results.push(metric("Total static JS (gzip)", walkSumGzip(STATIC_CHUNKS_DIR, [".js"])));
  results.push(metric("Total static CSS (gzip)", walkSumGzip(STATIC_CHUNKS_DIR, [".css"])));
  results.push(metric("Total fonts (raw)", walkSumRaw(STATIC_MEDIA_DIR, FONT_EXTS)));

  // Full `.next/static/media` tree (fonts, images, icons), already compressed so measured raw.
  const mediaResults: BenchmarkResult[] = [
    metric("Total static media (raw)", walkSumRaw(STATIC_MEDIA_DIR)),
  ];

  console.log("Bundle size benchmarks:");
  for (const r of [...results, ...mediaResults])
    console.log(`  ${r.name.padEnd(48)} ${(r.central / 1024).toFixed(2).padStart(7)} KB`);

  writeBenchmarkResultsToFile(
    results.map((r) => formatByteSizeBenchmarkResultForUpload(r, "KB")),
    OUTPUT_FILENAME,
  );
  writeBenchmarkResultsToFile(
    mediaResults.map((r) => formatByteSizeBenchmarkResultForUpload(r, "KB")),
    MEDIA_OUTPUT_FILENAME,
  );
}

main();
