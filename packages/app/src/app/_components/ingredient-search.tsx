"use client";

import { useEffect, useMemo } from "react";

import {
  allSpecEntries,
  Ingredient,
  IngredientSpecJson,
  SpecEntryJson,
  Bridge as WasmBridge,
  isSpecEntryAlias,
  specEntryName,
} from "@workspace/sci-cream";

import { EntitySearch, Tagged } from "@/app/_components/entity-search";
import { CompositionView } from "@/app/_elements/tables/composition";
import { STD_COMPONENT_H_PX } from "@/lib/styles/sizes";
import { useSeededWasmResources } from "@/lib/wasm-resources";
import { STATE_VAL } from "@/lib/util";

/** Props for {@link IngredientSearch} */
export interface IngredientSearchProps {
  /** User-saved ingredient specs from an external source such as a database */
  savedSpecs?: IngredientSpecJson[];
}

/** Case-insensitive match against name and, for aliases, the target name; otherwise category */
export function ingredientMatchesQuery(entry: SpecEntryJson, q: string): boolean {
  if (specEntryName(entry).toLowerCase().includes(q)) return true;
  if (isSpecEntryAlias(entry)) return entry.for.toLowerCase().includes(q);
  return entry.category.toLowerCase().includes(q);
}

/** Resolve an alias's target category from the embedded data, or `undefined` if not found */
function aliasTargetCategory(target: string): string | undefined {
  for (const e of allSpecEntries) {
    if (!isSpecEntryAlias(e) && e.name === target) return e.category;
  }
  return undefined;
}

/** Extract a non-empty `comments` string from an entry, or `undefined` if absent/empty */
function getEntryComments(entry: SpecEntryJson): string | undefined {
  const c = (entry as Record<string, unknown>).comments;
  return typeof c === "string" && c.length > 0 ? c : undefined;
}

/**
 * Pretty-print an entry as JSON, omitting the EntitySearch `_source` tag. When the entry has a
 * non-empty `comments` field, the value is redacted to `"..."` in the JSON — the full text is
 * rendered separately under the spec by the EntitySearch shell via {@link autoLink}.
 */
function stringifyEntry(entry: Tagged<SpecEntryJson>): string {
  const { _source, ...spec } = entry; // eslint-disable-line @typescript-eslint/no-unused-vars
  const display: Record<string, unknown> =
    getEntryComments(entry) !== undefined ? { ...spec, comments: "..." } : spec;
  return JSON.stringify(display, null, 2);
}

/** Detail-panel body for an ingredient: JSON spec + resolved composition side-by-side */
function IngredientDetailBody({
  entry,
  bridge,
}: {
  entry: Tagged<SpecEntryJson>;
  bridge: WasmBridge;
}) {
  const { updateIdx: wasmUpdateIdx } = useSeededWasmResources()[STATE_VAL];

  const ingredient = useMemo<Ingredient | undefined>(() => {
    const name = specEntryName(entry);
    return bridge.has_ingredient(name) ? bridge.get_ingredient_by_name(name) : undefined;
  }, [entry, wasmUpdateIdx, bridge]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      try {
        ingredient?.free();
      } catch {
        // React Strict Mode fires effect cleanups twice (mount → cleanup → remount), so the first
        // cleanup frees the object and the second would double-free. Safe to swallow in production.
      }
    },
    [ingredient],
  );

  return (
    <div className="@container flex flex-wrap items-start gap-6">
      <div className="min-w-50 flex-1 basis-65">
        <pre className="code-block @[484px]:mt-8.25">{stringifyEntry(entry)}</pre>
      </div>
      <div
        className="max-w-65 min-w-50 flex-1 basis-35"
        style={{ height: `${STD_COMPONENT_H_PX}px` }}
      >
        {ingredient ? (
          <CompositionView composition={ingredient.composition} />
        ) : (
          <p className="text-secondary text-sm">No composition available.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Searchable list of ingredients from the embedded sci-cream dataset and an optional collection
 * of user-saved specs. Built-in entries include aliases; saved entries are independent specs only.
 * Clicking an entry opens its raw JSON spec alongside its resolved composition in a side panel.
 */
export function IngredientSearch({ savedSpecs = [] }: IngredientSearchProps) {
  const { wasmBridge } = useSeededWasmResources()[STATE_VAL];

  /**
   * Subtitle line under each list-item title: the entry's category for specs, the resolved
   * target's category plus an "Alias" badge for aliases. Truncates the category text on overflow
   * while keeping the badge visible.
   */
  const renderListItemSubtitle = (entry: Tagged<SpecEntryJson>) => {
    const isAlias = isSpecEntryAlias(entry);
    const category = isAlias ? aliasTargetCategory(entry.for) : entry.category;
    return (
      <span className="text-secondary flex min-w-0 items-center gap-1 text-xs">
        {category && <span className="truncate">{category}</span>}
        {isAlias && <span className="meta-tag shrink-0">Alias</span>}
      </span>
    );
  };

  /** Header badges: category meta-tag (resolved for aliases) plus an "Alias" badge for aliases */
  const renderHeaderMeta = (entry: Tagged<SpecEntryJson>) => {
    const isAlias = isSpecEntryAlias(entry);
    const category = isAlias ? aliasTargetCategory(entry.for) : entry.category;
    return (
      <>
        {category && <span className="meta-tag">{category}</span>}
        {isAlias && <span className="meta-tag">Alias</span>}
      </>
    );
  };

  return (
    <EntitySearch<SpecEntryJson>
      id="ingredient-search"
      embeddedEntries={allSpecEntries}
      savedEntries={savedSpecs}
      getId={specEntryName}
      matchesQuery={ingredientMatchesQuery}
      searchPlaceholder="Search by name or category…"
      emptyDetailText="Select an ingredient to see details"
      emptyResultsText="No ingredients found."
      renderListItemSubtitle={renderListItemSubtitle}
      renderHeaderMeta={renderHeaderMeta}
      renderDetailBody={(entry) => <IngredientDetailBody entry={entry} bridge={wasmBridge} />}
      getComments={getEntryComments}
    />
  );
}
