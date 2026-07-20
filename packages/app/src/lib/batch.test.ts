import { describe, it, expect, beforeEach } from "vitest";

import {
  MAX_BATCH_RECIPES,
  MAX_STORED_CHECKLISTS,
  type Batch,
  batchChecklistKey,
  batchRecipeColor,
  batchRecipeLetter,
  canonicalBatchContent,
  cellKey,
  fnv1a32,
  mergeBatchRows,
  todayIsoDate,
  touchChecklist,
} from "./batch";
import { STORAGE_KEYS, getLocalStorage, setLocalStorage } from "./local-storage";
import { CATEGORY_COLORS, CategoryColor } from "./styles/colors";

/** A two-recipe batch sharing one ingredient, so merging and totals are exercised by default. */
function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    date: "2026-07-18",
    recipes: [
      {
        name: "Strawberry Sorbet",
        rows: [
          ["Strawberry", 300],
          ["Sucrose", 100],
        ],
      },
      {
        name: "Vanilla Base",
        rows: [
          ["3.25% Milk", 500],
          ["Sucrose", 120],
        ],
      },
    ],
    ...overrides,
  };
}

describe("mergeBatchRows", () => {
  it("merges by exact name in first-appearance order, summing totals", () => {
    const merged = mergeBatchRows(makeBatch().recipes);
    expect(merged.map((r) => r.name)).toEqual(["Strawberry", "Sucrose", "3.25% Milk"]);

    const sucrose = merged.find((r) => r.name === "Sucrose");
    expect(sucrose).toMatchObject({
      total: 220,
      cells: [
        { recipeIndex: 0, quantity: 100 },
        { recipeIndex: 1, quantity: 120 },
      ],
    });
  });

  it("degenerates cleanly to one cell for a single-recipe batch", () => {
    const merged = mergeBatchRows([{ name: "Only", rows: [["Sucrose", 50]] }]);
    expect(merged).toEqual([
      { name: "Sucrose", total: 50, cells: [{ recipeIndex: 0, quantity: 50 }] },
    ]);
  });

  it("sums a name repeated within one recipe into that recipe's single cell", () => {
    const merged = mergeBatchRows([
      {
        name: "Dup",
        rows: [
          ["Sucrose", 10],
          ["Sucrose", 5],
        ],
      },
    ]);
    expect(merged).toEqual([
      { name: "Sucrose", total: 15, cells: [{ recipeIndex: 0, quantity: 15 }] },
    ]);
  });

  it("treats names differing in case or whitespace as distinct ingredients", () => {
    const merged = mergeBatchRows([
      {
        name: "R",
        rows: [
          ["Sucrose", 1],
          ["sucrose", 2],
          ["Sucrose ", 3],
        ],
      },
    ]);
    expect(merged.map((r) => r.name)).toEqual(["Sucrose", "sucrose", "Sucrose "]);
  });

  it("returns nothing for an empty batch", () => {
    expect(mergeBatchRows([])).toEqual([]);
  });
});

describe("batchRecipeColor", () => {
  const rows: Batch["recipes"][number]["rows"] = [["Sucrose", 100]];

  it("gives an unpicked recipe the hue its position earns", () => {
    expect(batchRecipeColor({ name: "A", rows }, 0)).toBe(CATEGORY_COLORS[0]);
    expect(batchRecipeColor({ name: "B", rows }, 1)).toBe(CATEGORY_COLORS[1]);
  });

  it("prefers the owner's pick over the positional hue", () => {
    const picked = { name: "A", rows, color: CategoryColor.Black };
    expect(batchRecipeColor(picked, 0)).toBe(CategoryColor.Black);
  });

  // The achromatic pair sits past the cap rather than in a list of its own, so a full batch is
  // what proves a default never reaches it.
  it("keeps every default in a full batch chromatic", () => {
    const defaults = Array.from({ length: MAX_BATCH_RECIPES }, (_, i) =>
      batchRecipeColor({ name: "A", rows }, i),
    );
    expect(defaults).not.toContain(CategoryColor.White);
    expect(defaults).not.toContain(CategoryColor.Black);
    expect(new Set(defaults).size).toBe(MAX_BATCH_RECIPES);
  });

  it("wraps past the palette, since the batch cap and the palette can drift apart", () => {
    const wrapped = batchRecipeColor({ name: "A", rows }, CATEGORY_COLORS.length);
    expect(wrapped).toBe(CATEGORY_COLORS[0]);
  });
});

describe("batchRecipeLetter / cellKey", () => {
  it("labels recipes A, B, C by position", () => {
    expect([0, 1, 2, 7].map(batchRecipeLetter)).toEqual(["A", "B", "C", "H"]);
  });

  it("keys a cell by recipe index and ingredient name", () => {
    expect(cellKey("Sucrose", 1)).toBe("1:Sucrose");
    // Distinct recipes never share a cell key for the same ingredient
    expect(cellKey("Sucrose", 0)).not.toBe(cellKey("Sucrose", 1));
  });
});

describe("todayIsoDate", () => {
  it("returns a valid local YYYY-MM-DD date", () => {
    const today = todayIsoDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Local, not UTC: must agree with the local calendar day rather than the ISO/UTC one
    const now = new Date();
    expect(today).toBe(
      `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate(),
      ).padStart(2, "0")}`,
    );
  });
});

describe("canonicalBatchContent", () => {
  it("is stable across edits that do not change what gets weighed", () => {
    const base = canonicalBatchContent(makeBatch());
    expect(canonicalBatchContent(makeBatch({ title: "Renamed" }))).toBe(base);
    expect(canonicalBatchContent(makeBatch({ notes: "Churn at -6 °C" }))).toBe(base);
    expect(canonicalBatchContent(makeBatch({ date: "2030-01-01" }))).toBe(base);
  });

  it("ignores color, so recoloring a recipe never discards weighing progress", () => {
    const recolored = makeBatch();
    recolored.recipes[0]!.color = CategoryColor.White;
    expect(canonicalBatchContent(recolored)).toBe(canonicalBatchContent(makeBatch()));
  });

  it("ignores provenance, so owner and recipient agree on the same weighing content", () => {
    const owner = makeBatch();
    owner.recipes[0]!.ref = { recipeId: 7, versionNumber: 3 };
    expect(canonicalBatchContent(owner)).toBe(canonicalBatchContent(makeBatch()));
  });

  it("changes when a quantity, an ingredient name, or a recipe name changes", () => {
    const base = canonicalBatchContent(makeBatch());

    const qty = makeBatch();
    qty.recipes[0]!.rows[0] = ["Strawberry", 301];
    expect(canonicalBatchContent(qty)).not.toBe(base);

    const ingredient = makeBatch();
    ingredient.recipes[0]!.rows[0] = ["Raspberry", 300];
    expect(canonicalBatchContent(ingredient)).not.toBe(base);

    const renamed = makeBatch();
    renamed.recipes[0]!.name = "Raspberry Sorbet";
    expect(canonicalBatchContent(renamed)).not.toBe(base);
  });

  it("changes when recipes are reordered, since order drives letters and hues", () => {
    const reordered = makeBatch();
    reordered.recipes.reverse();
    expect(canonicalBatchContent(reordered)).not.toBe(canonicalBatchContent(makeBatch()));
  });

  it("normalizes float noise from scaling", () => {
    const noisy = makeBatch();
    noisy.recipes[0]!.rows[0] = ["Strawberry", 300.0000000001];
    expect(canonicalBatchContent(noisy)).toBe(canonicalBatchContent(makeBatch()));
  });

  it("separates fields with control characters a name cannot forge", () => {
    // A name containing the delimiters would otherwise let one row impersonate two.
    const forged = makeBatch();
    forged.recipes = [{ name: "A", rows: [["X=1\u001fY", 1]] }];
    const honest = makeBatch();
    honest.recipes = [
      { name: "A", rows: [["X", 1]] },
      { name: "Y", rows: [["", 1]] },
    ];
    expect(canonicalBatchContent(forged)).not.toBe(canonicalBatchContent(honest));
  });
});

describe("fnv1a32", () => {
  it("is deterministic and differs for differing input", () => {
    expect(fnv1a32("abc")).toBe(fnv1a32("abc"));
    expect(fnv1a32("abc")).not.toBe(fnv1a32("abd"));
  });

  it("stays a 32-bit base-36 string even for long input", () => {
    // Guards the Math.imul requirement: plain `*` overflows and degenerates the hash.
    const hash = fnv1a32("x".repeat(10_000));
    expect(hash).toMatch(/^[0-9a-z]+$/);
    expect(Number.parseInt(hash, 36)).toBeLessThan(2 ** 32);
  });
});

describe("batchChecklistKey", () => {
  it("is identical for owner and recipient, and prefixed to avoid the index key", () => {
    const key = batchChecklistKey(makeBatch());
    expect(key.startsWith(`${STORAGE_KEYS.makeRecipeChecklist}:h`)).toBe(true);
    expect(key).not.toBe(`${STORAGE_KEYS.makeRecipeChecklist}:index`);
  });

  it("survives a notes edit but not a quantity edit", () => {
    const key = batchChecklistKey(makeBatch());
    expect(batchChecklistKey(makeBatch({ notes: "Added later" }))).toBe(key);

    const edited = makeBatch();
    edited.recipes[0]!.rows[0] = ["Strawberry", 350];
    expect(batchChecklistKey(edited)).not.toBe(key);
  });
});

describe("touchChecklist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("records the most recently used checklist first", () => {
    touchChecklist("a");
    touchChecklist("b");
    touchChecklist("a");
    expect(getLocalStorage<string[]>(`${STORAGE_KEYS.makeRecipeChecklist}:index`)).toEqual([
      "a",
      "b",
    ]);
  });

  it("evicts the least recently used checklists past the cap, removing their data", () => {
    for (let i = 0; i < MAX_STORED_CHECKLISTS; i++) {
      setLocalStorage(`key-${String(i)}`, { checked: [i] });
      touchChecklist(`key-${String(i)}`);
    }
    // key-0 is now least recently used; one more entry must evict exactly it
    touchChecklist("key-new");

    const index = getLocalStorage<string[]>(`${STORAGE_KEYS.makeRecipeChecklist}:index`);
    expect(index).toHaveLength(MAX_STORED_CHECKLISTS);
    expect(index).not.toContain("key-0");
    expect(index?.[0]).toBe("key-new");
    expect(getLocalStorage("key-0")).toBeNull();
    expect(getLocalStorage("key-1")).not.toBeNull();
  });
});
