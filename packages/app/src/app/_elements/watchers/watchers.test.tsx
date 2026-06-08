import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { WatcherCard, WatchersView } from "@/app/_elements/watchers/watchers";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { makeEmptyRecipe } from "@/lib/recipe";
import { getRangeColor, Color } from "@/lib/styles/colors";
import { roundToStep } from "@/lib/util";

import {
  Bridge as WasmBridge,
  CompKey,
  FpdKey,
  Priority,
  compToPropKey,
  fpdToPropKey,
} from "@workspace/sci-cream";

import { makeMockRecipe, makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const MSNF = compToPropKey(CompKey.MSNF);
const TOTAL_SOLIDS = compToPropKey(CompKey.TotalSolids);
const SERVING_TEMP = fpdToPropKey(FpdKey.ServingTemp);
const TOTAL_FATS = compToPropKey(CompKey.TotalFats); // no defined range

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
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("MSNF")).toBeInTheDocument();
  });

  it("renders the acceptable range inline next to the main value when defined", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // MSNF range is { min: 5, max: 15 } → rendered as "[5, 15]"
    const rangeEl = container.querySelector('[title="Acceptable range"]');
    expect(rangeEl?.textContent).toBe("[5, 15]");
  });

  it("omits the range element when no range is defined", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={TOTAL_FATS}
        main={main}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(container.querySelector('[title="Acceptable range"]')).toBeNull();
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

  it("color-codes the header background based on the value's position in the range", () => {
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
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // The first child of the card root is the header; expect an inline backgroundColor
    const card = container.querySelector(`[data-testid="watcher-card-${String(MSNF)}"]`)!;
    const header = card.firstElementChild as HTMLElement;
    expect(header.style.backgroundColor).not.toBe("");
  });

  it("calls onTargetChange when the user types a target value", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onTargetChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
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
        target={9.5}
        onTargetChange={vi.fn()}
        onPriorityChange={onPriorityChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    expect(onPriorityChange).toHaveBeenCalledWith(Priority.High);
  });

  it("wraps the priority cycle back to Normal after Critical", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const onPriorityChange = vi.fn();
    render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        target={9.5}
        priority={Priority.Critical}
        onTargetChange={vi.fn()}
        onPriorityChange={onPriorityChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    expect(onPriorityChange).toHaveBeenCalledWith(Priority.Normal);
  });

  it("renders a placeholder value when the recipe is empty", () => {
    const emptyMain = makeEmptyRecipe(0);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={emptyMain}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // Main value cell renders a non-breaking-space placeholder to preserve layout
    const valueCell = container.querySelector('[title="Current value"]');
    expect(valueCell?.textContent).toBe(" ");

    // Header is still rendered with an inline backgroundColor (neutral when no value)
    const card = container.querySelector(`[data-testid="watcher-card-${String(MSNF)}"]`)!;
    const header = card.firstElementChild as HTMLElement;
    expect(header.style.backgroundColor).not.toBe("");
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

  it("renders the ref delta as mainValue minus refValue with matching sign and magnitude", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const refA = makeMockRecipe(RecipeID.RefA);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[refA]}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const mainNum = parseFloat(container.querySelector('[title="Current value"]')!.textContent!);
    const refRow = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-ref-Ref A"]`,
    )!;
    const refNum = parseFloat((refRow.children[1] as HTMLElement).textContent!);
    const deltaText = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-ref-Ref A-delta"]`,
    )!.textContent!;

    expect(Number.isFinite(mainNum)).toBe(true);
    expect(Number.isFinite(refNum)).toBe(true);

    const expected = mainNum - refNum;
    expect(deltaText[0]).toBe(expected > 0 ? "+" : "−");
    const renderedMagnitude = parseFloat(deltaText.slice(1));
    expect(renderedMagnitude).toBeCloseTo(Math.abs(expected), 1);
  });

  it("filters out fully empty ref recipes entirely (no row rendered)", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const emptyRef = makeEmptyRecipe(1); // id = "Ref A", mixTotal=undefined → empty
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        refs={[emptyRef]}
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

  it("renders an empty ref delta when the main recipe has no value", () => {
    const emptyMain = makeEmptyRecipe(0);
    const refA = makeMockRecipe(RecipeID.RefA);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={emptyMain}
        refs={[refA]}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const deltaEl = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-ref-Ref A-delta"]`,
    );
    expect(deltaEl?.textContent).toBe("");
  });

  it("does not render the target delta when target is undefined", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        target={undefined}
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      container.querySelector(`[data-testid="watcher-card-${String(MSNF)}-target-delta"]`),
    ).toBeNull();
  });

  it("does not render the target delta when the main recipe has no value", () => {
    const emptyMain = makeEmptyRecipe(0);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={emptyMain}
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

  it("renders a signed positive target delta in monochrome when target exceeds current", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        target={100} // far above Main's MSNF (~8.87)
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    expect(delta.textContent!.startsWith("+")).toBe(true);
    // Monochrome: no inline color override (neither green/red), so it inherits the text color.
    expect(delta.style.color).toBe("");
  });

  it("renders a negative target delta with a unicode minus in monochrome when below current", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={main}
        target={0} // below Main's MSNF (~8.87)
        onTargetChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const delta = container.querySelector(
      `[data-testid="watcher-card-${String(MSNF)}-target-delta"]`,
    ) as HTMLElement;
    expect(delta).not.toBeNull();
    // Uses the unicode minus sign (U+2212), not the hyphen-minus (U+002D)
    expect(delta.textContent![0]).toBe("−");
    expect(delta.textContent![0]).not.toBe("-");
    // Monochrome: no inline color override (neither green/red), so it inherits the text color.
    expect(delta.style.color).toBe("");
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

  it("hydrates the selection from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEYS.watcherSelectedProps, JSON.stringify([TOTAL_FATS]));
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} />);

    // Default filter is Auto (ignores selection); switch to Custom to observe the hydrated set
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: KeyFilter.Custom } });

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

  it("persists the selection to localStorage after removal (Custom filter)", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} />);
    // Removal only applies under the Custom filter, where the remove button is shown.
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: KeyFilter.Custom } });
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherSelectedProps) ?? "[]");
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
    localStorage.setItem(
      STORAGE_KEYS.watcherPriorities,
      JSON.stringify({ [MSNF]: Priority.Critical }),
    );
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
    // Hydrated as Critical; one click wraps back to Normal, which drops the entry.
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-priority`));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherPriorities) ?? "{}");
    expect(MSNF in stored).toBe(false);
  });

  it("drops a removed key's priority entry from localStorage (Custom filter)", () => {
    localStorage.setItem(STORAGE_KEYS.watcherPriorities, JSON.stringify({ [MSNF]: Priority.High }));
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} />);
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: KeyFilter.Custom } });
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherPriorities) ?? "{}");
    expect(MSNF in stored).toBe(false);
  });

  it("hides remove buttons under the Auto filter and shows them under Custom", () => {
    const main = makeMockRecipe(RecipeID.Main);
    const { container } = render(<WatchersView main={main} />);
    // Default filter is Auto: removal is a no-op there, so no remove buttons are rendered.
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-remove`)).not.toBeInTheDocument();

    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: KeyFilter.Custom } });
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`)).toBeInTheDocument();
  });

  it("passes the active reference recipes to each card", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefB]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[2]]} />);
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref B`)).toBeInTheDocument();
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).not.toBeInTheDocument();
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

  it("clicking Balance invokes onApplyBalancedMain with a same-length [string, number][]", () => {
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
    const arg = onApply.mock.calls[0][0] as [string, number][];
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
      (
        recipe: unknown,
        targets: [string, number][],
        priorities: [string, Priority][],
      ) => [string, number][]
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

  it("snaps imported values to the target input's step boundaries", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);
    fireEvent.click(screen.getByTestId("watchers-fill-all-Ref A"));

    // Fixed-point check: re-snapping a step-snapped value to the same step is a no-op. Stronger
    // than a decimal-place check because it catches half-step misses (e.g. 12.7 under step "0.5"
    // would pass a `toFixed(1)` check but isn't a multiple of 0.5).
    const msnfInput = screen.getByTestId(`watcher-card-${String(MSNF)}-target`) as HTMLInputElement;
    const parsed = parseFloat(msnfInput.value);
    expect(parsed).toBe(roundToStep(parsed, msnfInput.step));
  });

  it("persists filled targets to localStorage", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[1]]} />);
    fireEvent.click(screen.getByTestId("watchers-fill-all-Ref A"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.watcherTargets) ?? "{}");
    expect(typeof stored[MSNF]).toBe("number");
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
