import type { MarkdownPage } from "@/lib/markdown";

interface Props {
  /** Pages to render in order, as returned by `getMarkdownComposite`. */
  pages: MarkdownPage[];
}

/** Renders pre-rendered markdown pages as consecutive articles, each anchored by its slug. */
export function MarkdownArticles({ pages }: Props) {
  return (
    <div className="doc-page">
      {pages.map((page) => (
        <article
          key={page.slug}
          id={page.slug}
          className="prose dark:prose-invert max-w-5xl"
          dangerouslySetInnerHTML={{ __html: page.contentHtml! }}
        />
      ))}
    </div>
  );
}
