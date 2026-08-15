import fs from "fs";
import path from "path";

import { describe, it, expect } from "vitest";

import {
  getMarkdownComposite,
  getMarkdownPage,
  getMarkdownSlugs,
  slugToId,
  TABLE_OF_CONTENT_SLUG,
} from "@/lib/markdown";

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

/** Add every `id` in a rendered fragment to `into`; headings are the only tagged elements. */
function collectIds(contentHtml: string | undefined, into: Set<string>): Set<string> {
  for (const match of (contentHtml ?? "").matchAll(/id="([^"]+)"/g)) into.add(match[1]);
  return into;
}

/**
 * Ids a `/docs/{slug}` route renders.
 *
 * `MarkdownArticles` anchors each article by its slug, so a composite's listed pages are
 * addressable by slug id as well as by their own headings.
 */
async function docsRouteIds(slug: string): Promise<Set<string>> {
  const pages = await getMarkdownComposite("docs", slug);
  const ids = new Set(pages.map((page) => slugToId(page.slug)));
  for (const page of pages) collectIds(page.contentHtml, ids);
  return ids;
}

/** Ids a `/blog/{slug}` route renders; its article wrapper carries no id of its own. */
async function blogPostIds(slug: string): Promise<Set<string>> {
  return collectIds((await getMarkdownPage("blog", slug)).contentHtml, new Set());
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
  for (const slug of getMarkdownSlugs("docs")) docsIds.set(slug, await docsRouteIds(slug));

  const blogIds = new Map<string, Set<string>>();
  for (const slug of getMarkdownSlugs("blog")) blogIds.set(slug, await blogPostIds(slug));

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

  if (segment === "images" || segment === "icons") {
    const asset = path.join(PUBLIC_ROOT, pathname);
    return fs.existsSync(asset) ? undefined : "no such file under public/";
  }

  let ids: Set<string> | undefined;
  if (segment === "docs") {
    ids = content.docsIds.get(slug === "" ? TABLE_OF_CONTENT_SLUG : slug);
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
