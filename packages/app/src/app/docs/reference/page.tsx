import type { Metadata } from "next";

import { getDocsNav } from "@/lib/docs-nav";
import { REFERENCE_FRONTMATTER, REFERENCE_SLUG } from "@/lib/docs-reference";
import { verifyDefined } from "@/lib/util";
import { DocsIndex } from "@/app/_components/docs-index";

/** The index's title and blurb, as the docs nav shows them. */
export const metadata: Metadata = {
  title: REFERENCE_FRONTMATTER.title,
  description: REFERENCE_FRONTMATTER.description,
};

/** The Reference's index: its chapters, as the docs nav nests them under it. */
export default async function ReferencePage() {
  const reference = (await getDocsNav()).find(({ slug }) => slug === REFERENCE_SLUG);
  verifyDefined(reference, `content/docs/_nav.json does not list "${REFERENCE_SLUG}"`);

  return (
    <DocsIndex
      title={reference.title}
      description={reference.description}
      nav={reference.children}
    />
  );
}
