import fs from "fs";
import path from "path";

import { describe, it, expect } from "vitest";

import { getMarkdownPage, getMarkdownSlugs } from "@/lib/markdown";

// ---------------------------------------------------------------------------
// Internal content links
//
// Reads the real `content/docs` and `content/blog` files and resolves every link they author
// against what the app actually serves: a markdown slug, a public asset, or a route directory.
// Fragments resolve against the ids the target route renders, so a section rename breaks the
// links pointing at it. External `http(s)` links are out of scope — checking them needs network.
// ---------------------------------------------------------------------------

const CONTENT_ROOT = path.join(process.cwd(), "content");
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const APP_ROOT = path.join(process.cwd(), "src", "app");

/** Root-relative targets a file links to, from markdown `](/…)` and from raw HTML attributes. */
function internalLinks(section: string, slug: string): string[] {
  const source = fs.readFileSync(path.join(CONTENT_ROOT, section, `${slug}.md`), "utf8");
  return [
    ...[...source.matchAll(/\]\((\/[^)\s]*)\)/g)].map((match) => match[1]),
    ...[...source.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((match) => match[1]),
  ];
}

/** Ids a route renders; each page is served alone, so its headings are the only tagged elements. */
async function routeIds(section: string, slug: string): Promise<Set<string>> {
  const { contentHtml } = await getMarkdownPage(section, slug);
  const ids = new Set<string>();
  for (const match of (contentHtml ?? "").matchAll(/id="([^"]+)"/g)) ids.add(match[1]);
  return ids;
}

/** Top-level route segments the app serves; `_`-prefixed directories are not routes. */
function appRoutes(): Set<string> {
  const entries = fs.readdirSync(APP_ROOT, { withFileTypes: true });
  return new Set(
    entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name),
  );
}

interface Content {
  docsIds: Map<string, Set<string>>;
  blogIds: Map<string, Set<string>>;
  routes: Set<string>;
}

/** Render every route once, so each link resolves against a prepared id set. */
async function readContent(): Promise<Content> {
  const docsIds = new Map<string, Set<string>>();
  for (const slug of getMarkdownSlugs("docs")) docsIds.set(slug, await routeIds("docs", slug));

  const blogIds = new Map<string, Set<string>>();
  for (const slug of getMarkdownSlugs("blog")) blogIds.set(slug, await routeIds("blog", slug));

  return { docsIds, blogIds, routes: appRoutes() };
}

/**
 * Why `link` does not resolve, or `undefined` when it does.
 *
 * A link to a route whose ids this test cannot know — anything outside `docs` and `blog` — is
 * checked as far as its top-level segment, and its fragment is left alone.
 */
function resolveLink(link: string, content: Content): string | undefined {
  const [pathname, fragment] = link.split("#");
  const [, segment, ...rest] = pathname.split("/");
  const slug = rest.join("/");

  // Any link naming a real file under `public/` is an asset, wherever in that tree it sits —
  // `/images/…` and `/icons/…`, but also the marks served from the root, such as `/logo.svg`.
  if (fs.existsSync(path.join(PUBLIC_ROOT, pathname))) return undefined;
  if (segment === "images" || segment === "icons") return "no such file under public/";

  // `/docs` and `/blog` are generated index routes, checked as routes rather than as pages
  let ids: Set<string> | undefined;
  if (segment === "docs" && slug !== "") {
    ids = content.docsIds.get(slug);
    if (ids === undefined) return "no such page in content/docs";
  } else if (segment === "blog" && slug !== "") {
    ids = content.blogIds.get(slug);
    if (ids === undefined) return "no such post in content/blog";
  } else if (!content.routes.has(segment)) {
    return "no such route in src/app";
  }

  if (fragment === undefined || ids === undefined) return undefined;
  return ids.has(fragment) ? undefined : "no element with that id on the target route";
}

describe("internal content links", () => {
  it("resolve to a page, asset, or route the app serves", async () => {
    const content = await readContent();

    const broken = (["docs", "blog"] as const).flatMap((section) =>
      getMarkdownSlugs(section).flatMap((slug) =>
        internalLinks(section, slug).flatMap((link) => {
          const problem = resolveLink(link, content);
          return problem === undefined
            ? []
            : [`content/${section}/${slug}.md -> ${link}: ${problem}`];
        }),
      ),
    );

    expect(broken).toEqual([]);
  });
});
