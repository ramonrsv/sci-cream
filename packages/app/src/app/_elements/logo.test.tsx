import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Logo } from "./logo";

const widthOf = (c: HTMLElement) =>
  c.querySelector("path.stroke-txt-prim")?.getAttribute("stroke-width");

// The 32px threshold has been missed twice while wiring the mark up; pin it.
describe("Logo strokeWidth default", () => {
  it("uses 14 below 32px (the navbar's 22)", () => {
    expect(widthOf(render(<Logo size={22} />).container)).toBe("14");
  });
  it("uses 7 at and above 32px", () => {
    expect(widthOf(render(<Logo size={32} />).container)).toBe("7");
    expect(widthOf(render(<Logo size={40} />).container)).toBe("7");
  });
  it("still honours an explicit override", () => {
    expect(widthOf(render(<Logo size={22} strokeWidth={7} />).container)).toBe("7");
  });
});

/** Vitest may be invoked from the package or the workspace root; accept either. */
const APP_ROOT = [process.cwd(), join(process.cwd(), "packages/app")].find((dir) =>
  existsSync(join(dir, "src/app/globals.css")),
);
if (!APP_ROOT) throw new Error(`cannot locate packages/app from ${process.cwd()}`);

const read = (rel: string) => readFileSync(join(APP_ROOT, rel), "utf8");

/** Collapses the SVG files' wrapped, indented path data onto one line for comparison. */
const flat = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/**
 * Reads a custom property out of one scope of `globals.css`. Throws rather than returning
 * undefined, so renaming a token fails loudly here instead of silently matching nothing.
 */
function token(scope: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(scope);
  if (!match?.[1]) throw new Error(`--${name} is not defined in this scope of globals.css`);
  return match[1].trim();
}

const GLOBALS = read("src/app/globals.css");
const DARK_AT = GLOBALS.indexOf("\n.dark {");
const LIGHT_SCOPE = GLOBALS.slice(0, DARK_AT);
const DARK_SCOPE = GLOBALS.slice(DARK_AT, GLOBALS.indexOf("\n}", DARK_AT));

/** Pulls the pieces the standalone files duplicate out of one `.svg`. */
function carrier(rel: string) {
  const doc = new DOMParser().parseFromString(read(rel), "image/svg+xml");
  const pick = (sel: string) => {
    const el = doc.querySelector(sel);
    if (!el) throw new Error(`${rel} has no ${sel}`);
    return el;
  };
  const style = pick("style").textContent ?? "";
  const mediaAt = style.indexOf("@media");
  const stroke = (part: string) => flat(/\.hex-outline\s*\{\s*stroke:\s*([^;}]+)/.exec(part)?.[1]);
  return {
    parseError: doc.querySelector("parsererror"),
    arcPath: flat(pick("path:not(.hex-outline)").getAttribute("d")),
    hexPath: flat(pick("path.hex-outline").getAttribute("d")),
    fill: flat(pick("path:not(.hex-outline)").getAttribute("fill")),
    strokeWidth: pick("path.hex-outline").getAttribute("stroke-width"),
    strokeLight: stroke(style.slice(0, mediaAt)),
    strokeDark: stroke(style.slice(mediaAt)),
  };
}

/**
 * The mark ships three times over — as this component, as the favicon, and as a standalone file —
 * and the two `.svg` copies hard-code values the component only references by token name. Nothing
 * makes them move together, and a drifted colour renders fine while being quietly off-brand, so
 * the sync is asserted rather than trusted.
 */
describe("logo carriers stay in sync", () => {
  const carriers = [
    { file: "public/logo.svg", strokeWidth: "7" },
    { file: "src/app/icon.svg", strokeWidth: "14" },
  ];

  it("the component references the tokens the files hard-code", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("path.fill-graph-blue")).not.toBeNull();
    expect(container.querySelector("path.stroke-txt-prim")).not.toBeNull();
    // `stroke-txt-prim` is only correct while its alias still points at the canonical token.
    expect(token(LIGHT_SCOPE, "color-txt-prim")).toBe("var(--color-text-primary)");
  });

  describe.each(carriers)("$file", ({ file, strokeWidth }) => {
    it("is well-formed XML", () => {
      // An unescaped `--` inside a comment silently breaks the whole file.
      expect(carrier(file).parseError).toBeNull();
    });

    it("draws the same geometry as the component", () => {
      const { container } = render(<Logo />);
      const svg = carrier(file);
      expect(svg.arcPath).toBe(
        flat(container.querySelector("path.fill-graph-blue")?.getAttribute("d")),
      );
      expect(svg.hexPath).toBe(
        flat(container.querySelector("path.stroke-txt-prim")?.getAttribute("d")),
      );
    });

    it("paints the values its globals.css tokens resolve to", () => {
      const svg = carrier(file);
      expect(svg.fill).toBe(token(LIGHT_SCOPE, "color-graph-blue"));
      expect(svg.strokeLight).toBe(token(LIGHT_SCOPE, "color-text-primary"));
      expect(svg.strokeDark).toBe(token(DARK_SCOPE, "color-text-primary"));
    });

    it("keeps its intended stroke weight", () => {
      expect(carrier(file).strokeWidth).toBe(strokeWidth);
    });
  });
});
