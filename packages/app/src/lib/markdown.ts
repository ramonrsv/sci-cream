import fs from "fs";
import path from "path";

import matter from "gray-matter";
import { fromHtml } from "hast-util-from-html";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkRehype from "remark-rehype";

/** Root of the authored content tree; `docs`/`blog` sections live directly beneath it. */
export const CONTENT_ROOT = path.join(process.cwd(), "content");

/** Root a root-relative image `src` resolves against: `/logo.svg` is `public/logo.svg`. */
const PUBLIC_ROOT = path.join(process.cwd(), "public");

export interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  [key: string]: unknown;
}

/** A heading a page renders, addressable on that page's route as `#{id}`. */
export interface MarkdownHeading {
  /** The `id` `rehype-slug` generated from the heading text. */
  id: string;
  /** Heading text, inline markup flattened and the permalink marker excluded. */
  text: string;
  /** Heading level: `1` for `h1` through `6` for `h6`. */
  level: number;
}

export interface MarkdownPage {
  slug: string;
  frontmatter: Frontmatter;
  contentHtml?: string;
  /** Headings in document order; present whenever `contentHtml` is. */
  headings?: MarkdownHeading[];
}

/**
 * Minimal structural view of the hast nodes this module inspects.
 *
 * The `unist`/`hast` types are not direct dependencies, so these fields are declared locally.
 */
interface ContentNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: ContentNode[];
  /** Text nodes carry their content here; element nodes leave it unset. */
  value?: string;
}

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

/** Permalink appended to every heading, styled by `.heading-permalink` in `globals.css`. */
const HEADING_PERMALINK = {
  behavior: "append" as const,
  properties: { className: "heading-permalink", ariaLabel: "Permalink to this section" },
  content: { type: "text" as const, value: "#" },
};

/** Apply `visit` to `node` and every descendant, depth-first in document order. */
function walkContentTree(node: ContentNode, visit: (node: ContentNode) => void): void {
  visit(node);
  for (const child of node.children ?? []) walkContentTree(child, visit);
}

/** Concatenated text of `node` and its descendants, flattening any inline markup. */
function contentText(node: ContentNode): string {
  let text = "";
  walkContentTree(node, (child) => {
    if (child.type === "text" && typeof child.value === "string") text += child.value;
  });
  return text;
}

/**
 * Rehype plugin collecting every heading into `into`, in document order.
 *
 * Pipeline position is load-bearing: after `rehype-slug`, so ids match the HTML; before
 * `rehype-autolink-headings`, whose appended permalink would otherwise land in the text.
 *
 * `into` is an out-parameter because a unified transformer has no return channel to its caller.
 */
function rehypeCollectHeadings(into: MarkdownHeading[]) {
  return (tree: ContentNode) => {
    walkContentTree(tree, (node) => {
      const level = HEADING_TAGS.indexOf(node.tagName ?? "") + 1;
      const id = node.properties?.id;
      if (level > 0 && typeof id === "string") {
        into.push({ id, text: contentText(node), level });
      }
    });
  };
}

/** Attribute a tag opts in with; `<img data-inline …>` is the whole of the marker. */
const INLINE_MARKER = "dataInline";

/** An `src` this plugin can inline: root-relative, and naming an `.svg`. */
const LOCAL_SVG = /^\/(?!\/).*\.svg$/;

/** Drop the file's own comments: they document the carrier, and the page has no use for them. */
function stripComments(node: ContentNode): void {
  if (!node.children) return;
  node.children = node.children.filter((child) => child.type !== "comment");
  node.children.forEach(stripComments);
}

/**
 * The `<svg>` an image node inlines to, or `undefined` where the tag did not ask to be inlined.
 *
 * Opting in is explicit rather than inferred from the `src`, which would sweep up every image that
 * merely looks local; a marked tag naming something unreadable throws rather than passing through.
 * Remaining attributes ride onto the `<svg>` root, and `alt` keeps its HTML meaning.
 */
function inlineSvg(node: ContentNode): ContentNode | undefined {
  if (node.tagName !== "img") return undefined;
  const { src, alt, [INLINE_MARKER]: marker, ...rest } = node.properties ?? {};
  if (marker === undefined) return undefined;
  if (typeof src !== "string" || !LOCAL_SVG.test(src)) {
    throw new Error(`data-inline wants a root-relative .svg src, got: ${String(src)}`);
  }

  const parsed = fromHtml(readSvgFromPublicRoot(src), { fragment: true, space: "svg" });
  const svg = (parsed.children as ContentNode[]).find((child) => child.tagName === "svg");
  if (!svg) throw new Error(`Inlined file has no <svg> root: ${src}`);

  stripComments(svg);
  const label = typeof alt === "string" ? alt : "";
  svg.properties = {
    ...svg.properties,
    ...rest,
    ...(label ? { role: "img", ariaLabel: label } : { ariaHidden: "true" }),
  };
  return svg;
}

/**
 * Rehype plugin splicing the `.svg` an `<img data-inline>` names into the page in place of the tag.
 *
 * An `<img>` renders its source in a separate document, out of reach of `.dark` and the theme
 * tokens; inlined, the mark is ordinary page DOM, so both resolve against the page. Position is
 * load-bearing: before `rehype-raw` a hand-written tag is still one opaque string.
 */
function rehypeInlineSvg() {
  return (tree: ContentNode) => {
    walkContentTree(tree, (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => inlineSvg(child) ?? child);
    });
  };
}

/**
 * Read a file from the content directory as UTF-8 text.
 *
 * Slugs reach this from the URL, so a path escaping the content root is rejected, not read.
 */
function readFileFromContentRoot(...segments: string[]): string {
  const filePath = path.resolve(CONTENT_ROOT, ...segments);
  if (!filePath.startsWith(CONTENT_ROOT + path.sep)) {
    throw new Error(`Content path escapes the content root: ${segments.join("/")}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Read an SVG named by a root-relative `src`.
 *
 * Authored input, so a path escaping the root is rejected, as in {@link readFileFromContentRoot}.
 */
function readSvgFromPublicRoot(src: string): string {
  const filePath = path.resolve(PUBLIC_ROOT, `.${src}`);
  if (!filePath.startsWith(PUBLIC_ROOT + path.sep)) {
    throw new Error(`Image path escapes the public root: ${src}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Return the slugs of all `.md` files in a content subdirectory, nested ones included.
 *
 * A file in a subdirectory keeps it as a slug segment: `docs/other-resources/science.md` is
 * `other-resources/science`, served at `/docs/other-resources/science`.
 */
export function getMarkdownSlugs(section: string): string[] {
  const dir = path.join(CONTENT_ROOT, section);
  if (!fs.existsSync(dir)) {
    throw new Error(`Content section not found: "${section}" (looked in ${dir})`);
  }
  return fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, "").replaceAll(path.sep, "/"));
}

/**
 * Sort an array of MarkdownPage objects by frontmatter `date`, newest first.
 *
 * Pages without a `date` sort after dated ones, stably among themselves.
 */
export function sortMarkdownPages(pages: MarkdownPage[]): MarkdownPage[] {
  return pages.sort((a, b) => (b.frontmatter.date ?? "").localeCompare(a.frontmatter.date ?? ""));
}

/** Filter out pages with `draft: true` in their frontmatter. */
export function filterOutDrafts(pages: MarkdownPage[]): MarkdownPage[] {
  return pages.filter((p) => !p.frontmatter.draft);
}

/** Return page summaries for all pages in `section`, sorted by {@link sortMarkdownPages}. */
export function getMarkdownSummaries(section: string): MarkdownPage[] {
  const summaries = getMarkdownSlugs(section).map((slug) => {
    const { data } = matter(readFileFromContentRoot(section, `${slug}.md`));
    return { slug, frontmatter: data as Frontmatter };
  });

  return sortMarkdownPages(filterOutDrafts(summaries));
}

/** Read a single markdown file, convert to HTML, and return the result. */
export async function getMarkdownPage(section: string, slug: string): Promise<MarkdownPage> {
  const { data, content } = matter(readFileFromContentRoot(section, `${slug}.md`));
  const headings: MarkdownHeading[] = [];

  const processed = await remark()
    .use(remarkGfm)
    .use(remarkAlert)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeInlineSvg)
    .use(rehypeSlug)
    .use(rehypeCollectHeadings, headings)
    .use(rehypeAutolinkHeadings, HEADING_PERMALINK)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return { slug, frontmatter: data as Frontmatter, contentHtml: processed.toString(), headings };
}
