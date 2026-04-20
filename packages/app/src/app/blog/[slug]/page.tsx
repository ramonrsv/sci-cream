import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getMarkdownPage, getMarkdownSlugs } from "@/lib/markdown";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Returns all valid slugs for static generation. */
export async function generateStaticParams() {
  return getMarkdownSlugs("blog").map((slug) => ({ slug }));
}

/** Generates page metadata from the markdown frontmatter. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { frontmatter } = await getMarkdownPage("blog", slug);
    return { title: frontmatter.title, description: frontmatter.description };
  } catch {
    return {};
  }
}

/** Renders a single blog post from `content/blog/{slug}.md`. */
export default async function BlogSlugPage({ params }: Props) {
  const { slug } = await params;
  let page;
  try {
    page = await getMarkdownPage("blog", slug);
  } catch {
    notFound();
  }
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {page.frontmatter.date && (
        <time className="text-txt-sec-lt dark:text-txt-sec-dk mb-2 block text-sm">
          {page.frontmatter.date}
        </time>
      )}
      <article
        className="prose dark:prose-invert max-w-5xl"
        dangerouslySetInnerHTML={{ __html: page.contentHtml! }}
      />
    </div>
  );
}
