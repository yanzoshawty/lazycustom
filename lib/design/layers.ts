import { SEL } from "./css";
import type { LayerId } from "./model";

export interface LayerInfo {
  id: LayerId;
  label: string;
  hint: string;
  /** Selector di preview yang disorot saat layer dipilih. */
  targets: string[];
}

const M = SEL.text;

export const LAYERS: LayerInfo[] = [
  { id: "panel", label: "Panel", hint: "Latar chat, font dasar, elemen bawaan YouTube", targets: [SEL.renderer] },
  { id: "row", label: "Message row", hint: "Susunan avatar, jarak, dan lebar tiap pesan", targets: [M] },
  { id: "bubble", label: "Bubble", hint: "Fill, border, glow, dan dekorasi pesan", targets: [`${M} #content`] },
  {
    id: "avatar",
    label: "Avatar",
    hint: "Ukuran, bentuk, dan ring foto profil",
    targets: [`${M} #author-photo`, `${SEL.paid} #author-photo`, `${SEL.member} #author-photo`, `${SEL.sticker} #author-photo`],
  },
  { id: "name", label: "Name", hint: "Nama pengirim dan warna per peran", targets: [`${M} #author-name`] },
  { id: "badges", label: "Badges", hint: "Ikon moderator dan member", targets: [`${M} #chat-badges`] },
  { id: "timestamp", label: "Timestamp", hint: "Waktu kirim pesan", targets: [`${M} #timestamp`] },
  { id: "text", label: "Message text", hint: "Warna, ketebalan, dan tepi teks", targets: [`${M} #message`] },
  { id: "superchat", label: "Super Chat", hint: "Kartu donasi", targets: [`${SEL.paid} #card`] },
  { id: "membership", label: "Membership", hint: "Kartu member baru", targets: [`${SEL.member} #card`] },
  { id: "sticker", label: "Sticker", hint: "Kartu Super Sticker", targets: [`${SEL.sticker} #card`] },
  { id: "animation", label: "Animation", hint: "Gaya pesan masuk", targets: [M] },
];

export const LAYER_IDS = LAYERS.map((l) => l.id);

export function layerById(id: LayerId): LayerInfo {
  return LAYERS.find((l) => l.id === id) ?? LAYERS[0];
}

/** Layer yang muncul sebagai daftar bagian pesan yang bisa diurutkan. */
export const PART_LABELS = {
  timestamp: "Timestamp",
  name: "Name",
  badges: "Badges",
  message: "Message text",
} as const;

export const PART_LAYER = {
  timestamp: "timestamp",
  name: "name",
  badges: "badges",
  message: "text",
} as const satisfies Record<string, LayerId>;
