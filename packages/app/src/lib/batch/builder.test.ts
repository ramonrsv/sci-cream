import { describe, it, expect } from "vitest";

import {
  type BatchSelection,
  type RecipeSnapshot,
  type AddableRecipe,
  batchHasUnsavedChanges,
  batchMatchesQuery,
  findVersionChoice,
  batchToInput,
  isInlineSelection,
  makeBatchFromSelection,
  readSavedSources,
  savedBatchToBatch,
  selectionFromSavedBatch,
} from "./builder";
import { type Batch, displayVersion } from "@/lib/batch/batch";
import type { SavedRecipeJson, SavedRecipeVersionJson } from "@/lib/data/recipes";
import type { SavedBatchJson } from "@/lib/data/batches";
import { Rating } from "@/lib/rating";
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

/** The one-item selection used by most cases, carrying the given version inline. */
function selectOnly(source: RecipeSnapshot): BatchSelection {
  return { date: "2026-07-18", items: [{ recipe: source }] };
}

/** Find one saved version by its number, failing loudly when the test's fixture is wrong. */
function versionByNumber(sources: AddableRecipe[], number: number): RecipeSnapshot {
  const entry = sources
    .flatMap((s) => s.versions)
    .find((v) => v.version?.ref?.versionNumber === number);
  if (entry === undefined) throw new Error(`no version numbered ${String(number)}`);
  return entry;
}

/** The saved version numbers of some picker entries, in the order they are offered. */
function versionNumbers(entries: readonly RecipeSnapshot[]) {
  return entries.map((v) => v.version?.ref?.versionNumber);
}

describe("readSavedSources — one picker line per recipe", () => {
  it("leaves a recipe holding a single version unqualified", () => {
    const sources = readSavedSources([savedRecipe(1, "My Gelato", [1])]);

    expect(sources).toHaveLength(1);
    expect(sources[0]?.detail).toBeUndefined();
    expect(sources[0]?.versions).toHaveLength(1);
  });

  it("qualifies a multi-version recipe by its count, still on one line", () => {
    const sources = readSavedSources([savedRecipe(1, "My Gelato", [1, 2, 3])]);

    expect(sources).toHaveLength(1);
    expect(sources[0]?.detail).toBe("3 versions");
    // Newest first, so adding the recipe takes the latest version
    expect(versionNumbers(sources[0].versions)).toEqual([3, 2, 1]);
    expect(sources[0]?.versions.every((v) => v.version?.hasSiblings)).toBe(true);
  });

  it("decides per recipe, not across the whole list", () => {
    const sources = readSavedSources([
      savedRecipe(1, "Single", [1]),
      savedRecipe(2, "Multi", [1, 2]),
    ]);

    expect(sources.map((s) => [s.name, s.detail])).toEqual([
      ["Single", undefined],
      ["Multi", "2 versions"],
    ]);
  });

  it("builds each version ready to weigh: name, rows, and where it came from", () => {
    const [source] = readSavedSources([savedRecipe(1, "My Gelato", [1, 2])]);

    expect(source.versions[0]).toEqual({
      name: "My Gelato",
      rows: [["Whole Milk", 200]],
      version: { ref: { recipeId: 1, versionNumber: 2 }, hasSiblings: true },
    });
  });

  it("carries a version's opted-in name along, for the picker to label it with", () => {
    const recipe: SavedRecipeJson = {
      id: 1,
      name: "My Gelato",
      versions: [version(1), version(2, "2.1")],
    };
    const sources = readSavedSources([recipe]);

    expect(versionNumbers(sources[0].versions)).toEqual([2, 1]);
    expect(sources[0]?.versions.map((v) => v.version?.name)).toEqual(["2.1", undefined]);
  });
});

describe("readSavedSources — version ratings for the picker", () => {
  /** A saved recipe whose versions carry the given ratings, indexed from version 1. */
  function ratedRecipe(ratings: (Rating | undefined)[]): SavedRecipeJson {
    return {
      id: 1,
      name: "My Gelato",
      versions: ratings.map((rating, idx) => ({
        ...version(idx + 1),
        ...(rating === undefined ? {} : { rating }),
      })),
    };
  }

  it("carries each version's rating onto its snapshot, newest first", () => {
    const sources = readSavedSources([ratedRecipe([Rating.Bad, Rating.Great])]);

    expect(sources[0].versions.map((v) => v.rating)).toEqual([Rating.Great, Rating.Bad]);
  });

  it("leaves an unrated version's snapshot without a rating", () => {
    const sources = readSavedSources([ratedRecipe([undefined])]);

    expect(sources[0].versions[0]).not.toHaveProperty("rating");
  });

  // The rating is live opinion; `version` is the part frozen into `batch_recipes`, so it stays out.
  it("keeps the rating out of the persisted version snapshot", () => {
    const sources = readSavedSources([ratedRecipe([Rating.Great])]);

    expect(sources[0].versions[0].version).not.toHaveProperty("rating");
  });
});

describe("findVersionChoice — when a builder row offers a version switch", () => {
  const sources = readSavedSources([
    savedRecipe(1, "Multi", [1, 2, 3]),
    savedRecipe(2, "Single", [1]),
  ]);

  it("offers the live source's versions, marking the one the row holds", () => {
    const choice = findVersionChoice(sources, versionByNumber(sources, 2));

    expect(versionNumbers(choice?.versions ?? [])).toEqual([3, 2, 1]);
    expect(choice?.current.version?.ref?.versionNumber).toBe(2);
  });

  it("offers nothing for a recipe whose source has only one version", () => {
    expect(findVersionChoice(sources, versionByNumber(sources, 1))).toBeDefined();
    const single = sources[1].versions[0];

    expect(findVersionChoice(sources, single)).toBeUndefined();
  });

  it("offers nothing for a calculator slot or a link-decoded recipe, which carry no ref", () => {
    expect(findVersionChoice(sources, { name: "R1", rows: [["Sugar", 50]] })).toBeUndefined();
    expect(
      findVersionChoice(sources, { name: "Multi", rows: [], version: { name: "2.1" } }),
    ).toBeUndefined();
  });

  it("offers nothing once the source recipe is gone", () => {
    const orphan = versionByNumber(sources, 2);

    expect(findVersionChoice([], orphan)).toBeUndefined();
  });

  it("offers nothing once the row's own version is deleted, leaving it unplaceable", () => {
    // The row still reports what was weighed; it just can no longer say which of the survivors
    // it sits on, so there is nothing to switch away from.
    const stale = versionByNumber(sources, 2);
    const trimmed = readSavedSources([savedRecipe(1, "Multi", [1, 3])]);

    expect(findVersionChoice(trimmed, stale)).toBeUndefined();
  });

  it("offers a switch to a row snapshotted before its recipe gained a second version", () => {
    // `hasSiblings` froze as false at add time; the live source is what decides.
    const lone = readSavedSources([savedRecipe(1, "Multi", [1])])[0].versions[0];

    expect(lone.version?.hasSiblings).toBe(false);
    expect(findVersionChoice(sources, lone)?.current.version?.ref?.versionNumber).toBe(1);
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

    expect(only.detail).toBeUndefined();
    expect(displayVersion(only.versions[0]?.version)).toBe(3);
  });

  it("prefers an opted-in name over the number, even for the default version", () => {
    expect(displayVersion({ ref: { recipeId: 1, versionNumber: 1 }, name: "1.0" })).toBe("1.0");
  });

  it("shows the default version's number too, once the recipe has other versions", () => {
    expect(displayVersion({ ref: { recipeId: 1, versionNumber: 1 }, hasSiblings: true })).toBe(1);
  });
});

describe("makeBatchFromSelection — name and version stay separate", () => {
  /** The batch built from the numbered version of "My Gelato". */
  const batchFromVersion = (number: number) => {
    const sources = readSavedSources([savedRecipe(1, "My Gelato", [1, 2])]);
    return makeBatchFromSelection(selectOnly(versionByNumber(sources, number)));
  };

  it("leaves the version out of the name, which the badge carries instead", () => {
    expect(batchFromVersion(2).recipes.map((r) => r.name)).toEqual(["My Gelato"]);
  });

  it("records the version in `ref`, where the badge reads it from", () => {
    const batch = batchFromVersion(2);

    expect(batch.recipes[0]?.version?.ref).toEqual({ recipeId: 1, versionNumber: 2 });
    expect(displayVersion(batch.recipes[0]?.version)).toBe(2);
  });

  it("badges the default version too, once its recipe has other versions", () => {
    // "My Gelato" has a v2 alongside this v1, so v1 is no longer the unambiguous common case.
    expect(displayVersion(batchFromVersion(1).recipes[0]?.version)).toBe(1);
  });

  it("carries an opted-in version name from the source onto the batch recipe", () => {
    const recipe: SavedRecipeJson = {
      id: 1,
      name: "My Gelato",
      versions: [version(1), version(2, "2.1")],
    };
    const sources = readSavedSources([recipe]);
    const batch = makeBatchFromSelection(selectOnly(versionByNumber(sources, 2)));

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
        version: { ref: { recipeId: 5, versionNumber: 2 }, name: "2.1", hasSiblings: true },
      },
      { name: "Sorbet", rows: [["Sugar", 100]] },
    ],
  };

  it("projects a batch onto the wire shape, snapshotting version as-is", () => {
    expect(batchToInput(batch)).toEqual({
      title: "Test batch",
      date: "2026-07-20",
      notes: "age overnight",
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 600]],
          color: "Blue",
          version: { ref: { recipeId: 5, versionNumber: 2 }, name: "2.1", hasSiblings: true },
        },
        { name: "Sorbet", rows: [["Sugar", 100]] },
      ],
    });
  });

  // A rating is live display data, so saving must not carry it into the batch's stored rows.
  it("drops a source version's rating rather than persisting it with the batch", () => {
    const rated: Batch = {
      date: "2026-07-20",
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 600]],
          version: { ref: { recipeId: 5, versionNumber: 2 }, hasSiblings: true },
          rating: Rating.Great,
        } as Batch["recipes"][number],
      ],
    };

    expect(batchToInput(rated).recipes[0]).not.toHaveProperty("rating");
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

  it("round-trips a saved batch's version hints back into a derived Batch for display", () => {
    const saved: SavedBatchJson = {
      id: 7,
      date: "2026-07-20",
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 600]],
          color: "Green",
          version: { ref: { recipeId: 5, versionNumber: 2 }, name: "2.1", hasSiblings: true },
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
        version: { ref: { recipeId: 5, versionNumber: 2 }, name: "2.1", hasSiblings: true },
      },
    ]);
  });

  it("keeps the opted-in name once the ref is gone, as when the source version is deleted", () => {
    // No `ref`: the FK's `set null` already cleared it, but versionName/hasSiblings are separate
    // columns and outlive it — see the schema comment on `batchRecipesTable`.
    const saved: SavedBatchJson = {
      id: 7,
      date: "2026-07-20",
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 600]],
          version: { name: "2.1", hasSiblings: true },
        },
      ],
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    };

    expect(savedBatchToBatch(saved).recipes[0]?.version).toEqual({
      name: "2.1",
      hasSiblings: true,
    });
    expect(displayVersion(savedBatchToBatch(saved).recipes[0]?.version)).toBe("2.1");
  });

  it("carries no version at all for a recipe that never had one", () => {
    const saved: SavedBatchJson = {
      id: 7,
      date: "2026-07-20",
      recipes: [{ name: "Vanilla", rows: [["Whole Milk", 600]] }],
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    };

    expect(savedBatchToBatch(saved).recipes[0]?.version).toBeUndefined();
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
