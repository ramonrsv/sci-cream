/**
 * Rewrite rustdoc intra-doc links in authored markdown into absolute docs.rs URLs.
 *
 * The guide and the ingredient/recipe data are written for rustdoc, so they cite crate items the
 * way rustdoc resolves them — `` [`field@Sugars::sucrose`] ``, `[pac](crate::constants::pac)`,
 * `[POD](crate::docs#pod)`. Anywhere but rustdoc those are dead links. This resolves them against
 * the map `gen-doc-links.ts` scrapes out of the rendered documentation.
 *
 * An unresolvable citation throws rather than passing through, matching how `gen-data.ts` treats an
 * undefined footnote: a dead link should fail the build, not reach the site.
 */
import fs from "node:fs";
import path from "node:path";

const PKG_ROOT = path.resolve(import.meta.dirname, "../..");
const LINK_MAP = path.join(PKG_ROOT, "docs/generated/link-map.json");

/** Directories holding markdown that rustdoc renders, and so may carry intra-doc links. */
const AUTHORED_DIRS = ["docs", "data/ingredients", "data/recipes"] as const;

/**
 * The generated link map, as `gen-doc-links.ts` writes it.
 *
 * Values are hrefs relative to `docsBase`; {@link urlFor} joins the two.
 */
export interface LinkMap {
  docsBase: string;
  items: Record<string, string>;
  anchors: Record<string, string>;
}

/** The absolute docs.rs URL for a map href. */
function urlFor(href: string, map: LinkMap): string {
  return `${map.docsBase}/${href}`;
}

/**
 * Disambiguators rustdoc accepts before a path, e.g. `` [`field@Sugars::sucrose`] ``.
 *
 * They pick between namespaces that share a name; the map is keyed by path alone, so they are
 * stripped before lookup.
 */
const DISAMBIGUATOR =
  /^(?:struct|enum|trait|fn|macro|mod|const|static|type|value|derive|field|method|variant|primitive|attr)@/;

/** Fenced code blocks, which rustdoc renders verbatim and must not be rewritten. */
const CODE_FENCE = /^```[\s\S]*?^```/gm;

/** An inline link whose destination is an item path rather than a URL or in-page anchor. */
const INLINE_LINK = /\[((?:[^[\]\\]|\\.)*)\]\((?!https?:|[#/.])([^)\s]+)\)/g;

/** A shortcut link, `` [`Path`] ``, excluding a reference definition or an inline link. */
const SHORTCUT_LINK = /\[`([^`\n]+)`\](?![(:])/g;

/** Read the generated link map. */
export function loadLinkMap(): LinkMap {
  if (!fs.existsSync(LINK_MAP)) {
    throw new Error(`Link map not found; run \`pnpm gen:doc-links\` (${LINK_MAP})`);
  }
  return JSON.parse(fs.readFileSync(LINK_MAP, "utf8")) as LinkMap;
}

/** Normalize a cited path to the form the map is keyed by. */
function normalizePath(target: string): string {
  return target
    .trim()
    .replace(DISAMBIGUATOR, "")
    .replace(/^crate::/, "")
    .replace(/\(\)$/, "");
}

/**
 * The map paths a citation could mean: its exact key, else every key it is a tail of.
 *
 * The map records each item once, under the full path the crate declares it at. Rustdoc resolves
 * links through `use` statements, so a citation usually names an item by a shorter path —
 * `Sugars::sucrose` for `composition::sugars::Sugars::sucrose`. Matching on the `::` boundary keeps
 * `Sugars` from answering to a hypothetical `MoreSugars`.
 */
function candidatePaths(path: string, map: LinkMap): string[] {
  if (map.items[path] !== undefined) return [path];
  const tail = `::${path}`;
  return Object.keys(map.items).filter((key) => key.endsWith(tail));
}

/**
 * The URL a citation resolves to, or `undefined` when the map cannot place it.
 *
 * A `#` splits a path from an anchor: `crate::docs#pod` asks the `docs` page for its `pod` heading,
 * so it is looked up among anchors rather than items. A path matching several items is as
 * unresolvable as one matching none; {@link describeTarget} says which it was.
 */
export function resolveTarget(target: string, map: LinkMap): string | undefined {
  const [pathPart, anchor] = target.split("#");
  const normalized = normalizePath(pathPart);
  if (anchor !== undefined) {
    const href = map.anchors[`${normalized}#${anchor}`];
    return href === undefined ? undefined : urlFor(href, map);
  }

  const candidates = candidatePaths(normalized, map);
  return candidates.length === 1 ? urlFor(map.items[candidates[0]], map) : undefined;
}

/** How a citation failed to resolve, for an error message: the target, and any rival matches. */
function describeTarget(target: string, map: LinkMap): string {
  const [pathPart, anchor] = target.split("#");
  if (anchor !== undefined) return target;

  const candidates = candidatePaths(normalizePath(pathPart), map);
  return candidates.length > 1 ? `${target} (ambiguous: ${candidates.join(", ")})` : target;
}

/** Replace the spans a matcher finds, leaving fenced code untouched. */
function rewriteOutsideCode(markdown: string, rewrite: (segment: string) => string): string {
  let result = "";
  let cursor = 0;
  for (const fence of markdown.matchAll(CODE_FENCE)) {
    result += rewrite(markdown.slice(cursor, fence.index)) + fence[0];
    cursor = fence.index + fence[0].length;
  }
  return result + rewrite(markdown.slice(cursor));
}

/**
 * Rewrite every intra-doc link in `markdown` to its absolute docs.rs URL.
 *
 * `label` names the source in the error a missing entry raises. Both link forms are handled: an
 * inline `[text](path)` keeps its text, and a shortcut `` [`Path`] `` gains one — rustdoc renders
 * the path as the link text, so the same path becomes the visible label here.
 */
export function resolveDocLinks(label: string, markdown: string, map: LinkMap): string {
  const missing: string[] = [];

  const resolved = rewriteOutsideCode(markdown, (segment) =>
    segment
      .replace(INLINE_LINK, (whole, text: string, target: string) => {
        const url = resolveTarget(target, map);
        if (url === undefined) {
          missing.push(target);
          return whole;
        }
        return `[${text}](${url})`;
      })
      .replace(SHORTCUT_LINK, (whole, target: string) => {
        const url = resolveTarget(target, map);
        if (url === undefined) {
          missing.push(target);
          return whole;
        }
        return `[\`${normalizePath(target)}\`](${url})`;
      }),
  );

  if (missing.length > 0) {
    const cited = [...new Set(missing)].map((t) => describeTarget(t, map)).join(", ");
    throw new Error(`'${label}' cites unresolvable intra-doc link(s): ${cited}`);
  }
  return resolved;
}

/** One intra-doc citation found in the authored markdown. */
export interface Citation {
  /** Package-relative source file, e.g. `docs/fibers.md`. */
  file: string;
  /** The cited target, exactly as authored, e.g. `field@Sugars::sucrose`. */
  target: string;
}

/**
 * Every intra-doc citation across the markdown rustdoc renders.
 *
 * The counterpart to {@link resolveDocLinks}: that rewrites one document, this enumerates them all,
 * so a caller can check the whole corpus resolves rather than only what it happens to render.
 */
export function collectCitations(): Citation[] {
  const found: Citation[] = [];

  for (const dir of AUTHORED_DIRS) {
    const base = path.join(PKG_ROOT, dir);
    for (const name of fs.readdirSync(base).filter((f) => f.endsWith(".md"))) {
      const file = `${dir}/${name}`;
      const markdown = fs.readFileSync(path.join(base, name), "utf8").replace(CODE_FENCE, "");

      for (const [, , target] of markdown.matchAll(INLINE_LINK)) found.push({ file, target });
      for (const [, target] of markdown.matchAll(SHORTCUT_LINK)) found.push({ file, target });
    }
  }
  return found;
}
