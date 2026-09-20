import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { generateCss } from "@/lib/design/css";
import { cssString } from "@/lib/design/fx";
import { EFFECT_KINDS, ELEMENT_ANIMS, isSafeLabelText, parseDesign, type Design, type Effect, type Label } from "@/lib/design/model";
import { designFromTemplate } from "@/lib/design/templates";

const base = (): Design => designFromTemplate("crystal");
const label = (o: Partial<Label> = {}): Label => ({
  id: "label-aaaa",
  text: "LIVE",
  roles: "all",
  position: "start",
  color: "#FFFFFF",
  bgColor: "#FF0055",
  bgOpacity: 100,
  size: 80,
  weight: 700,
  uppercase: true,
  spacing: 1,
  radius: 3,
  padX: 6,
  ...o,
});
const fx = (kind: Effect["kind"], o: Partial<Effect> = {}, n = 1): Effect => ({ id: `fx-${kind}-${n}`, kind, speed: 5, intensity: 5, ...o });
const section = (css: string, name: string) => css.split(`/* ${name} */`)[1]?.split("\n\n/* ")[0] ?? "";

describe("cssString", () => {
  it("meloloskan hanya huruf dan angka ASCII, semuanya lain jadi escape heksadesimal", () => {
    expect(cssString("LIVE 24")).toBe('"LIVE\\20 24"');
    expect(cssString('a"b')).toBe('"a\\22 b"');
    expect(cssString("a\\b")).toBe('"a\\5c b"');
  });

  it("emoji di luar BMP ditulis sebagai satu escape", () => {
    expect(cssString("\u{1F525}")).toBe('"\\1f525 "');
  });

  it.each([
    '"; } body { display: none; } /*',
    "\\22 ; }",
    "</style><script>alert(1)</script>",
    "url(https://x.test/a)",
    "*/ @import url(x) /*",
    "\u0000\u0001",
    "\n\r\t",
    "\u2028\u2029",
    "{}[]();:,",
  ])("tidak bisa keluar dari string CSS: %j", (evil) => {
    const s = cssString(evil);
    expect(s).toMatch(/^"(?:[A-Za-z0-9]|\\[0-9a-f]+ )*"$/);
  });

  it("hasil selalu bisa diparse sebagai satu deklarasi content tanpa aturan liar", () => {
    const d = base();
    d.labels = [label({ text: '"; } body { display: none; } /*' })];
    const root = postcss.parse(generateCss(d));
    const bodyRules = root.nodes.filter((n) => n.type === "rule" && n.selector === "body");
    expect(bodyRules).toHaveLength(1);
    expect(generateCss(d)).not.toMatch(/display:\s*none[^;]*\/\*/);
  });
});

describe("isSafeLabelText", () => {
  it.each(["LIVE", "MEMBER \u2605", "\u{1F525}", "a".repeat(24), ""])("menerima %j", (v) => expect(isSafeLabelText(v)).toBe(true));
  it.each(["a".repeat(25), "a\u0000b", "a\nb", "a\u2028b", "\ud800"])("menolak %j", (v) => expect(isSafeLabelText(v)).toBe(false));
});

describe("model: field baru", () => {
  it("desain lama tanpa field baru tetap valid dan mendapat nilai bawaan", () => {
    const old = JSON.parse(JSON.stringify(base()));
    for (const k of ["elements", "effects", "labels", "affixes", "roleBubbles"]) delete old[k];
    delete old.message.grid;
    delete old.message.free;
    delete old.bubble.shape;
    delete old.bubble.cut;
    const r = parseDesign(old);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.design.effects).toEqual([]);
      expect(r.design.labels).toEqual([]);
      expect(r.design.elements.name.style).toBe("none");
      expect(r.design.bubble.shape).toBe("round");
      expect(r.design.message.grid.columns.length).toBeGreaterThan(0);
      expect(r.design.roleBubbles.member).toBeNull();
    }
  });

  it("membatasi efek enam, label dua, dan kolom grid tiga", () => {
    const d = base();
    d.effects = Array.from({ length: 7 }, (_, i) => fx("float", {}, i));
    expect(parseDesign(d).ok).toBe(false);
    const e = base();
    e.labels = [label({ id: "label-aaaa" }), label({ id: "label-bbbb" }), label({ id: "label-cccc" })];
    expect(parseDesign(e).ok).toBe(false);
    const g = base();
    g.message.grid.columns = [1, 1, 1, 1];
    expect(parseDesign(g).ok).toBe(false);
  });

  it("menolak label berisi karakter kontrol dan efek dengan jenis asing", () => {
    const d = base();
    d.labels = [label({ text: "a\u0000b" })];
    expect(parseDesign(d).ok).toBe(false);
    const e = JSON.parse(JSON.stringify(base()));
    e.effects = [{ id: "fx-aaaa", kind: "explode", speed: 5, intensity: 5 }];
    expect(parseDesign(e).ok).toBe(false);
  });

  it("gambar unggahan di bubble per peran ikut dihitung dan ikut dibuang saat Share", async () => {
    const { stripUploadedImages, countUploadedImages } = await import("@/lib/design/model");
    const d = base();
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    d.roleBubbles.member = {
      surface: { ...d.bubble, decorations: [{ id: "image-pin-aaaa", kind: "image-pin", url: png, anchor: "top-left", width: 20, offsetX: 0, offsetY: 0 }] },
      textColor: null,
    };
    expect(countUploadedImages(d)).toBe(1);
    const stripped = stripUploadedImages(d).design;
    expect(countUploadedImages(stripped)).toBe(0);
  });
});

describe("bentuk dan dekorasi baru", () => {
  it("slant dan chamfer memakai clip-path dan menonaktifkan radius", () => {
    const d = base();
    d.bubble.shape = "slant";
    d.bubble.cut = 14;
    let css = generateCss(d);
    expect(css).toMatch(/#content \{[^}]*clip-path: polygon\(14px 0, 100% 0, calc\(100% - 14px\) 100%, 0 100%\)/);
    expect(section(css, "Bubble")).toMatch(/border-radius: 0 !important/);
    d.bubble.shape = "chamfer";
    css = generateCss(d);
    expect(css).toMatch(/#content \{[^}]*clip-path: polygon\(14px 0, calc\(100% - 14px\) 0, 100% 14px/);
    d.bubble.shape = "round";
    expect(generateCss(d)).not.toMatch(/#content \{[^}]*clip-path/);
  });

  it("bentuk juga berlaku untuk kartu karena memakai surface yang sama", () => {
    const d = base();
    d.superChat.surface.shape = "chamfer";
    expect(section(generateCss(d), "Super Chat")).toMatch(/#card \{[^}]*clip-path: polygon/);
  });

  it("halftone menjadi lapisan radial-gradient berulang", () => {
    const d = base();
    d.bubble.decorations = [{ id: "halftone-aaaa", kind: "halftone", color: "#FFFFFF", size: 9, opacity: 20 }];
    const css = generateCss(d);
    expect(css).toMatch(/background-image: radial-gradient\(circle, rgba\(255, 255, 255, 0\.2\) 28%, transparent 30%\)/);
    expect(css).toMatch(/background-size: 9px 9px/);
  });

  it("stripes menjadi repeating-linear-gradient dengan sudut dan jarak", () => {
    const d = base();
    d.bubble.decorations = [{ id: "stripes-aaaa", kind: "stripes", color: "#FF0000", width: 4, gap: 12, angle: 60, opacity: 30 }];
    expect(generateCss(d)).toMatch(/repeating-linear-gradient\(60deg, rgba\(255, 0, 0, 0\.3\) 0px, rgba\(255, 0, 0, 0\.3\) 4px, transparent 4px, transparent 16px\)/);
  });
});

describe("animasi per elemen", () => {
  it("bawaan tanpa animasi elemen tidak menambah bagian apa pun", () => {
    expect(generateCss(base())).not.toContain("Animasi elemen dan efek");
    expect(generateCss(base())).not.toContain("lc-el-");
  });

  it.each(ELEMENT_ANIMS.filter((a) => a !== "none"))("preset %s menghasilkan keyframes dan rule yang benar", (style) => {
    const d = base();
    d.elements.name = { style, duration: 500, delay: 120 };
    const css = generateCss(d);
    expect(css).toContain(`@keyframes lc-el-${style}`);
    expect(css).toMatch(new RegExp(`#author-name \\{[^}]*animation: lc-el-${style} 500ms cubic-bezier\\([^)]*\\) 120ms backwards`));
  });

  it("memakai fill-mode backwards supaya clip-path avatar hexagon tidak tertimpa animasi wipe", () => {
    const d = designFromTemplate("holo");
    d.elements.avatar = { style: "wipe", duration: 400, delay: 0 };
    const css = generateCss(d);
    expect(css).toMatch(/#author-photo \{[^}]*animation: lc-el-wipe[^;]* backwards/);
    expect(css).not.toMatch(/#author-photo \{[^}]*animation: lc-el-wipe[^;]* (both|forwards)/);
  });

  it("hanya menulis keyframes untuk preset yang dipakai, sekali saja", () => {
    const d = base();
    d.elements.name = { style: "rise", duration: 300, delay: 0 };
    d.elements.message = { style: "rise", duration: 300, delay: 100 };
    const css = generateCss(d);
    expect(css.match(/@keyframes lc-el-rise/g)).toHaveLength(1);
    expect(css).not.toContain("@keyframes lc-el-pop");
  });
});

describe("efek", () => {
  const cssOf = (...effects: Effect[]) => {
    const d = base();
    d.effects = effects;
    return generateCss(d);
  };

  it.each(EFFECT_KINDS)("efek %s ditulis dengan keyframes miliknya bila syaratnya terpenuhi", (kind) => {
    const d = designFromTemplate("crystal"); // punya gradient-border
    d.avatar.frame = { url: "https://cdn.example.com/f.png", scale: 130 };
    d.bubble.decorations.push({ id: "image-aaaa", kind: "image", url: "https://cdn.example.com/b.png", fit: "cover", position: "center", opacity: 50 });
    d.effects = [fx(kind)];
    const css = generateCss(d);
    expect(css).toContain(`@keyframes lc-fx-${kind}-0`);
    expect(css).toMatch(new RegExp(`animation:[^;]*lc-fx-${kind}-0`));
  });

  it("shimmer tidak menulis apa pun bila tidak ada gradient border", () => {
    const d = designFromTemplate("plain");
    d.effects = [fx("shimmer")];
    expect(generateCss(d)).not.toContain("lc-fx-shimmer");
  });

  it("spin butuh bingkai avatar dan drift butuh gambar latar", () => {
    const d = designFromTemplate("crystal");
    d.effects = [fx("spin"), fx("drift", {}, 2)];
    const css = generateCss(d);
    expect(css).not.toContain("lc-fx-spin");
    expect(css).not.toContain("lc-fx-drift");
  });

  it("intensitas dan kecepatan mengubah keluaran", () => {
    const soft = cssOf(fx("float", { intensity: 1, speed: 1 }));
    const hard = cssOf(fx("float", { intensity: 10, speed: 10 }));
    expect(soft).toContain("translateY(-1.8px)");
    expect(hard).toContain("translateY(-9px)");
    expect(soft).toContain("3.13s");
    expect(hard).toContain("0.70s");
  });

  it("dua efek pada target yang sama digabung dalam satu properti animation", () => {
    const css = cssOf(fx("float", {}, 1), fx("glow-pulse", {}, 2));
    const rules = css.match(/yt-live-chat-text-message-renderer #content \{[^}]*animation: ([^;]+) !important;/g) ?? [];
    const joined = rules.join(" ");
    expect(joined).toMatch(/lc-fx-float-0[^,]*,\s*lc-fx-glow-pulse-1/);
  });

  it("efek pada avatar digabung dengan animasi masuk avatar, bukan saling menimpa", () => {
    const d = base();
    d.elements.avatar = { style: "pop", duration: 400, delay: 0 };
    d.effects = [fx("pulse")];
    const css = generateCss(d);
    expect(css).toMatch(/#author-photo \{[^}]*animation: lc-el-pop[^;]*, lc-fx-pulse-0/);
  });

  it("dua efek sejenis memakai nama keyframes yang berbeda", () => {
    const css = cssOf(fx("float", { intensity: 2 }, 1), fx("float", { intensity: 9 }, 2));
    expect(css).toContain("@keyframes lc-fx-float-0");
    expect(css).toContain("@keyframes lc-fx-float-1");
  });

  it("glitch memakai warna magenta dan cyan dan flicker memberi cahaya neon pada nama", () => {
    const css = cssOf(fx("glitch", {}, 1), fx("flicker", {}, 2));
    expect(css).toMatch(/#ff2bd6/);
    expect(css).toMatch(/#author-name \{[^}]*text-shadow: 0 0 7px currentColor/);
  });

  it("shake berjalan sekali setelah animasi masuk selesai", () => {
    const d = base();
    d.animation.duration = 500;
    d.effects = [fx("shake")];
    expect(generateCss(d)).toMatch(/animation: lc-fx-shake-0 [\d.]+s ease 500ms 1 backwards/);
  });
});

describe("kerangka grid", () => {
  const gridDesign = () => {
    const d = base();
    d.message.layout = "grid";
    return d;
  };

  it("mengubah #content menjadi grid dengan kolom fr dan jarak", () => {
    const d = gridDesign();
    d.message.grid.columns = [1, 3];
    d.message.grid.rows = 2;
    d.message.grid.gap = 9;
    const css = section(generateCss(d), "Kerangka grid");
    expect(css).toMatch(/#content \{[^}]*display: grid/);
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 3fr)");
    expect(css).toContain("grid-template-rows: repeat(2, auto)");
    expect(css).toContain("column-gap: 9px");
  });

  it("menempatkan tiap bagian ke selnya, termasuk label lewat pseudo chip", () => {
    const d = gridDesign();
    d.labels = [label()];
    const css = section(generateCss(d), "Kerangka grid");
    expect(css).toMatch(/#author-name \{[^}]*grid-column: 1 \/ span 1[^}]*grid-row: 1 \/ span 1/);
    expect(css).toMatch(/#message \{[^}]*grid-row: 2 \/ span 1/);
    expect(css).toContain("yt-live-chat-author-chip::before");
    expect(css).toContain("yt-live-chat-author-chip::after");
  });

  it("sel di luar batas dipotong ke ukuran grid supaya CSS tetap valid", () => {
    const d = gridDesign();
    d.message.grid.columns = [1, 1];
    d.message.grid.rows = 1;
    d.message.grid.cells.name = { col: 3, row: 3, colSpan: 3, rowSpan: 3, alignX: "start", alignY: "center" };
    const css = section(generateCss(d), "Kerangka grid");
    expect(css).toMatch(/#author-name \{[^}]*grid-column: 2 \/ span 1[^}]*grid-row: 1 \/ span 1/);
  });

  it("mode lain tidak menulis bagian grid", () => {
    for (const layout of ["inline", "stacked"] as const) {
      const d = base();
      d.message.layout = layout;
      expect(generateCss(d)).not.toContain("Kerangka grid");
    }
  });
});

describe("kerangka bebas", () => {
  const freeDesign = () => {
    const d = base();
    d.message.layout = "free";
    d.message.free.width = 300;
    d.message.free.height = 80;
    d.message.free.parts.name = { x: 12, y: 7 };
    d.message.free.parts.message = { x: 12, y: 30, w: 260, lines: 3 };
    return d;
  };

  it("mengunci ukuran bubble dan menempatkan bagian secara absolut", () => {
    const css = section(generateCss(freeDesign()), "Kerangka bebas");
    expect(css).toMatch(/#content \{[^}]*width: 300px[^}]*height: 80px[^}]*padding: 0/);
    expect(css).toMatch(/#author-name \{[^}]*position: absolute[^}]*left: 12px[^}]*top: 7px/);
  });

  it("pesan dibatasi lebar dan jumlah barisnya", () => {
    const css = section(generateCss(freeDesign()), "Kerangka bebas");
    expect(css).toMatch(/#message \{[^}]*width: 260px[^}]*-webkit-line-clamp: 3/);
  });

  it("lebar pesan 0 berarti mengikuti sisa lebar bubble", () => {
    const d = freeDesign();
    d.message.free.parts.message.w = 0;
    expect(section(generateCss(d), "Kerangka bebas")).toMatch(/#message \{[^}]*width: calc\(100% - 20px\)/);
  });

  it("bubble per peran tidak mengubah padding di mode bebas", () => {
    const d = freeDesign();
    d.roleBubbles.member = { surface: { ...d.bubble, padding: 20 }, textColor: null };
    const css = section(generateCss(d), "Bubble per peran");
    // Aturan #content peran tidak boleh memuat padding. Padding milik pseudo-element ring sah dan tidak dihitung.
    expect(css).toMatch(/\[author-type="member"\] #content \{/);
    expect(css).not.toMatch(/\[author-type="member"\] #content \{[^}]*padding:/);
  });
});

describe("label dan teks sendiri", () => {
  it("label pertama di ::before dan kedua di ::after pada chip", () => {
    const d = base();
    d.labels = [label({ text: "LIVE" }), label({ id: "label-bbbb", text: "NEW" })];
    const css = section(generateCss(d), "Teks buatan sendiri");
    expect(css).toMatch(/yt-live-chat-author-chip::before \{[^}]*content: "LIVE"/);
    expect(css).toMatch(/yt-live-chat-author-chip::after \{[^}]*content: "NEW"/);
  });

  it.each([
    ["viewer", ':not([author-type])'],
    ["member", '[author-type="member"]'],
    ["moderator", '[author-type="moderator"]'],
    ["owner", '[author-type="owner"]'],
  ] as const)("label untuk peran %s dibatasi lewat selector", (roles, selectorPart) => {
    const d = base();
    d.labels = [label({ roles })];
    expect(section(generateCss(d), "Teks buatan sendiri")).toContain(`yt-live-chat-text-message-renderer${selectorPart} yt-live-chat-author-chip::before`);
  });

  it("label untuk semua peran tidak memakai batasan atribut", () => {
    const d = base();
    d.labels = [label({ roles: "all" })];
    expect(section(generateCss(d), "Teks buatan sendiri")).toContain("yt-live-chat-text-message-renderer yt-live-chat-author-chip::before");
  });

  it("di mode inline label memakai order awal atau akhir, di mode grid tidak", () => {
    const d = base();
    d.labels = [label({ position: "start" }), label({ id: "label-bbbb", position: "end" })];
    let css = section(generateCss(d), "Teks buatan sendiri");
    expect(css).toMatch(/::before \{[^}]*order: -1/);
    expect(css).toMatch(/::after \{[^}]*order: 9/);
    d.message.layout = "grid";
    css = section(generateCss(d), "Teks buatan sendiri");
    expect(css).not.toMatch(/order: -1/);
  });

  it("label kosong dilewati dan warna latar transparan bila opacity 0", () => {
    const d = base();
    d.labels = [label({ text: "" }), label({ id: "label-bbbb", bgOpacity: 0 })];
    const css = section(generateCss(d), "Teks buatan sendiri");
    expect(css.match(/content:/g)).toHaveLength(1);
    expect(css).toContain("background: transparent");
  });

  it("awalan dan akhiran nama serta pesan", () => {
    const d = base();
    d.affixes = { name: { prefix: "\u2605 ", suffix: "" }, message: { prefix: "", suffix: " \u2713" } };
    const css = section(generateCss(d), "Teks buatan sendiri");
    expect(css).toMatch(/#author-name::before \{[^}]*content: "\\2605 \\20 "/);
    expect(css).not.toMatch(/#author-name::after/);
    expect(css).toMatch(/#message::after \{[^}]*content: "\\20 \\2713 "/);
    expect(css).not.toMatch(/#message::before/);
  });

  it("tanpa label dan affix tidak menulis bagian apa pun", () => {
    expect(generateCss(base())).not.toContain("Teks buatan sendiri");
  });
});

describe("bubble per peran", () => {
  it("tanpa override tidak menulis bagian peran", () => {
    expect(generateCss(base())).not.toContain("Bubble per peran");
  });

  it("override menulis surface lengkap hanya untuk perannya", () => {
    const d = base();
    d.roleBubbles.owner = {
      surface: { ...d.bubble, fill: { mode: "solid", color: "#FFD700", color2: "#FFD700", angle: 135, opacity: 100 }, radius: 3, decorations: [], shape: "round", cut: 12 },
      textColor: "#111111",
    };
    const css = section(generateCss(d), "Bubble per peran");
    expect(css).toContain('yt-live-chat-text-message-renderer[author-type="owner"] #content');
    expect(css).toContain("rgba(255, 215, 0, 1)");
    expect(css).toMatch(/\[author-type="owner"\] #message \{[^}]*color: #111111/);
    expect(css).not.toContain('[author-type="member"]');
    expect(css).not.toContain('[author-type="moderator"]');
  });

  it("ring milik bubble utama disembunyikan untuk peran yang tidak memilikinya", () => {
    const d = base(); // crystal punya gradient border
    d.roleBubbles.member = { surface: { ...d.bubble, decorations: [] }, textColor: null };
    expect(section(generateCss(d), "Bubble per peran")).toMatch(/\[author-type="member"\] #content::before \{[^}]*display: none/);
  });

  it("peran yang punya ring sendiri menulis ::before miliknya", () => {
    const d = base();
    d.roleBubbles.moderator = { surface: { ...d.bubble }, textColor: null };
    const css = section(generateCss(d), "Bubble per peran");
    expect(css).toMatch(/\[author-type="moderator"\] #content::before \{[^}]*-webkit-mask-composite: xor/);
  });
});

describe("kualitas CSS keseluruhan dengan fitur baru", () => {
  const full = (): Design => {
    const d = base();
    d.message.layout = "grid";
    d.labels = [label()];
    d.affixes = { name: { prefix: "\u2605", suffix: "" }, message: { prefix: "", suffix: "!" } };
    d.elements.name = { style: "wipe", duration: 300, delay: 50 };
    d.elements.message = { style: "rise", duration: 300, delay: 150 };
    d.effects = [fx("float", {}, 1), fx("glitch", {}, 2), fx("shimmer", {}, 3)];
    d.bubble.shape = "chamfer";
    d.bubble.decorations.push({ id: "halftone-aaaa", kind: "halftone", color: "#FFFFFF", size: 8, opacity: 10 });
    d.roleBubbles.member = { surface: { ...d.bubble }, textColor: "#00FF88" };
    return d;
  };

  it("tetap CSS valid tanpa fitur berisiko", () => {
    const css = generateCss(full());
    expect(() => postcss.parse(css)).not.toThrow();
    for (const re of [/color-mix\(/, /:has\(/, /@layer/, /@container/, /backdrop-filter/, /\bNaN\b/, /undefined/, /\[object/]) expect(css).not.toMatch(re);
    expect(css).not.toMatch(/[\u2013\u2014]/);
    expect(css.split("{").length).toBe(css.split("}").length);
    expect(css).not.toMatch(/\{\s*\}/);
  });

  it("stylesheet tetap dimulai dengan @import bila memakai font Google", () => {
    const d = full();
    const first = postcss.parse(generateCss(d)).nodes.find((n) => n.type !== "comment");
    expect(first).toMatchObject({ type: "atrule", name: "import" });
  });

  it("keyframes tidak pernah dideklarasikan dua kali dengan nama yang sama", () => {
    const names = [...generateCss(full()).matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("font satu bobot tidak meminta rentang bobot", () => {
    const d = base();
    d.font = "anton";
    expect(generateCss(d)).toContain("family=Anton:wght@400&display=swap");
    d.font = "press-start-2p";
    expect(generateCss(d)).toContain("family=Press+Start+2P:wght@400&display=swap");
    d.font = "exo-2";
    expect(generateCss(d)).toContain("wght@400;500;600;700");
  });
});
