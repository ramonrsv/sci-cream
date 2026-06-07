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
