"use client";

import { useState } from "react";
import { CopyPlus, Save } from "lucide-react";

import type { Batch } from "@/lib/batch/batch";
import { batchToInput } from "@/lib/batch/builder";
import { createUserBatch, updateUserBatch } from "@/lib/data/batches";
import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Save controls for a batch. The primary button creates it, or updates it in place once bound to a
 * saved batch; its label reads "Save" vs "Update". When bound, "Save as new" forks a fresh copy.
 * Both disable with an explaining tooltip (not hidden) when signed out or the batch is empty.
 */
export function SaveBatchAction({
  batch,
  userEmail,
  savedBatchId,
  onSaved,
  dirty = false,
  buttonClassName = "action-button px-2 py-0.5 text-sm",
  iconSize = DETAIL_PANEL_ACTION_ICON_SIZE,
}: {
  batch: Batch;
  userEmail: string | null | undefined;
  savedBatchId?: number;
  onSaved: (batchId: number) => void;
  /** True when the bound batch has unsaved edits; tints the Save control amber. */
  dirty?: boolean;
  buttonClassName?: string;
  iconSize?: number;
}) {
  const [saving, setSaving] = useState(false);

  const empty = batch.recipes.every((recipe) => recipe.rows.length === 0);
  const bound = savedBatchId !== undefined;
  const disabled = saving || empty || !userEmail;
  const dirtyColor = dirty ? "text-amber-500" : undefined;

  /** Create a fresh batch, or — when `asNew` is false and already bound — update the bound one. */
  const save = async (asNew: boolean) => {
    if (!userEmail || empty) return;
    setSaving(true);
    try {
      const input = batchToInput(batch);
      const saved =
        asNew || !bound
          ? await createUserBatch(userEmail, input)
          : await updateUserBatch(userEmail, savedBatchId, input);
      if (saved) onSaved(saved.id);
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = !userEmail
    ? "Sign in to save this batch"
    : empty
      ? "Add a recipe to save the batch"
      : saving
        ? "Saving…"
        : bound
          ? "Update the saved batch"
          : "Save batch";

  return (
    <>
      <button
        type="button"
        className={`flex items-center gap-1 ${buttonClassName}`}
        disabled={disabled}
        title={saveTitle}
        aria-label={saveTitle}
        onClick={() => void save(false)}
        data-testid="save-batch-button"
      >
        <Save size={iconSize} className={dirtyColor} />
        <span className={dirtyColor}>{bound ? "Update" : "Save"}</span>
      </button>
      {bound && (
        <button
          type="button"
          className={buttonClassName}
          disabled={disabled}
          title={saving ? "Saving…" : "Save as a new batch"}
          aria-label="Save as a new batch"
          onClick={() => void save(true)}
          data-testid="save-batch-as-new-button"
        >
          <CopyPlus size={iconSize} />
        </button>
      )}
    </>
  );
}
