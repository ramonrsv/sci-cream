import { get_all_balanceable_keys, get_typical_balancing_keys } from "../../wasm/index";

import { PropKey } from "./prop-key";

/**
 * Represents the priority levels for balancing recipe properties
 *
 * This mirrors the `Priority` enum in Rust with string values to allow it to be deserialized in
 * the same manner as the `PropKey` and `BalanceKey` enums, which also use string values in TS.
 */
export enum Priority {
  Low = "Low",
  Normal = "Normal",
  High = "High",
  Critical = "Critical",
}

/**
 * A set of balancing targets: `[PropKey, value, Priority?]` tuples. The third target is an optional
 * balancing relative priority; omit it (or pass `Priority.Normal`) for the unprioritized default.
 */
export type BalanceTargets = [PropKey, number, Priority?][];

/**
 * How a locked recipe line is pinned, mirroring the Rust `Lock` enum: `{ Fraction }` holds it at
 * that fraction of the resulting mix (concentration-preserving), `{ Amount }` at that many grams.
 */
export type Lock = { Fraction: number } | { Amount: number };

/**
 * Balancing locks: `[lineIndex, Lock]` pairs pinning lines while the rest balance around them (a
 * locked line still counts toward the targets). For `balance_recipe` / `validate_recipe_targets`.
 */
export type BalanceLocks = [number, Lock][];

/** Returns all keys from `get_all_balanceable_keys` as `PropKey`s */
export function getAllBalanceableKeys(): PropKey[] {
  return get_all_balanceable_keys() as PropKey[];
}

/** Returns all keys from `get_typical_balancing_keys` as `PropKey`s */
export function getTypicalBalancingKeys(): PropKey[] {
  return get_typical_balancing_keys() as PropKey[];
}

const ALL_BALANCEABLE_KEYS: ReadonlySet<PropKey> = new Set(getAllBalanceableKeys());

/** Returns whether a given `PropKey` is balanceable. */
export function isBalanceableKey(prop_key: PropKey): boolean {
  return ALL_BALANCEABLE_KEYS.has(prop_key);
}

/**
 * Severity of a balancing issue: `error` blocks balancing, `warning` is a best-effort caution, and
 * `information` is a purely advisory note (e.g. over-determination) that never blocks the solve.
 */
export type IssueSeverity = "error" | "warning" | "information";

/**
 * A single issue detected by `validate_recipe_targets`, flattened for rendering.
 *
 * This is the JS-facing view of the Rust `BalancingIssue` enum: rather than mirroring every variant
 * in TypeScript, the WASM boundary returns each issue's `severity`, the `PropKey`s it concerns, and
 * a human-readable `message` (from the Rust `Display` impl). New issue kinds therefore need no
 * TypeScript changes — they surface here automatically.
 */
export interface BalancingIssueView {
  severity: IssueSeverity;
  keys: PropKey[];
  message: string;
}

/** The result of `validate_recipe_targets`: all detected issues (errors and warnings). */
export interface BalancingReport {
  issues: BalancingIssueView[];
}
