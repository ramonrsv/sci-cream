"use client";

import { Check, Plus, Trash2 } from "lucide-react";

import { RecipeBadge, categoryChipStyle } from "@/app/_elements/tables/batch-checklist";
import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";
import { VersionBadge } from "@/app/_elements/version-badge";
import {
  MAX_BATCH_RECIPES,
  type Batch,
  batchRecipeColor,
  batchRecipeLetter,
  displayVersion,
} from "@/lib/batch/batch";
import { CATEGORY_COLORS, type CategoryColor, categoryColorName } from "@/lib/styles/colors";
import { colorForPosition, recordColorPick } from "@/lib/batch/colors";
import { type BatchSelection, type BatchSource } from "@/lib/batch/builder";

/** Color picker worn by the recipe's own badge, which already shows the color. */
function ColorPicker({
  index,
  color,
  onPick,
}: {
  index: number;
  color: CategoryColor;
  onPick: (color: CategoryColor) => void;
}) {
  const label = `Recipe ${batchRecipeLetter(index)} container color: ${categoryColorName(color)}`;

  return (
    <Popover className="flex">
      {/* Flex, or the badge sits on the text baseline with the descender space beneath it. */}
      <PopoverButton
        className="flex cursor-pointer items-center rounded"
        title={label}
        aria-label={label}
        data-testid="builder-color-button"
      >
        <RecipeBadge index={index} color={color} />
      </PopoverButton>
      {/* Opens rightward: the badge is the row's left edge, with no room to align the panel end */}
      <PopupPanel anchor={{ to: "bottom start", gap: 4, padding: 8 }} className="p-2">
        {({ close }) => (
          <div className="grid grid-cols-5 gap-1" data-testid="builder-color-choices">
            {CATEGORY_COLORS.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => {
                  onPick(choice);
                  close();
                }}
                aria-pressed={choice === color}
                className="action-button flex items-center justify-center p-1"
                title={categoryColorName(choice)}
                aria-label={categoryColorName(choice)}
                data-testid={`builder-color-${categoryColorName(choice)}`}
              >
                <ColorSwatch color={choice} selected={choice === color} />
              </button>
            ))}
          </div>
        )}
      </PopupPanel>
    </Popover>
  );
}

/** A square of one color, checked when it is the current choice. */
function ColorSwatch({ color, selected = false }: { color: CategoryColor; selected?: boolean }) {
  const chip = categoryChipStyle(color);
  return (
    <span
      className={`recipe-badge ${chip.className}`}
      style={chip.style}
      aria-hidden
      data-testid={`color-swatch-${categoryColorName(color)}`}
    >
      {selected && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

/** One row of the builder: the chosen recipe, its total, and a remove control. */
function BuilderRow({
  name,
  version,
  total,
  index,
  color,
  onPickColor,
  onRemove,
}: {
  name: string;
  version?: number;
  total: number;
  index: number;
  color: CategoryColor;
  onPickColor: (color: CategoryColor) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className="border-brd flex items-center gap-2 border-b py-1.5 last:border-b-0"
      data-testid={`builder-row-${String(index)}`}
    >
      <ColorPicker index={index} color={color} onPick={onPickColor} />
      <span className="text-primary min-w-0 flex-1 truncate text-sm">{name}</span>
      {version !== undefined && (
        <VersionBadge version={version} title={`Weighing version ${String(version)}`} />
      )}
      <span className="text-secondary comp-val text-xs tabular-nums">
        {Number(total.toFixed(1))} g
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="action-button px-1 py-0.5"
        title={`Remove ${name}`}
        aria-label={`Remove ${name}`}
        data-testid={`builder-remove-${String(index)}`}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/**
 * Owner-mode batch builder: pick recipes from the calculator slots or saved versions and set the
 * batch metadata. Edits the {@link BatchSelection}; the {@link Batch} is derived.
 */
export function BatchBuilder({
  selection,
  batch,
  sources,
  onChange,
}: {
  selection: BatchSelection;
  batch: Batch;
  sources: BatchSource[];
  onChange: (selection: BatchSelection) => void;
}) {
  const full = selection.items.length >= MAX_BATCH_RECIPES;

  const addSource = (sourceId: string) => {
    if (full || !sources.some((s) => s.id === sourceId)) return;
    const color = colorForPosition(selection.items.length);
    onChange({ ...selection, items: [...selection.items, { sourceId, color }] });
  };

  const removeAt = (index: number) => {
    onChange({ ...selection, items: selection.items.filter((_, i) => i !== index) });
  };

  const colorAt = (index: number, color: CategoryColor) => {
    recordColorPick(index, color);
    onChange({
      ...selection,
      items: selection.items.map((item, i) => (i === index ? { ...item, color } : item)),
    });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="batch-builder">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-secondary text-xs font-medium tracking-wide uppercase">Title</span>
          <input
            type="text"
            value={selection.title ?? ""}
            onChange={(e) => onChange({ ...selection, title: e.target.value })}
            placeholder="Test batch"
            className="boxed-input my-0 px-1 py-0.5 text-sm"
            data-testid="batch-title"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-secondary text-xs font-medium tracking-wide uppercase">Date</span>
          <input
            type="date"
            value={selection.date}
            onChange={(e) => onChange({ ...selection, date: e.target.value })}
            className="boxed-input my-0 px-1 py-0.5 text-sm"
            data-testid="batch-date"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-secondary text-xs font-medium tracking-wide uppercase">Recipes</span>
        {batch.recipes.length > 0 && (
          <ul className="flex flex-col">
            {batch.recipes.map((recipe, index) => (
              <BuilderRow
                key={`${String(index)}:${recipe.name}`}
                name={recipe.name}
                version={displayVersion(recipe.ref)}
                total={recipe.rows.reduce((sum, [, quantity]) => sum + quantity, 0)}
                index={index}
                color={batchRecipeColor(recipe, index)}
                onPickColor={(color) => colorAt(index, color)}
                onRemove={() => removeAt(index)}
              />
            ))}
          </ul>
        )}
        <div className="flex items-center gap-1">
          <Plus size={14} className="text-secondary" aria-hidden />
          <label className="flex-1">
            <span className="sr-only">Add a recipe to the batch</span>
            <select
              value=""
              disabled={full || sources.length === 0}
              onChange={(e) => addSource(e.target.value)}
              className="boxed-input my-0 w-full px-1 py-0.5 text-sm"
              data-testid="batch-add-recipe"
            >
              <option value="" disabled>
                {full
                  ? `Batch is full (${String(MAX_BATCH_RECIPES)} recipes)`
                  : sources.length === 0
                    ? "No recipes available — build one in the calculator first"
                    : "Add a recipe…"}
              </option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.detail === undefined ? source.name : `${source.name} (${source.detail})`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-secondary text-xs font-medium tracking-wide uppercase">Notes</span>
        <textarea
          value={selection.notes ?? ""}
          onChange={(e) => onChange({ ...selection, notes: e.target.value })}
          placeholder="Procedure notes — ageing, churn temperature, observations…"
          rows={3}
          className="boxed-input my-0 px-1 py-0.5 text-sm"
          data-testid="batch-notes"
        />
      </label>
    </div>
  );
}
