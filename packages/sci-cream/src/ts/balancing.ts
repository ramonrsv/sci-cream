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

/** A target value is not finite (`NaN` or infinite), which would poison the solve. */
export type NonFiniteTargetError = { NonFiniteTarget: { key: PropKey; value: number } };

/** A target value is negative. Every balanceable key is >= 0, so a target `< 0` is unreachable. */
export type NegativeTargetError = { NegativeTarget: { key: PropKey; value: number } };

/** The same key appears more than once in the targets, which is contradictory or ambiguous. */
export type DuplicateTargetError = { DuplicateTarget: { key: PropKey } };

/** The same key appears more than once in the priorities, which is contradictory or ambiguous. */
export type DuplicatePriorityError = { DuplicatePriority: { key: PropKey } };

/**
 * No composition in the palette contributes to this key (its row is entirely zero), so no
 * combination can move it away from zero.
 */
export type UnaffectableTargetWarning = { UnaffectableTarget: { key: PropKey } };

/**
 * The target lies outside the `[min, max]` range achievable from the palette, so no normalized
 * (non-negative, summing to one) combination can reach it.
 */
export type UnreachableTargetWarning = {
  UnreachableTarget: { key: PropKey; target: number; min: number; max: number };
};

/**
 * Two targets are infeasible together: every composition has `lesser <= greater` for these keys,
 * yet `lesser`'s target exceeds `greater`'s, so no non-negative combination can satisfy both.
 * Derived from the palette, with no hardcoded key relationships.
 */
export type DominanceViolationWarning = {
  DominanceViolation: {
    lesser: PropKey;
    greater: PropKey;
    lesser_target: number;
    greater_target: number;
  };
};

/**
 * Several targets are infeasible together: their compositions sum to no more than a "whole" key's
 * composition in every ingredient, yet their targets sum above the whole's target, so no
 * non-negative combination can satisfy them all. The additive (subset-sum) generalization of
 * [`DominanceViolation`](Self::DominanceViolation) — which is the single-part case.
 * Palette-derived, with no hardcoded key relationships.
 */
export type AdditiveDominanceViolationWarning = {
  AdditiveDominanceViolation: {
    whole: PropKey;
    parts: PropKey[];
    parts_target_sum: number;
    whole_target: number;
  };
};

/**
 * A priority was set for a key that is not among the targets, so it has no effect — the solver only
 * weights target rows. Likely a mistake: a forgotten target or a mistyped key.
 */
export type PriorityWithoutTargetWarning = { PriorityWithoutTarget: { key: PropKey } };

/**
 * A single issue detected in a set of balancing inputs by `validate_recipe_targets`.
 *
 * Mirrors the `BalancingIssue` Rust enum. Use the individual variant types above (e.g.
 * {@link NonFiniteTargetError}) when you need to narrow to a specific variant.
 */
export type BalancingIssue =
  | NonFiniteTargetError
  | NegativeTargetError
  | DuplicateTargetError
  | DuplicatePriorityError
  | UnaffectableTargetWarning
  | UnreachableTargetWarning
  | DominanceViolationWarning
  | AdditiveDominanceViolationWarning
  | PriorityWithoutTargetWarning;

/** The result of `validate_recipe_targets`: all detected issues (errors and warnings). */
export interface BalancingReport {
  issues: BalancingIssue[];
}

/** Returns the error-severity issues from a `BalancingReport`. */
export function getBalancingErrors(report: BalancingReport): BalancingIssue[] {
  return report.issues.filter(
    (issue) =>
      "NonFiniteTarget" in issue ||
      "NegativeTarget" in issue ||
      "DuplicateTarget" in issue ||
      "DuplicatePriority" in issue,
  );
}

/** Returns the warning-severity issues from a `BalancingReport`. */
export function getBalancingWarnings(report: BalancingReport): BalancingIssue[] {
  return report.issues.filter(
    (issue) =>
      "UnaffectableTarget" in issue ||
      "UnreachableTarget" in issue ||
      "DominanceViolation" in issue ||
      "AdditiveDominanceViolation" in issue ||
      "PriorityWithoutTarget" in issue,
  );
}
