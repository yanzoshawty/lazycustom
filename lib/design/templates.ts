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
  row: { gap: 8, align: "left", maxWidth: 100, avatarPosition: "left" },
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

const NAMES = {
  cool: { viewer: "#CFE8F7", member: "#8FF0D0", moderator: "#8CC8FF", owner: "#FFE29A" },
  tech: { viewer: "#9FB6C6", member: "#6FF0C8", moderator: "#7DB9FF", owner: "#FFD97A" },
};

function crystal(): Design {
  const bubble = surface({
    fill: grad("#22364A", "#18222E", 84, 135),
    radius: 16,
    padding: 12,
    decorations: [ring("crystal-ring", "#A9E6FF", "#EAF7FF", 1, 135, 90), glow("crystal-glow", "#7DD3FC", 18, 0, 30)],
  });
  return make("crystal", "Crystal", {
    font: "exo-2",
    edge: "none",
    animation: { style: "slide-up", duration: 380, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: true },
    nameStyle: { ...BASE.nameStyle, colors: NAMES.cool },
    text: { ...BASE.text, color: "#F1F8FD" },
    ...cards(bubble, {
      mode: "tier",
      header: grad("#2C6E96", "#1E4E6E"),
      memberHeader: grad("#0F7B62", "#0B5A4A"),
      name: "#F1F8FD",
      amount: "#FFFFFF",
      text: "#F1F8FD",
    }),
  });
}

function frost(): Design {
  const bubble = surface({
    fill: solid("#F3F9FD", 94),
    radius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: "#BFE4F7",
    shadow: "soft",
    shadowColor: "#0B2A3D",
    decorations: [bar("frost-bar", "left", "#5CC6F5", 3)],
  });
  return make("frost", "Frost", {
    font: "dm-sans",
    edge: "none",
    animation: { style: "fade", duration: 320, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#3B5568", member: "#0B7A57", moderator: "#1462B8", owner: "#9A5A00" },
    },
    text: { ...BASE.text, color: "#13212B" },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#DCEFFA"),
      memberHeader: solid("#D4F3E6"),
      name: "#13212B",
      amount: "#0A5C8F",
      text: "#13212B",
    }),
  });
}

function grid(): Design {
  const bubble = surface({
    fill: solid("#12161C", 90),
    radius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2B3947",
    decorations: [scan("grid-scan", "#7DD3FC", 4, 8), corners("grid-corners", "#7DD3FC", 10, 2)],
  });
  return make("grid", "Grid", {
    font: "rajdhani",
    fontSize: 22,
    edge: "none",
    animation: { style: "slide-left", duration: 300, easing: "snappy" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: { ...BASE.nameStyle, uppercase: true, spacing: 1, colors: NAMES.tech },
    text: { ...BASE.text, color: "#E6F3FA", weight: 600 },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#1B2733"),
      memberHeader: solid("#123B33"),
      name: "#E6F3FA",
      amount: "#7DD3FC",
      text: "#E6F3FA",
    }),
  });
}

function hud(): Design {
  const bubble = surface({
    fill: solid("#0F151C", 55),
    radius: 0,
    padding: 10,
    decorations: [bar("hud-bar", "left", "#7DD3FC", 3)],
  });
  return make("hud", "HUD", {
    font: "jetbrains-mono",
    fontSize: 18,
    edge: "none",
    animation: { style: "fade", duration: 280, easing: "smooth" },
    message: { layout: "stacked", order: ["name", "badges", "timestamp", "message"] },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: { ...BASE.nameStyle, size: 90, colors: { ...NAMES.tech, viewer: "#8FB2C8" } },
    text: { ...BASE.text, color: "#DCEBF5" },
    timestamp: { show: true, opacity: 55, size: 80 },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#16212B"),
      memberHeader: solid("#123B33"),
      name: "#DCEBF5",
      amount: "#7DD3FC",
      text: "#DCEBF5",
    }),
  });
}

function terminal(): Design {
  const bubble = surface({
    fill: solid("#0A0E11", 92),
    radius: 2,
    padding: 8,
    borderWidth: 1,
    borderColor: "#2A6D85",
    decorations: [scan("term-scan", "#7DD3FC", 3, 10)],
  });
  return make("terminal", "Terminal", {
    font: "jetbrains-mono",
    fontSize: 17,
    edge: "none",
    animation: { style: "fade", duration: 240, easing: "linear" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: { ...BASE.nameStyle, colors: { ...NAMES.tech, viewer: "#7FC7DD" } },
    text: { ...BASE.text, color: "#B8F2FF" },
    timestamp: { show: true, opacity: 55, size: 80 },
    avatar: { ...BASE.avatar, shape: "square", size: 26 },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#10222B"),
      memberHeader: solid("#0E2F29"),
      name: "#B8F2FF",
      amount: "#7DD3FC",
      text: "#B8F2FF",
    }),
  });
}

function holo(): Design {
  const bubble = surface({
    fill: grad("#1C2A3B", "#2A2244", 86, 120),
    radius: 18,
    padding: 12,
    decorations: [ring("holo-ring", "#7DD3FC", "#C6B4FF", 2, 120, 95), glow("holo-glow", "#9FB4FF", 20, 0, 28)],
  });
  return make("holo", "Holo", {
    font: "chakra-petch",
    edge: "none",
    animation: { style: "zoom", duration: 360, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#D0D6FF", member: "#8FF0D0", moderator: "#9CC8FF", owner: "#FFE29A" },
    },
    text: { ...BASE.text, color: "#F3F1FF" },
    avatar: { ...BASE.avatar, shape: "hexagon" },
    ...cards(bubble, {
      mode: "tier",
      header: grad("#2C5B85", "#41397A"),
      memberHeader: grad("#0F7B62", "#0B5A4A"),
      name: "#F3F1FF",
      amount: "#FFFFFF",
      text: "#F3F1FF",
    }),
  });
}

function pulse(): Design {
  const bubble = surface({
    fill: solid("#6FCBFA", 97),
    radius: 26,
    padding: 12,
    decorations: [glow("pulse-glow", "#7DD3FC", 22, 2, 45)],
  });
  return make("pulse", "Pulse", {
    font: "exo-2",
    edge: "none",
    animation: { style: "pop", duration: 420, easing: "bounce" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#0B3A55", member: "#0A5B45", moderator: "#0B3E86", owner: "#7A4A00" },
    },
    text: { ...BASE.text, color: "#06202E", weight: 600 },
    avatar: { ...BASE.avatar, ringWidth: 2, ringColor: "#EAF7FF" },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#4FB6E8"),
      memberHeader: solid("#7BE5C4"),
      name: "#06202E",
      amount: "#06202E",
      text: "#06202E",
    }),
  });
}

function liteGlass(): Design {
  const bubble = surface({
    fill: solid("#FFFFFF", 12),
    radius: 14,
    padding: 11,
    decorations: [ring("lite-ring", "#FFFFFF", "#7DD3FC", 1, 135, 55)],
  });
  return make("lite-glass", "Lite Glass", {
    font: "dm-sans",
    edge: "soft",
    animation: { style: "fade", duration: 300, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#DDEBF5", member: "#8FF0D0", moderator: "#9CD0FF", owner: "#FFE29A" },
    },
    text: { ...BASE.text, color: "#FFFFFF" },
    ...cards(bubble, {
      mode: "tier",
      header: grad("#2C6E96", "#1E4E6E", 80),
      memberHeader: grad("#0F7B62", "#0B5A4A", 80),
      name: "#FFFFFF",
      amount: "#FFFFFF",
      text: "#FFFFFF",
    }),
  });
}

function stickerPop(): Design {
  const bubble = surface({
    fill: solid("#EAF7FF", 100),
    radius: 12,
    padding: 10,
    borderWidth: 3,
    borderColor: "#10151B",
    shadow: "hard",
    shadowColor: "#5CC6F5",
  });
  return make("sticker-pop", "Sticker Pop", {
    font: "space-grotesk",
    edge: "none",
    animation: { style: "pop", duration: 380, easing: "bounce" },
    row: { ...BASE.row, gap: 12 },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#33475A", member: "#0A7A55", moderator: "#1462B8", owner: "#B0400C" },
    },
    text: { ...BASE.text, color: "#10151B", weight: 600 },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#BFE9FF"),
      memberHeader: solid("#C7F3E0"),
      name: "#10151B",
      amount: "#10151B",
      text: "#10151B",
    }),
  });
}

function aurora(): Design {
  const bubble = surface({
    fill: grad("#0F3B57", "#1B2A66", 88, 135),
    radius: 16,
    padding: 12,
    decorations: [
      ring("aurora-ring", "#5CC6F5", "#8B7CFF", 1, 135, 80),
      glow("aurora-g1", "#5CC6F5", 18, 0, 30),
      glow("aurora-g2", "#8B7CFF", 30, 0, 22),
    ],
  });
  return make("aurora", "Aurora", {
    font: "exo-2",
    edge: "none",
    animation: { style: "blur-in", duration: 420, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      colors: { viewer: "#C9DAFF", member: "#8FF0D0", moderator: "#9CC8FF", owner: "#FFE29A" },
    },
    text: { ...BASE.text, color: "#F2F6FF" },
    ...cards(bubble, {
      mode: "tier",
      header: grad("#1C5F8A", "#3A3391"),
      memberHeader: grad("#0F7B62", "#0B5A4A"),
      name: "#F2F6FF",
      amount: "#FFFFFF",
      text: "#F2F6FF",
    }),
  });
}


/* ---------- Template bergaya: brutalism, game, dan futuristik dengan efek ---------- */

/** Brutalism: kotak tegas, garis tebal, bayangan keras, warna mencolok, teks super tebal. */
function brutal(): Design {
  const bubble = surface({
    fill: solid("#FFE94A", 100),
    radius: 0,
    padding: 10,
    borderWidth: 4,
    borderColor: "#0A0A0A",
    shadow: "hard",
    shadowColor: "#0A0A0A",
    decorations: [bar("brutal-bar", "left", "#FF3EA5", 8)],
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
      colors: { viewer: "#0A0A0A", member: "#0B6B3A", moderator: "#1236B8", owner: "#B3002D" },
    },
    text: { ...BASE.text, color: "#0A0A0A", weight: 400 },
    avatar: { ...BASE.avatar, shape: "square", size: 34, ringWidth: 3, ringColor: "#0A0A0A" },
    elements: { ...DEFAULT_ELEMENTS, name: anim("wipe", 260), message: anim("rise", 300, 80) },
    effects: [effect("shake", 6, 6)],
    labels: [tag("label-member", "MEMBER", "member", "#FFE94A", "#0A0A0A", { radius: 0 })],
    ...cards(bubble, {
      mode: "custom",
      header: solid("#FFD400"),
      memberHeader: solid("#FF7AC0"),
      name: "#0A0A0A",
      amount: "#0A0A0A",
      text: "#0A0A0A",
    }),
  });
}

/** Terinspirasi gaya menu game aksi bertema merah, hitam, dan putih: potongan miring, halftone, tipografi padat. */
function phantom(): Design {
  const bubble = surface({
    fill: solid("#0B0B0D", 96),
    radius: 0,
    padding: 12,
    shape: "slant",
    cut: 16,
    decorations: [ring("phantom-ring", "#FFFFFF", "#E60012", 2, 135, 95), halftone("phantom-dots", "#E60012", 7, 24)],
  });
  const owner = surface({
    fill: solid("#E60012", 100),
    radius: 0,
    padding: 12,
    shape: "slant",
    cut: 18,
    decorations: [ring("phantom-owner-ring", "#FFFFFF", "#0B0B0D", 2, 135, 95), halftone("phantom-owner-dots", "#0B0B0D", 7, 28)],
  });
  return make("phantom", "Phantom", {
    font: "anton",
    fontSize: 21,
    edge: "none",
    animation: { style: "slide-left", duration: 280, easing: "snappy" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 400,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#FFFFFF", member: "#FF4B5C", moderator: "#7FD1FF", owner: "#FFD84A" },
    },
    text: { ...BASE.text, color: "#FFFFFF", weight: 400, lineHeight: 125 },
    avatar: { ...BASE.avatar, shape: "hexagon", size: 36 },
    elements: { ...DEFAULT_ELEMENTS, name: anim("pan", 220, 60), message: anim("wipe", 300, 140) },
    effects: [effect("glitch", 6, 5), effect("shake", 5, 5)],
    labels: [tag("label-member", "MEMBER", "member", "#FFFFFF", "#E60012", { radius: 0 })],
    roleBubbles: { member: null, moderator: null, owner: { surface: owner, textColor: "#FFFFFF" } },
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

/** Kotak dialog ala RPG: biru tua, garis putih ganda, nama di atas pesan (kerangka grid), teks muncul menyapu. */
function quest(): Design {
  const bubble = surface({
    fill: grad("#10238A", "#050A3A", 96, 180),
    radius: 6,
    padding: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    decorations: [ring("quest-ring", "#B8C4FF", "#FFFFFF", 2, 180, 90), glow("quest-glow", "#5B6CFF", 12, 0, 30)],
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
        gap: 8,
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
      colors: { viewer: "#FFD866", member: "#8CFFB0", moderator: "#8CC8FF", owner: "#FF9CB0" },
    },
    text: { ...BASE.text, color: "#FFFFFF", weight: 400, lineHeight: 165, size: 92 },
    avatar: { ...BASE.avatar, shape: "square", size: 36, ringWidth: 3, ringColor: "#FFFFFF" },
    elements: { ...DEFAULT_ELEMENTS, name: anim("pop", 260), message: anim("wipe", 800, 150) },
    labels: [
      tag("label-member", "MEMBER", "member", "#10238A", "#8CFFB0", { radius: 2, size: 62, spacing: 0 }),
      tag("label-mod", "MOD", "moderator", "#10238A", "#8CC8FF", { radius: 2, size: 62, spacing: 0 }),
    ],
    ...cards(bubble, {
      mode: "custom",
      header: solid("#1A2FB5"),
      memberHeader: solid("#0F5A3A"),
      name: "#FFFFFF",
      amount: "#FFD866",
      text: "#FFFFFF",
    }),
  });
}

/** Esports atau gamer: HUD gelap, sudut chamfer, strip oranye, bubble berbeda untuk moderator dan owner. */
function arena(): Design {
  const orange = "#FF6A00";
  const bubble = surface({
    fill: solid("#0C1116", 92),
    radius: 0,
    padding: 10,
    shape: "chamfer",
    cut: 10,
    decorations: [bar("arena-bar", "left", orange, 5), stripes("arena-stripes", orange, 6, 12, 45, 9), corners("arena-corners", orange, 8, 2)],
  });
  const mod = surface({ ...bubble, decorations: [bar("arena-mod-bar", "left", "#4DA3FF", 5), stripes("arena-mod-stripes", "#4DA3FF", 6, 12, 45, 9)] });
  const owner = surface({
    ...bubble,
    fill: grad("#3A1D00", "#0C1116", 94, 90),
    decorations: [bar("arena-own-bar", "left", "#FFB02E", 5), corners("arena-own-corners", "#FFB02E", 9, 2)],
  });
  return make("arena", "Arena", {
    font: "chakra-petch",
    fontSize: 20,
    edge: "none",
    animation: { style: "slide-left", duration: 260, easing: "snappy" },
    bubble: { ...bubble, show: true, roleTint: false },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 700,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#9FB4C4", member: "#3DF5C5", moderator: "#4DA3FF", owner: "#FFB02E" },
    },
    text: { ...BASE.text, color: "#EAF2F8", weight: 500 },
    avatar: { ...BASE.avatar, shape: "hexagon", size: 36 },
    elements: { ...DEFAULT_ELEMENTS, name: anim("pan", 220), message: anim("fade", 260, 80) },
    effects: [effect("glow-pulse", 3, 3), effect("flicker", 3, 3)],
    labels: [
      tag("label-mod", "MOD", "moderator", "#04121F", "#4DA3FF", { radius: 0 }),
      tag("label-host", "HOST", "owner", "#1A0F00", "#FFB02E", { radius: 0 }),
    ],
    roleBubbles: { member: null, moderator: { surface: mod, textColor: null }, owner: { surface: owner, textColor: null } },
    ...cards(bubble, {
      mode: "custom",
      header: solid("#1A222B"),
      memberHeader: solid("#0E3A33"),
      name: "#EAF2F8",
      amount: orange,
      text: "#EAF2F8",
    }),
  });
}

/** Futuristik dengan efek: ring neon yang berkilau, nama bergetar glitch, cahaya berdenyut. */
function cyber(): Design {
  const bubble = surface({
    fill: grad("#0A0F1F", "#14082B", 90, 135),
    radius: 4,
    padding: 10,
    decorations: [
      ring("cyber-ring", "#22D3EE", "#FF2BD6", 2, 135, 95),
      glow("cyber-glow", "#22D3EE", 16, 0, 35),
      scan("cyber-scan", "#22D3EE", 3, 8),
      corners("cyber-corners", "#FF2BD6", 9, 2),
    ],
  });
  return make("cyber", "Cyber", {
    font: "orbitron",
    fontSize: 17,
    edge: "none",
    animation: { style: "blur-in", duration: 400, easing: "smooth" },
    bubble: { ...bubble, show: true, roleTint: true },
    nameStyle: {
      ...BASE.nameStyle,
      weight: 600,
      uppercase: true,
      spacing: 1,
      colors: { viewer: "#7CE9FF", member: "#7CFFB8", moderator: "#8DA8FF", owner: "#FFE066" },
    },
    text: { ...BASE.text, color: "#E8F7FF", weight: 500 },
    avatar: { ...BASE.avatar, shape: "hexagon", size: 34 },
    elements: { ...DEFAULT_ELEMENTS, name: anim("wipe", 300), message: anim("blur", 350, 100) },
    effects: [effect("shimmer", 5, 5), effect("glitch", 5, 6), effect("glow-pulse", 4, 3)],
    labels: [tag("label-member", "MEMBER", "member", "#04121F", "#7CFFB8", { radius: 2 })],
    ...cards(bubble, {
      mode: "tier",
      header: grad("#0F3F5C", "#3A0F5C"),
      memberHeader: grad("#0F7B62", "#0B5A4A"),
      name: "#E8F7FF",
      amount: "#FFFFFF",
      text: "#E8F7FF",
    }),
  });
}

export interface Template {
  id: Exclude<TemplateId, "custom">;
  name: string;
  tagline: string;
  design: Design;
}

export const TEMPLATES: Template[] = [
  { id: "crystal", name: "Crystal", tagline: "Glass gelap, gradient border, glow biru", design: crystal() },
  { id: "aurora", name: "Aurora", tagline: "Gradient biru ke ungu, double glow", design: aurora() },
  { id: "holo", name: "Holo", tagline: "Gradient border dua warna, avatar hexagon", design: holo() },
  { id: "grid", name: "Grid", tagline: "Scanlines dan corner brackets", design: grid() },
  { id: "hud", name: "HUD", tagline: "Accent bar, nama di atas, font mono", design: hud() },
  { id: "terminal", name: "Terminal", tagline: "Monospace dengan timestamp", design: terminal() },
  { id: "pulse", name: "Pulse", tagline: "Bubble biru solid, animasi pop", design: pulse() },
  { id: "lite-glass", name: "Lite Glass", tagline: "Kaca tipis, ringan di atas gameplay", design: liteGlass() },
  { id: "frost", name: "Frost", tagline: "Bubble terang, teks gelap", design: frost() },
  { id: "cyber", name: "Cyber", tagline: "Neon berkilau, nama glitch, cahaya berdenyut", design: cyber() },
  { id: "phantom", name: "Phantom", tagline: "Gaya game aksi: merah, hitam, potongan miring", design: phantom() },
  { id: "quest", name: "Quest", tagline: "Kotak dialog RPG dengan teks menyapu", design: quest() },
  { id: "arena", name: "Arena", tagline: "HUD esports, bubble beda tiap peran", design: arena() },
  { id: "brutal", name: "Brutal", tagline: "Brutalism: garis tebal, warna mencolok", design: brutal() },
  { id: "sticker-pop", name: "Sticker Pop", tagline: "Garis tebal dan hard shadow", design: stickerPop() },
  { id: "plain", name: "Plain", tagline: "Tanpa bubble, teks bersih", design: make("plain", "Plain", {}) },
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
