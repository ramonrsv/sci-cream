/**
 * Codegen: markdown data sources -> JSON consumed by the crate and the app.
 *
 * Source of truth is `data/{ingredients,recipes}/<name>.md`, where each entry is a level-2 section:
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
 * Footnote definitions are pulled from `docs/references/{literature,ingredients}.md`; a citation
 * with no matching definition is a hard error.
 *
 * Run: `node --import tsx scripts/gen-data.ts [--check]`. With no flag it writes both variants;
 * `--check` regenerates both (validating parsing and footnotes) without writing, and verifies the
 * tracked `min/` files are up to date.
 */
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const PKG_ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIRS = ["ingredients", "recipes"] as const;
const REFERENCE_FILES = [
  "docs/references/literature.md",
  "docs/references/ingredients.md",
] as const;

interface Entry {
  name?: string;
  alias?: string;
  comments?: string;
  [key: string]: unknown;
}

/** Human identifier for error messages. */
function entryLabel(entry: Entry): string {
  return entry.name ?? entry.alias ?? "<unnamed>";
}

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

/**
 * Parse a category markdown file into ordered entries. Each level-2 (`##`) section is one entry:
 * the heading text is the name, its first fenced block is the JSON spec, and the remaining markdown
 * is the verbatim `comments` body (footnote are resolved later). Throws on several checked errors.
 */
export function parseMarkdownEntries(md: string): Entry[] {
  const entries: Entry[] = [];
  const seen = new Set<string>();
  let cur: { name: string; spec?: Record<string, unknown>; body: string[] } | null = null;

  const flush = (): void => {
    if (!cur) return;
    if (cur.spec === undefined) throw new Error(`Entry '${cur.name}': no fenced spec block`);
    const comment = cur.body.join("").trim();
    const entry: Entry =
      "for" in cur.spec ? { alias: cur.name, ...cur.spec } : { name: cur.name, ...cur.spec };
    if (comment) entry.comments = comment;
    entries.push(entry);
    cur = null;
  };

  for (const token of marked.lexer(md)) {
    if (token.type === "heading" && token.depth === 2) {
      flush();
      const name = token.text.trim();
      if (!name) throw new Error("Entry with an empty `##` heading");
      if (seen.has(name)) throw new Error(`Duplicate entry '${name}'`);
      seen.add(name);
      cur = { name, body: [] };
    } else if (!cur) {
      continue; // preamble before the first entry
    } else if (token.type === "code" && cur.spec === undefined) {
      if (token.lang !== "json") {
        throw new Error(
          `Entry '${cur.name}': spec block must be a json fence, got '${token.lang}'`,
        );
      }
      try {
        cur.spec = JSON.parse(token.text) as Record<string, unknown>;
      } catch (cause) {
        throw new Error(`Entry '${cur.name}': invalid spec JSON`, { cause });
      }
    } else {
      cur.body.push(token.raw);
    }
  }
  flush();
  return entries;
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
      `Entry '${label}' cites undefined footnote(s): ${missing.map((n) => `[^${n}]`).join(", ")}`,
    );
  }
  const block = cited.map((n) => `[^${n}]: ${defs.get(n)}`).join("\n");
  return `${comment.trimEnd()}\n\n${block}`;
}

/** Which variants to emit: `full` (with comments) for the app, `min` (comment-free) for binary. */
type Kind = "full" | "min";

/** Compute the requested generated files' paths and content without touching disk. */
function generate(kinds: ReadonlySet<Kind>): Map<string, string> {
  const defs = loadFootnoteDefs();
  const outputs = new Map<string, string>();

  for (const dir of SOURCE_DIRS) {
    const base = path.join(PKG_ROOT, "data", dir);
    const sources = fs
      .readdirSync(base)
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of sources) {
      const raw = parseMarkdownEntries(fs.readFileSync(path.join(base, file), "utf8"));
      const stem = file.replace(/\.md$/, "");

      if (kinds.has("full")) {
        const full = raw.map((e) =>
          e.comments === undefined
            ? e
            : { ...e, comments: resolveFootnotes(entryLabel(e), e.comments, defs) },
        );
        outputs.set(
          path.join(base, "generated", "full", `${stem}.json`),
          `${JSON.stringify(full, null, 2)}\n`,
        );
      }
      if (kinds.has("min")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const min = raw.map(({ comments: _comments, ...rest }) => rest);
        outputs.set(
          path.join(base, "generated", "min", `${stem}.json`),
          `${JSON.stringify(min)}\n`,
        );
      }
    }
  }
  return outputs;
}

const args = process.argv.slice(2);

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
  const outputs = generate(new Set(["full", "min"]));
  for (const [file, content] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log(`gen-data: wrote ${outputs.size} files.`);
}
