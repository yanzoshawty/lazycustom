/**
 * Font untuk chat. Semuanya dimuat lewat Google Fonts di dalam CSS keluaran
 * (OBS butuh @import karena tidak punya akses ke font hasil bundel situs ini).
 * Bobot dibatasi 400-700 karena itu yang tersedia di semua font di daftar.
 */
export const FONT_IDS = [
  "system",
  "nunito",
  "fredoka",
  "baloo-2",
  "dm-sans",
  "space-grotesk",
  "jetbrains-mono",
] as const;

export type FontId = (typeof FONT_IDS)[number];

interface FontDef {
  label: string;
  hint: string;
  stack: string;
  /** Nama keluarga font di Google Fonts, dengan spasi. Kosong untuk font sistem. */
  google?: string;
}

export const FONTS: Record<FontId, FontDef> = {
  system: {
    label: "Bawaan sistem",
    hint: "Paling ringan, tanpa unduhan",
    stack: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  nunito: { label: "Nunito", hint: "Bulat dan ramah", stack: '"Nunito", sans-serif', google: "Nunito" },
  fredoka: { label: "Fredoka", hint: "Gemuk dan ceria", stack: '"Fredoka", sans-serif', google: "Fredoka" },
  "baloo-2": { label: "Baloo 2", hint: "Tebal dan santai", stack: '"Baloo 2", sans-serif', google: "Baloo 2" },
  "dm-sans": { label: "DM Sans", hint: "Bersih dan netral", stack: '"DM Sans", sans-serif', google: "DM Sans" },
  "space-grotesk": {
    label: "Space Grotesk",
    hint: "Tegas dan teknis",
    stack: '"Space Grotesk", sans-serif',
    google: "Space Grotesk",
  },
  "jetbrains-mono": {
    label: "JetBrains Mono",
    hint: "Gaya terminal",
    stack: '"JetBrains Mono", monospace',
    google: "JetBrains Mono",
  },
};

export function fontImport(id: FontId): string | null {
  const g = FONTS[id].google;
  if (!g) return null;
  const family = g.replace(/ /g, "+");
  return `@import url("https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap");`;
}
