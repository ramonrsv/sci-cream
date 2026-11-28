import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getReferenceChapterSlugs, getReferencePage } from "@/lib/docs-reference";
import { MarkdownArticle } from "@/app/_elements/markdown-article";
import { CommentThread } from "@/app/_components/comment-thread";

interface Props {
  params: Promise<{ slug: string[] }>;
}

/** Every chapter is prerendered from the crate's Reference, so an unlisted slug is a 404. */
export const dynamicParams = false;

/** Returns every chapter's slug for static generation, one path segment per array entry. */
export async function generateStaticParams() {
  return getReferenceChapterSlugs().map((slug) => ({ slug: slug.split("/") }));
}

/** Generates page metadata from the chapter's title and description. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getReferencePage(slug.join("/"));
  return page ? { title: page.frontmatter.title, description: page.frontmatter.description } : {};
}

/** Renders the Reference's chapter at `slug`. */
export default async function ReferenceChapterPage({ params }: Props) {
  const { slug } = await params;
  const page = await getReferencePage(slug.join("/"));
  if (page === undefined) notFound();

  return (
    <>
      <MarkdownArticle page={page} />
      <CommentThread subject={{ type: "docs", key: page.slug }} />
    </>
  );
}
