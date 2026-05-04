import { expect, test, describe } from "vitest";

import {
  findUserByEmail,
  fetchUserIngredientSpecByName,
  fetchAllUserIngredientSpecs,
  IngredientTransfer,
} from "@/lib/data";

import { UserSelect } from "@/lib/database/schema";

import {
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  Bridge as WasmBridge,
  IngredientDatabase,
} from "@workspace/sci-cream";

import { TEST_USER_B, USER_DEFINED_FRUCTOSE_SPEC } from "@/lib/database/util";

type SpecAsset = typeof USER_DEFINED_FRUCTOSE_SPEC;

/** Helper function to get the test user B from the database, throwing an error if not found */
async function getTestUserB() {
  const user = await findUserByEmail(TEST_USER_B.email);
  if (!user) throw new Error("Test user B not found");
  return user;
}

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

    const specDrizzle = await fetchUserIngredientSpecByName(TEST_USER_B.email, spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    const ingParsed = into_ingredient_from_spec(specDrizzle!.spec);
    expectParsedIngredientToMatchSpec(ingParsed, spec);
  });

  test("WasmBridge.seed_from_specs from user-defined spec in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;
    const bridge = new WasmBridge(new IngredientDatabase());

    const specDrizzle = await fetchUserIngredientSpecByName(TEST_USER_B.email, spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    bridge.seed_from_specs([specDrizzle!.spec]);
    expect(bridge.has_ingredient(spec.name)).toBe(true);
    expectParsedIngredientToMatchSpec(bridge.get_ingredient_by_name(spec.name), spec);
  });
});

describe("fetchAllUserIngredientSpecs", () => {
  test("into_ingredient_from_spec from user-defined specs in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;

    const specsDrizzle = await fetchAllUserIngredientSpecs(TEST_USER_B.email);
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

    const specsDrizzle = await fetchAllUserIngredientSpecs(TEST_USER_B.email);
    expect(specsDrizzle).toBeDefined();
    expect(specsDrizzle!.length).toBeGreaterThan(0);

    const specDrizzle = specsDrizzle!.find((s) => s.name === spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    bridge.seed_from_specs(specsDrizzle!.map((s) => s.spec));
    expect(bridge.get_all_ingredients().length).toBeGreaterThan(0);
    expect(bridge.has_ingredient(spec.name)).toBe(true);
    expectParsedIngredientToMatchSpec(bridge.get_ingredient_by_name(spec.name), spec);
  });
});
