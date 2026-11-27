/**
 * The intra-doc links in data entries' notes, given the URLs rustdoc rendered for them.
 *
 * The app shows an entry's notes as markdown, so citations such as `` [`Sugars`] `` or
 * `[POD](crate::docs#pod)` have to become ordinary links. Rustdoc renders each data file on a
 * `docs` module page, an entry's notes in the order they're written, so the n-th citation found
 * here takes the URL of the n-th intra-doc link rustdoc rendered in that entry's section. The two
 * must agree in number and text: a disagreement means this scan read the markdown differently from
 * rustdoc, so it fails rather than write a wrong URL.
 */
import {
  brokenAnchors,
  readDocblock,
  renderedLinks,
  splitSections,
  type RenderedLink,
} from "./rustdoc-html";

/** The page `src/docs.rs` renders each data directory's notes on. */
export const DATA_PAGES = {
  ingredients: "sci_cream/docs/ingredients/index.html",
  recipes: "sci_cream/docs/recipes/index.html",
} as const;

/** Fenced code blocks, which rustdoc renders verbatim. */
const CODE_FENCE = /^```[\s\S]*?^```/gm;

/** A code span within one paragraph, whose text holds no links. */
const CODE_SPAN = /(`+)(?:(?!\n\s*\n)[\s\S])*?\1/g;

/** A shortcut link to a code-formatted path, `` [`Path`] ``, but no inline link or definition. */
const SHORTCUT_LINK = /\[`([^`\n]+)`\](?![(:])/g;

/** An inline link whose destination is an item path rather than a URL or in-page anchor. */
const INLINE_LINK = /\[((?:[^[\]\\]|\\.)*)\]\((?![A-Za-z][\w+.-]*:(?!:)|[#/.])([^)\s]+)\)/g;

/**
 * A shortcut link to a bare path, such as `[STD_LACTOSE_IN_MSNF]` inside a `<code>` group: not a
 * footnote, a reference-style link or its definition, or an inline link's text.
 */
const BARE_LINK = /(?<![\]\\])\[([A-Za-z_][\w:@#!()-]*)\](?![(:[])/g;

/** Disambiguators rustdoc accepts before a path, which it leaves out of a link's text. */
const DISAMBIGUATOR =
  /^(?:struct|enum|trait|fn|macro|mod|const|static|type|value|derive|field|method|variant|primitive|attr)@/;

/** An intra-doc link written in markdown. */
export interface Citation {
  /** `` [`Path`] ``, `[Path]`, or `[text](path)`. */
  form: "shortcut" | "bare" | "inline";
  /** Where it starts and ends in the markdown. */
  start: number;
  end: number;
  /** Its target as written, such as `field@Sugars::sucrose`. */
  target: string;
  /** Its text: an inline link's as written, otherwise the target without its disambiguator. */
  text: string;
}

/** `markdown` with each match of `pattern` overwritten by spaces, every offset kept in place. */
function blank(markdown: string, pattern: RegExp): string {
  return markdown.replace(pattern, (span) => span.replace(/[^\n]/g, " "));
}

/** Every intra-doc link in `markdown`, in order. */
export function findCitations(markdown: string): Citation[] {
  const prose = blank(markdown, CODE_FENCE);
  const found: Citation[] = [];

  for (const match of prose.matchAll(SHORTCUT_LINK)) {
    const [whole, target] = match;
    const text = target.replace(DISAMBIGUATOR, "");
    found.push({
      form: "shortcut",
      start: match.index,
      end: match.index + whole.length,
      target,
      text,
    });
  }

  // A shortcut is a code span itself, so shortcuts are taken before code spans are blanked.
  const rest = blank(blank(prose, SHORTCUT_LINK), CODE_SPAN);
  for (const match of rest.matchAll(INLINE_LINK)) {
    const [whole, label, target] = match;
    /** Code spans in the text were blanked; the markdown at the same offsets still has them. */
    const text = markdown.slice(match.index + 1, match.index + 1 + label.length);
    found.push({
      form: "inline",
      start: match.index,
      end: match.index + whole.length,
      target,
      text,
    });
  }
  for (const match of rest.matchAll(BARE_LINK)) {
    const [whole, target] = match;
    const text = target.replace(DISAMBIGUATOR, "");
    found.push({ form: "bare", start: match.index, end: match.index + whole.length, target, text });
  }

  return found.sort((a, b) => a.start - b.start);
}

/**
 * `text` as compared: rustdoc's smart punctuation undone, markup and escape characters
 * dropped, and whitespace collapsed.
 */
export function comparable(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "---")
    .replace(/–/g, "--")
    .replace(/…/g, "...")
    .replace(/[`*_\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `markdown` with each citation rewritten as a link to the URL rustdoc rendered for it.
 *
 * `label` names the source in errors, and `rendered` holds the intra-doc links rustdoc rendered for
 * the same markdown, in order.
 */
export function pairDocLinks(label: string, markdown: string, rendered: RenderedLink[]): string {
  const citations = findCitations(markdown);
  if (citations.length !== rendered.length) {
    throw new Error(
      `'${label}' cites ${citations.length} item(s), but rustdoc rendered ${rendered.length} ` +
        `link(s)\n  cited:    ${citations.map(({ target }) => target).join(", ")}\n  ` +
        `rendered: ${rendered.map(({ text }) => text).join(", ")}`,
    );
  }

  let result = "";
  let cursor = 0;
  citations.forEach((citation, i) => {
    const { text, url } = rendered[i];
    if (comparable(citation.text) !== comparable(text)) {
      throw new Error(`'${label}' cites '${citation.target}' where rustdoc rendered '${text}'`);
    }
    const linkText = citation.form === "shortcut" ? `\`${citation.text}\`` : citation.text;
    result += `${markdown.slice(cursor, citation.start)}[${linkText}](${url})`;
    cursor = citation.end;
  });
  return result + markdown.slice(cursor);
}

/**
 * Each entry's rendered intra-doc links, keyed by {@link comparable} name, from the page a data
 * directory renders on.
 *
 * A data file's `#` title renders as an `h2` and each `##` entry as an `h3`, whose section runs to
 * the next heading of either. A link to an anchor its target page lacks is an error here.
 */
export function readEntryLinks(page: string): Map<string, RenderedLink[]> {
  const sections = splitSections(readDocblock(page), ({ tagName }) =>
    ["h2", "h3"].includes(tagName ?? ""),
  );

  const entries = new Map<string, RenderedLink[]>();
  for (const { heading, title, nodes } of sections) {
    if (heading.tagName !== "h3") continue;
    const name = comparable(title);
    if (entries.has(name)) throw new Error(`${page} renders two entries named '${title}'`);
    entries.set(name, renderedLinks(page, nodes));
  }

  const broken = brokenAnchors([...entries.values()].flat());
  if (broken.length > 0) {
    const urls = broken.map(({ url }) => url).join(", ");
    throw new Error(`${page} links to anchors their pages lack: ${urls}`);
  }
  return entries;
}
