import { FlatHeader } from "@workspace/sci-cream";
import { getWasmEnums } from "../util";

// @todo For some reason `getWasmEnums(FlatHeader)` seems to still trip up the code analysis,
// so for now implement this helper function which seems to be well understood by the analyzer.
export function getFlatHeaders(): FlatHeader[] {
  return getWasmEnums(FlatHeader).map((e) => e as unknown as FlatHeader);
}
