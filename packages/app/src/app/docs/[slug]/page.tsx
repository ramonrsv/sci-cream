import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getMarkdownPage, getMarkdownSlugs } from "@/lib/markdown";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Returns all valid slugs for static generation. */
export async function generateStaticParams() {
  return getMarkdownSlugs("docs").map((slug) => ({ slug }));
}

/** Generates page metadata from the markdown frontmatter. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { frontmatter } = await getMarkdownPage("docs", slug);
    return { title: frontmatter.title, description: frontmatter.description };
  } catch {
    return {};
  }
}

/** Renders a single documentation page from `content/docs/{slug}.md`. */
export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  let page;
  try {
    page = await getMarkdownPage("docs", slug);
  } catch {
    notFound();
  }
  return (
    <div className="doc-page">
      <article
        className="prose dark:prose-invert max-w-5xl"
        dangerouslySetInnerHTML={{ __html: page.contentHtml! }}
      />
    </div>
  );
}
