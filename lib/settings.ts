import { z } from "zod";
import { FONT_IDS } from "./fonts";

export const SETTINGS_VERSION = 1;

export const PRESET_IDS = ["sirup", "jeruk-nipis", "es-teh", "laut", "stiker", "bening"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

const hex = z.string().regex(/^#[0-9A-F]{6}$/, "hex");
const weight = z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]);

export const settingsSchema = z.object({
  v: z.literal(SETTINGS_VERSION),
  presetId: z.enum(PRESET_IDS),

  font: z.enum(FONT_IDS),
  fontSize: z.number().int().min(12).max(36),
  weight,
  nameWeight: weight,
  textColor: hex,
  names: z.object({ viewer: hex, member: hex, moderator: hex, owner: hex }),
  edge: z.enum(["none", "soft", "outline"]),
  layout: z.enum(["inline", "stacked"]),

  bubble: z.object({
    show: z.boolean(),
    color: hex,
    opacity: z.number().int().min(0).max(100),
    radius: z.number().int().min(0).max(28),
    padding: z.number().int().min(4).max(20),
    borderWidth: z.number().int().min(0).max(6),
    borderColor: hex,
    shadow: z.enum(["none", "soft", "hard"]),
    shadowColor: hex,
    roleTint: z.boolean(),
  }),
  gap: z.number().int().min(0).max(24),

  avatar: z.object({
    show: z.boolean(),
    size: z.number().int().min(16).max(56),
    shape: z.enum(["circle", "rounded", "square"]),
  }),
  showTimestamp: z.boolean(),
  showBadges: z.boolean(),
  hideChrome: z.boolean(),
  hideTicker: z.boolean(),
  panel: z.object({ color: hex, opacity: z.number().int().min(0).max(100) }),

  animation: z.enum(["none", "slide", "pop", "fade"]),
});

export type Settings = z.infer<typeof settingsSchema>;

export type ParseResult =
  | { ok: true; settings: Settings }
  | { ok: false; code: "IMPORT_INVALID" | "IMPORT_VERSION" };

/** Validasi data mentah (dari file impor atau localStorage). */
export function parseSettings(input: unknown): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, code: "IMPORT_INVALID" };
  }
  const version = (input as { v?: unknown }).v;
  if (version !== SETTINGS_VERSION) {
    // File tanpa nomor versi dianggap rusak, bukan beda versi.
    return { ok: false, code: typeof version === "number" ? "IMPORT_VERSION" : "IMPORT_INVALID" };
  }
  const r = settingsSchema.safeParse(input);
  return r.success ? { ok: true, settings: r.data } : { ok: false, code: "IMPORT_INVALID" };
}

export function settingsEqual(a: Settings, b: Settings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
