import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react";
import { useState, useEffect } from "react";

import { KeyFilter, KeyFilterSelect, getEnabledKeys } from "./key-filter-select";

import { openCustomKeyFilters } from "@/__tests__/unit/util";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

enum TestKey {
  Fat = "fat",
  Sugar = "sugar",
  Water = "water",
  Protein = "protein",
}

const ALL_KEYS: TestKey[] = [TestKey.Fat, TestKey.Sugar, TestKey.Water, TestKey.Protein];

const getAllKeys = () => ALL_KEYS;
const isKeyEmpty = (key: TestKey) => key === TestKey.Water;
const autoHeuristic = (key: TestKey) => key === TestKey.Fat || key === TestKey.Sugar;
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

  it("returns non-empty keys for KeyFilter.NonZero", () => {
    const result = getEnabledKeys(
      KeyFilter.NonZero,
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

  function TestWrapper({
    supportedKeyFilters,
    initialFilter = KeyFilter.Auto,
    initialSelected = new Set<TestKey>(),
  }: {
    supportedKeyFilters?: KeyFilter[];
    initialFilter?: KeyFilter;
    initialSelected?: Set<TestKey>;
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
        key_as_med_str={key_as_med_str}
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

  it("renders a select with all KeyFilter options by default", () => {
    const { container } = render(<TestWrapper />);
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    Object.values(KeyFilter).forEach((kf) => {
      expect(within(select).getByRole("option", { name: kf })).toBeInTheDocument();
    });
  });

  it("reflects the current filter value in the select", () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.NonZero} />);
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    expect(select.value).toBe(KeyFilter.NonZero);
  });

  it("renders only the supported options when supportedKeyFilters is provided", () => {
    const supported = [KeyFilter.All, KeyFilter.NonZero];
    const { container } = render(<TestWrapper supportedKeyFilters={supported} />);
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(supported);
  });

  // ---- Filter select interaction ----------------------------------------------------------------

  it("updates the displayed filter and state when the select value changes", () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Auto} />);
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: KeyFilter.All } });
    expect(select.value).toBe(KeyFilter.All);
    expect(currentFilter).toBe(KeyFilter.All);
  });

  // ---- Settings button visibility ---------------------------------------------------------------

  it("does not show the settings button for non-Custom filters", () => {
    [KeyFilter.Auto, KeyFilter.All, KeyFilter.NonZero].forEach((filter) => {
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
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: KeyFilter.Custom } });
    await waitFor(() =>
      expect(container.querySelector("#customize-keys-button")).toBeInTheDocument(),
    );
  });

  it("hides the settings button after switching away from Custom filter", async () => {
    const { container } = render(<TestWrapper initialFilter={KeyFilter.Custom} />);
    const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: KeyFilter.All } });
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
    const closeBtn = within(popup).getByRole("button");
    fireEvent.click(closeBtn);

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
});
