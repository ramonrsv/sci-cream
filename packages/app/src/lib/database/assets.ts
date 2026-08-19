import type { LightRecipe } from "@workspace/sci-cream";

import type { BatchInput } from "@/lib/data/batches";
import { Rating } from "@/lib/rating";
import { getLightRecipe, RecipeID } from "@/__tests__/assets";

/** Credentials for test user A, used in seeding and integration tests. */
export const TEST_USER_A = {
  name: "SciCream Tester A",
  email: "a.tester@sci-cream.ca",
  password: "password123",
};

/** Credentials for test user B, used in seeding and integration tests. */
export const TEST_USER_B = {
  name: "SciCream Tester B",
  email: "b.tester@sci-cream.ca",
  password: "password123",
};

/** Example user-defined fructose ingredient spec, used in seeding and integration tests. */
export const USER_DEFINED_FRUCTOSE_SPEC = {
  name: "Fructose (User-Defined)",
  category: "Sweetener",
  SweetenerSpec: { sweeteners: { sugars: { fructose: 100 } }, ByDryWeight: { solids: 100 } },
};

/** Example recipe with an invalid ingredient, used in seeding and integration tests. */
export const RECIPE_INVALID_INGREDIENT: LightRecipe = [
  ["Whole Milk", 230],
  ["Whipping Cream", 235],
  ["Skimmed Milk Powder", 35],
  ["Egg Yolk", 36],
  ["Sucrose (invalid)", 35],
  ["Dextrose", 25],
  ["Fructose", 6],
  ["Salt", 0.5],
  ["Stabilizer Blend (invalid)", 0.84],
];

/**
 * Example recipe containing a valid ingredient with an unusually long name, used to verify that the
 * recipe table truncates the name instead of widening the table and breaking the layout.
 */
export const RECIPE_LONG_INGREDIENT_NAME: LightRecipe = [
  ["Whole Milk", 500],
  ["Eagle Brand Dulce de Leche Caramel Flavoured Sauce", 100],
  ["Sucrose", 80],
];

/**
 * Example recipe whose evaporation exceeds the mix's available water, making the mix-property
 * calculation invalid — used to verify the evaporation readout is flagged instead of crashing.
 */
export const RECIPE_EXCESS_EVAPORATION: LightRecipe = [
  ["Whole Milk", 300],
  ["Sucrose", 100],
];

/** Evaporation amount for the recipe with excess evaporation. */
export const RECIPE_EXCESS_EVAPORATION_EVAP = 500;

/** Shape of a recipe in the seed/test asset set: one identity with one or more versions */
export type SeedRecipeAsset = {
  name: string;
  /** Starred; seeded so the favourites filter has both matching and non-matching rows */
  favourite?: boolean;
  versions: {
    recipe: LightRecipe;
    comments?: string;
    label?: string;
    evaporation?: number;
    rating?: Rating;
  }[];
};

/** Example recipes for TEST_USER_B, used in seeding and integration tests. */
export const TEST_USER_B_RECIPES: SeedRecipeAsset[] = [
  {
    name: "Chocolate Ice Cream",
    favourite: true,
    versions: [
      {
        recipe: getLightRecipe(RecipeID.Main),
        comments: "Rich, dark, and bittersweet. Let the mix ripen overnight before churning.",
        label: "first cut",
        rating: Rating.Bad,
      },
      {
        recipe: getLightRecipe(RecipeID.Main).map(([n, q]) =>
          n === "Sucrose" ? [n, q + 5] : [n, q],
        ) as LightRecipe,
        comments: "Slightly sweeter — bumped sucrose by 5g for a less bitter finish.",
        label: "sweeter tweak",
        rating: Rating.Great,
      },
    ],
  },
  {
    name: "Standard Base",
    versions: [{ recipe: getLightRecipe(RecipeID.RefA), rating: Rating.Good }],
  },
  { name: "Sugar-Free Base", versions: [{ recipe: getLightRecipe(RecipeID.RefB) }] },
  {
    name: "Chocolate Ice Cream (with user-defined)",
    versions: [{ recipe: getLightRecipe(RecipeID.MainWithUserDefined) }],
  },
  {
    name: "Standard Base (with user-defined)",
    versions: [{ recipe: getLightRecipe(RecipeID.RefAWithUserDefined) }],
  },
  {
    name: "Sugar-Free Base (with user-defined)",
    versions: [{ recipe: getLightRecipe(RecipeID.RefBWithUserDefined) }],
  },
  { name: "Recipe with Invalid Ingredients", versions: [{ recipe: RECIPE_INVALID_INGREDIENT }] },
  { name: "Recipe with Long Ingredient Name", versions: [{ recipe: RECIPE_LONG_INGREDIENT_NAME }] },
  {
    name: "Recipe with Excess Evaporation",
    versions: [{ recipe: RECIPE_EXCESS_EVAPORATION, evaporation: RECIPE_EXCESS_EVAPORATION_EVAP }],
  },
];

/**
 * A batch in the seed asset set. `favourite` rides alongside {@link BatchInput} rather than in it,
 * mirroring the data layer: the star is never part of a batch's replaceable contents.
 */
export type SeedBatchAsset = BatchInput & { favourite?: boolean };

/**
 * Example saved batches for TEST_USER_B, used in seeding and the make-recipe whole-page test.
 * Fixed dates (not today) keep the snapshot stable. Seeded newest-last, so "Friday tasting batch"
 * sits at the top of the list. Colors are stored as display names, as the data layer expects.
 */
export const TEST_USER_B_BATCHES: SeedBatchAsset[] = [
  {
    title: "Chocolate trial",
    date: "2026-07-11",
    recipes: [
      {
        name: "Chocolate Base",
        rows: [
          ["Whole Milk", 400],
          ["Sucrose", 90],
          ["Cocoa Powder", 60],
        ],
      },
    ],
  },
  {
    title: "Friday tasting batch",
    favourite: true,
    date: "2026-07-18",
    notes: "Age 12 h at 4 °C, then churn cold.",
    recipes: [
      {
        name: "Strawberry Sorbet",
        rows: [
          ["Strawberry", 300],
          ["Sucrose", 100],
          ["Water", 250],
        ],
        color: "Red",
      },
      {
        name: "Vanilla Base",
        rows: [
          ["Whole Milk", 500],
          ["Sucrose", 120],
          ["35% Cream", 150],
        ],
        color: "Blue",
      },
    ],
  },
];

/**
 * A seeded comment. Users are named by email, which the seed resolves to ids once they exist;
 * timestamps are fixed and in the past, so rendered relative times do not drift between runs.
 */
export type SeedCommentAsset = {
  subject: { type: "blog" | "docs"; key: string };
  author: string;
  body: string;
  createdAt: string;
  /** Set to mark the comment as edited; renders the `(edited)` marker. */
  updatedAt?: string;
  /** Emails of users who have reported this comment, each with an optional reason. */
  reportedBy?: { reporter: string; reason?: string }[];
  /** Seeds a tombstone; `body` must be empty and `by` decides `[deleted]` vs `[removed]`. */
  deleted?: { at: string; by: string };
  replies?: Omit<SeedCommentAsset, "subject" | "replies">[];
};

/**
 * Seeded public comments, so the blog and docs threads render something. The one report is filed by
 * `TEST_USER_B` against the admin `TEST_USER_A`, in whose queue it is the only way to see one.
 * The removed reply is the only tombstone: a moderator's, so `[removed]` renders somewhere.
 */
export const SEED_COMMENTS: SeedCommentAsset[] = [
  {
    subject: { type: "blog", key: "2026-04-27-welcome" },
    author: TEST_USER_A.email,
    body: "Good to see this land. The FPD curve is the part I keep coming back to.",
    createdAt: "2026-07-02T14:30:00Z",
    reportedBy: [{ reporter: TEST_USER_B.email, reason: "Testing the report queue." }],
    replies: [
      {
        author: TEST_USER_B.email,
        body: "Agreed — plotting hardness against serving temperature made it click for me.",
        createdAt: "2026-07-02T16:05:00Z",
      },
      {
        author: TEST_USER_B.email,
        body: "",
        createdAt: "2026-07-02T17:40:00Z",
        deleted: { at: "2026-07-02T18:10:00Z", by: TEST_USER_A.email },
      },
    ],
  },
  {
    subject: { type: "blog", key: "2026-04-27-welcome" },
    author: TEST_USER_B.email,
    body: "One request: a worked example for **sorbet**, where there is no MSNF to lean on.",
    createdAt: "2026-07-03T09:15:00Z",
    updatedAt: "2026-07-03T09:22:00Z",
  },
  {
    subject: { type: "docs", key: "getting-started" },
    author: TEST_USER_A.email,
    body: "The paste-a-recipe shortcut is worth calling out earlier on this page.",
    createdAt: "2026-07-05T11:00:00Z",
  },
];
