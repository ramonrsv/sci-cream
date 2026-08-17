import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getMarkdownPage, getMarkdownSlugs } from "@/lib/markdown";
import { MarkdownArticle } from "@/app/_elements/markdown-article";
import { CommentThread } from "@/app/_components/comment-thread";

interface Props {
  params: Promise<{ slug: string[] }>;
}

/** Every docs route is prerendered from a file, so an unlisted slug is a 404, not a render. */
export const dynamicParams = false;

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

/** Renders `content/docs/{slug}.md`. */
export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  const key = slug.join("/");
  let page;
  try {
    page = await getMarkdownPage("docs", key);
  } catch {
    notFound();
  }
  return (
    <>
      <MarkdownArticle page={page} />
      <CommentThread subject={{ type: "docs", key }} />
    </>
  );
}
