import { describe, it, expect } from "vitest";

import { GroupBy, groupsWithDuplicates, isGroupBy, isGrouped } from "./group-by";

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

describe("isGroupBy", () => {
  it("accepts every GroupBy enum value", () => {
    for (const value of Object.values(GroupBy)) {
      expect(isGroupBy(value)).toBe(true);
    }
  });

  it("rejects values that are not a GroupBy", () => {
    // Guards persisted localStorage, so a stale or tampered value must not restore.
    expect(isGroupBy("Grouped")).toBe(false);
    expect(isGroupBy("ungrouped")).toBe(false);
    expect(isGroupBy(undefined)).toBe(false);
    expect(isGroupBy(null)).toBe(false);
    expect(isGroupBy(0)).toBe(false);
    expect(isGroupBy({})).toBe(false);
  });
});
