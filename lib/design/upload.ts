import { MAX_DATA_URI_CHARS, MAX_UPLOAD_BYTES } from "./model";

/**
 * Membaca gambar dari komputer user menjadi data URI. Tipe ditentukan dari byte awal file,
 * bukan dari ekstensi atau `file.type` yang bisa dipalsukan. SVG sengaja tidak diterima.
 */
export type ImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export type UploadResult =
  | { ok: true; dataUri: string; bytes: number; mime: ImageMime }
  | { ok: false; reason: "TOO_LARGE" | "BAD_TYPE" | "EMPTY" | "READ_FAILED" };

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);

export function sniffImage(b: Uint8Array): ImageMime | null {
  if (b.length >= 8 && startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (b.length >= 3 && startsWith(b, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (b.length >= 6 && (startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))) return "image/gif";
  // WebP: "RIFF" ???? "WEBP"
  if (b.length >= 12 && startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export function toDataUri(mime: ImageMime, bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}

/** Memeriksa byte gambar. Dipisah dari pembacaan file supaya mudah diuji. */
export function checkImageBytes(bytes: Uint8Array): UploadResult {
  if (bytes.length === 0) return { ok: false, reason: "EMPTY" };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: "TOO_LARGE" };
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false, reason: "BAD_TYPE" };
  const dataUri = toDataUri(mime, bytes);
  if (dataUri.length > MAX_DATA_URI_CHARS) return { ok: false, reason: "TOO_LARGE" };
  return { ok: true, dataUri, bytes: bytes.length, mime };
}

function readBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function readImageFile(file: File): Promise<UploadResult> {
  // Tolak lebih awal dari ukuran yang dilaporkan, supaya file besar tidak dibaca ke memori.
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "TOO_LARGE" };
  let buffer: ArrayBuffer;
  try {
    buffer = await readBuffer(file);
  } catch {
    return { ok: false, reason: "READ_FAILED" };
  }
  return checkImageBytes(new Uint8Array(buffer));
}

export const UPLOAD_MESSAGE: Record<Exclude<UploadResult, { ok: true }>["reason"], string> = {
  TOO_LARGE: "Gambar melebihi 100 KB. Kecilkan ukurannya, atau pakai link https.",
  BAD_TYPE: "Format tidak didukung. Pakai PNG, JPEG, GIF, atau WebP (SVG tidak diterima).",
  EMPTY: "File kosong.",
  READ_FAILED: "File tidak bisa dibaca. Coba pilih ulang.",
};
