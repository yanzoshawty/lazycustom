import { describe, expect, it } from "vitest";
import { generateCss } from "@/lib/design/css";
import {
  ANCHORS,
  countUploadedImages,
  dataImageChars,
  isDataImage,
  isSafeImageSource,
  MAX_DATA_URI_CHARS,
  MAX_DESIGN_DATA_CHARS,
  parseDesign,
  stripUploadedImages,
  type Design,
  type PanelImage,
} from "@/lib/design/model";
import { checkImageBytes, sniffImage, toDataUri } from "@/lib/design/upload";
import { designFromTemplate } from "@/lib/design/templates";
import postcss from "postcss";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const PNG_URI = toDataUri("image/png", PNG);

const clone = (): Design => {
  const d = designFromTemplate("plain");
  d.row.autoScale = false;
  return d;
};
const panelImg = (o: Partial<PanelImage> = {}): PanelImage => ({
  id: "logo-1", url: "https://cdn.example.com/logo.png", layer: "front", anchor: "top-right", width: 120, height: 60, offsetX: 10, offsetY: 8, opacity: 90, fit: "contain", ...o,
});

describe("sumber gambar", () => {
  it("menerima data URI PNG, JPEG, GIF, dan WebP saja", () => {
    for (const mime of ["png", "jpeg", "gif", "webp"]) expect(isDataImage(`data:image/${mime};base64,QUJD`), mime).toBe(true);
    for (const bad of ["data:image/svg+xml;base64,QUJD", "data:text/html;base64,QUJD", "data:image/png;base64,QU JD", 'data:image/png;base64,QUJD")}', "data:image/png,QUJD", "data:image/png;base64,", "javascript:alert(1)", "data:image/png;base64,QUJD\n"]) {
      expect(isDataImage(bad), bad).toBe(false);
    }
  });

  it("menolak data URI yang melebihi batas satu gambar", () => {
    expect(isDataImage("data:image/png;base64," + "A".repeat(MAX_DATA_URI_CHARS))).toBe(false);
  });

  it("isSafeImageSource menerima kosong, https, dan data URI, menolak sisanya", () => {
    expect(isSafeImageSource("")).toBe(true);
    expect(isSafeImageSource("https://a.com/x.gif")).toBe(true);
    expect(isSafeImageSource(PNG_URI)).toBe(true);
    for (const bad of ["http://a.com/x.gif", "//a.com/x.gif", "file:///etc/passwd", "blob:https://a.com/1"]) expect(isSafeImageSource(bad), bad).toBe(false);
  });
});

describe("upload: deteksi tipe dari byte", () => {
  it("mengenali empat format", () => {
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(GIF)).toBe("image/gif");
    expect(sniffImage(JPG)).toBe("image/jpeg");
    expect(sniffImage(WEBP)).toBe("image/webp");
  });

  it("menolak SVG, HTML, dan file acak walau ekstensinya gambar", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    for (const bytes of [enc("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), enc("<html><script>alert(1)</script>"), enc("MZ\u0090"), new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])]) {
      expect(checkImageBytes(bytes)).toEqual({ ok: false, reason: "BAD_TYPE" });
    }
  });

  it("menolak file kosong dan yang melebihi 100 KB", () => {
    expect(checkImageBytes(new Uint8Array())).toEqual({ ok: false, reason: "EMPTY" });
    const big = new Uint8Array(100 * 1024 + 1);
    big.set(PNG);
    expect(checkImageBytes(big)).toEqual({ ok: false, reason: "TOO_LARGE" });
  });

  it("menerima gambar sah dan hasilnya lolos validasi skema", () => {
    const r = checkImageBytes(PNG);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe("image/png");
      expect(isDataImage(r.dataUri)).toBe(true);
    }
  });

  it("gambar tepat 100 KB masih lolos batas karakter", () => {
    const edge = new Uint8Array(100 * 1024);
    edge.set(PNG);
    expect(checkImageBytes(edge).ok).toBe(true);
  });
});

describe("gambar di dalam desain", () => {
  it("image-pin dan bingkai avatar valid dengan sumber https maupun unggahan", () => {
    const d = clone();
    d.bubble.decorations = [{ id: "pin-aaaa", kind: "image-pin", url: PNG_URI, anchor: "top-right", width: 32, offsetX: 4, offsetY: 4 }];
    d.avatar.frame = { url: "https://cdn.example.com/frame.png", scale: 140 };
    d.panelImages = [panelImg()];
    expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(true);
  });

  it("menolak sumber gambar berbahaya di semua tempat", () => {
    const evil = 'https://a.com/x.png")}body{display:none';
    const cases: Array<(d: Design) => void> = [
      (d) => { d.bubble.decorations = [{ id: "pin-aaaa", kind: "image-pin", url: evil, anchor: "center", width: 30, offsetX: 0, offsetY: 0 }]; },
      (d) => { d.avatar.frame.url = evil; },
      (d) => { d.panelImages = [panelImg({ url: evil })]; },
      (d) => { d.superChat.surface.decorations = [{ id: "img-aaaa", kind: "image", url: "javascript:alert(1)", fit: "cover", position: "center", opacity: 50 }]; },
    ];
    for (const mutate of cases) {
      const d = JSON.parse(JSON.stringify(clone())) as Design;
      mutate(d);
      expect(parseDesign(d).ok).toBe(false);
    }
  });

  it("desain lama tanpa bingkai atau gambar panel tetap valid dengan nilai bawaan", () => {
    const old = JSON.parse(JSON.stringify(clone()));
    delete old.avatar.frame;
    delete old.panelImages;
    const r = parseDesign(old);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.design.avatar.frame).toEqual({ url: "", scale: 130 });
      expect(r.design.panelImages).toEqual([]);
    }
  });

  it("membatasi gambar panel: maksimal empat, dan dua per lapisan", () => {
    const d = clone();
    d.panelImages = [panelImg({ id: "a-1" }), panelImg({ id: "a-2" }), panelImg({ id: "a-3" })];
    expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(false);
    d.panelImages = [panelImg({ id: "a-1", layer: "behind" }), panelImg({ id: "a-2", layer: "behind" }), panelImg({ id: "a-3" }), panelImg({ id: "a-4" })];
    expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(true);
    d.panelImages.push(panelImg({ id: "a-5" }));
    expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(false);
  });

  it("membatasi total data unggahan per desain", () => {
    const big = "data:image/png;base64," + "A".repeat(MAX_DATA_URI_CHARS - 30);
    const d = clone();
    d.panelImages = [panelImg({ id: "a-1", url: big }), panelImg({ id: "a-2", url: big })];
    expect(dataImageChars(d)).toBeLessThanOrEqual(MAX_DESIGN_DATA_CHARS);
    expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(true);
    d.panelImages.push(panelImg({ id: "a-3", url: big, layer: "behind" }));
    expect(dataImageChars(d)).toBeGreaterThan(MAX_DESIGN_DATA_CHARS);
    expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(false);
  });

  it("menghitung dan membuang gambar unggahan tanpa mengubah desain asli", () => {
    const d = clone();
    d.bubble.decorations = [{ id: "pin-aaaa", kind: "image-pin", url: PNG_URI, anchor: "center", width: 30, offsetX: 0, offsetY: 0 }];
    d.avatar.frame.url = PNG_URI;
    d.panelImages = [panelImg(), panelImg({ id: "up-1", url: PNG_URI })];
    expect(countUploadedImages(d)).toBe(3);
    const { design, removed } = stripUploadedImages(d);
    expect(removed).toBe(3);
    expect(countUploadedImages(design)).toBe(0);
    expect(design.panelImages[0].url).toBe("https://cdn.example.com/logo.png");
    expect(design.panelImages[1].url).toBe("");
    expect(design.panelImages).toHaveLength(2);
    expect(countUploadedImages(d)).toBe(3);
  });
});

describe("CSS: gambar berposisi (image-pin)", () => {
  const withPin = (anchor: (typeof ANCHORS)[number], x = 4, y = 6) => {
    const d = clone();
    d.bubble.show = true;
    d.bubble.decorations = [{ id: "pin-aaaa", kind: "image-pin", url: "https://cdn.example.com/p.gif", anchor, width: 28, offsetX: x, offsetY: y }];
    return generateCss(d);
  };

  it("menaruh gambar sebagai lapisan background dengan ukuran dan posisi", () => {
    const css = withPin("top-right");
    expect(css).toMatch(/background-image: url\("https:\/\/cdn\.example\.com\/p\.gif"\), linear-gradient|background-image: url\("https:\/\/cdn\.example\.com\/p\.gif"\)/);
    expect(css).toContain("background-size: 28px auto");
    expect(css).toContain("calc(100% - 4px) 6px");
  });

  it.each([
    ["top-left", "4px 6px"],
    ["top-center", "calc(50% + 4px) 6px"],
    ["top-right", "calc(100% - 4px) 6px"],
    ["middle-left", "4px calc(50% + 6px)"],
    ["center", "calc(50% + 4px) calc(50% + 6px)"],
    ["middle-right", "calc(100% - 4px) calc(50% + 6px)"],
    ["bottom-left", "4px calc(100% - 6px)"],
    ["bottom-center", "calc(50% + 4px) calc(100% - 6px)"],
    ["bottom-right", "calc(100% - 4px) calc(100% - 6px)"],
  ] as const)("anchor %s menghasilkan posisi %s", (anchor, pos) => {
    expect(withPin(anchor)).toContain(`background-position: ${pos}`);
  });

  it("beberapa gambar berposisi bertumpuk sebagai lapisan terpisah", () => {
    const d = clone();
    d.bubble.show = true;
    d.bubble.decorations = [
      { id: "pin-aaaa", kind: "image-pin", url: "https://a.com/1.png", anchor: "top-left", width: 20, offsetX: 0, offsetY: 0 },
      { id: "pin-bbbb", kind: "image-pin", url: "https://a.com/2.png", anchor: "bottom-right", width: 30, offsetX: 2, offsetY: 2 },
    ];
    const css = generateCss(d);
    expect(css).toContain('url("https://a.com/1.png"), url("https://a.com/2.png")');
    expect(css).toContain("background-size: 20px auto, 30px auto");
  });

  it("slot tanpa link tidak menghasilkan lapisan", () => {
    const d = clone();
    d.bubble.show = true;
    d.bubble.decorations = [{ id: "pin-aaaa", kind: "image-pin", url: "", anchor: "center", width: 20, offsetX: 0, offsetY: 0 }];
    expect(generateCss(d)).not.toContain("url(");
  });

  it("gambar unggahan masuk ke CSS sebagai data URI utuh", () => {
    const d = clone();
    d.bubble.show = true;
    d.bubble.decorations = [{ id: "pin-aaaa", kind: "image-pin", url: PNG_URI, anchor: "center", width: 20, offsetX: 0, offsetY: 0 }];
    expect(generateCss(d)).toContain(`url("${PNG_URI}")`);
  });

  it("dekorasi gambar juga berlaku di kartu Super Chat", () => {
    const d = clone();
    d.superChat.surface.decorations = [{ id: "pin-aaaa", kind: "image-pin", url: "https://a.com/c.png", anchor: "top-right", width: 24, offsetX: 6, offsetY: 6 }];
    expect(generateCss(d).split("/* Super Chat */")[1].split("/* Membership */")[0]).toContain('url("https://a.com/c.png")');
  });
});

describe("CSS: bingkai avatar", () => {
  const withFrame = (mutate?: (d: Design) => void) => {
    const d = clone();
    d.avatar.frame = { url: "https://cdn.example.com/frame.png", scale: 150 };
    mutate?.(d);
    return generateCss(d);
  };

  it("memasang bingkai di ::after wadah avatar, tepat di tengah dan tidak menangkap klik", () => {
    const css = withFrame();
    const rule = css.match(/#author-photo::after \{[^}]*\}/)![0];
    expect(rule).toContain('url("https://cdn.example.com/frame.png") center / contain no-repeat');
    expect(rule).toContain("width: 150%");
    expect(rule).toContain("translate(-50%, -50%)");
    expect(rule).toContain("pointer-events: none");
  });

  it("wadah avatar tidak overflow hidden supaya bingkai boleh keluar, bentuk dipotong di gambarnya", () => {
    const css = withFrame((d) => { d.avatar.shape = "circle"; });
    expect(css).toMatch(/#author-photo \{[^}]*overflow: visible/);
    expect(css).toMatch(/#author-photo img \{[^}]*border-radius: 50%/);
  });

  it("hexagon dipotong pada gambarnya dan bingkai tetap tidak terpotong", () => {
    const css = withFrame((d) => { d.avatar.shape = "hexagon"; });
    expect(css).toMatch(/#author-photo img \{[^}]*clip-path: polygon/);
    expect(css).not.toMatch(/#author-photo \{[^}]*clip-path/);
  });

  it("tanpa link tidak ada ::after, dan bingkai berlaku juga di avatar kartu", () => {
    expect(generateCss(clone())).not.toContain("#author-photo::after");
    const css = withFrame();
    expect(css.split("/* Super Chat */")[1].split("/* Membership */")[0]).toContain("#author-photo::after");
  });
});

describe("CSS: gambar panel", () => {
  const css = (images: PanelImage[]) => {
    const d = clone();
    d.panelImages = images;
    return generateCss(d);
  };

  it("valid, tanpa fitur terlarang, dan tanpa bagian kosong saat tidak ada gambar", () => {
    const out = css([panelImg(), panelImg({ id: "b-1", layer: "behind", anchor: "center", url: PNG_URI })]);
    expect(() => postcss.parse(out)).not.toThrow();
    expect(css([])).not.toContain("/* Gambar panel */");
  });

  it("gambar depan di renderer::after, belakang di renderer::before, dengan tumpukan yang benar", () => {
    const out = css([panelImg({ layer: "front" }), panelImg({ id: "b-1", layer: "behind", url: "https://a.com/bg.png" })]);
    expect(out).toMatch(/yt-live-chat-renderer::after \{[^}]*z-index: 9/);
    expect(out).toMatch(/yt-live-chat-renderer::before \{[^}]*z-index: -1/);
    expect(out).toMatch(/yt-live-chat-renderer \{\s*position: relative[^}]*isolation: isolate/);
  });

  it("gambar kedua per lapisan memakai body::before dan body::after", () => {
    const out = css([panelImg({ id: "f-1" }), panelImg({ id: "f-2", url: "https://a.com/2.png" }), panelImg({ id: "b-1", layer: "behind" }), panelImg({ id: "b-2", layer: "behind", url: "https://a.com/3.png" })]);
    expect(out).toMatch(/body::after \{[^}]*2\.png/);
    expect(out).toMatch(/body::before \{[^}]*3\.png/);
  });

  it("mengatur ukuran, opacity, fit, dan posisi tetap", () => {
    const out = css([panelImg({ anchor: "bottom-left", width: 200, height: 100, offsetX: 12, offsetY: 20, opacity: 40, fit: "cover" })]);
    const rule = out.match(/yt-live-chat-renderer::after \{[^}]*\}/)![0];
    for (const part of ["position: fixed", "width: 200px", "height: 100px", "opacity: 0.4", "background-size: cover", "left: 12px", "bottom: 20px", "pointer-events: none"]) expect(rule).toContain(part);
  });

  it.each(ANCHORS)("anchor %s menghasilkan posisi yang valid", (anchor) => {
    const out = css([panelImg({ anchor })]);
    const rule = out.match(/yt-live-chat-renderer::after \{[^}]*\}/)![0];
    expect(rule).toMatch(/(left|right): /);
    expect(rule).toMatch(/(top|bottom): /);
    if (anchor.includes("center") || anchor === "middle-left" || anchor === "middle-right") expect(rule).toContain("translate");
  });

  it("gambar tanpa link dilewati dan tidak memakai slot", () => {
    const out = css([panelImg({ url: "" }), panelImg({ id: "f-2", url: "https://a.com/x.png" })]);
    expect(out).toMatch(/yt-live-chat-renderer::after \{[^}]*x\.png/);
    expect(out).not.toContain("body::after");
  });
});
