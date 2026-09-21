import { rgba } from "../color";
import type { Decl } from "./css";
import {
  ROLE_IDS,
  type Design,
  type Effect,
  type ElementAnimStyle,
  type ElementId,
  type GridCell,
  type GridPart,
  type Surface,
} from "./model";

/**
 * CSS untuk fitur "tools" ala Canva: animasi per elemen, efek berulang, teks buatan user,
 * kerangka bubble (grid dan bebas), dan bubble khusus per peran.
 *
 * Modul ini sengaja dipisah dari css.ts. Bagian-bagiannya ditambahkan di AKHIR stylesheet dan
 * mengandalkan aturan yang sama-sama memakai !important dengan spesifisitas setara, jadi yang
 * belakangan menang. Fungsi bantu dari css.ts dioper lewat parameter supaya tidak ada impor melingkar.
 */
export interface FxHelpers {
  rule: (selectors: string | string[], decls: Decl[]) => string;
  surfaceDecls: (s: Surface) => Decl[];
  pseudoRules: (selector: string, s: Surface) => string[];
  SEL: { text: string; paid: string; member: string; sticker: string; chip: string };
  flexInset: (decls: Decl[]) => Decl[];
  GAP_HALF: string;
}

/**
 * Teks user ditulis ke CSS sebagai escape heksadesimal untuk semua karakter selain huruf dan angka
 * ASCII. Dengan begitu tanda kutip, garis miring terbalik, atau karakter aneh apa pun tidak mungkin
 * keluar dari string CSS.
 */
export function cssString(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const alnum = (cp >= 48 && cp <= 57) || (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122);
    out += alnum ? ch : `\\${cp.toString(16)} `;
  }
  return `"${out}"`;
}

const EASING = {
  smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
  snappy: "cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  linear: "linear",
} as const;

/* ---------- Animasi masuk per elemen ---------- */

const EL_KEYFRAMES: Record<Exclude<ElementAnimStyle, "none">, string> = {
  fade: "@keyframes lc-el-fade {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}",
  rise: "@keyframes lc-el-rise {\n  from { opacity: 0; transform: translateY(10px); }\n  to { opacity: 1; transform: none; }\n}",
  drop: "@keyframes lc-el-drop {\n  from { opacity: 0; transform: translateY(-10px); }\n  to { opacity: 1; transform: none; }\n}",
  pan: "@keyframes lc-el-pan {\n  from { opacity: 0; transform: translateX(-16px); }\n  to { opacity: 1; transform: none; }\n}",
  wipe: "@keyframes lc-el-wipe {\n  from { clip-path: inset(0 100% 0 0); }\n  to { clip-path: inset(0 0 0 0); }\n}",
  pop: "@keyframes lc-el-pop {\n  0% { opacity: 0; transform: scale(0.6); }\n  70% { opacity: 1; transform: scale(1.12); }\n  100% { opacity: 1; transform: none; }\n}",
  blur: "@keyframes lc-el-blur {\n  from { opacity: 0; filter: blur(6px); }\n  to { opacity: 1; filter: blur(0); }\n}",
};

function elementSelector(id: ElementId, M: string): string {
  return { avatar: `${M} #author-photo`, name: `${M} #author-name`, badges: `${M} #chat-badges`, timestamp: `${M} #timestamp`, message: `${M} #message-container` }[id];
}

/* ---------- Efek ---------- */

/** Detik untuk satu putaran efek. Kecepatan 1 paling lambat, 10 paling cepat. */
const seconds = (speed: number) => (3.4 - speed * 0.27).toFixed(2);
const px = (n: number) => `${Number(n.toFixed(1))}px`;

interface FxFrames {
  name: string;
  css: string;
}

/** Keyframes untuk satu efek. Nama unik per posisi di daftar supaya beberapa efek sejenis tidak bentrok. */
function effectFrames(e: Effect, n: number): FxFrames {
  const name = `lc-fx-${e.kind}-${n}`;
  const i = e.intensity;
  switch (e.kind) {
    case "float":
      return { name, css: `@keyframes ${name} {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-${px(i * 0.8 + 1)}); }\n}` };
    case "pulse":
      return { name, css: `@keyframes ${name} {\n  0%, 100% { transform: scale(1); }\n  50% { transform: scale(${(1 + i * 0.02).toFixed(2)}); }\n}` };
    case "shimmer":
      return { name, css: `@keyframes ${name} {\n  0% { background-position: 0% 50%; }\n  100% { background-position: 100% 50%; }\n}` };
    case "glow-pulse":
      return {
        name,
        css: `@keyframes ${name} {\n  0%, 100% { filter: brightness(1) saturate(1); }\n  50% { filter: brightness(${(1 + i * 0.06).toFixed(2)}) saturate(${(1 + i * 0.05).toFixed(2)}); }\n}`,
      };
    case "flicker":
      return {
        name,
        css: `@keyframes ${name} {\n  0%, 18%, 22%, 25%, 53%, 57%, 100% { opacity: 1; }\n  20%, 24%, 55% { opacity: 0.35; }\n}`,
      };
    case "glitch": {
      const o = px(1 + i * 0.35);
      return {
        name,
        css:
          `@keyframes ${name} {\n` +
          `  0%, 88%, 100% { transform: none; text-shadow: none; }\n` +
          `  90% { transform: translate(-${o}, 0) skewX(-8deg); text-shadow: ${o} 0 #ff2bd6, -${o} 0 #22d3ee; }\n` +
          `  92% { transform: translate(${o}, 0); text-shadow: -${o} 0 #ff2bd6, ${o} 0 #22d3ee; }\n` +
          `  94% { transform: translate(0, ${o}) skewX(6deg); text-shadow: ${o} 0 #22d3ee, -${o} 0 #ff2bd6; }\n` +
          `  96% { transform: none; text-shadow: none; }\n}`,
      };
    }
    case "shake": {
      const a = px(2 + i * 0.9);
      const b = px((2 + i * 0.9) * 0.6);
      const c = px((2 + i * 0.9) * 0.3);
      return {
        name,
        css:
          `@keyframes ${name} {\n  0%, 100% { transform: translateX(0); }\n` +
          `  15% { transform: translateX(-${a}); }\n  30% { transform: translateX(${a}); }\n` +
          `  45% { transform: translateX(-${b}); }\n  60% { transform: translateX(${b}); }\n` +
          `  75% { transform: translateX(-${c}); }\n  90% { transform: translateX(${c}); }\n}`,
      };
    }
    case "spin":
      return { name, css: `@keyframes ${name} {\n  from { transform: rotate(0deg); }\n  to { transform: rotate(360deg); }\n}` };
    case "drift":
      return { name, css: `@keyframes ${name} {\n  from { background-position: 0% 0%; }\n  to { background-position: 100% 100%; }\n}` };
  }
}

function hasRing(s: Surface): boolean {
  return s.decorations.some((d) => d.kind === "gradient-border");
}
function hasFillImage(s: Surface): boolean {
  return s.decorations.some((d) => d.kind === "image" && d.url !== "");
}

/* ---------- Grid dan bebas ---------- */

type PartSlot = { part: GridPart; selector: string };

function partSelectors(M: string, chip: string): PartSlot[] {
  return [
    { part: "timestamp", selector: `${M} #timestamp` },
    { part: "name", selector: `${M} #author-name` },
    { part: "badges", selector: `${M} #chat-badges, ${M} #before-content-buttons > *` },
    { part: "message", selector: `${M} #message-container` },
    // Label memakai pseudo-element chip yang berisi display: contents, jadi ikut menjadi item #content.
    { part: "label1", selector: `${M} ${chip}::before` },
    { part: "label2", selector: `${M} ${chip}::after` },
  ];
}

function clampCell(c: GridCell, columns: number, rows: number): { col: number; row: number; colSpan: number; rowSpan: number } {
  const col = Math.min(c.col, columns);
  const row = Math.min(c.row, rows);
  return { col, row, colSpan: Math.min(c.colSpan, columns - col + 1), rowSpan: Math.min(c.rowSpan, rows - row + 1) };
}

/** Selector label per peran: "viewer" berarti pesan tanpa atribut author-type. */
function roleScope(M: string, roles: Design["labels"][number]["roles"]): string {
  if (roles === "all") return M;
  if (roles === "viewer") return `${M}:not([author-type])`;
  return `${M}[author-type="${roles}"]`;
}

/* ---------- Generator ---------- */

export function fxCss(d: Design, h: FxHelpers): string[] {
  const { rule, SEL } = h;
  const M = SEL.text;
  const out: string[] = [];

  /* Bubble khusus per peran */
  const roleParts: string[] = [];
  for (const role of ROLE_IDS) {
    const o = d.roleBubbles[role];
    if (!o) continue;
    const sel = `${M}[author-type="${role}"] #content`;
    let decls = h.surfaceDecls(o.surface);
    // Di mode bebas koordinat dihitung dari tepi bubble, jadi padding tidak boleh berubah per peran.
    if (d.message.layout === "free") decls = decls.filter(([p]) => p !== "padding");
    else if (d.message.layout === "inline" || d.message.layout === "stacked") decls = h.flexInset(decls);
    roleParts.push(rule(sel, decls));
    roleParts.push(...h.pseudoRules(sel, o.surface));
    // Gambar dan ring milik bubble utama tidak ikut ke peran yang tidak memilikinya.
    if (hasRing(d.bubble) && !hasRing(o.surface)) roleParts.push(rule(`${sel}::before`, [["display", "none"]]));
    if (hasFillImage(d.bubble) && !hasFillImage(o.surface)) roleParts.push(rule(`${sel}::after`, [["display", "none"]]));
    if (o.textColor) roleParts.push(rule(`${M}[author-type="${role}"] #message`, [["color", o.textColor]]));
  }
  if (roleParts.length) out.push("/* Bubble per peran */\n" + roleParts.join("\n"));

  /* Kerangka bubble */
  const layout = d.message.layout;
  const slots = partSelectors(M, SEL.chip);
  if (layout === "grid") {
    const g = d.message.grid;
    const cols = g.columns.length;
    const parts: string[] = [
      rule(`${M} #content`, [
        ["display", "grid"],
        ["grid-template-columns", g.columns.map((c) => `minmax(0, ${c}fr)`).join(" ")],
        ["grid-template-rows", `repeat(${g.rows}, auto)`],
        ["column-gap", `${g.gap}px`],
        ["row-gap", `${g.gap}px`],
        ["align-items", "center"],
        ["justify-content", "stretch"],
      ]),
    ];
    for (const { part, selector } of slots) {
      const cell = g.cells[part];
      const c = clampCell(cell, cols, g.rows);
      parts.push(
        rule(selector, [
          ["grid-column", `${c.col} / span ${c.colSpan}`],
          ["grid-row", `${c.row} / span ${c.rowSpan}`],
          ["justify-self", cell.alignX],
          ["align-self", cell.alignY],
          ["order", "0"],
          ["min-width", "0"],
          ...(part === "message" ? ([["flex", "none"]] as Decl[]) : []),
        ]),
      );
    }
    out.push("/* Kerangka grid */\n" + parts.join("\n"));
  } else if (layout === "free") {
    const f = d.message.free;
    const parts: string[] = [
      rule(`${M} #content`, [
        ["display", "block"],
        ["position", "relative"],
        ["width", `${f.width}px`],
        ["max-width", "100%"],
        ["height", `${f.height}px`],
        ["padding", "0"],
        ["overflow", "hidden"],
      ]),
    ];
    for (const { part, selector } of slots) {
      const p = f.parts[part];
      const decls: Decl[] = [
        ["position", "absolute"],
        ["left", `${p.x}px`],
        ["top", `${p.y}px`],
        ["margin", "0"],
        ["order", "0"],
      ];
      if (part === "message") {
        const m = f.parts.message;
        decls.push(
          ["width", m.w > 0 ? `${m.w}px` : `calc(100% - ${Math.max(0, m.x) + 8}px)`],
          ["max-width", `calc(100% - ${Math.max(0, m.x)}px)`],
          ["overflow", "hidden"],
          ["display", "-webkit-box"],
          ["-webkit-box-orient", "vertical"],
          ["-webkit-line-clamp", String(m.lines)],
          ["flex", "none"],
        );
      } else {
        decls.push(["white-space", "nowrap"]);
      }
      parts.push(rule(selector, decls));
    }
    out.push("/* Kerangka bebas */\n" + parts.join("\n"));
  }

  /* Label dan awalan atau akhiran teks */
  const textParts: string[] = [];
  d.labels.forEach((l, idx) => {
    if (l.text === "") return;
    const pseudo = idx === 0 ? "::before" : "::after";
    const selector = `${roleScope(M, l.roles)} ${SEL.chip}${pseudo}`;
    const decls: Decl[] = [
      ["content", cssString(l.text)],
      ["display", "inline-block"],
      ["color", l.color],
      ["background", l.bgOpacity > 0 ? rgba(l.bgColor, l.bgOpacity) : "transparent"],
      ["padding", `0.1em ${l.padX}px`],
      ["border-radius", `${l.radius}px`],
      ["font-size", `${l.size}%`],
      ["font-weight", String(l.weight)],
      ["text-transform", l.uppercase ? "uppercase" : "none"],
      ["letter-spacing", `${l.spacing * 0.5}px`],
      ["line-height", "1.3"],
      ["white-space", "nowrap"],
      ["margin", layout === "inline" || layout === "stacked" ? `0 ${h.GAP_HALF}` : "0"],
    ];
    if (layout === "inline" || layout === "stacked") decls.push(["order", l.position === "start" ? "-1" : "9"]);
    textParts.push(rule(selector, decls));
  });
  const affix = (selector: string, prefix: string, suffix: string) => {
    if (prefix !== "") textParts.push(rule(`${selector}::before`, [["content", cssString(prefix)], ["white-space", "pre"]]));
    if (suffix !== "") textParts.push(rule(`${selector}::after`, [["content", cssString(suffix)], ["white-space", "pre"]]));
  };
  affix(`${M} #author-name`, d.affixes.name.prefix, d.affixes.name.suffix);
  affix(`${M} #message`, d.affixes.message.prefix, d.affixes.message.suffix);
  if (textParts.length) out.push("/* Teks buatan sendiri */\n" + textParts.join("\n"));

  /* Animasi per elemen dan efek, digabung per selector supaya satu properti animation memuat semuanya */
  const anims = new Map<string, string[]>();
  const extra = new Map<string, Decl[]>();
  const frames: string[] = [];
  const usedEl = new Set<Exclude<ElementAnimStyle, "none">>();
  const push = (selector: string, entry: string) => anims.set(selector, [...(anims.get(selector) ?? []), entry]);

  (Object.keys(d.elements) as ElementId[]).forEach((id) => {
    const a = d.elements[id];
    if (a.style === "none") return;
    usedEl.add(a.style);
    push(elementSelector(id, M), `lc-el-${a.style} ${a.duration}ms ${EASING[d.animation.easing]} ${a.delay}ms backwards`);
  });
  for (const style of usedEl) frames.push(EL_KEYFRAMES[style]);

  const bubbleTargets = [`${M} #content`, `${SEL.paid} #card`, `${SEL.member} #card`, `${SEL.sticker} #card`];
  const ringTargets: string[] = [];
  if (d.bubble.show && hasRing(d.bubble)) ringTargets.push(`${M} #content::before`);
  if (hasRing(d.superChat.surface)) ringTargets.push(`${SEL.paid} #card::before`);
  if (hasRing(d.membership.surface)) ringTargets.push(`${SEL.member} #card::before`);
  if (hasRing(d.sticker.surface)) ringTargets.push(`${SEL.sticker} #card::before`);

  d.effects.forEach((e, n) => {
    const f = effectFrames(e, n);
    const s = seconds(e.speed);
    let added = false;
    const add = (selector: string, timing: string) => {
      push(selector, `${f.name} ${timing}`);
      added = true;
    };
    switch (e.kind) {
      case "float":
        bubbleTargets.forEach((t) => add(t, `${s}s ease-in-out infinite`));
        break;
      case "glow-pulse":
        bubbleTargets.forEach((t) => add(t, `${s}s ease-in-out infinite`));
        break;
      case "shake": {
        const dur = (0.9 - e.speed * 0.06).toFixed(2);
        bubbleTargets.forEach((t) => add(t, `${dur}s ease ${d.animation.duration}ms 1 backwards`));
        break;
      }
      case "pulse":
        add(`${M} #author-photo`, `${s}s ease-in-out infinite`);
        break;
      case "shimmer":
        ringTargets.forEach((t) => {
          add(t, `${(Number(s) * 2).toFixed(2)}s ease-in-out infinite alternate`);
          extra.set(t, [...(extra.get(t) ?? []), ["background-size", "260% 260%"]]);
        });
        break;
      case "flicker": {
        const t = `${M} #author-name`;
        add(t, `${(Number(s) * 1.5).toFixed(2)}s linear infinite`);
        extra.set(t, [...(extra.get(t) ?? []), ["text-shadow", `0 0 ${2 + e.intensity}px currentColor, 0 0 ${5 + e.intensity * 2}px currentColor`]]);
        break;
      }
      case "glitch":
        add(`${M} #author-name`, `${(Number(s) * 2).toFixed(2)}s linear infinite`);
        break;
      case "spin":
        if (d.avatar.frame.url !== "") add(`${M} #author-photo::after`, `${(Number(s) * 3).toFixed(2)}s linear infinite`);
        break;
      case "drift":
        if (d.bubble.show && hasFillImage(d.bubble)) add(`${M} #content::after`, `${(Number(s) * 4).toFixed(2)}s ease-in-out infinite alternate`);
        break;
    }
    if (added) frames.push(f.css);
  });

  if (anims.size) {
    const rules: string[] = [];
    for (const [selector, entries] of anims) {
      rules.push(rule(selector, [["animation", entries.join(", ")], ...(extra.get(selector) ?? [])]));
    }
    out.push("/* Animasi elemen dan efek */\n" + rules.join("\n") + "\n" + frames.join("\n"));
  }
  return out;
}
