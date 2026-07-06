import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import {
  RangeMeter,
  MeterRange,
  valueToMeterPct,
  computeMeterDomain,
} from "@/app/_elements/range-meter";
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
