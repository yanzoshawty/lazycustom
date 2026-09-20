import { parseDesign, stripUploadedImages, type Design } from "./model";

/**
 * Link Share: desain dikodekan di bagian hash URL (#d=...), jadi tidak pernah dikirim
 * ke server. Format: "z." + base64url(deflate(JSON)), atau "j." + base64url(JSON) untuk
 * browser tanpa CompressionStream. Hasil decode selalu divalidasi ulang oleh skema.
 */
const MAX_ENCODED = 12_000;
const MAX_DECODED = 64 * 1024;
const HASH_KEY = "d=";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function pipe(bytes: Uint8Array, stream: { writable: WritableStream; readable: ReadableStream }, limit: number) {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as unknown as BufferSource).catch(() => undefined);
  void writer.close().catch(() => undefined);
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      throw new RangeError("terlalu besar");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Gambar unggahan dari komputer tidak ikut link Share (terlalu besar). Hanya gambar dari link https yang dibawa. */
export async function encodeDesign(design: Design): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(stripUploadedImages(design).design));
  if (typeof CompressionStream !== "undefined") {
    try {
      const packed = await pipe(bytes, new CompressionStream("deflate-raw"), MAX_DECODED);
      return "z." + toBase64Url(packed);
    } catch {
      // Jatuh ke bentuk tanpa kompresi.
    }
  }
  return "j." + toBase64Url(bytes);
}

export type DecodeResult =
  | { ok: true; design: Design }
  | { ok: false; code: "SHARE_INVALID" | "SHARE_TOO_LARGE" };

export async function decodeDesign(encoded: string): Promise<DecodeResult> {
  if (encoded.length > MAX_ENCODED) return { ok: false, code: "SHARE_TOO_LARGE" };
  const kind = encoded.slice(0, 2);
  if (kind !== "z." && kind !== "j.") return { ok: false, code: "SHARE_INVALID" };
  const raw = fromBase64Url(encoded.slice(2));
  if (!raw || raw.length === 0) return { ok: false, code: "SHARE_INVALID" };

  let bytes: Uint8Array;
  try {
    if (kind === "j.") {
      if (raw.length > MAX_DECODED) return { ok: false, code: "SHARE_TOO_LARGE" };
      bytes = raw;
    } else {
      if (typeof DecompressionStream === "undefined") return { ok: false, code: "SHARE_INVALID" };
      bytes = await pipe(raw, new DecompressionStream("deflate-raw"), MAX_DECODED);
    }
  } catch (error) {
    return { ok: false, code: error instanceof RangeError ? "SHARE_TOO_LARGE" : "SHARE_INVALID" };
  }

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, code: "SHARE_INVALID" };
  }
  const parsed = parseDesign(json);
  // Link Share tidak boleh membawa gambar tertanam, walau lolos skema.
  return parsed.ok ? { ok: true, design: stripUploadedImages(parsed.design).design } : { ok: false, code: "SHARE_INVALID" };
}

export function shareUrl(encoded: string, where: { origin: string; pathname: string }): string {
  return `${where.origin}${where.pathname}#${HASH_KEY}${encoded}`;
}

/** Ambil bagian kode dari hash, atau null kalau hash bukan link Share. */
export function readShareHash(hash: string): string | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  return h.startsWith(HASH_KEY) ? h.slice(HASH_KEY.length) : null;
}
