import fs from "fs";
import path from "path";

/** The crate's docs build, which `copy-rustdoc.sh` copies into `public/rustdoc/` to serve. */
const RUSTDOC_ROOT = path.join(process.cwd(), "..", "..", "target", "doc");

/**
 * Why `link`, into the hosted rustdoc at `/rustdoc/`, does not resolve, or `undefined` when it
 * does. It's checked against the build `public/rustdoc/` copies, which exists only after an app
 * build. A directory doesn't serve its `index.html`, so the link must name a file.
 */
export function resolveRustdocLink(link: string): string | undefined {
  const [pathname, fragment] = link.split("#");
  if (!pathname.startsWith("/rustdoc/")) return "not a link into /rustdoc/";
  const file = path.join(RUSTDOC_ROOT, pathname.slice("/rustdoc/".length));
  if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
    return "no such page in the crate's docs build; run `pnpm --dir ../sci-cream doc:site`";
  }
  if (fragment === undefined) return undefined;
  return fs.readFileSync(file, "utf8").includes(`id="${fragment}"`)
    ? undefined
    : "no element with that id on the rustdoc page";
}
