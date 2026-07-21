"use client";

import { useMemo } from "react";

import {
  allSpecEntries,
  Ingredient,
  IngredientSpecJson,
  SpecEntryJson,
  isSpecEntryAlias,
  specEntryName,
} from "@workspace/sci-cream";

import { EntitySearch, Tagged } from "@/app/_components/entity-search";
import { DetailPanelHeader } from "@/app/_components/detail-panel";
import { CompositionView } from "@/app/_elements/tables/composition";
import { ToolbarSpacer } from "@/app/_elements/selects/toolbar-spacer";
import { STD_COMPONENT_H_PX } from "@/lib/styles/sizes";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { useFreeOnReplace, useSeededWasmResources } from "@/lib/resources/wasm";
import { STATE_VAL } from "@/lib/util";
import { autoLink } from "@/app/_elements/text";

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
 * Pretty-print an entry as JSON, omitting the EntitySearch `_source` tag and the `comments` field
 * from the spec — the full text is rendered separately under the spec via {@link autoLink}.
 */
function stringifyEntry(entry: Tagged<SpecEntryJson>): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _source, comments, ...display } = entry as Tagged<SpecEntryJson> & { comments?: unknown };
  return JSON.stringify(display, null, 2);
}

/** Detail-panel body for an ingredient: JSON spec + resolved composition side-by-side */
function IngredientDetailBody({ entry }: { entry: Tagged<SpecEntryJson> }) {
  const { wasmBridge, updateIdx: wasmUpdateIdx } = useSeededWasmResources()[STATE_VAL];

  const ingredient = useMemo<Ingredient | undefined>(() => {
    const name = specEntryName(entry);
    return wasmBridge.has_ingredient(name) ? wasmBridge.get_ingredient_by_name(name) : undefined;
  }, [entry, wasmUpdateIdx, wasmBridge]); // eslint-disable-line react-hooks/exhaustive-deps

  // Free the prior `Ingredient` once a new entry replaces it, never the live one still read by
  // `ingredient.composition` below (see `useFreeOnReplace` for why an effect cleanup is unsafe).
  useFreeOnReplace(ingredient);

  return (
    <div className="@container flex flex-wrap items-start gap-6">
      <div className="min-w-50 flex-1 basis-65">
        {/* Reserve the adjacent view's toolbar height so the JSON spec lines up with it. */}
        <div className="hidden @[484px]:block">
          <ToolbarSpacer />
        </div>
        <pre className="code-block">{stringifyEntry(entry)}</pre>
      </div>
      <div
        className="max-w-65 min-w-50 flex-1 basis-35"
        style={{ height: `${STD_COMPONENT_H_PX}px` }}
      >
        {ingredient ? (
          <CompositionView
            composition={ingredient.composition}
            persistKey={STORAGE_KEYS.ingredientSearchCompositionView}
          />
        ) : (
          <p className="text-secondary text-sm">No composition available.</p>
        )}
      </div>
    </div>
  );
}

/** Full detail panel for an ingredient: header (with category/alias meta) + body + comments */
function IngredientDetailPanel({ entry }: { entry: Tagged<SpecEntryJson> }) {
  const isAlias = isSpecEntryAlias(entry);
  const category = isAlias ? aliasTargetCategory(entry.for) : entry.category;
  const comments = getEntryComments(entry);

  return (
    <>
      <DetailPanelHeader
        title={specEntryName(entry)}
        source={entry._source}
        meta={
          <>
            {category && <span className="meta-tag">{category}</span>}
            {isAlias && <span className="meta-tag">Alias</span>}
          </>
        }
      />
      <IngredientDetailBody entry={entry} />
      {comments && <p className="text-secondary text-sm leading-relaxed">{autoLink(comments)}</p>}
    </>
  );
}

/**
 * Searchable list of ingredients from the embedded sci-cream dataset and an optional collection
 * of user-saved specs. Built-in entries include aliases; saved entries are independent specs only.
 * Clicking an entry opens its raw JSON spec alongside its resolved composition in a side panel.
 */
export function IngredientSearch({ savedSpecs = [] }: IngredientSearchProps) {
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
      renderDetailPanel={(entry) => <IngredientDetailPanel entry={entry} />}
    />
  );
}
