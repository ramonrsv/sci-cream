import type { MarkdownPage } from "@/lib/markdown";

interface Props {
  /** Page to render, as returned by `getMarkdownPage`. */
  page: MarkdownPage;
}

/** Renders one pre-rendered markdown page as a prose article. */
export function MarkdownArticle({ page }: Props) {
  return (
    <article
      className="prose dark:prose-invert max-w-5xl"
      dangerouslySetInnerHTML={{ __html: page.contentHtml! }}
    />
  );
}
