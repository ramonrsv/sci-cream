import { PropKey, isFpdKey, getPropKeys } from "./prop-key";

/**
 * Represents the priority levels for balancing recipe properties
 *
 * This mirrors the `Priority` enum in Rust with string values to allow it to be deserialized in
 * the same manner as the `PropKey` and `BalanceKey` enums, which also use string values in TS.
 */
export enum Priority {
  Normal = "Normal",
  High = "High",
  Critical = "Critical",
}

/** Returns all `PropKey`s that are balanceable, currently all except `FpdKey`s */
export function getBalanceableKeys(): PropKey[] {
  return getPropKeys().filter((key) => !isFpdKey(key)) as PropKey[];
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
