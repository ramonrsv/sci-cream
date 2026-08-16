import Link from "next/link";

import { docsHref, type DocsNavNode } from "@/lib/docs-nav";

interface EntryProps {
  node: DocsNavNode;
  /** Nesting step; children are indented one rung further than their parent. */
  depth: number;
}

/** Left inset per nesting step. Tailwind cannot build `ml-${n}`, so the ladder is spelled out. */
const INSET_CLASSES = ["ml-0", "ml-6", "ml-12"];

/** One entry: its title as a link, its description, then the pages nested under it. */
function IndexEntry({ node, depth }: EntryProps) {
  const inset = INSET_CLASSES[Math.min(depth, INSET_CLASSES.length - 1)];

  return (
    <li className={inset}>
      <Link href={docsHref(node.slug)} className="text-txt-prim font-medium hover:underline">
        {node.title}
      </Link>
      {node.description !== undefined && (
        <p className="text-txt-sec mt-0.5 text-sm">{node.description}</p>
      )}
      {node.children.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {node.children.map((child) => (
            <IndexEntry key={child.slug} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface Props {
  /** The docs page tree, as built by `getDocsNav`. */
  nav: DocsNavNode[];
}

/**
 * Docs landing page: every page with its own description.
 *
 * Generated from the nav manifest and each page's frontmatter rather than hand-written.
 */
export function DocsIndex({ nav }: Props) {
  return (
    <div className="prose dark:prose-invert max-w-5xl">
      <h1>Documentation</h1>
      <ul className="not-prose flex flex-col gap-3">
        {nav.map((node) => (
          <IndexEntry key={node.slug} node={node} depth={0} />
        ))}
      </ul>
    </div>
  );
}
