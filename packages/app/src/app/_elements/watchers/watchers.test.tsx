import "@testing-library/jest-dom/vitest";

import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

import { WatcherCard, WatchersView, type TargetsMap } from "@/app/_elements/watchers/watchers";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { makeEmptyRecipe } from "@/lib/recipe";
import { getRangeColor, getCssColor, Color } from "@/lib/styles/colors";
import { ColorMode } from "@/app/_elements/selects/color-toggle-select";

import {
  Bridge as WasmBridge,
  CompKey,
  FpdKey,
  RatioKey,
  Priority,
  compToPropKey,
  fpdToPropKey,
  ratioToPropKey,
  type LightRecipe,
  type BalanceTargets,
  type BalancePriorities,
  type BalanceLocks,
} from "@workspace/sci-cream";

import { makeMockRecipe, makeMockRecipeContext, setKeyFilterSelect } from "@/__tests__/unit/util";
import { selectOption, getSelectedOptionLabel } from "@/__tests__/unit/select";
import { RecipeID } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";
import { roundToCompositionValueFormat } from "@/lib/comp-value-format";
import { DeltaToggle } from "../selects/delta-toggle-select";

const MSNF = compToPropKey(CompKey.MSNF);
const TOTAL_SOLIDS = compToPropKey(CompKey.TotalSolids);
const SERVING_TEMP = fpdToPropKey(FpdKey.ServingTemp);
const TOTAL_FATS = compToPropKey(CompKey.TotalFats); // no defined range
const MILK_FAT = compToPropKey(CompKey.MilkFat); // default key, active in the main test recipe
const NUT_SNF = compToPropKey(CompKey.NutSNF); // default key, inactive (no nuts in the recipe)
const EMULS_PER_FAT = ratioToPropKey(RatioKey.EmulsifiersPerFat); // default ratio key

describe("WatcherCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the property name in the header", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("MSNF")).toBeInTheDocument();
  });

  it("renders the acceptable range as a meter flanked by min/max labels when defined", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // MSNF range is { min: 5, max: 15 }: shown as a meter, with the bounds as flanking labels and
    // in the row's title.
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-meter`)).toBeInTheDocument();
    const meterRow = container.querySelector('[title^="Acceptable range"]');
    expect(meterRow?.getAttribute("title")).toBe("Acceptable range [5, 15]");
    expect(meterRow?.textContent).toContain("5");
    expect(meterRow?.textContent).toContain("15");
  });

  it("omits the range meter when no range is defined", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={TOTAL_FATS}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(TOTAL_FATS)}-meter"]`),
    ).toBeNull();
  });

  it("renders one ref row per reference, omitting empty ones via caller filter", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    const refB = makeMockRecipe(RecipeID.RefB);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[refA, refB]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).toBeInTheDocument();
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref B`)).toBeInTheDocument();
  });

  it("renders no ref rows when no refs are provided", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      container.querySelector(`[data-testid^="watcher-card-${String(MSNF)}-ref-"]`),
    ).toBeNull();
  });

  it("color-codes the status rail based on the value's position in the range", () => {
    const main = makeMockRecipe(RecipeID.Main);

    // Sanity-check via the underlying helper to confirm the test recipe falls in a known band
    const range = { min: 5, max: 15 };
    const mainColor = getRangeColor(10, range);
    expect(mainColor).toBe(Color.GraphGreen); // ideal band (15-85%)
    expect(getRangeColor(4, range)).toBe(Color.GraphOrange); // expanded but out of range
    expect(getRangeColor(0, range)).toBe(Color.GraphRedDull); // far out

    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // The first child of the card root is the status rail; expect an inline backgroundColor.
    const card = container.querySelector(`[data-testid="watcher-card-${String(MSNF)}"]`)!;
    const rail = card.firstElementChild as HTMLElement;
    expect(rail.style.backgroundColor).not.toBe("");

    // The range-meter current marker carries the same range-derived status color.
    const marker = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-meter-current"]`,
    ) as HTMLElement;
    expect(marker.style.backgroundColor).not.toBe("");
  });

  /** The card's status rail is its root's first child; returns its inline background color. */
  function railColor(container: HTMLElement): string {
    const card = container.querySelector(`[data-testid="watcher-card-${String(MSNF)}"]`)!;
    return (card.firstElementChild as HTMLElement).style.backgroundColor;
  }

  /** The range-meter current-value marker's inline background color. */
  function markerColor(container: HTMLElement): string {
    const marker = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-meter-current"]`,
    ) as HTMLElement;
    return marker.style.backgroundColor;
  }

  it("colors the rail by range position under Range mode, ignoring the target", () => {
    // MSNF value 10 is ideal within its { min: 5, max: 15 } range → green regardless of target.
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={makeMockRecipe(RecipeID.Main)}
        deltaToggle={DeltaToggle.Off}
        target={1000}
        colorMode={ColorMode.Range}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(railColor(container)).toBe(getCssColor(Color.GraphGreen));
  });

  it("colors the rail by target proximity under Auto mode when a target is set", () => {
    // A far-off target (1000) is poor proximity, so Auto pulls the rail off green.
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={makeMockRecipe(RecipeID.Main)}
        deltaToggle={DeltaToggle.Off}
        target={1000}
        colorMode={ColorMode.Auto}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(railColor(container)).toBe(getCssColor(Color.GraphRedDull));
  });

  it("keeps the range-meter marker on range position even when the rail follows the target", () => {
    // Under Auto with a far target the rail goes red, but the meter marker stays range-green (10 is
    // ideal within { min: 5, max: 15 }) as the meter shows range position, not target proximity.
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={makeMockRecipe(RecipeID.Main)}
        deltaToggle={DeltaToggle.Off}
        target={1000}
        colorMode={ColorMode.Auto}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(railColor(container)).toBe(getCssColor(Color.GraphRedDull));
    expect(markerColor(container)).toBe(getCssColor(Color.GraphGreen));
  });

  it("shows a gray rail under Target mode with no target (no range fallback)", () => {
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={makeMockRecipe(RecipeID.Main)}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        colorMode={ColorMode.Target}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(railColor(container)).toBe(getCssColor(Color.GraphGray));
  });

  it("calls onTargetChange when the user types a target value", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onTargetChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={onTargetChange}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const input = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "9.5" } });
    expect(onTargetChange).toHaveBeenCalledWith(9.5);
  });

  it("clears the target when the input is emptied", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onTargetChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        onTargetChange={onTargetChange}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const input = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(onTargetChange).toHaveBeenCalledWith(undefined);
  });

  it("renders import buttons only for refs with a defined value", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[refA]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-fill-Ref A`)).toBeInTheDocument();
  });

  it("imports the ref's value into the target when the fill button is clicked", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    const onTargetChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[refA]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={onTargetChange}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const fillBtn = screen.getByTestId(`watcher-card-${String(MSNF)}-fill-Ref A`);
    fireEvent.click(fillBtn);
    expect(onTargetChange).toHaveBeenCalledTimes(1);
    const arg = onTargetChange.mock.calls[0][0] as number;
    expect(typeof arg).toBe("number");
    expect(Number.isNaN(arg)).toBe(false);
  });

  it("rounds the imported value to the step's decimal precision", () => {
    // MSNF main ~= 8.87, so the computed targetStep is "0.5" → 1 decimal of precision.
    // Ref A's MSNF is a raw WASM value with many decimals; the import must round it to 1 dp.
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    const onTargetChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[refA]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={onTargetChange}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-fill-Ref A`));
    const arg = onTargetChange.mock.calls[0][0] as number;
    expect(arg).toBe(Number(arg.toFixed(1)));
  });

  it("invokes onRemove when the close button is clicked", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onRemove = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("hides the remove button when removable is false", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        removable={false}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-remove`)).not.toBeInTheDocument();
  });

  it("reflects the current priority via the cycle button's data-priority attribute", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        priority={Priority.Critical}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const button = screen.getByTestId(`watcher-card-${String(MSNF)}-priority`);
    expect(button).toHaveAttribute("data-priority", Priority.Critical);
  });

  it("cycles to the next priority (Normal → High) when the button is clicked", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onPriorityChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        onTargetChange={vi.fn()}
        onPriorityChange={onPriorityChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    expect(onPriorityChange).toHaveBeenCalledWith(Priority.High);
  });

  it("wraps the priority cycle: Critical → Low → Normal", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onPriorityChange = vi.fn();
    const { rerender } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        priority={Priority.Critical}
        onTargetChange={vi.fn()}
        onPriorityChange={onPriorityChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    expect(onPriorityChange).toHaveBeenLastCalledWith(Priority.Low);

    rerender(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        priority={Priority.Low}
        onTargetChange={vi.fn()}
        onPriorityChange={onPriorityChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    expect(onPriorityChange).toHaveBeenLastCalledWith(Priority.Normal);
  });

  it("renders a placeholder value when the recipe is empty", () => {
    const emptyMain = makeEmptyRecipe(0);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={emptyMain}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // Main value cell renders a non-breaking-space placeholder to preserve layout
    const valueCell = container.querySelector('[title="Current value"]');
    expect(valueCell?.textContent).toBe(" ");

    // Status rail is still rendered with an inline backgroundColor (neutral gray when no value).
    const card = container.querySelector(`[data-testid="watcher-card-${String(MSNF)}"]`)!;
    const rail = card.firstElementChild as HTMLElement;
    expect(rail.style.backgroundColor).not.toBe("");
  });
});

describe("WatcherCard delta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the ref's value and no per-reference delta", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[refA]}
        deltaToggle={DeltaToggle.Absolute}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    // The ref cell shows the fill button then the ref's value; no delta is rendered.
    const refRow = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-ref-Ref A"]`,
    )!;
    const refNum = parseFloat((refRow.children[1] as HTMLElement).textContent!);
    expect(Number.isFinite(refNum)).toBe(true);

    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-ref-Ref A-delta"]`),
    ).toBeNull();
  });

  it("filters out fully empty ref recipes entirely (no row rendered)", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const emptyRef = makeEmptyRecipe(1); // id = "Ref A", mixTotal=undefined → empty
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[emptyRef]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-ref-Ref A"]`),
    ).toBeNull();
  });

  it("renders an invisible placeholder row when the ref recipe is non-empty but lacks a value for the key", () => {
    const main = makeMockRecipe(RecipeID.Main);
    // Non-empty ref (mixTotal > 0) with empty MixProperties → no value for MSNF.
    const stubRef = makeEmptyRecipe(1);
    stubRef.mixTotal = 100;
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[stubRef]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const row = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-ref-Ref A"]`,
    ) as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.style.visibility).toBe("hidden");
    expect(row.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the target delta slot empty when target is undefined", () => {
    // The slot is always present (fixed-width) so the input doesn't shift as a target comes and
    // goes; with no target there is nothing to compare, so it renders empty.
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    expect(delta.textContent).toBe("");
  });

  it("renders the target delta slot empty when the main recipe has no value", () => {
    const emptyMain = makeEmptyRecipe(0);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={emptyMain}
        deltaToggle={DeltaToggle.Absolute}
        target={9.5}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    expect(delta.textContent).toBe("");
  });

  it("renders a met indicator (no arrow/magnitude) when the target matches the current value", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container, rerender } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // Setting the target to the displayed current value makes the delta round to zero (the residual
    // is within display precision), which is the "target met" condition.
    const current = parseFloat(container.querySelector('[title="Current value"]')!.textContent!);
    rerender(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={current}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-target-met"]`),
    ).not.toBeNull();
    // The slot holds only the icon — no arrow glyph or magnitude text.
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta.textContent).toBe("");
  });

  /** Reads the delta chip's inline background tint for MSNF on a card with the given target. */
  const renderDeltaChipBg = (target: number | undefined) => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={target}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const chip = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-delta-chip"]`,
    ) as HTMLElement;
    return chip.style.backgroundColor;
  };

  it("renders a down-triangle and grades the delta red when target far exceeds current", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={100} // far above Main's MSNF (~9)
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    // Direction is a down-triangle; the magnitude is unsigned (no "+").
    expect(delta.textContent!.startsWith("▼")).toBe(true);
    expect(delta.textContent).not.toContain("−");
    expect(delta.textContent).not.toContain("-");
    // The chip grades by target proximity; a target this far off tints red.
    const chip = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-delta-chip"]`,
    ) as HTMLElement;
    expect(chip.style.backgroundColor).toContain(getCssColor(Color.GraphRedDull));
  });

  it("renders an up-triangle and leaves the delta untinted for a zero target", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={0} // below Main's MSNF (~9)
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    // Direction is an up-triangle; the magnitude is unsigned (no minus sign of any kind).
    expect(delta.textContent!.startsWith("▲")).toBe(true);
    expect(delta.textContent).not.toContain("+");
    // Relative proximity is undefined at a zero target, so the chip stays untinted.
    const chip = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-delta-chip"]`,
    ) as HTMLElement;
    expect(chip.style.backgroundColor).toBe("");
  });

  it("grades the delta tint by proximity as the target nears the current value", () => {
    const main = makeMockRecipe(RecipeID.Main);
    // Read the displayed current value so targets can be set relative to it.
    const probe = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const current = parseFloat(
      probe.container.querySelector('[title="Current value"]')!.textContent!,
    );
    cleanup();

    // Targets kept clear of the 5/10/15% band edges so display rounding can't tip the color over.
    const cases: [number, Color][] = [
      [current * 1.02, Color.GraphGreen], // within 5%
      [current * 1.08, Color.GraphYellow], // within 10%
      [current * 1.13, Color.GraphOrange], // within 15%
      [current * 1.4, Color.GraphRedDull], // beyond 15%
    ];
    for (const [target, expected] of cases) {
      const bg = renderDeltaChipBg(target);
      expect(bg).toContain(getCssColor(expected));
      cleanup();
    }
  });

  it("leaves the met delta untinted (the green check conveys the met state)", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const current = parseFloat(
      (() => {
        const { container } = render(
          <WatcherCard
            propKey={MSNF}
            main={main}
            deltaToggle={DeltaToggle.Absolute}
            target={undefined}
            onTargetChange={vi.fn()}
            onPriorityChange={vi.fn()}
            onRemove={vi.fn()}
          />,
        );
        const value = container.querySelector('[title="Current value"]')!.textContent!;
        cleanup();
        return value;
      })(),
    );

    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={current}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // The met state shows the check, not the delta chip, so there is no tint element at all.
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-target-met"]`),
    ).not.toBeNull();
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-delta-chip"]`),
    ).toBeNull();
  });
});

describe("WatcherCard delta (relative)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  /** Reads the target-delta slot's text for MSNF on a card rendered with the given props. */
  const renderDeltaText = (deltaToggle: DeltaToggle, target: number | undefined) => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={deltaToggle}
        target={target}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    return delta.textContent ?? "";
  };

  it("suffixes the relative magnitude with a percent sign", () => {
    // target=100 is far above Main's MSNF (~8.87); a non-zero relative magnitude is shown.
    expect(renderDeltaText(DeltaToggle.Relative, 100)).toContain("%");
  });

  it("renders a down-triangle when the target exceeds the current value", () => {
    // Same direction convention as absolute mode: target above current points down (▼).
    expect(renderDeltaText(DeltaToggle.Relative, 100).startsWith("▼")).toBe(true);
  });

  it("renders an up-triangle when the target is below the current value", () => {
    // target=5 is below Main's MSNF (~8.87) and non-zero (avoids the divide-by-zero edge).
    expect(renderDeltaText(DeltaToggle.Relative, 5).startsWith("▲")).toBe(true);
  });

  it("points the arrow the same way as absolute mode for the same target", () => {
    // The arrow conveys direction-to-target; switching the magnitude between absolute and relative
    // must not flip it. Compare the leading glyph across both modes for an identical target.
    const absoluteArrow = renderDeltaText(DeltaToggle.Absolute, 100).charAt(0);
    const relativeArrow = renderDeltaText(DeltaToggle.Relative, 100).charAt(0);
    expect(relativeArrow).toBe(absoluteArrow);
  });

  it("shows the met indicator (no arrow/magnitude) when the relative delta rounds to zero", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const current = parseFloat(
      (() => {
        const { container } = render(
          <WatcherCard
            propKey={MSNF}
            main={main}
            deltaToggle={DeltaToggle.Relative}
            target={undefined}
            onTargetChange={vi.fn()}
            onPriorityChange={vi.fn()}
            onRemove={vi.fn()}
          />,
        );
        const value = container.querySelector('[title="Current value"]')!.textContent!;
        cleanup();
        return value;
      })(),
    );

    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Relative}
        target={current}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-target-met"]`),
    ).not.toBeNull();
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta.textContent).toBe("");
  });

  it("renders '-%' with no arrow when the relative target is zero", () => {
    // A relative diff against a zero target is undefined; it shows the NaN dash with the percent
    // suffix and no direction arrow, matching how NaN renders elsewhere.
    const text = renderDeltaText(DeltaToggle.Relative, 0);
    expect(text).toBe("-%");
    expect(text).not.toContain("▲");
    expect(text).not.toContain("▼");
  });

  it("omits the target-delta slot entirely when the delta toggle is Off", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-target-delta"]`),
    ).toBeNull();
  });
});

describe("WatcherCard non-balanceable key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the target input in the DOM but invisible for a non-balanceable key (FpdKey)", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={SERVING_TEMP}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const input = container.querySelector(
      `[data-testid="watcher-card-${String(SERVING_TEMP)}-target"]`,
    ) as HTMLElement;
    expect(input).not.toBeNull();
    expect(input.style.visibility).toBe("hidden");
  });

  it("keeps the delta span in the DOM but invisible for a non-balanceable key", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={SERVING_TEMP}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(SERVING_TEMP)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    expect(delta.style.visibility).toBe("hidden");
  });

  it("removes the delta span from the DOM when the delta toggle is Off (non-balanceable key)", () => {
    // Off removal takes precedence over the hidden-slot path: the span is absent, not just hidden.
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={SERVING_TEMP}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(SERVING_TEMP)}-target-delta"]`),
    ).toBeNull();
  });

  it("sets tabIndex=-1 on the target input for a non-balanceable key", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={SERVING_TEMP}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const input = container.querySelector(
      `[data-testid="watcher-card-${String(SERVING_TEMP)}-target"]`,
    ) as HTMLInputElement;
    expect(input.tabIndex).toBe(-1);
  });

  it("disables the fill-from-ref button for a non-balanceable key", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    render(
      <WatcherCard
        propKey={SERVING_TEMP}
        main={main}
        refs={[refA]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId(`watcher-card-${String(SERVING_TEMP)}-fill-Ref A`)).toBeDisabled();
  });
});

describe("WatchersView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the default selected properties as cards", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    // Default selection = properties with a defined acceptable range
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}`)).toBeInTheDocument();
    expect(screen.getByTestId(`watcher-card-${String(TOTAL_SOLIDS)}`)).toBeInTheDocument();
    expect(screen.getByTestId(`watcher-card-${String(SERVING_TEMP)}`)).toBeInTheDocument();
  });

  it("Auto filter hides default keys that are inactive in the recipe", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    expect(screen.getByTestId(`watcher-card-${String(MILK_FAT)}`)).toBeInTheDocument();

    // NutSNF is a default key but inactive (no nuts in the recipe), so it is filtered out by Auto
    expect(screen.queryByTestId(`watcher-card-${String(NUT_SNF)}`)).not.toBeInTheDocument();
  });

  it("Auto filter ignores empty unfiltered ref slots", () => {
    // Empty ref slots reach the view unfiltered; their zero/NaN values must not activate keys.
    render(
      <WatchersView main={makeEmptyRecipe(0)} refs={[makeEmptyRecipe(1), makeEmptyRecipe(2)]} />,
    );
    expect(screen.queryByTestId(`watcher-card-${String(EMULS_PER_FAT)}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`watcher-card-${String(MILK_FAT)}`)).not.toBeInTheDocument();

    // Unconditional keys still render so the panel is never blank.
    expect(screen.getByTestId(`watcher-card-${String(TOTAL_SOLIDS)}`)).toBeInTheDocument();
  });

  it("hydrates the selection from localStorage on mount", async () => {
    const persistKey = "test-watcher-view";
    localStorage.setItem(`${persistKey}:selected`, JSON.stringify([TOTAL_FATS]));
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} persistKey={persistKey} />);
    await act(async () => {});

    // Default filter is Auto (ignores selection); switch to Custom to observe the hydrated set
    await selectOption(container, "#key-filter-select", KeyFilter.Custom);

    expect(screen.getByTestId(`watcher-card-${String(TOTAL_FATS)}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}`)).not.toBeInTheDocument();
  });

  it("hydrates target values from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 9.5 }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    const input = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    expect(input.value).toBe("9.5");
  });

  it("persists the selection to localStorage after removal (Custom filter)", async () => {
    const persistKey = "test-watcher-view";
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} persistKey={persistKey} />);
    // Removal only applies under the Custom filter, where the remove button is shown.
    await selectOption(container, "#key-filter-select", KeyFilter.Custom);
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`));
    await act(async () => {});
    const stored = JSON.parse(localStorage.getItem(`${persistKey}:selected`) ?? "[]");
    expect(stored).not.toContain(MSNF);
    expect(stored).toContain(TOTAL_SOLIDS);
  });

  it("persists target value changes to localStorage", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    const input = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "9.5" } });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherTargets) ?? "{}");
    expect(stored[MSNF]).toBe(9.5);
  });

  it("renders caller-owned targets when targetsState is provided", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} targetsState={[{ [MSNF]: 7.5 }, vi.fn()]} />);
    const input = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    expect(input.value).toBe("7.5");
  });

  it("routes target edits through the caller-owned setter, not localStorage", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const setTargets = vi.fn();
    render(<WatchersView main={main} targetsState={[{}, setTargets]} />);
    const input = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "9.5" } });

    expect(setTargets).toHaveBeenCalledTimes(1);
    // The setter receives a functional updater; apply it to observe the new entry.
    const updater = setTargets.mock.calls[0][0] as (prev: TargetsMap) => TargetsMap;
    expect(updater({})).toEqual({ [MSNF]: 9.5 });
    expect(localStorage.getItem(STORAGE_KEYS.watcherTargets)).toBeNull();
  });

  it("does not hydrate stored targets when targetsState is caller-owned", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 9.5 }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} targetsState={[{}, vi.fn()]} />);
    const input = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("hydrates priorities from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEYS.watcherPriorities, JSON.stringify({ [MSNF]: Priority.High }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    const button = screen.getByTestId(`watcher-card-${String(MSNF)}-priority`);
    expect(button).toHaveAttribute("data-priority", Priority.High);
  });

  it("persists priority changes to localStorage when the cycle button is clicked", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    // Default is Normal; one click cycles to High.
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherPriorities) ?? "{}");
    expect(stored[MSNF]).toBe(Priority.High);
  });

  it("drops the priority entry when cycled back to Normal, keeping the map sparse", () => {
    localStorage.setItem(STORAGE_KEYS.watcherPriorities, JSON.stringify({ [MSNF]: Priority.Low }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    // Hydrated as Low; one click advances to Normal, which drops the entry.
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherPriorities) ?? "{}");
    expect(MSNF in stored).toBe(false);
  });

  it("drops a removed key's priority entry from localStorage (Custom filter)", async () => {
    localStorage.setItem(STORAGE_KEYS.watcherPriorities, JSON.stringify({ [MSNF]: Priority.High }));
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} />);
    await selectOption(container, "#key-filter-select", KeyFilter.Custom);
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherPriorities) ?? "{}");
    expect(MSNF in stored).toBe(false);
  });

  it("hides remove buttons under the Auto filter and shows them under Custom", async () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} />);
    // Default filter is Auto: removal is a no-op there, so no remove buttons are rendered.
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-remove`)).not.toBeInTheDocument();

    await selectOption(container, "#key-filter-select", KeyFilter.Custom);
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`)).toBeInTheDocument();
  });

  it("passes the active reference recipes to each card", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefB]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[2]]} />);
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref B`)).toBeInTheDocument();
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).not.toBeInTheDocument();
  });

  // ---- Select persistence -----------------------------------------------------------------

  describe("Select persistence", () => {
    const FILTER_KEY = `${STORAGE_KEYS.watchersPanelView}:filter`;

    it("writes the KeyFilter leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <WatchersView main={recipeCtx.recipes[0]} persistKey={STORAGE_KEYS.watchersPanelView} />,
      );
      await act(async () => {});

      await setKeyFilterSelect(container, KeyFilter.Custom);
      await act(async () => {});

      expect(localStorage.getItem(FILTER_KEY)).toBe(JSON.stringify(KeyFilter.Custom));
    });

    it("restores the KeyFilter value on remount", async () => {
      localStorage.setItem(FILTER_KEY, JSON.stringify(KeyFilter.Custom));
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <WatchersView main={recipeCtx.recipes[0]} persistKey={STORAGE_KEYS.watchersPanelView} />,
      );
      await act(async () => {});

      expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Custom);
    });
  });
});

describe("WatchersView Balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render the Balance button when wiring props are absent", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    expect(screen.queryByTestId("watchers-balance-button")).not.toBeInTheDocument();
  });

  it("renders the Balance button when both wasmBridge and onApplyBalancedMain are provided", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.getByTestId("watchers-balance-button")).toBeInTheDocument();
  });

  it("Balance is disabled when no CompKey targets are set", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.getByTestId("watchers-balance-button")).toBeDisabled();
  });

  it("Balance stays disabled when only an FpdKey target (e.g. ServingTemp) is set", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [SERVING_TEMP]: -12 }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.getByTestId("watchers-balance-button")).toBeDisabled();
  });

  it("Balance is enabled when at least one CompKey target is set on a non-empty main", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.getByTestId("watchers-balance-button")).not.toBeDisabled();
  });

  it("Balance ignores targets for unwatched keys (filtered out of view)", () => {
    // Energy is a CompKey but not in DEFAULT_SELECTED_PROPERTIES, so the Auto filter hides it; a
    // target on it from a prior session must not enable Balance, since the user can't see the
    // card and would be surprised by silent inclusion in the balance call.
    const ENERGY = compToPropKey(CompKey.Energy);
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [ENERGY]: 200 }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.queryByTestId(`watcher-card-${String(ENERGY)}`)).not.toBeInTheDocument();
    expect(screen.getByTestId("watchers-balance-button")).toBeDisabled();
  });

  it("Balance is disabled when the main recipe is empty", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const emptyMain = makeEmptyRecipe(0);
    render(
      <WatchersView main={emptyMain} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />,
    );
    expect(screen.getByTestId("watchers-balance-button")).toBeDisabled();
  });

  it("clicking Balance invokes onApplyBalancedMain with a same-length LightRecipe", () => {
    localStorage.setItem(
      STORAGE_KEYS.watcherTargets,
      JSON.stringify({
        [compToPropKey(CompKey.MilkFat)]: 14,
        [MSNF]: 10,
        [compToPropKey(CompKey.TotalSugars)]: 17,
        [TOTAL_SOLIDS]: 41,
      }),
    );
    const main = makeMockRecipe(RecipeID.Main);
    const onApply = vi.fn();
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={onApply} />);
    fireEvent.click(screen.getByTestId("watchers-balance-button"));
    expect(onApply).toHaveBeenCalledTimes(1);
    const arg = onApply.mock.calls[0][0] as LightRecipe;
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBe(main.ingredientRows.filter((r) => r.quantity !== undefined).length);
    for (const [name, grams] of arg) {
      expect(typeof name).toBe("string");
      expect(typeof grams).toBe("number");
      expect(grams).toBeGreaterThanOrEqual(0);
    }
  });

  it("forwards only non-Normal priorities for keys that have a target to balance_recipe", () => {
    localStorage.setItem(
      STORAGE_KEYS.watcherTargets,
      JSON.stringify({ [MSNF]: 10, [TOTAL_SOLIDS]: 41 }),
    );
    // MSNF is raised to Critical; TOTAL_SOLIDS stays Normal (default) → must not be forwarded.
    localStorage.setItem(
      STORAGE_KEYS.watcherPriorities,
      JSON.stringify({ [MSNF]: Priority.Critical }),
    );
    const main = makeMockRecipe(RecipeID.Main);
    const balanceSpy = vi.fn<
      (recipe: unknown, targets: BalanceTargets, priorities: BalancePriorities) => LightRecipe
    >(() => []);
    const spyBridge = {
      has_ingredient: () => true,
      balance_recipe: balanceSpy,
      validate_recipe_targets: () => ({ issues: [] }),
    } as unknown as WasmBridge;

    render(<WatchersView main={main} wasmBridge={spyBridge} onApplyBalancedMain={vi.fn()} />);
    fireEvent.click(screen.getByTestId("watchers-balance-button"));

    expect(balanceSpy).toHaveBeenCalledTimes(1);
    const priorities = balanceSpy.mock.calls[0][2];
    expect(priorities).toContainEqual([String(MSNF), Priority.Critical]);
    expect(priorities).toHaveLength(1);
  });

  it("forwards a locked row to balance_recipe as [lightIndex, { Amount }]", () => {
    localStorage.setItem(
      STORAGE_KEYS.watcherTargets,
      JSON.stringify({ [MSNF]: 10, [TOTAL_SOLIDS]: 41 }),
    );
    const main = makeMockRecipe(RecipeID.Main);
    // Lock the second ingredient (Whipping Cream, 215 g); every mock row is eligible, so its
    // light-recipe index matches its row index.
    main.ingredientRows[1].locked = true;
    const lockedAmount = main.ingredientRows[1].quantity;

    const balanceSpy = vi.fn<
      (
        recipe: unknown,
        targets: BalanceTargets,
        priorities: BalancePriorities,
        total: number | undefined,
        locked: BalanceLocks,
      ) => LightRecipe
    >(() => []);
    const spyBridge = {
      has_ingredient: () => true,
      balance_recipe: balanceSpy,
      validate_recipe_targets: () => ({ issues: [] }),
    } as unknown as WasmBridge;

    render(<WatchersView main={main} wasmBridge={spyBridge} onApplyBalancedMain={vi.fn()} />);
    fireEvent.click(screen.getByTestId("watchers-balance-button"));

    expect(balanceSpy).toHaveBeenCalledTimes(1);
    expect(balanceSpy.mock.calls[0][4]).toEqual([[1, { Amount: lockedAmount }]]);
  });

  it("surfaces a balance error and does not invoke onApplyBalancedMain when the bridge throws", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const onApply = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const throwingBridge = {
      has_ingredient: () => true,
      balance_recipe: () => {
        throw new Error("infeasible");
      },
      validate_recipe_targets: () => ({ issues: [] }),
    } as unknown as WasmBridge;

    render(<WatchersView main={main} wasmBridge={throwingBridge} onApplyBalancedMain={onApply} />);
    const button = screen.getByTestId("watchers-balance-button");
    fireEvent.click(button);

    expect(onApply).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(button.title).toContain("infeasible");
    // The error border now uses the real `issue-border-error` accent class (backed by theme
    // tokens), unlike the former dead `border-rd-lt`; jsdom can't compute the color, so assert
    // the class is applied alongside the `border` width.
    expect(button.className).toContain("border");
    expect(button.className).toContain("issue-border-error");

    consoleErrorSpy.mockRestore();
  });
});

describe("WatchersView Fill from Ref", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders one fill button per non-empty ref", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1], ctx.recipes[2]]} />);
    expect(screen.getByTestId("watchers-fill-all-Ref A")).toBeInTheDocument();
    expect(screen.getByTestId("watchers-fill-all-Ref B")).toBeInTheDocument();
  });

  it("does not render a fill button for an empty ref", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    const emptyRefB = makeEmptyRecipe(2);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1], emptyRefB]} />);
    expect(screen.getByTestId("watchers-fill-all-Ref A")).toBeInTheDocument();
    expect(screen.queryByTestId("watchers-fill-all-Ref B")).not.toBeInTheDocument();
  });

  it("populates targets for currently-watched keys from the ref's values when clicked", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);

    // Sanity-check: target inputs start empty for default-watched keys
    const msnfInput = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    const solidsInput = screen.getByTestId(
      `watcher-card-${String(TOTAL_SOLIDS)}-target`,
    ) as HTMLInputElement;
    expect(msnfInput.value).toBe("");
    expect(solidsInput.value).toBe("");

    fireEvent.click(screen.getByTestId("watchers-fill-all-Ref A"));

    // Both should now hold rounded numbers derived from Ref A's mix properties
    expect(msnfInput.value).not.toBe("");
    expect(solidsInput.value).not.toBe("");
    expect(Number.isFinite(parseFloat(msnfInput.value))).toBe(true);
    expect(Number.isFinite(parseFloat(solidsInput.value))).toBe(true);
  });

  it("overwrites existing targets when clicked", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 99 }));
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);

    const msnfInput = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    expect(msnfInput.value).toBe("99");

    fireEvent.click(screen.getByTestId("watchers-fill-all-Ref A"));
    expect(msnfInput.value).not.toBe("99");
  });

  it("snaps imported values to the target composition value format", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);
    fireEvent.click(screen.getByTestId("watchers-fill-all-Ref A"));

    // Fixed-point check: re-snapping a step-snapped value to the same step is a no-op. Stronger
    // than a decimal-place check because it catches half-step misses (e.g. 12.7 under step "0.5"
    // would pass a `toFixed(1)` check but isn't a multiple of 0.5).
    const msnfInput = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    const parsed = parseFloat(msnfInput.value);
    expect(parsed).toBe(roundToCompositionValueFormat(parsed));
  });

  it("persists filled targets to localStorage", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);
    fireEvent.click(screen.getByTestId("watchers-fill-all-Ref A"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherTargets) ?? "{}");
    expect(typeof stored[MSNF]).toBe("number");
  });

  it("skips non-balanceable keys (FpdKey) when filling targets from ref", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    const { container } = render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);

    const servingTempInput = container.querySelector(
      `[data-testid="watcher-card-${String(SERVING_TEMP)}-target"]`,
    ) as HTMLInputElement;
    expect(servingTempInput.value).toBe("");

    fireEvent.click(screen.getByTestId("watchers-fill-all-Ref A"));

    expect(servingTempInput.value).toBe("");
    const msnfInput = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    expect(msnfInput.value).not.toBe("");
  });
});

describe("WatchersView validation", () => {
  const MILK_FAT = compToPropKey(CompKey.MilkFat);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  /** A bridge whose `validate_recipe_targets` returns a fixed report, decoupled from the solver. */
  const makeValidatingBridge = (issues: unknown[]): WasmBridge =>
    ({
      has_ingredient: () => true,
      balance_recipe: () => [],
      validate_recipe_targets: () => ({ issues }),
    }) as unknown as WasmBridge;

  it("disables Balance and marks the card when validation reports an error", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MILK_FAT]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const bridge = makeValidatingBridge([
      { severity: "error", keys: [MILK_FAT], message: "Milk Fat target -2 is negative" },
    ]);
    render(<WatchersView main={main} wasmBridge={bridge} onApplyBalancedMain={vi.fn()} />);

    expect(screen.getByTestId("watchers-balance-button")).toBeDisabled();
    expect(screen.getByTestId("watcher-issues")).toBeInTheDocument();
    expect(screen.getByTestId("watcher-issues-toggle")).toHaveAccessibleName(/1 error/);
    const mark = screen.getByTestId(`watcher-card-${String(MILK_FAT)}-issue`);
    expect(mark).toHaveAttribute("data-severity", "error");
  });

  it("keeps Balance enabled and marks the card for a warning-only report", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MILK_FAT]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const bridge = makeValidatingBridge([
      {
        severity: "warning",
        keys: [MILK_FAT],
        message: "Milk Fat target 99 is outside the reachable range [0, 40]",
      },
    ]);
    render(<WatchersView main={main} wasmBridge={bridge} onApplyBalancedMain={vi.fn()} />);

    expect(screen.getByTestId("watchers-balance-button")).not.toBeDisabled();
    expect(screen.getByTestId("watcher-issues-toggle")).toHaveAccessibleName(/1 warning/);
    const mark = screen.getByTestId(`watcher-card-${String(MILK_FAT)}-issue`);
    expect(mark).toHaveAttribute("data-severity", "warning");
  });

  it("shows no issues strip and leaves Balance enabled for an empty report", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MILK_FAT]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const bridge = makeValidatingBridge([]);
    render(<WatchersView main={main} wasmBridge={bridge} onApplyBalancedMain={vi.fn()} />);

    expect(screen.queryByTestId("watcher-issues")).not.toBeInTheDocument();
    expect(screen.queryByTestId(`watcher-card-${String(MILK_FAT)}-issue`)).not.toBeInTheDocument();
    expect(screen.getByTestId("watchers-balance-button")).not.toBeDisabled();
  });
});

describe("WatchersView Total amount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render the total input without balancing support", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} />);
    expect(screen.queryByTestId("watchers-total-input")).not.toBeInTheDocument();
  });

  it("is empty when no total is set", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);

    expect(screen.getByTestId("watchers-total-input")).toHaveValue(null);
  });

  it("shows the persisted total", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTotal, JSON.stringify(1000));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);

    expect(screen.getByTestId("watchers-total-input")).toHaveValue(1000);
  });

  it("persists a new total on change", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);

    const input = screen.getByTestId("watchers-total-input");
    fireEvent.change(input, { target: { value: "1500" } });

    expect(input).toHaveValue(1500);
    expect(localStorage.getItem(STORAGE_KEYS.watcherTotal)).toBe(JSON.stringify(1500));
  });

  it("clears the total when the input is emptied", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTotal, JSON.stringify(1000));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);

    const input = screen.getByTestId("watchers-total-input");
    fireEvent.change(input, { target: { value: "" } });

    expect(input).toHaveValue(null);
    expect(localStorage.getItem(STORAGE_KEYS.watcherTotal)).not.toBe(JSON.stringify(1000));
  });
});

describe("WatchersView Auto-balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render the Auto toggle without autoBalanceState", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.queryByTestId("watchers-auto-balance-toggle")).not.toBeInTheDocument();
  });

  it("renders the Auto toggle when autoBalanceState is provided", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatchersView
        main={main}
        wasmBridge={WASM_BRIDGE}
        onApplyBalancedMain={vi.fn()}
        autoBalanceState={[false, vi.fn()]}
      />,
    );
    expect(screen.getByTestId("watchers-auto-balance-toggle")).toBeInTheDocument();
  });

  it("balances on mount when auto is on and a target is set", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const onApply = vi.fn();
    render(
      <WatchersView
        main={main}
        wasmBridge={WASM_BRIDGE}
        onApplyBalancedMain={onApply}
        autoBalanceState={[true, vi.fn()]}
      />,
    );

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("does not balance when auto is off", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const onApply = vi.fn();
    render(
      <WatchersView
        main={main}
        wasmBridge={WASM_BRIDGE}
        onApplyBalancedMain={onApply}
        autoBalanceState={[false, vi.fn()]}
      />,
    );

    expect(onApply).not.toHaveBeenCalled();
  });

  it("re-balances when the total changes while auto is on", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const onApply = vi.fn();
    render(
      <WatchersView
        main={main}
        wasmBridge={WASM_BRIDGE}
        onApplyBalancedMain={onApply}
        autoBalanceState={[true, vi.fn()]}
      />,
    );

    onApply.mockClear(); // ignore the initial (mount) balance

    fireEvent.change(screen.getByTestId("watchers-total-input"), { target: { value: "1200" } });
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("does not balance an empty main even when auto is on", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const onApply = vi.fn();
    render(
      <WatchersView
        main={makeEmptyRecipe(0)}
        wasmBridge={WASM_BRIDGE}
        onApplyBalancedMain={onApply}
        autoBalanceState={[true, vi.fn()]}
      />,
    );

    expect(onApply).not.toHaveBeenCalled();
  });

  it("does not balance while a target error stands", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const balanceSpy = vi.fn(() => []);
    const errorBridge = {
      has_ingredient: () => true,
      balance_recipe: balanceSpy,
      validate_recipe_targets: () => ({
        issues: [{ severity: "error", keys: [String(MSNF)], message: "infeasible" }],
      }),
    } as unknown as WasmBridge;

    render(
      <WatchersView
        main={main}
        wasmBridge={errorBridge}
        onApplyBalancedMain={vi.fn()}
        autoBalanceState={[true, vi.fn()]}
      />,
    );

    expect(balanceSpy).not.toHaveBeenCalled();
  });

  it("grays out and flags the Auto toggle as paused when auto is on and a target error stands", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const errorBridge = {
      has_ingredient: () => true,
      balance_recipe: vi.fn(() => []),
      validate_recipe_targets: () => ({
        issues: [{ severity: "error", keys: [String(MSNF)], message: "infeasible" }],
      }),
    } as unknown as WasmBridge;

    render(
      <WatchersView
        main={main}
        wasmBridge={errorBridge}
        onApplyBalancedMain={vi.fn()}
        autoBalanceState={[true, vi.fn()]}
      />,
    );

    const toggle = screen.getByTestId("watchers-auto-balance-toggle");
    expect(toggle).toHaveAttribute("data-paused", "true");
    expect(toggle).toHaveClass("opacity-50");
  });

  it("does not flag the Auto toggle as paused when auto is off despite a target error", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);
    const errorBridge = {
      has_ingredient: () => true,
      balance_recipe: vi.fn(() => []),
      validate_recipe_targets: () => ({
        issues: [{ severity: "error", keys: [String(MSNF)], message: "infeasible" }],
      }),
    } as unknown as WasmBridge;

    render(
      <WatchersView
        main={main}
        wasmBridge={errorBridge}
        onApplyBalancedMain={vi.fn()}
        autoBalanceState={[false, vi.fn()]}
      />,
    );

    const toggle = screen.getByTestId("watchers-auto-balance-toggle");
    expect(toggle).toHaveAttribute("data-paused", "false");
    expect(toggle).not.toHaveClass("opacity-50");
  });

  it("clicking the Auto toggle turns it on and de-emphasizes the Balance button", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 10 }));
    const main = makeMockRecipe(RecipeID.Main);

    /** Owns the auto-balance toggle state so clicking the toggle updates it. */
    function StatefulAutoView() {
      const autoBalanceState = useState(false);
      return (
        <WatchersView
          main={main}
          wasmBridge={WASM_BRIDGE}
          onApplyBalancedMain={vi.fn()}
          autoBalanceState={autoBalanceState}
        />
      );
    }
    render(<StatefulAutoView />);

    const toggle = screen.getByTestId("watchers-auto-balance-toggle");
    const balance = screen.getByTestId("watchers-balance-button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(balance).not.toHaveClass("opacity-50");

    act(() => fireEvent.click(toggle));

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(balance).toHaveClass("opacity-50");
  });
});

describe("WatcherCard visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("hides the range meter when showRange is false", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        showRange={false}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-meter`)).not.toBeInTheDocument();
  });

  it("hides the target input and its delta when showTarget is false", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Absolute}
        target={9.5}
        showTarget={false}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-target`)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`watcher-card-${String(MSNF)}-target-delta`),
    ).not.toBeInTheDocument();
  });

  it("hides the reference rows when showRefs is false", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[refA]}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        showRefs={false}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).not.toBeInTheDocument();
  });
});

describe("WatcherCard clear target", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a clear-target button when a target is set", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-clear-target`)).toBeInTheDocument();
  });

  it("calls onTargetChange(undefined) when the clear-target button is clicked", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onTargetChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        onTargetChange={onTargetChange}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-clear-target`));
    expect(onTargetChange).toHaveBeenCalledWith(undefined);
  });

  it("does not render the clear-target button when no target is set", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId(`watcher-card-${String(MSNF)}-clear-target`),
    ).not.toBeInTheDocument();
  });

  it("does not render the clear-target button for a non-balanceable key", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={SERVING_TEMP}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId(`watcher-card-${String(SERVING_TEMP)}-clear-target`),
    ).not.toBeInTheDocument();
  });

  it("does not render the clear-target button when showTarget is false", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        deltaToggle={DeltaToggle.Off}
        target={9.5}
        showTarget={false}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId(`watcher-card-${String(MSNF)}-clear-target`),
    ).not.toBeInTheDocument();
  });
});

describe("WatchersView Set from current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the fill-from-current (M) button with balancing support", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.getByTestId("watchers-fill-all-main")).toBeInTheDocument();
  });

  it("populates targets for watched keys from the current recipe when clicked", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);

    const msnfInput = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    expect(msnfInput.value).toBe("");

    fireEvent.click(screen.getByTestId("watchers-fill-all-main"));

    // The filled value is a finite number snapped to the target composition-value format.
    const parsed = parseFloat(msnfInput.value);
    expect(Number.isFinite(parsed)).toBe(true);
    expect(parsed).toBe(roundToCompositionValueFormat(parsed));
  });

  it("skips non-balanceable keys (FpdKey) when filling targets from the current recipe", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />,
    );
    const servingTempInput = container.querySelector(
      `[data-testid="watcher-card-${String(SERVING_TEMP)}-target"]`,
    ) as HTMLInputElement;
    expect(servingTempInput.value).toBe("");

    fireEvent.click(screen.getByTestId("watchers-fill-all-main"));

    expect(servingTempInput.value).toBe("");
  });
});

describe("WatchersView Clear all targets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("is disabled when no targets are set", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);
    expect(screen.getByTestId("watchers-clear-targets")).toBeDisabled();
  });

  it("clears every target and empties localStorage when clicked", () => {
    localStorage.setItem(
      STORAGE_KEYS.watcherTargets,
      JSON.stringify({ [MSNF]: 9.5, [TOTAL_SOLIDS]: 40 }),
    );
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);

    const msnfInput = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    expect(msnfInput.value).toBe("9.5");

    fireEvent.click(screen.getByTestId("watchers-clear-targets"));

    expect(msnfInput.value).toBe("");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherTargets) ?? "{}");
    expect(Object.keys(stored)).toHaveLength(0);
  });

  it("leaves priorities untouched when clearing targets", () => {
    localStorage.setItem(STORAGE_KEYS.watcherTargets, JSON.stringify({ [MSNF]: 9.5 }));
    localStorage.setItem(STORAGE_KEYS.watcherPriorities, JSON.stringify({ [MSNF]: Priority.High }));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} wasmBridge={WASM_BRIDGE} onApplyBalancedMain={vi.fn()} />);

    fireEvent.click(screen.getByTestId("watchers-clear-targets"));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherPriorities) ?? "{}");
    expect(stored[MSNF]).toBe(Priority.High);
  });
});

describe("WatchersView visibility toggles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the three visibility toggle buttons", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    expect(screen.getByTestId("watchers-toggle-range")).toBeInTheDocument();
    expect(screen.getByTestId("watchers-toggle-target")).toBeInTheDocument();
    expect(screen.getByTestId("watchers-toggle-refs")).toBeInTheDocument();
  });

  it("hides the range meter when the range toggle is turned off", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-meter`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("watchers-toggle-range"));
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-meter`)).not.toBeInTheDocument();
  });

  it("hides the target inputs when the target toggle is turned off", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-target`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("watchers-toggle-target"));
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-target`)).not.toBeInTheDocument();
  });

  it("hides the reference values when the refs toggle is turned off", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("watchers-toggle-refs"));
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).not.toBeInTheDocument();
  });

  it("persists a toggle change to its localStorage leaf key", async () => {
    const persistKey = "test-watcher-view";
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} persistKey={persistKey} />);
    fireEvent.click(screen.getByTestId("watchers-toggle-range"));
    await act(async () => {});
    expect(localStorage.getItem(`${persistKey}:${STORAGE_KEYS.watcherShowRange}`)).toBe(
      JSON.stringify(false),
    );
  });

  it("hydrates a toggle from localStorage on mount", async () => {
    const persistKey = "test-watcher-view";
    localStorage.setItem(`${persistKey}:${STORAGE_KEYS.watcherShowRange}`, JSON.stringify(false));
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} persistKey={persistKey} />);
    await act(async () => {});
    expect(screen.getByTestId("watchers-toggle-range")).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-meter`)).not.toBeInTheDocument();
  });
});
