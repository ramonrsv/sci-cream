import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { type Entry, entryLabel, parseMarkdownEntries } from "./data-entries";
import { DATA_PAGES, comparable, findCitations, pairDocLinks, readEntryLinks } from "./doc-links";
import { DOC_ROOT, SITE_ROOT, brokenAnchors } from "./rustdoc-html";

const PKG_ROOT = path.resolve(import.meta.dirname, "../..");

/** A rendered link with a stand-in URL, which pairing only copies. */
const link = (text: string, url = `URL-${text}`) => ({ text, url });

describe("findCitations", () => {
  test("finds a shortcut link, its text without the disambiguator", () => {
    const markdown = "See [`field@Sugars::sucrose`].";
    const [citation] = findCitations(markdown);
    expect(citation).toMatchObject({
      form: "shortcut",
      target: "field@Sugars::sucrose",
      text: "Sugars::sucrose",
    });
    expect(markdown.slice(citation.start, citation.end)).toBe("[`field@Sugars::sucrose`]");
  });

  test("finds an inline link to an item path, its text as written", () => {
    const markdown = "Per [the `pac` module](crate::constants::pac).";
    const [citation] = findCitations(markdown);
    expect(citation).toMatchObject({
      form: "inline",
      target: "crate::constants::pac",
      text: "the `pac` module",
    });
    expect(markdown.slice(citation.start, citation.end)).toBe(
      "[the `pac` module](crate::constants::pac)",
    );
  });

  test("finds an anchored inline link", () => {
    expect(findCitations("[POD](crate::docs#pod)")).toMatchObject([
      { form: "inline", target: "crate::docs#pod", text: "POD" },
    ]);
  });

  test("finds a bare shortcut link, as a `<code>` group holds", () => {
    expect(findCitations("<code>MSNF / (1 - [STD_X])</code>")).toMatchObject([
      { form: "bare", target: "STD_X", text: "STD_X" },
    ]);
  });

  test("passes over URLs, in-page anchors, and paths", () => {
    const markdown =
      "[a](https://example.org) [b](/images/x.png) [c](#local) [d](./rel.md) [e](mailto:a@b.c)";
    expect(findCitations(markdown)).toEqual([]);
  });

  test("passes over footnotes and reference-style links", () => {
    const markdown =
      "Cited[^34], [as here][ref].\n\n[^34]: Author. (2019). [_Title_](https://example.org). Site.\n" +
      "\n[ref]: https://example.org";
    expect(findCitations(markdown)).toEqual([]);
  });

  test("passes over fenced code and code spans", () => {
    const markdown = '```json\n{ "see": "[`Sugars`]" }\n```\n\nA span, `[x](crate::y)` and `[Z]`.';
    expect(findCitations(markdown)).toEqual([]);
  });

  test("lists the citations in document order, whatever their form", () => {
    const citations = findCitations("[x](crate::x), then [`y`], then <code>[z]</code>.");
    expect(citations.map(({ target }) => target)).toEqual(["crate::x", "y", "z"]);
  });
});

describe("pairDocLinks", () => {
  test("rewrites each citation with the URL rustdoc rendered in its place", () => {
    const markdown =
      "See [`field@Sugars::sucrose`], [the `pac` module](crate::constants::pac), and " +
      "<code>a \\* [STD_X]</code>.";
    const rendered = [
      link("Sugars::sucrose", "U1"),
      link("the pac module", "U2"),
      link("STD_X", "U3"),
    ];
    expect(pairDocLinks("e", markdown, rendered)).toBe(
      "See [`Sugars::sucrose`](U1), [the `pac` module](U2), and <code>a \\* [STD_X](U3)</code>.",
    );
  });

  test("folds rustdoc's smart punctuation before comparing texts", () => {
    expect(pairDocLinks("e", "[Goff's guide](crate::docs#goff)", [link("Goff’s guide", "U")])).toBe(
      "[Goff's guide](U)",
    );
  });

  test("leaves footnotes, URLs, and fenced code alone", () => {
    const markdown =
      'Cited[^34] at [a site](https://example.org).\n\n```json\n{ "see": "[`Sugars`]" }\n```';
    expect(pairDocLinks("e", markdown, [])).toBe(markdown);
  });

  test("throws, naming the source, when rustdoc rendered a link the scan missed", () => {
    expect(() => pairDocLinks("Vanilla Extract", "No citation here.", [link("Sugars")])).toThrow(
      /'Vanilla Extract' cites 0 item\(s\), but rustdoc rendered 1 link\(s\)/,
    );
  });

  test("throws when a citation has no rendered link", () => {
    expect(() => pairDocLinks("Vanilla Extract", "See [`Sugars`].", [])).toThrow(
      /'Vanilla Extract' cites 1 item\(s\), but rustdoc rendered 0 link\(s\)/,
    );
  });

  test("throws when a bare link in a `<code>` group has no rendered link", () => {
    expect(() => pairDocLinks("Vanilla Extract", "<code>x \\* [STD_X]</code>", [])).toThrow(
      /'Vanilla Extract' cites 1 item\(s\), but rustdoc rendered 0 link\(s\)/,
    );
  });

  test("throws when a citation's text disagrees with the link in its place", () => {
    const rendered = [link("Sugars"), link("Polyols")];
    expect(() => pairDocLinks("Vanilla Extract", "[`Sugars`] and [`Fats`]", rendered)).toThrow(
      /'Vanilla Extract' cites 'Fats' where rustdoc rendered 'Polyols'/,
    );
  });
});

/** The entries with comments in a data directory, read the way `gen-data.ts` reads them. */
function commentedEntries(dir: string): (Entry & { comments: string })[] {
  const base = path.join(PKG_ROOT, "data", dir);
  return fs
    .readdirSync(base)
    .filter((file) => file.endsWith(".md"))
    .flatMap((file) => parseMarkdownEntries(fs.readFileSync(path.join(base, file), "utf8")))
    .filter((entry): entry is Entry & { comments: string } => entry.comments !== undefined);
}

describe("the rendered docs", () => {
  test("pair with every data entry's citations", () => {
    const failures: string[] = [];
    for (const [dir, page] of Object.entries(DATA_PAGES)) {
      const rendered = readEntryLinks(page);
      for (const entry of commentedEntries(dir)) {
        const label = entryLabel(entry);
        const links = rendered.get(comparable(label));
        if (links === undefined) {
          failures.push(`'${label}' is not on ${page}`);
          continue;
        }
        try {
          pairDocLinks(label, entry.comments, links);
        } catch (error) {
          failures.push(String(error));
        }
      }
    }
    expect(failures).toEqual([]);
  });

  /** Without this the check above passes vacuously should the scan ever find nothing. */
  test("hold citations among the data entries", () => {
    const cited = Object.keys(DATA_PAGES).flatMap((dir) =>
      commentedEntries(dir).flatMap(({ comments }) => findCitations(comments)),
    );
    expect(cited.length).toBeGreaterThan(0);
  });

  test("point every entry's links at a hosted page that exists", () => {
    const urls = Object.values(DATA_PAGES).flatMap((page) =>
      [...readEntryLinks(page).values()].flat().map(({ url }) => url),
    );
    const missing = urls.filter((url) => {
      if (!url.startsWith(`${SITE_ROOT}/`)) return true;
      const file = url.slice(SITE_ROOT.length + 1).split("#")[0];
      return !fs.existsSync(path.join(DOC_ROOT, file));
    });
    expect(urls.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  test("report an anchor its page lacks", () => {
    const missing = link("x", `${SITE_ROOT}/sci_cream/docs/index.html#no-such-anchor`);
    const present = link("POD", `${SITE_ROOT}/sci_cream/docs/index.html#pod`);
    expect(brokenAnchors([missing, present])).toEqual([missing]);
  });

  test("define the guide anchors the app's spec-docs links to", () => {
    /** Mirrors `GUIDE_CHAPTERS` in the app's `lib/sci-cream/spec-docs.ts`. */
    const chapters = [
      "sweeteners",
      "sugars",
      "polyols",
      "artificial-sweeteners",
      "fibers",
      "glucose-syrups-and-powders",
      "dairy",
      "freezing-point-depression",
      "pac-afp-fpdf-se",
      "absolute-pac",
      "stabilizers",
      "emulsifiers",
      "cocoa",
    ];
    const links = chapters.map((anchor) =>
      link(anchor, `${SITE_ROOT}/sci_cream/docs/index.html#${anchor}`),
    );
    expect(brokenAnchors(links)).toEqual([]);
  });
});
