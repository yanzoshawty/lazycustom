import { MAX_UPLOAD_BYTES } from "./model";
import { checkImageBytes, sniffImage, type ImageMime } from "./upload";

/**
 * Pemampat gambar untuk pustaka. File sumber boleh jauh lebih besar dari batas per gambar (100 KB),
 * karena gambar dikecilkan dan dienkode ulang ke WebP di browser, tanpa dikirim ke server mana pun.
 * GIF tidak dienkode ulang karena canvas hanya menyimpan satu frame: GIF dipakai apa adanya bila muat.
 */
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
/** Sisi terpanjang hasil. Gambar di chat ditampilkan kecil, jadi lebih besar dari ini hanya membuang byte. */
export const MAX_DIMENSION = 640;
export const QUALITY_LADDER = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4] as const;
const SHRINK = 0.85;
const MIN_SIDE = 24;

export type CompressFailure = "EMPTY" | "TOO_LARGE_SOURCE" | "BAD_TYPE" | "READ_FAILED" | "DECODE_FAILED" | "GIF_TOO_LARGE" | "CANNOT_FIT";
export type CompressResult =
  | { ok: true; dataUri: string; bytes: number; mime: ImageMime; width: number; height: number; sourceBytes: number }
  | { ok: false; reason: CompressFailure };

export const COMPRESS_MESSAGE: Record<CompressFailure, string> = {
  EMPTY: "File kosong.",
  TOO_LARGE_SOURCE: "File lebih dari 8 MB. Kecilkan dulu, misalnya dengan mengekspor ulang dari editor gambarmu.",
  BAD_TYPE: "Format tidak didukung. Pakai PNG, JPEG, GIF, atau WebP.",
  READ_FAILED: "File tidak bisa dibaca. Coba pilih ulang.",
  DECODE_FAILED: "Gambar tidak bisa dibuka. File mungkin rusak.",
  GIF_TOO_LARGE: "GIF ini lebih dari 100 KB. GIF tidak bisa dimampatkan tanpa kehilangan animasinya, jadi kecilkan atau kurangi frame-nya dulu.",
  CANNOT_FIT: "Gambar tidak bisa dimampatkan sampai di bawah 100 KB tanpa terlalu rusak. Coba potong bagian yang penting saja.",
};

/** Ukuran hasil: sisi terpanjang dibatasi, gambar kecil tidak diperbesar, minimal 1 px. */
export function fitSize(w: number, h: number, maxDim = MAX_DIMENSION): { width: number; height: number } {
  const long = Math.max(w, h);
  const k = long > maxDim ? maxDim / long : 1;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** Lebar dan tinggi GIF dari header layar logis (byte 6 sampai 9, little-endian). */
export function gifSize(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 10) return null;
  const width = b[6] | (b[7] << 8);
  const height = b[8] | (b[9] << 8);
  return width > 0 && height > 0 ? { width, height } : null;
}

/** Enkoder satu kali jalan: gambar pada ukuran tertentu menjadi byte, atau null bila browser tidak bisa. */
export type Encoder = (width: number, height: number, mime: "image/webp" | "image/png", quality: number) => Promise<Uint8Array | null>;

/**
 * Mencari hasil terkecil yang muat: untuk tiap ukuran (mulai dari ukuran terbaik) coba semua kualitas WebP dari
 * tinggi ke rendah, lalu kecilkan 15 persen dan ulangi. PNG dicoba sekali di ukuran awal untuk gambar datar yang
 * lebih hemat sebagai PNG. Dipisah dari canvas supaya logikanya bisa diuji.
 */
export async function shrinkToFit(width: number, height: number, encode: Encoder, limit = MAX_UPLOAD_BYTES): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  let w = width;
  let h = height;
  let triedPng = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    if (!triedPng) {
      triedPng = true;
      const png = await encode(w, h, "image/png", 1);
      if (png && png.length <= limit && sniffImage(png) === "image/png") return { bytes: png, width: w, height: h };
    }
    for (const q of QUALITY_LADDER) {
      const webp = await encode(w, h, "image/webp", q);
      if (webp && webp.length <= limit && sniffImage(webp) === "image/webp") return { bytes: webp, width: w, height: h };
    }
    if (w <= MIN_SIDE && h <= MIN_SIDE) break;
    w = Math.max(1, Math.round(w * SHRINK));
    h = Math.max(1, Math.round(h * SHRINK));
  }
  return null;
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

function canvasEncoder(bitmap: ImageBitmap): Encoder {
  return async (w, h, mime, quality) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  };
}

/** Membaca file dari komputer user, memvalidasi dari byte awalnya, lalu memampatkannya sampai di bawah batas per gambar. */
export async function compressImageFile(file: File): Promise<CompressResult> {
  if (file.size === 0) return { ok: false, reason: "EMPTY" };
  if (file.size > MAX_SOURCE_BYTES) return { ok: false, reason: "TOO_LARGE_SOURCE" };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await readBuffer(file));
  } catch {
    return { ok: false, reason: "READ_FAILED" };
  }
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false, reason: "BAD_TYPE" };

  if (mime === "image/gif") {
    if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: "GIF_TOO_LARGE" };
    const size = gifSize(bytes);
    const r = checkImageBytes(bytes);
    if (!r.ok || !size) return { ok: false, reason: "DECODE_FAILED" };
    return { ok: true, dataUri: r.dataUri, bytes: r.bytes, mime, width: size.width, height: size.height, sourceBytes: bytes.length };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
  } catch {
    return { ok: false, reason: "DECODE_FAILED" };
  }
  try {
    const start = fitSize(bitmap.width, bitmap.height);
    const fit = await shrinkToFit(start.width, start.height, canvasEncoder(bitmap));
    if (!fit) return { ok: false, reason: "CANNOT_FIT" };
    const r = checkImageBytes(fit.bytes);
    if (!r.ok) return { ok: false, reason: "CANNOT_FIT" };
    return { ok: true, dataUri: r.dataUri, bytes: r.bytes, mime: r.mime, width: fit.width, height: fit.height, sourceBytes: bytes.length };
  } finally {
    bitmap.close();
  }
}
