import { expect, test } from "vitest";

import { getCompHierarchy, groupEnabledKeys, type HierarchyTree } from "./hierarchy";
import { PropKey } from "./prop-key";

/** Depth-first search for the first node with `key` anywhere in `forest`. */
function findNode(forest: HierarchyTree[], key: PropKey): HierarchyTree | undefined {
  for (const node of forest) {
    if (node.key === key) return node;
    const found = findNode(node.children, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Keys of a node's direct children. */
function childKeys(node: HierarchyTree | undefined): PropKey[] {
  return node?.children.map((child) => child.key) ?? [];
}

test("getCompHierarchy returns nested trees with roll-ups containing their parts", () => {
  const forest = getCompHierarchy();

  // TotalSolids ▸ TotalFats ▸ MilkFat nests as a chain.
  const totalSolids = forest.find((root) => root.key === "TotalSolids");
  expect(totalSolids).toBeDefined();
  expect(childKeys(totalSolids)).toContain("TotalFats");

  const totalFats = findNode(forest, "TotalFats");
  expect(childKeys(totalFats)).toContain("MilkFat");
  expect(findNode(forest, "MilkFat")?.children).toHaveLength(0); // leaf
});

test("getCompHierarchy returns every tree in the forest, sharing keys faithfully", () => {
  const forest = getCompHierarchy();

  // The source roll-ups are their own roots alongside the macronutrient trees.
  const milkSolids = forest.find((root) => root.key === "MilkSolids");
  expect(milkSolids).toBeDefined();
  expect(childKeys(milkSolids)).toContain("MilkFat");

  // MilkFat is shared: it appears under both TotalFats and MilkSolids (the DAG is preserved).
  expect(childKeys(findNode(forest, "TotalFats"))).toContain("MilkFat");
});

test("groupEnabledKeys reorders into hierarchy order and keeps every key exactly once", () => {
  const enabled: PropKey[] = ["MilkFat", "TotalSugars", "TotalFats", "Energy"];
  const grouped = groupEnabledKeys(enabled);

  // Same multiset of keys — grouping never adds or drops keys.
  expect(new Set(grouped.map((g) => g.key))).toEqual(new Set(enabled));
  expect(grouped).toHaveLength(enabled.length);

  // TotalFats precedes its child MilkFat after reordering.
  const order = grouped.map((g) => g.key);
  expect(order.indexOf("TotalFats")).toBeLessThan(order.indexOf("MilkFat"));

  // Energy does not participate in the hierarchy: trailing "other" bucket at depth 0.
  expect(grouped[grouped.length - 1]).toEqual({ key: "Energy", depth: 0, isRollup: false });
});

test("groupEnabledKeys repeats a shared key under each enabled roll-up when asked", () => {
  // MilkFat sits under both TotalFats and MilkSolids; enable all three.
  const enabled: PropKey[] = ["TotalFats", "MilkSolids", "MilkFat"];

  // Default: first occurrence only — MilkFat appears once.
  expect(groupEnabledKeys(enabled).filter((o) => o.key === "MilkFat")).toHaveLength(1);

  // duplicates: emitted under each enabled roll-up — MilkFat appears twice.
  const duplicated = groupEnabledKeys(enabled, { duplicates: true });
  expect(duplicated.filter((o) => o.key === "MilkFat")).toHaveLength(2);
});

test("groupEnabledKeys depth counts only enabled ancestors", () => {
  // TotalSolids enabled but TotalFats not: MilkFat indents one level (under TotalSolids only).
  const withIntermediate = groupEnabledKeys(["TotalSolids", "TotalFats", "MilkFat"]);
  expect(withIntermediate).toEqual([
    { key: "TotalSolids", depth: 0, isRollup: true },
    { key: "TotalFats", depth: 1, isRollup: true },
    { key: "MilkFat", depth: 2, isRollup: false },
  ]);

  const withoutIntermediate = groupEnabledKeys(["TotalSolids", "MilkFat"]);
  expect(withoutIntermediate).toEqual([
    { key: "TotalSolids", depth: 0, isRollup: true },
    { key: "MilkFat", depth: 1, isRollup: false },
  ]);
});
