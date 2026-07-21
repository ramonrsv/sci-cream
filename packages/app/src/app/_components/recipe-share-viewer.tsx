"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadAction } from "@/app/_components/detail-panel";
import { RecipeComments, RecipeDetailBody } from "@/app/_elements/recipe-detail-body";
import { STORAGE_KEYS } from "@/lib/local-storage";
import {
  getRecipeStoresFromStorage,
  makeRecipeId,
  setRecipeStoresToStorage,
} from "@/lib/recipe/recipe";
import {
  SHARE_ERROR_MESSAGES,
  ShareError,
  ShareErrorKind,
  makeShareUrl,
  makeSharedRecipe,
  decodeSharePayload,
  type SharePayload,
} from "@/lib/recipe/recipe-share";
import { useFreeOnReplace } from "@/lib/resources/wasm-resources";
import { MAX_RECIPES } from "@/lib/styles/sizes";

/** Decode progress of the URL-fragment payload; `ready` carries the raw encoding for re-linking */
type ViewerState =
  | { status: "decoding" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: SharePayload; encoded: string };

/** Error state of the share viewer: a friendly message shown in place of any recipe content. */
function ShareErrorNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-4 max-w-2xl px-2 md:px-4">
      <p className="msg-error p-3" data-testid="share-error">
        {message}
      </p>
    </div>
  );
}

/**
 * Read-only viewer for a `/share#<payload>` link: recipe name and rows, mix properties, and the
 * FPD graph, computed on an isolated per-payload WASM bridge (never the shared session bridge).
 *
 * `embed` renders the compact iframe variant: "Open in calculator" (meaningless without the
 * recipient's localStorage origin) is replaced by a "View full recipe" link opening in a new tab.
 */
export function ShareViewer({ embed = false }: { embed?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<ViewerState>({ status: "decoding" });

  // Decode the fragment on mount and again whenever it changes (fragment edits don't remount).
  useEffect(() => {
    let cancelled = false;

    const decode = async () => {
      const encoded = window.location.hash.slice(1);
      let next: ViewerState;
      try {
        next = { status: "ready", payload: await decodeSharePayload(encoded), encoded };
      } catch (err) {
        console.error("share: decoding failed:", err);
        const message =
          err instanceof ShareError ? err.message : SHARE_ERROR_MESSAGES[ShareErrorKind.Invalid];
        next = { status: "error", message };
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

  const shared = useMemo(
    () => (state.status === "ready" ? makeSharedRecipe(state.payload) : undefined),
    [state],
  );

  const resolved = shared?.status === "ready" ? shared : undefined;

  // Free the previous payload's WASM objects once a new one replaces them (hashchange)
  useFreeOnReplace(resolved?.bridge);
  useFreeOnReplace(resolved?.recipe.mixProperties);

  /** Write the shared recipe into the chosen calculator slot and navigate to it (anonymous load) */
  const openInCalculator = (payload: SharePayload, slot: number) => {
    const stores = getRecipeStoresFromStorage();
    stores[slot] = {
      name: payload.n,
      serializedRows: payload.r.map(([name, quantity]) => `${name}\t${quantity}`).join("\n"),
      ...(payload.e ? { evaporation: payload.e } : {}),
    };
    setRecipeStoresToStorage(stores);
    router.push(`/calculator?slot=${String(slot)}`);
  };

  if (state.status === "decoding") {
    return <p className="text-secondary p-4 text-sm">Loading shared recipe…</p>;
  }

  if (state.status === "error") return <ShareErrorNotice message={state.message} />;
  if (shared?.status === "error") return <ShareErrorNotice message={shared.message} />;

  const { payload, encoded } = state;
  const { recipe, bridge, allResolved } = resolved!;

  return (
    <div
      className={`flex flex-col gap-3 ${embed ? "p-2" : "mx-auto mt-4 max-w-3xl gap-4 px-2 md:px-4"}`}
      data-testid="share-viewer"
    >
      {/* Header: name + shared badge on the left; open-in-calculator / full-view on the right */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-primary text-base font-semibold">{payload.n || "Shared recipe"}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-tag">shared recipe</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {embed ? (
            <a
              href={makeShareUrl(encoded, "")}
              target="_blank"
              rel="noopener noreferrer"
              className="action-button px-2 py-0.5 text-sm"
            >
              View full recipe
            </a>
          ) : (
            <LoadAction
              onLoad={(slot) => openInCalculator(payload, slot)}
              slots={Array.from({ length: MAX_RECIPES }, (_, idx) => idx)}
              slotLabel={makeRecipeId}
              label="Open in calculator"
              persistKey={STORAGE_KEYS.recipeShareLoadAction}
            />
          )}
        </div>
      </div>

      {/* Unresolved rows are flagged in the table and excluded from the calculated mix */}
      {!allResolved && (
        <p className="msg-warning p-3" data-testid="share-unresolved-warning">
          Some ingredients in this recipe are not included in the link (highlighted below); mix
          properties exclude them. You can still open the recipe and substitute your own.
        </p>
      )}

      {/* Body: ingredient table + mix properties + comments, shared with recipe-search */}
      <RecipeDetailBody
        recipe={recipe}
        isValidIngredient={(name) => bridge.has_ingredient(name)}
        persistKey={embed ? undefined : STORAGE_KEYS.recipeSharePropertiesView}
        comments={payload.c && <RecipeComments text={payload.c} />}
      />
    </div>
  );
}
