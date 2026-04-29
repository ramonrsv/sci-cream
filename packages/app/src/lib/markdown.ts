import fs from "fs";
import path from "path";

import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import remarkSlug from "remark-slug";

const contentRoot = path.join(process.cwd(), "content");

export interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  order?: number;
  [key: string]: unknown;
}

export interface MarkdownPage {
  slug: string;
  frontmatter: Frontmatter;
  contentHtml?: string;
}

/** Read a file from the content directory as UTF-8 text. */
function readFileFromContentRoot(...segments: string[]): string {
  return fs.readFileSync(path.join(contentRoot, ...segments), "utf8");
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
 * Sort an array of MarkdownPage objects by frontmatter `order` and `date`.
 *
 * Pages are sorted first by `order` (ascending), if present, then by `date` (descending). Pages
 * without an `order` value are sorted after those with an `order` value. If two pages have the same
 * `order` value, they are sorted by `date` as well.
 */
export function sortMarkdownPages(pages: MarkdownPage[]): MarkdownPage[] {
  return pages.sort((a, b) => {
    const afm = { ...a.frontmatter, date: a.frontmatter.date ?? "" };
    const bfm = { ...b.frontmatter, date: b.frontmatter.date ?? "" };

    if (afm.order !== undefined && bfm.order !== undefined) return afm.order - bfm.order;
    if (afm.order !== undefined) return -1;
    if (bfm.order !== undefined) return 1;

    return bfm.date.localeCompare(afm.date);
  });
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

  // @ts-expect-error: unified version mismatch between remark-slug@7 and remark@15
  const processed = await remark().use(remarkSlug).use(html, { sanitize: false }).process(content);

  return { slug, frontmatter: data as Frontmatter, contentHtml: processed.toString() };
}
