/**
 * The Reference: the crate's `sci_cream::docs`, cut into chapters by its `gen:reference`, served
 * under `/docs/reference` beside the markdown pages of `content/docs`.
 *
 * Server-only: `@workspace/sci-cream/reference` carries every chapter's HTML.
 */

import {
  referenceChapter,
  referenceChapters,
  type ReferenceChapter,
} from "@workspace/sci-cream/reference";

import { renderHtml, type Frontmatter, type MarkdownPage } from "@/lib/markdown";

/** Docs slug of the Reference's index, which every chapter's docs slug nests under. */
export const REFERENCE_SLUG = "reference";

/** The index's title and blurb, in place of the frontmatter a markdown page carries. */
export const REFERENCE_FRONTMATTER: Frontmatter = {
  title: "Science Reference",
  description:
    "In-depth ice cream science documentation from the sci-cream crate, citing formal sources.",
};

/** A chapter's docs slug, from its slug within the Reference: `reference/sweeteners/sugars`. */
function docsSlug(slug: string): string {
  return `${REFERENCE_SLUG}/${slug}`;
}

/** A chapter rendered as a docs page, under its docs slug. */
async function renderChapter(chapter: ReferenceChapter): Promise<MarkdownPage> {
  const { slug, title, description, html } = chapter;
  return { slug: docsSlug(slug), frontmatter: { title, description }, ...(await renderHtml(html)) };
}

/** Each chapter's slug within the Reference, `sweeteners/sugars`, in table-of-contents order. */
export function getReferenceChapterSlugs(): string[] {
  return referenceChapters.map(({ slug }) => slug);
}

/** Each chapter's docs slug, which its comment thread is keyed on. */
export function getReferenceDocsSlugs(): string[] {
  return referenceChapters.map(({ slug }) => docsSlug(slug));
}

/** The chapter at `slug` within the Reference as a docs page, or `undefined` if there is none. */
export async function getReferencePage(slug: string): Promise<MarkdownPage | undefined> {
  const chapter = referenceChapter(slug);
  return chapter && renderChapter(chapter);
}

/** The Reference's pages, its index and then every chapter, which nest under it by docs slug. */
export async function getReferencePages(): Promise<MarkdownPage[]> {
  const chapters = await Promise.all(referenceChapters.map(renderChapter));
  return [{ slug: REFERENCE_SLUG, frontmatter: REFERENCE_FRONTMATTER }, ...chapters];
}
