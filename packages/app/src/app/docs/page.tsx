import Link from "next/link";
import type { Metadata } from "next";

import { getMarkdownSummaries } from "@/lib/markdown";

/** Next.js page metadata for the docs index */
export const metadata: Metadata = { title: "Docs" };

/** Index page listing all documentation articles, ordered by `order`, if present. */
export default function DocsPage() {
  const pages = getMarkdownSummaries("docs");
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Documentation</h1>
      <ul className="space-y-3">
        {pages.map(({ slug, frontmatter }) => (
          <li key={slug}>
            <Link
              href={`/docs/${slug}`}
              className="text-lg font-medium underline-offset-4 hover:underline"
            >
              {frontmatter.title}
            </Link>
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
