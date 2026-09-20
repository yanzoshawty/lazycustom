// @vitest-environment node
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
import { generateCss } from "@/lib/design/css";
import { LAYERS } from "@/lib/design/layers";
import { buildPreviewDoc, SEND_KINDS } from "@/lib/design/preview-doc";
import { DEFAULT_DESIGN } from "@/lib/design/templates";

type LC = {
  add: (k: string) => Element;
  count: () => number;
  layerOf: (el: Element) => string;
  select: (l: string | null) => void;
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
  seed: () => void;
};

const opened: JSDOM[] = [];
function open(mode: "live" | "thumb" = "live", css = generateCss(DEFAULT_DESIGN)) {
  const dom = new JSDOM(buildPreviewDoc(css, mode), { runScripts: "dangerously", pretendToBeVisual: true });
  opened.push(dom);
  const w = dom.window as unknown as Window & { __lc: LC; MessageEvent: typeof MessageEvent };
  return { dom, w, doc: w.document, lc: w.__lc };
}
afterEach(() => opened.splice(0).forEach((d) => d.window.close()));

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("mode thumb", () => {
  it("menampilkan dua pesan statis tanpa animasi dan tanpa header atau kolom kirim", () => {
    const { doc, lc } = open("thumb");
    expect(lc.count()).toBe(2);
    expect(doc.querySelector("yt-live-chat-header-renderer")).toBeNull();
    expect(doc.querySelector("yt-live-chat-message-input-renderer")).toBeNull();
    expect(doc.getElementById("lc-motion")!.textContent).toContain("animation:none");
    expect(doc.querySelectorAll("yt-live-chat-text-message-renderer")).toHaveLength(2);
    expect(doc.querySelector("yt-live-chat-paid-message-renderer")).toBeNull();
  });

  it("tidak menambah pesan seiring waktu", async () => {
    const { lc } = open("thumb");
    await wait(400);
    expect(lc.count()).toBe(2);
  });
});

describe("mode live", () => {
  it("memuat pesan awal bertahap lalu terus menambah pesan", async () => {
    const { lc } = open("live");
    expect(lc.count()).toBeLessThanOrEqual(1);
    await wait(1200);
    expect(lc.count()).toBeGreaterThanOrEqual(4);
    expect(lc.isPlaying()).toBe(true);
  });

  it("Pause menghentikan penambahan dan Play melanjutkannya", async () => {
    const { lc } = open("live");
    await wait(1200);
    lc.pause();
    const before = lc.count();
    await wait(400);
    expect(lc.count()).toBe(before);
    expect(lc.isPlaying()).toBe(false);
    lc.play();
    expect(lc.isPlaying()).toBe(true);
  });

  it.each(SEND_KINDS)("kirim pesan %s membuat struktur DOM yang sesuai", (kind) => {
    const { doc, lc } = open("live");
    lc.pause();
    const el = lc.add(kind);
    const tag = el.tagName.toLowerCase();
    if (kind === "superchat") {
      expect(tag).toBe("yt-live-chat-paid-message-renderer");
      expect(el.querySelector("#card #header #purchase-amount")).not.toBeNull();
      expect(el.getAttribute("style")).toContain("--yt-live-chat-paid-message-primary-color");
    } else if (kind === "membership") {
      expect(tag).toBe("yt-live-chat-membership-item-renderer");
      expect(el.querySelector("#card #header #author-name")).not.toBeNull();
    } else if (kind === "sticker") {
      expect(tag).toBe("yt-live-chat-paid-sticker-renderer");
      expect(el.querySelector("#sticker img")).not.toBeNull();
      expect(el.querySelector("#purchase-amount-chip")).not.toBeNull();
    } else {
      expect(tag).toBe("yt-live-chat-text-message-renderer");
      expect(el.querySelector("#content #message")).not.toBeNull();
      if (kind === "viewer") expect(el.getAttribute("author-type")).toBeNull();
      else expect(el.getAttribute("author-type")).toBe(kind);
    }
    expect(doc.getElementById("items")!.lastElementChild).toBe(el);
  });

  it("membatasi jumlah pesan di DOM", () => {
    const { lc } = open("live");
    lc.pause();
    for (let i = 0; i < 80; i++) lc.add("viewer");
    expect(lc.count()).toBeLessThanOrEqual(40);
  });

  it("memakai avatar data URI tanpa permintaan jaringan", () => {
    const { doc, lc } = open("live");
    lc.pause();
    lc.add("superchat");
    for (const img of doc.querySelectorAll("img")) expect(img.getAttribute("src")).toMatch(/^data:/);
  });

  it("menerima pembaruan CSS hanya dari jendela induk", () => {
    const { w, doc } = open("live");
    const style = doc.getElementById("lc-style")!;
    w.dispatchEvent(new w.MessageEvent("message", { data: { type: "css", css: "body{color:red}" }, source: w }));
    expect(style.textContent).toBe("body{color:red}");
    const other = new JSDOM("").window;
    w.dispatchEvent(new w.MessageEvent("message", { data: { type: "css", css: "body{color:blue}" }, source: other as never }));
    expect(style.textContent).toBe("body{color:red}");
  });

  it("mengabaikan pesan yang bentuknya salah", () => {
    const { w, doc } = open("live");
    const before = doc.getElementById("lc-style")!.textContent;
    for (const data of [null, "teks", 5, { type: "css", css: 123 }, { type: "tidak-ada" }, { type: "send", kind: "<script>" }]) {
      w.dispatchEvent(new w.MessageEvent("message", { data, source: w }));
    }
    expect(doc.getElementById("lc-style")!.textContent).toBe(before);
  });

  it("menyorot layer terpilih dengan outline dan menghapusnya saat null", () => {
    const { doc, lc } = open("live");
    lc.select("bubble");
    const hl = doc.getElementById("lc-hl")!.textContent!;
    expect(hl).toContain("yt-live-chat-text-message-renderer #content");
    expect(hl).toContain("outline:2px solid");
    lc.select(null);
    expect(doc.getElementById("lc-hl")!.textContent).toBe("");
    lc.select("layer-tidak-ada");
    expect(doc.getElementById("lc-hl")!.textContent).toBe("");
  });

  it("memetakan klik pada elemen ke layer yang benar", () => {
    const { lc } = open("live");
    lc.pause();
    const msg = lc.add("member");
    const q = (sel: string) => msg.querySelector(sel)!;
    expect(lc.layerOf(q("#message"))).toBe("text");
    expect(lc.layerOf(q("#author-name"))).toBe("name");
    expect(lc.layerOf(q("#chat-badges"))).toBe("badges");
    expect(lc.layerOf(q("yt-live-chat-author-badge-renderer"))).toBe("badges");
    expect(lc.layerOf(q("#timestamp"))).toBe("timestamp");
    expect(lc.layerOf(q("#author-photo"))).toBe("avatar");
    expect(lc.layerOf(q("#author-photo img"))).toBe("avatar");
    expect(lc.layerOf(q("#content"))).toBe("bubble");
    expect(lc.layerOf(msg)).toBe("row");

    const sc = lc.add("superchat");
    expect(lc.layerOf(sc.querySelector("#purchase-amount")!)).toBe("superchat");
    expect(lc.layerOf(sc.querySelector("#author-photo")!)).toBe("avatar");
    expect(lc.layerOf(lc.add("membership").querySelector("#header-subtext")!)).toBe("membership");
    expect(lc.layerOf(lc.add("sticker").querySelector("#sticker")!)).toBe("sticker");
    expect(lc.layerOf(msg.ownerDocument.body)).toBe("panel");
  });

  it("menyediakan target sorotan untuk setiap layer", () => {
    for (const l of LAYERS) expect(l.targets.length).toBeGreaterThan(0);
  });
});

describe("deteksi tap (pengganti click di iframe bersandbox)", () => {
  function selections(w: Window & { MessageEvent: typeof MessageEvent }) {
    const got: string[] = [];
    w.addEventListener("message", (e) => {
      const d = (e as MessageEvent).data as { type?: string; layer?: string } | null;
      if (d?.type === "lc-select" && d.layer) got.push(d.layer);
    });
    return got;
  }
  const ptr = (w: Window, type: string, el: Element, x = 10, y = 10, button = 0) => {
    const ev = new (w as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button });
    Object.assign(ev, { pointerId: 1 });
    el.dispatchEvent(ev);
  };

  it("pointerdown lalu pointerup di tempat yang sama memilih layer, tanpa event click", async () => {
    const { w, lc, doc } = open("live");
    lc.pause();
    const el = lc.add("viewer").querySelector("#message")!;
    const got = selections(w);
    ptr(w, "pointerdown", el);
    ptr(w, "pointerup", el);
    await wait(30);
    expect(got).toEqual(["text"]);
    expect(doc.getElementById("items")).not.toBeNull();
  });

  it("menggeser jari (scroll halaman) tidak dihitung tap", async () => {
    const { w, lc } = open("live");
    lc.pause();
    const el = lc.add("viewer").querySelector("#message")!;
    const got = selections(w);
    ptr(w, "pointerdown", el, 10, 10);
    ptr(w, "pointerup", el, 10, 80);
    await wait(30);
    expect(got).toEqual([]);
  });

  it("pointercancel (browser mengambil alih untuk scroll) membatalkan tap", async () => {
    const { w, lc } = open("live");
    lc.pause();
    const el = lc.add("viewer").querySelector("#message")!;
    const got = selections(w);
    ptr(w, "pointerdown", el);
    ptr(w, "pointercancel", el);
    ptr(w, "pointerup", el);
    await wait(30);
    expect(got).toEqual([]);
  });

  it("tombol kanan atau tengah mouse tidak memilih layer", async () => {
    const { w, lc } = open("live");
    lc.pause();
    const el = lc.add("viewer").querySelector("#message")!;
    const got = selections(w);
    ptr(w, "pointerdown", el, 10, 10, 2);
    ptr(w, "pointerup", el, 10, 10, 2);
    await wait(30);
    expect(got).toEqual([]);
  });

  it("menyentuh kartu Super Chat memilih layer kartu, avatar tetap avatar", async () => {
    const { w, lc } = open("live");
    lc.pause();
    const sc = lc.add("superchat");
    const got = selections(w);
    for (const el of [sc.querySelector("#purchase-amount")!, sc.querySelector("#author-photo")!]) {
      ptr(w, "pointerdown", el);
      ptr(w, "pointerup", el);
    }
    await wait(30);
    expect(got).toEqual(["superchat", "avatar"]);
  });
});

describe("keamanan dokumen", () => {
  it("tidak membiarkan penutup style menyusup lewat CSS", () => {
    const html = buildPreviewDoc("body{}</style><script>window.pwned=1</script>", "live");
    const dom = new JSDOM(html, { runScripts: "dangerously" });
    opened.push(dom);
    expect((dom.window as unknown as { pwned?: number }).pwned).toBeUndefined();
    expect(dom.window.document.querySelectorAll("script")).toHaveLength(1);
  });

  it("menaruh CSS keluaran apa adanya di style lc-style", () => {
    const css = generateCss(DEFAULT_DESIGN);
    const { doc } = open("live", css);
    expect(doc.getElementById("lc-style")!.textContent).toBe(css);
  });
});
