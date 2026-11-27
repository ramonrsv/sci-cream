/**
 * Parses the data sources, `data/{ingredients,recipes}/<name>.md`, into their title, intro, and the
 * entries they define.
 *
 * A source opens with its `#` title, and what lies between that and its first `##` is its intro,
 * notes on all of its entries. Each `##` section is one entry, named by its heading. The section's
 * first code block, a `json` fence, is the entry's spec, whose fields become the entry's; a spec
 * with a `for` key makes the entry an alias, named by `alias` rather than `name`. The rest of the
 * section, prose or code, is the entry's `comments`. Intro and comments are kept as written but
 * without HTML comments, such as lint directives, which aren't meant for readers.
 */
import { marked } from "marked";

import { stripHtmlComments } from "./raw-html";

/** An entry: its name or alias, its spec's fields, and its `comments` when it has any. */
export interface Entry {
  name?: string;
  alias?: string;
  comments?: string;
  [key: string]: unknown;
}

/** A data source: its title, its intro when it has one, and its entries, in order. */
export interface DataSource {
  title: string;
  intro?: string;
  entries: Entry[];
}

/** Human identifier for error messages. */
export function entryLabel(entry: Entry): string {
  return entry.name ?? entry.alias ?? "<unnamed>";
}

/**
 * The data source `md` holds. Throws on a missing `#` title or content before it, an empty heading,
 * a name used twice, or a section whose first code block is missing, not a `json` fence, or not
 * valid JSON.
 */
export function parseDataSource(md: string): DataSource {
  let title: string | undefined;
  const intro: string[] = [];
  const entries: Entry[] = [];
  const seen = new Set<string>();
  let cur: { name: string; spec?: Record<string, unknown>; body: string[] } | null = null;

  const flush = (): void => {
    if (!cur) return;
    if (cur.spec === undefined) throw new Error(`Entry '${cur.name}': no fenced spec block`);
    const comment = stripHtmlComments(cur.body.join("")).trim();
    const entry: Entry =
      "for" in cur.spec ? { alias: cur.name, ...cur.spec } : { name: cur.name, ...cur.spec };
    if (comment) entry.comments = comment;
    entries.push(entry);
    cur = null;
  };

  for (const token of marked.lexer(md)) {
    if (token.type === "heading" && token.depth === 2) {
      flush();
      const name = token.text.trim();
      if (!name) throw new Error("Entry with an empty `##` heading");
      if (seen.has(name)) throw new Error(`Duplicate entry '${name}'`);
      seen.add(name);
      cur = { name, body: [] };
    } else if (!cur) {
      // Before the first entry: the `#` title, after only blank lines or HTML, then the intro
      if (title !== undefined) intro.push(token.raw);
      else if (token.type === "heading" && token.depth === 1) title = token.text.trim();
      else if (token.type !== "space" && token.type !== "html") {
        throw new Error("Content before the source's `#` title");
      }
    } else if (token.type === "code" && cur.spec === undefined) {
      if (token.lang !== "json") {
        throw new Error(
          `Entry '${cur.name}': spec block must be a json fence, got '${token.lang}'`,
        );
      }
      try {
        cur.spec = JSON.parse(token.text) as Record<string, unknown>;
      } catch (cause) {
        throw new Error(`Entry '${cur.name}': invalid spec JSON`, { cause });
      }
    } else {
      cur.body.push(token.raw);
    }
  }
  flush();

  if (!title) throw new Error("Source with no `#` title");
  const text = stripHtmlComments(intro.join("")).trim();
  return { title, ...(text && { intro: text }), entries };
}
