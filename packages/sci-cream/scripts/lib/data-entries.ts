/**
 * Parses the data sources, `data/{ingredients,recipes}/<name>.md`, into the entries they define.
 *
 * Each `##` section is one entry, named by its heading. The section's first code block, a `json`
 * fence, is the entry's spec, whose fields become the entry's; a spec with a `for` key makes the
 * entry an alias, named by `alias` rather than `name`. The rest of the section, prose or code, is
 * kept verbatim as the entry's `comments`. Anything before the first `##`, such as the file's `#`
 * title and intro, belongs to no entry and is skipped.
 */
import { marked } from "marked";

/** An entry: its name or alias, its spec's fields, and its `comments` when it has any. */
export interface Entry {
  name?: string;
  alias?: string;
  comments?: string;
  [key: string]: unknown;
}

/** Human identifier for error messages. */
export function entryLabel(entry: Entry): string {
  return entry.name ?? entry.alias ?? "<unnamed>";
}

/**
 * The entries `md` defines, in order. Throws on an empty heading, a name used twice, or a section
 * whose first code block is missing, not a `json` fence, or not valid JSON.
 */
export function parseMarkdownEntries(md: string): Entry[] {
  const entries: Entry[] = [];
  const seen = new Set<string>();
  let cur: { name: string; spec?: Record<string, unknown>; body: string[] } | null = null;

  const flush = (): void => {
    if (!cur) return;
    if (cur.spec === undefined) throw new Error(`Entry '${cur.name}': no fenced spec block`);
    const comment = cur.body.join("").trim();
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
      continue; // preamble before the first entry
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
  return entries;
}
