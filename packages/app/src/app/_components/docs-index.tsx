import Link from "next/link";

import { docsHref, type DocsNavNode } from "@/lib/docs";

/** One indent step; nested lists compose, so a single constant covers every depth. */
const NEST_CLASS = "ml-6";

/** One entry: its title as a link, its description, then the pages nested under it. */
function IndexEntry({ node }: { node: DocsNavNode }) {
  return (
    <li>
      <Link href={docsHref(node.slug)} className="text-txt-prim font-medium hover:underline">
        {node.title}
      </Link>
      {node.description !== undefined && (
        <p className="text-txt-sec mt-0.5 text-sm">{node.description}</p>
      )}
      {node.children.length > 0 && (
        <ul className={`${NEST_CLASS} mt-3 flex flex-col gap-3`}>
          {node.children.map((child) => (
            <IndexEntry key={child.slug} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface Props {
  /** The index's heading. */
  title: string;
  /** A lead paragraph under the heading. */
  description?: string;
  /** The pages to list: the docs page tree, as built by `getDocsNav`, or a branch of it. */
  nav: DocsNavNode[];
}

/**
 * A docs landing page: every page it lists with its own description.
 *
 * Generated from the nav manifest and each page's frontmatter rather than hand-written.
 */
export function DocsIndex({ title, description, nav }: Props) {
  return (
    <div className="prose dark:prose-invert max-w-5xl">
      <h1>{title}</h1>
      {description !== undefined && <p>{description}</p>}
      <ul className="not-prose flex flex-col gap-3">
        {nav.map((node) => (
          <IndexEntry key={node.slug} node={node} />
        ))}
      </ul>
    </div>
  );
}
