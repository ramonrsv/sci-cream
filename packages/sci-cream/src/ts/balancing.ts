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
