import fs from "fs";
import path from "path";

import matter from "gray-matter";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkRehype from "remark-rehype";

const contentRoot = path.join(process.cwd(), "content");

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

export interface MarkdownPage {
  slug: string;
  frontmatter: Frontmatter;
  contentHtml?: string;
}

/** Options for rendering a page that forms one section of a larger document. */
export interface MarkdownRenderOptions {
  /**
   * Prefix for heading `id`s: `"recipes"` turns `#underbelly` into `#recipes-underbelly`.
   * Keeps anchors unique when several pages are concatenated into one document.
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
}

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

/** Apply `visit` to `node` and every descendant, depth-first in document order. */
function walkContentTree(node: ContentNode, visit: (node: ContentNode) => void): void {
  visit(node);
  for (const child of node.children ?? []) walkContentTree(child, visit);
}

/** Match a `/{section}/{slug}` URL, returning the slug, or `undefined` for any other URL. */
function matchSectionUrl(section: string, url: string | undefined): string | undefined {
  return new RegExp(`^/${section}/([^/#?]+)$`).exec(url ?? "")?.[1];
}

/** Read a file from the content directory as UTF-8 text. */
function readFileFromContentRoot(...segments: string[]): string {
  return fs.readFileSync(path.join(contentRoot, ...segments), "utf8");
}

/** Read only a page's frontmatter, skipping the markdown-to-HTML conversion. */
function readFrontmatter(section: string, slug: string): Frontmatter {
  return matter(readFileFromContentRoot(section, `${slug}.md`)).data as Frontmatter;
}

/** Return the slugs listed in a page's frontmatter `pages`, or an empty array if it lists none. */
export function getListedPages(section: string, slug: string): string[] {
  return readFrontmatter(section, slug).pages ?? [];
}

/** Return the slugs of all `.md` files in a content subdirectory. */
export function getMarkdownSlugs(section: string): string[] {
  const dir = path.join(contentRoot, section);
  if (!fs.existsSync(dir)) {
    throw new Error(`Content section not found: "${section}" (looked in ${dir})`);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
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
        const target = matchSectionUrl(section, properties.href);
        if (target !== undefined && anchorSlugs.includes(target)) properties.href = `#${target}`;
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

  const processed = await remark()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeRenderOptions, section, options)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return { slug, frontmatter: data as Frontmatter, contentHtml: processed.toString() };
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
      getMarkdownPage(section, listed, { idPrefix: listed, demoteHeadings: 1, anchorSlugs }),
    ),
  ]);
}
