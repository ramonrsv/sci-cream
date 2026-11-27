/**
 * Code in markdown, which rewrites of the prose around it leave as written.
 *
 * {@link blank} overwrites a pattern's matches with spaces, so a scan of what's left finds only
 * prose, at the same offsets as in the original.
 */

/** Fenced code blocks, which render verbatim. */
export const CODE_FENCE = /^```[\s\S]*?^```/gm;

/** A code span within one paragraph, whose text is literal, holding no links or HTML. */
export const CODE_SPAN = /(`+)(?:(?!\n\s*\n)[\s\S])*?\1/g;

/** `markdown` with each match of `pattern` overwritten by spaces, every offset kept in place. */
export function blank(markdown: string, pattern: RegExp): string {
  return markdown.replace(pattern, (span) => span.replace(/[^\n]/g, " "));
}
