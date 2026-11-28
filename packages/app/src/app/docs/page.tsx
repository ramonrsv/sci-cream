import type { Metadata } from "next";

import { getDocsNav } from "@/lib/docs-nav";
import { DocsIndex } from "@/app/_components/docs-index";

/** The landing page's heading, and its metadata's title. */
const TITLE = "Documentation";

/** Static, the landing page having no markdown file of its own to take frontmatter from. */
export const metadata: Metadata = {
  title: TITLE,
  description: "Index of the Sci-Cream documentation.",
};

/**
 * Docs landing page, generated from the nav manifest: the top-level pages only, as the sidebar
 * lists them outside any branch. A branch's pages are found from its own page.
 */
export default async function DocsPage() {
  // New nodes, as the layout's sidebar shares the cached tree
  const topLevel = (await getDocsNav()).map((node) => ({ ...node, children: [] }));
  return <DocsIndex title={TITLE} nav={topLevel} />;
}
