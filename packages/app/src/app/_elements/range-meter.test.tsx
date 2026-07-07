import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import {
  RangeMeter,
  MeterRange,
  valueToMeterPct,
  computeMeterDomain,
  symmetricDomain,
  resolveMeterDomain,
  DEFAULT_PAD_FRAC,
} from "@/app/_elements/range-meter";
import { NormMode } from "@/app/_elements/selects/normalize-toggle-select";
import { Color, getCssColor } from "@/lib/styles/colors";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// computeMeterDomain
// ---------------------------------------------------------------------------

describe("computeMeterDomain", () => {
  it("returns the tightest min/max over the usable points", () => {
    expect(computeMeterDomain([4, 1, 9, 3])).toEqual({ min: 1, max: 9 });
  });

  it("ignores undefined and NaN points", () => {
    expect(computeMeterDomain([undefined, 2, NaN, 8, undefined])).toEqual({ min: 2, max: 8 });
  });

  it("returns a degenerate domain for a single usable point", () => {
    expect(computeMeterDomain([undefined, 5, NaN])).toEqual({ min: 5, max: 5 });
  });

  it("returns undefined when there are no usable points", () => {
    expect(computeMeterDomain([])).toBeUndefined();
    expect(computeMeterDomain([undefined, NaN])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// symmetricDomain
// ---------------------------------------------------------------------------

describe("symmetricDomain", () => {
  it("spans the farthest usable point on each side of the center", () => {
    // Farthest from 5 is 1 (distance 4), so the domain is 5 ± 4.
    expect(symmetricDomain(5, [1, 8, 5])).toEqual({ min: 1, max: 9 });
  });

  it("ignores undefined and NaN points when measuring the spread", () => {
    expect(symmetricDomain(5, [undefined, 8, NaN])).toEqual({ min: 2, max: 8 });
  });

  it("returns undefined when the center is not a usable number", () => {
    expect(symmetricDomain(undefined, [1, 2])).toBeUndefined();
    expect(symmetricDomain(NaN, [1, 2])).toBeUndefined();
  });

  it("returns a zero-width domain when there is no spread", () => {
    expect(symmetricDomain(5, [])).toEqual({ min: 5, max: 5 });
    expect(symmetricDomain(5, [5])).toEqual({ min: 5, max: 5 });
  });
});

// ---------------------------------------------------------------------------
// resolveMeterDomain
// ---------------------------------------------------------------------------

describe("resolveMeterDomain", () => {
  const args = { range: { min: 2, max: 6 }, mainValue: 8, refValues: [1], target: 4 };

  it("FullSpread unions every point, padded by the default fraction", () => {
    expect(resolveMeterDomain(NormMode.FullSpread, args)).toEqual({
      domain: { min: 1, max: 8 },
      padFrac: DEFAULT_PAD_FRAC,
    });
  });

  it("TargetCentered centers on the target so it maps to 50%", () => {
    const { domain, padFrac } = resolveMeterDomain(NormMode.TargetCentered, args);
    expect(domain).toEqual({ min: 0, max: 8 }); // 4 ± max distance (|8-4| = 4)
    expect(valueToMeterPct(args.target, domain!, padFrac)).toBeCloseTo(50);
  });

  it("ValueCentered centers on the main value so it maps to 50%", () => {
    const { domain, padFrac } = resolveMeterDomain(NormMode.ValueCentered, args);
    expect(domain).toEqual({ min: 1, max: 15 }); // 8 ± max distance (|1-8| = 7)
    expect(valueToMeterPct(args.mainValue, domain!, padFrac)).toBeCloseTo(50);
  });

  it("FillRange frames the acceptable range on the track, with symmetric padding", () => {
    const { domain, padFrac } = resolveMeterDomain(NormMode.FillRange, args);
    expect(domain).toEqual({ min: 2, max: 6 });
    expect(padFrac).toBe(DEFAULT_PAD_FRAC);
    // The range edges sit one pad-width in from each end (default 0.2 → 1/7 and 6/7 of the track).
    expect(valueToMeterPct(2, domain!, padFrac)).toBeCloseTo(100 / 7);
    expect(valueToMeterPct(6, domain!, padFrac)).toBeCloseTo(600 / 7);
  });

  it("falls back to FullSpread when a centered mode has no anchor", () => {
    // Target dropped from the union, but the main value (8) still widens the spread.
    expect(resolveMeterDomain(NormMode.TargetCentered, { ...args, target: undefined })).toEqual({
      domain: { min: 1, max: 8 },
      padFrac: DEFAULT_PAD_FRAC,
    });
    // Main value dropped, so the union is range ∪ refs ∪ target = [1, 6].
    expect(resolveMeterDomain(NormMode.ValueCentered, { ...args, mainValue: undefined })).toEqual({
      domain: { min: 1, max: 6 },
      padFrac: DEFAULT_PAD_FRAC,
    });
  });

  it("falls back to FullSpread when FillRange has no acceptable range", () => {
    expect(resolveMeterDomain(NormMode.FillRange, { ...args, range: undefined })).toEqual({
      domain: { min: 1, max: 8 },
      padFrac: DEFAULT_PAD_FRAC,
    });
  });

  it("floors a near-zero value/target spread so matching values stay centered", () => {
    // Only a main value and a near-identical target (no range or refs): the raw spread is ~0, which
    // without a floor would fling the two to opposite ends purely from floating-point noise.
    const { domain, padFrac } = resolveMeterDomain(NormMode.FullSpread, {
      mainValue: 10,
      refValues: [],
      target: 10 + 1e-9,
    });
    expect(valueToMeterPct(10, domain!, padFrac)).toBeCloseTo(50);
    expect(valueToMeterPct(10 + 1e-9, domain!, padFrac)).toBeCloseTo(50);
  });

  it("keeps a value/target spread above the floor apart", () => {
    // 2 vs 10 spans 80% of the magnitude — comfortably above MIN_SPREAD_FRAC — so the domain is
    // the raw [2, 10] and the two land at the padded track edges, not pulled toward the centre.
    const { domain, padFrac } = resolveMeterDomain(NormMode.FullSpread, {
      mainValue: 2,
      refValues: [],
      target: 10,
    });
    expect(domain).toEqual({ min: 2, max: 10 });
    expect(valueToMeterPct(2, domain!, padFrac)).toBeCloseTo(100 / 7);
    expect(valueToMeterPct(10, domain!, padFrac)).toBeCloseTo(600 / 7);
  });
});

// ---------------------------------------------------------------------------
// valueToMeterPct
// ---------------------------------------------------------------------------

describe("valueToMeterPct", () => {
  const range: MeterRange = { min: 0, max: 10 };

  it("pads the domain by padFrac on each side (default 0.2)", () => {
    // Domain [-2, 12] (width 14): the range ends sit one pad-width in from each edge.
    expect(valueToMeterPct(0, range)).toBeCloseTo((2 / 14) * 100);
    expect(valueToMeterPct(10, range)).toBeCloseTo((12 / 14) * 100);
  });

  it("centers the range midpoint at 50", () => {
    expect(valueToMeterPct(5, range)).toBeCloseTo(50);
  });

  it("clamps values past the padded domain to 0 and 100", () => {
    expect(valueToMeterPct(-100, range)).toBe(0);
    expect(valueToMeterPct(100, range)).toBe(100);
  });

  it("honors a custom padFrac (0 puts the range ends at the very edges)", () => {
    expect(valueToMeterPct(0, range, 0)).toBeCloseTo(0);
    expect(valueToMeterPct(10, range, 0)).toBeCloseTo(100);
    expect(valueToMeterPct(5, range, 0)).toBeCloseTo(50);
  });

  it("centers at 50 for a degenerate range (max <= min)", () => {
    expect(valueToMeterPct(5, { min: 5, max: 5 })).toBe(50);
    expect(valueToMeterPct(999, { min: 5, max: 5 })).toBe(50);
    expect(valueToMeterPct(3, { min: 10, max: 2 })).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// RangeMeter component
// ---------------------------------------------------------------------------

describe("RangeMeter", () => {
  const range: MeterRange = { min: 0, max: 10 };
  const pct = (v: number) => parseFloat(valueToMeterPct(v, range).toString());

  it("renders the acceptable-range band spanning the range within the padded domain", () => {
    const { container } = render(<RangeMeter range={range} valueColor="red" />);
    const band = container.querySelector<HTMLElement>(".range-meter-band")!;
    expect(band).toBeInTheDocument();
    expect(parseFloat(band.style.left)).toBeCloseTo(pct(range.min));
    expect(parseFloat(band.style.right)).toBeCloseTo(100 - pct(range.max));
  });

  it("renders the value marker at its normalized position, tagged with the testid prefix", () => {
    const { getByTestId } = render(
      <RangeMeter range={range} value={5} valueColor="red" testIdPrefix="rm" />,
    );
    const marker = getByTestId("rm-meter-current");
    expect(marker).toHaveClass("range-meter-marker");
    expect(parseFloat(marker.style.left)).toBeCloseTo(pct(5));
    expect(marker.style.backgroundColor).toBe("red");
  });

  it("omits the value marker when value is undefined or NaN", () => {
    const { container: noValue } = render(<RangeMeter range={range} valueColor="red" />);
    expect(noValue.querySelector(".range-meter-marker")).toBeNull();

    const { container: nanValue } = render(
      <RangeMeter range={range} value={NaN} valueColor="red" />,
    );
    expect(nanValue.querySelector(".range-meter-marker")).toBeNull();
  });

  it("renders one tick per reference at its normalized position", () => {
    const refs = [
      { key: "a", value: 2 },
      { key: "b", value: 8 },
    ];
    const { container } = render(<RangeMeter range={range} valueColor="red" refs={refs} />);
    const ticks = Array.from(container.querySelectorAll<HTMLElement>(".range-meter-tick"));
    expect(ticks).toHaveLength(refs.length);
    expect(parseFloat(ticks[0].style.left)).toBeCloseTo(pct(2));
    expect(parseFloat(ticks[1].style.left)).toBeCloseTo(pct(8));
  });

  it("renders a blue target tick only for a usable target", () => {
    const blue = getCssColor(Color.GraphBlue);
    const findTargetTick = (root: HTMLElement) =>
      Array.from(root.querySelectorAll<HTMLElement>(".range-meter-tick")).find(
        (t) => t.style.backgroundColor === blue,
      );

    const { container: withTarget } = render(
      <RangeMeter range={range} valueColor="red" target={7} />,
    );
    const tick = findTargetTick(withTarget);
    expect(tick).toBeDefined();
    expect(parseFloat(tick!.style.left)).toBeCloseTo(pct(7));

    const { container: noTarget } = render(<RangeMeter range={range} valueColor="red" />);
    expect(findTargetTick(noTarget)).toBeUndefined();

    const { container: nanTarget } = render(
      <RangeMeter range={range} valueColor="red" target={NaN} />,
    );
    expect(findTargetTick(nanTarget)).toBeUndefined();
  });

  it("tags the meter container with the testid prefix, or leaves it untagged without one", () => {
    const { getByTestId } = render(<RangeMeter range={range} valueColor="red" testIdPrefix="rm" />);
    expect(getByTestId("rm-meter")).toHaveClass("range-meter");

    const { container } = render(<RangeMeter range={range} valueColor="red" />);
    expect(container.querySelector(".range-meter")).not.toHaveAttribute("data-testid");
  });
});
