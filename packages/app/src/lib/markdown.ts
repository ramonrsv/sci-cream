import fs from "fs";
import path from "path";

import matter from "gray-matter";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkRehype from "remark-rehype";

/** Root of the authored content tree; `docs`/`blog` sections live directly beneath it. */
export const CONTENT_ROOT = path.join(process.cwd(), "content");

/** Slug of the hand-maintained docs index, rendered at `/docs` as well as at its own route. */
export const TABLE_OF_CONTENT_SLUG = "table-of-content";

export interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  /** Slugs rendered after this page on its own route; see {@link getMarkdownComposite}. */
  pages?: string[];
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

/** Options for rendering a page that forms one section of a larger document. */
export interface MarkdownRenderOptions {
  /**
   * Prefix for heading `id`s: `"recipes"` turns `#underbelly` into `#recipes-underbelly`.
   * Keeps anchors unique when several pages are concatenated into one document.
   * Pass a slug through {@link slugToId} first, so nested slugs stay slash-free.
   */
  idPrefix?: string;
  /** Levels to demote every heading by; `1` renders `#` as `<h2>`. Clamped at `<h6>`. */
  demoteHeadings?: number;
  /** Slugs also rendered here — and only those: links to them become `#{slug}` anchors. */
  anchorSlugs?: string[];
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

/** A slug as an HTML id: `other-resources/science` becomes `other-resources-science`. */
export function slugToId(slug: string): string {
  return slug.replaceAll("/", "-");
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
 * Pipeline position is load-bearing: after id rewriting, so ids match the HTML; before
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

/**
 * In-page href for a link to one of `anchorSlugs`, or `undefined` for any other link.
 *
 * A fragment carries over onto the target's prefixed ids, so a link to a section of a listed
 * page still lands on that section: `/docs/a/b#c` becomes `#a-b-c`.
 */
function anchorHrefFor(section: string, href: string, anchorSlugs: string[]): string | undefined {
  const match = new RegExp(`^/${section}/([^#?]+?)(?:#([^#?]+))?$`).exec(href);
  if (match === null || !anchorSlugs.includes(match[1])) return undefined;
  return `#${[slugToId(match[1]), match[2]].filter((part) => part !== undefined).join("-")}`;
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

/** Read only a page's frontmatter, skipping the markdown-to-HTML conversion. */
function readFrontmatter(section: string, slug: string): Frontmatter {
  return matter(readFileFromContentRoot(section, `${slug}.md`)).data as Frontmatter;
}

/** Return the slugs listed in a page's frontmatter `pages`, or an empty array if it lists none. */
export function getListedPages(section: string, slug: string): string[] {
  return readFrontmatter(section, slug).pages ?? [];
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

/**
 * Rehype plugin applying {@link MarkdownRenderOptions} to a rendered page.
 *
 * Runs after `rehype-slug`, so heading `id`s already exist by the time they are prefixed.
 */
function rehypeRenderOptions(section: string, options: MarkdownRenderOptions) {
  const { idPrefix, demoteHeadings = 0, anchorSlugs = [] } = options;

  return (tree: ContentNode) => {
    walkContentTree(tree, (node) => {
      const { tagName, properties } = node;
      if (properties === undefined || tagName === undefined) return;

      const headingLevel = HEADING_TAGS.indexOf(tagName) + 1;
      if (headingLevel > 0) {
        node.tagName = `h${Math.min(headingLevel + demoteHeadings, HEADING_TAGS.length)}`;
        if (idPrefix !== undefined && typeof properties.id === "string") {
          properties.id = `${idPrefix}-${properties.id}`;
        }
      }

      if (tagName === "a" && typeof properties.href === "string") {
        const anchor = anchorHrefFor(section, properties.href, anchorSlugs);
        if (anchor !== undefined) properties.href = anchor;
      }
    });
  };
}

/** Read a single markdown file, convert to HTML, and return the result. */
export async function getMarkdownPage(
  section: string,
  slug: string,
  options: MarkdownRenderOptions = {},
): Promise<MarkdownPage> {
  const { data, content } = matter(readFileFromContentRoot(section, `${slug}.md`));
  const headings: MarkdownHeading[] = [];

  // Autolinking runs after the ids are rewritten, so permalinks point at their final target
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkAlert)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeRenderOptions, section, options)
    .use(rehypeCollectHeadings, headings)
    .use(rehypeAutolinkHeadings, HEADING_PERMALINK)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return { slug, frontmatter: data as Frontmatter, contentHtml: processed.toString(), headings };
}

/**
 * Read a page together with the pages its frontmatter `pages` list names, ready to render in order.
 *
 * Listed pages follow, demoted a level with slug-prefixed ids, so the route keeps one `<h1>` and
 * unique anchors. Links to them become in-page anchors; all other links are untouched. Expansion
 * stops there: a listed page's own `pages` list belongs to its own route.
 */
export async function getMarkdownComposite(section: string, slug: string): Promise<MarkdownPage[]> {
  const anchorSlugs = getListedPages(section, slug);

  return Promise.all([
    getMarkdownPage(section, slug, { anchorSlugs }),
    ...anchorSlugs.map((listed) =>
      getMarkdownPage(section, listed, {
        idPrefix: slugToId(listed),
        demoteHeadings: 1,
        anchorSlugs,
      }),
    ),
  ]);
}
