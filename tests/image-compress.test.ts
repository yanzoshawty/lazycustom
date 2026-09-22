import { describe, expect, it } from "vitest";
import { fitSize, gifSize, shrinkToFit, QUALITY_LADDER, type Encoder } from "@/lib/design/image-compress";

const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const blob = (head: number[], size: number) => Uint8Array.from({ length: size }, (_, i) => head[i] ?? 0);

describe("fitSize", () => {
  it("membatasi sisi terpanjang dan menjaga rasio", () => {
    expect(fitSize(1280, 640)).toEqual({ width: 640, height: 320 });
    expect(fitSize(300, 900)).toEqual({ width: 213, height: 640 });
  });
  it("tidak memperbesar gambar kecil dan tidak pernah 0", () => {
    expect(fitSize(100, 50)).toEqual({ width: 100, height: 50 });
    expect(fitSize(1, 10000)).toEqual({ width: 1, height: 640 });
  });
});

describe("gifSize", () => {
  it("membaca lebar dan tinggi dari header", () => {
    const b = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xf0, 0x00]);
    expect(gifSize(b)).toEqual({ width: 320, height: 240 });
  });
  it("null bila terlalu pendek atau ukuran nol", () => {
    expect(gifSize(new Uint8Array(4))).toBeNull();
    expect(gifSize(new Uint8Array(12))).toBeNull();
  });
});

describe("shrinkToFit", () => {
  it("memakai PNG bila sudah muat di ukuran awal", async () => {
    const encode: Encoder = async (_w, _h, mime) => (mime === "image/png" ? blob(PNG_HEAD, 500) : blob(WEBP_HEAD, 50));
    const r = await shrinkToFit(200, 100, encode, 1000);
    expect(r && r.width === 200 && r.bytes.length === 500).toBe(true);
  });

  it("turun kualitas dulu sebelum mengecilkan ukuran", async () => {
    const calls: string[] = [];
    const encode: Encoder = async (w, _h, mime, q) => {
      calls.push(`${mime}:${w}:${q}`);
      if (mime === "image/png") return blob(PNG_HEAD, 5000);
      return blob(WEBP_HEAD, q <= 0.7 ? 800 : 3000);
    };
    const r = await shrinkToFit(400, 400, encode, 1000);
    expect(r?.width).toBe(400);
    expect(calls.at(-1)).toBe("image/webp:400:0.7");
  });

  it("mengecilkan ukuran bila kualitas terendah pun belum muat", async () => {
    const encode: Encoder = async (w, _h, mime) => (mime === "image/png" ? blob(PNG_HEAD, 9000) : blob(WEBP_HEAD, w > 300 ? 5000 : 900));
    const r = await shrinkToFit(400, 400, encode, 1000);
    expect(r && r.width <= 300 && r.width > 200).toBe(true);
  });

  it("null bila tidak pernah muat, dan berhenti (tidak berputar selamanya)", async () => {
    let n = 0;
    const encode: Encoder = async (_w, _h, mime) => (n++, mime === "image/png" ? blob(PNG_HEAD, 9000) : blob(WEBP_HEAD, 9000));
    expect(await shrinkToFit(400, 400, encode, 1000)).toBeNull();
    expect(n).toBeLessThan(12 * (QUALITY_LADDER.length + 1) + 2);
  });

  it("melewati hasil yang bukan gambar sungguhan (byte awal tidak cocok)", async () => {
    const encode: Encoder = async () => new Uint8Array(100);
    expect(await shrinkToFit(50, 50, encode, 1000)).toBeNull();
  });

  it("lanjut bila enkoder mengembalikan null untuk WebP (browser tanpa dukungan)", async () => {
    const encode: Encoder = async (_w, _h, mime) => (mime === "image/webp" ? null : blob(PNG_HEAD, 400));
    const r = await shrinkToFit(50, 50, encode, 1000);
    expect(r?.bytes.length).toBe(400);
  });
});
