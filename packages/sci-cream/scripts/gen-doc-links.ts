/**
 * Codegen: rustdoc's resolved intra-doc links -> a JSON map the markdown consumers can use.
 *
 * The guide (`docs/*.md`) and the ingredient/recipe data (`data/**\/*.md`) are written for rustdoc,
 * so they cite crate items with intra-doc links: `` [`field@Sugars::sucrose`] ``,
 * `[pac](crate::constants::pac)`, `[POD](crate::docs#pod)`. Only rustdoc resolves those; anywhere
 * else they are dead links.
 *
 * Re-implementing rustdoc's resolver is not necessary: `cargo doc` already resolved every one of
 * them. This builds the docs, reads the hrefs back out of the rendered pages, and inverts each into
 * the item path an author would have written, producing `{ path -> href }`.
 *
 * `rustdoc::all` is `warn` in `Cargo.toml`, and CI raises rustdoc warnings to errors via
 * `RUSTDOCFLAGS: -D warnings`, so `broken_intra_doc_links` makes rustdoc the validation gate: a map
 * entry cannot point at an item that does not exist without failing the build that produced it.
 *
 * Run: `node --import tsx scripts/gen-doc-links.ts [--check] [--no-build]`. With no flag it writes
 * the map; `--check` regenerates and fails if the tracked file is stale; `--no-build` reuses the
 * existing `target/doc` instead of running `cargo doc` first.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PKG_ROOT = path.resolve(import.meta.dirname, "..");
const DOC_ROOT = path.resolve(PKG_ROOT, "../../target/doc/sci_cream");
const OUTPUT = path.join(PKG_ROOT, "docs/generated/link-map.json");

/** Rustdoc root for the crate, matching the README badge and the app's `spec-docs.ts`. */
const DOCS_BASE = "https://docs.rs/sci-cream/latest/sci_cream";

/**
 * Pages whose markdown is authored rather than generated from Rust items, keyed by module path.
 *
 * Every `#![doc = include_str!(…)]` target in `src/docs.rs` lands on one of these three.
 */
const AUTHORED_PAGES: Readonly<Record<string, string>> = {
  "crate::docs": "docs/index.html",
  "crate::docs::ingredients": "docs/ingredients/index.html",
  "crate::docs::recipes": "docs/recipes/index.html",
};

/** Rustdoc's filename prefix for each item kind, as it appears in `<kind>.<Name>.html`. */
const ITEM_KINDS = [
  "struct",
  "enum",
  "trait",
  "constant",
  "fn",
  "macro",
  "type",
  "union",
  "primitive",
  "derive",
  "attr",
] as const;

const ITEM_FILE = new RegExp(`^(${ITEM_KINDS.join("|")})\\.(.+)\\.html$`);

/**
 * The generated map. Every value is an href relative to {@link LinkMap.docsBase}, which consumers
 * join to form the URL — holding the absolute URL per entry would repeat the base a few hundred
 * times, and moving to a versioned docs root would mean rewriting every one of them.
 */
interface LinkMap {
  /** Rustdoc root every href is relative to. */
  docsBase: string;
  /** Full crate path -> href, e.g. `composition::sugars::Sugars::sucrose`, `constants::pac`. */
  items: Record<string, string>;
  /** Heading and `<a id>` anchors -> href, keyed `crate::docs#…` style, e.g. `docs#pod`. */
  anchors: Record<string, string>;
}

/**
 * Build the crate documentation, so the scrape never reads a stale `target/doc`.
 *
 * Deliberately without `--document-private-items`, unlike `pnpm doc`: the map's URLs point at
 * docs.rs, so the pages scraped should be the ones docs.rs publishes.
 */
function buildDocs(): void {
  execFileSync("cargo", ["doc", "--all-features", "--no-deps"], {
    cwd: PKG_ROOT,
    stdio: "inherit",
  });
}

/**
 * The authored prose of a rustdoc page: its `docblock`, minus the footnote definitions.
 *
 * Scoping matters. Outside `docblock` sit rustdoc's own breadcrumb and source link, and the sidebar
 * repeats every `h2` anchor; the trailing `footnotes` div holds bibliography URLs and backrefs.
 * None are authored intra-doc links, and all would otherwise land in the map.
 */
function readPageContent(relativePath: string): string {
  const html = fs.readFileSync(path.join(DOC_ROOT, relativePath), "utf8");
  const main = /<section id="main-content".*?<div class="docblock">/s.exec(html);
  if (!main) throw new Error(`No docblock found in ${relativePath}`);

  const content = html.slice(main.index + main[0].length);
  const footnotes = content.indexOf('<div class="footnotes">');
  return footnotes === -1 ? content : content.slice(0, footnotes);
}

/** Every `href` in a page's authored prose, in document order, external links excluded. */
function contentHrefs(relativePath: string): string[] {
  return [...readPageContent(relativePath).matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => !/^(https?:|#)/.test(href));
}

/**
 * Resolve a page-relative href against the crate's rustdoc root.
 *
 * `docs/index.html` + `../composition/…` and `docs/ingredients/index.html` + `../../composition/…`
 * name the same target; both normalize to `composition/…`.
 */
function resolveHref(pagePath: string, href: string): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(pagePath), href));
}

/**
 * The item's full crate path, `::`-joined from the crate root, or `undefined` for the root itself.
 *
 * One key per target, written the way the crate declares it. A citation naming the item by a
 * shorter path — which is the common case, since rustdoc resolves through `use` statements — is
 * matched against these at lookup time by `lib/doc-links.ts`, so no shortened form is stored.
 */
function pathForHref(href: string): string | undefined {
  const [filePath, fragment] = href.split("#");
  const segments = filePath.split("/");
  const file = segments.pop() ?? "";

  /** Module page: the directory path is the module path. */
  if (file === "index.html") {
    return segments.length > 0 ? segments.join("::") : undefined;
  }

  const item = ITEM_FILE.exec(file);
  if (!item) return undefined;

  /** `#structfield.sucrose` and `#variant.Trehalose` name a member of the item. */
  const member = fragment?.replace(/^(structfield|variant|method|associatedconstant)\./, "");
  const tail = member === undefined ? [item[2]] : [item[2], member];
  return [...segments, ...tail].join("::");
}

/** Scrape all authored pages and assemble the map. */
function generate(): LinkMap {
  const targets = new Set<string>();
  const anchors: Record<string, string> = {};

  for (const [module, page] of Object.entries(AUTHORED_PAGES)) {
    const modulePath = module.replace(/^crate::/, "");

    for (const href of contentHrefs(page)) {
      const resolved = resolveHref(page, href);

      /** A fragment on a module page is a heading anchor, not an item. */
      const [file, fragment] = resolved.split("#");
      if (fragment && file.endsWith("index.html")) {
        const owner = path.posix.dirname(file).replace(/\//g, "::");
        anchors[`${owner}#${fragment}`] = resolved;
      } else {
        targets.add(resolved);
      }
    }

    /** The page's own headings and `<a id>` anchors, so a citation can be checked against them. */
    for (const id of pageAnchorIds(page)) {
      anchors[`${modulePath}#${id}`] ??= `${page}#${id}`;
    }
  }

  const byPath = new Map<string, string>();
  for (const href of targets) {
    const itemPath = pathForHref(href);
    if (itemPath === undefined) continue;
    const clash = byPath.get(itemPath);
    if (clash !== undefined && clash !== href) {
      throw new Error(`Two hrefs claim the path '${itemPath}': ${clash}, ${href}`);
    }
    byPath.set(itemPath, href);
  }

  const sort = (entries: [string, string][]) =>
    Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));

  return { docsBase: DOCS_BASE, items: sort([...byPath]), anchors: sort(Object.entries(anchors)) };
}

/** Ids a page defines: rustdoc's heading ids and the `<a id>` anchors the markdown writes. */
function pageAnchorIds(relativePath: string): string[] {
  const content = readPageContent(relativePath);
  return [...content.matchAll(/<(?:h[1-6]|a)[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
}

const args = process.argv.slice(2);
if (!args.includes("--no-build")) buildDocs();

const map = generate();
const serialized = `${JSON.stringify(map, null, 2)}\n`;
const counts = `${Object.keys(map.items).length} items, ${Object.keys(map.anchors).length} anchors`;

if (args.includes("--check")) {
  const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, "utf8") : "";
  if (current !== serialized) {
    console.error(`Link map is stale. Run \`pnpm gen:doc-links\`. (${OUTPUT})`);
    process.exit(1);
  }
  console.log(`gen-doc-links --check: up to date; ${counts}.`);
} else {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, serialized);
  console.log(`gen-doc-links: wrote ${counts} to ${path.relative(PKG_ROOT, OUTPUT)}.`);
}
