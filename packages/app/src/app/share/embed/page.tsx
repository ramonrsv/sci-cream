import type { Metadata } from "next";

import { ShareViewer } from "@/app/_components/recipe-share-viewer";

/** Embed variants exist to live inside third-party iframes; keep them out of search indexes. */
export const metadata: Metadata = {
  title: "Shared Recipe — Ice Cream Calculator",
  robots: { index: false },
};

/**
 * Iframe-friendly share viewer: same payload format as `/share`, minimal chrome (the navbar shell
 * also skips itself on this route), and a "View full recipe" link instead of calculator actions.
 * This is the only route served with `frame-ancestors *` (see `next.config.ts`).
 */
export default function ShareEmbedPage() {
  return <ShareViewer embed />;
}
