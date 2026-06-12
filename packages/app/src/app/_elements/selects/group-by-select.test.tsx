import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";

import {
  GroupBy,
  GROUP_BY_LABELS,
  GroupByProvider,
  isGrouped,
  groupsWithDuplicates,
  useGroupBy,
} from "@/lib/group-by";

import { GroupBySelect } from "./group-by-select";

describe("GroupBySelect", () => {
  let currentGroupBy: GroupBy;

  /** Reads the provider's grouping value into a closure variable for assertions. */
  function GroupByProbe() {
    const { groupBy } = useGroupBy();
    useEffect(() => {
      currentGroupBy = groupBy;
    }, [groupBy]);
    return null;
  }

  /** Wraps the navbar control in its `GroupByProvider`, as the real layout does. */
  function TestWrapper() {
    return (
      <GroupByProvider>
        <GroupBySelect />
        <GroupByProbe />
      </GroupByProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
    localStorage.clear();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("renders a listbox button inside #group-by-select", () => {
    const { container } = render(<TestWrapper />);
    const wrapper = container.querySelector("#group-by-select");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper!.querySelector('[aria-haspopup="listbox"]')).toBeInTheDocument();
  });

  it("defaults to Ungrouped", () => {
    render(<TestWrapper />);
    expect(currentGroupBy).toBe(GroupBy.Ungrouped);
  });

  it("offers the three grouping options with readable labels", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      for (const label of Object.values(GROUP_BY_LABELS)) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });
  });

  it("propagates a changed selection and persists it to localStorage", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await user.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByText(GROUP_BY_LABELS[GroupBy.GroupedOnce])).toBeInTheDocument(),
    );
    await user.click(screen.getByText(GROUP_BY_LABELS[GroupBy.GroupedOnce]));
    expect(currentGroupBy).toBe(GroupBy.GroupedOnce);
    expect(localStorage.getItem("group-by")).toBe(JSON.stringify(GroupBy.GroupedOnce));
  });

  it("restores a persisted selection on mount", async () => {
    localStorage.setItem("group-by", JSON.stringify(GroupBy.GroupedRepeat));
    render(<TestWrapper />);
    await waitFor(() => expect(currentGroupBy).toBe(GroupBy.GroupedRepeat));
  });
});

describe("GroupBy helpers", () => {
  it("isGrouped is false only for Ungrouped", () => {
    expect(isGrouped(GroupBy.Ungrouped)).toBe(false);
    expect(isGrouped(GroupBy.GroupedOnce)).toBe(true);
    expect(isGrouped(GroupBy.GroupedRepeat)).toBe(true);
  });

  it("groupsWithDuplicates is true only for GroupedRepeat", () => {
    expect(groupsWithDuplicates(GroupBy.Ungrouped)).toBe(false);
    expect(groupsWithDuplicates(GroupBy.GroupedOnce)).toBe(false);
    expect(groupsWithDuplicates(GroupBy.GroupedRepeat)).toBe(true);
  });
});
