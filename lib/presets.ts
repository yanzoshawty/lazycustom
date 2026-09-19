import type { PresetId, Settings } from "./settings";

/** Dasar untuk semua preset. Preset hanya menimpa yang berbeda. */
const BASE: Settings = {
  v: 1,
  presetId: "bening",
  font: "system",
  fontSize: 20,
  weight: 500,
  nameWeight: 700,
  textColor: "#F4F5F8",
  names: { viewer: "#D5D9E2", member: "#7BE5AE", moderator: "#8CC2FF", owner: "#FFD65A" },
  edge: "soft",
  layout: "inline",
  bubble: {
    show: false,
    color: "#1B1E27",
    opacity: 80,
    radius: 14,
    padding: 10,
    borderWidth: 0,
    borderColor: "#F4F5F8",
    shadow: "none",
    shadowColor: "#0B0C10",
    roleTint: false,
  },
  gap: 8,
  avatar: { show: true, size: 32, shape: "circle" },
  showTimestamp: false,
  showBadges: true,
  hideChrome: true,
  hideTicker: false,
  panel: { color: "#0F1115", opacity: 0 },
  animation: "slide",
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function make(id: PresetId, patch: DeepPartial<Settings>): Settings {
  return {
    ...BASE,
    ...patch,
    presetId: id,
    names: { ...BASE.names, ...patch.names },
    bubble: { ...BASE.bubble, ...patch.bubble },
    avatar: { ...BASE.avatar, ...patch.avatar },
    panel: { ...BASE.panel, ...patch.panel },
  } as Settings;
}

export interface Preset {
  id: PresetId;
  label: string;
  hint: string;
  settings: Settings;
}

export const PRESETS: Preset[] = [
  {
    id: "sirup",
    label: "Sirup",
    hint: "Bubble pink, bulat, ceria",
    settings: make("sirup", {
      font: "nunito",
      weight: 500,
      textColor: "#FFF7FA",
      names: { viewer: "#FFE0EC", member: "#C8F7DC", moderator: "#D0E4FF", owner: "#FFE58A" },
      edge: "none",
      bubble: { show: true, color: "#CC2C65", opacity: 94, radius: 22, padding: 12, shadow: "soft" },
      animation: "pop",
    }),
  },
  {
    id: "jeruk-nipis",
    label: "Jeruk Nipis",
    hint: "Hijau segar, teks gelap",
    settings: make("jeruk-nipis", {
      font: "fredoka",
      weight: 500,
      textColor: "#1D2B0A",
      names: { viewer: "#2F4A0F", member: "#0B6B3A", moderator: "#0A4FA8", owner: "#8A1C2B" },
      edge: "none",
      bubble: { show: true, color: "#BEE84A", opacity: 96, radius: 14, padding: 10, shadow: "soft", shadowColor: "#0B0C10" },
      animation: "slide",
    }),
  },
  {
    id: "es-teh",
    label: "Es Teh",
    hint: "Oranye hangat, santai",
    settings: make("es-teh", {
      font: "baloo-2",
      weight: 500,
      textColor: "#3A1F0A",
      names: { viewer: "#5A2E0E", member: "#0F5B2E", moderator: "#0B3F91", owner: "#7A0F24" },
      edge: "none",
      bubble: { show: true, color: "#F5B04C", opacity: 96, radius: 10, padding: 10, shadow: "soft" },
      animation: "fade",
    }),
  },
  {
    id: "laut",
    label: "Laut",
    hint: "Biru tua, nama di atas",
    settings: make("laut", {
      font: "dm-sans",
      weight: 500,
      textColor: "#EAF2FF",
      names: { viewer: "#A9C7F5", member: "#7CE0AE", moderator: "#8CC2FF", owner: "#FFD166" },
      edge: "none",
      layout: "stacked",
      bubble: {
        show: true,
        color: "#1B3A6B",
        opacity: 92,
        radius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: "#4C7CC7",
        shadow: "none",
        roleTint: true,
      },
      animation: "slide",
    }),
  },
  {
    id: "stiker",
    label: "Stiker",
    hint: "Garis tebal, bayangan keras",
    settings: make("stiker", {
      font: "space-grotesk",
      weight: 600,
      textColor: "#16181D",
      names: { viewer: "#4B5563", member: "#0E8A4F", moderator: "#1D5FD1", owner: "#C2185B" },
      edge: "none",
      bubble: {
        show: true,
        color: "#FBFBFD",
        opacity: 100,
        radius: 14,
        padding: 10,
        borderWidth: 3,
        borderColor: "#16181D",
        shadow: "hard",
        shadowColor: "#16181D",
      },
      gap: 12,
      animation: "pop",
    }),
  },
  {
    id: "bening",
    label: "Bening",
    hint: "Tanpa bubble, teks bersih",
    settings: make("bening", {}),
  },
];

export const DEFAULT_PRESET_ID: PresetId = "sirup";

export function presetById(id: PresetId): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

export const DEFAULT_SETTINGS: Settings = presetById(DEFAULT_PRESET_ID).settings;
