import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { type DataSource, type Entry, entryLabel, parseDataSource } from "./data-entries";
import {
  DATA_PAGES,
  comparable,
  findCitations,
  pairDocLinks,
  readDataPageLinks,
} from "./doc-links";
import { REFERENCE_PAGE, type Reference, readReference } from "./reference";
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

/** The data sources in a data directory, read the way `gen-data.ts` reads them. */
function dataSources(dir: string): DataSource[] {
  const base = path.join(PKG_ROOT, "data", dir);
  return fs
    .readdirSync(base)
    .filter((file) => file.endsWith(".md"))
    .map((file) => parseDataSource(fs.readFileSync(path.join(base, file), "utf8")));
}

/** The entries with comments in a data directory. */
function commentedEntries(dir: string): (Entry & { comments: string })[] {
  return dataSources(dir)
    .flatMap(({ entries }) => entries)
    .filter((entry): entry is Entry & { comments: string } => entry.comments !== undefined);
}

describe("the rendered docs", () => {
  let built: Reference | undefined;
  /** The Reference cut from the same docs, whose chapters the links into its page go to. */
  const reference = () => (built ??= readReference());

  test("pair with every data entry's citations", () => {
    const failures: string[] = [];
    for (const [dir, page] of Object.entries(DATA_PAGES)) {
      const rendered = readDataPageLinks(page, reference()).entries;
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

  test("pair with every data file intro's citations", () => {
    const failures: string[] = [];
    let intros = 0;
    for (const [dir, page] of Object.entries(DATA_PAGES)) {
      const rendered = readDataPageLinks(page, reference()).intros;
      for (const { title, intro } of dataSources(dir)) {
        if (intro === undefined) continue;
        intros += 1;
        const links = rendered.get(comparable(title));
        if (links === undefined) {
          failures.push(`'${title}' is not on ${page}`);
          continue;
        }
        try {
          pairDocLinks(`${title} (intro)`, intro, links);
        } catch (error) {
          failures.push(String(error));
        }
      }
    }
    expect(intros).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  /** Without this the check above passes vacuously should the scan ever find nothing. */
  test("hold citations among the data entries", () => {
    const cited = Object.keys(DATA_PAGES).flatMap((dir) =>
      commentedEntries(dir).flatMap(({ comments }) => findCitations(comments)),
    );
    expect(cited.length).toBeGreaterThan(0);
  });

  /** Every intro's and entry's link, where the app serves its target. */
  const dataLinkUrls = () =>
    Object.values(DATA_PAGES).flatMap((page) => {
      const { intros, entries } = readDataPageLinks(page, reference());
      return [...intros.values(), ...entries.values()].flat().map(({ url }) => url);
    });

  test("point every intro's and entry's link at an existing page or Reference route", () => {
    const routes = new Set([reference().root, ...Object.values(reference().anchors)]);
    const urls = dataLinkUrls();
    const missing = urls.filter((url) => {
      if (routes.has(url)) return false;
      if (!url.startsWith(`${SITE_ROOT}/`)) return true;
      const file = url.slice(SITE_ROOT.length + 1).split("#")[0];
      return !fs.existsSync(path.join(DOC_ROOT, file));
    });
    expect(urls.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  test("send the links into the crate's docs page to the Reference", () => {
    const urls = dataLinkUrls();
    const docsPage = `${SITE_ROOT}/${REFERENCE_PAGE}`;
    expect(urls.filter((url) => url.split("#")[0] === docsPage)).toEqual([]);
    // Without this the check above passes vacuously should the notes stop citing the docs page
    expect(urls.some((url) => url.startsWith(`${reference().root}/`))).toBe(true);
  });

  test("report an anchor its page lacks", () => {
    const missing = link("x", `${SITE_ROOT}/sci_cream/docs/index.html#no-such-anchor`);
    const present = link("POD", `${SITE_ROOT}/sci_cream/docs/index.html#pod`);
    expect(brokenAnchors([missing, present])).toEqual([missing]);
  });
});
