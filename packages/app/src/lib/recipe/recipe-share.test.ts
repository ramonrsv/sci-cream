import { describe, it, expect } from "vitest";
import { deflateRawSync } from "node:zlib";

import type { LightRecipe } from "@workspace/sci-cream";

import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import { makeEmptyRecipe } from "@/lib/recipe/recipe";
import {
  MAX_DECODED_BYTES,
  MAX_ENCODED_CHARS,
  MAX_SHARE_COMMENT_CHARS,
  MAX_SHARE_NAME_CHARS,
  MAX_SHARE_SPECS,
  SHARE_PAYLOAD_VERSION,
  ShareError,
  ShareErrorKind,
  decodeSharePayload,
  encodeSharePayload,
  findUserDefinedShareNames,
  makeEmbedSnippet,
  makeSharePayload,
  makeShareRows,
  makeShareUrl,
  type SharePayload,
} from "./recipe-share";

/** Encode an arbitrary JSON value through the real pipeline, bypassing payload validation. */
async function encodeRaw(value: unknown): Promise<string> {
  return encodeSharePayload(value as SharePayload);
}

const ROWS: LightRecipe = [
  ["3.25% Milk", 500],
  ["Sucrose", 100],
];

describe("makeSharePayload", () => {
  it("omits zero evaporation, empty comments, and empty spec lists", () => {
    expect(makeSharePayload("A", ROWS)).toEqual({ v: 1, n: "A", r: ROWS });
    expect(makeSharePayload("A", ROWS, 0, "", [])).toEqual({ v: 1, n: "A", r: ROWS });
  });

  it("keeps evaporation, comments, and specs when present", () => {
    const spec = { name: "X" };
    expect(makeSharePayload("A", ROWS, 25, "Ripen overnight.", [spec])).toEqual({
      v: 1,
      n: "A",
      r: ROWS,
      e: 25,
      c: "Ripen overnight.",
      s: [spec],
    });
  });
});

describe("encodeSharePayload / decodeSharePayload", () => {
  it("round-trips a minimal payload", async () => {
    const payload = makeSharePayload("Strawberry Sorbet", ROWS);
    const encoded = await encodeSharePayload(payload);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/); // base64url alphabet, URL-fragment safe
    await expect(decodeSharePayload(encoded)).resolves.toEqual(payload);
  });

  it("round-trips evaporation, comments, and inlined specs", async () => {
    const spec = { DairySimpleSpec: { name: "My Milk", fat: 3.8 } };
    const payload = makeSharePayload("Base", ROWS, 42.5, "Age 12 h at 4 °C.", [spec]);
    await expect(decodeSharePayload(await encodeSharePayload(payload))).resolves.toEqual(payload);
  });

  it("stays comfortably within URL limits for a full-size recipe", async () => {
    const rows: LightRecipe = Array.from({ length: RECIPE_TOTAL_ROWS }, (_, i) => [
      `Some Rather Long Ingredient Name ${i}`,
      123.45 + i,
    ]);
    const encoded = await encodeSharePayload(makeSharePayload("A Recipe Name", rows));
    expect(encoded.length).toBeLessThan(2000);
  });

  it("drops unknown extra fields on decode", async () => {
    const encoded = await encodeRaw({ v: 1, n: "A", r: ROWS, x: "extra" });
    await expect(decodeSharePayload(encoded)).resolves.toEqual({ v: 1, n: "A", r: ROWS });
  });

  it("rejects truncated and corrupted payloads as Invalid", async () => {
    const encoded = await encodeSharePayload(makeSharePayload("A", ROWS));
    for (const bad of [encoded.slice(0, 10), `${encoded}!!!`, "not-a-payload", ""]) {
      await expect(decodeSharePayload(bad)).rejects.toMatchObject({ kind: ShareErrorKind.Invalid });
    }
  });

  it("rejects a newer payload version as UnknownVersion", async () => {
    const encoded = await encodeRaw({ v: SHARE_PAYLOAD_VERSION + 1, n: "A", r: ROWS });
    await expect(decodeSharePayload(encoded)).rejects.toMatchObject({
      kind: ShareErrorKind.UnknownVersion,
    });
  });

  it("rejects non-integer or missing versions as Invalid", async () => {
    for (const v of [undefined, "1", 1.5, 0, -1]) {
      const encoded = await encodeRaw({ v, n: "A", r: ROWS });
      await expect(decodeSharePayload(encoded)).rejects.toMatchObject({
        kind: ShareErrorKind.Invalid,
      });
    }
  });

  it("rejects malformed payload shapes as Invalid", async () => {
    const cases: unknown[] = [
      [1, 2, 3], // not an object
      { v: 1, n: 42, r: ROWS }, // name not a string
      { v: 1, n: "x".repeat(MAX_SHARE_NAME_CHARS + 1), r: ROWS }, // name too long
      { v: 1, n: "A" }, // rows missing
      { v: 1, n: "A", r: [] }, // rows empty
      { v: 1, n: "A", r: [["", 1]] }, // empty ingredient name
      { v: 1, n: "A", r: [["Sucrose"]] }, // row not a pair
      { v: 1, n: "A", r: [["Sucrose", -1]] }, // negative quantity
      { v: 1, n: "A", r: [["Sucrose", null]] }, // non-numeric quantity
      { v: 1, n: "A", r: Array.from({ length: RECIPE_TOTAL_ROWS + 1 }, () => ["S", 1]) },
      { v: 1, n: "A", r: ROWS, e: -1 }, // negative evaporation
      { v: 1, n: "A", r: ROWS, e: "5" }, // non-numeric evaporation
      { v: 1, n: "A", r: ROWS, c: 42 }, // comments not a string
      { v: 1, n: "A", r: ROWS, c: "x".repeat(MAX_SHARE_COMMENT_CHARS + 1) }, // comments too long
      { v: 1, n: "A", r: ROWS, s: {} }, // specs not an array
      { v: 1, n: "A", r: ROWS, s: Array.from({ length: MAX_SHARE_SPECS + 1 }, () => ({})) },
    ];
    for (const value of cases) {
      await expect(decodeSharePayload(await encodeRaw(value))).rejects.toMatchObject({
        kind: ShareErrorKind.Invalid,
      });
    }
  });

  it("rejects non-JSON quantities like Infinity as Invalid", async () => {
    // JSON.stringify turns non-finite numbers into null, so exercise these via raw JSON text
    // pushed through an equivalent deflate + base64url pipeline (JSON.parse rejects the token).
    const encoded = deflateRawSync('{"v":1,"n":"A","r":[["Sucrose",Infinity]]}').toString(
      "base64url",
    );
    await expect(decodeSharePayload(encoded)).rejects.toMatchObject({
      kind: ShareErrorKind.Invalid,
    });
  });

  it("rejects over-long encoded input as TooLarge before decoding", async () => {
    await expect(decodeSharePayload("A".repeat(MAX_ENCODED_CHARS + 1))).rejects.toMatchObject({
      kind: ShareErrorKind.TooLarge,
    });
  });

  it("rejects payloads that inflate beyond the decoded-size cap as TooLarge", async () => {
    // Highly compressible: far larger than MAX_DECODED_BYTES raw, tiny once deflated.
    const bomb = { v: 1, n: "A", r: ROWS, s: ["y".repeat(MAX_DECODED_BYTES * 4)] };
    const encoded = await encodeRaw(bomb);
    expect(encoded.length).toBeLessThan(MAX_ENCODED_CHARS);
    await expect(decodeSharePayload(encoded)).rejects.toMatchObject({
      kind: ShareErrorKind.TooLarge,
    });
  });
});

describe("ShareError", () => {
  it("carries a user-facing message per kind", () => {
    expect(new ShareError(ShareErrorKind.Invalid).message).toMatch(/invalid or corrupted/);
    expect(new ShareError(ShareErrorKind.TooLarge).message).toMatch(/maximum supported size/);
    expect(new ShareError(ShareErrorKind.UnknownVersion).message).toMatch(/newer version/);
    expect(new ShareError(ShareErrorKind.InvalidSpec).message).toMatch(/invalid ingredient spec/);
  });
});

describe("makeShareRows", () => {
  it("keeps named rows in editor order, including unresolved names, and zeroes unset qty", () => {
    const recipe = makeEmptyRecipe(0);
    recipe.ingredientRows[1] = { index: 1, name: "3.25% Milk", quantity: 500 };
    recipe.ingredientRows[3] = { index: 3, name: "Totally Unknown", quantity: undefined };
    recipe.ingredientRows[5] = { index: 5, name: "", quantity: 12 }; // nameless: dropped
    recipe.ingredientRows[7] = { index: 7, name: "Sucrose", quantity: 0 };

    expect(makeShareRows(recipe)).toEqual([
      ["3.25% Milk", 500],
      ["Totally Unknown", 0],
      ["Sucrose", 0],
    ]);
  });
});

describe("findUserDefinedShareNames", () => {
  it("returns row names present in the user's specs, deduplicated in row order", () => {
    const rows: LightRecipe = [
      ["Built-in", 1],
      ["My Blend", 2],
      ["My Milk", 3],
      ["My Blend", 4],
    ];
    const names = findUserDefinedShareNames(rows, ["My Milk", "My Blend", "Unused Spec"]);
    expect(names).toEqual(["My Blend", "My Milk"]);
  });

  it("returns empty when no rows use user-defined ingredients", () => {
    expect(findUserDefinedShareNames(ROWS, [])).toEqual([]);
  });
});

describe("share URLs", () => {
  it("builds viewer and embed URLs with the payload in the fragment", () => {
    expect(makeShareUrl("abc", "https://x.test")).toBe("https://x.test/share#abc");
    expect(makeShareUrl("abc", "https://x.test", true)).toBe("https://x.test/share/embed#abc");
  });

  it("builds an iframe snippet around the embed URL", () => {
    expect(makeEmbedSnippet("https://x.test/share/embed#abc")).toBe(
      '<iframe src="https://x.test/share/embed#abc" width="600" height="675"></iframe>',
    );
  });
});
