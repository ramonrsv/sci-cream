import Link from "next/link";
import type { Metadata } from "next";

import { getMarkdownSummaries } from "@/lib/markdown";

/** Next.js page metadata for the blog index */
export const metadata: Metadata = { title: "Blog" };

/** Index page listing all blog posts, newest first. */
export default function BlogPage() {
  const posts = getMarkdownSummaries("blog");
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Blog</h1>
      <ul className="space-y-5">
        {posts.map(({ slug, frontmatter }) => (
          <li key={slug}>
            {frontmatter.date && (
              <time className="text-txt-sec-lt dark:text-txt-sec-dk text-sm">
                {frontmatter.date}
              </time>
            )}
            <div>
              <Link
                href={`/blog/${slug}`}
                className="text-lg font-medium underline-offset-4 hover:underline"
              >
                {frontmatter.title}
              </Link>
            </div>
            {frontmatter.description && (
              <p className="text-txt-sec-lt dark:text-txt-sec-dk text-sm">
                {frontmatter.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
