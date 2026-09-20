// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, designFromTemplate, TEMPLATES } from "@/lib/design/templates";
import { decodeDesign, encodeDesign, readShareHash, shareUrl } from "@/lib/design/share";
import { designsEqual } from "@/lib/design/model";

describe("encode dan decode", () => {
  it.each(TEMPLATES)("membulatkan template $id tanpa kehilangan apa pun", async ({ design }) => {
    const code = await encodeDesign(design);
    expect(code.startsWith("z.")).toBe(true);
    expect(code).toMatch(/^[a-z]\.[A-Za-z0-9_-]+$/);
    const r = await decodeDesign(code);
    expect(r.ok).toBe(true);
    if (r.ok) expect(designsEqual(r.design, design)).toBe(true);
  });

  it("menghasilkan link yang ringkas untuk desain biasa", async () => {
    const code = await encodeDesign(DEFAULT_DESIGN);
    expect(code.length).toBeLessThan(2500);
  });

  it("menerima bentuk tanpa kompresi (j.)", async () => {
    const plain = "j." + Buffer.from(JSON.stringify(DEFAULT_DESIGN)).toString("base64url");
    const r = await decodeDesign(plain);
    expect(r.ok).toBe(true);
  });

  it("menjaga nama desain berisi karakter Unicode", async () => {
    const d = designFromTemplate("crystal", "Desain Kopi \u2615 Pagi");
    const r = await decodeDesign(await encodeDesign(d));
    expect(r.ok && r.design.name).toBe("Desain Kopi \u2615 Pagi");
  });

  it("menjaga link gambar yang valid", async () => {
    const d = designFromTemplate("crystal");
    d.bubble.decorations.push({ id: "img-1", kind: "image", url: "https://cdn.example.com/a.gif", fit: "cover", position: "center", opacity: 50 });
    const r = await decodeDesign(await encodeDesign(d));
    expect(r.ok && r.design.bubble.decorations.some((x) => x.kind === "image")).toBe(true);
  });
});

describe("decode menolak masukan berbahaya atau rusak", () => {
  it.each([
    ["kosong", ""],
    ["tanpa prefiks", "abcdef"],
    ["prefiks salah", "x.abcdef"],
    ["karakter ilegal", "z.abc$%^"],
    ["base64 rusak", "z.a"],
    ["bukan deflate", "z.aGVsbG8gd29ybGQ"],
    ["JSON rusak", "j." + Buffer.from("{bukan json").toString("base64url")],
    ["JSON bukan desain", "j." + Buffer.from('{"v":2}').toString("base64url")],
    ["versi lain", "j." + Buffer.from('{"v":1}').toString("base64url")],
    ["array", "j." + Buffer.from("[1,2,3]").toString("base64url")],
    ["UTF-8 tidak valid", "j." + Buffer.from([0xff, 0xfe, 0xfd]).toString("base64url")],
  ])("%s", async (_n, code) => {
    const r = await decodeDesign(code);
    expect(r).toEqual({ ok: false, code: "SHARE_INVALID" });
  });

  it("menolak link yang terlalu panjang", async () => {
    const r = await decodeDesign("z." + "A".repeat(13_000));
    expect(r).toEqual({ ok: false, code: "SHARE_TOO_LARGE" });
  });

  it("menolak bom dekompresi (kecil di link, sangat besar setelah dibuka)", async () => {
    const big = new TextEncoder().encode(" ".repeat(5 * 1024 * 1024));
    const cs = new CompressionStream("deflate-raw");
    const w = cs.writable.getWriter();
    void w.write(big);
    void w.close();
    const packed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    expect(packed.length).toBeLessThan(12_000);
    const r = await decodeDesign("z." + Buffer.from(packed).toString("base64url"));
    expect(r).toEqual({ ok: false, code: "SHARE_TOO_LARGE" });
  });

  it("menolak desain yang lolos JSON tapi melanggar skema (link gambar berbahaya)", async () => {
    const d = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
    d.bubble.decorations = [{ id: "img-1", kind: "image", url: 'https://a.com/x.png")}body{display:none', fit: "cover", position: "center", opacity: 50 }];
    const r = await decodeDesign("j." + Buffer.from(JSON.stringify(d)).toString("base64url"));
    expect(r).toEqual({ ok: false, code: "SHARE_INVALID" });
  });

  it("menolak warna yang mencoba menyelipkan CSS", async () => {
    const d = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
    d.text.color = "#FFFFFF;}body{display:none";
    const r = await decodeDesign("j." + Buffer.from(JSON.stringify(d)).toString("base64url"));
    expect(r.ok).toBe(false);
  });
});

describe("payload yang mencoba mencemari objek", () => {
  it("kunci __proto__ dan constructor di payload tidak mengubah Object.prototype dan tidak ikut ke hasil", async () => {
    const d = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
    const text = JSON.stringify(d).replace(/^\{/, '{"__proto__":{"terkontaminasi":true},"constructor":{"prototype":{"terkontaminasi":true}},');
    const r = await decodeDesign("j." + Buffer.from(text).toString("base64url"));
    expect(({} as Record<string, unknown>).terkontaminasi).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "terkontaminasi")).toBe(false);
    if (r.ok) {
      expect(Object.keys(r.design)).not.toContain("__proto__");
      expect((r.design as unknown as Record<string, unknown>).terkontaminasi).toBeUndefined();
    }
  });
});

describe("url dan hash", () => {
  it("membentuk dan membaca link Share", () => {
    const url = shareUrl("z.abc", { origin: "https://lazycustom.vercel.app", pathname: "/" });
    expect(url).toBe("https://lazycustom.vercel.app/#d=z.abc");
    expect(readShareHash("#d=z.abc")).toBe("z.abc");
    expect(readShareHash("d=z.abc")).toBe("z.abc");
  });

  it.each(["", "#", "#tab=1", "#x=d=abc", "#D=abc"])("bukan link Share: %j", (h) => {
    expect(readShareHash(h)).toBeNull();
  });
});
