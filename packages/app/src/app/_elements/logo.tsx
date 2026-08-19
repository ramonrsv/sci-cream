/**
 * The Sci-Cream mark: a regular pointy-top hexagon with its lower-left region filled by a 60° arc
 * running from the upper-left vertex, through the centre, to the midpoint of the lower-right edge.
 * Geometry mirrors `public/logo.svg` — circumradius 108, centred at (128,128) in a 256 viewBox.
 *
 * Inlined rather than loaded through `<img src="/logo.svg">` so the outline tracks the app theme:
 * an `<img>` renders in its own document, where `.dark` and the theme tokens are out of reach.
 * Colors come from the cascade, not `useTheme`, so there is no mismatch or flash on hydration.
 */
export function Logo({
  size = 32,
  strokeWidth = size < 32 ? 14 : 7,
  title = "Sci-Cream",
  className,
}: {
  size?: number;
  /** In viewBox units, so it scales with `size`. Defaults to 14 under 32px, where 7 greys out. */
  strokeWidth?: number;
  /** Accessible name. Pass `undefined` where an adjacent label already names the link. */
  title?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={className}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      {title && <title>{title}</title>}
      <path
        className="fill-graph-blue"
        d="M 34.47 74 A 194.7 194.7 0 0 1 174.77 209 L 128 236 L 34.47 182 Z"
      />
      <path
        className="stroke-txt-prim"
        d="M 128 20 L 221.53 74 L 221.53 182 L 128 236 L 34.47 182 L 34.47 74 Z"
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}
