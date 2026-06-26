import { CompKey, FpdKey } from "../../wasm/index";

import { PropKey, compToPropKey, fpdToPropKey } from "./prop-key";

/**
 * Return the acceptable `{ min, max }` range for a property key, or `undefined` if none is defined.
 *
 * @todo These ranges are temporary placeholders for the app's "acceptable range" feature; it
 * should eventually be replaced with a more robust solution fed from the Rust side of the package.
 */
export function getAcceptablePropertyRange(
  prop_key: PropKey,
): { min: number; max: number } | undefined {
  switch (prop_key) {
    case compToPropKey(CompKey.MSNF):
      return { min: 5, max: 15 };
    case compToPropKey(CompKey.TotalSolids):
      return { min: 30, max: 43 };
    case fpdToPropKey(FpdKey.ServingTemp):
      return { min: -18, max: -10 };
    default:
      return undefined;
  }
}
