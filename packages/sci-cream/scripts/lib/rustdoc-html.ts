/**
 * Reads the HTML pages rustdoc renders, where every intra-doc link is already resolved, so scripts
 * can copy a link's URL from them rather than resolve the markdown themselves.
 *
 * The pages are `pnpm doc:site`'s output in `target/doc`, which the app serves at `/rustdoc/`.
 * {@link readDocblock} takes a module page's own documentation, without rustdoc's sidebar, item
 * listings, or footnote list; {@link splitSections} cuts that at headings; and
 * {@link renderedLinks} lists the intra-doc links in a section, each with its text and site URL.
 *
 * Those URLs are exact: rustdoc resolves each link in the scope of the page that renders it, and
 * CI's `RUSTDOCFLAGS: -D warnings` fails the build on any it can't. It doesn't check a link's
 * `#fragment`, which {@link brokenAnchors} does.
 */
import fs from "node:fs";
import path from "node:path";
import { fromHtml } from "hast-util-from-html";

const PKG_ROOT = path.resolve(import.meta.dirname, "../..");

/** The output of `pnpm doc:site`. */
export const DOC_ROOT = path.resolve(PKG_ROOT, "../../target/doc");

/** Where the app serves {@link DOC_ROOT}. */
export const SITE_ROOT = "/rustdoc";

/** The fields of a hast node read here; the `hast` types are not a direct dependency. */
export interface HtmlNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
  value?: string;
}

/** A heading and the top-level nodes after it, up to the next section's heading. */
export interface Section {
  heading: HtmlNode;
  /** The heading's text, without rustdoc's `§` permalink. */
  title: string;
  nodes: HtmlNode[];
}

/** An intra-doc link as rustdoc rendered it. */
export interface RenderedLink {
  /** Its visible text. */
  text: string;
  /** Its target on the site, such as `/rustdoc/sci_cream/constants/pac/index.html`. */
  url: string;
}

const pages = new Map<string, string>();

/** A rendered page's HTML, by its path relative to {@link DOC_ROOT}; each page is read once. */
function readPage(page: string): string {
  let html = pages.get(page);
  if (html === undefined) {
    const file = path.join(DOC_ROOT, page);
    if (!fs.existsSync(file)) throw new Error(`No rendered docs at ${file}; run \`pnpm doc:site\``);
    html = fs.readFileSync(file, "utf8");
    pages.set(page, html);
  }
  return html;
}

/** The class names on `node`. */
function classesOf(node: HtmlNode): unknown[] {
  const names = node.properties?.className;
  return Array.isArray(names) ? names : [];
}

/** The first node, depth-first, that `test` accepts. */
function findNode(node: HtmlNode, test: (node: HtmlNode) => boolean): HtmlNode | undefined {
  if (test(node)) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, test);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Concatenated text of `node` and its descendants. */
function textOf(node: HtmlNode): string {
  return node.type === "text" ? (node.value ?? "") : (node.children ?? []).map(textOf).join("");
}

/**
 * The top-level elements of a module page's own documentation, without its footnote list.
 *
 * `html` is the whole page, and `page` names it in errors. Outside the `docblock` sit rustdoc's
 * breadcrumb, sidebar, and item listings, none of them authored.
 */
export function docblockOf(html: string, page: string): HtmlNode[] {
  const main = findNode(fromHtml(html), (node) => node.properties?.id === "main-content");
  const docblock =
    main &&
    findNode(main, (node) => node.tagName === "div" && classesOf(node).includes("docblock"));
  if (docblock === undefined) throw new Error(`No docblock in ${page}`);
  return (docblock.children ?? []).filter(
    (node) => node.type === "element" && !classesOf(node).includes("footnotes"),
  );
}

/** {@link docblockOf} the rendered page at `page`, relative to {@link DOC_ROOT}. */
export function readDocblock(page: string): HtmlNode[] {
  return docblockOf(readPage(page), page);
}

/** Split top-level `nodes` at each heading `starts` accepts; nodes before the first are dropped. */
export function splitSections(
  nodes: HtmlNode[],
  starts: (heading: HtmlNode) => boolean,
): Section[] {
  const sections: Section[] = [];
  for (const node of nodes) {
    if (/^h[1-6]$/.test(node.tagName ?? "") && starts(node)) {
      const title = (node.children ?? [])
        .filter((child) => !classesOf(child).includes("doc-anchor"))
        .map(textOf)
        .join("")
        .trim();
      sections.push({ heading: node, title, nodes: [] });
    } else {
      sections.at(-1)?.nodes.push(node);
    }
  }
  return sections;
}

/** Where `href`, as written on `page`, points on the site. */
function siteUrl(page: string, href: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return href;
  return `${SITE_ROOT}/${path.posix.normalize(path.posix.join(path.posix.dirname(page), href))}`;
}

/**
 * The intra-doc links within `nodes`, in document order, with where each points on the site.
 *
 * Rustdoc titles every intra-doc link with its target's kind and path, as in `struct
 * sci_cream::composition::sugars::Sugars`, while authored URLs, footnote references, and heading
 * permalinks have no title. A relative href is relative to `page`; an absolute one, such as a
 * standard library item's, stays as it is.
 */
export function renderedLinks(page: string, nodes: HtmlNode[]): RenderedLink[] {
  const links: RenderedLink[] = [];
  const visit = (node: HtmlNode): void => {
    const { href, title } = node.properties ?? {};
    if (node.tagName === "a" && typeof href === "string" && title !== undefined) {
      links.push({ text: textOf(node), url: siteUrl(page, href) });
    }
    (node.children ?? []).forEach(visit);
  };
  nodes.forEach(visit);
  return links;
}

/**
 * The links whose `#fragment` names no id on the hosted page they point to.
 *
 * Rustdoc checks the item an intra-doc link names but not its fragment, so a citation of a renamed
 * heading, such as `crate::docs#pod`, would otherwise reach the site as a dead anchor.
 */
export function brokenAnchors(links: RenderedLink[]): RenderedLink[] {
  return links.filter(({ url }) => {
    const [target, fragment] = url.split("#");
    if (fragment === undefined || !target.startsWith(`${SITE_ROOT}/`)) return false;
    return !readPage(target.slice(SITE_ROOT.length + 1)).includes(`id="${fragment}"`);
  });
}
