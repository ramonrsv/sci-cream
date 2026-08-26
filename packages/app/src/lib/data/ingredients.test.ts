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
  fetchUserIngredientSpecByName,
  fetchAllUserIngredientSpecs,
  IngredientTransfer,
} from "@/lib/data/ingredients";

import { UserSelect } from "@/lib/database/schema";
import { DataError } from "@/lib/result";

import {
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  Bridge as WasmBridge,
  IngredientDatabase,
  OnConflict,
} from "@workspace/sci-cream";

import { TEST_USER_A, TEST_USER_B, USER_DEFINED_FRUCTOSE_SPEC } from "@/lib/database/assets";

type SpecAsset = typeof USER_DEFINED_FRUCTOSE_SPEC;

/** The value of a successful result; fails the test naming the refusal otherwise. */
function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected success, was refused with: ${String(result.error)}`);
  return result.value;
}

/** Assert an action refused, and for the stated reason rather than merely for some reason. */
function expectRefused(result: { ok: boolean }, error: unknown): void {
  expect(result).toEqual({ ok: false, error });
}

/** Sign in as the given test user for the rest of the test; no argument signs out. */
function signInAs(email?: string) {
  session.email = email;
}

beforeEach(() => {
  signInAs();
});

/** Helper function to get a test user from the database, throwing an error if not found */
async function getTestUser(email: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`Test user ${email} not found`);
  return user;
}

const getTestUserA = () => getTestUser(TEST_USER_A.email);
const getTestUserB = () => getTestUser(TEST_USER_B.email);

/** Helper to assert that a Drizzle ingredient spec matches the expected spec and user asset */
function expectDrizzleSpecToMatch(
  specDrizzle: IngredientTransfer | undefined,
  spec: SpecAsset,
  user: UserSelect,
) {
  expect(specDrizzle).toBeDefined();
  expect(specDrizzle!.name).toBe(spec.name);
  expect(specDrizzle!.user).toBe(user.id);
  expect(specDrizzle!.category).toBe(spec.category);
  expect(JSON.stringify(specDrizzle!.spec)).toBe(JSON.stringify(spec));
}

/** Helper to assert that an `Ingredient` parsed from a spec matches the expected spec asset */
function expectParsedIngredientToMatchSpec(ingParsed: Ingredient, spec: SpecAsset) {
  expect(ingParsed.name).toBe(spec.name);
  expect(ingParsed.category).toBe(Category[spec.category as keyof typeof Category]);
  expect(ingParsed).toBeInstanceOf(Ingredient);
  expect(ingParsed.composition).toBeInstanceOf(Composition);
}

describe("fetchUserIngredientSpecByName", () => {
  test("into_ingredient_from_spec from user-defined spec in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;
    signInAs(TEST_USER_B.email);

    const specDrizzle = expectOk(await fetchUserIngredientSpecByName(spec.name));
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    const ingParsed = into_ingredient_from_spec(specDrizzle!.spec);
    expectParsedIngredientToMatchSpec(ingParsed, spec);
  });

  test("WasmBridge.seed_from_specs from user-defined spec in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;
    const bridge = new WasmBridge(new IngredientDatabase());
    signInAs(TEST_USER_B.email);

    const specDrizzle = expectOk(await fetchUserIngredientSpecByName(spec.name));
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    bridge.seed_from_specs([specDrizzle!.spec], OnConflict.Reject);
    expect(bridge.has_ingredient(spec.name)).toBe(true);
    expectParsedIngredientToMatchSpec(bridge.get_ingredient_by_name(spec.name), spec);
  });
});

describe("fetchAllUserIngredientSpecs", () => {
  test("into_ingredient_from_spec from user-defined specs in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;
    signInAs(TEST_USER_B.email);

    const specsDrizzle = expectOk(await fetchAllUserIngredientSpecs());
    expect(specsDrizzle).toBeDefined();
    expect(specsDrizzle!.length).toBeGreaterThan(0);

    const specDrizzle = specsDrizzle!.find((s) => s.name === spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    const ingParsed = into_ingredient_from_spec(specDrizzle!.spec);
    expectParsedIngredientToMatchSpec(ingParsed, spec);
  });

  test("WasmBridge.seed_from_specs from user-defined specs in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;
    const bridge = new WasmBridge(new IngredientDatabase());
    signInAs(TEST_USER_B.email);

    const specsDrizzle = expectOk(await fetchAllUserIngredientSpecs());
    expect(specsDrizzle).toBeDefined();
    expect(specsDrizzle!.length).toBeGreaterThan(0);

    const specDrizzle = specsDrizzle!.find((s) => s.name === spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    bridge.seed_from_specs(
      specsDrizzle!.map((s) => s.spec),
      OnConflict.Reject,
    );
    expect(bridge.get_all_ingredients().length).toBeGreaterThan(0);
    expect(bridge.has_ingredient(spec.name)).toBe(true);
    expectParsedIngredientToMatchSpec(bridge.get_ingredient_by_name(spec.name), spec);
  });

  test("returns specs in ascending order by name (for stable UI rendering)", async () => {
    signInAs(TEST_USER_A.email);

    const specs = expectOk(await fetchAllUserIngredientSpecs());
    expect(specs).toBeDefined();
    expect(specs!.length).toBeGreaterThan(1);

    const names = specs!.map((s) => s.name);
    expect(names).toEqual([...names].sort());
  });
});

describe("identity", () => {
  test("an anonymous caller is refused, rather than shown an empty list", async () => {
    expectRefused(await fetchAllUserIngredientSpecs(), DataError.Unauthenticated);
    expectRefused(
      await fetchUserIngredientSpecByName(USER_DEFINED_FRUCTOSE_SPEC.name),
      DataError.Unauthenticated,
    );
  });

  test("the rows returned belong to whoever is signed in", async () => {
    // Both test users are seeded a spec under this name, so only the owner column tells them apart.
    const specName = USER_DEFINED_FRUCTOSE_SPEC.name;
    const userA = await getTestUserA();
    const userB = await getTestUserB();

    signInAs(TEST_USER_B.email);
    expect(expectOk(await fetchUserIngredientSpecByName(specName)).user).toBe(userB.id);
    const specsB = expectOk(await fetchAllUserIngredientSpecs());
    expect(specsB.every((spec) => spec.user === userB.id)).toBe(true);

    signInAs(TEST_USER_A.email);
    expect(expectOk(await fetchUserIngredientSpecByName(specName)).user).toBe(userA.id);
    const specsA = expectOk(await fetchAllUserIngredientSpecs());
    expect(specsA.every((spec) => spec.user === userA.id)).toBe(true);
  });
});
