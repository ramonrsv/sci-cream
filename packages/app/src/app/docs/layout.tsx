import { DocsToc } from "@/app/_components/docs-toc";
import { getDocsNav } from "@/lib/docs-nav";

/** Chrome shared by the docs index and every docs page: the table of contents, then the page. */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="doc-shell">
      <DocsToc nav={await getDocsNav()} />
      <div className="doc-content">{children}</div>
    </div>
  );
}
