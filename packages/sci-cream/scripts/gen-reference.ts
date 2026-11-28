/**
 * Codegen: the crate's rendered `sci_cream::docs` page -> the app's Reference.
 *
 * Cuts the page `pnpm doc:site` renders into the chapters `docs/_chapters.json` lists
 * (`lib/reference.ts`), and writes them to the gitignored `docs/generated/reference/`, which
 * `src/ts/` serves to the app:
 *   - `chapters.json`, through the `./reference` entry: the route root, and each chapter's slug,
 *     title, description, and HTML
 *   - `anchors.json`, through the main entry's `referenceAnchorUrl`: the URL of every anchor a
 *     chapter defines, by id
 *
 * It reads the docs `doc:site` writes rather than building them, so `gen:all` and `build:package`
 * run it after `gen:data`, which builds them, and `build:package` before `build:js`, which bundles
 * its output.
 *
 * `node --import tsx scripts/gen-reference.ts [--check]`; `--check` cuts and validates the
 * chapters without writing them.
 */
import fs from "node:fs";
import path from "node:path";

import { readReference } from "./lib/reference";

const OUT_DIR = path.resolve(import.meta.dirname, "../docs/generated/reference");

const { root, chapters, anchors } = readReference();
const summary = `${chapters.length} chapters, ${Object.keys(anchors).length} anchors`;

if (process.argv.includes("--check")) {
  console.log(`gen-reference --check: ${summary}, all accounted for.`);
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const write = (file: string, value: unknown) =>
    fs.writeFileSync(path.join(OUT_DIR, file), `${JSON.stringify(value, null, 2)}\n`);
  write("chapters.json", { root, chapters });
  write("anchors.json", anchors);
  console.log(`gen-reference: wrote ${summary}.`);
}
