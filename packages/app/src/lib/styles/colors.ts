import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";

extend([mixPlugin]);

/**
 * Theme-independent palette colors: a single CSS custom property with no light/dark variant.
 * Read in JS with {@link getColor} or referenced in markup with {@link getCssColor}.
 */
export enum Color {
  GraphBlue = "--color-graph-blue",
  GraphGreen = "--color-graph-green",
  GraphYellow = "--color-graph-yellow",
  GraphOrange = "--color-graph-orange",
  GraphRed = "--color-graph-red",
  GraphGray = "--color-graph-gray",
  GraphGreenDull = "--color-graph-green-dull",
  GraphRedDull = "--color-graph-red-dull",
}

/**
 * Semantic colors that vary by theme. Each is a single token overridden under `.dark` in
 * `globals.css`, so the CSS cascade picks the value — read identically via {@link getColor} /
 * {@link getCssColor}. Canvas consumers must re-render on theme change to re-read (see chart code).
 */
export enum ThemeColor {
  Surface = "--color-surface",
  TextPrimary = "--color-text-primary",
  TextSecondary = "--color-text-secondary",
  Border = "--color-border",
}

/**
 * Colors telling batch recipes apart. Kept out of {@link Color} because they carry no semantics:
 * admitting them would make {@link statusColorRank} throw at runtime. Named after the color a
 * person sees, since the owner picks one to match the physical container a recipe is mixed in.
 *
 * The eight hues are CVD-validated in this order — do not rearrange. White and Black come last,
 * being achromatic: they render as solid fills (see {@link isSolidCategoryColor}), not tints.
 */
export enum CategoryColor {
  Blue = "--color-cat-blue",
  Green = "--color-cat-green",
  Pink = "--color-cat-pink",
  Yellow = "--color-cat-yellow",
  Teal = "--color-cat-teal",
  Orange = "--color-cat-orange",
  Purple = "--color-cat-purple",
  Red = "--color-cat-red",
  White = "--color-cat-white",
  Black = "--color-cat-black",
}

/** Every color, in both picker order and positional-assignment order. */
export const CATEGORY_COLORS: readonly CategoryColor[] = Object.freeze([
  CategoryColor.Blue,
  CategoryColor.Green,
  CategoryColor.Pink,
  CategoryColor.Yellow,
  CategoryColor.Teal,
  CategoryColor.Orange,
  CategoryColor.Purple,
  CategoryColor.Red,
  CategoryColor.White,
  CategoryColor.Black,
]);

/** Color for the `index`-th item in a categorical set; wraps when items outnumber colors. */
export function categoryColor(index: number): CategoryColor {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? CategoryColor.Blue;
}

/**
 * Ink for the solid fills, which cannot inherit the page's text color. Spelled out, not derived
 * from the color token: a missing one is then a type error, not silently inherited text.
 */
const CATEGORY_COLOR_INKS: Partial<Record<CategoryColor, string>> = {
  [CategoryColor.White]: "--color-cat-white-ink",
  [CategoryColor.Black]: "--color-cat-black-ink",
};

/** The ink a color's solid fill wears, or `undefined` for the hues, which are tinted. */
export function categoryColorInk(color: CategoryColor): string | undefined {
  return CATEGORY_COLOR_INKS[color];
}

/**
 * Whether a color is painted solid rather than tinted: having no hue, white and black are
 * identified by a lightness a tint washes away. Keyed off the ink, so the two cannot drift apart.
 */
export function isSolidCategoryColor(color: CategoryColor): boolean {
  return categoryColorInk(color) !== undefined;
}

/**
 * Name of each color: the label shown to the owner, and the identifier on the wire, so a link
 * names a color rather than a slot. Exhaustive by type, so a new color cannot ship without one.
 */
const CATEGORY_COLOR_NAMES: Record<CategoryColor, string> = {
  [CategoryColor.Blue]: "Blue",
  [CategoryColor.Green]: "Green",
  [CategoryColor.Pink]: "Pink",
  [CategoryColor.Yellow]: "Yellow",
  [CategoryColor.Teal]: "Teal",
  [CategoryColor.Orange]: "Orange",
  [CategoryColor.Purple]: "Purple",
  [CategoryColor.Red]: "Red",
  [CategoryColor.White]: "White",
  [CategoryColor.Black]: "Black",
};

/** The reverse of {@link CATEGORY_COLOR_NAMES}, for reading a color off the wire. */
const CATEGORY_COLORS_BY_NAME = new Map<string, CategoryColor>(
  Object.entries(CATEGORY_COLOR_NAMES).map(([color, name]) => [name, color as CategoryColor]),
);

/** Display and wire name of `color`, e.g. `"Blue"`. */
export function categoryColorName(color: CategoryColor): string {
  return CATEGORY_COLOR_NAMES[color];
}

/** The color `name` identifies, or `undefined` if it names none. Inverse of the above. */
export function categoryColorFromName(name: unknown): CategoryColor | undefined {
  return typeof name === "string" ? CATEGORY_COLORS_BY_NAME.get(name) : undefined;
}

/** Any color token readable by {@link getColor} / {@link getCssColor}. */
export type ColorToken = Color | ThemeColor | CategoryColor;

/** Fallback color returned when running server-side (no `window.getComputedStyle` available) */
const SSR_DEFAULT_COLOR = "rgba(0, 0, 0, 1)";

/**
 * Alpha for the soft acceptable-range band tint drawn behind a chart bar. Mirrors the
 * `.range-meter-band` `/25` alpha in `globals.css` so the canvas chart and the DOM range meter
 * read identically; keep the two in sync.
 */
export const RANGE_BAND_ALPHA = 0.25;

/** Alpha for a neutral gray fill where a property has no acceptable range (chart bar / status). */
export const NO_RANGE_GRAY_ALPHA = 0.9;

/**
 * Alpha for reference-recipe tick markers: the chart ticks drawn over bars and the watcher range
 * meter's reference ticks. Applied as color alpha (chart) or element opacity (meter); same value.
 */
export const REFERENCE_TICK_ALPHA = 0.7;

/** Alpha at the top of a chart bar's vertical fill gradient (fades to full color at the base). */
export const BAR_GRADIENT_TOP_ALPHA = 0.65;

/**
 * Read a CSS custom color property value from the document root
 *
 * Returns `SSR_DEFAULT_COLOR` when running server-side.
 */
export function getCssColorVariable(name: string): string {
  if (typeof window === "undefined") return SSR_DEFAULT_COLOR;
  const styles = window.getComputedStyle(document.documentElement);
  return styles.getPropertyValue(name) || SSR_DEFAULT_COLOR;
}

/**
 * Resolve a color token to its current computed CSS color string (for JS/canvas). For a
 * {@link ThemeColor} this returns the cascaded value, so callers that paint to a canvas must
 * re-render on theme change to re-read it (the cascade alone can't repaint a canvas).
 */
export function getColor(color: ColorToken): string {
  return getCssColorVariable(color);
}

/** Add or update the alpha value of a CSS color string (e.g. hex, rgb, hsl) */
export function addOrUpdateAlpha(colorStr: string, opacity: number): string {
  return colord(colorStr).alpha(opacity).toRgbString();
}

/**
 * Flatten a translucent color into the opaque color that looks identical to `colorStr` painted at
 * `alpha` over `backgroundStr`. Prefer this over {@link addOrUpdateAlpha} when two translucent
 * strokes overlap and would otherwise composite into a visible artifact — e.g. a solid and a dashed
 * chart line that coincide reading as a single dashed line.
 */
export function flattenAlphaOnto(colorStr: string, backgroundStr: string, alpha: number): string {
  return colord(backgroundStr).mix(colorStr, alpha).toRgbString();
}

/**
 * Returns a CSS `var(...)` reference for a color token, for an inline `style` or Tailwind arbitrary
 * value. The cascade resolves it (incl. `.dark`), so it is SSR-safe — unlike {@link getColor},
 * whose resolved value would differ between server and client and trigger a hydration mismatch.
 */
export function getCssColor(color: ColorToken): string {
  return `var(${color})`;
}

/**
 * Rank a status `Color` by severity: Green=0, Yellow=1, Orange=2, RedDull=3; throw for non-status.
 * Used by {@link worseStatusColor} to pick the higher-severity of two status colors.
 */
export function statusColorRank(color: Color): number {
  switch (color) {
    case Color.GraphGreen:
      return 0;
    case Color.GraphYellow:
      return 1;
    case Color.GraphOrange:
      return 2;
    case Color.GraphRedDull:
      return 3;
    default:
      throw new Error(`Invalid status color: ${color}`);
  }
}

/** Returns whichever of `a` or `b` has the higher severity rank (ties go to `a`). */
export function worseStatusColor(a: Color, b: Color): Color {
  return statusColorRank(a) >= statusColorRank(b) ? a : b;
}

/**
 * Returns a `Color` representing how close `value` is to `target` as a relative delta percentage,
 * with the regions delineated by `stepPercent` as percentage points (default 5%):
 *
 * - Green — delta <= (target * stepPercent), default within 5% of target
 * - Yellow — delta <= (target * 2 * stepPercent), default within 10% of target
 * - Orange — delta <= (target * 3 * stepPercent), default within 15% of target
 * - RedDull — delta > (target * 3 * stepPercent), default more than 15% away from target
 *
 * Note: A `stepPercent` of zero yields a pure Green/Red split at the exact `target` threshold,
 * which should not be used as it is susceptible to floating-point precision issues.
 */
export function getTargetColor(value: number, target: number, stepPercent: number = 0.05): Color {
  const delta = Math.abs(value - target) / Math.abs(target);
  if (delta <= stepPercent) return Color.GraphGreen;
  if (delta <= 2 * stepPercent) return Color.GraphYellow;
  if (delta <= 3 * stepPercent) return Color.GraphOrange;
  return Color.GraphRedDull;
}

/**
 * Returns a `Color` representing how `value` sits within the acceptable `{ min, max }` range, with
 * the regions delineated by `stepPercent` as a percentage of the total range span (default 15%):
 *
 * - Green — within the inner ideal band `{min + span * stepPercent, max - span * stepPercent}`
 * - Yellow — within the range but outside the ideal band
 * - Orange — within `{min - span * stepPercent, min}` or `{max, max + span * stepPercent}`
 * - RedDull — below `min - span * stepPercent` or above `max + span * stepPercent`
 *
 * Note: A `stepPercent` of zero yields a pure Green/Red split at the `min` and `max` thresholds.
 */
export function getRangeColor(
  value: number,
  range: { min: number; max: number },
  stepPercent: number = 0.15,
): Color {
  const span = range.max - range.min;
  const idealMin = range.min + span * stepPercent;
  const idealMax = range.max - span * stepPercent;
  const expandedMin = range.min - span * stepPercent;
  const expandedMax = range.max + span * stepPercent;

  if (value >= idealMin && value <= idealMax) return Color.GraphGreen;
  if (value >= range.min && value <= range.max) return Color.GraphYellow;
  if (value >= expandedMin && value <= expandedMax) return Color.GraphOrange;
  return Color.GraphRedDull;
}
