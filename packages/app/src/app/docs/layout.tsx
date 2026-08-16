/** Page chrome shared by the docs index and every docs page. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <div className="doc-page">{children}</div>;
}
