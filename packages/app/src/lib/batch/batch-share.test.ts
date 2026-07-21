import { describe, it, expect } from "vitest";

import type { LightRecipe } from "@workspace/sci-cream";

import type { Batch } from "@/lib/batch/batch";
import { MAX_BATCH_RECIPES } from "@/lib/batch/batch";
import { MAX_SHARE_COMMENT_CHARS, MAX_SHARE_NAME_CHARS } from "@/lib/recipe/recipe-share";
import { CategoryColor } from "@/lib/styles/colors";
import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import {
  BATCH_PAYLOAD_VERSION,
  BATCH_URL_WARN_CHARS,
  BatchError,
  BatchErrorKind,
  MAX_BATCH_ENCODED_CHARS,
  MAX_BATCH_QUANTITY,
  type BatchPayload,
  decodeBatchPayload,
  encodeBatchPayload,
  isIsoDate,
  makeBatchFromPayload,
  makeBatchPayload,
  makeBatchRows,
  makeBatchUrl,
} from "./batch-share";

/** Encode an arbitrary JSON value through the real pipeline, bypassing payload validation. */
async function encodeRaw(value: unknown): Promise<string> {
  return encodeBatchPayload(value as BatchPayload);
}

const ROWS: LightRecipe = [
  ["3.25% Milk", 500],
  ["Sucrose", 100],
];

/** A minimal single-recipe batch; override fields per test. */
function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return { date: "2026-07-18", recipes: [{ name: "Base", rows: ROWS }], ...overrides };
}

describe("makeBatchPayload", () => {
  it("omits empty title and notes", () => {
    expect(makeBatchPayload(makeBatch())).toEqual({
      v: 1,
      d: "2026-07-18",
      b: [{ n: "Base", r: ROWS }],
    });
    expect(makeBatchPayload(makeBatch({ title: "", notes: "" }))).toEqual({
      v: 1,
      d: "2026-07-18",
      b: [{ n: "Base", r: ROWS }],
    });
  });

  it("keeps title and notes when present", () => {
    expect(
      makeBatchPayload(makeBatch({ title: "Test batch", notes: "Churn cold." })),
    ).toMatchObject({ t: "Test batch", o: "Churn cold." });
  });

  it("drops provenance, so refs never reach the wire", () => {
    const batch = makeBatch();
    batch.recipes[0]!.ref = { recipeId: 7, versionNumber: 3 };
    const payload = makeBatchPayload(batch);
    expect(JSON.stringify(payload)).not.toContain("recipeId");
    expect(payload.b[0]).toEqual({ n: "Base", r: ROWS });
  });
});

describe("encodeBatchPayload / decodeBatchPayload", () => {
  it("round-trips a minimal payload", async () => {
    const payload = makeBatchPayload(makeBatch());
    const encoded = await encodeBatchPayload(payload);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/); // base64url alphabet, URL-fragment safe
    await expect(decodeBatchPayload(encoded)).resolves.toEqual(payload);
  });

  it("round-trips title, notes, and multiple recipes", async () => {
    const batch = makeBatch({
      title: "Test batch 2026-07-18",
      notes: "Age 12 h at 4 °C, then churn.",
      recipes: [
        { name: "Sorbet", rows: ROWS },
        { name: "Base", rows: [["Cream", 250]] },
      ],
    });
    const payload = makeBatchPayload(batch);
    await expect(decodeBatchPayload(await encodeBatchPayload(payload))).resolves.toEqual(payload);
  });

  it("survives a full round trip back into a Batch, without provenance", async () => {
    const batch = makeBatch({ title: "T", notes: "N" });
    batch.recipes[0]!.ref = { recipeId: 7, versionNumber: 3 };
    const decoded = await decodeBatchPayload(await encodeBatchPayload(makeBatchPayload(batch)));
    expect(makeBatchFromPayload(decoded)).toEqual({
      title: "T",
      date: "2026-07-18",
      notes: "N",
      recipes: [{ name: "Base", rows: ROWS }],
    });
  });

  it("stays within chat-client URL limits for a batch sharing an ingredient vocabulary", async () => {
    // The realistic case: several recipes drawing on the same pantry. Deflate eats repeated names.
    const names = Array.from({ length: 12 }, (_, i) => `Some Rather Long Ingredient Name ${i}`);
    const recipes = Array.from({ length: MAX_BATCH_RECIPES }, (_, r) => ({
      name: `Recipe Number ${r}`,
      rows: names.map((n, i) => [n, 100 + i + r] as LightRecipe[number]),
    }));
    const encoded = await encodeBatchPayload(makeBatchPayload(makeBatch({ recipes })));
    expect(encoded.length).toBeLessThan(BATCH_URL_WARN_CHARS);
  });

  it("drops unknown extra fields on decode, at both levels", async () => {
    const encoded = await encodeRaw({
      v: 1,
      d: "2026-07-18",
      b: [{ n: "Base", r: ROWS, extra: 1 }],
      x: "extra",
    });
    await expect(decodeBatchPayload(encoded)).resolves.toEqual({
      v: 1,
      d: "2026-07-18",
      b: [{ n: "Base", r: ROWS }],
    });
  });

  it("rejects truncated and corrupted payloads as Invalid", async () => {
    const encoded = await encodeBatchPayload(makeBatchPayload(makeBatch()));
    for (const bad of [encoded.slice(0, 10), `${encoded}!!!`, "not-a-payload", ""]) {
      await expect(decodeBatchPayload(bad)).rejects.toMatchObject({ kind: BatchErrorKind.Invalid });
    }
  });

  it("rejects a newer payload version as UnknownVersion", async () => {
    const encoded = await encodeRaw({ v: BATCH_PAYLOAD_VERSION + 1, d: "2026-07-18", b: [] });
    await expect(decodeBatchPayload(encoded)).rejects.toMatchObject({
      kind: BatchErrorKind.UnknownVersion,
    });
  });

  it("rejects malformed payload shapes as Invalid", async () => {
    const cases: unknown[] = [
      [1, 2, 3], // not an object
      { v: 1, b: [{ n: "A", r: ROWS }] }, // date missing
      { v: 1, d: "18-07-2026", b: [{ n: "A", r: ROWS }] }, // wrong date format
      { v: 1, d: "2026-02-31", b: [{ n: "A", r: ROWS }] }, // date that does not exist
      { v: 1, d: "2026-07-18", b: [] }, // no recipes
      { v: 1, d: "2026-07-18", b: {} }, // recipes not an array
      { v: 1, d: "2026-07-18", t: 42, b: [{ n: "A", r: ROWS }] }, // title not a string
      { v: 1, d: "2026-07-18", o: 42, b: [{ n: "A", r: ROWS }] }, // notes not a string
      { v: 1, d: "2026-07-18", b: [{ n: 42, r: ROWS }] }, // recipe name not a string
      { v: 1, d: "2026-07-18", b: [{ n: "A" }] }, // rows missing
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [] }] }, // rows empty
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [["", 1]] }] }, // empty ingredient name
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [["Sucrose"]] }] }, // row not a pair
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [["Sucrose", -1]] }] }, // negative quantity
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [["Sucrose", null]] }] }, // non-numeric quantity
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [["S", MAX_BATCH_QUANTITY + 1]] }] }, // too heavy
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [["S", 1]] }, "nope"] }, // recipe not an object
    ];
    for (const value of cases) {
      await expect(decodeBatchPayload(await encodeRaw(value))).rejects.toMatchObject({
        kind: BatchErrorKind.Invalid,
      });
    }
  });

  it("rejects payloads exceeding the per-field caps as Invalid", async () => {
    const long = (n: number) => "x".repeat(n);
    const cases: unknown[] = [
      { v: 1, d: "2026-07-18", t: long(MAX_SHARE_NAME_CHARS + 1), b: [{ n: "A", r: ROWS }] },
      { v: 1, d: "2026-07-18", o: long(MAX_SHARE_COMMENT_CHARS + 1), b: [{ n: "A", r: ROWS }] },
      { v: 1, d: "2026-07-18", b: [{ n: long(MAX_SHARE_NAME_CHARS + 1), r: ROWS }] },
      { v: 1, d: "2026-07-18", b: [{ n: "A", r: [[long(MAX_SHARE_NAME_CHARS + 1), 1]] }] },
      {
        v: 1,
        d: "2026-07-18",
        b: [{ n: "A", r: Array.from({ length: RECIPE_TOTAL_ROWS + 1 }, () => ["S", 1]) }],
      },
      {
        v: 1,
        d: "2026-07-18",
        b: Array.from({ length: MAX_BATCH_RECIPES + 1 }, () => ({ n: "A", r: [["S", 1]] })),
      },
    ];
    for (const value of cases) {
      await expect(decodeBatchPayload(await encodeRaw(value))).rejects.toMatchObject({
        kind: BatchErrorKind.Invalid,
      });
    }
  });

  it("rejects over-long encoded input as TooLarge before decoding", async () => {
    await expect(decodeBatchPayload("A".repeat(MAX_BATCH_ENCODED_CHARS + 1))).rejects.toMatchObject(
      { kind: BatchErrorKind.TooLarge },
    );
  });

  it("accepts a batch at exactly the recipe and row caps", async () => {
    const recipes = Array.from({ length: MAX_BATCH_RECIPES }, (_, r) => ({
      name: `R${String(r)}`,
      rows: Array.from(
        { length: RECIPE_TOTAL_ROWS },
        (_, i) => [`Ingredient ${String(i)}`, 1] as LightRecipe[number],
      ),
    }));
    const payload = makeBatchPayload(makeBatch({ recipes }));
    await expect(decodeBatchPayload(await encodeBatchPayload(payload))).resolves.toEqual(payload);
  });
});

describe("container colors on the wire", () => {
  it("carries a chosen color by name, so a link is not tied to a palette slot", async () => {
    const batch = makeBatch({
      recipes: [{ name: "Base", rows: ROWS, color: CategoryColor.White }],
    });
    expect(makeBatchPayload(batch)).toMatchObject({ b: [{ c: "White" }] });

    const encoded = await encodeBatchPayload(makeBatchPayload(batch));
    const decoded = makeBatchFromPayload(await decodeBatchPayload(encoded));
    expect(decoded.recipes[0]?.color).toBe(CategoryColor.White);
  });

  it("leaves an unpicked color off the wire, so the recipient falls back positionally", async () => {
    expect(makeBatchPayload(makeBatch())).toEqual({
      v: 1,
      d: "2026-07-18",
      b: [{ n: "Base", r: ROWS }],
    });

    const encoded = await encodeBatchPayload(makeBatchPayload(makeBatch()));
    const decoded = makeBatchFromPayload(await decodeBatchPayload(encoded));
    expect(decoded.recipes[0]).not.toHaveProperty("color");
  });

  it("drops a color it cannot name rather than rejecting an otherwise weighable batch", async () => {
    const encoded = await encodeRaw({
      v: 1,
      d: "2026-07-18",
      b: [{ n: "Base", r: ROWS, c: "Chartreuse" }],
    });

    const payload = await decodeBatchPayload(encoded);
    expect(payload.b[0]).not.toHaveProperty("c");
    expect(payload.b[0]?.r).toEqual(ROWS);
  });

  it("accepts a link written before colors existed, which is why the version did not move", async () => {
    // Byte-for-byte what the shipped v1 encoder produced: no `c` anywhere.
    const encoded = await encodeRaw({ v: 1, d: "2026-07-18", b: [{ n: "Base", r: ROWS }] });

    const decoded = makeBatchFromPayload(await decodeBatchPayload(encoded));
    expect(decoded.recipes).toEqual([{ name: "Base", rows: ROWS }]);
  });
});

describe("BatchError", () => {
  it("carries checklist-specific copy, not share-link copy", () => {
    expect(new BatchError(BatchErrorKind.Invalid).message).toMatch(/checklist link/);
    expect(new BatchError(BatchErrorKind.Invalid).message).toMatch(/invalid or corrupted/);
    expect(new BatchError(BatchErrorKind.TooLarge).message).toMatch(/maximum supported size/);
    expect(new BatchError(BatchErrorKind.UnknownVersion).message).toMatch(/newer version/);
  });
});

describe("isIsoDate", () => {
  it("accepts real calendar days", () => {
    for (const d of ["2026-07-18", "2024-02-29", "2000-01-01"]) expect(isIsoDate(d)).toBe(true);
  });

  it("rejects malformed, non-existent, and non-string dates", () => {
    for (const d of ["2026-02-31", "2025-02-29", "2026-13-01", "18-07-2026", "2026-7-8", "", 42]) {
      expect(isIsoDate(d)).toBe(false);
    }
  });
});

describe("makeBatchRows", () => {
  it("drops nameless rows and keeps unresolved names, which are still weighable", () => {
    expect(
      makeBatchRows([
        ["3.25% Milk", 500],
        ["", 12],
        ["Totally Unknown", 30],
      ]),
    ).toEqual([
      ["3.25% Milk", 500],
      ["Totally Unknown", 30],
    ]);
  });
});

describe("makeBatchUrl", () => {
  it("puts the payload in the fragment of the make-recipe route", () => {
    expect(makeBatchUrl("abc", "https://x.test")).toBe("https://x.test/make-recipe#abc");
  });
});
