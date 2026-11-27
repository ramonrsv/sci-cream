/**
 * Codegen: markdown data sources -> JSON consumed by the crate and the app.
 *
 * Source of truth is `data/{ingredients,recipes}/<name>.md`: a title, an optional intro, then the
 * entries, each a level-2 section:
 *
 *   # <title>
 *
 *   <intro: markdown notes on every entry below>
 *
 *   ## <name>
 *
 *   ```json
 *   { "category": "...", "<Spec>": { ... } }   // a `for` key instead marks an alias
 *   ```
 *
 *   <markdown comment body, may cite shared references via `[^N]` footnotes>
 *
 * For each category this emits, into a sibling `generated/` dir:
 *   - `generated/full/<name>.json` full entries WITH `comments` (footnotes resolved inline) — app
 *   - `generated/min/<name>.json`  the same entries WITHOUT `comments` — embedded into WASM binary
 *
 * and once per directory `generated/full/intros.json`, each file's title and resolved intro, by
 * file name, for the files with one — app.
 *
 * Footnote definitions are pulled from `docs/references/{literature,ingredients}.md`; a citation
 * with no matching definition is a hard error.
 *
 * Comments and intros also cite crate items the way rustdoc resolves them, e.g.
 * `[POD](crate::docs#pod)`. The app renders them outside rustdoc, where those are dead links, so
 * each is rewritten to the link rustdoc rendered for it on the data's `docs` page, into the app's
 * hosted copy at `/rustdoc/` (`lib/doc-links.ts`). A citation rustdoc didn't render the same way is
 * a hard error.
 *
 * The app's renderer prints raw HTML as text, so comments and intros leave out HTML comments, and
 * each `<code>` group, an expression with links, becomes joined code spans (`lib/raw-html.ts`). Any
 * other raw HTML is a hard error.
 *
 * Those pages come from `pnpm doc:site`, and the crate only compiles once `generated/min/` holds a
 * file for every source `src/data/` embeds. `--min` writes that copy alone, reading no rendered
 * page, so `pnpm gen:data` can seed the crate, build the docs, then pair the links against them.
 *
 * Run `pnpm gen:data`, which builds the docs first, or this script directly after `pnpm doc:site`:
 * `node --import tsx scripts/gen-data.ts [--check | --min]`. With no flag it writes both variants;
 * `--min` writes only `generated/min/`; `--check` regenerates both (validating parsing, links, and
 * footnotes) without writing, and verifies the tracked `min/` files are up to date.
 */
import fs from "node:fs";
import path from "node:path";

import { entryLabel, parseDataSource } from "./lib/data-entries";
import { DATA_PAGES, comparable, pairDocLinks, readDataPageLinks } from "./lib/doc-links";
import { findRawHtml, joinCodeGroups } from "./lib/raw-html";
import type { RenderedLink } from "./lib/rustdoc-html";

const PKG_ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIRS = ["ingredients", "recipes"] as const;
const REFERENCE_FILES = [
  "docs/references/literature.md",
  "docs/references/ingredients.md",
] as const;

/** Build `{ number -> definition text }` from the ref. bibliographies. Wrapped defs are joined. */
function loadFootnoteDefs(): Map<string, string> {
  const defs = new Map<string, string>();
  for (const rel of REFERENCE_FILES) {
    const content = fs.readFileSync(path.join(PKG_ROOT, rel), "utf8");
    for (const block of content.split(/\n\s*\n/)) {
      const match = block.match(/^\[\^(\d+)\]:\s*([\s\S]+)$/);
      if (!match) continue;
      const [, num, body] = match;
      if (defs.has(num)) throw new Error(`Duplicate footnote definition [^${num}] in ${rel}`);
      defs.set(num, body.replace(/\s*\n\s*/g, " ").trim());
    }
  }
  return defs;
}

/** Append the definitions of every `[^N]` a comment cites, so the string is self-contained. */
function resolveFootnotes(label: string, comment: string, defs: Map<string, string>): string {
  const cited = [...new Set([...comment.matchAll(/\[\^(\d+)\]/g)].map((m) => m[1]))].sort(
    (a, b) => Number(a) - Number(b),
  );
  if (cited.length === 0) return comment;
  const missing = cited.filter((n) => !defs.has(n));
  if (missing.length > 0) {
    throw new Error(
      `'${label}' cites undefined footnote(s): ${missing.map((n) => `[^${n}]`).join(", ")}`,
    );
  }
  const block = cited.map((n) => `[^${n}]: ${defs.get(n)}`).join("\n");
  return `${comment.trimEnd()}\n\n${block}`;
}

/** Which variants to emit: `full` (with comments) for the app, `min` (comment-free) for binary. */
type Kind = "full" | "min";

/** Markdown of `dir` as `full` stores it: links paired, `<code>` groups joined, footnotes added. */
interface NotesResolver {
  /** An entry's comments, by the entry's label. */
  entry: (label: string, comments: string) => string;
  /** A file's intro, by the file's title. */
  intro: (title: string, intro: string) => string;
}

/** The {@link NotesResolver} of `dir`, pairing links against the page it renders on. */
function makeNotesResolver(dir: (typeof SOURCE_DIRS)[number], defs: Map<string, string>) {
  const page = DATA_PAGES[dir];
  const rendered = readDataPageLinks(page);

  /** `markdown`, named `label` in errors, given `links`, the ones rustdoc rendered for it. */
  const resolve = (label: string, markdown: string, links: RenderedLink[] | undefined): string => {
    if (links === undefined) throw new Error(`'${label}' is not on ${page}; run \`pnpm doc:site\``);
    /** Links first, so the pairing sees prose and never the appended bibliography. */
    const paired = pairDocLinks(label, markdown, links);
    /** Then the `<code>` groups, which join around the URLs the pairing wrote. */
    const resolved = resolveFootnotes(label, joinCodeGroups(label, paired), defs);
    const html = findRawHtml(resolved);
    if (html.length > 0) {
      const found = html.join(", ");
      throw new Error(`'${label}' holds raw HTML, which the app prints as text: ${found}`);
    }
    return resolved;
  };

  return {
    entry: (label, comments) => resolve(label, comments, rendered.entries.get(comparable(label))),
    intro: (title, intro) =>
      resolve(`${title} (intro)`, intro, rendered.intros.get(comparable(title))),
  } satisfies NotesResolver;
}

/** Compute the requested generated files' paths and content without touching disk. */
function generate(kinds: ReadonlySet<Kind>): Map<string, string> {
  /** The `full` inputs, loaded once — and only for `full`, since `min` precedes the docs build. */
  const defs = kinds.has("full") ? loadFootnoteDefs() : undefined;
  const outputs = new Map<string, string>();

  for (const dir of SOURCE_DIRS) {
    const resolver = defs === undefined ? undefined : makeNotesResolver(dir, defs);
    const base = path.join(PKG_ROOT, "data", dir);
    const sources = fs
      .readdirSync(base)
      .filter((f) => f.endsWith(".md"))
      .sort();
    /** Each file's title and resolved intro, by file name, for the files with one. */
    const intros: Record<string, { title: string; text: string }> = {};

    for (const file of sources) {
      const source = parseDataSource(fs.readFileSync(path.join(base, file), "utf8"));
      const raw = source.entries;
      const stem = file.replace(/\.md$/, "");

      if (resolver !== undefined) {
        const full = raw.map((e) =>
          e.comments === undefined
            ? e
            : { ...e, comments: resolver.entry(entryLabel(e), e.comments) },
        );
        outputs.set(
          path.join(base, "generated", "full", `${stem}.json`),
          `${JSON.stringify(full, null, 2)}\n`,
        );
        if (source.intro !== undefined) {
          intros[stem] = { title: source.title, text: resolver.intro(source.title, source.intro) };
        }
      }
      if (kinds.has("min")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const min = raw.map(({ comments: _comments, ...rest }) => rest);
        // One entry per line, so a diff shows which entries changed.
        outputs.set(
          path.join(base, "generated", "min", `${stem}.json`),
          `[\n${min.map((e) => JSON.stringify(e)).join(",\n")}\n]\n`,
        );
      }
    }
    if (resolver !== undefined) {
      outputs.set(
        path.join(base, "generated", "full", "intros.json"),
        `${JSON.stringify(intros, null, 2)}\n`,
      );
    }
  }
  return outputs;
}

const args = process.argv.slice(2);
const minOnly = args.includes("--min");

if (minOnly && args.includes("--check")) {
  console.error("`--min` and `--check` are exclusive; `--check` validates both variants.");
  process.exit(1);
}

if (args.includes("--check")) {
  // Generate both variants so parsing and footnote resolution are fully validated (footnotes are
  // only resolved on the `full` path). Nothing is written; only `generated/min/` is tracked in git
  // (`full/` is gitignored, rebuilt by the build), so drift-check just the tracked `min/` files.
  const minDir = path.join("generated", "min") + path.sep;
  const tracked = [...generate(new Set(["full", "min"]))].filter(([file]) => file.includes(minDir));
  const stale = tracked.filter(
    ([file, content]) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content,
  );
  if (stale.length > 0) {
    console.error("Tracked generated data is stale. Run `pnpm gen:data`. Affected:");
    for (const [file] of stale) console.error(`  ${path.relative(PKG_ROOT, file)}`);
    process.exit(1);
  }
  console.log(`gen-data --check: sources valid; ${tracked.length} tracked min/ files up to date.`);
} else {
  const outputs = generate(new Set(minOnly ? ["min"] : ["full", "min"]));
  for (const [file, content] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log(`gen-data${minOnly ? " --min" : ""}: wrote ${outputs.size} files.`);
}
