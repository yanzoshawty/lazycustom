import { z } from "zod";
import { FONT_IDS } from "../fonts";

/**
 * Model desain lazycustom v2. Satu objek JSON tervalidasi yang menjadi sumber
 * kebenaran untuk generator CSS, preview, penyimpanan, dan link Share.
 * Semua nilai dibatasi ketat supaya tidak ada input bebas yang bisa menyusup ke CSS.
 */
export const DESIGN_VERSION = 2;

export const hex = z.string().regex(/^#[0-9A-F]{6}$/, "hex");
const pct = z.number().int().min(0).max(100);
const angle = z.number().int().min(0).max(360);
const id = z.string().regex(/^[a-z0-9-]{3,24}$/);

/** Link gambar yang diketik user: hanya https, tanpa karakter yang bisa keluar dari url("..."). Kosong berarti belum diisi. */
export function isSafeImageUrl(value: string): boolean {
  if (value === "") return true;
  if (value.length > 500) return false;
  if (/[\s"'()<>\\`{}|^\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Batas satu gambar unggahan (byte) dan total data unggahan per desain (karakter base64). */
export const MAX_UPLOAD_BYTES = 100 * 1024;
export const MAX_DATA_URI_CHARS = 140_000;
export const MAX_DESIGN_DATA_CHARS = 300_000;

const DATA_URI_RE = /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Gambar hasil unggahan: data URI PNG, JPEG, GIF, atau WebP saja. SVG sengaja tidak diterima. */
export function isDataImage(value: string): boolean {
  return value.length <= MAX_DATA_URI_CHARS && DATA_URI_RE.test(value);
}

/** Sumber gambar yang sah di dalam desain: kosong, link https, atau data URI unggahan. */
export function isSafeImageSource(value: string): boolean {
  return isSafeImageUrl(value) || isDataImage(value);
}

const imageSource = z.string().max(MAX_DATA_URI_CHARS).refine(isSafeImageSource, "url");

export const ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type Anchor = (typeof ANCHORS)[number];

export const PART_IDS = ["timestamp", "name", "badges", "message"] as const;
export type PartId = (typeof PART_IDS)[number];

export const TEMPLATE_IDS = [
  "crystal",
  "frost",
  "grid",
  "hud",
  "terminal",
  "holo",
  "pulse",
  "lite-glass",
  "sticker-pop",
  "aurora",
  "plain",
  "custom",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const fillSchema = z.object({
  mode: z.enum(["none", "solid", "gradient"]),
  color: hex,
  color2: hex,
  angle,
  opacity: pct,
});
export type Fill = z.infer<typeof fillSchema>;

export const decorationSchema = z.discriminatedUnion("kind", [
  z.object({
    id,
    kind: z.literal("glow"),
    color: hex,
    blur: z.number().int().min(0).max(48),
    spread: z.number().int().min(0).max(16),
    opacity: pct,
  }),
  z.object({
    id,
    kind: z.literal("gradient-border"),
    width: z.number().int().min(1).max(4),
    color: hex,
    color2: hex,
    angle,
    opacity: pct,
  }),
  z.object({
    id,
    kind: z.literal("accent-bar"),
    side: z.enum(["left", "right", "top", "bottom"]),
    thickness: z.number().int().min(2).max(12),
    color: hex,
    color2: hex,
  }),
  z.object({
    id,
    kind: z.literal("corners"),
    size: z.number().int().min(6).max(24),
    thickness: z.number().int().min(1).max(4),
    color: hex,
  }),
  z.object({
    id,
    kind: z.literal("scanlines"),
    gap: z.number().int().min(2).max(10),
    opacity: z.number().int().min(3).max(40),
    color: hex,
  }),
  z.object({
    id,
    kind: z.literal("image"),
    url: imageSource,
    fit: z.enum(["cover", "contain", "tile"]),
    position: z.enum(["center", "left", "right", "top", "bottom"]),
    opacity: z.number().int().min(5).max(100),
  }),
  z.object({
    id,
    kind: z.literal("image-pin"),
    url: imageSource,
    anchor: z.enum(ANCHORS),
    width: z.number().int().min(8).max(240),
    offsetX: z.number().int().min(-40).max(80),
    offsetY: z.number().int().min(-40).max(80),
  }),
]);
export type Decoration = z.infer<typeof decorationSchema>;
export type DecorationKind = Decoration["kind"];
export const DECORATION_KINDS: DecorationKind[] = [
  "glow",
  "gradient-border",
  "accent-bar",
  "corners",
  "scanlines",
  "image",
  "image-pin",
];

export const surfaceSchema = z.object({
  fill: fillSchema,
  radius: z.number().int().min(0).max(32),
  padding: z.number().int().min(4).max(24),
  borderWidth: z.number().int().min(0).max(6),
  borderColor: hex,
  shadow: z.enum(["none", "soft", "hard"]),
  shadowColor: hex,
  decorations: z.array(decorationSchema).max(8),
});
export type Surface = z.infer<typeof surfaceSchema>;

const weight = z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]);

export const cardSchema = z.object({
  surface: surfaceSchema,
  headerFill: fillSchema,
  colorMode: z.enum(["tier", "custom"]),
  nameColor: hex,
  amountColor: hex,
  textColor: hex,
  amountSize: z.number().int().min(80).max(200),
  amountWeight: weight,
  /** Jarak antara nama pengirim dan nominal (px). */
  amountGap: z.number().int().min(0).max(24).default(8),
  showAvatar: z.boolean(),
});
export type Card = z.infer<typeof cardSchema>;

export const panelImageSchema = z.object({
  id,
  url: imageSource,
  layer: z.enum(["behind", "front"]),
  anchor: z.enum(ANCHORS),
  width: z.number().int().min(16).max(600),
  height: z.number().int().min(16).max(600),
  offsetX: z.number().int().min(-300).max(300),
  offsetY: z.number().int().min(-300).max(300),
  opacity: z.number().int().min(5).max(100),
  fit: z.enum(["contain", "cover"]),
});
export type PanelImage = z.infer<typeof panelImageSchema>;

const name = z
  .string()
  .min(1)
  .max(40)
  .refine((v) => v.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(v), "name");

export const ANIMATION_STYLES = ["none", "fade", "slide-up", "slide-left", "slide-right", "pop", "zoom", "blur-in"] as const;
export type AnimationStyle = (typeof ANIMATION_STYLES)[number];
export const EASINGS = ["smooth", "snappy", "bounce", "linear"] as const;

export const designSchema = z.object({
  v: z.literal(DESIGN_VERSION),
  name,
  templateId: z.enum(TEMPLATE_IDS),

  font: z.enum(FONT_IDS),
  fontSize: z.number().int().min(12).max(36),
  panel: z.object({ color: hex, opacity: pct }),
  hideChrome: z.boolean(),
  hideTicker: z.boolean(),
  edge: z.enum(["none", "soft", "outline"]),

  animation: z.object({
    style: z.enum(ANIMATION_STYLES),
    duration: z.number().int().min(120).max(1200),
    easing: z.enum(EASINGS),
  }),

  row: z.object({
    gap: z.number().int().min(0).max(24),
    align: z.enum(["left", "right"]),
    maxWidth: z.number().int().min(50).max(100),
    avatarPosition: z.enum(["left", "right", "top"]),
  }),
  message: z.object({
    layout: z.enum(["inline", "stacked"]),
    order: z
      .array(z.enum(PART_IDS))
      .length(4)
      .refine((o) => new Set(o).size === 4, "order"),
  }),
  bubble: surfaceSchema.extend({ show: z.boolean(), roleTint: z.boolean() }),
  avatar: z.object({
    show: z.boolean(),
    size: z.number().int().min(16).max(64),
    shape: z.enum(["circle", "rounded", "square", "hexagon"]),
    ringWidth: z.number().int().min(0).max(4),
    ringColor: hex,
    /** Bingkai gambar di atas foto profil. Kosong berarti tanpa bingkai. */
    frame: z.object({ url: imageSource, scale: z.number().int().min(100).max(200) }).default({ url: "", scale: 130 }),
  }),
  nameStyle: z.object({
    size: z.number().int().min(70).max(140),
    weight,
    uppercase: z.boolean(),
    spacing: z.number().int().min(0).max(4),
    colors: z.object({ viewer: hex, member: hex, moderator: hex, owner: hex }),
  }),
  text: z.object({
    color: hex,
    weight,
    size: z.number().int().min(80).max(140),
    lineHeight: z.number().int().min(100).max(200),
  }),
  timestamp: z.object({ show: z.boolean(), opacity: z.number().int().min(20).max(100), size: z.number().int().min(60).max(100) }),
  badges: z.object({ show: z.boolean() }),

  /** Gambar tetap di panel chat (logo, banner, GIF). Paling banyak dua di belakang dan dua di depan pesan. */
  panelImages: z.array(panelImageSchema).max(4).default([]),

  superChat: cardSchema,
  membership: cardSchema,
  sticker: cardSchema.extend({ size: z.number().int().min(40).max(160) }),
}).superRefine((d, ctx) => {
  if (dataImageChars(d) > MAX_DESIGN_DATA_CHARS) {
    ctx.addIssue({ code: "custom", message: "Total gambar unggahan melebihi batas per desain", path: ["panelImages"] });
  }
  for (const layer of ["behind", "front"] as const) {
    if (d.panelImages.filter((i) => i.layer === layer).length > 2) {
      ctx.addIssue({ code: "custom", message: "Paling banyak dua gambar panel per lapisan", path: ["panelImages"] });
    }
  }
});

export type Design = z.infer<typeof designSchema>;
export type StickerCard = Design["sticker"];

export type LayerId =
  | "panel"
  | "row"
  | "bubble"
  | "avatar"
  | "name"
  | "badges"
  | "timestamp"
  | "text"
  | "superchat"
  | "membership"
  | "sticker"
  | "animation";

export type ParseDesignResult =
  | { ok: true; design: Design }
  | { ok: false; code: "IMPORT_INVALID" | "IMPORT_VERSION" };

/** Validasi data mentah (file impor, penyimpanan lokal, link Share). */
export function parseDesign(input: unknown): ParseDesignResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, code: "IMPORT_INVALID" };
  }
  const version = (input as { v?: unknown }).v;
  if (version !== DESIGN_VERSION) {
    return { ok: false, code: typeof version === "number" ? "IMPORT_VERSION" : "IMPORT_INVALID" };
  }
  const r = designSchema.safeParse(input);
  if (!r.success) return { ok: false, code: "IMPORT_INVALID" };
  return { ok: true, design: r.data };
}

/** Bentuk minimal yang dibutuhkan untuk menelusuri semua sumber gambar, tanpa bergantung pada tipe skema. */
interface ImageHolder {
  bubble: { decorations: Array<{ kind: string; url?: string }> };
  superChat: { surface: { decorations: Array<{ kind: string; url?: string }> } };
  membership: { surface: { decorations: Array<{ kind: string; url?: string }> } };
  sticker: { surface: { decorations: Array<{ kind: string; url?: string }> } };
  avatar: { frame: { url: string } };
  panelImages: Array<{ url: string }>;
}

/** Semua tempat yang menyimpan sumber gambar, sebagai objek yang punya properti `url`. */
function imageSlots(d: ImageHolder): Array<{ url?: string }> {
  return [
    ...d.bubble.decorations,
    ...d.superChat.surface.decorations,
    ...d.membership.surface.decorations,
    ...d.sticker.surface.decorations,
    d.avatar.frame,
    ...d.panelImages,
  ].filter((x): x is { url: string; kind?: string } => typeof (x as { url?: unknown }).url === "string");
}

/** Jumlah karakter data unggahan di seluruh desain, dipakai untuk membatasi ukuran penyimpanan. */
export function dataImageChars(d: ImageHolder): number {
  let total = 0;
  for (const slot of imageSlots(d)) if (slot.url && slot.url.startsWith("data:")) total += slot.url.length;
  return total;
}

export function countUploadedImages(d: ImageHolder): number {
  return imageSlots(d).filter((slot) => slot.url?.startsWith("data:")).length;
}

/**
 * Salinan desain tanpa gambar unggahan. Dipakai link Share: gambar dari komputer tidak ikut,
 * hanya gambar dari link https. Slot gambar dikosongkan, bukan dihapus, supaya penyusunan tetap utuh.
 */
export function stripUploadedImages(design: Design): { design: Design; removed: number } {
  const copy = JSON.parse(JSON.stringify(design)) as Design;
  let removed = 0;
  for (const slot of imageSlots(copy)) {
    if (slot.url?.startsWith("data:")) {
      slot.url = "";
      removed += 1;
    }
  }
  return { design: copy, removed };
}

/** Alamat gambar dari luar (link https) yang dipakai desain, tanpa duplikat. Gambar unggahan tidak dihitung. */
export function remoteImageUrls(d: Design): string[] {
  const urls = imageSlots(d)
    .map((slot) => slot.url)
    .filter((u): u is string => typeof u === "string" && u.startsWith("https://"));
  return [...new Set(urls)];
}

/** Nama host dari gambar luar, untuk ditampilkan ke user sebelum gambarnya dimuat. */
export function remoteImageHosts(d: Design): string[] {
  const hosts = new Set<string>();
  for (const u of remoteImageUrls(d)) {
    try {
      hosts.add(new URL(u).host);
    } catch {
      // Link yang lolos skema selalu bisa di-parse. Yang tidak bisa dilewati saja.
    }
  }
  return [...hosts];
}

/**
 * Salinan desain tanpa gambar dari luar. Dipakai saat membuka desain dari link Share atau file impor:
 * gambar yang dimuat dari server orang lain memberi server itu alamat IP pembukanya, jadi user diminta
 * setuju dulu. Slot dikosongkan, bukan dihapus, supaya penyusunan tetap utuh.
 */
export function stripRemoteImages(design: Design): { design: Design; removed: number } {
  const copy = JSON.parse(JSON.stringify(design)) as Design;
  let removed = 0;
  for (const slot of imageSlots(copy)) {
    if (slot.url?.startsWith("https://")) {
      slot.url = "";
      removed += 1;
    }
  }
  return { design: copy, removed };
}

/** JSON dengan key terurut, supaya dua desain yang isinya sama tapi urutan key-nya beda dianggap sama. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function designsEqual(a: Design, b: Design): boolean {
  return canonical(a) === canonical(b);
}

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function newId(prefix = "d"): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;
}
