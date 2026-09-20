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
  "exo-2",
  "chakra-petch",
  "rajdhani",
  "orbitron",
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
  "exo-2": { label: "Exo 2", hint: "Futuristik dan rapi", stack: '"Exo 2", sans-serif', google: "Exo 2" },
  "chakra-petch": {
    label: "Chakra Petch",
    hint: "Sudut tegas, gaya sci-fi",
    stack: '"Chakra Petch", sans-serif',
    google: "Chakra Petch",
  },
  rajdhani: { label: "Rajdhani", hint: "Ramping dan teknis", stack: '"Rajdhani", sans-serif', google: "Rajdhani" },
  orbitron: { label: "Orbitron", hint: "Lebar dan sci-fi", stack: '"Orbitron", sans-serif', google: "Orbitron" },
};

export function fontImport(id: FontId): string | null {
  const g = FONTS[id].google;
  if (!g) return null;
  const family = g.replace(/ /g, "+");
  return `@import url("https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap");`;
}
