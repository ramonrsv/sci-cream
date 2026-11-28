/**
 * The Reference: the crate's `sci_cream::docs` page, cut into the chapters the app serves.
 *
 * Rustdoc renders the docs as one page, from `docs/*.md`, with every intra-doc link resolved.
 * `docs/_chapters.json` lists the headings that start a chapter, by id, with each
 * chapter's route and description. {@link buildReference} cuts the page there and rewrites what
 * only works on rustdoc's page:
 *
 * - A link between chapters goes to the route of the chapter that owns its anchor. Any other
 *   relative link, as to an API item, goes to the hosted rustdoc at `/rustdoc/`, keeping the title
 *   rustdoc gives it.
 * - Footnotes are renumbered per chapter, which lists only those it cites.
 * - A chapter's heading becomes its page's `h1`, its subheadings shifting to match, and rustdoc's
 *   `§` permalinks and HTML comments go.
 *
 * Anything the cut can't account for is a hard error: a listed heading that's missing, an `h2`
 * neither listed nor omitted, an id two chapters define, or a link to an anchor no chapter owns.
 */
import fs from "node:fs";
import path from "node:path";
import { toHtml } from "hast-util-to-html";

import {
  type HtmlNode,
  type RenderedLink,
  SITE_ROOT,
  brokenAnchors,
  classesOf,
  readDocblock,
  readFootnotes,
  siteUrl,
  splitSections,
  textOf,
} from "./rustdoc-html";

const PKG_ROOT = path.resolve(import.meta.dirname, "../..");

/** The rendered page the Reference is cut from, relative to rustdoc's output. */
export const REFERENCE_PAGE = "sci_cream/docs/index.html";

/** Where the chapters are listed. */
const MANIFEST_FILE = path.join(PKG_ROOT, "docs", "_chapters.json");

/** `docs/_chapters.json`: where the page is cut, and what each chapter is called. */
export interface ReferenceManifest {
  /** The route the chapters are served under, such as `/docs/reference`. */
  root: string;
  /** Ids of the `h2` sections left out, such as the crate's own table of contents. */
  omit: string[];
  /** The chapters, in page order. */
  chapters: ManifestChapter[];
}

/** A chapter as the manifest lists it. */
export interface ManifestChapter {
  /** The id of the heading that starts it. */
  id: string;
  /** Its route under the root, such as `sweeteners/sugars`, nested under its parent chapter's. */
  slug: string;
  /** One line on what it covers. */
  description: string;
}

/** A chapter, as the app renders it. */
export interface ReferenceChapter {
  /** Its route under the root. */
  slug: string;
  /** Its heading's text. */
  title: string;
  /** One line on what it covers. */
  description: string;
  /** Its HTML, from its heading, as an `h1`, to its footnotes. */
  html: string;
}

/** The app's Reference. */
export interface Reference {
  /** The route the chapters are served under. */
  root: string;
  chapters: ReferenceChapter[];
  /** The URL of every id a chapter defines, by id; a chapter's own heading's is its route. */
  anchors: Record<string, string>;
}

/** A citation's id, `fnref3`, or `fnref3-2` for footnote 3's second, capturing its footnote. */
const CITATION_ID = /^fnref(\d+)(?:-\d+)?$/;

/** A footnote's id, or a citation's, which each chapter numbers anew rather than shares. */
const FOOTNOTE_ID = /^fn(?:ref)?\d+(?:-\d+)?$/;

/** A hast element. */
function element(
  tagName: string,
  properties: Record<string, unknown>,
  children: HtmlNode[],
): HtmlNode {
  return { type: "element", tagName, properties, children };
}

/** A hast text node. */
function text(value: string): HtmlNode {
  return { type: "text", value };
}

/** The `id` of `node`, if it has one. */
function idOf(node: HtmlNode): string | undefined {
  const id = node.properties?.id;
  return typeof id === "string" ? id : undefined;
}

/** The level of heading `node`, `2` for an `h2`, or `undefined` for any other node. */
function headingLevel(node: HtmlNode): number | undefined {
  const match = /^h([1-6])$/.exec(node.tagName ?? "");
  return match ? Number(match[1]) : undefined;
}

/** Every id in `nodes` and their descendants, in document order. */
function idsIn(nodes: HtmlNode[]): string[] {
  return nodes.flatMap((node) => {
    const id = idOf(node);
    return [...(id === undefined ? [] : [id]), ...idsIn(node.children ?? [])];
  });
}

/** Whether `node` is a footnote's link back to a citation, or the superscript holding one. */
function isBackref(node: HtmlNode): boolean {
  const href = node.properties?.href;
  if (node.tagName === "a") return typeof href === "string" && href.startsWith("#fnref");
  return node.tagName === "sup" && (node.children ?? []).some(isBackref);
}

/** Footnote `item`'s content without its backrefs, which end its last paragraph. */
function withoutBackrefs(item: HtmlNode): HtmlNode[] {
  const children = item.children ?? [];
  const last = children.map(({ tagName }) => tagName).lastIndexOf("p");
  return children.map((child, i) => {
    if (i !== last) return child;
    const content = child.children ?? [];
    const cut = content.findIndex(isBackref);
    const kept = cut === -1 ? content : content.slice(0, cut);
    const tail = kept.at(-1);
    // Rustdoc puts a no-break space before the first backref
    if (tail?.type !== "text") return { ...child, children: kept };
    return { ...child, children: [...kept.slice(0, -1), text((tail.value ?? "").trimEnd())] };
  });
}

/** Links back from footnote `n` to its `count` citations, as rustdoc writes them. */
function backrefs(n: number, count: number): HtmlNode[] {
  if (count === 1) return [text("\u00a0"), element("a", { href: `#fnref${n}` }, [text("↩")])];
  const rest = Array.from({ length: count - 1 }, (_, i) => [
    text("\u00a0"),
    element("sup", {}, [element("a", { href: `#fnref${n}-${i + 2}` }, [text(String(i + 2))])]),
  ]);
  return [
    text("\u00a0"),
    element("a", { href: `#fnref${n}` }, [text("↩\u00a0"), element("sup", {}, [text("1")])]),
    ...rest.flat(),
  ];
}

/** What's wrong with the manifest on its own: an id or slug listed twice, or an orphaned slug. */
function manifestErrors({ omit, chapters }: ReferenceManifest): string[] {
  const repeated = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i);
  const slugs = chapters.map(({ slug }) => slug);
  return [
    ...repeated([...chapters.map(({ id }) => id), ...omit]).map((id) => `#${id} is listed twice`),
    ...repeated(slugs).map((slug) => `The slug ${slug} is listed twice`),
    ...slugs
      .filter((slug) => slug.includes("/") && !slugs.includes(path.posix.dirname(slug)))
      .map((slug) => `${slug} nests under ${path.posix.dirname(slug)}, which isn't a chapter`),
  ];
}

/** Throw `errors`, naming the page they're about. */
function fail(page: string, errors: string[]): never {
  const list = errors.map((error) => `  - ${error}`).join("\n");
  throw new Error(`Can't cut the Reference from ${page}:\n${list}`);
}

/**
 * Cut the top-level `nodes` of rendered page `page`, which cite `footnotes`, into the chapters
 * `manifest` lists. Also returns the API links the chapters keep, whose fragments rustdoc doesn't
 * check.
 */
export function buildReference(
  manifest: ReferenceManifest,
  page: string,
  nodes: HtmlNode[],
  footnotes: ReadonlyMap<string, HtmlNode>,
): { reference: Reference; apiLinks: RenderedLink[] } {
  const errors = manifestErrors(manifest);
  const listed = new Map(manifest.chapters.map((chapter) => [chapter.id, chapter]));
  /** Whether `node` is a heading the manifest lists or omits, which starts a section. */
  const starts = (node: HtmlNode) => {
    const id = idOf(node) ?? "";
    return headingLevel(node) !== undefined && (listed.has(id) || manifest.omit.includes(id));
  };

  for (const node of nodes) {
    if (node.tagName === "h2" && !starts(node)) {
      errors.push(`The h2 #${idOf(node)} is neither listed nor omitted`);
    }
  }
  if (nodes.length > 0 && !starts(nodes[0])) {
    errors.push("The page has content before its first listed or omitted heading");
  }
  const sections = splitSections(nodes, starts);
  const found = sections.map(({ heading }) => idOf(heading) ?? "");
  for (const id of [...listed.keys(), ...manifest.omit]) {
    if (!found.includes(id)) errors.push(`The listed heading #${id} isn't on the page`);
  }
  const order = found.filter((id) => listed.has(id));
  if (order.length === listed.size && order.some((id, i) => id !== manifest.chapters[i].id)) {
    errors.push(`The chapters are listed out of page order, which is ${order.join(", ")}`);
  }
  if (errors.length > 0) fail(page, errors);

  const chapters = sections.flatMap((section) => {
    const chapter = listed.get(idOf(section.heading) ?? "");
    const level = headingLevel(section.heading);
    return chapter === undefined || level === undefined ? [] : [{ ...section, chapter, level }];
  });

  // Every id a chapter defines, other than footnotes', is an anchor it owns
  const owners = new Map<string, ManifestChapter>();
  const anchors: Record<string, string> = {};
  for (const { heading, nodes: content, chapter } of chapters) {
    const route = `${manifest.root}/${chapter.slug}`;
    for (const id of idsIn([heading, ...content]).filter((id) => !FOOTNOTE_ID.test(id))) {
      const owner = owners.get(id);
      if (owner !== undefined) {
        const twice = owner === chapter ? "twice in" : `in both ${owner.slug} and`;
        errors.push(`#${id} is defined ${twice} ${chapter.slug}`);
        continue;
      }
      owners.set(id, chapter);
      anchors[id] = id === chapter.id ? route : `${route}#${id}`;
    }
  }

  const apiLinks: RenderedLink[] = [];
  const built = chapters.map(({ heading, title, nodes: content, chapter, level }) => {
    const shift = level - 1;
    /** The footnotes it cites, by page number: each one's number in the chapter, and citations. */
    const cited = new Map<string, { n: number; count: number }>();

    const cite = (number: string): HtmlNode => {
      if (!footnotes.has(`fn${number}`)) {
        errors.push(`${chapter.slug} cites footnote ${number}, which has no definition`);
      }
      const footnote = cited.get(number) ?? { n: cited.size + 1, count: 0 };
      footnote.count += 1;
      cited.set(number, footnote);
      const { n, count } = footnote;
      const id = count === 1 ? `fnref${n}` : `fnref${n}-${count}`;
      return element("sup", { id }, [element("a", { href: `#fn${n}` }, [text(String(n))])]);
    };

    const relink = (properties: Record<string, unknown>, node: HtmlNode) => {
      const href = String(properties.href);
      if (/^[a-z][a-z\d+.-]*:/i.test(href)) return; // Another site's
      const url = href.startsWith("#") ? `${SITE_ROOT}/${page}${href}` : siteUrl(page, href);
      const [target, fragment] = url.split("#");
      if (target !== `${SITE_ROOT}/${page}`) {
        // Another rustdoc page, such as an API item's, keeping the title that names the item
        properties.href = url;
        if (properties.title !== undefined) apiLinks.push({ text: textOf(node), url });
        return;
      }
      delete properties.title; // Only names this page's module, `sci_cream::docs`
      if (fragment === undefined) {
        properties.href = manifest.root;
        return;
      }
      const owner = owners.get(fragment);
      if (owner === undefined) {
        errors.push(`${chapter.slug} links to #${fragment}, which no chapter owns`);
      } else {
        properties.href = owner === chapter ? `#${fragment}` : anchors[fragment];
      }
    };

    const rewrite = (node: HtmlNode): HtmlNode[] => {
      if (node.type === "comment") return [];
      if (node.type !== "element") return [node];
      if (classesOf(node).includes("doc-anchor")) return []; // Rustdoc's `§` permalink
      const citation = CITATION_ID.exec(idOf(node) ?? "");
      if (node.tagName === "sup" && citation) return [cite(citation[1])];
      const properties = { ...node.properties };
      if (node.tagName === "a" && properties.href !== undefined) relink(properties, node);
      const level = headingLevel(node);
      const tagName = level === undefined ? node.tagName : `h${level - shift}`;
      return [{ ...node, tagName, properties, children: (node.children ?? []).flatMap(rewrite) }];
    };

    const html = [heading, ...content].flatMap(rewrite);
    const items = [...cited].flatMap(([number, { n, count }]) => {
      const item = footnotes.get(`fn${number}`);
      if (item === undefined) return []; // Reported where it's cited
      const children = withoutBackrefs(item).flatMap(rewrite);
      const last = children.map(({ tagName }) => tagName).lastIndexOf("p");
      if (last === -1) {
        errors.push(`Footnote ${number} has no paragraph for its backrefs`);
        return [];
      }
      const end = children[last];
      const ends = [...(end.children ?? []), ...backrefs(n, count)];
      children[last] = { ...end, children: ends };
      return [element("li", { id: `fn${n}` }, children)];
    });
    if (items.length > 0) {
      const list = [element("hr", {}, []), element("ol", {}, items)];
      html.push(element("div", { className: ["footnotes"] }, list));
    }
    const tree = { type: "root", children: html } as unknown as Parameters<typeof toHtml>[0];
    return { slug: chapter.slug, title, description: chapter.description, html: toHtml(tree) };
  });

  if (errors.length > 0) fail(page, errors);
  return { reference: { root: manifest.root, chapters: built, anchors }, apiLinks };
}

/** The manifest, from `docs/_chapters.json`. */
export function readManifest(): ReferenceManifest {
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8")) as ReferenceManifest;
}

/**
 * Where `url`, a site URL as {@link siteUrl} gives it, goes once the docs page is the Reference: a
 * link into that page goes to the route of the chapter owning its anchor, or without an anchor to
 * the root. Any other URL stays as it is, and an anchor no chapter owns is an error.
 */
export function referenceUrl(url: string, { root, anchors }: Omit<Reference, "chapters">): string {
  const [target, fragment] = url.split("#");
  if (target !== `${SITE_ROOT}/${REFERENCE_PAGE}`) return url;
  if (fragment === undefined) return root;
  const anchor = anchors[fragment];
  if (anchor === undefined) {
    throw new Error(`No chapter of the Reference owns the anchor of ${url}`);
  }
  return anchor;
}

/** {@link buildReference} from the crate's rendered docs, checking its API links' fragments too. */
export function readReference(): Reference {
  const { reference, apiLinks } = buildReference(
    readManifest(),
    REFERENCE_PAGE,
    readDocblock(REFERENCE_PAGE),
    readFootnotes(REFERENCE_PAGE),
  );
  const broken = brokenAnchors(apiLinks).map(({ url }) => `No anchor for ${url}`);
  if (broken.length > 0) fail(REFERENCE_PAGE, broken);
  return reference;
}
