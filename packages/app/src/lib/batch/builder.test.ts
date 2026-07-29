import { describe, it, expect } from "vitest";

import {
  type BatchSelection,
  type AddableRecipe,
  batchHasUnsavedChanges,
  batchMatchesQuery,
  snapshotRecipe,
  batchToInput,
  isInlineSelection,
  makeBatchFromSelection,
  readSavedSources,
  savedBatchToBatch,
  selectionFromSavedBatch,
} from "./builder";
import { type Batch, displayVersion } from "@/lib/batch/batch";
import type { SavedBatchJson, SavedRecipeJson, SavedRecipeVersionJson } from "@/lib/data";
import { CategoryColor } from "@/lib/styles/colors";

/** A saved version carrying one row, enough to be a usable batch source. */
function version(versionNumber: number, versionName?: string): SavedRecipeVersionJson {
  return {
    version: versionNumber,
    recipe: [["Whole Milk", 100 * versionNumber]],
    createdAt: "2026-07-18T00:00:00.000Z",
    ...(versionName !== undefined ? { versionName } : {}),
  };
}

/** A saved recipe holding exactly the given version numbers, in the order stored. */
function savedRecipe(id: number, name: string, versionNumbers: number[]): SavedRecipeJson {
  return { id, name, versions: versionNumbers.map((v) => version(v)) };
}

/** The one-item selection used by most cases, snapshotting the given source inline. */
function selectOnly(source: AddableRecipe): BatchSelection {
  return { date: "2026-07-18", items: [{ recipe: snapshotRecipe(source) }] };
}

/** Find a source by picker detail, failing loudly when the test's fixture is wrong. */
function sourceByDetail(sources: AddableRecipe[], detail: string): AddableRecipe {
  const source = sources.find((s) => s.detail === detail);
  if (source === undefined) throw new Error(`no source with detail ${detail}`);
  return source;
}

describe("readSavedSources — version labelling in the picker", () => {
  it("omits the version for a recipe that only has the default", () => {
    const sources = readSavedSources([savedRecipe(1, "My Gelato", [1])]);

    expect(sources).toHaveLength(1);
    expect(sources[0]?.detail).toBeUndefined();
  });

  it("labels every version once a recipe has more than the default, including v1", () => {
    const sources = readSavedSources([savedRecipe(1, "My Gelato", [1, 2, 3])]);

    // Newest first, and v1 is now worth naming because later versions exist to confuse it with
    expect(sources.map((s) => s.detail)).toEqual(["v3", "v2", "v1"]);
    expect(sources.every((s) => s.version?.hasSiblings)).toBe(true);
  });

  it("decides per recipe, not across the whole list", () => {
    const sources = readSavedSources([
      savedRecipe(1, "Single", [1]),
      savedRecipe(2, "Multi", [1, 2]),
    ]);

    expect(sources.filter((s) => s.name === "Single").map((s) => s.detail)).toEqual([undefined]);
    expect(sources.filter((s) => s.name === "Multi").map((s) => s.detail)).toEqual(["v2", "v1"]);
  });

  it("labels with the opted-in name instead of the raw number, and carries it along", () => {
    const recipe: SavedRecipeJson = {
      id: 1,
      name: "My Gelato",
      versions: [version(1), version(2, "2.1")],
    };
    const sources = readSavedSources([recipe]);

    expect(sources.map((s) => s.detail)).toEqual(["v2.1", "v1"]);
    expect(sources.map((s) => s.version?.name)).toEqual(["2.1", undefined]);
  });
});

describe("displayVersion — which version earns a badge beside the name", () => {
  it("hides the default, so the common case shows no badge at all", () => {
    expect(displayVersion({ ref: { recipeId: 1, versionNumber: 1 } })).toBeUndefined();
  });

  it("shows a non-default version", () => {
    expect(displayVersion({ ref: { recipeId: 1, versionNumber: 4 } })).toBe(4);
  });

  it("shows nothing for a calculator slot, which has no version at all", () => {
    expect(displayVersion(undefined)).toBeUndefined();
  });

  it("badges a non-default version even when it is the recipe's only one", () => {
    // Deleting v1 and v2 leaves a lone v3. The picker stops qualifying it, having nothing to tell
    // it apart from — but the badge must stay, or the batch misrepresents what was weighed.
    const [only] = readSavedSources([savedRecipe(1, "My Gelato", [3])]);

    expect(only?.detail).toBeUndefined();
    expect(displayVersion(only?.version)).toBe(3);
  });

  it("prefers an opted-in name over the number, even for the default version", () => {
    expect(displayVersion({ ref: { recipeId: 1, versionNumber: 1 }, name: "1.0" })).toBe("1.0");
  });

  it("shows the default version's number too, once the recipe has other versions", () => {
    expect(displayVersion({ ref: { recipeId: 1, versionNumber: 1 }, hasSiblings: true })).toBe(1);
  });
});

describe("makeBatchFromSelection — name and version stay separate", () => {
  /** The batch built from the single version of "My Gelato" matching `detail`. */
  const batchFromVersion = (detail: string) => {
    const sources = readSavedSources([savedRecipe(1, "My Gelato", [1, 2])]);
    return makeBatchFromSelection(selectOnly(sourceByDetail(sources, detail)));
  };

  it("leaves the version out of the name, which the badge carries instead", () => {
    expect(batchFromVersion("v2").recipes.map((r) => r.name)).toEqual(["My Gelato"]);
  });

  it("records the version in `ref`, where the badge reads it from", () => {
    const batch = batchFromVersion("v2");

    expect(batch.recipes[0]?.version?.ref).toEqual({ recipeId: 1, versionNumber: 2 });
    expect(displayVersion(batch.recipes[0]?.version)).toBe(2);
  });

  it("badges the default version too, once its recipe has other versions", () => {
    // "My Gelato" has a v2 alongside this v1, so v1 is no longer the unambiguous common case.
    expect(displayVersion(batchFromVersion("v1").recipes[0]?.version)).toBe(1);
  });

  it("carries an opted-in version name from the source onto the batch recipe", () => {
    const recipe: SavedRecipeJson = {
      id: 1,
      name: "My Gelato",
      versions: [version(1), version(2, "2.1")],
    };
    const sources = readSavedSources([recipe]);
    const batch = makeBatchFromSelection(selectOnly(sourceByDetail(sources, "v2.1")));

    expect(batch.recipes[0]?.version?.name).toBe("2.1");
    expect(displayVersion(batch.recipes[0]?.version)).toBe("2.1");
  });
});

describe("makeBatchFromSelection — inline recipes", () => {
  it("uses each item's inline recipe as-is", () => {
    const selection: BatchSelection = {
      date: "2026-07-20",
      items: [
        { color: CategoryColor.Blue, recipe: { name: "Loaded", rows: [["Whole Milk", 300]] } },
      ],
    };

    expect(makeBatchFromSelection(selection).recipes).toEqual([
      { name: "Loaded", rows: [["Whole Milk", 300]], color: CategoryColor.Blue },
    ]);
  });
});

describe("snapshotRecipe — snapshotting a live source at add time", () => {
  it("captures the source's name, rows, and version inline", () => {
    const [newest] = readSavedSources([savedRecipe(1, "My Gelato", [1, 2])]);

    expect(snapshotRecipe(newest)).toEqual({
      name: "My Gelato",
      rows: [["Whole Milk", 200]],
      version: { ref: { recipeId: 1, versionNumber: 2 }, hasSiblings: true },
    });
  });

  it("omits the version for a calculator slot, which has none", () => {
    const slot: AddableRecipe = { id: "slot:0", name: "R1", rows: [["Sugar", 50]] };

    expect(snapshotRecipe(slot)).toEqual({ name: "R1", rows: [["Sugar", 50]] });
  });
});

describe("isInlineSelection — rejecting drafts stored before inline snapshots", () => {
  it("accepts a selection whose items all carry an inline recipe", () => {
    const selection: BatchSelection = {
      date: "2026-07-20",
      items: [{ recipe: { name: "V", rows: [["Milk", 100]] } }],
    };

    expect(isInlineSelection(selection)).toBe(true);
  });

  it("rejects a legacy selection whose items only reference a source by id", () => {
    // A pre-snapshot draft stored `{ sourceId }` and no rows; it arrives untyped from storage.
    const legacy = {
      date: "2026-07-20",
      items: [{ sourceId: "slot:0" }],
    } as unknown as BatchSelection;

    expect(isInlineSelection(legacy)).toBe(false);
  });
});

describe("batchToInput / selectionFromSavedBatch — database round-trip", () => {
  const batch: Batch = {
    title: "Test batch",
    date: "2026-07-20",
    notes: "age overnight",
    recipes: [
      {
        name: "Vanilla",
        rows: [["Whole Milk", 600]],
        color: CategoryColor.Blue,
        version: { ref: { recipeId: 5, versionNumber: 2 } },
      },
      { name: "Sorbet", rows: [["Sugar", 100]] },
    ],
  };

  it("projects a batch onto the wire shape, storing colors by name and only the ref", () => {
    expect(batchToInput(batch)).toEqual({
      title: "Test batch",
      date: "2026-07-20",
      notes: "age overnight",
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 600]],
          color: "Blue",
          ref: { recipeId: 5, versionNumber: 2 },
        },
        { name: "Sorbet", rows: [["Sugar", 100]] },
      ],
    });
  });

  it("seeds an inline selection from a saved batch, marking it for update in place", () => {
    const saved: SavedBatchJson = {
      id: 42,
      title: "Test batch",
      date: "2026-07-20",
      recipes: [{ name: "Vanilla", rows: [["Whole Milk", 600]], color: "Blue" }],
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    };

    expect(selectionFromSavedBatch(saved)).toEqual({
      savedBatchId: 42,
      title: "Test batch",
      date: "2026-07-20",
      items: [
        { color: CategoryColor.Blue, recipe: { name: "Vanilla", rows: [["Whole Milk", 600]] } },
      ],
    });
  });

  it("round-trips a saved batch back into a derived Batch for display", () => {
    const saved: SavedBatchJson = {
      id: 7,
      date: "2026-07-20",
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 600]],
          color: "Green",
          ref: { recipeId: 5, versionNumber: 2 },
        },
      ],
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    };

    expect(savedBatchToBatch(saved).recipes).toEqual([
      {
        name: "Vanilla",
        rows: [["Whole Milk", 600]],
        color: CategoryColor.Green,
        version: { ref: { recipeId: 5, versionNumber: 2 } },
      },
    ]);
  });
});

describe("batchHasUnsavedChanges — what discarding the draft would lose", () => {
  const saved: SavedBatchJson = {
    id: 7,
    title: "Test batch",
    date: "2026-07-20",
    recipes: [{ name: "Vanilla", rows: [["Whole Milk", 600]], color: "Blue" }],
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
  };

  it("is false for an empty, unbound draft", () => {
    expect(batchHasUnsavedChanges({ date: "2026-07-20", recipes: [] }, undefined, [])).toBe(false);
  });

  it("is true for an unbound draft carrying only a title or only notes", () => {
    const titled: Batch = { date: "2026-07-20", title: "Draft", recipes: [] };
    const noted: Batch = { date: "2026-07-20", notes: "Age 12 h", recipes: [] };
    expect(batchHasUnsavedChanges(titled, undefined, [])).toBe(true);
    expect(batchHasUnsavedChanges(noted, undefined, [])).toBe(true);
  });

  it("is true for an unbound draft with a recipe", () => {
    const batch: Batch = { date: "2026-07-20", recipes: [{ name: "V", rows: [["Milk", 600]] }] };
    expect(batchHasUnsavedChanges(batch, undefined, [])).toBe(true);
  });

  it("is false when a bound draft still matches its saved batch", () => {
    expect(batchHasUnsavedChanges(savedBatchToBatch(saved), 7, [saved])).toBe(false);
  });

  it("is true when a bound draft diverges from its saved batch", () => {
    const editedTitle: Batch = { ...savedBatchToBatch(saved), title: "Test batch (edited)" };
    const editedRows: Batch = {
      ...savedBatchToBatch(saved),
      recipes: [{ name: "Vanilla", rows: [["Whole Milk", 700]], color: CategoryColor.Blue }],
    };
    expect(batchHasUnsavedChanges(editedTitle, 7, [saved])).toBe(true);
    expect(batchHasUnsavedChanges(editedRows, 7, [saved])).toBe(true);
  });

  it("treats a draft bound to a now-missing batch as unsaved when it holds content", () => {
    expect(batchHasUnsavedChanges(savedBatchToBatch(saved), 7, [])).toBe(true);
  });
});

describe("batchMatchesQuery — what a saved-batch search matches", () => {
  const saved: SavedBatchJson = {
    id: 1,
    title: "Sunday gelato",
    date: "2026-07-19",
    notes: "Age overnight, churn cold",
    recipes: [
      { name: "Fior di latte", rows: [["Whole Milk", 600]] },
      { name: "Pistachio", rows: [["Pistachio paste", 120]] },
    ],
    createdAt: "",
    updatedAt: "",
  };

  // `q` arrives already lowercased from the caller, so cases only pass lowercase queries.
  it.each([
    ["title", "gelato"],
    ["date", "2026-07"],
    ["notes", "churn"],
    ["recipe name", "fior"],
    ["ingredient name", "pistachio paste"],
  ])("matches on %s", (_field, q) => {
    expect(batchMatchesQuery(saved, q)).toBe(true);
  });

  it("does not match text absent from every searched field", () => {
    expect(batchMatchesQuery(saved, "strawberry")).toBe(false);
  });

  it("treats absent title and notes as empty rather than throwing", () => {
    const bare: SavedBatchJson = {
      id: 2,
      date: "2026-07-19",
      recipes: [{ name: "Base", rows: [["Sugar", 100]] }],
      createdAt: "",
      updatedAt: "",
    };
    expect(batchMatchesQuery(bare, "base")).toBe(true);
    expect(batchMatchesQuery(bare, "gelato")).toBe(false);
  });
});
