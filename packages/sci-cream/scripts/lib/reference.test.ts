import { describe, expect, test } from "vitest";

import { type Reference, type ReferenceManifest, buildReference, readReference } from "./reference";
import { docblockOf, footnotesOf } from "./rustdoc-html";

const PAGE = "sci_cream/docs/index.html";

/** The docs page cut down: a table of contents, then three sections, one nested in another. */
const DOCBLOCK = `
<h2 id="contents"><a class="doc-anchor" href="#contents">§</a>Contents</h2>
<ul><li><a href="index.html#sweet" title="mod sci_cream::docs">Sweet</a></li></ul>
<h2 id="sweet"><a class="doc-anchor" href="#sweet">§</a>Sweet</h2>
<p>Sweetness<sup id="fnref1"><a href="#fn1">1</a></sup>, unlike
<a href="index.html#sour" title="mod sci_cream::docs">Sour</a>, is in
<a href="../composition/struct.Sugars.html" title="struct sci_cream::composition::Sugars"><code>Sugars</code></a>.</p>
<h3 id="pod"><a class="doc-anchor" href="#pod">§</a>POD</h3>
<p><a id="sucrose"></a>Sucrose<sup id="fnref2"><a href="#fn2">2</a></sup><sup id="fnref1-2"><a href="#fn1">1</a></sup>
sets the <a href="index.html#pod" title="mod sci_cream::docs">POD</a>.</p>
<h3 id="sugar"><a class="doc-anchor" href="#sugar">§</a>Sugar</h3>
<p>See <a href="index.html#sweet" title="mod sci_cream::docs">Sweet</a> and
<a href="index.html#sucrose" title="mod sci_cream::docs">sucrose</a><sup id="fnref2-2"><a href="#fn2">2</a></sup>.</p>
<h4 id="cane"><a class="doc-anchor" href="#cane">§</a>Cane</h4>
<p>Cane.</p>
<h2 id="sour"><a class="doc-anchor" href="#sour">§</a>Sour</h2>
<p>Sour<!-- an aside --><sup id="fnref3"><a href="#fn3">3</a></sup>.</p>
<div class="footnotes"><hr><ol>
<li id="fn1"><p>One.&nbsp;<a href="#fnref1">↩&nbsp;<sup>1</sup></a>&nbsp;<sup><a href="#fnref1-2">2</a></sup></p></li>
<li id="fn2"><p>Two.&nbsp;<a href="#fnref2">↩&nbsp;<sup>1</sup></a>&nbsp;<sup><a href="#fnref2-2">2</a></sup></p></li>
<li id="fn3"><p><a href="https://example.org/three">Three</a>.&nbsp;<a href="#fnref3">↩</a></p></li>
</ol></div>`;

const MANIFEST: ReferenceManifest = {
  root: "/docs/reference",
  omit: ["contents"],
  chapters: [
    { id: "sweet", slug: "sweet", description: "Sweet things." },
    { id: "sugar", slug: "sweet/sugar", description: "Sugar." },
    { id: "sour", slug: "sour", description: "Sour things." },
  ],
};

/** {@link buildReference} for a module page whose docblock is `docblock`. */
function cut(manifest = MANIFEST, docblock = DOCBLOCK) {
  const html = `<html><body><section id="main-content"><div class="docblock">${docblock}</div></section></body></html>`;
  return buildReference(manifest, PAGE, docblockOf(html, PAGE), footnotesOf(html, PAGE));
}

/** The HTML of the chapter at `slug`. */
function chapter(slug: string): string {
  return cut().reference.chapters.find((c) => c.slug === slug)?.html ?? "";
}

describe("buildReference", () => {
  test("cuts a chapter at each heading listed, leaving out the ones omitted", () => {
    const { chapters } = cut().reference;
    expect(chapters.map(({ slug, title, description }) => [slug, title, description])).toEqual([
      ["sweet", "Sweet", "Sweet things."],
      ["sweet/sugar", "Sugar", "Sugar."],
      ["sour", "Sour", "Sour things."],
    ]);
    expect(chapters.map(({ html }) => html).join("")).not.toContain("Contents");
  });

  test("makes each chapter's heading its h1, shifting its subheadings to match", () => {
    const [sweet, sugar] = [chapter("sweet"), chapter("sweet/sugar")];
    expect(sweet).toMatch(/^<h1 id="sweet">Sweet<\/h1>.*<h2 id="pod">POD<\/h2>/s);
    expect(sugar).toMatch(/^<h1 id="sugar">Sugar<\/h1>.*<h2 id="cane">Cane<\/h2>/s);
  });

  test("drops rustdoc's permalinks and HTML comments", () => {
    const { chapters } = cut().reference;
    expect(chapters.map(({ html }) => html).join("")).not.toMatch(/doc-anchor|§|<!--/);
  });

  test("points a link between chapters at the route owning its anchor, without a title", () => {
    expect(chapter("sweet")).toContain('<a href="/docs/reference/sour">Sour</a>');
    expect(chapter("sweet/sugar")).toContain('<a href="/docs/reference/sweet">Sweet</a>');
    expect(chapter("sweet/sugar")).toContain('<a href="/docs/reference/sweet#sucrose">sucrose</a>');
  });

  test("keeps a link within its chapter on the page", () => {
    expect(chapter("sweet")).toContain('<a href="#pod">POD</a>');
  });

  test("points a link to the whole page at the Reference's root", () => {
    const link = '<a href="index.html" title="mod sci_cream::docs">the docs</a>';
    const docblock = DOCBLOCK.replace("<p>Sour", `<p>${link} Sour`);
    const sour = cut(MANIFEST, docblock).reference.chapters[2].html;
    expect(sour).toContain('<a href="/docs/reference">the docs</a>');
  });

  test("points an API link at the hosted rustdoc, keeping its title", () => {
    const { reference, apiLinks } = cut();
    const url = "/rustdoc/sci_cream/composition/struct.Sugars.html";
    expect(reference.chapters[0].html).toContain(
      `<a href="${url}" title="struct sci_cream::composition::Sugars">`,
    );
    expect(apiLinks).toEqual([{ text: "Sugars", url }]);
  });

  test("gives every id a chapter defines its URL, a chapter's own heading its route", () => {
    expect(cut().reference.anchors).toEqual({
      sweet: "/docs/reference/sweet",
      pod: "/docs/reference/sweet#pod",
      sucrose: "/docs/reference/sweet#sucrose",
      sugar: "/docs/reference/sweet/sugar",
      cane: "/docs/reference/sweet/sugar#cane",
      sour: "/docs/reference/sour",
    });
  });

  test("numbers a chapter's footnotes from 1, listing only those it cites", () => {
    const sugar = chapter("sweet/sugar");
    expect(sugar).toContain('<sup id="fnref1"><a href="#fn1">1</a></sup>');
    expect(sugar).toContain('<ol><li id="fn1"><p>Two.\u00a0<a href="#fnref1">↩</a></p></li></ol>');
    expect(chapter("sour")).toContain(
      '<li id="fn1"><p><a href="https://example.org/three">Three</a>.\u00a0<a href="#fnref1">↩</a>',
    );
  });

  test("links a footnote back to each of its chapter's citations, as rustdoc does", () => {
    const sweet = chapter("sweet");
    expect(sweet).toContain('<sup id="fnref1-2"><a href="#fn1">1</a></sup>');
    expect(sweet).toContain(
      '<li id="fn1"><p>One.\u00a0<a href="#fnref1">↩\u00a0<sup>1</sup></a>' +
        '\u00a0<sup><a href="#fnref1-2">2</a></sup></p></li>',
    );
    // Cited twice on the page, but once in this chapter
    expect(sweet).toContain('<li id="fn2"><p>Two.\u00a0<a href="#fnref2">↩</a></p></li>');
  });

  test("throws for a heading listed but not on the page", () => {
    const manifest = {
      ...MANIFEST,
      chapters: [...MANIFEST.chapters, { id: "salty", slug: "salty", description: "Salt." }],
    };
    expect(() => cut(manifest)).toThrow(/#salty isn't on the page/);
  });

  test("throws for an h2 neither listed nor omitted", () => {
    expect(() => cut({ ...MANIFEST, omit: [] })).toThrow(/#contents is neither listed nor omitted/);
  });

  test("throws for chapters listed out of page order", () => {
    const [sweet, sugar, sour] = MANIFEST.chapters;
    const manifest = { ...MANIFEST, chapters: [sweet, sour, sugar] };
    expect(() => cut(manifest)).toThrow(/out of page order, which is sweet, sugar, sour/);
  });

  test("throws for a slug nested under no chapter", () => {
    const [sweet, sugar, sour] = MANIFEST.chapters;
    const manifest = { ...MANIFEST, chapters: [sweet, { ...sugar, slug: "sweets/sugar" }, sour] };
    expect(() => cut(manifest)).toThrow(/sweets\/sugar nests under sweets, which isn't a chapter/);
  });

  test("throws for an id two chapters define", () => {
    const docblock = DOCBLOCK.replace("<p>Sour", '<p><a id="pod"></a>Sour');
    expect(() => cut(MANIFEST, docblock)).toThrow(/#pod is defined in both sweet and sour/);
  });

  test("throws for a link to an anchor no chapter owns", () => {
    const link = '<a href="index.html#contents" title="mod sci_cream::docs">Contents</a>';
    const docblock = DOCBLOCK.replace("<p>Sour", `<p>${link} Sour`);
    expect(() => cut(MANIFEST, docblock)).toThrow(/sour links to #contents, which no chapter owns/);
  });

  test("throws for a citation of a footnote with no definition", () => {
    const docblock = DOCBLOCK.replace("<p>Sour", '<p><sup id="fnref9"><a href="#fn9">9</a></sup>');
    expect(() => cut(MANIFEST, docblock)).toThrow(/sour cites footnote 9, which has no definition/);
  });
});

describe("the crate's Reference", () => {
  let built: Reference | undefined;
  /** The Reference cut from the rendered docs, which `pnpm doc:site` writes. */
  const reference = () => (built ??= readReference());

  test("has a titled chapter with content for each one listed", () => {
    for (const { slug, title, html } of reference().chapters) {
      expect(title, slug).not.toBe("");
      expect(html, slug).toMatch(/^<h1 id="[^"]+">/);
    }
  });

  test("leaves no link relative to rustdoc's page", () => {
    for (const { slug, html } of reference().chapters) {
      for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
        expect(href, slug).toMatch(/^(\/docs\/reference(\/|$)|\/rustdoc\/|#|https?:\/\/)/);
      }
    }
  });

  test("points each link into the Reference at an anchor a chapter defines", () => {
    const urls = new Set(Object.values(reference().anchors));
    for (const { slug, html } of reference().chapters) {
      for (const [, href] of html.matchAll(/href="(\/docs\/reference\/[^"]*)"/g)) {
        expect(urls.has(href), `${slug} links to ${href}`).toBe(true);
      }
    }
  });

  test("numbers each chapter's footnotes from 1, defining each it cites", () => {
    for (const { slug, html } of reference().chapters) {
      const cited = new Set([...html.matchAll(/<a href="#fn(\d+)">/g)].map(([, n]) => Number(n)));
      const defined = [...html.matchAll(/<li id="fn(\d+)">/g)].map(([, n]) => Number(n));
      expect(defined, slug).toEqual(Array.from({ length: cited.size }, (_, i) => i + 1));
      const sorted = [...cited].sort((a, b) => a - b);
      expect(sorted, slug).toEqual(defined);
    }
  });
});
