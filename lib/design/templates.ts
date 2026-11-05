import {
  DEFAULT_AFFIXES,
  DEFAULT_ELEMENTS,
  DEFAULT_FREE,
  DEFAULT_GRID,
  DEFAULT_ROLE_BUBBLES,
  type Card,
  type Decoration,
  type Design,
  type Effect,
  type ElementAnim,
  type Fill,
  type Label,
  type Surface,
  type TemplateId,
} from "./model";

/** Konstruktor kecil supaya definisi template tetap ringkas dan seragam. */
const solid = (color: string, opacity = 100): Fill => ({ mode: "solid", color, color2: color, angle: 135, opacity });
const grad = (color: string, color2: string, opacity = 100, angle = 135): Fill => ({
  mode: "gradient",
  color,
  color2,
  angle,
  opacity,
});
const noFill = (): Fill => ({ mode: "none", color: "#000000", color2: "#000000", angle: 135, opacity: 100 });

const glow = (id: string, color: string, blur: number, spread: number, opacity: number): Decoration => ({
  id,
  kind: "glow",
  color,
  blur,
  spread,
  opacity,
});
const ring = (id: string, color: string, color2: string, width = 1, angle = 135, opacity = 100): Decoration => ({
  id,
  kind: "gradient-border",
  width,
  color,
  color2,
  angle,
  opacity,
});
const bar = (id: string, side: "left" | "right" | "top" | "bottom", color: string, thickness = 3): Decoration => ({
  id,
  kind: "accent-bar",
  side,
  thickness,
  color,
  color2: color,
});
const corners = (id: string, color: string, size = 10, thickness = 2): Decoration => ({
  id,
  kind: "corners",
  size,
  thickness,
  color,
});
const scan = (id: string, color: string, gap = 4, opacity = 10): Decoration => ({
  id,
  kind: "scanlines",
  gap,
  opacity,
  color,
});

const halftone = (id: string, color: string, size = 8, opacity = 14): Decoration => ({ id, kind: "halftone", color, size, opacity });
const stripes = (id: string, color: string, width = 6, gap = 10, angle = 45, opacity = 12): Decoration => ({
  id,
  kind: "stripes",
  color,
  width,
  gap,
  angle,
  opacity,
});
const effect = (kind: Effect["kind"], speed: number, intensity: number): Effect => ({ id: `fx-${kind}`, kind, speed, intensity });
const anim = (style: ElementAnim["style"], duration = 320, delay = 0): ElementAnim => ({ style, duration, delay });
const tag = (id: string, text: string, roles: Label["roles"], color: string, bgColor: string, o: Partial<Label> = {}): Label => ({
  id,
  text,
  roles,
  position: "start",
  color,
  bgColor,
  bgOpacity: 100,
  size: 75,
  weight: 700,
  uppercase: true,
  spacing: 1,
  radius: 2,
  padX: 6,
  ...o,
});

const surface = (o: Partial<Surface> = {}): Surface => ({
  fill: solid("#1B1F27", 90),
  radius: 14,
  padding: 10,
  borderWidth: 0,
  borderColor: "#7DD3FC",
  shadow: "none",
  shadowColor: "#000000",
  decorations: [],
  shape: "round",
  cut: 12,
  ...o,
});

interface CardOpts {
  mode: "tier" | "custom";
  header: Fill;
  memberHeader: Fill;
  name: string;
  amount: string;
  text: string;
}

/** Kartu Super Chat, Membership, dan Sticker diturunkan dari bubble supaya tampil sekeluarga. */
function cards(bubble: Surface, o: CardOpts): Pick<Design, "superChat" | "membership" | "sticker"> {
  const cardSurface: Surface = {
    ...bubble,
    fill: bubble.fill.mode === "none" ? solid("#1B1F27", 90) : bubble.fill,
    padding: Math.max(bubble.padding, 10),
    decorations: bubble.decorations.map((d) => ({ ...d })),
  };
  const base = (header: Fill, mode: "tier" | "custom"): Card => ({
    surface: cardSurface,
    headerFill: header,
    colorMode: mode,
    nameColor: o.name,
    amountColor: o.amount,
    textColor: o.text,
    amountSize: 115,
    amountWeight: 700,
    amountGap: 8,
    showAvatar: true,
  });
  return {
    superChat: base(o.header, o.mode),
    membership: base(o.memberHeader, "custom"),
    sticker: { ...base(o.header, o.mode), size: 96 },
  };
}

const DEFAULT_ORDER: Design["message"]["order"] = ["timestamp", "name", "badges", "message"];

const PLAIN_BUBBLE = surface({ fill: noFill() });

const BASE: Design = {
  v: 2,
  name: "Plain",
  templateId: "plain",
  font: "system",
  fontSize: 20,
  panel: { color: "#0F1115", opacity: 0 },
  hideChrome: true,
  hideTicker: true,
  edge: "soft",
  animation: { style: "slide-up", duration: 360, easing: "smooth" },
  row: { gap: 8, align: "left", maxWidth: 100, autoScale: true, refWidth: 400, avatarPosition: "left" },
  message: { layout: "inline", order: DEFAULT_ORDER, grid: DEFAULT_GRID, free: DEFAULT_FREE },
  elements: DEFAULT_ELEMENTS,
  effects: [],
  labels: [],
  affixes: DEFAULT_AFFIXES,
  roleBubbles: DEFAULT_ROLE_BUBBLES,
  bubble: { ...PLAIN_BUBBLE, show: false, roleTint: false },
  avatar: { show: true, size: 32, shape: "circle", ringWidth: 0, ringColor: "#7DD3FC", frame: { url: "", scale: 130 } },
  panelImages: [],
  nameStyle: {
    size: 100,
    weight: 700,
    uppercase: false,
    spacing: 0,
    colors: { viewer: "#D5D9E2", member: "#7BE5AE", moderator: "#8CC2FF", owner: "#FFD65A" },
  },
  text: { color: "#F4F5F8", weight: 500, size: 100, lineHeight: 135 },
  timestamp: { show: false, opacity: 60, size: 75 },
  badges: { show: true },
  ...cards(PLAIN_BUBBLE, {
    mode: "tier",
    header: solid("#2A3441"),
    memberHeader: grad("#0F7B62", "#0B5A4A"),
    name: "#F4F5F8",
    amount: "#FFFFFF",
    text: "#F4F5F8",
  }),
};

type Patch = Partial<{
  [K in keyof Design]: Design[K] extends object ? Partial<Design[K]> : Design[K];
}>;

function make(id: TemplateId, name: string, patch: Patch): Design {
  const merged: Design = { ...BASE, ...(patch as Partial<Design>) };
  for (const key of ["panel", "animation", "row", "message", "avatar", "nameStyle", "text", "timestamp", "badges"] as const) {
    const p = patch[key];
    if (p) (merged as Record<string, unknown>)[key] = { ...BASE[key], ...p };
  }
  merged.name = name;
  merged.templateId = id;
  return merged;
}

/* ---------- Template: dirombak untuk Lazycustom Livechat ----------
 * Setiap template punya satu ide yang jelas (palet, bentuk, satu dekorasi khas) supaya terasa beda satu sama lain.
 * Kontras teks dijaga oleh tests/contrast.test.ts: teks pesan minimal 4.5:1, nama minimal 3:1 di bubble pekat.
 */

/** Kaca malam: gradasi biru tinta ke ungu, ring iris cyan ke pink, cahaya pink tipis. Template bawaan. */
function crystal(): Design {
  const bubble = surface({
    fill: grad("#1E2440", "#2A1B3D", 86, 135),
    radius: 18,
    padding: 12,
    decorations: [ring("crystal-ring", "#8FE9FF", "#FF9AD5", 1, 120, 90), glow("crystal-glow", "#FF8FC8", 18, 0, 22)],
  });
  return make("crystal", "Crystal", {
    font: "dm-sans",
    edge: "none",
    animation: { style: "slide-up", duration: 360, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: true },
    nameStyle: { ...BASE.nameStyle, colors: { viewer: "#BFD8FF", member: "#86F2C8", moderator: "#9DB8FF", owner: "#FFD37A" } },
    text: { ...BASE.text, color: "#F6F3FF" },
    avatar: { ...BASE.avatar, ringWidth: 2, ringColor: "#FF9AD5" },
    ...cards(bubble, {
      mode: "tier",
      header: grad("#3B3F7A", "#5A2C66"),
      memberHeader: grad("#11685A", "#0D4F46"),
      name: "#F6F3FF",
      amount: "#FFFFFF",
      text: "#F6F3FF",
    }),
  });
}

/** Es pagi: putih kebiruan, ring gradasi langit ke mint, bayangan lembut. Terang tapi tetap terbaca di atas game gelap. */
function frost(): Design {
  const bubble = surface({
    fill: solid("#F2F8FF", 96),
    radius: 16,
    padding: 11,
    shadow: "soft",
    shadowColor: "#0E2A44",
    decorations: [ring("frost-ring", "#7CC8FF", "#7DEBC3", 2, 135, 100)],
  });
  return make("frost", "Frost", {
    font: "nunito",
    edge: "none",
    animation: { style: "fade", duration: 320, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#2D5C86", member: "#0B7A57", moderator: "#3A4FC4", owner: "#A15C00" },
    },
    text: { ...BASE.text, color: "#102130", weight: 600 },
    ...cards(bubble, {
      mode: "custom",
      header: grad("#D8EEFF", "#D7F7EC", 100, 90),
      memberHeader: solid("#D4F3E6"),
      name: "#102130",
      amount: "#0A4F84",
      text: "#102130",
    }),
  });
}

/** Grafit dan lime: panel teknis gelap, siku lime di sudut, garis scan halus. */
function grid(): Design {
  const lime = "#C6FF3D";
  const bubble = surface({
    fill: solid("#15171B", 92),
    radius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: "#30343C",
    decorations: [scan("grid-scan", lime, 4, 6), corners("grid-corners", lime, 10, 2)],
  });
  return make("grid", "Grid", {
    font: "rajdhani",
    fontSize: 22,
    edge: "none",
    animation: { style: "slide-left", duration: 280, easing: "snappy" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#C9D1DB", member: lime, moderator: "#7DB9FF", owner: "#FFC94D" },
    },
    text: { ...BASE.text, color: "#EEF2F5", weight: 600 },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#23272E"),
      memberHeader: solid("#24331A"),
      name: "#EEF2F5",
      amount: lime,
      text: "#EEF2F5",
    }),
  });
}

/** HUD amber: kaca tipis, strip amber di kiri, nama di atas pesan, huruf mono. */
function hud(): Design {
  const amber = "#FFB547";
  const bubble = surface({
    fill: grad("#14110C", "#14110C", 62, 90),
    radius: 0,
    padding: 10,
    decorations: [bar("hud-bar", "left", amber, 3)],
  });
  return make("hud", "HUD", {
    font: "jetbrains-mono",
    fontSize: 18,
    edge: "soft",
    animation: { style: "fade", duration: 260, easing: "smooth" },
    message: { layout: "stacked", order: ["name", "badges", "timestamp", "message"] },
    // Nama sendirian di baris atas, jadi avatar dikecilkan supaya sejajar dengan baris nama saja.
    avatar: { ...BASE.avatar, size: 24, shape: "square" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: { ...BASE.nameStyle, size: 90, colors: { viewer: amber, member: "#8EF0B8", moderator: "#8CC2FF", owner: "#FFE08A" } },
    text: { ...BASE.text, color: "#F3ECE0" },
    timestamp: { show: true, opacity: 55, size: 80 },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#2A2116"),
      memberHeader: solid("#163024"),
      name: "#F3ECE0",
      amount: amber,
      text: "#F3ECE0",
    }),
  });
}

/** Terminal matcha: layar hijau tua, teks fosfor lembut, garis scan, timestamp tampil. */
function terminal(): Design {
  const bubble = surface({
    fill: solid("#0B140F", 94),
    radius: 6,
    padding: 9,
    borderWidth: 1,
    borderColor: "#2E6A47",
    decorations: [scan("term-scan", "#7DFFAF", 3, 7)],
  });
  return make("terminal", "Terminal", {
    font: "jetbrains-mono",
    fontSize: 17,
    edge: "none",
    animation: { style: "fade", duration: 220, easing: "linear" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: { ...BASE.nameStyle, colors: { viewer: "#7DFFAF", member: "#E8FF8A", moderator: "#8CD9FF", owner: "#FFC9A3" } },
    text: { ...BASE.text, color: "#D6F7E1" },
    timestamp: { show: true, opacity: 55, size: 80 },
    avatar: { ...BASE.avatar, shape: "rounded", size: 26 },
    affixes: { name: { prefix: "", suffix: "" }, message: { prefix: "> ", suffix: "" } },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#12261A"),
      memberHeader: solid("#1C2C10"),
      name: "#D6F7E1",
      amount: "#7DFFAF",
      text: "#D6F7E1",
    }),
  });
}

/** Editorial: kertas putih gading, tinta hitam, garis merah tipis di atas, byline (timestamp) tampil. Tenang dengan sengaja. */
function holo(): Design {
  const bubble = surface({
    fill: solid("#FBF8F1", 98),
    radius: 2,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E1A15",
    decorations: [bar("broadsheet-rule", "top", "#D7263D", 3), halftone("broadsheet-half", "#1E1A15", 6, 4)],
  });
  return make("holo", "Broadsheet", {
    font: "fraunces",
    edge: "none",
    animation: { style: "fade", duration: 260, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 700,
      colors: { viewer: "#1E1A15", member: "#1F6B46", moderator: "#23408F", owner: "#B01E33" },
    },
    text: { ...BASE.text, color: "#1E1A15", weight: 500, lineHeight: 145 },
    avatar: { ...BASE.avatar, shape: "square", ringWidth: 1, ringColor: "#1E1A15" },
    timestamp: { show: true, opacity: 60, size: 75 },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#EFE8D8"),
      memberHeader: solid("#DDEEDF"),
      name: "#1E1A15",
      amount: "#B01E33",
      text: "#1E1A15",
    }),
  });
}

/** Susu stroberi: gradasi pink lembut, ring putih tebal, avatar berdetak pelan. */
function pulse(): Design {
  const bubble = surface({
    fill: grad("#FFD9E8", "#FFC6DA", 98, 160),
    radius: 26,
    padding: 13,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    decorations: [glow("bloom-glow", "#FF7AB0", 16, 0, 30), halftone("bloom-dots", "#FFFFFF", 7, 14)],
  });
  return make("pulse", "Bloom", {
    font: "baloo-2",
    edge: "none",
    animation: { style: "pop", duration: 420, easing: "bounce" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#B0175A", member: "#0B6B4F", moderator: "#2D49A8", owner: "#8A4B00" },
    },
    text: { ...BASE.text, color: "#4A1530", weight: 600 },
    avatar: { ...BASE.avatar, ringWidth: 3, ringColor: "#FFFFFF" },
    effects: [effect("pulse", 4, 3)],
    ...cards(bubble, {
      mode: "custom",
      header: solid("#FFE4EF"),
      memberHeader: solid("#D9F6EA"),
      name: "#4A1530",
      amount: "#4A1530",
      text: "#4A1530",
    }),
  });
}

/** Zine malam: kertas arang, garis risograf pink dan teal, sudut chamfer, huruf mesin tik. */
function liteGlass(): Design {
  const bubble = surface({
    fill: solid("#1D1A22", 95),
    radius: 2,
    padding: 11,
    borderWidth: 1,
    borderColor: "#5B5266",
    shape: "chamfer",
    cut: 10,
    decorations: [stripes("gazette-riso", "#FF6FA8", 2, 14, 120, 10), corners("gazette-stamp", "#4FD1C5", 8, 1)],
  });
  return make("lite-glass", "Gazette", {
    font: "special-elite",
    edge: "none",
    animation: { style: "fade", duration: 280, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      uppercase: true,
      spacing: 1,
      weight: 700,
      colors: { viewer: "#FF9CC4", member: "#7FE6D9", moderator: "#A9C2FF", owner: "#FFD98A" },
    },
    text: { ...BASE.text, color: "#F3EEF6", weight: 400 },
    avatar: { ...BASE.avatar, shape: "square", ringWidth: 1, ringColor: "#5B5266" },
    timestamp: { show: true, opacity: 50, size: 75 },
    effects: [effect("flicker", 2, 1)],
    ...cards(bubble, {
      mode: "custom",
      header: solid("#2B2631"),
      memberHeader: solid("#1C2F2E"),
      name: "#F3EEF6",
      amount: "#FFD98A",
      text: "#F3EEF6",
    }),
  });
}

/** Stiker VTuber: putih bersih, border pink tebal, bayangan keras mint, titik halus. Dipakai juga di halaman utama. */
function stickerPop(): Design {
  const bubble = surface({
    fill: solid("#FFFFFF", 100),
    radius: 18,
    padding: 10,
    borderWidth: 3,
    borderColor: "#FF8CC6",
    shadow: "hard",
    shadowColor: "#9EE8D0",
    decorations: [halftone("sticker-dots", "#FFD1E8", 6, 10)],
  });
  return make("sticker-pop", "Sticker", {
    font: "baloo-2",
    edge: "none",
    animation: { style: "pop", duration: 380, easing: "bounce" },
    row: { ...BASE.row, gap: 12 },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#C2347A", member: "#0E8F5E", moderator: "#2A62C9", owner: "#B86A0A" },
    },
    text: { ...BASE.text, color: "#2B2230", weight: 600 },
    avatar: { ...BASE.avatar, ringWidth: 2, ringColor: "#FF8CC6" },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#FFE1F0"),
      memberHeader: solid("#DFFBEF"),
      name: "#2B2230",
      amount: "#2B2230",
      text: "#2B2230",
    }),
  });
}

/** Mimpi lavender: susu lavender, ring pink ke lilac, dua cahaya lembut, mengambang pelan. */
function aurora(): Design {
  const bubble = surface({
    fill: solid("#FAF5FF", 96),
    radius: 22,
    padding: 13,
    decorations: [
      ring("dreamy-ring", "#FFB8DC", "#B9A6FF", 2, 135, 90),
      glow("dreamy-glow-a", "#FF9ECF", 20, 0, 28),
      glow("dreamy-glow-b", "#B9A6FF", 26, 0, 24),
    ],
  });
  return make("aurora", "Dreamy", {
    font: "fredoka",
    edge: "soft",
    animation: { style: "blur-in", duration: 420, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#B32F78", member: "#2F7F5E", moderator: "#4F63C2", owner: "#8A5A10" },
    },
    text: { ...BASE.text, color: "#36264A", weight: 500 },
    avatar: { ...BASE.avatar, ringWidth: 2, ringColor: "#FFB8DC" },
    effects: [effect("float", 3, 2)],
    ...cards(bubble, {
      mode: "custom",
      header: grad("#FFE1F0", "#ECE3FF", 100),
      memberHeader: solid("#DFF6EC"),
      name: "#36264A",
      amount: "#36264A",
      text: "#36264A",
    }),
  });
}

/* ---------- Template bergaya: brutalism, game, dan futuristik dengan efek ---------- */

/** Brutalism lilac: kotak tegas, garis hitam tebal, bayangan keras, strip lime, teks super tebal. */
function brutal(): Design {
  const bubble = surface({
    fill: solid("#CDB8FF", 100),
    radius: 0,
    padding: 10,
    borderWidth: 4,
    borderColor: "#0A0A0A",
    shadow: "hard",
    shadowColor: "#0A0A0A",
    decorations: [bar("brutal-bar", "left", "#B8FF2E", 8)],
  });
  return make("brutal", "Brutal", {
    font: "archivo-black",
    fontSize: 19,
    edge: "none",
    animation: { style: "pop", duration: 320, easing: "bounce" },
    row: { ...BASE.row, gap: 14 },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 400,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#0A0A0A", member: "#0B5C33", moderator: "#1236B8", owner: "#9E0028" },
    },
    text: { ...BASE.text, color: "#0A0A0A", weight: 400 },
    avatar: { ...BASE.avatar, shape: "square", size: 34, ringWidth: 3, ringColor: "#0A0A0A" },
    elements: { ...DEFAULT_ELEMENTS, name: anim("wipe", 260), message: anim("rise", 300, 80) },
    effects: [effect("shake", 6, 6)],
    labels: [tag("label-member", "MEMBER", "member", "#B8FF2E", "#0A0A0A", { radius: 0 })],
    ...cards(bubble, {
      mode: "custom",
      header: solid("#B8FF2E"),
      memberHeader: solid("#FF9ED1"),
      name: "#0A0A0A",
      amount: "#0A0A0A",
      text: "#0A0A0A",
    }),
  });
}

/** Gaya menu game aksi: merah, hitam, putih, potongan miring, halftone, tipografi padat. */
function phantom(): Design {
  const bubble = surface({
    fill: solid("#0B0B0D", 96),
    radius: 0,
    padding: 12,
    shape: "slant",
    cut: 16,
    decorations: [ring("phantom-ring", "#FFFFFF", "#E60012", 2, 135, 95), halftone("phantom-dots", "#E60012", 7, 22)],
  });
  const owner = surface({
    fill: solid("#E60012", 100),
    radius: 0,
    padding: 12,
    shape: "slant",
    cut: 18,
    decorations: [ring("phantom-owner-ring", "#FFFFFF", "#0B0B0D", 2, 135, 95), halftone("phantom-owner-dots", "#0B0B0D", 7, 26)],
  });
  return make("phantom", "Phantom", {
    font: "anton",
    fontSize: 21,
    edge: "none",
    animation: { style: "slide-left", duration: 260, easing: "snappy" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 400,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#FFFFFF", member: "#FF5A6A", moderator: "#7FD1FF", owner: "#FFD84A" },
    },
    text: { ...BASE.text, color: "#FFFFFF", weight: 400, lineHeight: 125 },
    avatar: { ...BASE.avatar, shape: "hexagon", size: 36 },
    elements: { ...DEFAULT_ELEMENTS, name: anim("pan", 220, 60), message: anim("wipe", 300, 140) },
    effects: [effect("glitch", 6, 5), effect("shake", 5, 5)],
    labels: [tag("label-member", "MEMBER", "member", "#FFFFFF", "#E60012", { radius: 0 })],
    roleBubbles: { member: null, verified: null, moderator: null, owner: { surface: owner, textColor: "#FFFFFF" } },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#E60012"),
      memberHeader: solid("#2A2A30"),
      name: "#FFFFFF",
      amount: "#FFFFFF",
      text: "#FFFFFF",
    }),
  });
}

/** Kotak dialog RPG senja: gradasi ungu malam, bingkai emas, nama di atas pesan (grid), teks menyapu masuk. */
function quest(): Design {
  const bubble = surface({
    fill: grad("#2C1C72", "#100A3A", 96, 180),
    radius: 6,
    padding: 9,
    borderWidth: 3,
    borderColor: "#FFE7A3",
    decorations: [ring("quest-ring", "#FFD36B", "#FFF4D1", 2, 180, 90), glow("quest-glow", "#8C6BFF", 12, 0, 30)],
  });
  return make("quest", "Quest", {
    font: "press-start-2p",
    fontSize: 14,
    edge: "none",
    animation: { style: "fade", duration: 240, easing: "linear" },
    message: {
      ...BASE.message,
      layout: "grid",
      grid: {
        columns: [1],
        rows: 2,
        gap: 5,
        cells: {
          name: { col: 1, row: 1, colSpan: 1, rowSpan: 1, alignX: "start", alignY: "center" },
          badges: { col: 1, row: 1, colSpan: 1, rowSpan: 1, alignX: "end", alignY: "center" },
          timestamp: { col: 1, row: 1, colSpan: 1, rowSpan: 1, alignX: "end", alignY: "center" },
          message: { col: 1, row: 2, colSpan: 1, rowSpan: 1, alignX: "stretch", alignY: "start" },
          label1: { col: 1, row: 1, colSpan: 1, rowSpan: 1, alignX: "end", alignY: "center" },
          label2: { col: 1, row: 1, colSpan: 1, rowSpan: 1, alignX: "end", alignY: "center" },
        },
      },
    },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 400,
      size: 90,
      colors: { viewer: "#FFD36B", member: "#8CFFB0", moderator: "#9CD3FF", owner: "#FFA3C2" },
    },
    text: { ...BASE.text, color: "#FFFFFF", weight: 400, lineHeight: 135, size: 92 },
    avatar: { ...BASE.avatar, shape: "square", size: 36, ringWidth: 3, ringColor: "#FFE7A3" },
    elements: { ...DEFAULT_ELEMENTS, name: anim("pop", 220), message: anim("wipe", 420, 60) },
    labels: [
      tag("label-member", "MEMBER", "member", "#100A3A", "#8CFFB0", { radius: 2, size: 62, spacing: 0 }),
      tag("label-mod", "MOD", "moderator", "#100A3A", "#9CD3FF", { radius: 2, size: 62, spacing: 0 }),
    ],
    ...cards(bubble, {
      mode: "custom",
      header: solid("#3B26A0"),
      memberHeader: solid("#0F5A3A"),
      name: "#FFFFFF",
      amount: "#FFD36B",
      text: "#FFFFFF",
    }),
  });
}

/** Esports volt: HUD gelap, sudut chamfer, aksen pink panas, bubble berbeda untuk moderator dan owner. */
function arena(): Design {
  const hot = "#FF3D7F";
  const bubble = surface({
    fill: solid("#0D1016", 93),
    radius: 0,
    padding: 10,
    shape: "chamfer",
    cut: 10,
    decorations: [bar("arena-bar", "left", hot, 5), stripes("arena-stripes", hot, 6, 12, 45, 8), corners("arena-corners", hot, 8, 2)],
  });
  const mod = surface({ ...bubble, decorations: [bar("arena-mod-bar", "left", "#4DA3FF", 5), stripes("arena-mod-stripes", "#4DA3FF", 6, 12, 45, 8)] });
  const owner = surface({
    ...bubble,
    fill: grad("#3A0F23", "#0D1016", 94, 90),
    decorations: [bar("arena-own-bar", "left", "#FFC23D", 5), corners("arena-own-corners", "#FFC23D", 9, 2)],
  });
  return make("arena", "Arena", {
    font: "chakra-petch",
    fontSize: 20,
    edge: "none",
    animation: { style: "slide-left", duration: 240, easing: "snappy" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 700,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#B4C0CC", member: "#3DF5C5", moderator: "#4DA3FF", owner: "#FFC23D" },
    },
    text: { ...BASE.text, color: "#EEF2F7", weight: 500 },
    avatar: { ...BASE.avatar, shape: "hexagon", size: 36 },
    elements: { ...DEFAULT_ELEMENTS, name: anim("pan", 220), message: anim("fade", 260, 80) },
    effects: [effect("glow-pulse", 3, 3), effect("flicker", 3, 3)],
    labels: [
      tag("label-mod", "MOD", "moderator", "#04121F", "#4DA3FF", { radius: 0 }),
      tag("label-host", "HOST", "owner", "#1A0F00", "#FFC23D", { radius: 0 }),
    ],
    roleBubbles: { member: null, verified: null, moderator: { surface: mod, textColor: null }, owner: { surface: owner, textColor: null } },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#1C202A"),
      memberHeader: solid("#0E3A33"),
      name: "#EEF2F7",
      amount: hot,
      text: "#EEF2F7",
    }),
  });
}

/** Neon asam: gelap ungu, ring lime ke violet yang berkilau, nama bergetar glitch, cahaya berdenyut. */
function cyber(): Design {
  const bubble = surface({
    fill: grad("#0E0B1F", "#1C0B33", 92, 135),
    radius: 6,
    padding: 10,
    decorations: [
      ring("cyber-ring", "#B6FF3B", "#9B6BFF", 2, 135, 95),
      glow("cyber-glow", "#9B6BFF", 16, 0, 35),
      scan("cyber-scan", "#B6FF3B", 3, 6),
      corners("cyber-corners", "#B6FF3B", 9, 2),
    ],
  });
  return make("cyber", "Cyber", {
    font: "orbitron",
    fontSize: 17,
    edge: "none",
    animation: { style: "blur-in", duration: 380, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: true },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 600,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#C9B6FF", member: "#B6FF3B", moderator: "#7FD8FF", owner: "#FFE066" },
    },
    text: { ...BASE.text, color: "#F1ECFF", weight: 500 },
    avatar: { ...BASE.avatar, shape: "hexagon", size: 34 },
    elements: { ...DEFAULT_ELEMENTS, name: anim("wipe", 300), message: anim("blur", 350, 100) },
    effects: [effect("shimmer", 5, 5), effect("glitch", 5, 6), effect("glow-pulse", 4, 3)],
    labels: [tag("label-member", "MEMBER", "member", "#0E0B1F", "#B6FF3B", { radius: 2 })],
    ...cards(bubble, {
      mode: "tier",
      header: grad("#2A1B5C", "#3D0F5C"),
      memberHeader: grad("#2F5C10", "#1D420B"),
      name: "#F1ECFF",
      amount: "#FFFFFF",
      text: "#F1ECFF",
    }),
  });
}

/** Tanpa bubble: font sistem (tanpa unduhan), teks bersih bertepi lembut supaya terbaca di atas game apa pun. */
function plain(): Design {
  return make("plain", "Plain", {
    edge: "soft",
    nameStyle: { ...BASE.nameStyle, colors: { viewer: "#FFB3D6", member: "#8BF5C4", moderator: "#9CC4FF", owner: "#FFD86B" } },
    text: { ...BASE.text, color: "#FFFFFF", weight: 600 },
  });
}

export interface Template {
  id: Exclude<TemplateId, "custom">;
  name: string;
  tagline: string;
  design: Design;
}

export const TEMPLATES: Template[] = [
  { id: "crystal", name: "Crystal", tagline: "Kaca malam: gradasi biru tinta ke ungu, ring iris cyan ke pink", design: crystal() },
  { id: "aurora", name: "Dreamy", tagline: "VTuber pastel: susu lavender, ring pink ke lilac, mengambang", design: aurora() },
  { id: "sticker-pop", name: "Sticker", tagline: "VTuber pop: stiker putih, border pink tebal, bayangan mint", design: stickerPop() },
  { id: "pulse", name: "Bloom", tagline: "Susu stroberi: gradasi pink lembut, ring putih, avatar berdetak", design: pulse() },
  { id: "frost", name: "Frost", tagline: "Es pagi: putih kebiruan, ring langit ke mint", design: frost() },
  { id: "holo", name: "Broadsheet", tagline: "Editorial: kertas gading, tinta hitam, garis merah, byline tampil", design: holo() },
  { id: "lite-glass", name: "Gazette", tagline: "Zine malam: arang, garis risograf pink dan teal, mesin tik", design: liteGlass() },
  { id: "grid", name: "Grid", tagline: "Grafit dan lime: siku di sudut, garis scan halus", design: grid() },
  { id: "hud", name: "HUD", tagline: "Amber mono: strip di kiri, nama di atas pesan", design: hud() },
  { id: "terminal", name: "Terminal", tagline: "Terminal matcha: fosfor hijau, prompt di depan pesan", design: terminal() },
  { id: "cyber", name: "Cyber", tagline: "Neon asam: ring lime ke violet berkilau, nama glitch", design: cyber() },
  { id: "phantom", name: "Phantom", tagline: "Game aksi: merah, hitam, potongan miring, owner merah", design: phantom() },
  { id: "quest", name: "Quest", tagline: "Dialog RPG senja: ungu malam, bingkai emas, teks menyapu", design: quest() },
  { id: "arena", name: "Arena", tagline: "Esports pink panas: chamfer, bubble beda untuk mod dan owner", design: arena() },
  { id: "brutal", name: "Brutal", tagline: "Brutalism lilac: garis hitam tebal, strip lime, bayangan keras", design: brutal() },
  { id: "plain", name: "Plain", tagline: "Tanpa bubble: teks bersih bertepi lembut", design: plain() },
];

export const DEFAULT_TEMPLATE_ID = "crystal" as const;

export function templateById(id: TemplateId): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** Salinan dalam supaya template asli tidak pernah berubah saat desain diedit. */
export function designFromTemplate(id: TemplateId, name?: string): Design {
  const t = templateById(id);
  const copy = JSON.parse(JSON.stringify(t.design)) as Design;
  if (name) copy.name = name;
  return copy;
}

export const DEFAULT_DESIGN: Design = designFromTemplate(DEFAULT_TEMPLATE_ID);
