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

/** Link gambar: hanya https, tanpa karakter yang bisa keluar dari url("..."). Kosong berarti belum diisi. */
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
    url: z.string().max(500).refine(isSafeImageUrl, "url"),
    fit: z.enum(["cover", "contain", "tile"]),
    position: z.enum(["center", "left", "right", "top", "bottom"]),
    opacity: z.number().int().min(5).max(100),
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
  showAvatar: z.boolean(),
});
export type Card = z.infer<typeof cardSchema>;

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

  superChat: cardSchema,
  membership: cardSchema,
  sticker: cardSchema.extend({ size: z.number().int().min(40).max(160) }),
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

export function designsEqual(a: Design, b: Design): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function newId(prefix = "d"): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;
}
