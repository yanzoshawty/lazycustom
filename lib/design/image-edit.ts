import { checkImageBytes, type ImageMime, type UploadResult } from "./upload";
import { MAX_UPLOAD_BYTES } from "./model";

/**
 * Penyesuaian gambar unggahan: rotasi 90 derajat, flip, crop, dan filter. Hasilnya "dipanggang" ke gambar
 * baru, jadi GIF tidak bisa disesuaikan dengan cara ini (animasinya hilang). Ukuran, posisi, dan opacity
 * tetap diatur lewat CSS di Properties dan tidak lewat sini.
 *
 * Hitungan geometri dipisah dari kanvas supaya bisa diuji tanpa browser.
 */
export const ASPECTS = ["original", "1:1", "4:3", "16:9", "3:4"] as const;
export type Aspect = (typeof ASPECTS)[number];
export type Rotation = 0 | 90 | 180 | 270;

export interface EditParams {
  rotate: Rotation;
  flipH: boolean;
  flipV: boolean;
  aspect: Aspect;
  /** 100 sampai 400: makin besar makin dekat. */
  zoom: number;
  /** Posisi crop di sisa ruang, 0 sampai 100. */
  panX: number;
  panY: number;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  grayscale: number;
  hue: number;
  /** Sisi terpanjang hasil, dalam piksel. Tidak pernah memperbesar dari aslinya. */
  maxDim: number;
}

export const DEFAULT_EDIT: EditParams = {
  rotate: 0,
  flipH: false,
  flipV: false,
  aspect: "original",
  zoom: 100,
  panX: 50,
  panY: 50,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  grayscale: 0,
  hue: 0,
  maxDim: 256,
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rotatedSize(w: number, h: number, rotate: Rotation): { w: number; h: number } {
  return rotate === 90 || rotate === 270 ? { w: h, h: w } : { w, h };
}

const ratio = (a: Aspect, w: number, h: number): number => {
  if (a === "original") return w / h;
  const [x, y] = a.split(":").map(Number);
  return x / y;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Area crop di dalam gambar yang sudah diputar. Dimulai dari kotak terbesar dengan rasio yang dipilih,
 * dikecilkan oleh zoom, lalu digeser di sisa ruang oleh pan. Selalu berada di dalam gambar.
 */
export function cropRect(rw: number, rh: number, aspect: Aspect, zoom: number, panX: number, panY: number): Rect {
  const r = ratio(aspect, rw, rh);
  let w = rw;
  let h = rw / r;
  if (h > rh) {
    h = rh;
    w = rh * r;
  }
  const z = clamp(zoom, 100, 400) / 100;
  w /= z;
  h /= z;
  return {
    x: (rw - w) * (clamp(panX, 0, 100) / 100),
    y: (rh - h) * (clamp(panY, 0, 100) / 100),
    w,
    h,
  };
}

/** Ukuran keluaran: sisi terpanjang dibatasi maxDim dan gambar tidak pernah diperbesar. Minimal satu piksel. */
export function outputSize(cw: number, ch: number, maxDim: number): { w: number; h: number } {
  const scale = Math.min(1, maxDim / Math.max(cw, ch));
  return { w: Math.max(1, Math.round(cw * scale)), h: Math.max(1, Math.round(ch * scale)) };
}

const FILTER_KEYS: Array<[keyof EditParams, string, number, (v: number) => string]> = [
  ["brightness", "brightness", 100, (v) => String(v / 100)],
  ["contrast", "contrast", 100, (v) => String(v / 100)],
  ["saturate", "saturate", 100, (v) => String(v / 100)],
  ["grayscale", "grayscale", 0, (v) => String(v / 100)],
  ["hue", "hue-rotate", 0, (v) => `${v}deg`],
  ["blur", "blur", 0, (v) => `${v}px`],
];

/** Nilai `ctx.filter`. Filter yang masih di nilai awal dilewati. Kosong berarti "none". */
export function filterCss(p: EditParams): string {
  return FILTER_KEYS.filter(([k, , def]) => p[k] !== def)
    .map(([k, name, , fmt]) => `${name}(${fmt(p[k] as number)})`)
    .join(" ");
}

export function isIdentity(p: EditParams): boolean {
  return JSON.stringify(p) === JSON.stringify({ ...DEFAULT_EDIT, maxDim: p.maxDim });
}

export function supportsFilter(): boolean {
  if (typeof document === "undefined") return false;
  const ctx = document.createElement("canvas").getContext("2d");
  return !!ctx && "filter" in ctx;
}

type Source = HTMLImageElement | ImageBitmap;
const sizeOf = (s: Source) => ("naturalWidth" in s ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height });

/** Gambar yang sudah diputar dan di-flip, ukuran penuh. Crop diambil dari hasil ini. */
function transformed(src: Source, p: EditParams): HTMLCanvasElement {
  const { w, h } = sizeOf(src);
  const size = rotatedSize(w, h, p.rotate);
  const c = document.createElement("canvas");
  c.width = size.w;
  c.height = size.h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.translate(size.w / 2, size.h / 2);
  ctx.rotate((p.rotate * Math.PI) / 180);
  ctx.scale(p.flipH ? -1 : 1, p.flipV ? -1 : 1);
  ctx.drawImage(src, -w / 2, -h / 2);
  return c;
}

/** Gambar hasil sunting ke kanvas tujuan. `maxDim` menimpa p.maxDim (dipakai untuk pratinjau kecil). */
export function renderEdited(src: Source, p: EditParams, target: HTMLCanvasElement, maxDim = p.maxDim): { w: number; h: number } {
  const base = transformed(src, p);
  const crop = cropRect(base.width, base.height, p.aspect, p.zoom, p.panX, p.panY);
  const out = outputSize(crop.w, crop.h, maxDim);
  target.width = out.w;
  target.height = out.h;
  const ctx = target.getContext("2d");
  if (!ctx) return out;
  ctx.clearRect(0, 0, out.w, out.h);
  // Blur dalam piksel keluaran, jadi pratinjau kecil menskalakannya agar tampil sama dengan hasil akhir.
  const scale = out.w / outputSize(crop.w, crop.h, p.maxDim).w;
  if (supportsFilter()) ctx.filter = filterCss({ ...p, blur: Number((p.blur * scale).toFixed(2)) }) || "none";
  ctx.drawImage(base, crop.x, crop.y, crop.w, crop.h, 0, 0, out.w, out.h);
  return out;
}

function toBytes(canvas: HTMLCanvasElement, type: ImageMime, quality?: number): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return resolve(null);
        try {
          resolve(new Uint8Array(await blob.arrayBuffer()));
        } catch {
          resolve(null);
        }
      },
      type,
      quality,
    );
  });
}

/**
 * Menyandikan kanvas ke gambar di bawah batas unggahan. Mencoba PNG dulu (menjaga transparansi), lalu WebP
 * dengan kualitas menurun, lalu memperkecil ukuran sedikit demi sedikit. Hasil selalu lewat pemeriksaan
 * byte yang sama dengan unggahan biasa, jadi tipe dan ukurannya terjamin.
 */
export async function encodeUnderLimit(canvas: HTMLCanvasElement): Promise<UploadResult> {
  let work = canvas;
  for (let attempt = 0; attempt < 8; attempt++) {
    const png = await toBytes(work, "image/png");
    if (png && png.length <= MAX_UPLOAD_BYTES) return checkImageBytes(png);
    for (const q of [0.92, 0.8, 0.65, 0.5]) {
      const webp = await toBytes(work, "image/webp", q);
      if (webp && webp.length <= MAX_UPLOAD_BYTES) {
        const r = checkImageBytes(webp);
        if (r.ok) return r;
      }
    }
    if (work.width <= 24 && work.height <= 24) break;
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(work.width * 0.8));
    smaller.height = Math.max(1, Math.round(work.height * 0.8));
    smaller.getContext("2d")?.drawImage(work, 0, 0, smaller.width, smaller.height);
    work = smaller;
  }
  return { ok: false, reason: "TOO_LARGE" };
}
