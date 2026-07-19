import { describe, it, expect } from "vitest";
import { deflateRawSync } from "node:zlib";

import {
  PayloadErrorKind,
  comparePayloadVersion,
  decodeUrlPayload,
  encodeUrlPayload,
} from "./url-payload";

/** Distinguishable branded error, standing in for `ShareError`/`BatchError`. */
class TestError extends Error {
  /** Create a test error carrying the transport kind, or `"validate"` for validator failures. */
  constructor(readonly kind: PayloadErrorKind | "validate") {
    super(`test:${kind}`);
  }
}

const makeError = (kind: PayloadErrorKind) => new TestError(kind);

/** Options accepting any object, with generous caps unless a test overrides them. */
function options(overrides: Partial<Parameters<typeof decodeUrlPayload>[1]> = {}) {
  return {
    maxEncodedChars: 1024,
    maxDecodedBytes: 4096,
    validate: (parsed: unknown) => parsed,
    makeError,
    ...overrides,
  };
}

describe("encodeUrlPayload / decodeUrlPayload", () => {
  it("round-trips an arbitrary JSON payload", async () => {
    const payload = { v: 1, nested: { a: [1, 2, 3], b: "x" }, n: null };
    const encoded = await encodeUrlPayload(payload);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/); // base64url alphabet, URL-fragment safe
    await expect(decodeUrlPayload(encoded, options())).resolves.toEqual(payload);
  });

  it("rejects over-long encoded input as TooLarge before decoding", async () => {
    const encoded = "A".repeat(1025);
    await expect(decodeUrlPayload(encoded, options())).rejects.toMatchObject({
      kind: PayloadErrorKind.TooLarge,
    });
  });

  it("rejects input that inflates beyond the byte cap as TooLarge, not Invalid", async () => {
    // Highly compressible: far larger than the cap raw, tiny once deflated. This pins the
    // SizeLimitExceeded sentinel — without it the cap failure surfaces as Invalid.
    const encoded = await encodeUrlPayload({ pad: "y".repeat(64 * 1024) });
    expect(encoded.length).toBeLessThan(1024);
    await expect(decodeUrlPayload(encoded, options())).rejects.toMatchObject({
      kind: PayloadErrorKind.TooLarge,
    });
  });

  it("rejects truncated, corrupted, and non-base64url input as Invalid", async () => {
    const encoded = await encodeUrlPayload({ v: 1 });
    for (const bad of [encoded.slice(0, 4), `${encoded}!!!`, "not-a-payload", ""]) {
      await expect(decodeUrlPayload(bad, options())).rejects.toMatchObject({
        kind: PayloadErrorKind.Invalid,
      });
    }
  });

  it("rejects well-formed deflate that is not JSON as Invalid", async () => {
    const encoded = deflateRawSync("{not json").toString("base64url");
    await expect(decodeUrlPayload(encoded, options())).rejects.toMatchObject({
      kind: PayloadErrorKind.Invalid,
    });
  });

  it("propagates validator errors unwrapped, so branded errors are not remapped", async () => {
    const encoded = await encodeUrlPayload({ v: 1 });
    const validate = () => {
      throw new TestError("validate");
    };
    await expect(decodeUrlPayload(encoded, options({ validate }))).rejects.toMatchObject({
      kind: "validate",
    });
  });

  it("routes every transport failure through the injected factory", async () => {
    const kinds: PayloadErrorKind[] = [];
    const spy = (kind: PayloadErrorKind) => {
      kinds.push(kind);
      return new TestError(kind);
    };
    await expect(
      decodeUrlPayload("A".repeat(2000), options({ makeError: spy })),
    ).rejects.toBeInstanceOf(TestError);
    await expect(decodeUrlPayload("!!!", options({ makeError: spy }))).rejects.toBeInstanceOf(
      TestError,
    );
    expect(kinds).toEqual([PayloadErrorKind.TooLarge, PayloadErrorKind.Invalid]);
  });
});

describe("comparePayloadVersion", () => {
  it("matches the expected version", () => {
    expect(comparePayloadVersion(1, 1)).toBe("match");
  });

  it("reports a greater integer version as newer", () => {
    expect(comparePayloadVersion(2, 1)).toBe("newer");
    expect(comparePayloadVersion(99, 1)).toBe("newer");
  });

  it("reports lower, non-integer, and non-numeric versions as invalid", () => {
    for (const value of [0, -1, 1.5, "1", undefined, null, {}]) {
      expect(comparePayloadVersion(value, 1)).toBe("invalid");
    }
  });
});
