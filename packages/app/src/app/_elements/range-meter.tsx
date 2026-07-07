import { Color, getCssColor, REFERENCE_TICK_ALPHA } from "@/lib/styles/colors";
import { NormMode } from "@/app/_elements/selects/normalize-toggle-select";

/** A `{ min, max }` numeric interval: the acceptable range a meter normalizes and bands over. */
export interface MeterRange {
  min: number;
  max: number;
}

/** Type predicate: `val` is a defined, non-NaN number (i.e. a real computed numeric result). */
export function isUsableNumber(val: number | undefined): val is number {
  return val !== undefined && !Number.isNaN(val);
}

/**
 * Tightest `{ min, max }` over the usable (defined, non-NaN) points, or `undefined` if none. Used
 * to self-normalize a meter over the union of its acceptable range, value, references, and target.
 */
export function computeMeterDomain(points: (number | undefined)[]): MeterRange | undefined {
  const usable = points.filter(isUsableNumber);
  if (usable.length === 0) return undefined;
  return { min: Math.min(...usable), max: Math.max(...usable) };
}

/** Default fraction of a domain's width padded onto each side by {@link valueToMeterPct}. */
export const DEFAULT_PAD_FRAC = 0.2;

/**
 * Position (0–100) of `value` along the range-meter track. The track's domain is `range` padded by
 * `padFrac` of its width on each side, so the acceptable band occupies the centre and out-of-range
 * values land near (and clamp to) the edges. Status color, not position, conveys severity past the
 * edge, so clamping rather than overflowing is fine. A degenerate `range` (`max <= min`) has no
 * spread to position within, so the value centres at 50.
 */
export function valueToMeterPct(
  value: number,
  range: MeterRange,
  padFrac = DEFAULT_PAD_FRAC,
): number {
  const pad = (range.max - range.min) * padFrac;
  const lo = range.min - pad;
  const hi = range.max + pad;
  if (hi <= lo) return 50;
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo))) * 100;
}

/**
 * Domain centred on `center`, wide enough to reach the farthest usable point from it (so `center`
 * lands at 50% once symmetric padding is applied). Returns `undefined` when `center` isn't usable;
 * an empty/all-degenerate `points` yields a zero-width domain (which normalizes to 50).
 */
export function symmetricDomain(
  center: number | undefined,
  points: (number | undefined)[],
): MeterRange | undefined {
  if (!isUsableNumber(center)) return undefined;
  const half = Math.max(0, ...points.filter(isUsableNumber).map((p) => Math.abs(p - center)));
  return { min: center - half, max: center + half };
}

/**
 * Minimum domain width, as a fraction of the values' magnitude. Floors a data-driven spread so
 * near-equal values — e.g. a value that matches its target — stay together near the centre rather
 * than being flung to opposite ends of the track by a floating-point-scale difference.
 */
export const MIN_SPREAD_FRAC = 0.3;

/**
 * Widens `domain` symmetrically about its midpoint to at least {@link MIN_SPREAD_FRAC} of its
 * magnitude, so a spread far below that floor isn't amplified across the whole track. A domain at
 * or above the floor (and `undefined`) is returned unchanged.
 */
function withMinSpread(domain: MeterRange | undefined): MeterRange | undefined {
  if (!domain) return domain;
  const scale = Math.max(Math.abs(domain.min), Math.abs(domain.max));
  const minWidth = scale * MIN_SPREAD_FRAC;
  if (domain.max - domain.min >= minWidth) return domain;
  const center = (domain.min + domain.max) / 2;
  const half = minWidth / 2;
  return { min: center - half, max: center + half };
}

/**
 * Resolves the `{ domain, padFrac }` a property normalizes over for the chosen {@link NormMode}.
 * All four strategies feed the same {@link valueToMeterPct} mapping; only the domain and padding
 * differ. Centred and range-filling modes fall back to `FullSpread` when their anchor is missing.
 * Data-driven domains are floored to {@link MIN_SPREAD_FRAC} so a near-zero spread doesn't blow up.
 */
export function resolveMeterDomain(
  mode: NormMode,
  {
    range,
    mainValue,
    refValues,
    target,
  }: { range?: MeterRange; mainValue?: number; refValues: (number | undefined)[]; target?: number },
): { domain: MeterRange | undefined; padFrac: number } {
  const points = [range?.min, range?.max, mainValue, ...refValues, target];
  const fullSpread = () => ({
    domain: withMinSpread(computeMeterDomain(points)),
    padFrac: DEFAULT_PAD_FRAC,
  });

  switch (mode) {
    case NormMode.FullSpread:
      return fullSpread();
    case NormMode.TargetCentered: {
      const domain = withMinSpread(symmetricDomain(target, points));
      return domain ? { domain, padFrac: DEFAULT_PAD_FRAC } : fullSpread();
    }
    case NormMode.ValueCentered: {
      const domain = withMinSpread(symmetricDomain(mainValue, points));
      return domain ? { domain, padFrac: DEFAULT_PAD_FRAC } : fullSpread();
    }
    case NormMode.FillRange:
      return range ? { domain: range, padFrac: DEFAULT_PAD_FRAC } : fullSpread();
  }
}

/**
 * Purely presentational horizontal range-meter: a soft acceptable-range band, reference ticks, an
 * optional target tick (blue), and the main value marker, each positioned within `range` (padded)
 * via {@link valueToMeterPct}. Endpoints/labels stay caller-owned.
 *
 * `range` must be non-degenerate (`max > min`). Reference and target ticks are drawn only for
 * usable numbers; the caller supplies the already-filtered `refs`.
 */
export function RangeMeter({
  range,
  value,
  valueColor,
  refs = [],
  target,
  testIdPrefix,
}: {
  range: MeterRange;
  value?: number;
  valueColor: string;
  refs?: { key: string; value: number }[];
  target?: number;
  testIdPrefix?: string;
}) {
  return (
    <div className="range-meter" data-testid={testIdPrefix ? `${testIdPrefix}-meter` : undefined}>
      <div
        className="range-meter-band"
        style={{
          left: `${valueToMeterPct(range.min, range)}%`,
          right: `${100 - valueToMeterPct(range.max, range)}%`,
        }}
      />
      {refs.map((ref) => (
        <span
          key={ref.key}
          className="range-meter-tick"
          style={{
            left: `${valueToMeterPct(ref.value, range)}%`,
            height: "0.5rem",
            backgroundColor: "currentColor",
            opacity: REFERENCE_TICK_ALPHA,
          }}
        />
      ))}
      {isUsableNumber(target) && (
        <span
          className="range-meter-tick"
          style={{
            left: `${valueToMeterPct(target, range)}%`,
            backgroundColor: getCssColor(Color.GraphBlue),
          }}
        />
      )}
      {isUsableNumber(value) && (
        <span
          className="range-meter-marker"
          style={{ left: `${valueToMeterPct(value, range)}%`, backgroundColor: valueColor }}
          data-testid={testIdPrefix ? `${testIdPrefix}-meter-current` : undefined}
        />
      )}
    </div>
  );
}
