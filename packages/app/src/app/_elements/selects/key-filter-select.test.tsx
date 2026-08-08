import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react";
import { useState, useEffect } from "react";

import { KeyFilter, KeyFilterSelect, getEnabledKeys } from "./key-filter-select";

import { openCustomKeyFilters } from "@/__tests__/unit/util";
import {
  getSelectControl,
  getSelectControlByLabel,
  getSelectedOptionLabel,
  getSelectOptionLabels,
  selectOption,
} from "@/__tests__/unit/select";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

/** Minimal key enum used across all `KeyFilterSelect` tests */
enum TestKey {
  Fat = "fat",
  Sugar = "sugar",
  Water = "water",
  Protein = "protein",
}

/** All values of `TestKey`, used as the full key universe in tests */
const ALL_KEYS: TestKey[] = [TestKey.Fat, TestKey.Sugar, TestKey.Water, TestKey.Protein];

/** Returns the full `ALL_KEYS` array; used as the `getKeys` prop */
const getAllKeys = () => ALL_KEYS;
/** Returns `true` for keys that should be treated as empty/zero (Water) */
const isKeyEmpty = (key: TestKey) => key === TestKey.Water;
/** Returns `true` for keys selected by the Auto heuristic (Fat, Sugar) */
const autoHeuristic = (key: TestKey) => key === TestKey.Fat || key === TestKey.Sugar;
/** Converts a `TestKey` to its capitalised display string */
const key_as_med_str = (key: TestKey) => key.charAt(0).toUpperCase() + key.slice(1);

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

describe("getEnabledKeys", () => {
  it("returns all keys for KeyFilter.All", () => {
    const result = getEnabledKeys(
      KeyFilter.All,
      new Set<TestKey>(),
      getAllKeys,
      isKeyEmpty,
      autoHeuristic,
    );
    expect(result).toEqual(ALL_KEYS);
  });

  it("returns keys passing autoHeuristic for KeyFilter.Auto", () => {
    const result = getEnabledKeys(
      KeyFilter.Auto,
      new Set<TestKey>(),
      getAllKeys,
      isKeyEmpty,
      autoHeuristic,
    );
    expect(result).toEqual([TestKey.Fat, TestKey.Sugar]);
  });

  it("returns non-empty keys for KeyFilter.Active", () => {
    const result = getEnabledKeys(
      KeyFilter.Active,
      new Set<TestKey>(),
      getAllKeys,
      isKeyEmpty,
      autoHeuristic,
    );
    // "Water" is considered empty by isKeyEmpty, so it is excluded
    expect(result).toEqual([TestKey.Fat, TestKey.Sugar, TestKey.Protein]);
  });

  it("returns only selected keys for KeyFilter.Custom", () => {
    const result = getEnabledKeys(
      KeyFilter.Custom,
      new Set<TestKey>([TestKey.Fat, TestKey.Protein]),
      getAllKeys,
      isKeyEmpty,
      autoHeuristic,
    );
    expect(result).toEqual([TestKey.Fat, TestKey.Protein]);
  });

  it("returns empty array for KeyFilter.Custom with no selection", () => {
    const result = getEnabledKeys(
      KeyFilter.Custom,
      new Set<TestKey>(),
      getAllKeys,
      isKeyEmpty,
      autoHeuristic,
    );
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// KeyFilterSelect component
// ---------------------------------------------------------------------------

describe("KeyFilterSelect", () => {
  let currentFilter: KeyFilter;
  let currentSelectedKeys: Set<TestKey>;

  /**
   * Wrapper component around a `KeyFilterSelect` that owns filter and selectedKeys state, which are
   * props to `KeyFilterSelect`, and exposes them for assertions via `useEffect` and variables.
   */
  function TestWrapper({
    supportedKeyFilters,
    initialFilter = KeyFilter.Auto,
    initialSelected = new Set<TestKey>(),
    defaultSelected = new Set<TestKey>([TestKey.Water]),
    orderKeys,
  }: {
    supportedKeyFilters?: KeyFilter[];
    initialFilter?: KeyFilter;
    initialSelected?: Set<TestKey>;
    defaultSelected?: Set<TestKey>;
    orderKeys?: (keys: TestKey[]) => { key: TestKey; depth: number; isRollup: boolean }[];
  }) {
    const [filter, setFilter] = useState<KeyFilter>(initialFilter ?? KeyFilter.Auto);
    const [selectedKeys, setSelectedKeys] = useState<Set<TestKey>>(
      initialSelected ?? new Set<TestKey>(),
    );

    useEffect(() => {
      currentFilter = filter;
    }, [filter]);
    useEffect(() => {
      currentSelectedKeys = selectedKeys;
    }, [selectedKeys]);

    return (
      <KeyFilterSelect
        supportedKeyFilters={supportedKeyFilters}
        keyFilterState={[filter, setFilter]}
        selectedKeysState={[selectedKeys, setSelectedKeys]}
        getKeys={getAllKeys}
        defaultSelected={defaultSelected}
        autoHeuristic={autoHeuristic}
        key_as_med_str={key_as_med_str}
        orderKeys={orderKeys}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  // ---- Rendering --------------------------------------------------------------------------------

  it("renders all KeyFilter options by default", async () => {
    const { container } = render(<TestWrapper />);
    expect(await getSelectOptionLabels(container, "#key-filter-select")).toEqual(
      Object.values(KeyFilter),
    );
  });

  it("names the control and echoes the current filter in its tooltip", () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Active} />);
    expect(getSelectControlByLabel("Properties shown")).toBe(
      getSelectControl(container, "#key-filter-select"),
    );
    expect(container.querySelector("#key-filter-select [title]")).toHaveAttribute(
      "title",
      `Properties shown (${KeyFilter.Active})`,
    );
  });

  it("reflects the current filter value in the selected label", () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Active} />);
    expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Active);
  });

  it("renders only the supported options when supportedKeyFilters is provided", async () => {
    const supported = [KeyFilter.All, KeyFilter.Active];
    const { container } = render(<TestWrapper supportedKeyFilters={supported} />);
    expect(await getSelectOptionLabels(container, "#key-filter-select")).toEqual(supported);
  });

  // ---- Filter select interaction ----------------------------------------------------------------

  it("updates the displayed filter and state when the selection changes", async () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Auto} />);
    await selectOption(container, "#key-filter-select", KeyFilter.All);
    expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.All);
    expect(currentFilter).toBe(KeyFilter.All);
  });

  // ---- Settings button visibility ---------------------------------------------------------------

  it("does not show the settings button for non-Custom filters", () => {
    [KeyFilter.Auto, KeyFilter.All, KeyFilter.Active].forEach((filter) => {
      const { container, unmount } = render(<TestWrapper initialFilter={filter} />);
      expect(container.querySelector("#customize-keys-button")).not.toBeInTheDocument();
      unmount();
    });
  });

  it("shows the settings button when Custom filter is active at mount", () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Custom} />);
    expect(container.querySelector("#customize-keys-button")).toBeInTheDocument();
  });

  it("shows the settings button after switching to Custom filter", async () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Auto} />);
    await selectOption(container, "#key-filter-select", KeyFilter.Custom);
    await waitFor(() =>
      expect(container.querySelector("#customize-keys-button")).toBeInTheDocument(),
    );
  });

  it("hides the settings button after switching away from Custom filter", async () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Custom} />);
    await selectOption(container, "#key-filter-select", KeyFilter.All);
    await waitFor(() =>
      expect(container.querySelector("#customize-keys-button")).not.toBeInTheDocument(),
    );
  });

  // ---- Popup open / close -----------------------------------------------------------------------

  it("clicking the settings button shows the popup", async () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Custom} />);
    await openCustomKeyFilters(container);
    expect(document.querySelector(".popup")).toBeInTheDocument();
  });

  it("clicking the close button hides the popup", async () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Custom} />);
    await openCustomKeyFilters(container);

    const popup = document.querySelector(".popup") as HTMLElement;
    fireEvent.click(within(popup).getByTestId("key-filter-close"));

    await waitFor(() => expect(screen.queryByText("All Properties")).not.toBeInTheDocument());
  });

  // ---- Popup content ----------------------------------------------------------------------------

  it("popup lists all keys with checkboxes", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set([TestKey.Fat])} />,
    );
    await openCustomKeyFilters(container);

    ALL_KEYS.forEach((key) => {
      expect(screen.getByText(key_as_med_str(key))).toBeInTheDocument();
    });
  });

  it("orderKeys reorders the popup list and indents/emphasizes rows", async () => {
    // Group Fat (rollup) with Sugar indented under it; Water and Protein stay flat afterwards.
    const orderKeys = (keys: TestKey[]) =>
      keys.map((key) => ({
        key,
        depth: key === TestKey.Sugar ? 1 : 0,
        isRollup: key === TestKey.Fat,
      }));
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} orderKeys={orderKeys} />,
    );
    await openCustomKeyFilters(container);

    const popup = document.querySelector(".popup") as HTMLElement;
    const items = within(popup).getAllByRole("listitem");
    // First <li> is "All Properties"; the rest follow orderKeys order.
    const fatItem = items.find((li) => li.textContent?.includes(key_as_med_str(TestKey.Fat)))!;
    const sugarItem = items.find((li) => li.textContent?.includes(key_as_med_str(TestKey.Sugar)))!;
    expect(fatItem).toHaveClass("font-semibold");
    expect(sugarItem).toHaveStyle({ paddingLeft: "0.75rem" });
    expect(fatItem).not.toHaveStyle({ paddingLeft: "0.75rem" });
  });

  it("key checkboxes reflect the current selectedKeys set", async () => {
    const { container } = render(
      <TestWrapper
        initialFilter={KeyFilter.Custom}
        initialSelected={new Set([TestKey.Fat, TestKey.Protein])}
      />,
    );
    await openCustomKeyFilters(container);

    const popup = document.querySelector(".popup") as HTMLElement;
    const allCheckboxes = within(popup).getAllByRole("checkbox");
    // First checkbox is "All Properties"; remaining ones correspond to ALL_KEYS in order
    const [, fatCb, sugarCb, waterCb, proteinCb] = allCheckboxes;
    expect(fatCb).toBeChecked();
    expect(sugarCb).not.toBeChecked();
    expect(waterCb).not.toBeChecked();
    expect(proteinCb).toBeChecked();
  });

  // ---- Individual key toggle --------------------------------------------------------------------

  it("checking an unchecked key adds it to the selection", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set()} />,
    );
    await openCustomKeyFilters(container);

    const fatLabel = screen.getByText("Fat");
    const fatCb = within(fatLabel.closest("li") as HTMLElement).getByRole("checkbox");
    expect(fatCb).not.toBeChecked();
    expect(currentSelectedKeys).toEqual(new Set());

    fireEvent.click(fatCb);
    expect(fatCb).toBeChecked();
    expect(currentSelectedKeys).toEqual(new Set([TestKey.Fat]));
  });

  it("unchecking a checked key removes it from the selection", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set([TestKey.Fat])} />,
    );
    await openCustomKeyFilters(container);

    const fatLabel = screen.getByText("Fat");
    const fatCb = within(fatLabel.closest("li") as HTMLElement).getByRole("checkbox");
    expect(fatCb).toBeChecked();
    expect(currentSelectedKeys).toEqual(new Set([TestKey.Fat]));

    fireEvent.click(fatCb);
    expect(fatCb).not.toBeChecked();
    expect(currentSelectedKeys).toEqual(new Set());
  });

  it("unchecking a key unchecks the 'All Properties' checkbox", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set()} />,
    );
    await openCustomKeyFilters(container);

    // Select all via the "All Properties" toggle first
    const allPropsCb = document.querySelector("#all-properties-checkbox") as HTMLInputElement;
    fireEvent.click(allPropsCb);
    expect(allPropsCb).toBeChecked();

    // Deselect one individual key
    const fatLabel = screen.getByText("Fat");
    const fatCb = within(fatLabel.closest("li") as HTMLElement).getByRole("checkbox");
    fireEvent.click(fatCb); // removes fat → allKeysSelected becomes false

    expect(allPropsCb).not.toBeChecked();
  });

  // ---- "All Properties" toggle ------------------------------------------------------------------

  it("checking 'All Properties' selects all keys", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set()} />,
    );
    await openCustomKeyFilters(container);

    const allPropsCb = document.querySelector("#all-properties-checkbox") as HTMLInputElement;
    expect(allPropsCb).not.toBeChecked();

    fireEvent.click(allPropsCb);

    const popup = document.querySelector(".popup") as HTMLElement;
    const keyCbs = within(popup).getAllByRole("checkbox").slice(1); // skip "All Properties"
    keyCbs.forEach((cb) => expect(cb).toBeChecked());
    expect(currentSelectedKeys).toEqual(new Set(ALL_KEYS));
  });

  it("unchecking 'All Properties' deselects all keys", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set()} />,
    );
    await openCustomKeyFilters(container);

    const allPropsCb = document.querySelector("#all-properties-checkbox") as HTMLInputElement;

    // Two clicks: select all → deselect all
    fireEvent.click(allPropsCb); // allKeysSelected → true
    fireEvent.click(allPropsCb); // allKeysSelected → false

    const popup = document.querySelector(".popup") as HTMLElement;
    const keyCbs = within(popup).getAllByRole("checkbox").slice(1);
    keyCbs.forEach((cb) => expect(cb).not.toBeChecked());
    expect(currentSelectedKeys).toEqual(new Set());
  });

  it("'All Properties' is checked at mount when every key is already selected", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set(ALL_KEYS)} />,
    );
    await openCustomKeyFilters(container);

    expect(document.querySelector("#all-properties-checkbox")).toBeChecked();
  });

  // ---- Reset ------------------------------------------------------------------------------------

  it("reset restores the Auto selection when Auto is a supported filter", async () => {
    const { container } = render(
      <TestWrapper initialFilter={KeyFilter.Custom} initialSelected={new Set([TestKey.Protein])} />,
    );
    await openCustomKeyFilters(container);

    const popup = document.querySelector(".popup") as HTMLElement;
    fireEvent.click(within(popup).getByTestId("key-filter-reset"));

    // autoHeuristic passes Fat and Sugar; defaultSelected (Water) is not used here
    expect(currentSelectedKeys).toEqual(new Set([TestKey.Fat, TestKey.Sugar]));
    const [, fatCb, sugarCb, waterCb, proteinCb] = within(popup).getAllByRole("checkbox");
    expect(fatCb).toBeChecked();
    expect(sugarCb).toBeChecked();
    expect(waterCb).not.toBeChecked();
    expect(proteinCb).not.toBeChecked();
  });

  it("reset restores defaultSelected when Auto is not a supported filter", async () => {
    const { container } = render(
      <TestWrapper
        supportedKeyFilters={[KeyFilter.Active, KeyFilter.All, KeyFilter.Custom]}
        initialFilter={KeyFilter.Custom}
        initialSelected={new Set([TestKey.Protein])}
        defaultSelected={new Set([TestKey.Water])}
      />,
    );
    await openCustomKeyFilters(container);

    const popup = document.querySelector(".popup") as HTMLElement;
    fireEvent.click(within(popup).getByTestId("key-filter-reset"));

    expect(currentSelectedKeys).toEqual(new Set([TestKey.Water]));
  });

  it("reset is disabled when the selection already matches the reset target", async () => {
    const { container } = render(
      <TestWrapper
        initialFilter={KeyFilter.Custom}
        initialSelected={new Set([TestKey.Sugar, TestKey.Fat])}
      />,
    );
    await openCustomKeyFilters(container);

    const popup = document.querySelector(".popup") as HTMLElement;
    const resetBtn = within(popup).getByTestId("key-filter-reset");
    expect(resetBtn).toBeDisabled();

    // Dropping a key makes the selection differ from the Auto set, re-enabling reset
    const fatLabel = screen.getByText("Fat");
    fireEvent.click(within(fatLabel.closest("li") as HTMLElement).getByRole("checkbox"));
    expect(resetBtn).toBeEnabled();
  });
});
