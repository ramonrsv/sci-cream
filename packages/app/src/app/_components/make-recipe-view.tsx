"use client";

import { useEffect, useMemo, useState } from "react";

import { ShareBatchAction } from "@/app/_elements/batch-share-dialog";
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
import { STORAGE_KEYS } from "@/lib/local-storage";
import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { useSessionResources } from "@/lib/resources/session";
import { useChecklistState } from "@/lib/hooks/use-checklist-state";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { BatchBuilder } from "@/app/_elements/tables/batch-builder";
import {
  type BatchSelection,
  type BatchSource,
  makeBatchFromSelection,
  readCalculatorSources,
  readSavedSources,
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
 * Owner mode (no fragment) builds a batch from calculator slots and saved recipes; link mode
 * decodes one from the fragment, which never reaches the server. Both render the same checklist
 * from one {@link Batch}, so link mode is a thin decode layer. No WASM: only names and grams.
 */
export function MakeRecipeView() {
  const [state, setState] = useState<ViewState>({ status: "decoding" });
  const { savedRecipes } = useSessionResources();

  const [selection, setSelection] = usePersistedState<BatchSelection>(
    STORAGE_KEYS.makeRecipeBatch,
    makeEmptySelection(),
  );

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

  const sources: BatchSource[] = useMemo(
    () => [...readCalculatorSources(), ...readSavedSources(savedRecipes)],
    [savedRecipes],
  );

  const ownerBatch = useMemo(
    () => makeBatchFromSelection(selection, sources),
    [selection, sources],
  );

  const batch = state.status === "link" ? state.batch : ownerBatch;

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

  const linkMode = state.status === "link";
  const { done, total } = checklistProgress(batch, checked);

  return (
    <div
      className="mx-auto mt-4 flex max-w-3xl flex-col gap-4 px-2 md:px-4"
      data-testid="make-recipe-view"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-primary text-base font-semibold">
            {batch.title || "Weighing checklist"}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-tag">{batch.date}</span>
            {linkMode && <span className="meta-tag">shared checklist</span>}
            {total > 0 && (
              <span className="text-secondary text-xs tabular-nums" data-testid="batch-progress">
                {done} of {total} weighed
              </span>
            )}
          </div>
        </div>
        {!linkMode && (
          <div className="flex shrink-0 items-center gap-1">
            <ShareBatchAction batch={batch} iconSize={DETAIL_PANEL_ACTION_ICON_SIZE} />
          </div>
        )}
      </div>

      {/* Owner mode edits the selection; link mode shows the same batch read-only */}
      {linkMode ? (
        <>
          <BatchLegend recipes={batch.recipes} />
          {batch.notes !== undefined && <RecipeComments text={batch.notes} />}
        </>
      ) : (
        <BatchBuilder
          selection={selection}
          batch={ownerBatch}
          sources={sources}
          onChange={setSelection}
        />
      )}

      <BatchChecklist batch={batch} checked={checked} onToggle={toggle} />
    </div>
  );
}
