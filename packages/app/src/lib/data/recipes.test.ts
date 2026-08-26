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

import { findUserByEmail } from "@/lib/data/users";
import {
  fetchAllUserSavedRecipes,
  createUserRecipe,
  createUserRecipeVersion,
  updateUserRecipeVersion,
  renameUserRecipe,
  deleteUserRecipe,
  deleteUserRecipeVersion,
  setUserRecipeFavourite,
  SavedRecipeJson,
} from "@/lib/data/recipes";

import { Rating } from "@/lib/rating";
import { RecipeError } from "@/lib/recipe/recipe";
import { DataError } from "@/lib/result";

import { type LightRecipe } from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/../src/__tests__/assets";

import {
  TEST_USER_A,
  TEST_USER_B,
  RECIPE_INVALID_INGREDIENT,
  TEST_USER_B_RECIPES,
} from "@/lib/database/assets";

/** Sign in as the given test user for the rest of the test; no argument signs out. */
function signInAs(email?: string) {
  session.email = email;
}

// Every test acts as TEST_USER_B unless it says otherwise; the anonymous cases sign out first.
beforeEach(() => {
  signInAs(TEST_USER_B.email);
});

/** Helper function to get the test user B from the database, throwing an error if not found */
async function getTestUserB() {
  const user = await findUserByEmail(TEST_USER_B.email);
  if (!user) throw new Error("Test user B not found");
  return user;
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

/** Helper to assert that every version of a saved recipe has valid `LightRecipe` rows */
function expectAllVersionsToBeValid(entry: SavedRecipeJson) {
  expect(entry.versions.length).toBeGreaterThan(0);
  for (const v of entry.versions) {
    expect(Array.isArray(v.recipe)).toBe(true);
    for (const row of v.recipe) {
      expect(row).toHaveLength(2);
      expect(typeof row[0]).toBe("string");
      expect(typeof row[1]).toBe("number");
    }
  }
}

describe("fetchAllUserSavedRecipes", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    expectRefused(await fetchAllUserSavedRecipes(), DataError.Unauthenticated);
  });

  test("returns all seeded recipes for TEST_USER_B", async () => {
    const recipes = expectOk(await fetchAllUserSavedRecipes());
    expect(recipes).toBeDefined();
    expect(recipes.length).toEqual(TEST_USER_B_RECIPES.length);

    const names = recipes.map((r) => r.name);
    for (const expected of TEST_USER_B_RECIPES.map((r) => r.name)) {
      expect(names).toContain(expected);
    }
  });

  test("every returned entry has at least one version with valid rows", async () => {
    const recipes = expectOk(await fetchAllUserSavedRecipes());
    expect(recipes).toBeDefined();
    for (const entry of recipes!) {
      expectAllVersionsToBeValid(entry);
    }
  });

  test("Chocolate Ice Cream v1 rows match getLightRecipe(RecipeID.Main)", async () => {
    const recipes = expectOk(await fetchAllUserSavedRecipes());
    expect(recipes).toBeDefined();

    const entry = recipes.find((r) => r.name === "Chocolate Ice Cream");
    expect(entry).toBeDefined();
    const v1 = entry!.versions.find((v) => v.version === 1);
    expect(v1).toBeDefined();
    expect(v1!.recipe).toEqual(getLightRecipe(RecipeID.Main));
  });

  test("Chocolate Ice Cream has two seeded versions in ascending order", async () => {
    const recipes = expectOk(await fetchAllUserSavedRecipes());
    const entry = recipes.find((r) => r.name === "Chocolate Ice Cream");
    expect(entry).toBeDefined();
    expect(entry!.versions.length).toBe(2);
    expect(entry!.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(entry!.versions[0].label).toBe("first cut");
    expect(entry!.versions[1].label).toBe("sweeter tweak");
  });

  test("Recipe with Invalid Ingredients rows match RECIPE_INVALID_INGREDIENT", async () => {
    const recipes = expectOk(await fetchAllUserSavedRecipes());
    expect(recipes).toBeDefined();

    const entry = recipes.find((r) => r.name === "Recipe with Invalid Ingredients");
    expect(entry).toBeDefined();
    expect(entry!.versions[0].recipe).toEqual(RECIPE_INVALID_INGREDIENT);
  });

  test("returns recipes in ascending order by name (for stable UI rendering)", async () => {
    const recipes = expectOk(await fetchAllUserSavedRecipes());
    expect(recipes).toBeDefined();
    expect(recipes.length).toBeGreaterThan(1);

    const names = recipes.map((r) => r.name);
    expect(names).toEqual([...names].sort());
  });
});

describe("createUserRecipe", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await createUserRecipe("X", [["Whole Milk", 100]]);
    expectRefused(result, DataError.Unauthenticated);
  });

  test("creates a new recipe with version 1, round-trips, cleans up at the end", async () => {
    const user = await getTestUserB();
    const name = "Create Round-trip Test Recipe";
    const rows: LightRecipe = [["Whole Milk", 200]];

    const created = expectOk(
      await createUserRecipe(name, rows, { comments: "first", label: "initial", evaporation: 25 }),
    );
    expect(created.version.version).toBe(1);
    expect(created.version.recipe).toEqual(rows);
    expect(created.version.comments).toBe("first");
    expect(created.version.label).toBe("initial");
    expect(created.version.evaporation).toBe(25);

    try {
      const all = expectOk(await fetchAllUserSavedRecipes());
      const found = all.find((r) => r.name === name);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.recipeId);
      expect(found!.versions[0].recipe).toEqual(rows);
      expect(found!.versions[0].evaporation).toBe(25);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }

    // Side-effect cleanup verification (user count unchanged is implicit)
    expect(user.id).toBeGreaterThan(0);
  });
});

describe("createUserRecipeVersion", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await createUserRecipeVersion(1, [["Whole Milk", 100]]);
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses a recipe that is not the caller's", async () => {
    // Use a high id that almost-certainly doesn't exist for this user
    const result = await createUserRecipeVersion(999_999_999, [["Whole Milk", 100]]);
    expectRefused(result, DataError.Forbidden);
  });

  test("appends successive versions with monotonically-increasing numbers", async () => {
    const name = "Version Append Test Recipe";
    const v1: LightRecipe = [["Whole Milk", 100]];
    const v2: LightRecipe = [
      ["Whole Milk", 100],
      ["Sucrose", 25],
    ];
    const v3: LightRecipe = [
      ["Whole Milk", 90],
      ["Sucrose", 30],
    ];

    const created = expectOk(await createUserRecipe(name, v1));
    try {
      const second = expectOk(await createUserRecipeVersion(created.recipeId, v2));
      expect(second?.version).toBe(2);
      expect(second?.recipe).toEqual(v2);

      const third = expectOk(
        await createUserRecipeVersion(created.recipeId, v3, { label: "tweaked sugar" }),
      );
      expect(third?.version).toBe(3);
      expect(third?.recipe).toEqual(v3);
      expect(third?.label).toBe("tweaked sugar");

      const all = expectOk(await fetchAllUserSavedRecipes());
      const entry = all.find((r) => r.name === name);
      expect(entry?.versions.map((v) => v.version)).toEqual([1, 2, 3]);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });
});

describe("updateUserRecipeVersion", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await updateUserRecipeVersion(1, 1, { comments: "hi" });
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses a recipe that is not the caller's", async () => {
    const result = await updateUserRecipeVersion(999_999_999, 1, { comments: "hi" });
    expectRefused(result, DataError.Forbidden);
  });

  test("partially updates recipe rows, comments, label; clears with null", async () => {
    const name = "Partial Update Test Recipe";
    const initial: LightRecipe = [["Whole Milk", 100]];
    const updatedRows: LightRecipe = [
      ["Whole Milk", 150],
      ["Dextrose", 10],
    ];

    const created = expectOk(
      await createUserRecipe(name, initial, { comments: "before", label: "v1" }),
    );

    try {
      const updated = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, {
          recipe: updatedRows,
          comments: "after",
        }),
      );
      expect(updated?.recipe).toEqual(updatedRows);
      expect(updated?.comments).toBe("after");
      expect(updated?.label).toBe("v1"); // unchanged

      const cleared = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { comments: null, label: null }),
      );
      expect(cleared?.comments).toBeUndefined();
      expect(cleared?.label).toBeUndefined();
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("partially updates evaporation independent of other fields; clears with null", async () => {
    const name = "Evaporation Update Test Recipe";
    const initial: LightRecipe = [["Whole Milk", 100]];

    const created = expectOk(
      await createUserRecipe(name, initial, { comments: "before", evaporation: 10 }),
    );
    expect(created.version.evaporation).toBe(10);

    try {
      // Omitting evaporation leaves it unchanged while another field updates
      const untouched = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { comments: "after" }),
      );
      expect(untouched?.comments).toBe("after");
      expect(untouched?.evaporation).toBe(10);

      const updated = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { evaporation: 42 }),
      );
      expect(updated?.evaporation).toBe(42);
      expect(updated?.comments).toBe("after"); // unchanged

      const cleared = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { evaporation: null }),
      );
      expect(cleared?.evaporation).toBeUndefined();
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });
});

describe("renameUserRecipe", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await renameUserRecipe(1, "X");
    expectRefused(result, DataError.Unauthenticated);
  });

  test("renames a user-owned recipe round-trip", async () => {
    const original = "Rename Round-trip Recipe";
    const renamed = "Rename Round-trip Recipe (renamed)";

    const created = expectOk(await createUserRecipe(original, [["Whole Milk", 100]]));

    try {
      const row = expectOk(await renameUserRecipe(created.recipeId, renamed));
      expect(row.name).toBe(renamed);

      const all = expectOk(await fetchAllUserSavedRecipes());
      expect(all.find((r) => r.name === renamed)).toBeDefined();
      expect(all.find((r) => r.name === original)).toBeUndefined();
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });
});

describe("recipe version ratings", () => {
  test("stores a rating and surfaces it on the fetched version", async () => {
    const name = "Rating Round-trip Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      const updated = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { rating: Rating.Great }),
      );
      expect(updated?.rating).toBe(Rating.Great);

      const all = expectOk(await fetchAllUserSavedRecipes());
      expect(all.find((r) => r.name === name)?.versions[0].rating).toBe(Rating.Great);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  // Bad is -1: a falsy check anywhere on the write path would drop it and read back as unrated.
  test("stores a thumbs-down rather than treating it as unrated", async () => {
    const name = "Rating Negative Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      const updated = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { rating: Rating.Bad }),
      );
      expect(updated?.rating).toBe(Rating.Bad);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("clears a rating when passed null, and omits it from the wire shape", async () => {
    const name = "Rating Clear Recipe";
    const created = expectOk(
      await createUserRecipe(name, [["Whole Milk", 100]], { rating: Rating.Good }),
    );

    try {
      const cleared = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { rating: null }),
      );
      expect(cleared).not.toHaveProperty("rating");
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("leaves an existing rating alone when the key is omitted", async () => {
    const name = "Rating Untouched Recipe";
    const created = expectOk(
      await createUserRecipe(name, [["Whole Milk", 100]], { rating: Rating.Good }),
    );

    try {
      const updated = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { label: "unrelated edit" }),
      );
      expect(updated?.rating).toBe(Rating.Good);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("refuses an off-scale rating instead of writing it", async () => {
    const name = "Rating Invalid Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      // Plausible but not on the scale. The guard is what returns `undefined` rather than letting
      // Postgres reject it as an invalid `recipe_rating` value, which would surface as a throw.
      const result = await updateUserRecipeVersion(created.recipeId, 1, {
        rating: "Excellent" as Rating,
      });
      expectRefused(result, DataError.Invalid);

      const all = expectOk(await fetchAllUserSavedRecipes());
      expect(all.find((r) => r.name === name)?.versions[0]).not.toHaveProperty("rating");
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });
});

describe("setUserRecipeFavourite", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await setUserRecipeFavourite(1, true);
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses a recipe that is not the caller's", async () => {
    const result = await setUserRecipeFavourite(999_999_999, true);
    expectRefused(result, DataError.Forbidden);
  });

  test("stars and unstars a user-owned recipe round-trip", async () => {
    const name = "Favourite Round-trip Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      const starred = expectOk(await setUserRecipeFavourite(created.recipeId, true));
      expect(starred?.favourite).toBe(true);

      const afterStar = expectOk(await fetchAllUserSavedRecipes());
      expect(afterStar!.find((r) => r.name === name)?.favourite).toBe(true);

      const cleared = expectOk(await setUserRecipeFavourite(created.recipeId, false));
      expect(cleared?.favourite).toBe(false);

      // Omitted rather than `false`, matching the other optional fields in the wire shape.
      const afterClear = expectOk(await fetchAllUserSavedRecipes());
      expect(afterClear!.find((r) => r.name === name)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("starts unstarred, so a new recipe never arrives pre-starred", async () => {
    const name = "Favourite Default Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      const all = expectOk(await fetchAllUserSavedRecipes());
      expect(all.find((r) => r.name === name)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("leaves the star alone when the recipe is renamed", async () => {
    const name = "Favourite Rename Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      await setUserRecipeFavourite(created.recipeId, true);
      const renamed = expectOk(await renameUserRecipe(created.recipeId, `${name} v2`));
      expect(renamed?.favourite).toBe(true);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });
});

describe("deleteUserRecipe", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await deleteUserRecipe(1);
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses when no matching row exists", async () => {
    const result = await deleteUserRecipe(999_999_999);
    expectRefused(result, DataError.Forbidden);
  });

  test("removes a recipe and cascades to its versions, round-trip", async () => {
    const name = "Delete Round-trip Test Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));
    await createUserRecipeVersion(created.recipeId, [["Whole Milk", 200]]);

    const deleted = expectOk(await deleteUserRecipe(created.recipeId));
    expect(deleted!.name).toBe(name);

    const all = expectOk(await fetchAllUserSavedRecipes());
    expect(all.find((r) => r.name === name)).toBeUndefined();
  });
});

describe("deleteUserRecipeVersion", () => {
  test("refuses an anonymous caller", async () => {
    signInAs();
    const result = await deleteUserRecipeVersion(1, 1);
    expectRefused(result, DataError.Unauthenticated);
  });

  test("refuses to delete the last remaining version", async () => {
    const name = "Last Version Refuse Test Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      const result = await deleteUserRecipeVersion(created.recipeId, 1);
      expectRefused(result, RecipeError.LastVersion);

      const all = expectOk(await fetchAllUserSavedRecipes());
      const entry = all.find((r) => r.name === name);
      expect(entry?.versions.length).toBe(1);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("deletes a specific version when more than one exists", async () => {
    const name = "Delete Single Version Test Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));
    await createUserRecipeVersion(created.recipeId, [["Whole Milk", 200]]);
    await createUserRecipeVersion(created.recipeId, [["Whole Milk", 300]]);

    try {
      const deleted = expectOk(await deleteUserRecipeVersion(created.recipeId, 2));
      expect(deleted?.version).toBe(2);

      const all = expectOk(await fetchAllUserSavedRecipes());
      const entry = all.find((r) => r.name === name);
      expect(entry?.versions.map((v) => v.version)).toEqual([1, 3]);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });
});

describe("version names", () => {
  test("round-trips an explicit version name through create and fetch", async () => {
    const name = "Version Name Round-trip Test Recipe";
    const created = expectOk(
      await createUserRecipe(name, [["Whole Milk", 100]], { versionName: "3.1" }),
    );
    expect(created.version.versionName).toBe("3.1");

    try {
      const all = expectOk(await fetchAllUserSavedRecipes());
      const entry = all.find((r) => r.name === name);
      expect(entry?.versions[0].versionName).toBe("3.1");
      // The internal integer is still 1 regardless of the display name
      expect(entry?.versions[0].version).toBe(1);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("auto-materializes the next name once a recipe has opted in", async () => {
    const name = "Version Name Auto-materialize Test Recipe";
    const created = expectOk(
      await createUserRecipe(name, [["Whole Milk", 100]], { versionName: "2" }),
    );

    try {
      // Plain save (no meta): opted in, so the name continues the visible sequence
      const second = expectOk(
        await createUserRecipeVersion(created.recipeId, [["Whole Milk", 110]]),
      );
      expect(second?.versionName).toBe("3");
      expect(second?.version).toBe(2); // internal integer keeps counting
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("does not materialize a name for a recipe that never opted in", async () => {
    const name = "Version Name No-optin Test Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));
    expect(created.version.versionName).toBeUndefined();

    try {
      const second = expectOk(
        await createUserRecipeVersion(created.recipeId, [["Whole Milk", 110]]),
      );
      expect(second?.versionName).toBeUndefined();
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("rejects an invalid version name and writes no recipe row", async () => {
    const name = "Version Name Invalid Test Recipe";
    const created = await createUserRecipe(name, [["Whole Milk", 100]], {
      versionName: "not a version",
    });
    expectRefused(created, DataError.Invalid);

    // The compensating delete must have left no orphaned recipes row behind
    const all = expectOk(await fetchAllUserSavedRecipes());
    expect(all.find((r) => r.name === name)).toBeUndefined();
  });

  test("rejects a duplicate version name within a recipe", async () => {
    const name = "Version Name Duplicate Test Recipe";
    const created = expectOk(
      await createUserRecipe(name, [["Whole Milk", 100]], { versionName: "3.1" }),
    );

    try {
      const dup = await createUserRecipeVersion(created.recipeId, [["Whole Milk", 110]], {
        versionName: "3.1",
      });
      expectRefused(dup, RecipeError.VersionNameTaken);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });

  test("sets and clears a version name via update without touching the integer", async () => {
    const name = "Version Name Update Test Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      const named = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { versionName: "4.2-b" }),
      );
      expect(named?.versionName).toBe("4.2-b");
      expect(named?.version).toBe(1);

      const cleared = expectOk(
        await updateUserRecipeVersion(created.recipeId, 1, { versionName: null }),
      );
      expect(cleared?.versionName).toBeUndefined();
      expect(cleared?.version).toBe(1);
    } finally {
      await deleteUserRecipe(created.recipeId);
    }
  });
});

describe("name collisions", () => {
  // `recipes_user_name_uq` makes this the one refusal a user hits by accident, and nothing checks
  // the name client-side, so the action reporting it is the only thing standing between them and
  // "Save failed — try again" on a save that can never succeed.
  test("refuses a second recipe under a name the user already has", async () => {
    const name = "Duplicate Name Test Recipe";
    const first = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));

    try {
      expectRefused(await createUserRecipe(name, [["Whole Milk", 200]]), RecipeError.NameTaken);

      // Refused before any row was written, so the first recipe stands alone under that name.
      const all = expectOk(await fetchAllUserSavedRecipes());
      expect(all.filter((r) => r.name === name)).toHaveLength(1);
    } finally {
      await deleteUserRecipe(first.recipeId);
    }
  });

  test("refuses a rename onto a name the user already has", async () => {
    const kept = expectOk(await createUserRecipe("Rename Collision Keeper", [["Whole Milk", 100]]));
    const moved = expectOk(await createUserRecipe("Rename Collision Mover", [["Whole Milk", 100]]));

    try {
      expectRefused(
        await renameUserRecipe(moved.recipeId, "Rename Collision Keeper"),
        RecipeError.NameTaken,
      );

      const all = expectOk(await fetchAllUserSavedRecipes());
      expect(all.find((r) => r.id === moved.recipeId)!.name).toBe("Rename Collision Mover");
    } finally {
      await deleteUserRecipe(kept.recipeId);
      await deleteUserRecipe(moved.recipeId);
    }
  });
});

describe("identity", () => {
  test("a recipe created while signed in as one user is unreachable as another", async () => {
    const name = "Cross User Isolation Test Recipe";
    const created = expectOk(await createUserRecipe(name, [["Whole Milk", 100]]));
    const { recipeId } = created;

    try {
      // Signing in as A is the whole of the change: no argument here names a user.
      signInAs(TEST_USER_A.email);

      expect(expectOk(await fetchAllUserSavedRecipes()).some((r) => r.id === recipeId)).toBe(false);
      // Every mutation refuses for the same stated reason, rather than merely failing.
      const forbidden = DataError.Forbidden;
      expectRefused(await renameUserRecipe(recipeId, "Stolen"), forbidden);
      expectRefused(await setUserRecipeFavourite(recipeId, true), forbidden);
      expectRefused(await createUserRecipeVersion(recipeId, [["Whole Milk", 200]]), forbidden);
      expectRefused(await updateUserRecipeVersion(recipeId, 1, { comments: "hi" }), forbidden);
      expectRefused(await deleteUserRecipeVersion(recipeId, 1), forbidden);
      expectRefused(await deleteUserRecipe(recipeId), forbidden);

      // The owner still sees it exactly as it was left.
      signInAs(TEST_USER_B.email);
      const mine = expectOk(await fetchAllUserSavedRecipes()).find((r) => r.id === recipeId);
      expect(mine).toBeDefined();
      expect(mine!.name).toBe(name);
      expect(mine!.favourite).toBeUndefined();
      expect(mine!.versions).toHaveLength(1);
      expect(mine!.versions[0].comments).toBeUndefined();
    } finally {
      signInAs(TEST_USER_B.email);
      await deleteUserRecipe(recipeId);
    }
  });
});
