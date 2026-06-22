import { expect, test } from "vitest";

import { getDisplayHierarchy, groupEnabledKeys, type HierarchyTree } from "./hierarchy";
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

test("getDisplayHierarchy returns nested trees with roll-ups containing their parts", () => {
  const forest = getDisplayHierarchy();

  // TotalSolids ▸ TotalFats ▸ MilkFat nests as a chain.
  const totalSolids = forest.find((root) => root.key === "TotalSolids");
  expect(totalSolids).toBeDefined();
  expect(childKeys(totalSolids)).toContain("TotalFats");

  const totalFats = findNode(forest, "TotalFats");
  expect(childKeys(totalFats)).toContain("MilkFat");
  expect(findNode(forest, "MilkFat")?.children).toHaveLength(0); // leaf
});

test("getDisplayHierarchy returns every tree in the forest, sharing keys faithfully", () => {
  const forest = getDisplayHierarchy();

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

  // Source-axis first: MilkFat's first occurrence is under MilkSolids, so it precedes TotalFats.
  const order = grouped.map((g) => g.key);
  expect(order.indexOf("MilkFat")).toBeLessThan(order.indexOf("TotalFats"));

  // Energy is the first hierarchy root, so it leads the grouped output.
  expect(grouped[0]).toEqual({ key: "Energy", depth: 0, isRollup: false });
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
  // The milk chain MilkSolids ▸ MSNF ▸ MilkSNFS ▸ MilkProteins is unambiguous (no source/total
  // duplication). With MSNF enabled but MilkSNFS not, MilkProteins indents only two levels.
  // MilkProteins is itself a roll-up (it splits into casein and whey), so isRollup is true.
  const withIntermediate = groupEnabledKeys(["MilkSolids", "MSNF", "MilkProteins"]);
  expect(withIntermediate).toEqual([
    { key: "MilkSolids", depth: 0, isRollup: true },
    { key: "MSNF", depth: 1, isRollup: true },
    { key: "MilkProteins", depth: 2, isRollup: true },
  ]);

  const withoutIntermediate = groupEnabledKeys(["MilkSolids", "MilkProteins"]);
  expect(withoutIntermediate).toEqual([
    { key: "MilkSolids", depth: 0, isRollup: true },
    { key: "MilkProteins", depth: 1, isRollup: true },
  ]);
});
