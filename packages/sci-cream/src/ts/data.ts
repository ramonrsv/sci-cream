import dairyJson from "../../data/ingredients/dairy.json";
import sweetenersJson from "../../data/ingredients/sweeteners.json";
import fruitsJson from "../../data/ingredients/fruits.json";
import chocolatesJson from "../../data/ingredients/chocolates.json";
import nutsJson from "../../data/ingredients/nuts.json";
import eggsJson from "../../data/ingredients/eggs.json";
import alcoholJson from "../../data/ingredients/alcohol.json";
import microsJson from "../../data/ingredients/micros.json";
import miscellaneousJson from "../../data/ingredients/miscellaneous.json";

export type IngredientSpecJson = { name: string; category: string; [key: string]: unknown };
export type AliasSpecJson = { alias: string; for: string };
export type SpecEntryJson = IngredientSpecJson | AliasSpecJson;

/** Merges multiple spec entry lists into a single flat array. */
function flattenLists(jsonLists: SpecEntryJson[][]): SpecEntryJson[] {
  return jsonLists.reduce((acc, list) => acc.concat(list), []);
}

/** All built-in spec entries aggregated from every ingredient category JSON file. */
export const allSpecEntries = flattenLists([
  dairyJson,
  sweetenersJson,
  fruitsJson,
  chocolatesJson,
  nutsJson,
  eggsJson,
  alcoholJson,
  microsJson,
  miscellaneousJson,
]);

/** Returns the name of a spec entry, whether it's an ingredient or an alias. */
export function specEntryName(entry: SpecEntryJson): string {
  if ("name" in entry) {
    return entry.name;
  } else if ("alias" in entry) {
    return entry.alias;
  } else {
    throw new Error(`Invalid spec entry: ${JSON.stringify(entry)}`);
  }
}

/** Utility to determine if a spec entry is an `AliasSpec`. */
export function isSpecEntryAlias(entry: SpecEntryJson): entry is AliasSpecJson {
  return "alias" in entry;
}

/** Utility to determine if a spec entry is independent, i.e. not an `AliasSpec`/`CompositeSpec`. */
export function isSpecEntryIndependent(entry: SpecEntryJson): entry is IngredientSpecJson {
  return "name" in entry && !isSpecEntryAlias(entry) && !("CompositeSpec" in entry);
}

/** Returns all non-alias ingredient specs, i.e. those that are not `AliasSpec`. */
export function getNonAliasIngredientSpecs(): IngredientSpecJson[] {
  return allSpecEntries.filter((e) => !isSpecEntryAlias(e)) as IngredientSpecJson[];
}

/** Returns all independent ingredient specs, i.e. those that are not aliases or composites. */
export function getIndependentIngredientSpecs(): IngredientSpecJson[] {
  return allSpecEntries.filter(isSpecEntryIndependent);
}

/** Returns the spec entry matching the given name, or throws if not found. */
export function getSpecEntryByName(name: string) {
  return (
    allSpecEntries.find((entry) => specEntryName(entry) === name) ??
    (() => {
      throw new Error(`Spec entry not found for name: ${name}`);
    })()
  );
}

/** Returns the independent spec matching the given name, or throws if not found/independent. */
export function getIndependentIngredientSpecByName(name: string) {
  const spec = getSpecEntryByName(name);
  if (isSpecEntryIndependent(spec)) {
    return spec;
  } else {
    throw new Error(`Spec entry with name "${name}" is not an independent ingredient spec`);
  }
}
