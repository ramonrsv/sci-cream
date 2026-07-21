import type { LightRecipe, LightRecipeLine } from "@workspace/sci-cream";

import type { Batch, BatchRecipe } from "@/lib/batch/batch";
import { MAX_BATCH_RECIPES } from "@/lib/batch/batch";
import { MAX_SHARE_COMMENT_CHARS, MAX_SHARE_NAME_CHARS } from "@/lib/recipe/share";
import { categoryColorFromName, categoryColorName } from "@/lib/styles/colors";
import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import {
  PayloadErrorKind,
  comparePayloadVersion,
  decodeUrlPayload,
  encodeUrlPayload,
} from "@/lib/url-payload";

/**
 * Make-recipe handoff links: a versioned payload (title, date, notes, per-recipe `[name, qty]`
 * rows), compressed and base64url-encoded into the fragment of `/make-recipe#<payload>`, which
 * never reaches the server.
 *
 * The wire shape is a projection of `Batch`, not a serialization: `ref` stays behind, since it
 * would leak recipe ids and dropping it keeps the checkoff hash reproducible on both sides.
 */

/** Current batch payload format version; independent of the recipe share payload's version. */
export const BATCH_PAYLOAD_VERSION = 1;

/** Maximum accepted length of the encoded payload string, checked before any decoding work. */
export const MAX_BATCH_ENCODED_CHARS = 32 * 1024;

/** Maximum accepted size of the decompressed payload JSON, enforced during decompression. */
export const MAX_BATCH_DECODED_BYTES = 64 * 1024;

/**
 * Maximum accepted quantity in grams. These are real amounts bound for a kitchen scale — 1e6 g is
 * a tonne — and an upper bound keeps a garbage payload from rendering "1e308 g".
 */
export const MAX_BATCH_QUANTITY = 1_000_000;

/** Path of the make-recipe checklist route; the payload rides in the URL fragment. */
export const MAKE_RECIPE_PATH = "/make-recipe";

/** Encoded length above which a link is likely to be mangled by conservative chat clients. */
export const BATCH_URL_WARN_CHARS = 1800;

/** Wire shape of a batch handoff link. Field names are single letters to keep URLs short. */
export interface BatchPayload {
  /** Format version; see {@link BATCH_PAYLOAD_VERSION}. */
  v: typeof BATCH_PAYLOAD_VERSION;
  /** Batch title. */
  t?: string;
  /** Calendar day, `YYYY-MM-DD`. */
  d: string;
  /** Batch notes; `o` because `n` is taken by the per-recipe name. */
  o?: string;
  /** Recipes in batch order; order drives the badge letter and hue. */
  b: BatchPayloadRecipe[];
}

/** One recipe on the wire: display name plus the rows to weigh. */
export interface BatchPayloadRecipe {
  /** Recipe display name. */
  n: string;
  /** `[name, quantity]` rows carrying the amounts to weigh. */
  r: LightRecipe;
  /** Container color by name (e.g. `"Blue"`); absent when unpicked, so both sides go positional. */
  c?: string;
}

/** Failure modes of decoding a handoff link, each with a user-facing message. */
export enum BatchErrorKind {
  Invalid = "invalid",
  TooLarge = "too-large",
  UnknownVersion = "unknown-version",
}

/** User-facing message for each {@link BatchErrorKind}. */
export const BATCH_ERROR_MESSAGES: Record<BatchErrorKind, string> = {
  [BatchErrorKind.Invalid]: "This checklist link is invalid or corrupted.",
  [BatchErrorKind.TooLarge]: "This checklist link exceeds the maximum supported size.",
  [BatchErrorKind.UnknownVersion]:
    "This checklist link was created by a newer version of the app. Reload the page and try again.",
};

/** Error thrown while decoding a handoff link; `message` is safe to show the user. */
export class BatchError extends Error {
  /** The failure mode, for programmatic handling; the message already reflects it. */
  readonly kind: BatchErrorKind;

  /** Create a batch error of the given kind, optionally chaining the underlying `cause`. */
  constructor(kind: BatchErrorKind, cause?: unknown) {
    super(BATCH_ERROR_MESSAGES[kind], cause === undefined ? undefined : { cause });
    this.name = "BatchError";
    this.kind = kind;
  }
}

/** Transport failures mapped onto batch-branded kinds, so user-facing copy stays batch-specific. */
const BATCH_KIND_BY_PAYLOAD_KIND: Record<PayloadErrorKind, BatchErrorKind> = {
  [PayloadErrorKind.Invalid]: BatchErrorKind.Invalid,
  [PayloadErrorKind.TooLarge]: BatchErrorKind.TooLarge,
};

/** Build a {@link BatchError} for a transport failure from `decodeUrlPayload`. */
function makeBatchCodecError(kind: PayloadErrorKind, cause?: unknown): BatchError {
  return new BatchError(BATCH_KIND_BY_PAYLOAD_KIND[kind], cause);
}

/**
 * Whether `value` is a `YYYY-MM-DD` calendar date that actually exists. The round-trip check is
 * what rejects `2026-02-31`, which `Date.parse` happily rolls over into March.
 */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Assemble a {@link BatchPayload} from a batch, dropping empty optional fields and provenance. */
export function makeBatchPayload(batch: Batch): BatchPayload {
  return {
    v: BATCH_PAYLOAD_VERSION,
    ...(batch.title ? { t: batch.title } : {}),
    d: batch.date,
    ...(batch.notes ? { o: batch.notes } : {}),
    b: batch.recipes.map(({ name, rows, color }) => ({
      n: name,
      r: rows,
      ...(color === undefined ? {} : { c: categoryColorName(color) }),
    })),
  };
}

/** Rebuild a {@link Batch} from a decoded payload; `ref` is absent by design. */
export function makeBatchFromPayload(payload: BatchPayload): Batch {
  const recipes: BatchRecipe[] = payload.b.map(({ n, r, c }) => {
    const color = categoryColorFromName(c);
    return { name: n, rows: r, ...(color === undefined ? {} : { color }) };
  });
  return {
    ...(payload.t === undefined ? {} : { title: payload.t }),
    date: payload.d,
    ...(payload.o === undefined ? {} : { notes: payload.o }),
    recipes,
  };
}

/** Encode a batch payload for the URL fragment: JSON → raw deflate → base64url. */
export async function encodeBatchPayload(payload: BatchPayload): Promise<string> {
  return encodeUrlPayload(payload);
}

/**
 * Decode and strictly validate an encoded batch payload (the reverse of
 * {@link encodeBatchPayload}). The input is untrusted; anything that fails size caps, decoding, or
 * shape validation throws a {@link BatchError} — no partial results.
 */
export async function decodeBatchPayload(encoded: string): Promise<BatchPayload> {
  return decodeUrlPayload(encoded, {
    maxEncodedChars: MAX_BATCH_ENCODED_CHARS,
    maxDecodedBytes: MAX_BATCH_DECODED_BYTES,
    validate: validateBatchPayload,
    makeError: makeBatchCodecError,
  });
}

/** Narrow untrusted parsed JSON to a {@link BatchPayload}; throws {@link BatchError} otherwise. */
function validateBatchPayload(parsed: unknown): BatchPayload {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new BatchError(BatchErrorKind.Invalid);
  }
  const obj = parsed as Record<string, unknown>;

  // A greater integer version means the link comes from a newer app; anything else is garbage.
  switch (comparePayloadVersion(obj.v, BATCH_PAYLOAD_VERSION)) {
    case "newer":
      throw new BatchError(BatchErrorKind.UnknownVersion);
    case "invalid":
      throw new BatchError(BatchErrorKind.Invalid);
    case "match":
      break;
  }

  const { t: title, d: date, o: notes, b: recipes } = obj;

  if (!isIsoDate(date)) throw new BatchError(BatchErrorKind.Invalid);
  if (!isOptionalStringWithin(title, MAX_SHARE_NAME_CHARS)) {
    throw new BatchError(BatchErrorKind.Invalid);
  }
  if (!isOptionalStringWithin(notes, MAX_SHARE_COMMENT_CHARS)) {
    throw new BatchError(BatchErrorKind.Invalid);
  }

  if (!Array.isArray(recipes) || recipes.length === 0 || recipes.length > MAX_BATCH_RECIPES) {
    throw new BatchError(BatchErrorKind.Invalid);
  }

  return {
    v: BATCH_PAYLOAD_VERSION,
    ...(title === undefined ? {} : { t: title }),
    d: date,
    ...(notes === undefined ? {} : { o: notes }),
    // Rebuild each recipe so unknown extra fields are dropped rather than carried along.
    b: recipes.map((recipe) => validateBatchPayloadRecipe(recipe)),
  };
}

/** Narrow one untrusted wire recipe; throws {@link BatchError} on any shape or cap violation. */
function validateBatchPayloadRecipe(parsed: unknown): BatchPayloadRecipe {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new BatchError(BatchErrorKind.Invalid);
  }
  const { n: name, r: rows, c: color } = parsed as Record<string, unknown>;

  if (typeof name !== "string" || name.length > MAX_SHARE_NAME_CHARS) {
    throw new BatchError(BatchErrorKind.Invalid);
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > RECIPE_TOTAL_ROWS) {
    throw new BatchError(BatchErrorKind.Invalid);
  }

  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 2) throw new BatchError(BatchErrorKind.Invalid);
    const [rowName, quantity] = row as unknown[];
    const nameOk =
      typeof rowName === "string" && rowName !== "" && rowName.length <= MAX_SHARE_NAME_CHARS;
    const quantityOk =
      typeof quantity === "number" &&
      Number.isFinite(quantity) &&
      quantity >= 0 &&
      quantity <= MAX_BATCH_QUANTITY;
    if (!nameOk || !quantityOk) throw new BatchError(BatchErrorKind.Invalid);
  }

  // An unknown color is dropped, not rejected: only the amounts are worth failing a link over.
  const known = categoryColorFromName(color);

  return {
    n: name,
    r: rows as LightRecipe,
    ...(known === undefined ? {} : { c: categoryColorName(known) }),
  };
}

/** Whether `value` is absent, or a string no longer than `maxChars`. */
function isOptionalStringWithin(value: unknown, maxChars: number): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length <= maxChars);
}

/** Build the handoff URL for an encoded payload; `origin` is e.g. `window.location.origin`. */
export function makeBatchUrl(encoded: string, origin: string): string {
  return `${origin}${MAKE_RECIPE_PATH}#${encoded}`;
}

/** Extract the batchable `[name, quantity]` rows from stored saved-recipe or editor rows. */
export function makeBatchRows(rows: readonly LightRecipeLine[]): LightRecipe {
  return rows.filter(([name]) => name !== "").map(([name, quantity]) => [name, quantity]);
}
