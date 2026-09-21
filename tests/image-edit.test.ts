import { describe, expect, it } from "vitest";
import { ASPECTS, cropRect, DEFAULT_EDIT, filterCss, isIdentity, outputSize, rotatedSize, type EditParams } from "@/lib/design/image-edit";
import { imageSources, replaceImageSource } from "@/lib/design/model";
import { designFromTemplate } from "@/lib/design/templates";

describe("rotatedSize", () => {
  it("menukar lebar dan tinggi hanya untuk 90 dan 270", () => {
    expect(rotatedSize(200, 100, 0)).toEqual({ w: 200, h: 100 });
    expect(rotatedSize(200, 100, 90)).toEqual({ w: 100, h: 200 });
    expect(rotatedSize(200, 100, 180)).toEqual({ w: 200, h: 100 });
    expect(rotatedSize(200, 100, 270)).toEqual({ w: 100, h: 200 });
  });
});

describe("cropRect", () => {
  it("original tanpa zoom mengambil seluruh gambar", () => {
    expect(cropRect(400, 300, "original", 100, 50, 50)).toEqual({ x: 0, y: 0, w: 400, h: 300 });
  });

  it("rasio 1:1 mengambil kotak terbesar dan menaruhnya di tengah", () => {
    const r = cropRect(400, 300, "1:1", 100, 50, 50);
    expect(r).toEqual({ x: 50, y: 0, w: 300, h: 300 });
  });

  it("rasio lebar pada gambar tinggi dibatasi lebar gambar", () => {
    const r = cropRect(300, 600, "16:9", 100, 50, 50);
    expect(r.w).toBe(300);
    expect(r.h).toBeCloseTo(168.75, 2);
  });

  it("zoom memperkecil area dan pan menggeser di sisa ruang", () => {
    const r = cropRect(400, 400, "1:1", 200, 0, 100);
    expect(r).toEqual({ x: 0, y: 200, w: 200, h: 200 });
    const far = cropRect(400, 400, "1:1", 200, 100, 0);
    expect(far).toEqual({ x: 200, y: 0, w: 200, h: 200 });
  });

  it.each(ASPECTS)("aspek %s selalu tetap di dalam gambar untuk semua zoom dan pan", (aspect) => {
    for (const zoom of [100, 150, 250, 400]) {
      for (const pan of [0, 33, 50, 100]) {
        const r = cropRect(640, 360, aspect, zoom, pan, pan);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(640 + 1e-9);
        expect(r.y + r.h).toBeLessThanOrEqual(360 + 1e-9);
        expect(r.w).toBeGreaterThan(0);
        expect(r.h).toBeGreaterThan(0);
      }
    }
  });

  it("nilai di luar batas dipotong, bukan menghasilkan area di luar gambar", () => {
    const r = cropRect(400, 400, "1:1", 9999, -50, 500);
    expect(r.w).toBe(100);
    expect(r.x).toBe(0);
    expect(r.y).toBe(300);
  });
});

describe("outputSize", () => {
  it("membatasi sisi terpanjang dan menjaga proporsi", () => {
    expect(outputSize(400, 200, 100)).toEqual({ w: 100, h: 50 });
    expect(outputSize(200, 400, 100)).toEqual({ w: 50, h: 100 });
  });

  it("tidak pernah memperbesar", () => {
    expect(outputSize(40, 20, 500)).toEqual({ w: 40, h: 20 });
  });

  it("minimal satu piksel", () => {
    expect(outputSize(1000, 1, 10)).toEqual({ w: 10, h: 1 });
    expect(outputSize(10000, 1, 10).h).toBeGreaterThanOrEqual(1);
  });
});

describe("filterCss", () => {
  it("kosong bila semua filter di nilai awal", () => {
    expect(filterCss(DEFAULT_EDIT)).toBe("");
  });

  it("hanya menulis filter yang diubah dengan satuan yang benar", () => {
    const p: EditParams = { ...DEFAULT_EDIT, brightness: 120, blur: 2, hue: 90, grayscale: 40 };
    expect(filterCss(p)).toBe("brightness(1.2) grayscale(0.4) hue-rotate(90deg) blur(2px)");
  });

  it("isIdentity mengabaikan maxDim", () => {
    expect(isIdentity({ ...DEFAULT_EDIT, maxDim: 64 })).toBe(true);
    expect(isIdentity({ ...DEFAULT_EDIT, flipH: true })).toBe(false);
  });
});

describe("imageSources dan replaceImageSource", () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
  const design = () => {
    const d = designFromTemplate("crystal");
    d.bubble.decorations.push({ id: "image-pin-aaaa", kind: "image-pin", url: png, anchor: "top-left", width: 20, offsetX: 0, offsetY: 0 });
    d.avatar.frame = { url: png, scale: 130 };
    d.panelImages = [{ id: "panel-bbbb", url: "https://a.example.com/x.png", layer: "front", anchor: "top-right", width: 40, height: 40, offsetX: 0, offsetY: 0, opacity: 100, fit: "contain" }];
    return d;
  };

  it("mengumpulkan semua sumber tanpa duplikat", () => {
    expect(imageSources(design())).toEqual([png, "https://a.example.com/x.png"]);
    expect(imageSources(designFromTemplate("crystal"))).toEqual([]);
  });

  it("mengganti sumber di semua slot yang memakainya dan tidak menyentuh yang lain", () => {
    const d = design();
    const { design: next, changed } = replaceImageSource(d, png, "data:image/png;base64,QUJD");
    expect(changed).toBe(2);
    expect(next.avatar.frame.url).toBe("data:image/png;base64,QUJD");
    expect(next.panelImages[0].url).toBe("https://a.example.com/x.png");
    expect(d.avatar.frame.url).toBe(png);
  });

  it("mengosongkan sumber berarti menghapusnya dari semua slot", () => {
    const { design: next } = replaceImageSource(design(), png, "");
    expect(imageSources(next)).toEqual(["https://a.example.com/x.png"]);
  });
});
