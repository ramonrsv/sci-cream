// Generated from the `data/ingredients/*.md` sources by `scripts/gen-data.ts` (`pnpm gen:data`).
// These carry `comments` and file intros with footnote definitions inline; do not edit by hand.
import alcoholJson from "../../data/ingredients/generated/full/alcohol.json";
import chocolatesJson from "../../data/ingredients/generated/full/chocolates.json";
import dairyJson from "../../data/ingredients/generated/full/dairy.json";
import eggsJson from "../../data/ingredients/generated/full/eggs.json";
import emulsifiersJson from "../../data/ingredients/generated/full/emulsifiers.json";
import flavouringsJson from "../../data/ingredients/generated/full/flavourings.json";
import fruitsJson from "../../data/ingredients/generated/full/fruits.json";
import miscellaneousJson from "../../data/ingredients/generated/full/miscellaneous.json";
import nutsJson from "../../data/ingredients/generated/full/nuts.json";
import stabilizersJson from "../../data/ingredients/generated/full/stabilizers.json";
import sweetenersJson from "../../data/ingredients/generated/full/sweeteners.json";

import introsJson from "../../data/ingredients/generated/full/intros.json";

export type IngredientSpecJson = { name: string; category: string; [key: string]: unknown };
export type AliasSpecJson = { alias: string; for: string };
export type SpecEntryJson = IngredientSpecJson | AliasSpecJson;

/** A data file's intro: the file's title, and markdown notes on every entry it defines. */
export type DataFileIntro = { title: string; text: string };

/** Merges multiple spec entry lists into a single flat array. */
function flattenLists(jsonLists: SpecEntryJson[][]): SpecEntryJson[] {
  return jsonLists.reduce((acc, list) => acc.concat(list), []);
}

/** Each ingredient category JSON file's entries, by the file's name, as `intros.json` keys it. */
const ENTRIES_BY_FILE: Record<string, SpecEntryJson[]> = {
  alcohol: alcoholJson,
  chocolates: chocolatesJson,
  dairy: dairyJson,
  eggs: eggsJson,
  emulsifiers: emulsifiersJson,
  flavourings: flavouringsJson,
  fruits: fruitsJson,
  miscellaneous: miscellaneousJson,
  nuts: nutsJson,
  stabilizers: stabilizersJson,
  sweeteners: sweetenersJson,
};

/** All built-in spec entries aggregated from every ingredient category JSON file. */
export const allSpecEntries = flattenLists(Object.values(ENTRIES_BY_FILE));

/** Each entry's file intro, by entry name, for the files that have one. */
const INTRO_BY_ENTRY = new Map(
  Object.entries(ENTRIES_BY_FILE).flatMap(([file, entries]) => {
    const intro = (introsJson as Record<string, DataFileIntro | undefined>)[file];
    if (intro === undefined) return [];
    return entries.map((entry) => [specEntryName(entry), intro] as const);
  }),
);

/** The intro of the data file that defines `entry`, or `undefined` if that file has none. */
export function specEntryIntro(entry: SpecEntryJson): DataFileIntro | undefined {
  return INTRO_BY_ENTRY.get(specEntryName(entry));
}

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
