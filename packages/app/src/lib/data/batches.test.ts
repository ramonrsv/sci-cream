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
import { DataError } from "@/lib/result";

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
  const all = expectOk(await fetchAllUserBatches());
  return all.find((batch) => batch.id === id);
}

/** Count the `batch_recipes` rows belonging to a batch, straight from the table. */
async function countBatchRecipes(batchId: number): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(batchRecipesTable)
    .where(eq(batchRecipesTable.batchId, batchId));
  return Number(count);
}

/** The value of a successful result; fails the test naming the refusal otherwise. */
function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected success, was refused with: ${String(result.error)}`);
  return result.value;
}

/** Assert an action refused, and for the stated reason rather than merely for some reason. */
function expectRefused(result: { ok: boolean }, error: unknown): void {
  expect(result).toEqual({ ok: false, error });
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
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await createUserBatch(makeBatchInput("X"));
    expectRefused(result, DataError.Unauthenticated);
  });

  test("creates a batch and round-trips recipes, positions, and colors, then cleans up", async () => {
    const input = makeBatchInput("Create Round-trip Test Batch");

    const created = expectOk(await createUserBatch(input));
    expect(created.title).toBe(input.title);
    expect(created.date).toBe(input.date);
    expect(created.notes).toBe(input.notes);
    expect(created.recipes).toEqual(input.recipes);

    try {
      const found = await fetchBatchById(created.id);
      expect(found).toBeDefined();
      // Recipes come back in weighing order, colors and rows intact.
      expect(found!.recipes.map((r) => r.name)).toEqual(["Vanilla", "Chocolate"]);
      expect(found!.recipes[0].color).toBe("Blue");
      expect(found!.recipes[1].rows).toEqual([
        ["Whole Milk", 500],
        ["Cocoa", 80],
      ]);
    } finally {
      await deleteUserBatch(created.id);
    }
  });
});

describe("updateUserBatch", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await updateUserBatch(1, makeBatchInput("X"));
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses a batch the user does not own", async () => {
    const result = await updateUserBatch(999_999_999, makeBatchInput("X"));
    expectRefused(result, DataError.Forbidden);
  });

  test("replaces the recipes in place and keeps the batch id, then cleans up", async () => {
    const created = expectOk(await createUserBatch(makeBatchInput("Update Test Batch")));

    try {
      const updated = expectOk(
        await updateUserBatch(created.id, {
          title: "Renamed batch",
          date: "2026-07-21",
          recipes: [{ name: "Strawberry", rows: [["Whole Milk", 400]], color: "Pink" }],
        }),
      );
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe("Renamed batch");
      expect(updated.notes).toBeUndefined();
      expect(updated.recipes).toEqual([
        { name: "Strawberry", rows: [["Whole Milk", 400]], color: "Pink" },
      ]);
      expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.createdAt));

      // The replacement is durable, not just reflected in the return value.
      const found = await fetchBatchById(created.id);
      expect(found!.recipes).toHaveLength(1);
      expect(found!.recipes[0].name).toBe("Strawberry");
    } finally {
      await deleteUserBatch(created.id);
    }
  });
});

describe("setUserBatchFavourite", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await setUserBatchFavourite(1, true);
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses a batch that is not the caller's", async () => {
    const result = await setUserBatchFavourite(999_999_999, true);
    expectRefused(result, DataError.Forbidden);
  });

  test("stars and unstars a user-owned batch round-trip", async () => {
    const created = expectOk(await createUserBatch(makeBatchInput("Favourite Batch")));

    try {
      const starred = expectOk(await setUserBatchFavourite(created.id, true));
      expect(starred?.favourite).toBe(true);
      expect((await fetchBatchById(created.id))?.favourite).toBe(true);

      const cleared = expectOk(await setUserBatchFavourite(created.id, false));
      expect(cleared?.favourite).toBe(false);
      expect(await fetchBatchById(created.id)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserBatch(created.id);
    }
  });

  test("starts unstarred, so a new batch never arrives pre-starred", async () => {
    const created = expectOk(await createUserBatch(makeBatchInput("Unstarred Batch")));

    try {
      expect(created).not.toHaveProperty("favourite");
      expect(await fetchBatchById(created.id)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserBatch(created.id);
    }
  });

  /**
   * The reason the star has its own action: `updateUserBatch` replaces a batch wholesale from a
   * client-supplied `BatchInput`. If the star travelled in that input, an editor holding a copy
   * loaded before the star was set would clear it on the next save.
   */
  test("survives a full updateUserBatch, which knows nothing about the star", async () => {
    const created = expectOk(await createUserBatch(makeBatchInput("Starred Then Edited")));

    try {
      await setUserBatchFavourite(created.id, true);

      const edited = expectOk(
        await updateUserBatch(created.id, {
          ...makeBatchInput("Starred Then Edited"),
          notes: "edited after starring",
        }),
      );
      expect(edited?.notes).toBe("edited after starring");
      expect(edited?.favourite).toBe(true);
      expect((await fetchBatchById(created.id))?.favourite).toBe(true);
    } finally {
      await deleteUserBatch(created.id);
    }
  });
});

describe("deleteUserBatch", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await deleteUserBatch(1);
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses when no matching batch exists", async () => {
    const result = await deleteUserBatch(999_999_999);
    expectRefused(result, DataError.Forbidden);
  });

  test("deletes a batch and cascades to its recipes", async () => {
    const created = expectOk(await createUserBatch(makeBatchInput("Delete Test Batch")));
    // The two-recipe input wrote child rows, so the cascade below has something to clear.
    expect(await countBatchRecipes(created.id)).toBe(2);

    const deleted = expectOk(await deleteUserBatch(created.id));
    expect(deleted!.id).toBe(created.id);

    // The batch is gone, and the FK cascade left no orphaned `batch_recipes` rows behind.
    expect(await fetchBatchById(created.id)).toBeUndefined();
    expect(await countBatchRecipes(created.id)).toBe(0);
  });
});

describe("batch recipe provenance", () => {
  test("nulls a recipe's ref when its source recipe version is deleted, keeping rows", async () => {
    const recipe = expectOk(
      await createUserRecipe("Batch Provenance Source", [["Whole Milk", 100]]),
    );
    const ref = { recipeId: recipe.recipeId, versionNumber: recipe.version.version };

    const created = expectOk(
      await createUserBatch({
        date: "2026-07-20",
        recipes: [{ name: "From saved", rows: [["Whole Milk", 100]], version: { ref } }],
      }),
    );

    try {
      // The provenance ref survives the round-trip while the source still exists.
      expect((await fetchBatchById(created.id))!.recipes[0].version).toEqual({ ref });

      // Deleting the source recipe cascades to its versions; the composite FK nulls both provenance
      // columns together, so the ref disappears but the weighed rows are untouched.
      await deleteUserRecipe(recipe.recipeId);

      const afterDelete = await fetchBatchById(created.id);
      expect(afterDelete!.recipes[0].version).toBeUndefined();
      expect(afterDelete!.recipes[0].rows).toEqual([["Whole Milk", 100]]);
    } finally {
      await deleteUserBatch(created.id);
    }
  });

  test("keeps the opted-in version name and sibling hint once the source version is deleted", async () => {
    const recipe = expectOk(
      await createUserRecipe("Batch Provenance Named Source", [["Whole Milk", 100]]),
    );
    const ref = { recipeId: recipe.recipeId, versionNumber: recipe.version.version };

    const created = expectOk(
      await createUserBatch({
        date: "2026-07-20",
        recipes: [
          {
            name: "From saved",
            rows: [["Whole Milk", 100]],
            version: { ref, name: "2.1", hasSiblings: true },
          },
        ],
      }),
    );

    try {
      await deleteUserRecipe(recipe.recipeId);

      // `name`/`hasSiblings` are separate columns from the ref, so they outlive its "set null".
      const afterDelete = await fetchBatchById(created.id);
      expect(afterDelete!.recipes[0].version).toEqual({ name: "2.1", hasSiblings: true });
    } finally {
      await deleteUserBatch(created.id);
    }
  });
});

describe("identity", () => {
  test("a batch created while signed in as one user is unreachable as another", async () => {
    const created = expectOk(
      await createUserBatch(makeBatchInput("Cross User Isolation Test Batch")),
    );
    const { id } = created;

    try {
      // Signing in as A is the whole of the change: no argument here names a user.
      signInAs(TEST_USER_A.email);

      expect(expectOk(await fetchAllUserBatches()).some((batch) => batch.id === id)).toBe(false);
      // Every mutation refuses for the same stated reason, rather than merely failing.
      const forbidden = DataError.Forbidden;
      expectRefused(await updateUserBatch(id, makeBatchInput("Stolen")), forbidden);
      expectRefused(await setUserBatchFavourite(id, true), forbidden);
      expectRefused(await deleteUserBatch(id), forbidden);

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
