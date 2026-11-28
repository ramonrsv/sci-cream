import { REFERENCE_ROOT, referenceChapter } from "@workspace/sci-cream/reference";

/** Whether `link` is a route of the Reference: its index, or a chapter. */
export function isReferenceLink(link: string): boolean {
  const [pathname] = link.split("#");
  return pathname === REFERENCE_ROOT || pathname.startsWith(`${REFERENCE_ROOT}/`);
}

/**
 * Why `link`, into the Reference at `/docs/reference`, does not resolve, or `undefined` when it
 * does: its index, or a chapter, with any fragment naming an id the chapter defines.
 */
export function resolveReferenceLink(link: string): string | undefined {
  const [pathname, fragment] = link.split("#");
  if (!isReferenceLink(pathname)) return "not a link into the Reference";
  if (pathname === REFERENCE_ROOT) {
    return fragment === undefined ? undefined : "the Reference's index has no anchors";
  }
  const chapter = referenceChapter(pathname.slice(REFERENCE_ROOT.length + 1));
  if (chapter === undefined) return "no such chapter in the Reference";
  if (fragment === undefined) return undefined;
  return chapter.html.includes(`id="${fragment}"`)
    ? undefined
    : "no element with that id in the chapter";
}
