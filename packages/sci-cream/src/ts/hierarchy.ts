import { comp_hierarchy } from "../../wasm/index";

import { PropKey } from "./prop-key";

/** A node in the composition's part/whole hierarchy forest. */
export interface HierarchyTree {
  /** The property key at this node. */
  key: PropKey;
  /** This key's direct parts, nested as their own subtrees. Empty for a leaf. */
  children: HierarchyTree[];
}

/**
 * Returns the whole composition hierarchy as a forest of nested {@link HierarchyTree}s, in one WASM
 * call. Faithful to the underlying DAG — a key shared by several roll-ups appears under each — so
 * choosing how to display it (one tree, another, or both) is the caller's job.
 */
export function getCompHierarchy(): HierarchyTree[] {
  return comp_hierarchy() as HierarchyTree[];
}

/** An enabled key placed in hierarchy display order, carrying its (enabled-relative) depth. */
export interface OrderedKey {
  /** The property key. */
  key: PropKey;
  /** Indentation depth, counting only enabled ancestors so nesting stays contiguous. */
  depth: number;
  /** Whether this key is a roll-up (has parts in the hierarchy) — a group-heading row. */
  isRollup: boolean;
}

/** Options controlling how {@link groupEnabledKeys} projects the DAG forest to a flat list. */
export interface GroupOptions {
  /**
   * Whether a key shared by several roll-ups is emitted under each (may appear more than once).
   * When `false` (default), only its first occurrence is kept, so every input key appears once.
   */
  duplicates?: boolean;
}

/**
 * Reorders `enabledKeys` into hierarchy display order, indenting each by its enabled-ancestor depth
 *
 * Emits enabled keys in forest pre-order (each roll-up before its descendants); shared keys
 * collapse to their first occurrence unless {@link GroupOptions.duplicates} is set. Keys absent
 * from the hierarchy keep their original order, appended at depth `0` — the trailing "other"s.
 */
export function groupEnabledKeys(
  enabledKeys: PropKey[],
  { duplicates = false }: GroupOptions = {},
): OrderedKey[] {
  const enabledSet = new Set(enabledKeys);
  const emitted = new Set<PropKey>();
  const ordered: OrderedKey[] = [];

  const walk = (node: HierarchyTree, depth: number): void => {
    const enabled = enabledSet.has(node.key);
    if (enabled && (duplicates || !emitted.has(node.key))) {
      ordered.push({ key: node.key, depth, isRollup: node.children.length > 0 });
      emitted.add(node.key);
    }
    const childDepth = enabled ? depth + 1 : depth;
    for (const child of node.children) walk(child, childDepth);
  };

  for (const root of getCompHierarchy()) walk(root, 0);

  const ungrouped: OrderedKey[] = enabledKeys
    .filter((key) => !emitted.has(key))
    .map((key) => ({ key, depth: 0, isRollup: false }));

  return [...ordered, ...ungrouped];
}
