import { describe, expect, test } from "vitest";

import { parseDataSource } from "./data-entries";

/** `rows` as the lines of one markdown string. */
const lines = (...rows: string[]) => rows.join("\n");

/** An entry section named `name`, with a minimal spec and then `notes`. */
const entry = (name: string, ...notes: string[]) =>
  lines(`## ${name}`, "", "```json", '{ "category": "Misc" }', "```", "", ...notes);

describe("parseDataSource", () => {
  test("reads the title, the intro without its HTML comments, and the entries", () => {
    const source = parseDataSource(
      lines(
        "<!-- markdownlint-disable MD033 -->",
        "",
        "# Chocolates",
        "",
        "Notes on every entry.",
        "",
        "<!-- markdownlint-disable-next-line MD036 -->",
        "_A quote._",
        "",
        entry("A", "A's notes."),
        "",
        entry("B"),
      ),
    );
    expect(source.title).toBe("Chocolates");
    expect(source.intro).toBe(lines("Notes on every entry.", "", "_A quote._"));
    expect(source.entries.map(({ name, comments }) => [name, comments])).toEqual([
      ["A", "A's notes."],
      ["B", undefined],
    ]);
  });

  test("has no intro when only blank lines and HTML comments follow the title", () => {
    const source = parseDataSource(lines("# Dairy", "", "<!-- a note -->", "", entry("A")));
    expect(source.intro).toBeUndefined();
  });

  test("throws on content before the title", () => {
    expect(() => parseDataSource(lines("Stray text.", "", "# Dairy", "", entry("A")))).toThrow(
      /Content before the source's `#` title/,
    );
  });

  test("throws when the source has no title", () => {
    expect(() => parseDataSource(entry("A"))).toThrow(/Source with no `#` title/);
  });
});
