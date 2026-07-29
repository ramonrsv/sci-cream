"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { FilePlus2, Trash2 } from "lucide-react";

import { ShareBatchAction } from "@/app/_elements/batch-share-dialog";
import { SaveBatchAction } from "@/app/_elements/batch-save-action";
import { BatchList } from "@/app/_elements/batch-list";
import { ListDetailShell } from "@/app/_elements/list-detail-shell";
import { SaveStatusDot } from "@/app/_elements/save-status-dot";
import { RecipeComments } from "@/app/_elements/recipe-detail-body";
import {
  BatchChecklist,
  BatchLegend,
  checklistProgress,
} from "@/app/_elements/tables/batch-checklist";
import {
  BATCH_ERROR_MESSAGES,
  BatchError,
  BatchErrorKind,
  decodeBatchPayload,
  makeBatchFromPayload,
} from "@/lib/batch/share";
import { type Batch, batchChecklistKey, todayIsoDate, touchChecklist } from "@/lib/batch/batch";
import { deleteUserBatch, type SavedBatchJson } from "@/lib/data";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { useSessionResources } from "@/lib/resources/session";
import { useChecklistState } from "@/lib/hooks/use-checklist-state";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { verify } from "@/lib/util";
import { BatchBuilder } from "@/app/_elements/tables/batch-builder";
import {
  type BatchSelection,
  type AddableRecipe,
  batchHasUnsavedChanges,
  batchMatchesQuery,
  isInlineSelection,
  makeBatchFromSelection,
  readCalculatorSources,
  readSavedSources,
  selectionFromSavedBatch,
} from "@/lib/batch/builder";

/** Decode progress of the URL-fragment payload; absent fragment means owner mode. */
type ViewState =
  | { status: "decoding" }
  | { status: "owner" }
  | { status: "error"; message: string }
  | { status: "link"; batch: Batch };

/** Empty owner-mode selection, dated today. */
function makeEmptySelection(): BatchSelection {
  return { date: todayIsoDate(), items: [] };
}

/** Friendly failure state for an unusable link; no partial checklist is ever shown. */
function BatchErrorNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-4 max-w-2xl px-2 md:px-4">
      <p className="msg-error p-3" data-testid="make-recipe-error">
        {message}
      </p>
    </div>
  );
}

/**
 * The make-recipe weighing checklist, in both of its modes.
 *
 * Owner mode (no fragment) pairs a saved-batch list with a batch editor built from slots and saved
 * recipes; selecting a saved batch loads it into the editor to weigh, re-save, or fork. Link mode
 * decodes a batch from the fragment, which never reaches the server, and shows the same checklist
 * read-only. Both render the same checklist from one {@link Batch}. No WASM: only names and grams.
 */
export function MakeRecipeView() {
  const [state, setState] = useState<ViewState>({ status: "decoding" });
  const { savedRecipes, savedBatches, refreshUserBatches } = useSessionResources();
  const userEmail = useSession().data?.user?.email;

  const [selection, setSelection] = usePersistedState<BatchSelection>(
    STORAGE_KEYS.makeRecipeBatch,
    makeEmptySelection(),
    { isValid: isInlineSelection },
  );
  const [batchQuery, setBatchQuery] = useState("");

  /** Seed the working draft from a saved batch, binding it for update-in-place on the next save. */
  const loadBatch = (saved: SavedBatchJson) => setSelection(selectionFromSavedBatch(saved));

  // Read the fragment on mount and whenever it changes; an absent fragment means owner mode
  useEffect(() => {
    let cancelled = false;
    const decode = async () => {
      const encoded = window.location.hash.slice(1);
      let next: ViewState;
      if (encoded === "") {
        next = { status: "owner" };
      } else {
        try {
          next = { status: "link", batch: makeBatchFromPayload(await decodeBatchPayload(encoded)) };
        } catch (err) {
          console.error("make-recipe: decoding failed:", err);
          const message =
            err instanceof BatchError ? err.message : BATCH_ERROR_MESSAGES[BatchErrorKind.Invalid];
          next = { status: "error", message };
        }
      }
      if (!cancelled) setState(next);
    };
    void decode();
    const onHashChange = () => void decode();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const sources: AddableRecipe[] = useMemo(
    () => [...readCalculatorSources(), ...readSavedSources(savedRecipes)],
    [savedRecipes],
  );

  const ownerBatch = useMemo(() => makeBatchFromSelection(selection), [selection]);

  const batch = state.status === "link" ? state.batch : ownerBatch;

  // A bound batch that has diverged from its saved copy — the Save control flags it amber.
  const batchDirty =
    selection.savedBatchId !== undefined &&
    batchHasUnsavedChanges(ownerBatch, selection.savedBatchId, savedBatches);

  /**
   * Discard the working selection and start an empty batch. Confirm first when that would lose
   * unsaved work — an unbound draft with any content, or a bound one edited since it was loaded.
   */
  const handleNewBatch = () => {
    if (
      batchHasUnsavedChanges(ownerBatch, selection.savedBatchId, savedBatches) &&
      !window.confirm("Discard unsaved changes and start a new batch?")
    ) {
      return;
    }
    setSelection(makeEmptySelection());
  };

  /** Delete the saved batch being edited; unbind the draft but keep its rows for re-saving. */
  const deleteBatch = async () => {
    const id = selection.savedBatchId;
    verify(
      userEmail != null && id !== undefined,
      "deleteBatch invoked without a bound saved batch",
    );
    const title = savedBatches.find((b) => b.id === id)?.title || "Untitled batch";
    if (!window.confirm(`Delete the batch "${title}"? This can't be undone.`)) return;
    await deleteUserBatch(userEmail, id);
    setSelection((prev) => ({ ...prev, savedBatchId: undefined }));
    await refreshUserBatches();
  };

  const filteredSavedBatches = useMemo(() => {
    const q = batchQuery.trim().toLowerCase();
    return q === "" ? savedBatches : savedBatches.filter((b) => batchMatchesQuery(b, q));
  }, [savedBatches, batchQuery]);

  // Owner and recipient derive one key from the weighing content; progress stays per device.
  const checklistKey = useMemo(() => batchChecklistKey(batch), [batch]);
  const [checked, toggle] = useChecklistState(checklistKey);

  // Record use on batch change, not on every toggle, so eviction runs once per checklist
  useEffect(() => {
    if (batch.recipes.length > 0) touchChecklist(checklistKey);
  }, [checklistKey, batch.recipes.length]);

  if (state.status === "decoding") {
    return <p className="text-secondary p-4 text-sm">Loading checklist…</p>;
  }
  if (state.status === "error") return <BatchErrorNotice message={state.message} />;

  const { done, total } = checklistProgress(batch, checked);

  const progressTag = total > 0 && (
    <span className="text-secondary text-xs tabular-nums" data-testid="batch-progress">
      {done} of {total} weighed
    </span>
  );

  const iconSize = DETAIL_PANEL_ACTION_ICON_SIZE;

  // Link mode: a read-only checklist for a recipient, decoded from the fragment.
  if (state.status === "link") {
    return (
      <div
        className="mx-auto mt-4 flex max-w-3xl flex-col gap-4 px-2 md:px-4"
        data-testid="make-recipe-view"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-primary text-base font-semibold">
            {batch.title || "Weighing checklist"}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-tag">{batch.date}</span>
            <span className="meta-tag">shared checklist</span>
            {progressTag}
          </div>
        </div>
        <BatchLegend recipes={batch.recipes} />
        {batch.notes !== undefined && <RecipeComments text={batch.notes} />}
        <BatchChecklist batch={batch} checked={checked} onToggle={toggle} />
      </div>
    );
  }

  // Owner mode: a saved-batch list beside the editor for the working draft.
  const editor = (
    <div className="search-detail-panel" data-testid="batch-editor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <SaveStatusDot
              bound={selection.savedBatchId !== undefined}
              dirty={batchDirty}
              testId="batch-status-dot"
            />
            <h2 className="text-primary text-base font-semibold">
              {batch.title || "Weighing checklist"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-tag">{batch.date}</span>
            {progressTag}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleNewBatch}
            className="action-button px-2 py-0.5 text-sm"
            title="New batch"
            aria-label="New batch"
            data-testid="new-batch-button"
          >
            <FilePlus2 size={iconSize} />
          </button>
          <SaveBatchAction
            batch={batch}
            userEmail={userEmail}
            savedBatchId={selection.savedBatchId}
            dirty={batchDirty}
            onSaved={(batchId) => {
              setSelection((prev) => ({ ...prev, savedBatchId: batchId }));
              void refreshUserBatches();
            }}
          />
          <ShareBatchAction batch={batch} />
          {selection.savedBatchId !== undefined && userEmail && (
            <button
              type="button"
              onClick={() => void deleteBatch()}
              className="action-button px-2 py-0.5 text-sm"
              title="Delete batch"
              aria-label="Delete batch"
              data-testid="delete-batch-button"
            >
              <Trash2 size={iconSize} />
            </button>
          )}
        </div>
      </div>

      <BatchBuilder
        selection={selection}
        batch={ownerBatch}
        sources={sources}
        onChange={setSelection}
      />
      <BatchChecklist batch={batch} checked={checked} onToggle={toggle} />
    </div>
  );

  return (
    <div className="mx-auto mt-4 max-w-5xl px-1 md:px-4" data-testid="make-recipe-view">
      <ListDetailShell
        query={batchQuery}
        onQueryChange={setBatchQuery}
        searchPlaceholder="Search saved batches…"
        list={
          <BatchList
            batches={filteredSavedBatches}
            selectedId={selection.savedBatchId}
            onLoad={loadBatch}
            emptyMessage={
              userEmail
                ? batchQuery.trim() === ""
                  ? "No saved batches yet. Save the current one to start."
                  : "No batches match your search."
                : "Sign in to save batches and load them here."
            }
          />
        }
        detail={editor}
      />
    </div>
  );
}
