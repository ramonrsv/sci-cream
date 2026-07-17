import type { Metadata } from "next";

import { ShareViewer } from "./recipe-share-viewer";

/**
 * Static Open Graph card for shared recipes. The payload lives in the URL fragment, which is
 * never sent to the server, so per-recipe previews are not possible with stateless links.
 */
export const metadata: Metadata = {
  title: "Shared Recipe — Ice Cream Calculator",
  description: "A recipe shared from the Sci-Cream ice cream calculator",
};

/** Share-link viewer page: renders the recipe encoded in the URL fragment, read-only */
export default function SharePage() {
  return <ShareViewer />;
}
