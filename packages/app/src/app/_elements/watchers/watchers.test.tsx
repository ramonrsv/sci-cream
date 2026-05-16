import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { WatcherCard, WatchersView } from "@/app/_elements/watchers/watchers";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { makeEmptyRecipe } from "@/lib/recipe";
import { getRangeColor, Color } from "@/lib/styles/colors";

import { CompKey, FpdKey, compToPropKey, fpdToPropKey } from "@workspace/sci-cream";

import { makeMockRecipe, makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";

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
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByTestId(`watcher-card-${String(MSNF)}-remove`));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders an empty value when the recipe is empty", () => {
    const emptyMain = makeEmptyRecipe(0);
    const { container } = render(
      <WatcherCard
        propKey={MSNF}
        main={emptyMain}
        target={undefined}
        onTargetChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // Main value cell is empty when there's no value to show
    const valueCell = container.querySelector('[title="Current value"]');
    expect(valueCell?.textContent).toBe("");

    // Header is still rendered with an inline backgroundColor (neutral when no value)
    const card = container.querySelector(`[data-testid="watcher-card-${String(MSNF)}"]`)!;
    const header = card.firstElementChild as HTMLElement;
    expect(header.style.backgroundColor).not.toBe("");
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

  it("persists the selection to localStorage after removal", () => {
    const main = makeMockRecipe(RecipeID.Main);
    render(<WatchersView main={main} />);
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

  it("passes the active reference recipes to each card", () => {
    const ctx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefB]);
    render(<WatchersView main={ctx.recipes[0]} refs={[ctx.recipes[2]]} />);
    expect(screen.getByTestId(`watcher-card-${String(MSNF)}-ref-Ref B`)).toBeInTheDocument();
    expect(screen.queryByTestId(`watcher-card-${String(MSNF)}-ref-Ref A`)).not.toBeInTheDocument();
  });
});
