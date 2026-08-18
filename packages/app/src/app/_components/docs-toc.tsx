"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

import { docsHref, type DocsNavNode } from "@/lib/docs";
import type { MarkdownHeading } from "@/lib/markdown";
import { DOCS_TOC_ICON_SIZE } from "@/lib/styles/sizes";

/** Heading levels listed under the current page; `h1` is its title, already the entry above. */
const TOC_HEADING_LEVELS = [2, 3];

/** Ties the mobile toggle's `aria-controls` to the list it opens. */
const TOC_LIST_ID = "docs-toc-list";

/** One indent step; nested lists compose, so a single constant covers every depth. */
const NEST_CLASS = "pl-3";

interface HeadingsProps {
  headings: MarkdownHeading[];
  onNavigate: () => void;
}

/** In-page anchors for the page being read. Plain `<a>`, a fragment needing no router work. */
function HeadingList({ headings, onNavigate }: HeadingsProps) {
  const listed = headings.filter(({ level }) => TOC_HEADING_LEVELS.includes(level));
  if (listed.length === 0) return null;

  return (
    <ul className={`${NEST_CLASS} flex flex-col`}>
      {listed.map(({ id, text, level }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            onClick={onNavigate}
            className={`text-txt-sec hover:bg-hov hover:text-txt-prim block rounded-md py-1 pr-2 text-xs ${level > 2 ? "pl-5" : "pl-2"}`}
          >
            {text}
          </a>
        </li>
      ))}
    </ul>
  );
}

interface ItemProps {
  node: DocsNavNode;
  /** Route being read, from `usePathname`. */
  pathname: string;
  onNavigate: () => void;
}

/** A page link, its headings when it is the page being read, then the pages nested under it. */
function NavItem({ node, pathname, onNavigate }: ItemProps) {
  const href = docsHref(node.slug);
  // Exact, not `startsWith`: `/docs/other-resources` would otherwise match its own child pages.
  const current = pathname === href;

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        className={`sidebar-item ${current ? "sidebar-item-active" : ""} gap-2 px-2`}
      >
        {node.title}
      </Link>
      {current && <HeadingList headings={node.headings} onNavigate={onNavigate} />}
      {node.children.length > 0 && (
        <ul className={`${NEST_CLASS} flex flex-col`}>
          {node.children.map((child) => (
            <NavItem key={child.slug} node={child} pathname={pathname} onNavigate={onNavigate} />
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
 * Table of contents for the docs section: every page, plus the current page's headings.
 *
 * A rail beside the article at `md+`, a collapsible bar above it below that.
 */
export function DocsToc({ nav }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav aria-label="Documentation" className="doc-toc">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={TOC_LIST_ID}
        onClick={() => setOpen(!open)}
        className="text-txt-prim hover:bg-hov flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium md:hidden"
      >
        {open ? (
          <ChevronDown size={DOCS_TOC_ICON_SIZE} />
        ) : (
          <ChevronRight size={DOCS_TOC_ICON_SIZE} />
        )}
        <span>Contents</span>
      </button>
      <ul
        id={TOC_LIST_ID}
        className={`flex-col gap-0.5 ${open ? "flex max-h-[60vh] overflow-y-auto" : "hidden"} md:flex md:max-h-none md:overflow-visible`}
      >
        {nav.map((node) => (
          <NavItem key={node.slug} node={node} pathname={pathname} onNavigate={close} />
        ))}
      </ul>
    </nav>
  );
}
