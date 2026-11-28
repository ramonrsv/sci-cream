import { describe, it, expect } from "vitest";
import { REFERENCE_ROOT, referenceChapter } from "@workspace/sci-cream/reference";

import { docsHref } from "@/lib/docs";
import {
  getReferenceChapterSlugs,
  getReferenceDocsSlugs,
  getReferencePage,
  getReferencePages,
  REFERENCE_FRONTMATTER,
  REFERENCE_SLUG,
} from "@/lib/docs-reference";

// ---------------------------------------------------------------------------
// The Reference as docs pages
//
// Reads the real chapters the crate's `gen:reference` cut, through the package's `./reference`.
// ---------------------------------------------------------------------------

/** The ids a page's HTML carries, which a link's fragment must name to land. */
function idsIn(html: string): Set<string> {
  return new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
}

describe("REFERENCE_SLUG", () => {
  // The crate writes links between chapters against its root, so both must name the one route
  it("is served at the root the crate links its chapters under", () => {
    expect(docsHref(REFERENCE_SLUG)).toBe(REFERENCE_ROOT);
  });
});

describe("getReferenceChapterSlugs", () => {
  it("lists the chapters in table-of-contents order, by their slugs within the Reference", () => {
    const slugs = getReferenceChapterSlugs();

    expect(slugs.slice(0, 2)).toEqual(["sweeteners", "sweeteners/sugars"]);
    expect(slugs.every((slug) => referenceChapter(slug) !== undefined)).toBe(true);
  });
});

describe("getReferenceDocsSlugs", () => {
  it("nests every chapter's slug under the Reference's", () => {
    expect(getReferenceDocsSlugs()).toEqual(
      getReferenceChapterSlugs().map((slug) => `${REFERENCE_SLUG}/${slug}`),
    );
  });
});

describe("getReferencePage", () => {
  it("renders a chapter as a docs page, under its docs slug", async () => {
    const page = await getReferencePage("sweeteners/sugars");

    expect(page?.slug).toBe("reference/sweeteners/sugars");
    expect(page?.frontmatter).toEqual({
      title: "Sugars",
      description: referenceChapter("sweeteners/sugars")?.description,
    });
    expect(page?.headings?.[0]).toEqual({ id: "sugars", text: "Sugars", level: 1 });
    expect(page?.contentHtml).toMatch(/^<h1 id="sugars">Sugars<a class="heading-permalink"/);
  });

  it("lists a chapter's subheadings, for the contents to show", async () => {
    const page = await getReferencePage("dairy/milk-proteins");

    expect(page?.headings).toEqual([
      { id: "milk-proteins", text: "Milk Proteins", level: 1 },
      { id: "crude-and-true-protein", text: "Crude and True Protein", level: 2 },
    ]);
  });

  it("returns undefined for a slug no chapter has", async () => {
    expect(await getReferencePage("no-such-chapter")).toBeUndefined();
    // A docs slug names no chapter within the Reference
    expect(await getReferencePage("reference/sweeteners/sugars")).toBeUndefined();
  });
});

describe("getReferencePages", () => {
  it("leads with the index, then every chapter in order", async () => {
    const [index, ...chapters] = await getReferencePages();

    expect(index).toEqual({ slug: REFERENCE_SLUG, frontmatter: REFERENCE_FRONTMATTER });
    expect(chapters.map(({ slug }) => slug)).toEqual(getReferenceDocsSlugs());
  });

  // The crate checks each anchor is owned; this checks the app renders the ids it promised
  it("lands every link between chapters on a page and id the app renders", async () => {
    const pages = await getReferencePages();
    const ids = new Map(
      pages.map(({ slug, contentHtml }) => [docsHref(slug), idsIn(contentHtml ?? "")]),
    );

    const links = pages.flatMap(({ slug, contentHtml }) =>
      [...(contentHtml ?? "").matchAll(/href="(\/docs\/[^"]*)"/g)].map((match) => ({
        from: slug,
        href: match[1],
      })),
    );
    const broken = links.filter(({ href }) => {
      const [route, fragment] = href.split("#");
      const targetIds = ids.get(route);
      return targetIds === undefined || (fragment !== undefined && !targetIds.has(fragment));
    });

    expect(links.length).toBeGreaterThan(0);
    expect(broken).toEqual([]);
  });
});
