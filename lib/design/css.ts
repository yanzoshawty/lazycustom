import { FONTS, fontImport } from "../fonts";
import { pickEdge, rgba } from "../color";
import { fxCss } from "./fx";
import type { Anchor, Card, Decoration, Design, Fill, PanelImage, Surface } from "./model";

/**
 * Generator CSS untuk Browser Source OBS (model desain v2).
 *
 * Aturan yang dijaga di file ini:
 * - Hanya CSS lama yang aman di browser bawaan OBS: tanpa color-mix, :has(), nesting,
 *   @layer, dan backdrop-filter (OBS memadukan sumber browser sebagai tekstur terpisah,
 *   jadi blur latar tidak akan menangkap gameplay).
 * - Semua selector khusus YouTube ada di objek SEL supaya gampang diperbaiki kalau
 *   YouTube mengubah struktur chat-nya.
 * - Nilai hanya berasal dari Design yang sudah divalidasi (warna hex, angka berbatas,
 *   link gambar https tanpa karakter berbahaya), jadi tidak ada input bebas yang menyusup.
 */

export const SEL = {
  renderer: "yt-live-chat-renderer",
  text: "yt-live-chat-text-message-renderer",
  paid: "yt-live-chat-paid-message-renderer",
  member: "yt-live-chat-membership-item-renderer",
  sticker: "yt-live-chat-paid-sticker-renderer",
  header: "yt-live-chat-header-renderer",
  input: "yt-live-chat-message-input-renderer",
  inputPanel: "#input-panel",
  ticker: "yt-live-chat-ticker-renderer",
  chip: "yt-live-chat-author-chip",
  badge: "yt-live-chat-author-badge-renderer",
} as const;

const IMP = " !important";
export type Decl = [prop: string, value: string];

function rule(selectors: string | string[], decls: Decl[]): string {
  const sel = Array.isArray(selectors) ? selectors.join(",\n") : selectors;
  const body = decls.map(([p, v]) => `  ${p}: ${v}${IMP};`).join("\n");
  return `${sel} {\n${body}\n}`;
}

/* ---------- Fill, dekorasi, surface ---------- */

function fillImage(f: Fill): string | null {
  if (f.mode === "none") return null;
  if (f.mode === "solid") {
    const c = rgba(f.color, f.opacity);
    return `linear-gradient(${c}, ${c})`;
  }
  return `linear-gradient(${f.angle}deg, ${rgba(f.color, f.opacity)}, ${rgba(f.color2, f.opacity)})`;
}

interface Layer {
  image: string;
  size: string;
  position: string;
  repeat: string;
}

/**
 * Posisi background dari anchor 9 titik dan jarak dari tepi. Selalu bentuk dua nilai supaya valid untuk
 * semua kombinasi: "kiri atau atas" memakai jarak dari tepi itu, "tengah" memakai 50% ditambah geseran,
 * "kanan atau bawah" memakai 100% dikurangi jarak.
 */
function anchorPosition(anchor: Anchor, x: number, y: number): string {
  const h = anchor.endsWith("left") ? `${x}px` : anchor.endsWith("right") ? `calc(100% - ${x}px)` : `calc(50% + ${x}px)`;
  const v = anchor.startsWith("top") ? `${y}px` : anchor.startsWith("bottom") ? `calc(100% - ${y}px)` : `calc(50% + ${y}px)`;
  return `${h} ${v}`;
}

const CORNER_POS = ["left top", "right top", "left bottom", "right bottom"] as const;

function decorationLayers(d: Decoration): Layer[] {
  if (d.kind === "accent-bar") {
    const vertical = d.side === "left" || d.side === "right";
    return [
      {
        image: `linear-gradient(${vertical ? "to bottom" : "to right"}, ${d.color}, ${d.color2})`,
        size: vertical ? `${d.thickness}px 100%` : `100% ${d.thickness}px`,
        position: d.side === "bottom" ? "left bottom" : d.side === "right" ? "right top" : "left top",
        repeat: "no-repeat",
      },
    ];
  }
  if (d.kind === "corners") {
    const line = `linear-gradient(${d.color}, ${d.color})`;
    return CORNER_POS.flatMap((position) => [
      { image: line, size: `${d.size}px ${d.thickness}px`, position, repeat: "no-repeat" },
      { image: line, size: `${d.thickness}px ${d.size}px`, position, repeat: "no-repeat" },
    ]);
  }
  if (d.kind === "image-pin") {
    if (d.url === "") return [];
    return [{ image: `url("${d.url}")`, size: `${d.width}px auto`, position: anchorPosition(d.anchor, d.offsetX, d.offsetY), repeat: "no-repeat" }];
  }
  if (d.kind === "halftone") {
    const c = rgba(d.color, d.opacity);
    return [{ image: `radial-gradient(circle, ${c} 28%, transparent 30%)`, size: `${d.size}px ${d.size}px`, position: "0 0", repeat: "repeat" }];
  }
  if (d.kind === "stripes") {
    const c = rgba(d.color, d.opacity);
    return [
      {
        image: `repeating-linear-gradient(${d.angle}deg, ${c} 0px, ${c} ${d.width}px, transparent ${d.width}px, transparent ${d.width + d.gap}px)`,
        size: "auto",
        position: "0 0",
        repeat: "repeat",
      },
    ];
  }
  if (d.kind === "scanlines") {
    const c = rgba(d.color, d.opacity);
    return [
      {
        image: `repeating-linear-gradient(0deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${d.gap}px)`,
        size: "auto",
        position: "0 0",
        repeat: "repeat",
      },
    ];
  }
  return [];
}

function boxShadows(s: Surface): string {
  const parts: string[] = [];
  if (s.shadow === "soft") parts.push(`0 2px 10px ${rgba(s.shadowColor, 35)}`);
  if (s.shadow === "hard") parts.push(`3px 3px 0 ${s.shadowColor}`);
  for (const d of s.decorations) {
    if (d.kind === "glow") parts.push(`0 0 ${d.blur}px ${d.spread}px ${rgba(d.color, d.opacity)}`);
  }
  return parts.length ? parts.join(", ") : "none";
}

interface BackgroundOpts {
  /** Ganti gambar fill (dipakai mode tier). */
  fillImageOverride?: string | null;
  /** Lapisan tambahan di atas fill, di bawah dekorasi (semburat peran). */
  tint?: string;
}

function backgroundDecls(s: Surface, o: BackgroundOpts = {}): Decl[] {
  const layers: Layer[] = s.decorations.flatMap(decorationLayers);
  if (o.tint) layers.push({ image: o.tint, size: "auto", position: "0 0", repeat: "no-repeat" });
  const fill = o.fillImageOverride !== undefined ? o.fillImageOverride : fillImage(s.fill);
  if (fill) layers.push({ image: fill, size: "auto", position: "0 0", repeat: "no-repeat" });
  if (layers.length === 0) return [["background", "transparent"]];
  return [
    ["background-color", "transparent"],
    ["background-image", layers.map((l) => l.image).join(", ")],
    ["background-size", layers.map((l) => l.size).join(", ")],
    ["background-position", layers.map((l) => l.position).join(", ")],
    ["background-repeat", layers.map((l) => l.repeat).join(", ")],
  ];
}

/**
 * Bentuk selain bulat dibuat dengan clip-path. Sudut dipotong lurus, jadi radius diabaikan. Efek yang
 * keluar dari kotak (glow dan hard shadow) ikut terpotong, itu sifat clip-path.
 */
export function shapeClip(s: Pick<Surface, "shape" | "cut">): string | null {
  const c = `${s.cut}px`;
  if (s.shape === "slant") return `polygon(${c} 0, 100% 0, calc(100% - ${c}) 100%, 0 100%)`;
  if (s.shape === "chamfer") {
    return `polygon(${c} 0, calc(100% - ${c}) 0, 100% ${c}, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, ${c} 100%, 0 calc(100% - ${c}), 0 ${c})`;
  }
  return null;
}

/**
 * Jarak antar bagian pesan tidak memakai column-gap, karena gap juga berlaku untuk item flex
 * anonim: YouTube menyisipkan karakter tak terlihat (U+200B) di antara elemen, dan tiap teks itu
 * menjadi item order 0 di depan baris. Sebagai gantinya setiap bagian yang tampil membawa
 * setengah celah di kiri dan kanan, dan padding bubble dikurangi sebesar itu.
 */
export const GAP_HALF = "0.225em";
export const flexInset = (decls: Decl[]): Decl[] =>
  decls.map(([p, v]): Decl => {
    const m = p === "padding" ? /^(\d+)px (\d+)px$/.exec(v) : null;
    return m ? [p, `${m[1]}px calc(${m[2]}px - ${GAP_HALF})`] : [p, v];
  });

/**
 * Skala otomatis: setiap panjang px di luar string dan url() (termasuk url @import) diubah ke vw terhadap lebar
 * acuan. Lebar Browser Source di OBS sama dengan lebar viewport, jadi seluruh chat (teks, avatar,
 * padding, radius, bayangan) ikut membesar atau mengecil dan pemenggalan barisnya tidak berubah.
 * Garis tipis (1 sampai 2px) tidak dibiarkan lebih kecil dari 1px supaya tidak hilang.
 */
export function scaleLengths(css: string, refWidth: number): string {
  return css.replace(
    /("(?:[^"\\]|\\.)*")|(url\([^)]*\))|(-?\d*\.?\d+)px\b/g,
    (m: string, str?: string, url?: string, num?: string) => {
      if (str || url || num === undefined) return m;
      const v = parseFloat(num);
      if (v === 0) return m;
      const vw = `${+((v / refWidth) * 100).toFixed(4)}vw`;
      return v >= 1 && v <= 2 ? `max(1px, ${vw})` : vw;
    },
  );
}

export function surfaceDecls(s: Surface, o: BackgroundOpts = {}): Decl[] {
  const clip = shapeClip(s);
  return [
    ...backgroundDecls(s, o),
    ["border", s.borderWidth > 0 ? `${s.borderWidth}px solid ${s.borderColor}` : "0"],
    ["border-radius", clip ? "0" : `${s.radius}px`],
    ...(clip ? ([["clip-path", clip]] as Decl[]) : []),
    ["padding", `${Math.max(2, Math.round(s.padding * 0.6))}px ${s.padding}px`],
    ["box-shadow", boxShadows(s)],
  ];
}

/** ::before untuk gradient border dan ::after untuk gambar. Keduanya di belakang teks. */
export function pseudoRules(selector: string, s: Surface): string[] {
  const out: string[] = [];
  const ring = s.decorations.find((d) => d.kind === "gradient-border");
  if (ring && ring.kind === "gradient-border") {
    out.push(
      rule(`${selector}::before`, [
        ["content", '""'],
        ["position", "absolute"],
        ["top", "0"],
        ["right", "0"],
        ["bottom", "0"],
        ["left", "0"],
        ["z-index", "-1"],
        ["pointer-events", "none"],
        ["border-radius", "inherit"],
        ["padding", `${ring.width}px`],
        ["background", `linear-gradient(${ring.angle}deg, ${rgba(ring.color, ring.opacity)}, ${rgba(ring.color2, ring.opacity)})`],
        ["-webkit-mask", "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)"],
        ["-webkit-mask-composite", "xor"],
        ["mask-composite", "exclude"],
      ]),
    );
  }
  const image = s.decorations.find((d) => d.kind === "image" && d.url !== "");
  if (image && image.kind === "image") {
    const size = image.fit === "tile" ? "auto" : image.fit;
    out.push(
      rule(`${selector}::after`, [
        ["content", '""'],
        ["position", "absolute"],
        ["top", "0"],
        ["right", "0"],
        ["bottom", "0"],
        ["left", "0"],
        ["z-index", "-1"],
        ["pointer-events", "none"],
        ["border-radius", "inherit"],
        ["background-image", `url("${image.url}")`],
        ["background-repeat", image.fit === "tile" ? "repeat" : "no-repeat"],
        ["background-position", image.position],
        ["background-size", size],
        ["opacity", String(Math.round(image.opacity) / 100)],
      ]),
    );
  }
  return out;
}

/* ---------- Bagian kecil ---------- */

function textShadow(d: Design): string | null {
  if (d.edge === "none") return null;
  const c = pickEdge(d.text.color);
  if (d.edge === "soft") return `0 1px 3px ${rgba(c, 70)}, 0 0 1px ${rgba(c, 50)}`;
  const px = 2;
  const dirs: Array<[number, number]> = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  return dirs.map(([x, y]) => `${x * px}px ${y * px}px 0 ${c}`).join(", ");
}

function avatarShape(shape: Design["avatar"]["shape"], size: number): { host: Decl[]; img: Decl[] } {
  if (shape === "circle") return { host: [["border-radius", "50%"]], img: [["border-radius", "50%"]] };
  if (shape === "rounded") {
    const r = `${Math.round(size * 0.28)}px`;
    return { host: [["border-radius", r]], img: [["border-radius", r]] };
  }
  if (shape === "hexagon") {
    return {
      host: [["border-radius", "0"]],
      img: [
        ["border-radius", "0"],
        ["clip-path", "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)"],
      ],
    };
  }
  return { host: [["border-radius", "0"]], img: [["border-radius", "0"]] };
}

function avatarRule(selector: string, d: Design, margin: string): string {
  const a = d.avatar;
  const ring = a.ringWidth > 0 && a.shape !== "hexagon" ? `0 0 0 ${a.ringWidth}px ${a.ringColor}` : "none";
  const shape = avatarShape(a.shape, a.size);
  // Bentuk foto dipotong pada gambarnya, bukan pada wadah, supaya bingkai gambar boleh keluar dari wadah.
  const parts = [
    rule(selector, [
      ["display", "block"],
      ["flex", "none"],
      ["position", "relative"],
      ["width", `${a.size}px`],
      ["height", `${a.size}px`],
      ["margin", margin],
      ["overflow", "visible"],
      ["box-shadow", ring],
      ...shape.host,
    ]),
    rule(`${selector} img`, [
      ["display", "block"],
      ["width", "100%"],
      ["height", "100%"],
      ["object-fit", "cover"],
      ...shape.img,
    ]),
  ];
  if (a.frame.url !== "") {
    parts.push(
      rule(`${selector}::after`, [
        ["content", '""'],
        ["position", "absolute"],
        ["top", "50%"],
        ["left", "50%"],
        ["width", `${a.frame.scale}%`],
        ["height", `${a.frame.scale}%`],
        ["transform", "translate(-50%, -50%)"],
        ["background", `url("${a.frame.url}") center / contain no-repeat`],
        ["pointer-events", "none"],
        ["z-index", "2"],
      ]),
    );
  }
  return parts.join("\n");
}

/**
 * Gambar tetap di panel chat. Dipasang lewat empat pseudo-element yang pasti tersedia: dua di belakang
 * pesan (renderer::before di atas latar panel, body::before di bawah semuanya) dan dua di depan
 * (renderer::after, body::after). Posisi fixed mengikuti ukuran Browser Source di OBS.
 */
const PANEL_SLOTS = {
  behind: [`${SEL.renderer}::before`, "body::before"],
  front: [`${SEL.renderer}::after`, "body::after"],
} as const;
const SLOT_Z = { [`${SEL.renderer}::before`]: "-1", "body::before": "-1", [`${SEL.renderer}::after`]: "9", "body::after": "2147483000" } as Record<string, string>;

function panelAnchor(a: Anchor, x: number, y: number): Decl[] {
  const out: Decl[] = [];
  const h = a.endsWith("left") ? "left" : a.endsWith("right") ? "right" : "center";
  const v = a.startsWith("top") ? "top" : a.startsWith("bottom") ? "bottom" : "middle";
  const transforms: string[] = [];
  if (h === "left") out.push(["left", `${x}px`]);
  else if (h === "right") out.push(["right", `${x}px`]);
  else {
    out.push(["left", `calc(50% + ${x}px)`]);
    transforms.push("translateX(-50%)");
  }
  if (v === "top") out.push(["top", `${y}px`]);
  else if (v === "bottom") out.push(["bottom", `${y}px`]);
  else {
    out.push(["top", `calc(50% + ${y}px)`]);
    transforms.push("translateY(-50%)");
  }
  if (transforms.length) out.push(["transform", transforms.join(" ")]);
  return out;
}

function panelImageRules(images: PanelImage[]): string[] {
  const out: string[] = [];
  const used: Record<"behind" | "front", number> = { behind: 0, front: 0 };
  let usesRenderer = false;
  for (const img of images) {
    if (img.url === "") continue;
    const slot = PANEL_SLOTS[img.layer][used[img.layer]];
    if (!slot) continue;
    used[img.layer] += 1;
    if (slot.startsWith(SEL.renderer)) usesRenderer = true;
    out.push(
      rule(slot, [
        ["content", '""'],
        ["position", "fixed"],
        ["z-index", SLOT_Z[slot]],
        ["pointer-events", "none"],
        ["width", `${img.width}px`],
        ["height", `${img.height}px`],
        ["background-image", `url("${img.url}")`],
        ["background-repeat", "no-repeat"],
        ["background-position", "center"],
        ["background-size", img.fit],
        ["opacity", String(img.opacity / 100)],
        ...panelAnchor(img.anchor, img.offsetX, img.offsetY),
      ]),
    );
  }
  if (usesRenderer) out.unshift(rule(SEL.renderer, [["position", "relative"], ["isolation", "isolate"]]));
  return out;
}

function rowDirection(d: Design): { direction: string; justify: string; alignItems: string } {
  const right = d.row.align === "right";
  const pos = d.row.avatarPosition;
  if (pos === "top") {
    return { direction: "column", justify: "flex-start", alignItems: right ? "flex-end" : "flex-start" };
  }
  if (pos === "right") {
    return { direction: "row-reverse", justify: right ? "flex-start" : "flex-end", alignItems: "flex-start" };
  }
  return { direction: "row", justify: right ? "flex-end" : "flex-start", alignItems: "flex-start" };
}

function avatarMargin(pos: Design["row"]["avatarPosition"]): string {
  if (pos === "right") return "0 0 0 8px";
  if (pos === "top") return "0 0 6px 0";
  return "0 8px 0 0";
}

const KEYFRAMES: Record<Exclude<Design["animation"]["style"], "none">, string> = {
  fade: "@keyframes lc-fade {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}",
  "slide-up":
    "@keyframes lc-slide-up {\n  from { opacity: 0; transform: translateY(14px); }\n  to { opacity: 1; transform: none; }\n}",
  "slide-left":
    "@keyframes lc-slide-left {\n  from { opacity: 0; transform: translateX(-26px); }\n  to { opacity: 1; transform: none; }\n}",
  "slide-right":
    "@keyframes lc-slide-right {\n  from { opacity: 0; transform: translateX(26px); }\n  to { opacity: 1; transform: none; }\n}",
  pop: "@keyframes lc-pop {\n  0% { opacity: 0; transform: scale(0.86); }\n  60% { opacity: 1; transform: scale(1.03); }\n  100% { opacity: 1; transform: none; }\n}",
  zoom: "@keyframes lc-zoom {\n  from { opacity: 0; transform: scale(0.6); }\n  to { opacity: 1; transform: none; }\n}",
  "blur-in":
    "@keyframes lc-blur-in {\n  from { opacity: 0; filter: blur(8px); transform: translateY(6px); }\n  to { opacity: 1; filter: blur(0); transform: none; }\n}",
};

const EASING_VALUE: Record<Design["animation"]["easing"], string> = {
  smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
  snappy: "cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  linear: "linear",
};

/* ---------- Kartu (Super Chat, Membership, Sticker) ---------- */

type CardKind = "superchat" | "membership" | "sticker";

function cardCss(kind: CardKind, root: string, c: Card, d: Design): string[] {
  const out: string[] = [];
  const s = c.surface;
  const tier = c.colorMode === "tier" && kind !== "membership";
  // Di mode tier YouTube memilih warna latar sesuai nominal (ada yang terang, ada yang gelap) dan
  // menyetel warna teks yang cocok. Menimpa warna teks di sini membuat tier terang tidak terbaca,
  // jadi semua warna teks dibiarkan milik YouTube.
  const own = (decls: Decl[]): Decl[] => (tier ? [] : decls);
  // Badan kartu Sticker memakai fill template, bukan warna tier. Jadi hanya teks di atas warna tier
  // (seluruh Super Chat, dan chip nominal Sticker) yang diserahkan ke YouTube.
  const ownText = (decls: Decl[]): Decl[] => (tier && kind === "superchat" ? [] : decls);
  const bodyFallback = s.fill.mode === "none" ? "#1B1F27" : s.fill.color;
  const headerFallback = c.headerFill.mode === "none" ? bodyFallback : c.headerFill.color;

  let bodyOverride: string | null | undefined;
  let headerBackground: Decl[];
  if (tier && kind === "superchat") {
    // Header memakai warna tier YouTube, badan memakai warna sekunder. Warna cadangan dari desain.
    const primary = `var(--yt-live-chat-paid-message-primary-color, ${headerFallback})`;
    const secondary = `var(--yt-live-chat-paid-message-secondary-color, ${bodyFallback})`;
    bodyOverride = `linear-gradient(${secondary}, ${secondary})`;
    headerBackground = [["background", `linear-gradient(${primary}, ${primary})`]];
  } else {
    bodyOverride = undefined;
    const img = fillImage(c.headerFill);
    headerBackground = img ? [["background", img]] : [["background", "transparent"]];
  }

  out.push(
    rule(root, [
      ["display", "block"],
      ["margin", "0"],
      ["padding", `${Math.round(d.row.gap / 2)}px 6px`],
      ["background", "transparent"],
      ["border", "0"],
      ...ownText([["color", c.textColor]]),
      ["font-family", FONTS[d.font].stack],
      ["font-size", `${d.fontSize}px`],
      ["line-height", "1.35"],
    ]),
  );

  const pad = `${Math.max(2, Math.round(s.padding * 0.6))}px ${s.padding}px`;
  out.push(
    rule(`${root} #card`, [
      ["position", "relative"],
      ["isolation", "isolate"],
      ["overflow", "hidden"],
      ["box-sizing", "border-box"],
      ["margin", "0"],
      ...surfaceDecls(s, { fillImageOverride: bodyOverride }).filter(([prop]) => prop !== "padding"),
      // Header dan isi kartu membawa padding sendiri. Sticker tidak punya keduanya, jadi kartunya yang berpadding.
      ["padding", kind === "sticker" ? pad : "0"],
    ]),
  );
  out.push(...pseudoRules(`${root} #card`, s));

  if (kind !== "sticker") {
    out.push(
      rule(`${root} #header`, [
        ...headerBackground,
        ["display", "flex"],
        ["align-items", "center"],
        ["padding", pad],
        ["border", "0"],
        ["border-radius", "0"],
        ...ownText([["color", c.textColor]]),
      ]),
    );
    out.push(
      rule(`${root} #content`, [
        ["background", "transparent"],
        ["padding", pad],
        ["overflow", "visible"],
        ...ownText([["color", c.textColor]]),
      ]),
    );
  }

  if (c.showAvatar) out.push(avatarRule(`${root} #author-photo`, d, "0 10px 0 0"));
  else out.push(rule(`${root} #author-photo`, [["display", "none"]]));

  out.push(
    rule([`${root} #author-name`, `${root} #author-name *`], [
      ...ownText([["color", c.nameColor]]),
      ["font-weight", "700"],
      ["background", "transparent"],
    ]),
  );

  if (kind === "superchat") {
    // Nama di atas nominal: jarak vertikal.
    out.push(rule(`${root} #header-content-primary-column`, [["display", "flex"], ["flex-direction", "column"], ["row-gap", `${c.amountGap}px`]]));
  }
  if (kind === "sticker") {
    // Nama dan chip nominal berdampingan, turun ke baris berikutnya kalau tidak muat.
    out.push(
      rule(`${root} #author-info`, [
        ["display", "flex"],
        ["flex-wrap", "wrap"],
        ["align-items", "center"],
        ["gap", `4px ${c.amountGap}px`],
      ]),
    );
  }
  if (kind !== "membership") {
    out.push(
      rule([`${root} #purchase-amount`, `${root} #purchase-amount *`], [
        ...own([["color", c.amountColor]]),
        ["font-size", `${c.amountSize}%`],
        ["font-weight", String(c.amountWeight)],
      ]),
    );
  }
  if (kind === "membership") {
    out.push(
      rule([`${root} #header-primary-text`, `${root} #header-subtext`, `${root} #header-primary-text *`, `${root} #header-subtext *`], [
        ["color", c.textColor],
      ]),
    );
  }
  if (kind === "sticker") {
    const chipBg =
      tier && c.headerFill.mode !== "none"
        ? `var(--yt-live-chat-paid-sticker-chip-background-color, ${headerFallback})`
        : (fillImage(c.headerFill) ?? "transparent");
    out.push(
      rule(`${root} #purchase-amount-chip`, [
        ["background", chipBg],
        ...own([["color", c.amountColor]]),
        ["border-radius", "999px"],
        ["padding", "0.1em 0.7em"],
      ]),
    );
    const size = (d.sticker as { size: number }).size;
    out.push(
      rule([`${root} #sticker`, `${root} #sticker img`], [
        ["width", `${size}px`],
        ["height", `${size}px`],
      ]),
    );
  }
  out.push(
    rule([`${root} #message`, `${root} #message *`], [
      ...ownText([["color", c.textColor]]),
      ["font-size", `${d.text.size}%`],
    ]),
  );
  if (!(tier && kind === "superchat")) out.push(rule(`${root} #timestamp`, [["color", rgba(c.textColor, 60)]]));
  out.push(rule(`${root} #menu`, [["display", "none"]]));
  return out;
}

/* ---------- Generator utama ---------- */

export function generateCss(d: Design): string {
  const out: string[] = [];
  const font = FONTS[d.font];
  const imp = fontImport(d.font);
  const M = SEL.text;

  out.push("/* lazycustom: tempel di OBS, Browser Source, kolom Custom CSS */");
  // @import harus jadi aturan pertama di stylesheet.
  if (imp) out.push(imp);

  out.push(
    "/* Panel */\n" +
      rule("body", [
        ["overflow", "hidden"],
        ["background-color", "rgba(0, 0, 0, 0)"],
      ]) +
      "\n" +
      rule(SEL.renderer, [["background", d.panel.opacity > 0 ? rgba(d.panel.color, d.panel.opacity) : "transparent"]]),
  );

  const hidden: string[] = [];
  if (d.hideChrome) hidden.push(SEL.header, SEL.input, SEL.inputPanel);
  if (d.hideTicker) hidden.push(SEL.ticker);
  hidden.push(`${M} #menu`);
  out.push("/* Elemen yang disembunyikan */\n" + rule(hidden, [["display", "none"]]));

  const panelImages = panelImageRules(d.panelImages);
  if (panelImages.length) out.push("/* Gambar panel */\n" + panelImages.join("\n"));

  // Baris pesan
  const dir = rowDirection(d);
  const rowDecls: Decl[] = [
    ["display", "flex"],
    ["flex-direction", dir.direction],
    ["justify-content", dir.justify],
    ["align-items", dir.alignItems],
    ["padding", `${Math.round(d.row.gap / 2)}px 6px`],
    ["background", "transparent"],
    ["border", "0"],
    ["color", d.text.color],
    ["font-family", font.stack],
    ["font-size", `${d.fontSize}px`],
    ["font-weight", String(d.text.weight)],
    ["line-height", String(d.text.lineHeight / 100)],
  ];
  const shadow = textShadow(d);
  if (shadow) rowDecls.push(["text-shadow", shadow]);
  const rowSelectors = [
    M,
    `${M}[is-highlighted]`,
    `${M}[author-type="owner"]`,
    `${M}[author-type="moderator"]`,
    `${M}[author-type="member"]`,
  ];
  out.push("/* Baris pesan */\n" + rule(rowSelectors, rowDecls));

  // Avatar
  if (d.avatar.show) {
    out.push("/* Avatar */\n" + avatarRule(`${M} #author-photo`, d, avatarMargin(d.row.avatarPosition)));
  } else {
    out.push("/* Avatar */\n" + rule(`${M} #author-photo`, [["display", "none"]]));
  }

  // Bubble
  const b = d.bubble;
  const contentBase: Decl[] = [
    ["display", "flex"],
    ["flex-direction", "row"],
    ["flex-wrap", "wrap"],
    ["align-items", "baseline"],
    ["justify-content", d.row.align === "right" ? "flex-end" : "flex-start"],
    ["column-gap", "0"],
    ["row-gap", "0.1em"],
    ["min-width", "0"],
    ["max-width", `${d.row.maxWidth}%`],
    ["box-sizing", "border-box"],
    ["overflow-wrap", "anywhere"],
    ["overflow", "visible"],
    ["margin", "0"],
    ["position", "relative"],
    ["isolation", "isolate"],
    ["text-align", d.row.align === "right" ? "right" : "left"],
  ];
  const visibleSurface: Surface = b.show
    ? b
    : {
        ...b,
        fill: { ...b.fill, mode: "none" },
        borderWidth: 0,
        padding: 4,
        radius: 0,
        shadow: "none",
        decorations: [],
      };
  const flexRow = d.message.layout === "inline" || d.message.layout === "stacked";
  const hm = flexRow ? `0 ${GAP_HALF}` : "0";
  const contentDecls: Decl[] = b.show
    ? [...contentBase, ...(flexRow ? flexInset(surfaceDecls(visibleSurface)) : surfaceDecls(visibleSurface))]
    : [
        ...contentBase,
        ["background", "transparent"],
        ["border", "0"],
        ["padding", "0"],
        ["box-shadow", "none"],
      ];
  out.push("/* Bubble */\n" + rule(`${M} #content`, contentDecls));
  if (b.show) out.push(...pseudoRules(`${M} #content`, b));

  if (b.show && b.roleTint) {
    const roles: Array<["member" | "moderator" | "owner", string]> = [
      ["member", d.nameStyle.colors.member],
      ["moderator", d.nameStyle.colors.moderator],
      ["owner", d.nameStyle.colors.owner],
    ];
    out.push(
      "/* Bubble menurut peran */\n" +
        roles
          .map(([role, color]) => {
            const tint = rgba(color, 24);
            return rule(
              `${M}[author-type="${role}"] #content`,
              backgroundDecls(b, { tint: `linear-gradient(${tint}, ${tint})` }),
            );
          })
          .join("\n"),
    );
  }

  // Bagian pesan: urutan lewat CSS order, chip dibuka dengan display: contents
  const idx = (p: Design["message"]["order"][number]) => String(d.message.order.indexOf(p));
  const stacked = d.message.layout === "stacked";
  out.push(
    "/* Urutan bagian pesan */\n" +
      rule(`${M} ${SEL.chip}`, [["display", "contents"]]) +
      "\n" +
      (d.timestamp.show
        ? rule(`${M} #timestamp`, [
            ["order", idx("timestamp")],
            ["display", "block"],
            ["color", rgba(d.text.color, d.timestamp.opacity)],
            ["font-size", `${d.timestamp.size}%`],
            ["font-weight", "400"],
            ["margin", hm],
          ])
        : rule(`${M} #timestamp`, [["display", "none"]])),
  );

  const n = d.nameStyle;
  out.push(
    "/* Nama pengirim */\n" +
      // Badge prepend (sebelum nama) harus mengikuti urutan nama, bukan tertinggal di order 0.
      rule(`${M} #prepend-chat-badges`, [["display", "contents"]]) +
      "\n" +
      rule(`${M} #prepend-chat-badges > *`, [["order", idx("name")], ["margin", hm]]) +
      "\n" +
      // Span kosong milik YouTube tetap jadi item flex dan menambah column-gap, jadi disembunyikan saat kosong.
      rule([`${M} #deleted-state:empty`, `${M} #show-original:empty`], [["display", "none"]]) +
      "\n" +
      rule(`${M} #author-name`, [
        ["order", idx("name")],
        ["color", n.colors.viewer],
        ["font-size", `${n.size}%`],
        ["font-weight", String(n.weight)],
        ["text-transform", n.uppercase ? "uppercase" : "none"],
        ["letter-spacing", `${n.spacing * 0.5}px`],
        ["background", "transparent"],
        ["padding", "0"],
        ["margin", hm],
        ["border-radius", "0"],
      ]) +
      "\n" +
      (["member", "moderator", "owner"] as const)
        .map((role) =>
          rule(
            [`${M}[author-type="${role}"] #author-name`, `${M} #author-name.${role}`, `${M} #author-name[type="${role}"]`],
            [["color", n.colors[role]]],
          ),
        )
        .join("\n"),
  );

  out.push(
    "/* Lencana */\n" +
      (d.badges.show
        ? rule(`${M} #chat-badges`, [
            ["order", idx("badges")],
            ["display", "inline-flex"],
            ["align-self", "center"],
            ["margin", hm],
          ]) +
          "\n" +
          // Kosong berarti tidak ada lencana: jangan sisakan item yang membawa margin.
          rule(`${M} #chat-badges:empty`, [["display", "none"]]) +
          "\n" +
          // Tombol Top Fan (#1) adalah elemen sendiri di luar chip, tepat setelahnya di DOM asli.
          rule(`${M} #before-content-buttons`, [["display", "contents"]]) +
          "\n" +
          rule(`${M} #before-content-buttons > *`, [
            ["order", idx("badges")],
            ["align-self", "center"],
            ["margin", hm],
          ]) +
          "\n" +
          rule(`${M} ${SEL.badge}`, [["vertical-align", "middle"]])
        : rule([`${M} #chat-badges`, `${M} #before-content-buttons`, `${M} ${SEL.badge}`], [["display", "none"]])),
  );

  out.push(
    "/* Isi pesan */\n" +
      // Di DOM asli #message dibungkus #message-container, dan pembungkus itulah anak #content.
      // Urutan dan lebar harus dipasang di pembungkus; #message sendiri hanya urusan teks.
      rule([`${M} #message-container`, `${M} #hover-message`], [
        ["order", idx("message")],
        // Basis auto: lebar bubble dan keputusan turun baris sama-sama memakai lebar isi yang sebenarnya.
        // Basis tetap (8em) membuat pesan pendek turun baris padahal bubble sudah selebar satu baris.
        ["flex", stacked ? "1 1 100%" : "1 1 auto"],
        ["min-width", "0"],
        ["margin", hm],
      ]) +
      "\n" +
      rule(`${M} #message`, [
        ["color", d.text.color],
        ["font-size", `${d.text.size}%`],
        ["font-weight", String(d.text.weight)],
        ["margin", "0"],
      ]) +
      "\n" +
      rule(`${M} #message img.emoji`, [
        ["width", "1.4em"],
        ["height", "1.4em"],
        ["vertical-align", "text-bottom"],
      ]),
  );

  // Kartu
  out.push("/* Super Chat */\n" + cardCss("superchat", SEL.paid, d.superChat, d).join("\n"));
  out.push("/* Membership */\n" + cardCss("membership", SEL.member, d.membership, d).join("\n"));
  out.push("/* Sticker */\n" + cardCss("sticker", SEL.sticker, d.sticker, d).join("\n"));

  // Animasi pesan masuk
  if (d.animation.style !== "none") {
    const name = `lc-${d.animation.style}`;
    out.push(
      "/* Animasi pesan masuk */\n" +
        rule([M, SEL.paid, SEL.member, SEL.sticker], [
          ["animation", `${name} ${d.animation.duration}ms ${EASING_VALUE[d.animation.easing]} both`],
          ["transform-origin", "left bottom"],
        ]) +
        "\n" +
        KEYFRAMES[d.animation.style],
    );
  }

  out.push(...fxCss(d, { rule, surfaceDecls, pseudoRules, SEL, flexInset, GAP_HALF }));

  const css = out.join("\n\n") + "\n";
  return d.row.autoScale ? scaleLengths(css, d.row.refWidth) : css;
}

/** Untuk tampilan di kotak kode: data URI gambar unggahan disingkat. Tombol salin tetap memakai CSS utuh. */
export function shortenForDisplay(css: string): { text: string; shortened: number } {
  let shortened = 0;
  const text = css.replace(/url\("data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)"\)/g, (_m, type: string, data: string) => {
    shortened += 1;
    return `url("data:image/${type};base64,... ${Math.max(1, Math.round((data.length * 0.75) / 1024))} KB disingkat ...")`;
  });
  return { text, shortened };
}
