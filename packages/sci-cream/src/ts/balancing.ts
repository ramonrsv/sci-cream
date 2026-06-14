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

/** A set of [PropKey, number] tuples representing the target values for balancing. */
export type BalanceTargets = [PropKey, number][];

/** A set of [PropKey, Priority] tuples representing the priority levels for balancing. */
export type BalancePriorities = [PropKey, Priority][];

/** Returns all keys from `get_all_balanceable_keys` as `PropKey`s */
export function getAllBalanceableKeys(): PropKey[] {
  return get_all_balanceable_keys() as PropKey[];
}

/** Returns all keys from `get_typical_balancing_keys` as `PropKey`s */
export function getTypicalBalancingKeys(): PropKey[] {
  return get_typical_balancing_keys() as PropKey[];
}

/** Severity of a balancing issue: `error` blocks balancing, `warning` is advisory only. */
export type IssueSeverity = "error" | "warning";

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
