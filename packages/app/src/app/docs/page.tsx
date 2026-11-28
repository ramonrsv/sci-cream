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

/** Docs landing page, generated from the nav manifest; every page is served at its own route. */
export default async function DocsPage() {
  return <DocsIndex title={TITLE} nav={await getDocsNav()} />;
}
