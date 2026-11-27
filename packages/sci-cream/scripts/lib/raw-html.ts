/**
 * Raw HTML in entry comments, rewritten for the app's markdown renderer, which prints HTML as text
 * since it also shows users' comments.
 *
 * {@link stripHtmlComments} drops HTML comments, such as lint directives, which are never meant
 * for readers. {@link joinCodeGroups} turns each `<code>` group, the form clippy's `doc_link_code`
 * asks of an expression with links, into joined code spans, which read as one expression in the
 * app's prose styles. Neither touches code, which renders as written.
 */
import { CODE_FENCE, CODE_SPAN, blank } from "./markdown-code";

/**
 * An HTML comment alone on its lines, with their indentation and line break, or any other with the
 * spaces before it. Each ends at its first `-->`.
 */
const HTML_COMMENT =
  /^[ \t]*<!--(?:(?!-->)[\s\S])*-->[ \t]*(?:\n|$)|[ \t]*<!--(?:(?!-->)[\s\S])*-->/gm;

/** A `<code>` group. */
const CODE_GROUP = /<code>([\s\S]*?)<\/code>/g;

/** A link to a destination, the form pairing gives each intra-doc link. */
const LINK = /\[((?:[^[\]\\]|\\.)*)\]\(([^)\s]+)\)/g;

/** A backslash escape of ASCII punctuation, or a character reference. */
const ESCAPE = /\\([!-/:-@[-`{-~])|&(#?\w+);/g;

/** The character references a group's text may use, and what each stands for. */
const REFERENCES = new Map([
  ["lt", "<"],
  ["gt", ">"],
  ["amp", "&"],
  ["quot", '"'],
  ["#39", "'"],
]);

/** `markdown` with its code blanked out, so a scan finds only what renders as markdown. */
function prose(markdown: string): string {
  return blank(blank(markdown, CODE_FENCE), CODE_SPAN);
}

/**
 * `markdown` without its HTML comments.
 *
 * A comment alone on its lines goes with them, so one inside a list item leaves the item's sentence
 * whole; any other goes with the spaces before it.
 */
export function stripHtmlComments(markdown: string): string {
  let result = "";
  let cursor = 0;
  for (const match of prose(markdown).matchAll(HTML_COMMENT)) {
    result += markdown.slice(cursor, match.index);
    cursor = match.index + match[0].length;
  }
  return result + markdown.slice(cursor);
}

/**
 * `markdown` with each `<code>` group rewritten as joined code spans, its links as code links.
 *
 * Rustdoc renders `<code>MSNF / (1 - [STD_X])</code>` as one run of code with `STD_X` linked; once
 * paired, it becomes `` `MSNF / (1 -` [`STD_X`](url)`)` ``. A run's edge spaces move outside its
 * backticks, which would drop them, and a line break counts as a space. A group holds only text and
 * links; `label` names the source when one holds anything else.
 */
export function joinCodeGroups(label: string, markdown: string): string {
  let result = "";
  let cursor = 0;
  for (const match of prose(markdown).matchAll(CODE_GROUP)) {
    const end = match.index + match[0].length;
    const group = markdown.slice(match.index + "<code>".length, end - "</code>".length);
    result += markdown.slice(cursor, match.index) + joinGroup(label, group);
    cursor = end;
  }
  return result + markdown.slice(cursor);
}

/** A group's text as code spans, around its links as code links. */
function joinGroup(label: string, group: string): string {
  let result = "";
  let cursor = 0;
  for (const match of group.matchAll(LINK)) {
    const [link, text, url] = match;
    const code = literal(label, text.replace(/`/g, "")).trim();
    result += codeRun(literal(label, group.slice(cursor, match.index)));
    result += `[${codeSpan(code)}](${url})`;
    cursor = match.index + link.length;
  }
  return result + codeRun(literal(label, group.slice(cursor)));
}

/** What markdown `text` stands for: escapes undone, references decoded, line breaks as spaces. */
function literal(label: string, text: string): string {
  if (/<[A-Za-z/!?]/.test(text)) {
    throw new Error(`'${label}' has HTML inside a <code> group: ${text.trim()}`);
  }
  return text
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(ESCAPE, (escape: string, character: string | undefined, name: string) => {
      if (character !== undefined) return character;
      const decoded = REFERENCES.get(name);
      if (decoded === undefined) {
        throw new Error(`'${label}' has a reference a <code> group can't decode: ${escape}`);
      }
      return decoded;
    });
}

/** `text` as a code span, the spaces at its edges left outside; spaces alone stay as they are. */
function codeRun(text: string): string {
  const code = text.trim();
  if (code === "") return text;
  const start = text.indexOf(code);
  return text.slice(0, start) + codeSpan(code) + text.slice(start + code.length);
}

/** `code` as a code span, fenced by more backticks than it holds in a row. */
function codeSpan(code: string): string {
  const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map(([run]) => run.length));
  const fence = "`".repeat(longest + 1);
  /** A space each side keeps an edge backtick off the fence; CommonMark drops both. */
  const pad = code.startsWith("`") || code.endsWith("`") ? " " : "";
  return `${fence}${pad}${code}${pad}${fence}`;
}
