import { describe, expect, it } from "vitest";
import { GEOMETRY_JS } from "@/lib/design/gizmo-script";

/**
 * GEOMETRY_JS didefinisikan sebagai string mentah karena berjalan di dalam iframe preview (bukan lewat
 * bundler). Di sini stringnya dieksekusi persis seperti di iframe, supaya kode yang diuji sama persis
 * dengan kode yang benar-benar jalan, bukan salinan yang ditulis ulang di TypeScript.
 */
function loadGeometry(): {
  toBox: (anchor: string, ox: number, oy: number, w: number, h: number, cw: number, ch: number, s: number) => { x: number; y: number };
  fromBox: (anchor: string, x: number, y: number, w: number, h: number, cw: number, ch: number, s: number) => { offsetX: number; offsetY: number };
  pickAnchor: (x: number, y: number, w: number, h: number, cw: number, ch: number) => string;
  clampBox: (x: number, y: number, w: number, h: number, cw: number, ch: number) => { x: number; y: number };
  clamp: (v: number, lo: number, hi: number) => number;
} {
  const fn = new Function(`${GEOMETRY_JS}\nreturn G;`);
  return fn();
}
const G = loadGeometry();

describe("toBox / fromBox (bolak-balik)", () => {
  const ANCHORS = ["top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"];

  it.each(ANCHORS)("anchor %s: fromBox(toBox(x)) mengembalikan offset yang sama", (anchor) => {
    const cw = 400, ch = 200, w = 60, h = 40, s = 1;
    for (const [ox, oy] of [[0, 0], [10, 5], [-5, 12], [40, 40]]) {
      const box = G.toBox(anchor, ox, oy, w, h, cw, ch, s);
      const back = G.fromBox(anchor, box.x, box.y, w, h, cw, ch, s);
      expect(back.offsetX).toBe(ox);
      expect(back.offsetY).toBe(oy);
    }
  });

  it("top-left: offset positif bergerak ke kanan dan ke bawah", () => {
    expect(G.toBox("top-left", 10, 5, 20, 20, 200, 100, 1)).toEqual({ x: 10, y: 5 });
  });

  it("bottom-right: offset dihitung dari tepi kanan-bawah", () => {
    expect(G.toBox("bottom-right", 10, 5, 20, 20, 200, 100, 1)).toEqual({ x: 170, y: 75 });
  });

  it("center: offset dari tengah wadah", () => {
    expect(G.toBox("center", 0, 0, 20, 10, 200, 100, 1)).toEqual({ x: 90, y: 45 });
    expect(G.toBox("center", 10, -5, 20, 10, 200, 100, 1)).toEqual({ x: 100, y: 40 });
  });

  it("skala s mengalikan offset saat dikonversi ke piksel iframe", () => {
    expect(G.toBox("top-left", 10, 10, 20, 20, 400, 200, 2)).toEqual({ x: 20, y: 20 });
  });
});

describe("pickAnchor", () => {
  it("sembilan area memetakan ke sembilan anchor", () => {
    const cw = 300, ch = 300, w = 30, h = 30;
    expect(G.pickAnchor(0, 0, w, h, cw, ch)).toBe("top-left");
    expect(G.pickAnchor(cw / 2 - w / 2, 0, w, h, cw, ch)).toBe("top-center");
    expect(G.pickAnchor(cw - w, 0, w, h, cw, ch)).toBe("top-right");
    expect(G.pickAnchor(0, ch / 2 - h / 2, w, h, cw, ch)).toBe("middle-left");
    expect(G.pickAnchor(cw / 2 - w / 2, ch / 2 - h / 2, w, h, cw, ch)).toBe("center");
    expect(G.pickAnchor(cw - w, ch / 2 - h / 2, w, h, cw, ch)).toBe("middle-right");
    expect(G.pickAnchor(0, ch - h, w, h, cw, ch)).toBe("bottom-left");
    expect(G.pickAnchor(cw / 2 - w / 2, ch - h, w, h, cw, ch)).toBe("bottom-center");
    expect(G.pickAnchor(cw - w, ch - h, w, h, cw, ch)).toBe("bottom-right");
  });
});

describe("clampBox", () => {
  it("menahan kotak di dalam wadah", () => {
    expect(G.clampBox(-10, -10, 20, 20, 100, 100)).toEqual({ x: 0, y: 0 });
    expect(G.clampBox(90, 90, 20, 20, 100, 100)).toEqual({ x: 80, y: 80 });
    expect(G.clampBox(40, 40, 20, 20, 100, 100)).toEqual({ x: 40, y: 40 });
  });

  it("kotak lebih besar dari wadah menempel di 0", () => {
    expect(G.clampBox(50, 50, 200, 200, 100, 100)).toEqual({ x: 0, y: 0 });
  });
});

describe("clamp", () => {
  it("membatasi nilai ke rentang", () => {
    expect(G.clamp(5, 0, 10)).toBe(5);
    expect(G.clamp(-5, 0, 10)).toBe(0);
    expect(G.clamp(50, 0, 10)).toBe(10);
  });
});
