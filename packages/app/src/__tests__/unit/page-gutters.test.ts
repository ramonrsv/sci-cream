import fs from "fs";
import path from "path";

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Page gutter contract
//
// The left gutter belongs to the sidebar's in-flow spacer, not the page: only the spacer sees the
// persisted `pinned` state deciding gutter-vs-flush. Pages carry `page-gutters` (right gutter
// only); the contract is spelled out in `globals.css`. Locked down here because it drifted twice:
// an unprefixed left padding stacks on the spacer's gutter, which made `/recipes`, `/ingredients`
// and `/make-recipe` left-heavy on a phone. Prefixed ones are fine — above `sm:` it's a rail.
// ---------------------------------------------------------------------------

const APP_ROOT = path.join(process.cwd(), "src", "app");
const GLOBALS_CSS = path.join(APP_ROOT, "globals.css");

/** Every `.tsx` file under `src/app`, which is where all page and component markup lives. */
function appComponentFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) found.push(full);
    }
  };
  walk(APP_ROOT);
  return found;
}

/** String literals (single, double, or backtick quoted) in `source` that name the gutter class. */
function gutterClassLiterals(source: string): string[] {
  return [...source.matchAll(/["'`]([^"'`]*\bpage-gutters\b[^"'`]*)["'`]/g)].map(
    (match) => match[1],
  );
}

/**
 * Class tokens in `classes` that pad the left edge at the mobile breakpoint.
 *
 * Variant-prefixed tokens carry a `:` and are excluded: they take effect only at a breakpoint
 * where the spacer has widened into a visible rail, so they cannot double the mobile gutter.
 */
function unprefixedLeftPadding(classes: string): string[] {
  return classes.split(/\s+/).filter((token) => /^-?(pl|px)-/.test(token));
}

describe("page gutter contract", () => {
  it("declares no left padding on the shared utility", () => {
    const css = fs.readFileSync(GLOBALS_CSS, "utf8");
    const block = /@utility page-gutters \{([^}]*)\}/.exec(css);

    expect(block, "globals.css should define an `@utility page-gutters` block").not.toBeNull();
    expect(unprefixedLeftPadding(block?.[1] ?? "")).toEqual([]);
  });

  it("builds the prose page shells on the shared utility", () => {
    const css = fs.readFileSync(GLOBALS_CSS, "utf8");

    for (const shell of [".blog-post", ".doc-shell"]) {
      const block = new RegExp(`\\${shell} \\{([^}]*)\\}`).exec(css);
      expect(block?.[1], `${shell} should exist in globals.css`).toBeDefined();
      expect(block?.[1]).toContain("page-gutters");
    }
  });

  it("never stacks a mobile left padding on top of the sidebar spacer's gutter", () => {
    const offenders: string[] = [];

    for (const file of [...appComponentFiles(), GLOBALS_CSS]) {
      const source = fs.readFileSync(file, "utf8");
      const literals = file.endsWith(".css")
        ? [...source.matchAll(/@apply ([^;]*\bpage-gutters\b[^;]*);/g)].map((match) => match[1])
        : gutterClassLiterals(source);

      for (const classes of literals) {
        const bad = unprefixedLeftPadding(classes);
        if (bad.length > 0) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${bad.join(", ")}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
