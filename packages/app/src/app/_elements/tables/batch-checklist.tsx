"use client";

import { Check } from "lucide-react";

import {
  type Batch,
  type MergedRow,
  batchRecipeColor,
  batchRecipeLetter,
  cellKey,
  displayVersion,
  mergeBatchRows,
} from "@/lib/batch/batch";
import { VersionBadge } from "@/app/_elements/version-badge";
import { type CategoryColor, categoryColorInk } from "@/lib/styles/colors";

/** An amount as weighed: trailing zeros trimmed, so "300" not "300.000". Unitless — see header. */
function formatAmount(quantity: number): string {
  return String(Number(quantity.toFixed(3)));
}

/** The same amount carrying its unit, for labels read aloud or on hover away from the header. */
function formatGrams(quantity: number): string {
  return `${formatAmount(quantity)} g`;
}

/**
 * Paint one recipe's color onto a chip: the hue as a custom property, plus the ink and the solid
 * class the achromatic colors need. Returned together so the badge and the cell stay in step.
 */
export function categoryChipStyle(color: CategoryColor): {
  className: string;
  style: React.CSSProperties;
} {
  const ink = categoryColorInk(color);
  return {
    className: ink === undefined ? "" : "cat-solid",
    style: {
      "--cat": `var(${color})`,
      ...(ink === undefined ? {} : { "--cat-ink": `var(${ink})` }),
    } as React.CSSProperties,
  };
}

/** Letter chip identifying one recipe, wearing that recipe's color. */
export function RecipeBadge({
  index,
  color,
  title,
}: {
  index: number;
  color: CategoryColor;
  title?: string;
}) {
  const chip = categoryChipStyle(color);
  return (
    <span
      className={`recipe-badge ${chip.className}`}
      style={chip.style}
      title={title}
      data-testid={`recipe-badge-${String(index)}`}
    >
      {batchRecipeLetter(index)}
    </span>
  );
}

/** Legend mapping each badge letter to its recipe name, so the coding is never color-alone. */
export function BatchLegend({ recipes }: { recipes: Batch["recipes"] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="batch-legend">
      {recipes.map((recipe, index) => {
        // Owner-side only: `ref` never rides the link, so a recipient sees no version here
        const version = displayVersion(recipe.ref);
        return (
          <li key={`${String(index)}:${recipe.name}`} className="flex items-center gap-1.5">
            <RecipeBadge index={index} color={batchRecipeColor(recipe, index)} />
            <span className="text-primary text-sm">{recipe.name || "Untitled recipe"}</span>
            {version !== undefined && <VersionBadge version={version} />}
          </li>
        );
      })}
    </ul>
  );
}

/** One (recipe, ingredient) cell: the unit of weighing, and the unit of checkoff. */
function ChecklistCell({
  rowName,
  recipeIndex,
  color,
  quantity,
  checked,
  onToggle,
}: {
  rowName: string;
  recipeIndex: number;
  color: CategoryColor;
  quantity: number;
  checked: boolean;
  onToggle: () => void;
}) {
  // The label carries the unit the cell drops: a button is named by itself, not by its headers.
  const label = `${rowName}, recipe ${batchRecipeLetter(recipeIndex)}: ${formatGrams(quantity)}`;
  const chip = categoryChipStyle(color);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      title={label}
      style={chip.style}
      className={`checklist-cell px-1.5 py-0.5 ${chip.className}`}
      data-testid={`checklist-cell-${String(recipeIndex)}-${rowName}`}
    >
      <span className="comp-val flex-1">{formatAmount(quantity)}</span>
      {/* A glyph, not only a hue shift, so the checked state survives colorblindness and print */}
      <Check
        size={13}
        className={checked ? "text-txt-sec" : "invisible"}
        aria-hidden
        strokeWidth={3}
      />
    </button>
  );
}

/** One merged ingredient: its name, the batch total, and one cell per recipe in the batch. */
function ChecklistRow({
  row,
  recipes,
  isChecked,
  onToggle,
}: {
  row: MergedRow;
  /** The whole batch: a row spans every recipe, not just the ones using this ingredient. */
  recipes: Batch["recipes"];
  isChecked: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const done = row.cells.every((cell) => isChecked(cellKey(row.name, cell.recipeIndex)));
  const cellByRecipe = new Map(row.cells.map((cell) => [cell.recipeIndex, cell]));

  return (
    <tr
      className={`h-6.25 ${done ? "opacity-60" : ""}`}
      data-testid={`checklist-row-${row.name}`}
      data-done={done}
    >
      <td
        className={`table-inner-cell table-pin-cell left-0 max-w-56 min-w-32 truncate px-2 ${
          done ? "line-through" : ""
        }`}
        title={row.name}
      >
        {row.name}
      </td>
      {recipes.length > 1 && (
        <td
          className="table-inner-cell comp-val hidden px-2 sm:table-cell"
          data-testid={`checklist-total-${row.name}`}
        >
          {formatAmount(row.total)}
        </td>
      )}
      {recipes.map((recipe, recipeIndex) => {
        const cell = cellByRecipe.get(recipeIndex);
        const key = cellKey(row.name, recipeIndex);
        return (
          <td key={key} className="table-inner-cell p-0.5">
            {cell !== undefined && (
              <ChecklistCell
                rowName={row.name}
                recipeIndex={recipeIndex}
                color={batchRecipeColor(recipe, recipeIndex)}
                quantity={cell.quantity}
                checked={isChecked(key)}
                onToggle={() => onToggle(key)}
              />
            )}
          </td>
        );
      })}
    </tr>
  );
}

/** Sticky header naming each column: ingredient, batch total, and one badge per recipe. */
function ChecklistHeader({ recipes }: { recipes: Batch["recipes"] }) {
  // A lone recipe needs no letter, and its column is the only place left to carry the unit.
  const single = recipes.length === 1;

  return (
    <thead className="table-sticky-head" data-testid="checklist-header">
      <tr className="h-6.5">
        {/* Frozen on both axes; z-30 to cover header and first column scrolling beneath */}
        <th
          scope="col"
          className="table-col-header border-brd sticky left-0 z-30 min-w-32 border-r px-2"
        >
          Ingredient
        </th>
        {!single && (
          // Hidden where space is tight; `whitespace-nowrap`, or the header wraps the column narrow
          <th
            scope="col"
            className="table-col-header hidden w-15 px-2 whitespace-nowrap sm:table-cell"
          >
            Total (g)
          </th>
        )}
        {recipes.map((recipe, index) => (
          <th
            key={`${String(index)}:${recipe.name}`}
            scope="col"
            className="table-col-header px-1.25"
          >
            {single ? (
              "g"
            ) : (
              <span className="flex justify-center">
                <RecipeBadge
                  index={index}
                  color={batchRecipeColor(recipe, index)}
                  title={recipe.name || "Untitled recipe"}
                />
              </span>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/**
 * Merged weighing checklist: one row per ingredient, a checkable cell per contributing recipe.
 * Presentational — the caller owns checkoff state, so it can be persisted per batch.
 */
export function BatchChecklist({
  batch,
  checked,
  onToggle,
}: {
  batch: Batch;
  checked: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  const rows = mergeBatchRows(batch.recipes);
  const isChecked = (key: string) => checked.has(key);

  if (rows.length === 0) {
    return (
      <p className="text-secondary p-4 text-sm" data-testid="checklist-empty">
        No ingredients to weigh yet. Add a recipe to build the checklist.
      </p>
    );
  }

  return (
    // Height-bounded scroll region freezing header and first column; a lone `overflow-x` unsticks.
    <div className="max-h-[70vh] overflow-auto" data-testid="checklist-scroll">
      <table className="border-separate border-spacing-0" data-testid="batch-checklist">
        <ChecklistHeader recipes={batch.recipes} />
        <tbody>
          {rows.map((row) => (
            <ChecklistRow
              key={row.name}
              row={row}
              recipes={batch.recipes}
              isChecked={isChecked}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Count of checked cells and total cells across the batch, for the progress readout. */
export function checklistProgress(
  batch: Batch,
  checked: ReadonlySet<string>,
): { done: number; total: number } {
  const rows = mergeBatchRows(batch.recipes);
  let done = 0;
  let total = 0;
  for (const row of rows) {
    for (const cell of row.cells) {
      total++;
      if (checked.has(cellKey(row.name, cell.recipeIndex))) done++;
    }
  }
  return { done, total };
}
