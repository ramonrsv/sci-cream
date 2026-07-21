import type { LightRecipe, LightRecipeLine } from "@workspace/sci-cream";
import {
  MixProperties,
  OnConflict,
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

import type { Recipe } from "@/lib/recipe";
import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import {
  PayloadErrorKind,
  comparePayloadVersion,
  decodeUrlPayload,
  encodeUrlPayload,
} from "@/lib/url-payload";

/**
 * Recipe share links: a versioned payload (recipe name, `[name, qty]` rows, optional evaporation
 * and inlined user-ingredient specs) is compressed and base64url-encoded into the URL fragment of
 * `/share#<payload>`, which is never sent to the server. Viewer routes live in `app/share/`.
 */

/** Current share payload format version; bump when the payload shape changes incompatibly. */
export const SHARE_PAYLOAD_VERSION = 1;

/** Maximum accepted length of the encoded payload string, checked before any decoding work. */
export const MAX_ENCODED_CHARS = 32 * 1024;

/** Maximum accepted size of the decompressed payload JSON, enforced during decompression. */
export const MAX_DECODED_BYTES = 64 * 1024;

/** Maximum accepted length of the recipe name and of each ingredient name. */
export const MAX_SHARE_NAME_CHARS = 200;

/** Maximum accepted number of inlined ingredient specs. */
export const MAX_SHARE_SPECS = 20;

/** Maximum accepted length of the recipe comments. */
export const MAX_SHARE_COMMENT_CHARS = 2000;

/** Path of the share viewer route; the payload rides in the URL fragment. */
export const SHARE_PATH = "/share";

/** Path of the embeddable (iframe-friendly) share viewer route. */
export const SHARE_EMBED_PATH = "/share/embed";

/** Wire shape of a share link's payload. Field names are single letters to keep URLs short. */
export interface SharePayload {
  /** Format version; see {@link SHARE_PAYLOAD_VERSION}. */
  v: typeof SHARE_PAYLOAD_VERSION;
  /** Recipe display name. */
  n: string;
  /** `[name, quantity]` rows in editor order; may include names the recipient cannot resolve. */
  r: LightRecipe;
  /** Grams of water evaporated during preparation; omitted when zero. */
  e?: number;
  /** Recipe comments (from the shared saved version), rendered read-only by the viewer. */
  c?: string;
  /** Inlined user-ingredient spec JSONs (opt-in at share time; embeds full composition data). */
  s?: unknown[];
}

/** Failure modes of decoding/consuming a share link, each with a user-facing message. */
export enum ShareErrorKind {
  Invalid = "invalid",
  TooLarge = "too-large",
  UnknownVersion = "unknown-version",
  InvalidSpec = "invalid-spec",
}

/** User-facing message for each {@link ShareErrorKind}. */
export const SHARE_ERROR_MESSAGES: Record<ShareErrorKind, string> = {
  [ShareErrorKind.Invalid]: "This share link is invalid or corrupted.",
  [ShareErrorKind.TooLarge]: "This share link exceeds the maximum supported size.",
  [ShareErrorKind.UnknownVersion]:
    "This share link was created by a newer version of the app. Reload the page and try again.",
  [ShareErrorKind.InvalidSpec]: "This share link contains an invalid ingredient spec.",
};

/** Error thrown while decoding or consuming a share link; `message` is safe to show the user. */
export class ShareError extends Error {
  /** The failure mode, for programmatic handling; the message already reflects it. */
  readonly kind: ShareErrorKind;

  /** Create a share error of the given kind, optionally chaining the underlying `cause`. */
  constructor(kind: ShareErrorKind, cause?: unknown) {
    super(SHARE_ERROR_MESSAGES[kind], cause === undefined ? undefined : { cause });
    this.name = "ShareError";
    this.kind = kind;
  }
}

/** Transport failures mapped onto share-branded kinds, so user-facing copy stays share-specific. */
const SHARE_KIND_BY_PAYLOAD_KIND: Record<PayloadErrorKind, ShareErrorKind> = {
  [PayloadErrorKind.Invalid]: ShareErrorKind.Invalid,
  [PayloadErrorKind.TooLarge]: ShareErrorKind.TooLarge,
};

/** Build a {@link ShareError} for a transport failure from {@link decodeUrlPayload}. */
function makeShareCodecError(kind: PayloadErrorKind, cause?: unknown): ShareError {
  return new ShareError(SHARE_KIND_BY_PAYLOAD_KIND[kind], cause);
}

/** Encode a share payload for the URL fragment: JSON → raw deflate → base64url. */
export async function encodeSharePayload(payload: SharePayload): Promise<string> {
  return encodeUrlPayload(payload);
}

/**
 * Decode and strictly validate an encoded share payload (the reverse of
 * {@link encodeSharePayload}). The input is untrusted; anything that fails size caps, decoding,
 * or shape validation throws a {@link ShareError} — no partial results.
 */
export async function decodeSharePayload(encoded: string): Promise<SharePayload> {
  return decodeUrlPayload(encoded, {
    maxEncodedChars: MAX_ENCODED_CHARS,
    maxDecodedBytes: MAX_DECODED_BYTES,
    validate: validateSharePayload,
    makeError: makeShareCodecError,
  });
}

/** Narrow untrusted parsed JSON to a {@link SharePayload}; throws {@link ShareError} otherwise. */
function validateSharePayload(parsed: unknown): SharePayload {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ShareError(ShareErrorKind.Invalid);
  }
  const obj = parsed as Record<string, unknown>;

  // A greater integer version means the link comes from a newer app; anything else is garbage.
  switch (comparePayloadVersion(obj.v, SHARE_PAYLOAD_VERSION)) {
    case "newer":
      throw new ShareError(ShareErrorKind.UnknownVersion);
    case "invalid":
      throw new ShareError(ShareErrorKind.Invalid);
    case "match":
      break;
  }

  const { n: name, r: rows, e: evaporation, c: comments, s: specs } = obj;

  if (typeof name !== "string" || name.length > MAX_SHARE_NAME_CHARS) {
    throw new ShareError(ShareErrorKind.Invalid);
  }

  if (!Array.isArray(rows) || rows.length === 0 || rows.length > RECIPE_TOTAL_ROWS) {
    throw new ShareError(ShareErrorKind.Invalid);
  }
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 2) throw new ShareError(ShareErrorKind.Invalid);
    const [rowName, quantity] = row as unknown[];
    const nameOk =
      typeof rowName === "string" && rowName !== "" && rowName.length <= MAX_SHARE_NAME_CHARS;
    const quantityOk = typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 0;
    if (!nameOk || !quantityOk) throw new ShareError(ShareErrorKind.Invalid);
  }

  if (
    evaporation !== undefined &&
    (typeof evaporation !== "number" || !Number.isFinite(evaporation) || evaporation < 0)
  ) {
    throw new ShareError(ShareErrorKind.Invalid);
  }

  if (
    comments !== undefined &&
    (typeof comments !== "string" || comments.length > MAX_SHARE_COMMENT_CHARS)
  ) {
    throw new ShareError(ShareErrorKind.Invalid);
  }

  if (specs !== undefined && (!Array.isArray(specs) || specs.length > MAX_SHARE_SPECS)) {
    throw new ShareError(ShareErrorKind.Invalid);
  }

  // Rebuild the object so unknown extra fields are dropped rather than carried along.
  return makeSharePayload(name, rows as LightRecipe, evaporation, comments, specs);
}

/** Assemble a {@link SharePayload}, omitting zero evaporation, empty comments, and empty specs. */
export function makeSharePayload(
  name: string,
  rows: LightRecipe,
  evaporation?: number,
  comments?: string,
  specs?: unknown[],
): SharePayload {
  return {
    v: SHARE_PAYLOAD_VERSION,
    n: name,
    r: rows,
    ...(evaporation ? { e: evaporation } : {}),
    ...(comments ? { c: comments } : {}),
    ...(specs !== undefined && specs.length > 0 ? { s: specs } : {}),
  };
}

/**
 * Extract the shareable `[name, quantity]` rows from a recipe: every row with a non-empty name, in
 * editor order. Unlike `makeLightRecipe` this keeps rows whose names don't resolve — the viewer
 * shows them as unresolved rather than silently dropping them. An unset quantity shares as 0.
 */
export function makeShareRows(recipe: Recipe): LightRecipe {
  return recipe.ingredientRows
    .filter((row) => row.name !== "")
    .map((row) => [row.name, row.quantity ?? 0] as LightRecipeLine);
}

/**
 * Names among `rows` defined by the sharer's own ingredient specs (including specs that shadow
 * built-ins), deduplicated in first-appearance order. A recipient cannot resolve these rows
 * unless the matching spec is inlined into the payload with the sharer's consent.
 */
export function findUserDefinedShareNames(
  rows: LightRecipe,
  userSpecNames: Iterable<string>,
): string[] {
  const specNames = new Set(userSpecNames);
  const seen = new Set<string>();
  for (const [name] of rows) {
    if (specNames.has(name)) seen.add(name);
  }
  return [...seen];
}

/** Build the shareable URL for an encoded payload; `origin` is e.g. `window.location.origin`. */
export function makeShareUrl(encoded: string, origin: string, embed = false): string {
  return `${origin}${embed ? SHARE_EMBED_PATH : SHARE_PATH}#${encoded}`;
}

/**
 * Copyable `<iframe>` snippet for embedding an embed-mode share URL in third-party pages. The
 * URL needs no escaping: base64url payloads contain no characters that terminate the attribute.
 */
export function makeEmbedSnippet(embedUrl: string): string {
  return `<iframe src="${embedUrl}" width="600" height="675"></iframe>`;
}

/**
 * Everything derived from a decoded payload via the viewer's own ephemeral WASM bridge. Any
 * failure (e.g. an invalid inlined spec) fails the whole link (no partial loads).
 */
export type SharedRecipe =
  | { status: "error"; message: string }
  | { status: "ready"; bridge: WasmBridge; recipe: Recipe; allResolved: boolean };

/**
 * Build a viewer's {@link SharedRecipe} from a decoded {@link SharePayload}.
 *
 * The ephemeral bridge keeps payload specs from leaking into or shadowing the recipient's session
 * ingredients. Like the editor, mix properties are calculated from the rows that resolve
 * (unresolved rows are flagged in the table), and a throwing calculation (e.g. evaporation
 * exceeding the mix's water) degrades to empty properties via {@link Recipe.mixError}.
 */
export function makeSharedRecipe(payload: SharePayload): SharedRecipe {
  const bridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());

  if (payload.s !== undefined) {
    try {
      bridge.seed_from_specs(payload.s, OnConflict.Overwrite);
    } catch (err) {
      bridge.free();
      console.error("share: seeding inlined specs failed:", err);
      return { status: "error", message: new ShareError(ShareErrorKind.InvalidSpec, err).message };
    }
  }

  const allResolved = payload.r.every(([name]) => bridge.has_ingredient(name));
  const mixTotal = payload.r.reduce((sum, [, quantity]) => sum + quantity, 0);
  const resolvedRows = payload.r.filter(([name]) => bridge.has_ingredient(name));
  const resolvedTotal = resolvedRows.reduce((sum, [, quantity]) => sum + quantity, 0);

  let mixProperties = new MixProperties();
  let mixError: string | undefined;
  try {
    if (resolvedTotal > 0) {
      mixProperties = bridge.calculate_recipe_mix_properties(resolvedRows, payload.e);
    }
  } catch (err) {
    console.error("share: mix-property calculation failed:", err);
    mixError = String(err);
  }

  const recipe: Recipe = {
    index: 0,
    id: "Recipe",
    name: payload.n,
    ingredientRows: payload.r.map(([name, quantity], index) => ({ index, name, quantity })),
    mixTotal,
    ...(payload.e ? { evaporation: payload.e } : {}),
    mixProperties,
    mixError,
  };

  return { status: "ready", bridge, recipe, allResolved };
}
