import { expect, test } from "vitest";

import {
  Composition,
  MixProperties,
  get_all_spec_entries,
  new_ingredient_database_seeded_from_specs,
  Bridge,
  CompKey,
  FpdKey,
  isCompKey,
  compToPropKey,
  IngredientDatabase,
  OnConflict,
} from "../../dist/index";

import { fpdToPropKey, getMixProperty, propToCompKey, propToRatioKey } from "./prop-key";
import { Priority, BalancingReport, BalanceTargets, BalanceLocks } from "./balancing";
import { LightRecipe } from "./light-recipe";

const lightRecipe: LightRecipe = [
  ["Whole Milk", 245],
  ["Whipping Cream", 215],
  ["Cocoa Powder, 17% Fat", 28],
  ["Skimmed Milk Powder", 21],
  ["Egg Yolk", 18],
  ["Dextrose", 45],
  ["Fructose", 32],
  ["Salt", 0.5],
  ["Stabilizer Blend", 1.25],
  ["Vanilla Extract", 6],
];

/** Creates a new ingredient database pre-seeded with all built-in ingredient specs. */
function make_seeded_db() {
  return new_ingredient_database_seeded_from_specs(get_all_spec_entries());
}

test("new Bridge", () => {
  const bridge = new Bridge(make_seeded_db());
  expect(bridge).toBeDefined();
  expect(bridge).toBeInstanceOf(Bridge);
  expect(bridge.get_all_ingredients().length).toEqual(get_all_spec_entries().length);
});

test("Bridge.seed_from_specs", () => {
  const bridge = new Bridge(new IngredientDatabase());
  expect(bridge.has_ingredient("Whole Milk")).toBe(false);

  bridge.seed_from_specs(get_all_spec_entries(), OnConflict.Reject);
  expect(bridge.has_ingredient("Whole Milk")).toBe(true);
  expect(bridge.get_ingredient_by_name("Whole Milk")).toBeDefined();

  const comp = bridge.calculate_recipe_composition(lightRecipe);
  expect(comp).toBeDefined();
  expect(comp.get(CompKey.MilkFat)).toBeCloseTo(13.6367, 4);
});

/** Build a minimal user-defined dairy spec entry (the shape the app stores and seeds). */
function makeUserSpec(name: string, fat: number) {
  return { name, category: "Dairy", DairySimpleSpec: { fat } };
}

test("Bridge.clear empties the database", () => {
  const bridge = new Bridge(make_seeded_db());
  expect(bridge.get_all_ingredients().length).toBeGreaterThan(0);

  bridge.clear();
  expect(bridge.get_all_ingredients().length).toBe(0);
  expect(bridge.has_ingredient("Whole Milk")).toBe(false);
});

test("Bridge.seed_from_embedded_data seeds the baseline", () => {
  const bridge = new Bridge(new IngredientDatabase());
  expect(bridge.get_all_ingredients().length).toBe(0);

  bridge.seed_from_embedded_data(OnConflict.Reject);
  expect(bridge.get_all_ingredients().length).toBe(get_all_spec_entries().length);
});

test("Bridge.seed_from_specs rejects vs. overwrites duplicates by OnConflict", () => {
  const bridge = new Bridge(new IngredientDatabase());
  bridge.seed_from_specs([makeUserSpec("My Custom Cream", 30)], OnConflict.Reject);
  expect(bridge.get_all_ingredients().length).toBe(1);

  // A colliding name is rejected, but accepted (replaced in place) when overwriting.
  expect(() =>
    bridge.seed_from_specs([makeUserSpec("My Custom Cream", 40)], OnConflict.Reject),
  ).toThrow();
  expect(() =>
    bridge.seed_from_specs([makeUserSpec("My Custom Cream", 40)], OnConflict.Overwrite),
  ).not.toThrow();
  expect(bridge.get_all_ingredients().length).toBe(1);
});

test("Bridge reseed dance overlays user specs and drops stale ones", () => {
  const bridge = new Bridge(make_seeded_db());
  const embeddedLen = bridge.get_all_ingredients().length;
  const embeddedName = bridge.get_all_ingredient_names()[0];

  // The app's reseed: reset to the embedded baseline, then overlay user specs overwriting conflicts
  const reseed = (specs: ReturnType<typeof makeUserSpec>[]) => {
    bridge.clear();
    bridge.seed_from_embedded_data(OnConflict.Reject);
    bridge.seed_from_specs(specs, OnConflict.Overwrite);
  };

  reseed([makeUserSpec("My Custom Cream", 30)]);
  expect(bridge.get_all_ingredients().length).toBe(embeddedLen + 1);
  expect(bridge.has_ingredient("My Custom Cream")).toBe(true);

  reseed([makeUserSpec("Another Custom", 12)]);
  expect(bridge.get_all_ingredients().length).toBe(embeddedLen + 1);
  expect(bridge.has_ingredient("My Custom Cream")).toBe(false);
  expect(bridge.has_ingredient("Another Custom")).toBe(true);

  reseed([makeUserSpec(embeddedName, 50)]);
  expect(bridge.get_all_ingredients().length).toBe(embeddedLen);
  expect(bridge.has_ingredient(embeddedName)).toBe(true);
});

test("Bridge.calculate_recipe_composition", () => {
  const bridge = new Bridge(make_seeded_db());
  const composition = bridge.calculate_recipe_composition(lightRecipe);
  expect(composition).toBeDefined();
  expect(composition).toBeInstanceOf(Composition);
  expect(composition.get(CompKey.MilkFat)).toBeCloseTo(13.6367, 4);
});

test("Bridge.calculate_recipe_mix_properties", () => {
  const bridge = new Bridge(make_seeded_db());
  const mix_properties = bridge.calculate_recipe_mix_properties(lightRecipe);
  expect(mix_properties).toBeDefined();
  expect(mix_properties).toBeInstanceOf(MixProperties);
  expect(getMixProperty(mix_properties, compToPropKey(CompKey.MilkFat))).toBeCloseTo(13.6367, 4);
});

test("Bridge.balance_recipe", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
    [compToPropKey(CompKey.TotalSugars), 17],
    [compToPropKey(CompKey.TotalSolids), 41],
  ];

  const balanced = bridge.balance_recipe(lightRecipe, targets) as LightRecipe;

  expect(balanced).toBeDefined();
  expect(balanced.length).toEqual(lightRecipe.length);

  for (let i = 0; i < lightRecipe.length; i++) {
    expect(balanced[i][0]).toEqual(lightRecipe[i][0]);
    expect(balanced[i][1]).toBeGreaterThanOrEqual(0);
  }

  const originalTotal = lightRecipe.reduce((sum, line) => sum + line[1], 0);
  const balancedTotal = balanced.reduce((sum, line) => sum + line[1], 0);
  expect(balancedTotal).toBeCloseTo(originalTotal, 4);

  const comp = bridge.calculate_recipe_composition(balanced);

  for (const [key, value] of targets) {
    const balanceValue = isCompKey(key)
      ? comp.get(propToCompKey(key))
      : comp.get_ratio(propToRatioKey(key));

    expect(balanceValue).toBeCloseTo(value, 2);
  }
});

test("Bridge.balance_recipe scales to an explicit total_amount", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
    [compToPropKey(CompKey.TotalSugars), 17],
    [compToPropKey(CompKey.TotalSolids), 41],
  ];

  const balanced = bridge.balance_recipe(lightRecipe, targets, 1000) as LightRecipe;

  // The balanced recipe is scaled to the requested total mass...
  const balancedTotal = balanced.reduce((sum, line) => sum + line[1], 0);
  expect(balancedTotal).toBeCloseTo(1000, 4);

  // ...while still hitting the (scale-invariant) composition targets.
  const comp = bridge.calculate_recipe_composition(balanced);
  for (const [key, value] of targets) {
    const balanceValue = isCompKey(key)
      ? comp.get(propToCompKey(key))
      : comp.get_ratio(propToRatioKey(key));
    expect(balanceValue).toBeCloseTo(value, 2);
  }
});

test("Bridge.balance_recipe infers the current total when total_amount is omitted/undefined", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
  ];

  const originalTotal = lightRecipe.reduce((sum, line) => sum + line[1], 0);

  // Passing `undefined` for the optional param behaves identically to omitting it: total is kept.
  const omitted = bridge.balance_recipe(lightRecipe, targets) as LightRecipe;
  const explicitUndefined = bridge.balance_recipe(lightRecipe, targets, undefined) as LightRecipe;

  for (const balanced of [omitted, explicitUndefined]) {
    const balancedTotal = balanced.reduce((sum, line) => sum + line[1], 0);
    expect(balancedTotal).toBeCloseTo(originalTotal, 4);
  }
});

test("Bridge.balance_recipe applies priorities", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: BalanceTargets = [
    [compToPropKey(CompKey.Energy), 200],
    [compToPropKey(CompKey.MilkFat), 12],
    [compToPropKey(CompKey.MSNF), 8],
    [compToPropKey(CompKey.POD), 0.5],
  ];

  // Same targets, but with POD raised to Critical priority.
  const prioritizedTargets: BalanceTargets = [
    [compToPropKey(CompKey.Energy), 200],
    [compToPropKey(CompKey.MilkFat), 12],
    [compToPropKey(CompKey.MSNF), 8],
    [compToPropKey(CompKey.POD), 0.5, Priority.Critical],
  ];

  const defaultBalanced = bridge.balance_recipe(lightRecipe, targets) as LightRecipe;
  const prioritizedBalanced = bridge.balance_recipe(lightRecipe, prioritizedTargets) as LightRecipe;

  const defaultComp = bridge.calculate_recipe_composition(defaultBalanced);
  const prioritizedComp = bridge.calculate_recipe_composition(prioritizedBalanced);

  const defaultError = Math.abs(defaultComp.get(CompKey.POD) - 0.5);
  const prioritizedError = Math.abs(prioritizedComp.get(CompKey.POD) - 0.5);

  expect(prioritizedError).toBeLessThan(defaultError);
});

test("Bridge.balance_recipe holds a locked line fixed", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
  ];

  // Lock the Vanilla Extract line at its current amount: it must survive balancing untouched.
  const vanillaIndex = lightRecipe.findIndex(([name]) => name === "Vanilla Extract");
  const vanillaAmount = lightRecipe[vanillaIndex][1];
  const locked: BalanceLocks = [[vanillaIndex, { Amount: vanillaAmount }]];

  const balanced = bridge.balance_recipe(lightRecipe, targets, undefined, locked) as LightRecipe;

  expect(balanced[vanillaIndex][0]).toEqual("Vanilla Extract");
  expect(balanced[vanillaIndex][1]).toBeCloseTo(vanillaAmount, 6);

  // The overall total is preserved; the free lines balanced around the locked one.
  const originalTotal = lightRecipe.reduce((sum, line) => sum + line[1], 0);
  const balancedTotal = balanced.reduce((sum, line) => sum + line[1], 0);
  expect(balancedTotal).toBeCloseTo(originalTotal, 4);
});

test("Bridge.balance_recipe throws on unknown ingredient", () => {
  const bridge = new Bridge(make_seeded_db());
  const badRecipe: LightRecipe = [["Nonexistent Ingredient", 100]];
  const targets: BalanceTargets = [[compToPropKey(CompKey.MilkFat), 10]];

  expect(() => bridge.balance_recipe(badRecipe, targets)).toThrow();
});

test("Bridge.balance_recipe translates a ServingTemp target to its ratio proxy", () => {
  const bridge = new Bridge(make_seeded_db());

  const targets: BalanceTargets = [
    [fpdToPropKey(FpdKey.ServingTemp), -13],
    [compToPropKey(CompKey.TotalSolids), 41],
  ];

  const balanced = bridge.balance_recipe(lightRecipe, targets) as LightRecipe;
  const mixProperties = bridge.calculate_recipe_mix_properties(balanced);

  expect(getMixProperty(mixProperties, fpdToPropKey(FpdKey.ServingTemp))).toBeCloseTo(-13, 2);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalSolids))).toBeCloseTo(41, 2);
});

test("Bridge.balance_recipe translates an ABV target to its Alcohol proxy", () => {
  const bridge = new Bridge(make_seeded_db());
  const boozyRecipe: LightRecipe = [
    ["Whole Milk", 60],
    ["Sucrose", 15],
    ["Grand Marnier Cordon Rouge", 10],
  ];

  const targets: BalanceTargets = [[compToPropKey(CompKey.ABV), 4]];

  const balanced = bridge.balance_recipe(boozyRecipe, targets) as LightRecipe;
  const comp = bridge.calculate_recipe_composition(balanced);

  expect(comp.get(CompKey.ABV)).toBeCloseTo(4, 4);
});

test("Bridge.validate_recipe_targets reports a proxy target clash", () => {
  const bridge = new Bridge(make_seeded_db());
  // ServingTemp and HardnessAt14C both translate to an AbsNetPAC target, so together they clash.
  const targets: BalanceTargets = [
    [fpdToPropKey(FpdKey.ServingTemp), -13],
    [fpdToPropKey(FpdKey.HardnessAt14C), 70],
  ];

  const report = bridge.validate_recipe_targets(lightRecipe, targets) as BalancingReport;
  const errors = report.issues.filter((issue) => issue.severity === "error");

  expect(errors.length).toBe(1);
  expect(errors[0].keys).toEqual([
    fpdToPropKey(FpdKey.ServingTemp),
    fpdToPropKey(FpdKey.HardnessAt14C),
  ]);
});

test("Bridge.validate_recipe_targets returns empty report for valid targets", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), 14],
    [compToPropKey(CompKey.MSNF), 10],
    [compToPropKey(CompKey.TotalSugars), 17],
  ];

  const report = bridge.validate_recipe_targets(lightRecipe, targets) as BalancingReport;

  expect(report).toBeDefined();
  expect(report.issues).toEqual([]);
});

test("Bridge.validate_recipe_targets reports NegativeTarget error", () => {
  const bridge = new Bridge(make_seeded_db());
  const targets: BalanceTargets = [[compToPropKey(CompKey.MilkFat), -5]];

  const report = bridge.validate_recipe_targets(lightRecipe, targets) as BalancingReport;

  expect(report).toBeDefined();
  expect(report.issues.filter((i) => i.severity === "error").length).toBeGreaterThan(0);
  expect(report.issues[0].severity).toBe("error");
  expect(report.issues[0].message).toContain("-5");
});

test("Bridge.validate_recipe_targets tolerates a display-rounded target on a pinned ratio", () => {
  const bridge = new Bridge(make_seeded_db());
  // Whole Milk is the only MSNF/MilkFat source, so MSNF:MilkFat is pinned to its ratio; the sugars
  // dilute the mix (keeping the magnitudes mid-range and reachable) without moving that ratio.
  const recipe: LightRecipe = [
    ["Whole Milk", 60],
    ["Dextrose", 30],
    ["Fructose", 20],
  ];
  const comp = bridge.calculate_recipe_composition(recipe);
  // Round each part to display precision, as the app does, so the implied ratio drifts off the pin.
  const round2 = (x: number) => Math.round(x * 100) / 100;
  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MSNF), round2(comp.get(CompKey.MSNF))],
    [compToPropKey(CompKey.MilkFat), round2(comp.get(CompKey.MilkFat))],
  ];

  // The RatioInfeasibility message is the only one carrying "the ingredients allow".
  const hasRatioIssue = (report: BalancingReport) =>
    report.issues.some((i) => i.message.includes("the ingredients allow"));

  const strict = bridge.validate_recipe_targets(recipe, targets) as BalancingReport;
  const tolerant = bridge.validate_recipe_targets(recipe, targets, 0.01) as BalancingReport;

  expect(hasRatioIssue(strict)).toBe(true);
  expect(hasRatioIssue(tolerant)).toBe(false);
});

test("Bridge.validate_recipe_targets throws on unknown ingredient", () => {
  const bridge = new Bridge(make_seeded_db());
  const badRecipe: LightRecipe = [["Nonexistent Ingredient", 100]];
  const targets: BalanceTargets = [[compToPropKey(CompKey.MilkFat), 14]];

  expect(() => bridge.validate_recipe_targets(badRecipe, targets)).toThrow();
});

/** Ice Cream Science chocolate recipe: pre-evaporation amounts (1089 g), 150 g evaporated. */
const chocolatePreEvaporation: LightRecipe = [
  ["Double Cream", 417],
  ["Skim Milk", 319],
  ["Skimmed Milk Powder", 46],
  ["Sucrose", 140],
  ["Egg Yolk", 78],
  ["Cocoa Powder, 17% Fat", 30],
  ["70% Dark Chocolate", 50],
  ["Salt", 3],
  ["Vanilla Extract", 5],
  ["Instant Coffee", 1],
];

test("Bridge.calculate_recipe_composition concentrates with evaporation", () => {
  const bridge = new Bridge(make_seeded_db());

  const plain = bridge.calculate_recipe_composition(chocolatePreEvaporation);
  const evaporated = bridge.calculate_recipe_composition(chocolatePreEvaporation, 150);

  expect(evaporated.get(CompKey.TotalSolids)).toBeGreaterThan(plain.get(CompKey.TotalSolids));
  expect(evaporated.get(CompKey.Water)).toBeLessThan(plain.get(CompKey.Water));
});

test("Bridge.calculate_recipe_mix_properties reports the post-evaporation yield", () => {
  const bridge = new Bridge(make_seeded_db());
  const props = bridge.calculate_recipe_mix_properties(chocolatePreEvaporation, 150);
  // Line total 1089 g minus 150 g evaporated is the 939 g final yield.
  expect(props.total_amount).toBeCloseTo(939, 4);
});

test("Bridge.deevaporate_recipe clears evaporation and reproduces the mix", () => {
  const bridge = new Bridge(make_seeded_db());

  const postEvap = bridge.calculate_recipe_composition(chocolatePreEvaporation, 150);
  const deevaporated = bridge.deevaporate_recipe(chocolatePreEvaporation, 150) as LightRecipe;

  const deevapTotal = deevaporated.reduce((sum, line) => sum + line[1], 0);
  expect(deevapTotal).toBeCloseTo(939, 1);

  // The de-evaporated recipe (no evaporation) reproduces the post-evaporation composition.
  const deevapComp = bridge.calculate_recipe_composition(deevaporated);
  expect(deevapComp.get(CompKey.TotalSolids)).toBeCloseTo(postEvap.get(CompKey.TotalSolids), 1);
  expect(deevapComp.get(CompKey.Water)).toBeCloseTo(postEvap.get(CompKey.Water), 1);

  // Amounts track the hand-balanced fixture: Skim Milk drops, Skimmed Milk Powder rises.
  const amountOf = (name: string) => deevaporated.find(([n]) => n === name)?.[1] ?? 0;
  expect(amountOf("Skim Milk")).toBeLessThan(319);
  expect(amountOf("Skimmed Milk Powder")).toBeGreaterThan(46);
});

test("Bridge.deevaporate_recipe throws without evaporation", () => {
  const bridge = new Bridge(make_seeded_db());
  expect(() => bridge.deevaporate_recipe(chocolatePreEvaporation, 0)).toThrow();
});

test("Bridge.balance_recipe with evaporation hits post-evaporation targets", () => {
  const bridge = new Bridge(make_seeded_db());

  const post = bridge.calculate_recipe_composition(chocolatePreEvaporation, 150);
  const targets: BalanceTargets = [
    [compToPropKey(CompKey.MilkFat), post.get(CompKey.MilkFat)],
    [compToPropKey(CompKey.TotalSolids), post.get(CompKey.TotalSolids)],
  ];

  const balanced = bridge.balance_recipe(
    chocolatePreEvaporation,
    targets,
    undefined,
    undefined,
    150,
  ) as LightRecipe;

  const balancedPost = bridge.calculate_recipe_composition(balanced, 150);
  expect(balancedPost.get(CompKey.MilkFat)).toBeCloseTo(post.get(CompKey.MilkFat), 1);
  expect(balancedPost.get(CompKey.TotalSolids)).toBeCloseTo(post.get(CompKey.TotalSolids), 1);
});
