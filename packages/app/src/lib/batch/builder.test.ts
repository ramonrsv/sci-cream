import { describe, it, expect } from "vitest";

import {
  type BatchSelection,
  batchToInput,
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

/** The one-item selection used by most cases. */
function selectOnly(sourceId: string): BatchSelection {
  return { date: "2026-07-18", items: [{ sourceId }] };
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
    const source = sources.find((s) => s.detail === detail);
    return makeBatchFromSelection(selectOnly(source?.id ?? ""), sources);
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
    const source = sources.find((s) => s.detail === "v2.1");
    const batch = makeBatchFromSelection(selectOnly(source?.id ?? ""), sources);

    expect(batch.recipes[0]?.version?.name).toBe("2.1");
    expect(displayVersion(batch.recipes[0]?.version)).toBe("2.1");
  });
});

describe("makeBatchFromSelection — inline recipes vs. live sources", () => {
  it("uses an inline recipe as-is, with no live source to resolve against", () => {
    const selection: BatchSelection = {
      date: "2026-07-20",
      items: [
        { color: CategoryColor.Blue, recipe: { name: "Loaded", rows: [["Whole Milk", 300]] } },
      ],
    };

    const batch = makeBatchFromSelection(selection, []);
    expect(batch.recipes).toEqual([
      { name: "Loaded", rows: [["Whole Milk", 300]], color: CategoryColor.Blue },
    ]);
  });

  it("prefers the inline recipe even when the item also names a source id", () => {
    const sources = readSavedSources([savedRecipe(1, "My Gelato", [1])]);
    const selection: BatchSelection = {
      date: "2026-07-20",
      items: [{ sourceId: sources[0].id, recipe: { name: "Inline wins", rows: [["Sugar", 10]] } }],
    };

    expect(makeBatchFromSelection(selection, sources).recipes[0].name).toBe("Inline wins");
  });

  it("still drops a source-ref item whose source has since disappeared", () => {
    const selection: BatchSelection = { date: "2026-07-20", items: [{ sourceId: "slot:9" }] };

    expect(makeBatchFromSelection(selection, []).recipes).toEqual([]);
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
