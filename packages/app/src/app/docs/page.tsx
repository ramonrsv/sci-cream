import type { Metadata } from "next";

import { getMarkdownComposite, getMarkdownPage, TABLE_OF_CONTENT_SLUG } from "@/lib/markdown";
import { MarkdownArticles } from "@/app/_elements/markdown-articles";

/** Generates page metadata from the table of contents' frontmatter. */
export async function generateMetadata(): Promise<Metadata> {
  const { frontmatter } = await getMarkdownPage("docs", TABLE_OF_CONTENT_SLUG);
  return { title: frontmatter.title, description: frontmatter.description };
}

/** Docs index: the table of contents, followed by the pages its frontmatter lists. */
export default async function DocsPage() {
  return <MarkdownArticles pages={await getMarkdownComposite("docs", TABLE_OF_CONTENT_SLUG)} />;
}
