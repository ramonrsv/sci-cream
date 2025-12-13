import { CompKey, PropKey } from "@workspace/sci-cream";
import { getWasmEnums } from "../util";

// @todo For some reason `getWasmEnums(CompKey)` seems to still trip up the code analysis,
// so for now implement this helper function which seems to be well understood by the analyzer.
export function getCompKeys(): CompKey[] {
  return getWasmEnums(CompKey).map((e) => e as unknown as CompKey);
}

// @todo For some reason `getWasmEnums(PropKey)` seems to still trip up the code analysis,
// so for now implement this helper function which seems to be well understood by the analyzer.
export function getPropKeys(): PropKey[] {
  return getWasmEnums(PropKey).map((e) => e as unknown as PropKey);
}
