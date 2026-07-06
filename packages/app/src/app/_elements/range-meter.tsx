import { Color, getCssColor, REFERENCE_TICK_ALPHA } from "@/lib/styles/colors";

/** A `{ min, max }` numeric interval: the acceptable range a meter normalizes and bands over. */
export interface MeterRange {
  min: number;
  max: number;
}

/** Type predicate: `val` is a defined, non-NaN number (i.e. a real computed numeric result). */
function isUsableNumber(val: number | undefined): val is number {
  return val !== undefined && !Number.isNaN(val);
}

/**
 * Position (0–100) of `value` along the range-meter track. The track's domain is `range` padded by
 * `padFrac` of its width on each side, so the acceptable band occupies the centre and out-of-range
 * values land near (and clamp to) the edges. Status color, not position, conveys severity past the
 * edge, so clamping rather than overflowing is fine.
 */
export function valueToMeterPct(value: number, range: MeterRange, padFrac = 0.2): number {
  const pad = (range.max - range.min) * padFrac;
  const lo = range.min - pad;
  const hi = range.max + pad;
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo))) * 100;
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
