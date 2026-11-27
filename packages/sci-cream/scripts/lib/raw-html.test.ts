import { describe, expect, test } from "vitest";

import { joinCodeGroups, stripHtmlComments } from "./raw-html";

/** `rows` as the lines of one markdown string. */
const lines = (...rows: string[]) => rows.join("\n");

describe("stripHtmlComments", () => {
  test("drops a comment alone on its line, with the line", () => {
    const markdown = lines(
      "Nutrition facts.",
      "",
      "<!-- prettier-ignore-start -->",
      "<!-- markdownlint-disable-next-line MD036 -->",
      '_"A quote."_',
      "<!-- prettier-ignore-end -->",
      "",
      "At 37% ABV.",
    );
    expect(stripHtmlComments(markdown)).toBe(
      lines("Nutrition facts.", "", '_"A quote."_', "", "At 37% ABV."),
    );
  });

  test("keeps a list item's sentence whole around an indented directive", () => {
    const markdown = lines(
      "- One",
      "  <!-- markdownlint-disable-next-line MD036 -->",
      "  two.",
      "- Three.",
    );
    expect(stripHtmlComments(markdown)).toBe(lines("- One", "  two.", "- Three."));
  });

  test("drops a trailing directive with the spaces before it", () => {
    const markdown = lines('_"A quote."_ <!-- markdownlint-disable-line MD036 -->', "", "Next.");
    expect(stripHtmlComments(markdown)).toBe(lines('_"A quote."_', "", "Next."));
  });

  test("drops a comment across lines", () => {
    const markdown = lines("Before.", "<!--", "  A note for editors.", "-->", "After.");
    expect(stripHtmlComments(markdown)).toBe(lines("Before.", "After."));
  });

  test("ends each comment at its own close", () => {
    expect(stripHtmlComments("<!-- a -->kept<!-- b -->")).toBe("kept");
  });

  test("leaves comments in fenced code and code spans alone", () => {
    const markdown = lines("```html", "<!-- shown -->", "```", "", "Use `<!-- x -->`.");
    expect(stripHtmlComments(markdown)).toBe(markdown);
  });
});

describe("joinCodeGroups", () => {
  test("joins a group's text and link as code, with the spaces at a run's edges outside", () => {
    expect(joinCodeGroups("e", "As <code>MSNF / (1 - [STD_X](U))</code>, where")).toBe(
      "As `MSNF / (1 -` [`STD_X`](U)`)`, where",
    );
  });

  test("writes each link's text as code, whatever its form", () => {
    expect(joinCodeGroups("e", "<code>[the factor](U1) * [`Y`](U2)</code>")).toBe(
      "[`the factor`](U1) `*` [`Y`](U2)",
    );
  });

  test("keeps the spaces between two links outside the code", () => {
    expect(joinCodeGroups("e", "<code>[A](U1) / [B](U2)</code>")).toBe("[`A`](U1) `/` [`B`](U2)");
  });

  test("undoes escapes and decodes character references", () => {
    expect(joinCodeGroups("e", "<code>milk_solids \\* a &lt; b &amp;&amp; c</code>")).toBe(
      "`milk_solids * a < b && c`",
    );
  });

  test("fences a backtick with more backticks than the text holds", () => {
    expect(joinCodeGroups("e", "<code>a \\` b</code>")).toBe("``a ` b``");
  });

  test("takes a line break in a group as a space", () => {
    const markdown = lines("  <code>milk_solids \\*", "  [STD_X](U)</code>");
    expect(joinCodeGroups("e", markdown)).toBe("  `milk_solids *` [`STD_X`](U)");
  });

  test("leaves groups in fenced code and code spans alone", () => {
    const markdown = lines("```html", "<code>[A](U)</code>", "```", "", "Use `<code>`.");
    expect(joinCodeGroups("e", markdown)).toBe(markdown);
  });

  test("throws, naming the source, on HTML inside a group", () => {
    expect(() => joinCodeGroups("Vanilla Extract", "<code>a <em>b</em></code>")).toThrow(
      /'Vanilla Extract' has HTML inside a <code> group: a <em>b<\/em>/,
    );
  });

  test("throws on a character reference it doesn't decode", () => {
    expect(() => joinCodeGroups("Vanilla Extract", "<code>a&nbsp;b</code>")).toThrow(
      /'Vanilla Extract' has a reference a <code> group can't decode: &nbsp;/,
    );
  });
});
