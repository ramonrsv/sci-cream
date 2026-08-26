import { expect, test, describe, beforeEach, vi } from "vitest";

/**
 * Identity reaches these actions only through `auth()`, so that is what is mocked:
 * every test drives the real query path and only swaps who is signed in.
 */

/** Who `auth()` reports as signed in; `undefined` is an anonymous request. */
const session = vi.hoisted(() => ({ email: undefined as string | undefined }));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => (session.email ? { user: { email: session.email } } : null)),
}));

import { eq, sql } from "drizzle-orm";

import { createUserRecipe, deleteUserRecipe } from "@/lib/data/recipes";
import {
  createUserBatch,
  fetchAllUserBatches,
  updateUserBatch,
  setUserBatchFavourite,
  deleteUserBatch,
  BatchInput,
  SavedBatchJson,
} from "@/lib/data/batches";

/** The shared client, for asserting on child rows the server actions never surface on their own. */
import { db } from "@/lib/database/client";
import { batchRecipesTable } from "@/lib/database/schema";

import { TEST_USER_A, TEST_USER_B } from "@/lib/database/assets";

/** Sign in as the given test user for the rest of the test; no argument signs out. */
function signInAs(email?: string) {
  session.email = email;
}

// Every test acts as TEST_USER_B unless it says otherwise; the anonymous cases sign out first.
beforeEach(() => {
  signInAs(TEST_USER_B.email);
});

/** Fetch one of TEST_USER_B's batches by id, or `undefined` when it is not present. */
async function fetchBatchById(id: number): Promise<SavedBatchJson | undefined> {
  const all = await fetchAllUserBatches();
  return all?.find((batch) => batch.id === id);
}

/** Count the `batch_recipes` rows belonging to a batch, straight from the table. */
async function countBatchRecipes(batchId: number): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(batchRecipesTable)
    .where(eq(batchRecipesTable.batchId, batchId));
  return Number(count);
}

/** A batch with two recipes, distinct colors, and no provenance refs. */
function makeBatchInput(title: string): BatchInput {
  return {
    title,
    date: "2026-07-20",
    notes: "age overnight",
    recipes: [
      {
        name: "Vanilla",
        rows: [
          ["Whole Milk", 600],
          ["Sugar", 150],
        ],
        color: "Blue",
      },
      {
        name: "Chocolate",
        rows: [
          ["Whole Milk", 500],
          ["Cocoa", 80],
        ],
        color: "Green",
      },
    ],
  };
}

describe("createUserBatch", () => {
  test("returns undefined for an anonymous caller", async () => {
    signInAs();
    const result = await createUserBatch(makeBatchInput("X"));
    expect(result).toBeUndefined();
  });

  test("creates a batch and round-trips recipes, positions, and colors, then cleans up", async () => {
    const input = makeBatchInput("Create Round-trip Test Batch");

    const created = await createUserBatch(input);
    expect(created).toBeDefined();
    expect(created!.title).toBe(input.title);
    expect(created!.date).toBe(input.date);
    expect(created!.notes).toBe(input.notes);
    expect(created!.recipes).toEqual(input.recipes);

    try {
      const found = await fetchBatchById(created!.id);
      expect(found).toBeDefined();
      // Recipes come back in weighing order, colors and rows intact.
      expect(found!.recipes.map((r) => r.name)).toEqual(["Vanilla", "Chocolate"]);
      expect(found!.recipes[0].color).toBe("Blue");
      expect(found!.recipes[1].rows).toEqual([
        ["Whole Milk", 500],
        ["Cocoa", 80],
      ]);
    } finally {
      await deleteUserBatch(created!.id);
    }
  });
});

describe("updateUserBatch", () => {
  test("returns undefined for an anonymous caller", async () => {
    signInAs();
    const result = await updateUserBatch(1, makeBatchInput("X"));
    expect(result).toBeUndefined();
  });

  test("returns undefined for a batch the user does not own", async () => {
    const result = await updateUserBatch(999_999_999, makeBatchInput("X"));
    expect(result).toBeUndefined();
  });

  test("replaces the recipes in place and keeps the batch id, then cleans up", async () => {
    const created = await createUserBatch(makeBatchInput("Update Test Batch"));
    expect(created).toBeDefined();

    try {
      const updated = await updateUserBatch(created!.id, {
        title: "Renamed batch",
        date: "2026-07-21",
        recipes: [{ name: "Strawberry", rows: [["Whole Milk", 400]], color: "Pink" }],
      });
      expect(updated).toBeDefined();
      expect(updated!.id).toBe(created!.id);
      expect(updated!.title).toBe("Renamed batch");
      expect(updated!.notes).toBeUndefined();
      expect(updated!.recipes).toEqual([
        { name: "Strawberry", rows: [["Whole Milk", 400]], color: "Pink" },
      ]);
      expect(Date.parse(updated!.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created!.createdAt));

      // The replacement is durable, not just reflected in the return value.
      const found = await fetchBatchById(created!.id);
      expect(found!.recipes).toHaveLength(1);
      expect(found!.recipes[0].name).toBe("Strawberry");
    } finally {
      await deleteUserBatch(created!.id);
    }
  });
});

describe("setUserBatchFavourite", () => {
  test("returns undefined for an anonymous caller", async () => {
    signInAs();
    const result = await setUserBatchFavourite(1, true);
    expect(result).toBeUndefined();
  });

  test("returns undefined when the batch is not owned by the user", async () => {
    const result = await setUserBatchFavourite(999_999_999, true);
    expect(result).toBeUndefined();
  });

  test("stars and unstars a user-owned batch round-trip", async () => {
    const created = await createUserBatch(makeBatchInput("Favourite Batch"));
    expect(created).toBeDefined();

    try {
      const starred = await setUserBatchFavourite(created!.id, true);
      expect(starred?.favourite).toBe(true);
      expect((await fetchBatchById(created!.id))?.favourite).toBe(true);

      const cleared = await setUserBatchFavourite(created!.id, false);
      expect(cleared?.favourite).toBe(false);
      expect(await fetchBatchById(created!.id)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserBatch(created!.id);
    }
  });

  test("starts unstarred, so a new batch never arrives pre-starred", async () => {
    const created = await createUserBatch(makeBatchInput("Unstarred Batch"));
    expect(created).toBeDefined();

    try {
      expect(created).not.toHaveProperty("favourite");
      expect(await fetchBatchById(created!.id)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserBatch(created!.id);
    }
  });

  /**
   * The reason the star has its own action: `updateUserBatch` replaces a batch wholesale from a
   * client-supplied `BatchInput`. If the star travelled in that input, an editor holding a copy
   * loaded before the star was set would clear it on the next save.
   */
  test("survives a full updateUserBatch, which knows nothing about the star", async () => {
    const created = await createUserBatch(makeBatchInput("Starred Then Edited"));
    expect(created).toBeDefined();

    try {
      await setUserBatchFavourite(created!.id, true);

      const edited = await updateUserBatch(created!.id, {
        ...makeBatchInput("Starred Then Edited"),
        notes: "edited after starring",
      });
      expect(edited?.notes).toBe("edited after starring");
      expect(edited?.favourite).toBe(true);
      expect((await fetchBatchById(created!.id))?.favourite).toBe(true);
    } finally {
      await deleteUserBatch(created!.id);
    }
  });
});

describe("deleteUserBatch", () => {
  test("returns undefined for an anonymous caller", async () => {
    signInAs();
    const result = await deleteUserBatch(1);
    expect(result).toBeUndefined();
  });

  test("returns undefined when no matching batch exists", async () => {
    const result = await deleteUserBatch(999_999_999);
    expect(result).toBeUndefined();
  });

  test("deletes a batch and cascades to its recipes", async () => {
    const created = await createUserBatch(makeBatchInput("Delete Test Batch"));
    expect(created).toBeDefined();
    // The two-recipe input wrote child rows, so the cascade below has something to clear.
    expect(await countBatchRecipes(created!.id)).toBe(2);

    const deleted = await deleteUserBatch(created!.id);
    expect(deleted).toBeDefined();
    expect(deleted!.id).toBe(created!.id);

    // The batch is gone, and the FK cascade left no orphaned `batch_recipes` rows behind.
    expect(await fetchBatchById(created!.id)).toBeUndefined();
    expect(await countBatchRecipes(created!.id)).toBe(0);
  });
});

describe("batch recipe provenance", () => {
  test("nulls a recipe's ref when its source recipe version is deleted, keeping rows", async () => {
    const recipe = await createUserRecipe("Batch Provenance Source", [["Whole Milk", 100]]);
    expect(recipe).toBeDefined();
    const ref = { recipeId: recipe!.recipeId, versionNumber: recipe!.version.version };

    const created = await createUserBatch({
      date: "2026-07-20",
      recipes: [{ name: "From saved", rows: [["Whole Milk", 100]], version: { ref } }],
    });
    expect(created).toBeDefined();

    try {
      // The provenance ref survives the round-trip while the source still exists.
      expect((await fetchBatchById(created!.id))!.recipes[0].version).toEqual({ ref });

      // Deleting the source recipe cascades to its versions; the composite FK nulls both provenance
      // columns together, so the ref disappears but the weighed rows are untouched.
      await deleteUserRecipe(recipe!.recipeId);

      const afterDelete = await fetchBatchById(created!.id);
      expect(afterDelete!.recipes[0].version).toBeUndefined();
      expect(afterDelete!.recipes[0].rows).toEqual([["Whole Milk", 100]]);
    } finally {
      await deleteUserBatch(created!.id);
    }
  });

  test("keeps the opted-in version name and sibling hint once the source version is deleted", async () => {
    const recipe = await createUserRecipe("Batch Provenance Named Source", [["Whole Milk", 100]]);
    expect(recipe).toBeDefined();
    const ref = { recipeId: recipe!.recipeId, versionNumber: recipe!.version.version };

    const created = await createUserBatch({
      date: "2026-07-20",
      recipes: [
        {
          name: "From saved",
          rows: [["Whole Milk", 100]],
          version: { ref, name: "2.1", hasSiblings: true },
        },
      ],
    });
    expect(created).toBeDefined();

    try {
      await deleteUserRecipe(recipe!.recipeId);

      // `name`/`hasSiblings` are separate columns from the ref, so they outlive its "set null".
      const afterDelete = await fetchBatchById(created!.id);
      expect(afterDelete!.recipes[0].version).toEqual({ name: "2.1", hasSiblings: true });
    } finally {
      await deleteUserBatch(created!.id);
    }
  });
});

describe("identity", () => {
  test("a batch created while signed in as one user is unreachable as another", async () => {
    const created = await createUserBatch(makeBatchInput("Cross User Isolation Test Batch"));
    expect(created).toBeDefined();
    const { id } = created!;

    try {
      // Signing in as A is the whole of the change: no argument here names a user.
      signInAs(TEST_USER_A.email);

      expect((await fetchAllUserBatches())!.some((batch) => batch.id === id)).toBe(false);
      expect(await updateUserBatch(id, makeBatchInput("Stolen"))).toBeUndefined();
      expect(await setUserBatchFavourite(id, true)).toBeUndefined();
      expect(await deleteUserBatch(id)).toBeUndefined();

      // The owner still sees it exactly as it was left.
      signInAs(TEST_USER_B.email);
      const mine = await fetchBatchById(id);
      expect(mine).toBeDefined();
      expect(mine!.title).toBe("Cross User Isolation Test Batch");
      expect(mine!.favourite).toBeUndefined();
      expect(await countBatchRecipes(id)).toBe(2);
    } finally {
      signInAs(TEST_USER_B.email);
      await deleteUserBatch(id);
    }
  });
});
