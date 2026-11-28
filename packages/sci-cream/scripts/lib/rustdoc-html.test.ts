import { describe, expect, test } from "vitest";

import { docblockOf, footnotesOf, renderedLinks, splitSections, textOf } from "./rustdoc-html";

const PAGE = "sci_cream/docs/notes/index.html";

/** A module page cut down to what's read: chrome around the docblock, and a footnote list in it. */
const HTML = `<!DOCTYPE html><html><body>
<nav class="sidebar"><a href="../index.html" title="mod sci_cream">sci_cream</a></nav>
<section id="main-content" class="content">
<div class="main-heading"><h1>Module <span>notes</span></h1></div>
<details class="toggle top-doc" open><summary class="hideme"><span>Expand description</span></summary>
<div class="docblock">
<p>An intro.</p>
<h2 id="sugars"><a class="doc-anchor" href="#sugars">§</a>Sugars</h2>
<p>See <a href="../../composition/sugars/struct.Sugars.html"
title="struct sci_cream::composition::sugars::Sugars"><code>Sugars</code></a>,
<a href="https://example.org">a site</a>, and a note<sup id="fnref1"><a href="#fn1">1</a></sup>.</p>
<h3 id="dextrose"><a class="doc-anchor" href="#dextrose">§</a>Dextrose</h3>
<p><a href="../index.html#pod" title="mod sci_cream::docs">POD</a> and
<a href="https://doc.rust-lang.org/std/primitive.f64.html" title="primitive f64"><code>f64</code></a></p>
<div class="footnotes"><hr><ol><li id="fn1"><p>A note. <a href="#fnref1">↩</a></p></li></ol></div>
</div></details>
<h2 id="modules" class="section-header">Modules</h2>
</section></body></html>`;

describe("docblockOf", () => {
  test("keeps the page's own documentation, without its footnotes", () => {
    const tags = docblockOf(HTML, PAGE).map(({ tagName }) => tagName);
    expect(tags).toEqual(["p", "h2", "p", "h3", "p"]);
  });

  test("throws, naming the page, when it has no docblock", () => {
    expect(() => docblockOf("<html><body><p>Not rustdoc</p></body></html>", PAGE)).toThrow(
      /No docblock in sci_cream\/docs\/notes\/index.html/,
    );
  });
});

describe("footnotesOf", () => {
  test("reads the definitions in the page's footnote list, by id", () => {
    const [[id, item], ...rest] = footnotesOf(HTML, PAGE);
    expect([id, textOf(item), rest.length]).toEqual(["fn1", "A note. ↩", 0]);
  });

  test("reads none from a page that cites none", () => {
    const html = HTML.replace(/<div class="footnotes">.*<\/div>/, "");
    expect(footnotesOf(html, PAGE).size).toBe(0);
  });
});

describe("splitSections", () => {
  test("starts a section at each heading accepted, titled without rustdoc's permalink", () => {
    const sections = splitSections(docblockOf(HTML, PAGE), ({ tagName }) =>
      ["h2", "h3"].includes(tagName ?? ""),
    );
    expect(sections.map(({ title, nodes }) => [title, nodes.length])).toEqual([
      ["Sugars", 1],
      ["Dextrose", 1],
    ]);
  });

  test("drops the nodes before the first heading accepted", () => {
    const sections = splitSections(docblockOf(HTML, PAGE), ({ tagName }) => tagName === "h3");
    expect(sections.map(({ title, nodes }) => [title, nodes.length])).toEqual([["Dextrose", 1]]);
  });
});

describe("renderedLinks", () => {
  test("takes rustdoc's titled links, in order, with where each points on the site", () => {
    expect(renderedLinks(PAGE, docblockOf(HTML, PAGE))).toEqual([
      { text: "Sugars", url: "/rustdoc/sci_cream/composition/sugars/struct.Sugars.html" },
      { text: "POD", url: "/rustdoc/sci_cream/docs/index.html#pod" },
      { text: "f64", url: "https://doc.rust-lang.org/std/primitive.f64.html" },
    ]);
  });
});
