import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getMarkdownComposite, getMarkdownPage, getMarkdownSlugs } from "@/lib/markdown";
import { MarkdownArticles } from "@/app/_elements/markdown-articles";

interface Props {
  params: Promise<{ slug: string[] }>;
}

/** Returns all valid slugs for static generation, one path segment per array entry. */
export async function generateStaticParams() {
  return getMarkdownSlugs("docs").map((slug) => ({ slug: slug.split("/") }));
}

/** Generates page metadata from the markdown frontmatter. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { frontmatter } = await getMarkdownPage("docs", slug.join("/"));
    return { title: frontmatter.title, description: frontmatter.description };
  } catch {
    return {};
  }
}

/** Renders `content/docs/{slug}.md` and the pages its frontmatter lists, as one composite. */
export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  let pages;
  try {
    pages = await getMarkdownComposite("docs", slug.join("/"));
  } catch {
    notFound();
  }
  return <MarkdownArticles pages={pages} />;
}
