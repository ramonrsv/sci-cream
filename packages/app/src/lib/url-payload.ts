/**
 * Transport codec for URL-fragment payloads: JSON → raw deflate → base64url, and back with size
 * caps enforced before and during inflation. Payload shape, versioning and user-facing error copy
 * belong to callers (`recipe-share.ts`, `batch-share.ts`), never here.
 */

/** Failure modes the transport itself can detect; callers map these onto their branded errors. */
export enum PayloadErrorKind {
  /** Not base64url, not deflate, or not JSON. */
  Invalid = "invalid",
  /** Encoded input over the char cap, or inflated output over the byte cap. */
  TooLarge = "too-large",
}

/** Builds the caller's branded error for a transport failure; required, so none goes unbranded. */
export type PayloadErrorFactory = (kind: PayloadErrorKind, cause?: unknown) => Error;

/** Caps and callbacks for {@link decodeUrlPayload}. */
export interface DecodeUrlPayloadOptions<T> {
  /** Maximum accepted length of the encoded string, checked before any decoding work. */
  maxEncodedChars: number;
  /** Maximum accepted size of the decompressed JSON, enforced during decompression. */
  maxDecodedBytes: number;
  /** Narrow untrusted parsed JSON to `T`, or throw the caller's own branded error. */
  validate: (parsed: unknown) => T;
  /** Builds the caller's error for transport failures. */
  makeError: PayloadErrorFactory;
}

/**
 * Internal signal that inflation exceeded the byte cap, translated at the {@link decodeUrlPayload}
 * boundary. A sentinel rather than the caller's error because generic code cannot `instanceof` it.
 */
class SizeLimitExceeded extends Error {}

/**
 * Encode bytes as base64url (RFC 4648 §5, unpadded).
 *
 * TODO: replace with `bytes.toBase64({ alphabet: "base64url", omitPadding: true })` once baseline
 * support for `Uint8Array.prototype.toBase64` covers the app's supported browsers.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // Stay well below engine argument-count limits for `fromCharCode`
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/**
 * Decode a base64url string to bytes; throws on characters outside the base64 alphabet.
 *
 * TODO: replace with `Uint8Array.fromBase64(encoded, { alphabet: "base64url" })` once baseline
 * support for `Uint8Array.fromBase64` covers the app's supported browsers.
 */
function base64UrlToBytes(encoded: string): Uint8Array<ArrayBuffer> {
  const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Push `bytes` through a `CompressionStream`/`DecompressionStream` and collect the output.
 * Exceeding `maxBytes` throws {@link SizeLimitExceeded} *during* inflation, stopping a zip bomb.
 */
async function transformBytes(
  bytes: Uint8Array<ArrayBuffer>,
  transform: { readable: ReadableStream<Uint8Array>; writable: WritableStream<BufferSource> },
  maxBytes?: number,
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  const writePromise = writer.write(bytes).then(() => writer.close());
  // Malformed input errors both sides; the read-side error is reported, so just observe this one.
  writePromise.catch(() => {});

  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (maxBytes !== undefined && total > maxBytes) {
      await reader.cancel();
      throw new SizeLimitExceeded();
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Encode any JSON-serializable payload for a URL fragment: JSON → raw deflate → base64url. */
export async function encodeUrlPayload(payload: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return bytesToBase64Url(await transformBytes(json, new CompressionStream("deflate-raw")));
}

/**
 * Decode and strictly validate an encoded payload (the reverse of {@link encodeUrlPayload}). The
 * input is untrusted; anything that fails size caps, decoding, or `validate` throws — no partial
 * results. Errors from `validate` propagate unwrapped, since they are already branded.
 */
export async function decodeUrlPayload<T>(
  encoded: string,
  options: DecodeUrlPayloadOptions<T>,
): Promise<T> {
  if (encoded.length > options.maxEncodedChars) {
    throw options.makeError(PayloadErrorKind.TooLarge);
  }

  let json: Uint8Array;
  try {
    json = await transformBytes(
      base64UrlToBytes(encoded),
      new DecompressionStream("deflate-raw"),
      options.maxDecodedBytes,
    );
  } catch (err) {
    if (err instanceof SizeLimitExceeded) throw options.makeError(PayloadErrorKind.TooLarge, err);
    throw options.makeError(PayloadErrorKind.Invalid, err);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(json));
  } catch (err) {
    throw options.makeError(PayloadErrorKind.Invalid, err);
  }

  return options.validate(parsed);
}

/**
 * Compare an untrusted `v` field against `expected`. A greater integer is `"newer"` — a link from
 * a newer app build; anything else is `"invalid"`. Callers pick the error, as policy is theirs.
 */
export function comparePayloadVersion(
  value: unknown,
  expected: number,
): "match" | "newer" | "invalid" {
  if (value === expected) return "match";
  if (typeof value === "number" && Number.isInteger(value) && value > expected) return "newer";
  return "invalid";
}
