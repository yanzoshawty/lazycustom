import { describe, expect, it } from "vitest";
import { designFromTemplate, DEFAULT_DESIGN, TEMPLATES } from "@/lib/design/templates";
import { designsEqual, isSafeImageUrl, newId, parseDesign } from "@/lib/design/model";

describe("template", () => {
  it("menyediakan sebelas template dengan id unik", () => {
    expect(TEMPLATES).toHaveLength(11);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(11);
  });

  it.each(TEMPLATES)("$id lolos validasi skema dan konsisten dengan id-nya", ({ id, name, design }) => {
    const r = parseDesign(JSON.parse(JSON.stringify(design)));
    expect(r.ok).toBe(true);
    expect(design.templateId).toBe(id);
    expect(design.name).toBe(name);
  });

  it("designFromTemplate memberi salinan dalam yang tidak memengaruhi template asli", () => {
    const a = designFromTemplate("crystal");
    a.bubble.decorations.push({ id: "x-1", kind: "scanlines", gap: 4, opacity: 10, color: "#FFFFFF" });
    a.message.order.reverse();
    const b = designFromTemplate("crystal");
    expect(b.bubble.decorations.some((d) => d.id === "x-1")).toBe(false);
    expect(b.message.order[0]).toBe("timestamp");
    expect(designsEqual(a, b)).toBe(false);
  });

  it("template default adalah Crystal", () => {
    expect(DEFAULT_DESIGN.templateId).toBe("crystal");
  });
});

describe("parseDesign", () => {
  const good = () => JSON.parse(JSON.stringify(DEFAULT_DESIGN));

  it.each([null, undefined, 5, "teks", [], true])("menolak nilai bukan objek: %j", (v) => {
    expect(parseDesign(v)).toEqual({ ok: false, code: "IMPORT_INVALID" });
  });

  it("membedakan versi lain dari file rusak", () => {
    expect(parseDesign({ v: 1 })).toEqual({ ok: false, code: "IMPORT_VERSION" });
    expect(parseDesign({})).toEqual({ ok: false, code: "IMPORT_INVALID" });
  });

  it("menolak angka di luar batas dan warna yang salah format", () => {
    const d = good();
    d.fontSize = 999;
    expect(parseDesign(d).ok).toBe(false);
    const e = good();
    e.text.color = "#abcdef";
    expect(parseDesign(e).ok).toBe(false);
    const f = good();
    f.text.color = "#FFFFFF; } body { display:none";
    expect(parseDesign(f).ok).toBe(false);
  });

  it("menolak urutan bagian yang tidak lengkap atau ganda", () => {
    const d = good();
    d.message.order = ["name", "name", "badges", "message"];
    expect(parseDesign(d).ok).toBe(false);
    const e = good();
    e.message.order = ["name", "badges", "message"];
    expect(parseDesign(e).ok).toBe(false);
  });

  it("menolak nama desain kosong, terlalu panjang, atau berisi karakter kontrol", () => {
    for (const name of ["", "   ", "x".repeat(41), "a\u0000b", "a\nb"]) {
      const d = good();
      d.name = name;
      expect(parseDesign(d).ok, JSON.stringify(name)).toBe(false);
    }
  });

  it("membatasi jumlah dekorasi", () => {
    const d = good();
    d.bubble.decorations = Array.from({ length: 9 }, (_, i) => ({
      id: `deco-${i}`,
      kind: "scanlines",
      gap: 4,
      opacity: 10,
      color: "#FFFFFF",
    }));
    expect(parseDesign(d).ok).toBe(false);
  });

  it("menolak jenis dekorasi yang tidak dikenal", () => {
    const d = good();
    d.bubble.decorations = [{ id: "abc", kind: "script", code: "alert(1)" }];
    expect(parseDesign(d).ok).toBe(false);
  });
});

describe("isSafeImageUrl", () => {
  it.each([
    "",
    "https://example.com/a.png",
    "https://cdn.example.com/x/y.gif?size=2&v=3",
    "https://example.com/a%20b.png",
  ])("menerima %j", (u) => expect(isSafeImageUrl(u)).toBe(true));

  it.each([
    "http://example.com/a.png",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//example.com/a.png",
    'https://example.com/a.png")};body{display:none;/*',
    "https://example.com/a b.png",
    "https://example.com/a'b.png",
    "https://example.com/(a).png",
    "https://example.com/a\\b.png",
    "https://example.com/a<b>.png",
    "https://example.com/" + "x".repeat(500),
    "ftp://example.com/a.png",
    "bukan url",
  ])("menolak %j", (u) => expect(isSafeImageUrl(u)).toBe(false));

  it("menolak link gambar berbahaya lewat skema desain", () => {
    const d = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
    d.bubble.decorations = [
      { id: "img-1", kind: "image", url: 'https://a.com/x.png")}', fit: "cover", position: "center", opacity: 50 },
    ];
    expect(parseDesign(d).ok).toBe(false);
  });
});

describe("newId", () => {
  it("cocok dengan format id dan jarang bertabrakan", () => {
    const ids = new Set(Array.from({ length: 300 }, () => newId()));
    expect(ids.size).toBeGreaterThan(295);
    for (const id of ids) expect(id).toMatch(/^d-[a-z0-9]{8}$/);
  });
});
