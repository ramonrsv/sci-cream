import { expect, test, describe } from "vitest";

import {
  collectCitations,
  loadLinkMap,
  resolveDocLinks,
  resolveTarget,
  type LinkMap,
} from "./doc-links";

/**
 * A stand-in map, so the unit tests do not depend on which items the crate happens to have.
 *
 * Keyed by full crate path, as the generator writes it. `Fats::sucrose` shares a tail with
 * `Sugars::sucrose` so the ambiguous case is reachable. Hrefs are stand-ins too: lookup only ever
 * joins them to `docsBase`, so short ones keep the expected URLs readable.
 */
const MAP: LinkMap = {
  docsBase: "BASE",
  items: {
    "composition::sugars::Sugars": "sugars.html",
    "composition::sugars::Sugars::sucrose": "sugars.html#sucrose",
    "composition::fats::Fats::sucrose": "fats.html#sucrose",
    "constants::pac": "pac/index.html",
  },
  anchors: { "docs#pod": "docs.html#pod" },
};

describe("resolveTarget", () => {
  test("joins the map's href to its docsBase", () => {
    expect(resolveTarget("Sugars", MAP)).toBe("BASE/sugars.html");
  });

  test("strips the `crate::` prefix", () => {
    expect(resolveTarget("crate::constants::pac", MAP)).toBe("BASE/pac/index.html");
  });

  test("strips a namespace disambiguator", () => {
    expect(resolveTarget("field@Sugars::sucrose", MAP)).toBe("BASE/sugars.html#sucrose");
    expect(resolveTarget("struct@Sugars", MAP)).toBe("BASE/sugars.html");
  });

  test("strips trailing call parens", () => {
    expect(resolveTarget("Sugars()", MAP)).toBe("BASE/sugars.html");
  });

  test("looks an anchored path up among anchors", () => {
    expect(resolveTarget("crate::docs#pod", MAP)).toBe("BASE/docs.html#pod");
  });

  test("resolves a full crate path exactly", () => {
    expect(resolveTarget("composition::sugars::Sugars::sucrose", MAP)).toBe(
      "BASE/sugars.html#sucrose",
    );
  });

  test("resolves a shortened path by matching the key's tail", () => {
    expect(resolveTarget("sugars::Sugars", MAP)).toBe("BASE/sugars.html");
  });

  test("matches a tail only on a `::` boundary", () => {
    expect(resolveTarget("ugars", MAP)).toBeUndefined();
  });

  test("returns undefined when a shortened path matches several items", () => {
    expect(resolveTarget("sucrose", MAP)).toBeUndefined();
  });

  test("returns undefined for an unknown path", () => {
    expect(resolveTarget("NoSuchThing", MAP)).toBeUndefined();
    expect(resolveTarget("crate::docs#no-such-anchor", MAP)).toBeUndefined();
  });
});

describe("resolveDocLinks", () => {
  test("rewrites a shortcut link, keeping the path as the visible text", () => {
    expect(resolveDocLinks("e", "See [`Sugars`] for more.", MAP)).toBe(
      "See [`Sugars`](BASE/sugars.html) for more.",
    );
  });

  test("drops the disambiguator from a shortcut link's text", () => {
    expect(resolveDocLinks("e", "[`field@Sugars::sucrose`]", MAP)).toBe(
      "[`Sugars::sucrose`](BASE/sugars.html#sucrose)",
    );
  });

  test("rewrites an inline link, keeping its authored text", () => {
    expect(resolveDocLinks("e", "[the PAC module](crate::constants::pac)", MAP)).toBe(
      "[the PAC module](BASE/pac/index.html)",
    );
  });

  test("rewrites an anchored inline link", () => {
    expect(resolveDocLinks("e", "[POD](crate::docs#pod)", MAP)).toBe("[POD](BASE/docs.html#pod)");
  });

  test("leaves external, absolute, and in-page links alone", () => {
    const src = "[a](https://example.org) [b](/images/x.png) [c](#local) [d](./rel.md)";
    expect(resolveDocLinks("e", src, MAP)).toBe(src);
  });

  test("leaves footnote citations and definitions alone", () => {
    const src = "Cited[^34].\n\n[^34]: Author. (2019). [_Title_](https://example.org). Site.";
    expect(resolveDocLinks("e", src, MAP)).toBe(src);
  });

  test("leaves fenced code untouched", () => {
    const src = 'Text [`Sugars`].\n\n```json\n{ "see": "[`Sugars`]" }\n```\n';
    expect(resolveDocLinks("e", src, MAP)).toBe(
      'Text [`Sugars`](BASE/sugars.html).\n\n```json\n{ "see": "[`Sugars`]" }\n```\n',
    );
  });

  test("throws naming the entry and every unresolvable citation, as authored", () => {
    const src = "[`NoSuchThing`] and [x](crate::also::missing)";
    expect(() => resolveDocLinks("Vanilla Extract", src, MAP)).toThrowError(
      /'Vanilla Extract' cites unresolvable intra-doc link\(s\): crate::also::missing, NoSuchThing/,
    );
  });

  test("names the rival items when a citation is ambiguous", () => {
    expect(() => resolveDocLinks("Vanilla Extract", "[`sucrose`]", MAP)).toThrowError(
      /sucrose \(ambiguous: composition::sugars::Sugars::sucrose, composition::fats::Fats::sucrose\)/,
    );
  });
});

describe("the generated link map", () => {
  test("resolves every citation in the guide and the ingredient/recipe data", () => {
    const map = loadLinkMap();
    const unresolved = collectCitations().filter((c) => resolveTarget(c.target, map) === undefined);
    expect(unresolved).toEqual([]);
  });

  /** Without this the check above passes vacuously should the collector ever find nothing. */
  test("finds citations in each authored source directory", () => {
    const dirs = new Set(collectCitations().map((c) => c.file.replace(/\/[^/]+$/, "")));
    expect([...dirs].sort()).toEqual(["data/ingredients", "data/recipes", "docs"]);
  });

  test("resolves to an absolute docs.rs URL", () => {
    const map = loadLinkMap();
    expect(resolveTarget("crate::constants::pac", map)).toBe(
      "https://docs.rs/sci-cream/latest/sci_cream/constants/pac/index.html",
    );
  });

  test("covers the guide anchors the app's spec-docs links to", () => {
    const map = loadLinkMap();
    /** Mirrors `GUIDE_CHAPTERS` in the app's `lib/sci-cream/spec-docs.ts`. */
    const chapters = [
      "sweeteners",
      "sugars",
      "polyols",
      "artificial-sweeteners",
      "fibers",
      "glucose-syrups-and-powders",
      "freezing-point-depression",
      "pac-afp-fpdf-se",
      "absolute-pac",
      "stabilizers",
      "emulsifiers",
      "chocolate",
    ];
    const missing = chapters.filter((a) => resolveTarget(`crate::docs#${a}`, map) === undefined);
    expect(missing).toEqual([]);
  });
});
